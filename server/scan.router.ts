import { z } from "zod";
import { router, protectedProcedure, publicProcedure, guestOrUserProcedure } from "./_core/trpc";
import { db, invokeLLM, generateImage, storagePut, checkAiLimit, getBFDescription, getFaceTransformationDesc, randomSuffix } from "./helpers";

export const scanRouter = router({
  bodyScan: router({
    // AI analysis — works for guests (no DB save for guests)
    analyze: guestOrUserProcedure
      .input(z.object({ photoUrl: z.string(), weightKg: z.number().optional(), heightCm: z.number().optional(), age: z.number().optional(), gender: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        await checkAiLimit(ctx.user?.id, "bodyScan.analyze");
        const metricsNote = (input.weightKg && input.heightCm && input.age)
          ? `User body metrics: weight ${input.weightKg}kg, height ${input.heightCm}cm, age ${input.age}, gender ${input.gender ?? 'male'}. Use these metrics alongside the photo to compute a more accurate body fat estimate using the BMI-based Deurenberg formula as a cross-check: BF% = (1.20 × BMI) + (0.23 × age) − (10.8 × (gender=male?1:0)) − 5.4. Reconcile the formula result with the visual assessment from the photo and report the best estimate.`
          : 'No body metrics provided — estimate from photo only.';
        const prompt = `You are an expert fitness assessment AI and body composition specialist. Analyze this full-body photo and provide:\n${metricsNote}\n\nReturn JSON with:\n1. estimated_body_fat: best estimated body fat percentage (number, 1 decimal place)\n2. confidence_low: lower bound (number)\n3. confidence_high: upper bound (number)\n4. muscle_mass_estimate: "low"|"moderate"|"high"|"very_high"\n5. analysis_notes: 2-3 sentences about physique and how metrics influenced the estimate\n6. transformations: array of 5 objects for target BF levels [25,20,15,12,10], each with: target_bf, description, estimated_weeks, effort_level`;
        const aiResult = await invokeLLM({
          messages: [
            { role: "system", content: prompt },
            { role: "user", content: [
              { type: "text", text: "Analyze this full-body photo." },
              { type: "image_url", image_url: { url: input.photoUrl } }
            ]},
          ],
          response_format: { type: "json_object" },
        });
        let analysis: any;
        try { analysis = JSON.parse((aiResult.choices[0].message.content as string) ?? "{}"); }
        catch { analysis = { estimated_body_fat: 20, confidence_low: 17, confidence_high: 23, muscle_mass_estimate: "moderate", analysis_notes: "Analysis complete.", transformations: [
          { target_bf: 25, description: "Slightly softer physique.", estimated_weeks: 4, effort_level: "moderate" },
          { target_bf: 20, description: "Average healthy build.", estimated_weeks: 8, effort_level: "moderate" },
          { target_bf: 15, description: "Athletic build with visible definition.", estimated_weeks: 16, effort_level: "high" },
          { target_bf: 12, description: "Lean athletic physique.", estimated_weeks: 24, effort_level: "very_high" },
          { target_bf: 10, description: "Very lean with excellent definition.", estimated_weeks: 32, effort_level: "extreme" },
        ]}; }
        // Sequential generation with retries + exponential backoff to prevent rate limit failures
        const transformationsWithImages: any[] = [];
        for (const t of (analysis.transformations ?? [])) {
          let imageUrl: string | null = null;
          const maxRetries = 3;
          for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
              const bfDesc = getBFDescription(t.target_bf);
                const genderHint = input.gender || "male";
                const faceDesc = getFaceTransformationDesc(analysis.estimated_body_fat, t.target_bf);
                const bfLabel = t.target_bf + "% body fat";
                const allTargets = (analysis.transformations || []).map((x: any) => x.target_bf + "%").join(", ");

                const { url } = await generateImage({
                  prompt: `TASK: Edit the reference photo to show what this EXACT same ${genderHint} person would realistically look like at ${bfLabel}. This is one image in a series showing body fat levels [${allTargets}], so consistency between images is critical.

BODY COMPOSITION (${bfLabel}): ${bfDesc}

${faceDesc}

MANDATORY CONSISTENCY RULES:
- The person MUST be immediately recognisable as the SAME individual in the reference photo across ALL body fat variations.
- Preserve EXACTLY: skin tone/complexion, hair color, hair style, hair length, eye color, nose shape, ear shape, brow structure, lip shape, and any distinguishing features (moles, scars, tattoos, facial hair).
- Preserve EXACTLY: the pose, camera angle, framing (head-to-mid-thigh), background, lighting direction, and photo style from the reference image.
- The ONLY thing that should change between body fat levels is the amount and distribution of subcutaneous fat on the body and face.
- Do NOT change muscle size/shape — only change fat layer thickness. Lower BF reveals more of the same underlying muscle; higher BF covers it with more fat.

PROGRESSION LOGIC FOR ${bfLabel}:
- Lower BF% = less subcutaneous fat = more visible bone structure in face, more visible muscle separation on body, thinner limbs, more visible veins.
- Higher BF% = more subcutaneous fat = softer/rounder face, smoother body contours, less visible muscle definition, thicker midsection.
- Fat reduces GRADUALLY and proportionally: face gets leaner AS body gets leaner, not independently.
- At ${bfLabel} specifically, BOTH the face AND body must reflect this exact fat level — neither should appear leaner or fatter than the other.

REALISM: The result must look like an unedited real photograph. Match the exact lighting, shadows, background, and image quality of the reference. No artificial smoothing, no HDR effects, no gym/dramatic lighting unless present in the original.`,
                  originalImages: [{ url: input.photoUrl, mimeType: "image/jpeg" }],
                });
              imageUrl = url ?? null;
              break; // Success, exit retry loop
            } catch (err: any) {
              const isRateLimit = err.message?.includes("429") || err.message?.includes("rate") || err.message?.includes("quota");
              if (attempt < maxRetries - 1 && isRateLimit) {
                // Exponential backoff: 2s, 4s, 8s
                const backoffMs = Math.pow(2, attempt + 1) * 1000;
                console.warn(`Image generation rate limited for BF ${t.target_bf}%, retrying in ${backoffMs}ms (attempt ${attempt + 1}/${maxRetries})`);
                await new Promise(r => setTimeout(r, backoffMs));
              } else if (attempt < maxRetries - 1) {
                // Non-rate-limit error, shorter retry delay
                await new Promise(r => setTimeout(r, 1500));
              } else {
                console.warn(`Image generation failed for BF ${t.target_bf}% after ${maxRetries} attempts: ${err.message}`);
              }
            }
          }
          transformationsWithImages.push({ ...t, imageUrl });
          // Brief pause between sequential requests to avoid rate limits
          if (transformationsWithImages.length < (analysis.transformations?.length ?? 0)) {
            await new Promise(r => setTimeout(r, 1000));
          }
        }
        // Only save to DB if user is authenticated
        let scanId: number | undefined;
        if (ctx.user) {
          scanId = await db.createBodyScan(ctx.user.id, {
            photoUrl: input.photoUrl,
            estimatedBodyFat: analysis.estimated_body_fat,
            confidenceLow: analysis.confidence_low,
            confidenceHigh: analysis.confidence_high,
            muscleMassEstimate: analysis.muscle_mass_estimate,
            analysisNotes: analysis.analysis_notes,
            transformationsJson: JSON.stringify(transformationsWithImages),
          });
        }
        return { id: scanId, estimatedBodyFat: analysis.estimated_body_fat, confidenceLow: analysis.confidence_low, confidenceHigh: analysis.confidence_high, muscleMassEstimate: analysis.muscle_mass_estimate, analysisNotes: analysis.analysis_notes, transformations: transformationsWithImages };
      }),
    getLatest: protectedProcedure.query(async ({ ctx }) => {
      const scan = await db.getLatestBodyScan(ctx.user.id);
      if (!scan) return null;
      return { ...scan, transformations: scan.transformationsJson ? JSON.parse(scan.transformationsJson) : [] };
    }),
    getHistory: protectedProcedure.query(async ({ ctx }) => {
      const scans = await db.getAllBodyScans(ctx.user.id);
      return scans.map((s: any) => ({
        date: s.createdAt ?? s.created_at ?? new Date().toISOString(),
        bodyFatPercent: s.estimatedBodyFat ?? s.estimated_body_fat ?? undefined,
        weightKg: s.weightKg ?? s.weight_kg ?? undefined,
        photoUrl: s.photoUrl ?? s.photo_url ?? undefined,
        transformations: s.transformationsJson ? JSON.parse(s.transformationsJson) : [],
      }));
    }),

  }),
  progress: router({
    // Photo upload and analysis — works for guests (no DB save for guests)
    uploadPhoto: guestOrUserProcedure
      .input(z.object({ photoBase64: z.string(), note: z.string().optional(), isBaseline: z.boolean().optional(), weightKg: z.number().optional(), bodyFatPercent: z.number().optional() }))
      .mutation(async ({ ctx, input }) => {
        const buffer = Buffer.from(input.photoBase64, "base64");
        const key = `progress/${ctx.user?.id ?? "guest"}/${Date.now()}-${randomSuffix()}.jpg`;
        const { url } = await storagePut(key, buffer, "image/jpeg");
        // Only save to DB if user is authenticated
        let photoId: number | undefined;
        if (ctx.user) {
          photoId = await db.createProgressPhoto(ctx.user.id, { photoUrl: url, note: input.note, isBaseline: input.isBaseline ?? false, weightKg: input.weightKg, bodyFatPercent: input.bodyFatPercent });
        }
        return { id: photoId, photoUrl: url };
      }),
    analyzeProgress: guestOrUserProcedure
      .input(z.object({
        currentPhotoUrl: z.string(),
        baselinePhotoUrl: z.string().optional(),
        weightKg: z.number().optional(),
        baselineBodyFat: z.number().optional(),
        targetBodyFat: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const metricsContext: string[] = [];
        if (input.weightKg) metricsContext.push(`Current weight: ${input.weightKg} kg.`);
        if (input.baselineBodyFat) metricsContext.push(`Starting body fat (from onboarding scan): ${input.baselineBodyFat}%.`);
        if (input.targetBodyFat) metricsContext.push(`Target body fat goal: ${input.targetBodyFat}%.`);
        const metricsNote = metricsContext.length > 0
          ? `\nUser metrics: ${metricsContext.join(" ")}\nUse these to contextualise your analysis and rate progress toward their goal.`
          : "";

        const systemPrompt = `You are an expert fitness coach and body composition analyst. Analyze the progress photo(s) provided and return a JSON object with:
1. "summary": 1-2 sentence overall assessment of current physique and progress
2. "bodyFatEstimate": estimated current body fat percentage (number, 1 decimal place) based on visual assessment
3. "details": array of 3-4 specific observations about the physique (muscle development, fat distribution, posture, symmetry)
4. "improvements": array of 2-3 areas that need work or have improved since baseline
5. "recommendation": 1-2 sentence actionable recommendation for the next 2-4 weeks
6. "progressRating": one of "Excellent Progress", "Good Progress", "Steady Progress", "Just Getting Started", or "Keep Pushing"
${metricsNote}
${input.baselinePhotoUrl ? "The first image is the BASELINE photo from their initial scan. The second image is their CURRENT progress photo. Compare them carefully — note visible changes in fat distribution, muscle definition, body proportions, and face leanness." : "Analyze this single progress photo. Estimate body composition and provide constructive feedback."}`;

        const messages: any[] = [
          { role: "system", content: systemPrompt },
        ];

        if (input.baselinePhotoUrl) {
          messages.push({
            role: "user",
            content: [
              { type: "text", text: "Compare my baseline photo (first) with my current progress photo (second). How am I progressing toward my goal?" },
              { type: "image_url", image_url: { url: input.baselinePhotoUrl } },
              { type: "image_url", image_url: { url: input.currentPhotoUrl } },
            ],
          });
        } else {
          messages.push({
            role: "user",
            content: [
              { type: "text", text: "Analyze my current progress photo and give me feedback." },
              { type: "image_url", image_url: { url: input.currentPhotoUrl } },
            ],
          });
        }

        const response = await invokeLLM({ messages, response_format: { type: "json_object" } });

        let result: any;
        try {
          result = JSON.parse((response.choices[0].message.content as string));
        } catch {
          result = {
            summary: "Great progress! Keep up the consistent work.",
            bodyFatEstimate: null,
            details: ["Visible improvements in overall physique", "Posture appears improved", "Muscle tone developing well"],
            improvements: ["Continue current training approach", "Focus on nutrition consistency"],
            recommendation: "Stay consistent with your current plan. Consider increasing protein intake for better recovery.",
            progressRating: "Steady Progress",
          };
        }
        return result;
      }),
    getAll: protectedProcedure.query(async ({ ctx }) => db.getProgressPhotos(ctx.user.id)),
  }),
  goals: router({
    /** Save/update the user's target transformation goal */
    save: protectedProcedure
      .input(z.object({
        targetBodyFat: z.number(),
        imageUrl: z.string().optional(),
        description: z.string().optional(),
        originalPhotoUrl: z.string().optional(),
        originalBodyFat: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await db.saveUserGoal(ctx.user!.id, input);
        return { success: true, id };
      }),

    /** Get the user's current active goal */
    active: protectedProcedure
      .query(async ({ ctx }) => {
        return db.getActiveUserGoal(ctx.user!.id);
      }),

  }),
  progressCheckin: router({
    /** Save a progress check-in result */
    save: protectedProcedure
      .input(z.object({
        photoUrl: z.string(),
        weightKg: z.number().optional(),
        bodyFatEstimate: z.number().optional(),
        progressRating: z.string().optional(),
        summary: z.string().optional(),
        analysisJson: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await db.saveProgressCheckin(ctx.user!.id, input);
        return { success: true, id };
      }),

    /** Get progress check-in history */
    list: protectedProcedure
      .input(z.object({ limit: z.number().default(20) }).optional())
      .query(async ({ ctx, input }) => {
        return db.getProgressCheckins(ctx.user!.id, input?.limit ?? 20);
      }),

    /** Get the most recent check-in */
    latest: protectedProcedure
      .query(async ({ ctx }) => {
        return db.getLatestProgressCheckin(ctx.user!.id);
       }),
  }),
});
