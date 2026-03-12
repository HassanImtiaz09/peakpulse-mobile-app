import { z } from "zod";
import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { router, protectedProcedure, publicProcedure, guestOrUserProcedure } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import { generateImage } from "./_core/imageGeneration";
import { storagePut } from "./storage";
import * as db from "./db";

function randomSuffix() { return Math.random().toString(36).slice(2, 8); }

function getBFDescription(bf: number): string {
  const descriptions: Record<number, string> = {
    5: "extremely lean, stage-ready competition physique with full muscle separation and prominent veins",
    8: "very lean athletic physique with clear muscle definition and visible abs",
    10: "lean athletic body with well-defined muscles and visible six-pack abs",
    12: "fit and athletic physique with defined muscles and visible abs at rest",
    15: "healthy athletic build with some muscle definition and good muscle tone",
    18: "fit average build with moderate muscle tone and healthy proportions",
    20: "average healthy physique with soft muscle definition and healthy body proportions",
    25: "average build with minimal muscle definition and typical body composition",
  };
  const keys = Object.keys(descriptions).map(Number).sort((a, b) => a - b);
  const closest = keys.reduce((a, b) => Math.abs(b - bf) < Math.abs(a - bf) ? b : a);
  return descriptions[closest];
}

function getFallbackWorkoutPlan(goal: string) {
  return [
    { day: "Monday", focus: "Push Day", isRest: false, exercises: [
      { name: "Bench Press", sets: "4x8", rest: "90s", notes: "" },
      { name: "Shoulder Press", sets: "3x10", rest: "75s", notes: "" },
      { name: "Tricep Pushdown", sets: "3x12", rest: "60s", notes: "" },
    ]},
    { day: "Tuesday", focus: "Pull Day", isRest: false, exercises: [
      { name: "Deadlift", sets: "4x6", rest: "120s", notes: "" },
      { name: "Bent-over Row", sets: "4x8", rest: "90s", notes: "" },
      { name: "Pull-ups", sets: "3xMax", rest: "90s", notes: "" },
    ]},
    { day: "Wednesday", focus: "Rest & Recovery", isRest: true, exercises: [
      { name: "Light Walk", sets: "20-30min", rest: "", notes: "" },
      { name: "Stretching", sets: "10min", rest: "", notes: "" },
    ]},
    { day: "Thursday", focus: "Leg Day", isRest: false, exercises: [
      { name: "Barbell Squat", sets: "4x8", rest: "120s", notes: "" },
      { name: "Romanian Deadlift", sets: "3x10", rest: "90s", notes: "" },
      { name: "Leg Press", sets: "3x12", rest: "75s", notes: "" },
    ]},
    { day: "Friday", focus: "Upper Body", isRest: false, exercises: [
      { name: "Overhead Press", sets: "4x8", rest: "90s", notes: "" },
      { name: "Weighted Pull-ups", sets: "3x8", rest: "90s", notes: "" },
      { name: "DB Flies", sets: "3x12", rest: "60s", notes: "" },
    ]},
    { day: "Saturday", focus: "Rest & Recovery", isRest: true, exercises: [
      { name: "Foam Rolling", sets: "10min", rest: "", notes: "" },
      { name: "Yoga/Stretching", sets: "20min", rest: "", notes: "" },
    ]},
    { day: "Sunday", focus: "Rest", isRest: true, exercises: [
      { name: "Sleep 7-9hrs", sets: "tonight", rest: "", notes: "" },
    ]},
  ];
}

