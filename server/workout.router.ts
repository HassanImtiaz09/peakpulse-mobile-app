import { z } from "zod";
import { router, protectedProcedure, publicProcedure, guestOrUserProcedure } from "./_core/trpc";
import { db, invokeLLM, checkAiLimit, getFallbackWorkoutPlan, randomSuffix, uploadVideoToGeminiFileAPI } from "./helpers";
import { callClaudeVision } from "./claude";

export const workoutRouter = router({
  workoutPlan: router({
    // AI generation — works for guests (no DB save for guests)
    generate: guestOrUserProcedure
      .input(z.object({ goal: z.string(), workoutStyle: z.string(), daysPerWeek: z.number().default(4), fitnessLevel: z.string().default("intermediate") }))
      .mutation(async ({ ctx, input }) => {
        await checkAiLimit(ctx.user?.id, "workoutPlan.generate");
        const prompt = `Generate a complete 7-day workout plan as JSON for: Goal: ${input.goal.replace(/_/g," ")}, Style: ${input.workoutStyle}, Days/week: ${input.daysPerWeek}, Level: ${input.fitnessLevel}. Return: {"schedule":[{"day":"Monday","focus":"Push Day","isRest":false,"exercises":[{"name":"Bench Press","sets":"4x8","rest":"90s","notes":""}]}],"insight":"coaching tip"}`;
        const response = await invokeLLM({ messages: [{ role: "system", content: "You are an expert personal trainer. Always respond with valid JSON." }, { role: "user", content: prompt }], response_format: { type: "json_object" } });
        let planData: any;
        try { planData = JSON.parse((response.choices[0].message.content as string) ?? "{}"); }
        catch { planData = { schedule: getFallbackWorkoutPlan(input.goal), insight: "Stay consistent with your training." }; }
        // Only save to DB if user is authenticated
        let planId: number | undefined;
        if (ctx.user) {
          planId = await db.createFitnessPlan(ctx.user.id, { planType: "workout", goal: input.goal, workoutStyle: input.workoutStyle, planJson: JSON.stringify(planData.schedule), insight: planData.insight });
        }
        return { id: planId, schedule: planData.schedule, insight: planData.insight };
      }),
    getActive: protectedProcedure.query(async ({ ctx }) => {
      const plan = await db.getActiveFitnessPlan(ctx.user.id, "workout");
      if (!plan) return null;
      return { ...plan, schedule: JSON.parse(plan.planJson) };
    }),
    logSession: protectedProcedure
      .input(z.object({ planId: z.number().optional(), dayName: z.string().optional(), focus: z.string().optional(), completedExercises: z.array(z.string()).optional(), durationMinutes: z.number().optional() }))
      .mutation(async ({ ctx, input }) => db.createWorkoutSession(ctx.user.id, { planId: input.planId, dayName: input.dayName, focus: input.focus, completedExercisesJson: JSON.stringify(input.completedExercises ?? []), durationMinutes: input.durationMinutes })),
    getRecentSessions: protectedProcedure.query(async ({ ctx }) => db.getRecentWorkoutSessions(ctx.user.id, 10)),
    getAllSessions: protectedProcedure.query(async ({ ctx }) => db.getRecentWorkoutSessions(ctx.user.id, 500)),

  // ── Dietary restriction enforcement helper ──────────────────────────
  // Used by meal plan generation to give the LLM strict, non-negotiable rules
  // for each dietary preference instead of a vague "Diet: vegan" hint.

  }),
  workout: router({
    // AI form analysis — works for guests
    // Uses Gemini File API resumable upload for video instead of raw base64 in body
    analyzeForm: guestOrUserProcedure
      .input(z.object({ exerciseName: z.string(), videoBase64: z.string().optional(), hasVideo: z.boolean().default(false), imageBase64: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        await checkAiLimit(ctx.user?.id, "workout.analyzeForm");
        const prompt = `You are an expert personal trainer and biomechanics coach. Analyse the ${input.exerciseName} exercise form${input.hasVideo || input.imageBase64 ? " from the provided media" : " based on common form mistakes"}. Return a JSON object with this exact structure: {"score":75,"grade":"good","exerciseName":"${input.exerciseName}","positives":["Good depth achieved","Neutral spine maintained"],"corrections":["Knees caving inward slightly","Elbows flaring too wide"],"feedback":["Overall your form is solid. Focus on keeping your knees tracking over your toes throughout the movement.","Remember to brace your core before each rep."],"keyJointAngles":{"knee":"~90 degrees","hip":"~100 degrees","spine":"neutral"},"injuryRisk":"low","overallTip":"Focus on bracing your core before initiating each rep."}. Score 0-100: 0-44 poor, 45-64 fair, 65-79 good, 80-100 excellent. Be specific, actionable, and reference visible body mechanics.`;

        let source: "claude" | "gemini" = "gemini";

        // Try Claude Vision first if we have image data (extracted frame from video)
        if (input.imageBase64 && input.imageBase64.length > 0) {
          const claudeResult = await callClaudeVision(
            "You are an expert personal trainer and biomechanics coach. Analyse exercise form from images. Always respond with valid JSON only.",
            prompt,
            input.imageBase64,
            "image/jpeg",
            { maxTokens: 1024 }
          );
          if (claudeResult) {
            try {
              const parsed = JSON.parse(claudeResult);
              return { ...parsed, source: "claude" as const };
            } catch {
              // Claude returned non-JSON, fall through to Gemini
              console.warn("[Form Check] Claude returned non-JSON, falling back to Gemini");
            }
          }
        }

        // Gemini path (original logic)
        const messages: any[] = [{ role: "system", content: "You are an expert personal trainer. Always respond with valid JSON." }, { role: "user", content: prompt }];

        if (input.hasVideo && input.videoBase64 && input.videoBase64.length > 0) {
          try {
            const videoBuffer = Buffer.from(input.videoBase64, "base64");
            const { fileUri, mimeType } = await uploadVideoToGeminiFileAPI(
              videoBuffer,
              "video/mp4",
              `form-check-${input.exerciseName.replace(/\s+/g, "-").toLowerCase()}`,
            );
            messages[1].content = [
              { type: "text", text: prompt },
              { type: "file_url", file_url: { url: fileUri, mime_type: mimeType } },
            ];
          } catch (uploadErr: any) {
            console.warn("Gemini File API upload failed, falling back to text-only:", uploadErr.message);
          }
        }

        const response = await invokeLLM({ messages, response_format: { type: "json_object" } });
        source = "gemini";
        let result: any;
        try { result = JSON.parse((response.choices[0].message.content as string) ?? "{}"); }
        catch { result = { score: 65, grade: "good", exerciseName: input.exerciseName, positives: ["Good effort on the exercise"], corrections: ["Focus on controlled movement throughout"], feedback: ["Keep practising and your form will improve with each session."] }; }
        return { ...result, source };
      }),

  }),
  exerciseSwap: router({
    // AI-powered exercise swap — generates alternatives targeting the same muscle group
    generate: guestOrUserProcedure
      .input(z.object({
        exerciseName: z.string(),
        muscleGroup: z.string(),
        dayFocus: z.string(),
        workoutStyle: z.string().default("gym"),
        reason: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const prompt = `You are an expert personal trainer. The user wants to swap "${input.exerciseName}" from their ${input.dayFocus} workout. Target muscle: ${input.muscleGroup}. Style: ${input.workoutStyle}. ${input.reason ? `Reason: ${input.reason}` : ""}

Generate exactly 5 alternative exercises that target the same muscle group(s). Each must be practical for the given workout style.

Return JSON:
{"alternatives":[{"name":"Exercise Name","sets":"4x10","reps":"10-12","rest":"90s","muscleGroup":"${input.muscleGroup}","equipment":"Barbell","difficulty":"intermediate","notes":"Form cue or tip","reason":"Why this is a good swap"}]}`;
        const response = await invokeLLM({
          messages: [
            { role: "system", content: "You are a professional personal trainer. Always respond with valid JSON only." },
            { role: "user", content: prompt },
          ],
          response_format: { type: "json_object" },
        });
        let result: any;
        try { result = JSON.parse((response.choices[0].message.content as string) ?? "{}"); }
        catch { result = { alternatives: [] }; }
        return { alternatives: result.alternatives ?? [] };
      }),

  }),
  dailyCheckIn: router({
    // AI body fat assessment from photo
    assessPhoto: guestOrUserProcedure
      .input(z.object({ photoUrl: z.string(), previousBF: z.number().optional(), goal: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        await checkAiLimit(ctx.user?.id, "dailyCheckIn.assessPhoto");
        const prompt = `You are a fitness coach and body composition expert. Analyse this progress photo and provide an assessment. Return JSON: {"estimatedBF":18,"trend":"improving","bfChange":${input.previousBF ? `${input.previousBF}-18` : "null"},"motivationalMessage":"Great progress! Your muscle definition is improving.","tips":["Increase protein intake to preserve muscle","Add 2 more cardio sessions per week"],"bodyComposition":{"muscleDefinition":"moderate","visibleProgress":true,"areasImproving":["shoulders","arms"],"areasToFocus":["core","legs"]}}. Be encouraging and specific. Goal: ${input.goal ?? "general fitness"}.`;
        const messages: any[] = [{ role: "system", content: "You are a supportive fitness coach. Always respond with valid JSON." }, { role: "user", content: [{ type: "text", text: prompt }, { type: "image_url", image_url: { url: input.photoUrl } }] }];
        const response = await invokeLLM({ messages, response_format: { type: "json_object" } });
        let result: any;
        try { result = JSON.parse((response.choices[0].message.content as string) ?? "{}"); }
        catch { result = { estimatedBF: 18, trend: "stable", motivationalMessage: "Keep going! Consistency is the key to transformation.", tips: ["Stay hydrated", "Get 7-8 hours of sleep"] }; }
        return result;
      }),
    saveCheckIn: protectedProcedure
      .input(z.object({ photoUrl: z.string().optional(), weightKg: z.number().optional(), bodyFatPercent: z.number().optional(), notes: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        return db.createProgressPhoto(ctx.user.id, { photoUrl: input.photoUrl ?? "", note: input.notes });
      }),

  }),
});