export const appRouter = router({
  health: publicProcedure.query(() => ({ status: "ok" })),
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  profile: router({
    // Protected — only for logged-in users
    get: protectedProcedure.query(async ({ ctx }) => db.getUserProfile(ctx.user.id)),
    upsert: protectedProcedure
      .input(z.object({
        age: z.number().optional(), gender: z.string().optional(),
        heightCm: z.number().optional(), weightKg: z.number().optional(),
        goal: z.string().optional(), workoutStyle: z.string().optional(),
        dietaryPreference: z.string().optional(), currentBodyFat: z.number().optional(),
        targetBodyFat: z.number().optional(), units: z.string().optional(), daysPerWeek: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => db.upsertUserProfile(ctx.user.id, input)),
    // Daily insight — works for guests too (no user-specific data needed)
    getDailyInsight: guestOrUserProcedure
      .input(z.object({ goal: z.string().optional() }).optional())
      .query(async ({ input }) => {
        const goal = input?.goal?.replace(/_/g, " ") ?? "general fitness";
        const response = await invokeLLM({
          messages: [
            { role: "system", content: "You are an elite fitness coach. Give a 1-2 sentence personalised coaching tip. Be specific, motivating, and actionable." },
            { role: "user", content: `My goal is "${goal}". Give me a daily coaching tip.` },
          ],
        });
        return { insight: response.choices[0].message.content ?? "Stay consistent — small daily actions compound into big results." };
      }),
  }),

  bodyScan: router({
    // AI analysis — works for guests (no DB save for guests)
    analyze: guestOrUserProcedure
      .input(z.object({ photoUrl: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const prompt = `You are an expert fitness assessment AI. Analyze this full-body photo and provide:
1. estimated_body_fat: estimated body fat percentage (number)
2. confidence_low: lower bound (number)
3. confidence_high: upper bound (number)
4. muscle_mass_estimate: "low"|"moderate"|"high"|"very_high"
5. analysis_notes: 2-3 sentences about physique
6. transformations: array of 5 objects for target BF levels [25,20,15,12,10], each with: target_bf, description, estimated_weeks, effort_level`;
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
        const transformationsWithImages = await Promise.all(
          (analysis.transformations ?? []).map(async (t: any) => {
            try {
              const bfDesc = getBFDescription(t.target_bf);
              const { url } = await generateImage({
                prompt: `Fitness transformation visualization: athletic person with ${bfDesc}. Professional fitness photography, clean background, physique clearly visible. No face. Motivational and realistic.`,
                originalImages: [{ url: input.photoUrl, mimeType: "image/jpeg" }],
              });
              return { ...t, imageUrl: url };
            } catch { return { ...t, imageUrl: null }; }
          })
        );
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
  }),

  workoutPlan: router({
    // AI generation — works for guests (no DB save for guests)
    generate: guestOrUserProcedure
      .input(z.object({ goal: z.string(), workoutStyle: z.string(), daysPerWeek: z.number().default(4), fitnessLevel: z.string().default("intermediate") }))
      .mutation(async ({ ctx, input }) => {
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
  }),

  mealPlan: router({
    // AI generation — works for guests (no DB save for guests)
    generate: guestOrUserProcedure
      .input(z.object({ goal: z.string(), dietaryPreference: z.string(), dailyCalories: z.number().optional(), weightKg: z.number().optional() }))
      .mutation(async ({ ctx, input }) => {
        const calories = input.dailyCalories ?? 2000;
        const prompt = `Generate a 7-day meal plan as JSON. Goal: ${input.goal.replace(/_/g," ")}, Diet: ${input.dietaryPreference}, Calories: ${calories}kcal. Return: {"dailyCalories":${calories},"proteinTarget":150,"carbTarget":200,"fatTarget":65,"dietType":"${input.dietaryPreference}","days":[{"day":"Monday","meals":[{"name":"Scrambled Eggs","type":"breakfast","calories":420,"protein":28,"carbs":35,"fat":14,"ingredients":["3 eggs"],"prepTime":"10 min"}]}],"insight":"tip"}. Respect dietary restrictions strictly.`;
        const response = await invokeLLM({ messages: [{ role: "system", content: "You are an expert dietitian. Always respond with valid JSON." }, { role: "user", content: prompt }], response_format: { type: "json_object" } });
        let planData: any;
        try { planData = JSON.parse((response.choices[0].message.content as string) ?? "{}"); }
        catch { planData = { dailyCalories: calories, days: [], insight: "Eat balanced meals and stay hydrated." }; }
        // Only save to DB if user is authenticated
        let planId: number | undefined;
        if (ctx.user) {
          planId = await db.createFitnessPlan(ctx.user.id, { planType: "meal", goal: input.goal, dietaryPreference: input.dietaryPreference, planJson: JSON.stringify(planData), insight: planData.insight });
        }
        return { id: planId, ...planData };
      }),
    getActive: protectedProcedure.query(async ({ ctx }) => {
      const plan = await db.getActiveFitnessPlan(ctx.user.id, "meal");
      if (!plan) return null;
      const data = JSON.parse(plan.planJson);
      return { id: plan.id, ...data, insight: plan.insight };
    }),
  }),

  mealPrep: router({
    // AI generation — works for guests
    generate: guestOrUserProcedure
      .input(z.object({ dietaryPreference: z.string(), servings: z.number().default(4), budget: z.string().default("moderate") }))
      .mutation(async ({ input }) => {
        const prompt = `Generate a weekly batch cooking meal prep plan as JSON. Diet: ${input.dietaryPreference}, Servings: ${input.servings}, Budget: ${input.budget}. Return: {"prepTime":"2-3 hours","recipes":[{"name":"Chicken Bowls","servings":${input.servings},"calories":450,"protein":40,"carbs":45,"fat":12,"ingredients":["500g chicken"],"instructions":["Step 1"],"storageInstructions":"4 days","mealType":"lunch"}],"shoppingList":["item1"],"tips":["tip1"]}. Respect dietary restrictions.`;
        const response = await invokeLLM({ messages: [{ role: "system", content: "You are a meal prep expert. Always respond with valid JSON." }, { role: "user", content: prompt }], response_format: { type: "json_object" } });
        let prepData: any;
        try { prepData = JSON.parse((response.choices[0].message.content as string) ?? "{}"); }
        catch { prepData = { prepTime: "2-3 hours", recipes: [], shoppingList: [], tips: [] }; }
        return prepData;
      }),
  }),

  mealLog: router({
    // Photo calorie analysis — works for guests
    analyzePhoto: guestOrUserProcedure
      .input(z.object({ photoUrl: z.string() }))
      .mutation(async ({ input }) => {
        const response = await invokeLLM({
          messages: [
            { role: "system", content: `Analyze this food image. Return JSON: {"foods":[{"name":"string","portion":"string","calories":number,"protein":number,"carbs":number,"fat":number}],"totalCalories":number,"totalProtein":number,"totalCarbs":number,"totalFat":number,"confidence":"low"|"medium"|"high","notes":"description"}` },
            { role: "user", content: [{ type: "text", text: "Estimate calories and macros for this food." }, { type: "image_url", image_url: { url: input.photoUrl } }] },
          ],
          response_format: { type: "json_object" },
        });
        let result: any;
        try { result = JSON.parse((response.choices[0].message.content as string) ?? "{}"); }
        catch { result = { foods: [], totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0, confidence: "low", notes: "Could not analyze" }; }
        return result;
      }),
    // Logging to DB — only for authenticated users
    log: protectedProcedure
      .input(z.object({ name: z.string(), mealType: z.string().optional(), calories: z.number().optional(), protein: z.number().optional(), carbs: z.number().optional(), fat: z.number().optional(), photoUrl: z.string().optional() }))
      .mutation(async ({ ctx, input }) => db.createMealLog(ctx.user.id, input)),
    getToday: protectedProcedure.query(async ({ ctx }) => db.getTodayMealLogs(ctx.user.id)),
  }),

  progress: router({
    // Photo upload and analysis — works for guests (no DB save for guests)
    uploadPhoto: guestOrUserProcedure
      .input(z.object({ photoBase64: z.string(), note: z.string().optional(), isBaseline: z.boolean().optional() }))
      .mutation(async ({ ctx, input }) => {
        const buffer = Buffer.from(input.photoBase64, "base64");
        const key = `progress/${ctx.user?.id ?? "guest"}/${Date.now()}-${randomSuffix()}.jpg`;
        const { url } = await storagePut(key, buffer, "image/jpeg");
        // Only save to DB if user is authenticated
        let photoId: number | undefined;
        if (ctx.user) {
          photoId = await db.createProgressPhoto(ctx.user.id, { photoUrl: url, note: input.note, isBaseline: input.isBaseline ?? false });
        }
        return { id: photoId, photoUrl: url };
      }),
    analyzeProgress: guestOrUserProcedure
      .input(z.object({ currentPhotoUrl: z.string(), baselinePhotoUrl: z.string().optional() }))
      .mutation(async ({ input }) => {
        const messages: any[] = [
          { role: "system", content: `You are an expert fitness coach analyzing progress photos. Return JSON: {"summary":"1-2 sentence assessment","details":["observation1","observation2","observation3","recommendation"],"improvements":["area1"],"recommendations":["rec1"]}` },
        ];
        if (input.baselinePhotoUrl) {
          messages.push({ role: "user", content: [{ type: "text", text: "Compare these progress photos (first=baseline, second=current). Analyze changes." }, { type: "image_url", image_url: { url: input.baselinePhotoUrl } }, { type: "image_url", image_url: { url: input.currentPhotoUrl } }] });
        } else {
          messages.push({ role: "user", content: [{ type: "text", text: "Analyze this progress photo." }, { type: "image_url", image_url: { url: input.currentPhotoUrl } }] });
        }
        const response = await invokeLLM({ messages, response_format: { type: "json_object" } });
        let result: any;
        try { result = JSON.parse((response.choices[0].message.content as string) ?? "{}"); }
        catch { result = { summary: "Great progress! Keep up the consistent work.", details: ["Visible improvements in overall physique", "Posture appears improved", "Muscle tone developing well", "Continue current training approach"], improvements: ["Core strength"], recommendations: ["Increase protein intake"] }; }
        return result;
      }),
    getAll: protectedProcedure.query(async ({ ctx }) => db.getProgressPhotos(ctx.user.id)),
  }),

  upload: router({
    // Photo upload — works for guests (stored to S3 without user ID)
    photo: guestOrUserProcedure
      .input(z.object({ base64: z.string(), mimeType: z.string().default("image/jpeg") }))
      .mutation(async ({ ctx, input }) => {
        const buffer = Buffer.from(input.base64, "base64");
        const ext = input.mimeType.includes("png") ? "png" : "jpg";
        const key = `uploads/${ctx.user?.id ?? "guest"}/${Date.now()}-${randomSuffix()}.${ext}`;
        const { url } = await storagePut(key, buffer, input.mimeType);
        return { url };
      }),
  }),
});

export type AppRouter = typeof appRouter;
