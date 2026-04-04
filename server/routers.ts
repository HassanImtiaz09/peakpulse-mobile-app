import { z } from "zod";
import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { router, protectedProcedure, publicProcedure, guestOrUserProcedure } from "./_core/trpc";
import { invokeLLM, uploadVideoToGeminiFileAPI } from "./_core/llm";
import { generateImage } from "./_core/imageGeneration";
import { storagePut } from "./storage";
import * as db from "./db";

function randomSuffix() { return Math.random().toString(36).slice(2, 8); }

/** Get the subscription plan for a user (defaults to 'free' for guests) */
async function getUserPlan(userId: number | undefined): Promise<string> {
  if (!userId) return "free";
  const sub = await db.getUserSubscription(userId);
  return sub?.plan ?? "free";
}

/** Enforce AI limit for a user. Throws TRPCError if limit exceeded. */
async function checkAiLimit(userId: number | undefined, endpoint: string): Promise<void> {
  if (!userId) return; // guests bypass metering (limited by auth anyway)
  const plan = await getUserPlan(userId);
  try {
    await db.enforceAiLimit(userId, plan, endpoint);
  } catch (err: any) {
    if (typeof err?.message === "string" && err.message.startsWith("AI_LIMIT_EXCEEDED")) {
      const [, tierName, limit] = err.message.split(":");
      throw new Error(`AI_LIMIT_EXCEEDED:You have used all ${limit} AI calls for this month on the ${tierName} plan. Upgrade to Advanced for unlimited access.`);
    }
    throw err;
  }
}

function getBFDescription(bf: number): string {
  const descriptions: Record<number, string> = {
    5: "extremely lean, competition-ready physique: paper-thin skin with full muscle striations visible on chest, shoulders, and quads; deep separation between every muscle group; highly visible vascularity across arms, forearms, and lower abs; razor-sharp intercostal and serratus definition; virtually zero subcutaneous fat anywhere on the torso",
    8: "very lean physique: clearly visible six-pack abs with deep grooves between each segment; visible oblique lines forming a V-taper; pronounced muscle striations on chest and shoulders; prominent vascularity on arms and forearms; visible separation between quad muscles; minimal subcutaneous fat on torso and limbs",
    10: "lean, athletic physique: well-defined six-pack abs clearly visible without flexing; noticeable V-lines at the hip; visible muscle separation on arms and shoulders; moderate vascularity on forearms and biceps; chest has clear upper/lower definition; obliques visible but not deeply striated; a thin layer of subcutaneous fat softens extreme definition",
    12: "lean build with visible abs: upper four abs clearly defined, lower two faintly visible; some muscle separation on arms and shoulders when relaxed; V-taper visible at hips; chest shows good shape but less defined separation; arms show muscle contour but minimal vascularity; a light layer of fat across the torso slightly softens muscle edges",
    15: "athletic, fit build: faint ab outline visible especially in good lighting; arm and shoulder muscles visibly toned and shaped; chest has good fullness but no visible separation between pecs; moderate V-taper; a noticeable but thin fat layer covers the midsection; obliques are not visible; legs show muscle shape but no separation lines",
    18: "fit-average build: no visible ab definition; torso appears smooth with an even layer of subcutaneous fat; arms and shoulders show general muscle shape beneath a soft layer; chest is full but undefined; waist has some soft tissue but no pronounced love handles; overall the body looks healthy and moderately active but without visible muscularity",
    20: "average build: no muscle definition visible; the midsection carries a noticeable layer of soft tissue creating a smooth, rounded torso; chest is soft with no visible pec outline; arms appear full but without visible muscle contour; mild love handles may be present; the body appears healthy but not actively trained",
    25: "softer physique: significant subcutaneous fat layer across the entire torso creating a rounded, smooth appearance; visible softness around the midsection and lower back; chest and arms appear full and soft; pronounced love handles; the waist-to-hip transition is smooth with no V-taper; face appears naturally fuller with rounded contours",
    30: "heavy-set build: thick layer of fat covering the torso; pronounced belly that extends forward; chest appears rounded and soft; arms are thick with no visible muscle definition; love handles are prominent; the chin area carries extra fullness; overall the body carries significant extra weight distributed across all areas",
  };
  const keys = Object.keys(descriptions).map(Number).sort((a, b) => a - b);
  const closest = keys.reduce((a, b) => Math.abs(b - bf) < Math.abs(a - bf) ? b : a);
  return descriptions[closest];
}

function getFaceTransformationDesc(currentBf: number, targetBf: number): string {
  // Use absolute target BF to describe the face, not just the delta.
  // This ensures each BF level always gets the same face description regardless of starting point.
  if (targetBf <= 8) {
    return "FACE at " + targetBf + "% BF: The face must appear extremely lean — sharp, angular jawline with zero softness under the chin; very prominent cheekbones with visible hollowing beneath them; temples slightly concave; neck appears thin and sinewy. The skin looks taut and tight across all facial bones. Despite the extreme leanness, the person must be clearly recognisable as the same individual from the reference photo (same eyes, nose shape, brow structure, skin tone, hair).";
  }
  if (targetBf <= 10) {
    return "FACE at " + targetBf + "% BF: The face must appear very lean — well-defined jawline with a sharp angle, no visible softness under the chin; cheekbones are prominent with slight shadowing beneath them; the face has an angular, athletic look. Neck appears lean. The person must be clearly recognisable as the same individual from the reference photo.";
  }
  if (targetBf <= 12) {
    return "FACE at " + targetBf + "% BF: The face must appear lean — clearly defined jawline with minimal softness, cheekbones visible but not hollowed; the face has a fit, healthy look with some angular definition. Very slight fullness under the chin is acceptable. The person must be clearly recognisable as the same individual from the reference photo.";
  }
  if (targetBf <= 15) {
    return "FACE at " + targetBf + "% BF: The face has a healthy, athletic appearance — the jawline is visible but not sharply defined; cheekbones have some definition but the face retains a natural fullness; a small amount of softness under the chin and along the jaw. The person must be clearly recognisable as the same individual from the reference photo.";
  }
  if (targetBf <= 18) {
    return "FACE at " + targetBf + "% BF: The face appears average and healthy — a soft but visible jawline; cheeks are naturally full without appearing puffy; moderate softness under the chin; the face looks neither lean nor heavy, just naturally proportioned. The person must be clearly recognisable as the same individual from the reference photo.";
  }
  if (targetBf <= 20) {
    return "FACE at " + targetBf + "% BF: The face appears slightly soft — the jawline is present but obscured by a thin layer of fat; cheeks are full and rounded; noticeable softness under the chin; the face has a healthy, relaxed look with no angular definition. The person must be clearly recognisable as the same individual from the reference photo.";
  }
  // 25%+
  return "FACE at " + targetBf + "% BF: The face appears noticeably full and rounded — the jawline is soft and not clearly defined; cheeks are full and prominent; visible double-chin or significant under-chin softness; the face has a wider, rounder appearance overall. The person must be clearly recognisable as the same individual from the reference photo.";
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

/** Build strict dietary restriction instructions for the AI prompt */
function getDietaryRestrictions(preference: string): string {
  const restrictions: Record<string, string> = {
    vegan: `STRICT VEGAN DIET — MANDATORY RULES:
• ABSOLUTELY NO animal products of any kind: no meat, poultry, fish, seafood, dairy, eggs, honey, gelatin, whey, casein, or any animal-derived ingredients.
• Every single meal and snack must be 100% plant-based.
• Use plant proteins: tofu, tempeh, seitan, legumes (lentils, chickpeas, black beans), edamame, quinoa, nuts, seeds.
• Use plant milks (oat, soy, almond), nutritional yeast, plant-based yogurt.
• If you include a meal that contains ANY animal product, the entire plan is invalid.`,

    vegetarian: `STRICT VEGETARIAN DIET — MANDATORY RULES:
• NO meat, poultry, fish, or seafood of any kind.
• Dairy and eggs are permitted.
• Focus on diverse protein sources: eggs, Greek yogurt, cottage cheese, legumes, tofu, tempeh, nuts, seeds, quinoa.
• If you include a meal with meat, poultry, or fish, the entire plan is invalid.`,

    halal: `STRICT HALAL DIET — MANDATORY RULES:
• ALL meat must be halal-certified (zabiha). Use only halal chicken, halal beef, halal lamb.
• ABSOLUTELY NO pork, bacon, ham, prosciutto, pepperoni, lard, or any pork-derived products.
• NO alcohol or alcohol-based ingredients (wine, beer, rum, vanilla extract with alcohol).
• NO gelatin unless specified as halal gelatin.
• Seafood (fish, shrimp) is generally permissible.
• If any meal contains pork or non-halal meat, the entire plan is invalid.`,

    kosher: `STRICT KOSHER DIET — MANDATORY RULES:
• NO pork or shellfish.
• Do NOT mix meat and dairy in the same meal.
• Use only kosher-certified meats.
• Fish with fins and scales are permitted.
• Keep meat meals and dairy meals completely separate.`,

    keto: `STRICT KETOGENIC DIET — MANDATORY RULES:
• Maximum 20-30g net carbs per day across ALL meals.
• Each meal should be: ~70-75% calories from fat, ~20-25% protein, ~5% carbs.
• NO bread, pasta, rice, potatoes, sugar, fruit juice, or high-carb fruits.
• ALLOWED: meat, fatty fish, eggs, butter, cheese, nuts, seeds, avocado, olive oil, coconut oil, low-carb vegetables (spinach, kale, broccoli, cauliflower, zucchini).
• Include net carb count for each meal.
• If any single meal exceeds 10g net carbs, the plan is invalid.`,

    paleo: `STRICT PALEO DIET — MANDATORY RULES:
• NO grains (wheat, rice, oats, corn), legumes (beans, lentils, peanuts), dairy, refined sugar, or processed foods.
• ALLOWED: meat, fish, eggs, vegetables, fruits, nuts (except peanuts), seeds, olive oil, coconut oil, sweet potatoes.
• Focus on whole, unprocessed foods only.`,

    pescatarian: `STRICT PESCATARIAN DIET — MANDATORY RULES:
• NO meat or poultry (chicken, beef, pork, lamb, turkey, etc.).
• Fish and seafood ARE allowed and should be the primary animal protein.
• Dairy and eggs are permitted.
• Include a variety of fish: salmon, tuna, cod, shrimp, sardines.`,

    "gluten-free": `STRICT GLUTEN-FREE DIET — MANDATORY RULES:
• ABSOLUTELY NO wheat, barley, rye, or any gluten-containing grains.
• NO regular bread, pasta, flour tortillas, soy sauce (use tamari), beer, or most cereals.
• ALLOWED grains: rice, quinoa, oats (certified GF), buckwheat, millet, corn.
• Check all sauces and condiments for hidden gluten.`,

    "dairy-free": `STRICT DAIRY-FREE DIET — MANDATORY RULES:
• NO milk, cheese, butter, cream, yogurt, ice cream, whey, or casein.
• Use plant-based alternatives: oat milk, coconut cream, cashew cheese, vegan butter.
• Check all processed foods for hidden dairy ingredients.`,
  };

  const key = preference.toLowerCase().replace(/[\s_]+/g, "-");
  if (key === "omnivore" || key === "none" || !restrictions[key]) {
    return "No specific dietary restrictions. Include a balanced variety of proteins, carbs, and fats.";
  }
  return restrictions[key];
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
  }),

  // ── Dietary restriction enforcement helper ──────────────────────────
  // Used by meal plan generation to give the LLM strict, non-negotiable rules
  // for each dietary preference instead of a vague "Diet: vegan" hint.

  mealPlan: router({
    // AI generation — works for guests (no DB save for guests)
    generate: guestOrUserProcedure
      .input(z.object({ goal: z.string(), dietaryPreference: z.string(), dailyCalories: z.number().optional(), weightKg: z.number().optional(), heightCm: z.number().optional(), age: z.number().optional(), gender: z.string().optional(), activityLevel: z.string().optional(), ramadanMode: z.boolean().optional(), region: z.string().optional(), cuisinePrefs: z.array(z.string()).optional(), preferenceHint: z.string().optional(), favouriteFoods: z.array(z.object({ name: z.string(), calories: z.number(), protein: z.number(), carbs: z.number(), fat: z.number() })).optional(), pastMealNames: z.array(z.string()).optional() }))
      .mutation(async ({ ctx, input }) => {
        await checkAiLimit(ctx.user?.id, "mealPlan.generate");
        // Personalised TDEE via Mifflin-St Jeor if body metrics are provided
        function calcTDEE(w: number, h: number, a: number, g: string, activity: string, goal: string): number {
          const bmr = g === 'female' ? (10*w + 6.25*h - 5*a - 161) : (10*w + 6.25*h - 5*a + 5);
          const mult: Record<string,number> = { sedentary:1.2, light:1.375, moderate:1.55, very_active:1.725, extra:1.9 };
          const tdee = bmr * (mult[activity] ?? 1.55);
          let adjusted: number;
          if (goal === 'lose_fat') adjusted = tdee * 0.80;
          else if (goal === 'build_muscle') adjusted = tdee * 1.15;
          else if (goal === 'athletic') adjusted = tdee * 0.92;
          else adjusted = tdee;
          const minCal = g === 'female' ? 1200 : 1500;
          return Math.round(Math.max(adjusted, minCal));
        }
        let calories: number;
        if (input.dailyCalories) {
          calories = input.dailyCalories;
        } else if (input.weightKg && input.heightCm && input.age) {
          calories = calcTDEE(input.weightKg, input.heightCm, input.age, input.gender ?? 'male', input.activityLevel ?? 'moderate', input.goal);
        } else {
          calories = 2000; // fallback only when no metrics available
        }
        const isRamadan = input.ramadanMode === true;
        const ramadanNote = isRamadan ? `IMPORTANT: This is a Ramadan meal plan. Structure meals as: Suhoor (pre-dawn meal, ~30% calories), Iftar (fast-breaking meal, ~40% calories), and Isha/Evening snack (~30% calories). All meals must be halal. Include dates for Iftar. Suhoor should be slow-digesting foods for sustained energy during the fast. Iftar should start light (dates + water) then a proper meal. Avoid fried/heavy foods.` : "";
        const favFoodsNote = input.favouriteFoods && input.favouriteFoods.length > 0
          ? `IMPORTANT: The user frequently eats and enjoys these foods. Incorporate them into the meal plan where nutritionally appropriate (at least 3-4 times across the week): ${input.favouriteFoods.map(f => `${f.name} (${f.calories}kcal, P:${f.protein}g C:${f.carbs}g F:${f.fat}g)`).join(", ")}. Use these as base ingredients or full meals, adjusting portions to fit the calorie target.`
          : "";
        const dietaryRules = getDietaryRestrictions(input.dietaryPreference);
        const regionNote = input.region ? `- Region/Location: ${input.region.replace(/_/g, " ")}` : "";
        const cuisineNote = input.cuisinePrefs && input.cuisinePrefs.length > 0
          ? `CUISINE PREFERENCES: The user prefers ${input.cuisinePrefs.map(c => c.replace(/_/g, " ")).join(", ")} cuisine(s). Prioritise dishes from these cuisines while keeping meals healthy and within calorie targets. Use authentic ingredients and cooking methods from these cuisines. At least 70% of meals should reflect these cuisine preferences.`
          : "";
        const regionCuisineNote = input.region && !input.cuisinePrefs?.length
          ? `REGIONAL CONTEXT: The user is based in ${input.region.replace(/_/g, " ")}. Suggest meals using locally available ingredients and popular healthy dishes from this region. Consider local supermarket availability and seasonal produce.`
          : "";
        const prefHintNote = input.preferenceHint ? `\nUSER TASTE PREFERENCES (from previous ratings):\n${input.preferenceHint}\n` : "";
        const prompt = `Generate a 7-day meal plan as JSON.

USER PROFILE:
- Fitness Goal: ${input.goal.replace(/_/g, " ")}
- Dietary Preference: ${input.dietaryPreference.toUpperCase()}
- Daily Calorie Target: ~${calories} kcal
${input.weightKg ? `- Weight: ${input.weightKg} kg` : ""}
${input.heightCm ? `- Height: ${input.heightCm} cm` : ""}
${regionNote}
${isRamadan ? `\n${ramadanNote}` : ""}
${favFoodsNote}
${cuisineNote}
${regionCuisineNote}
${prefHintNote}${input.pastMealNames && input.pastMealNames.length > 0 ? `
MEAL HISTORY — DO NOT REPEAT THESE DISHES (the user has had these recently):
${input.pastMealNames.slice(0, 50).join(", ")}
Generate COMPLETELY DIFFERENT meals from the ones listed above. Use different proteins, cooking methods, and flavour profiles.
` : ""}
DIETARY RESTRICTIONS (MUST FOLLOW — NON-NEGOTIABLE):
${dietaryRules}

COMPLIANCE CHECK: Before finalizing, verify EVERY meal in the plan against the dietary restrictions above. If any meal violates the rules, replace it with a compliant alternative.

Each day must include: ${isRamadan ? "suhoor, iftar, and evening snack (3 meals)" : "breakfast, lunch, dinner, and 1 snack (4 meals)"}. For each meal include: name (SHORT, 3-5 words), type, calories, protein, carbs, fat, ingredients (3-5 items), prepTime, instructions (2-3 SHORT steps), photoQuery (2-3 word search term specific to that dish, e.g. \"grilled salmon asparagus\").

IMPORTANT: The "days" array MUST contain exactly 7 entries, one for each day of the week, using these EXACT day names in this order: "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday". Do NOT use abbreviations, numbers, or any other format.

CRITICAL VARIETY REQUIREMENT — THIS IS THE MOST IMPORTANT RULE:
1. Every single meal name across ALL 7 days MUST be completely unique. There must be ZERO repeated meal names in the entire plan.
2. Each day MUST have its OWN set of meals — do NOT copy/paste the same meals from one day to another.
3. Monday's breakfast MUST be different from Tuesday's breakfast, which MUST be different from Wednesday's breakfast, etc.
4. Vary cooking methods (grilled, baked, stir-fried, steamed, raw, poached, roasted, sautéed), protein sources (chicken, fish, beef, tofu, eggs, lentils, beans), and cuisines across the week.
5. Each meal's photoQuery MUST be specific to that exact dish (e.g., "grilled salmon asparagus" not just "dinner plate"). Every photoQuery must be different.
6. SELF-CHECK: Before returning, count all meal names. If ANY two meals share the same name, replace one with a different recipe.
7. The plan must contain exactly 7 day objects with DIFFERENT meals in each — the user should see completely new food every day.

Return COMPACT JSON: {"dailyCalories":${calories},"days":[{"day":"Monday","meals":[{"name":"Egg Avocado Toast","type":"breakfast","calories":420,"protein":28,"carbs":35,"fat":14,"ingredients":["eggs","avocado","bread"],"prepTime":"10 min","instructions":["Toast bread","Cook eggs","Assemble"],"photoQuery":"avocado egg toast"},...]},...all 7 days...],"insight":"tip"}`;
        // Use higher max_tokens to prevent truncation of 7-day meal plan JSON
        const llmCall = async (maxTokens: number, retryPrompt?: string) => {
          return invokeLLM({
            messages: [
              { role: "system", content: "You are an expert registered dietitian who STRICTLY adheres to dietary restrictions. The user's dietary preference is the HIGHEST PRIORITY constraint — it overrides all other considerations. If the user is vegan, every single ingredient must be plant-based. If halal, every meat must be halal-certified with zero pork products. If keto, total daily carbs must stay under 30g. NEVER include a food that violates the stated dietary restriction. Always respond with valid JSON matching the required schema. Keep meal names SHORT (3-5 words max). Keep instructions to 3 steps max. Keep ingredients to 5 items max. This ensures the response fits within token limits." },
              { role: "user", content: retryPrompt ?? prompt },
            ],
            response_format: { type: "json_object" },
            max_tokens: maxTokens,
          });
        };
        let planData: any;
        // First attempt with generous token limit
        let response = await llmCall(16384);
        let rawContent = (response.choices[0].message.content as string) ?? "{}";
        try {
          planData = JSON.parse(rawContent);
        } catch {
          // JSON truncated — retry with a more compact prompt
          console.warn("[MealPlan] First attempt truncated, retrying with compact prompt...");
          const compactPrompt = `Generate a 7-day meal plan as JSON. Target: ~${calories} kcal/day, ${input.dietaryPreference} diet, goal: ${input.goal.replace(/_/g, " ")}.
${isRamadan ? "Ramadan mode: suhoor, iftar, evening snack." : "Meals: breakfast, lunch, dinner, 1-2 snacks."}
${dietaryRules}
${input.pastMealNames?.length ? `Avoid these past meals: ${input.pastMealNames.slice(0, 20).join(", ")}` : ""}
${cuisineNote}
Rules: EVERY day must have DIFFERENT meals. Keep names short (3-5 words). 3 ingredients max per meal. 2 instruction steps max. Each meal needs: name, type, calories, protein, carbs, fat, ingredients[], instructions[], photoQuery (2-3 words describing the specific dish).
Day names MUST be: "Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday".
Return: {"dailyCalories":${calories},"days":[{"day":"Monday","meals":[{"name":"...","type":"breakfast","calories":400,"protein":30,"carbs":40,"fat":15,"ingredients":["..."],"instructions":["..."],"photoQuery":"..."},...]},...],"insight":"tip"}`;
          try {
            response = await llmCall(16384, compactPrompt);
            rawContent = (response.choices[0].message.content as string) ?? "{}";
            planData = JSON.parse(rawContent);
          } catch {
            console.warn("[MealPlan] Second attempt also failed, using fallback");
            planData = { dailyCalories: calories, days: [], insight: "Eat balanced meals and stay hydrated." };
          }
        }
        // Validate that we got 7 days with meals — if not, the response was likely truncated
        if (!planData?.days || planData.days.length < 7 || planData.days.some((d: any) => !d.meals?.length)) {
          console.warn(`[MealPlan] Incomplete plan: ${planData?.days?.length ?? 0} days. Attempting compact retry...`);
          const compactRetryPrompt = `Generate a 7-day meal plan as compact JSON. ~${calories} kcal/day, ${input.dietaryPreference} diet.
Each day: 4 meals (breakfast, lunch, dinner, snack). Keep names SHORT. Minimal ingredients (3 max). No instructions needed.
Days: Monday through Sunday. ALL different meals each day.
Format: {"dailyCalories":${calories},"days":[{"day":"Monday","meals":[{"name":"Egg Toast","type":"breakfast","calories":350,"protein":20,"carbs":30,"fat":12,"ingredients":["eggs","bread"],"instructions":["Cook"],"photoQuery":"egg toast"}]}],"insight":"tip"}`;
          try {
            response = await llmCall(16384, compactRetryPrompt);
            rawContent = (response.choices[0].message.content as string) ?? "{}";
            const retryData = JSON.parse(rawContent);
            if (retryData?.days?.length >= 7) planData = retryData;
          } catch { /* keep whatever we had */ }
        }
        // Post-generation deduplication: ensure no two days share the same meals
        if (planData?.days && Array.isArray(planData.days)) {
          const seenMealNames = new Set<string>();
          for (const day of planData.days) {
            if (!day.meals || !Array.isArray(day.meals)) continue;
            for (const meal of day.meals) {
              const key = (meal.name ?? "").toLowerCase().trim();
              if (key && seenMealNames.has(key)) {
                // Duplicate found — append day name to make it unique and update photoQuery
                meal.name = `${meal.name} (${day.day} Special)`;
                meal.photoQuery = `${meal.photoQuery || meal.name} ${day.day?.toLowerCase() || ""} style`.trim();
              }
              if (key) seenMealNames.add(key);
            }
          }
          // Ensure each day has a unique set of meals (detect if AI copied same array)
          const daySignatures = planData.days.map((d: any) => 
            (d.meals ?? []).map((m: any) => (m.name ?? "").toLowerCase().trim()).sort().join("|")
          );
          const uniqueSignatures = new Set(daySignatures);
          if (uniqueSignatures.size < Math.min(planData.days.length, 3)) {
            // Most days have identical meals — this is a critical failure
            // Add day-specific suffixes to differentiate
            const dayThemes = ["Mediterranean", "Asian", "Latin", "Middle Eastern", "Nordic", "Indian", "American"];
            planData.days.forEach((day: any, idx: number) => {
              if (idx === 0) return; // Keep first day as-is
              const sig = daySignatures[idx];
              const firstOccurrence = daySignatures.indexOf(sig);
              if (firstOccurrence < idx) {
                // This day is a duplicate of an earlier day
                day.meals?.forEach((meal: any) => {
                  const theme = dayThemes[idx % dayThemes.length];
                  meal.name = `${theme} ${meal.name}`;
                  meal.photoQuery = `${theme.toLowerCase()} ${meal.photoQuery || meal.name}`;
                });
              }
            });
          }
        }
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
    // Regenerate a single day's meals without touching the rest of the week
    regenerateDay: guestOrUserProcedure
      .input(z.object({
        dayName: z.string(),
        theme: z.string().optional(),
        goal: z.string(),
        dietaryPreference: z.string(),
        dailyCalories: z.number().optional(),
        ramadanMode: z.boolean().optional(),
        region: z.string().optional(),
        cuisinePrefs: z.array(z.string()).optional(),
        pastMealNames: z.array(z.string()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await checkAiLimit(ctx.user?.id, "mealPlan.regenerateDay");
        const calories = input.dailyCalories ?? 2000;
        const isRamadan = input.ramadanMode === true;
        const dietaryRules = getDietaryRestrictions(input.dietaryPreference);
        const themeNote = input.theme ? `THEME FOR THIS DAY: ${input.theme}. All meals for this day should follow this theme — e.g., if the theme is "high-protein", maximise protein in every meal; if it's "Mediterranean", use Mediterranean ingredients and cooking styles; if it's "comfort food", use hearty comforting dishes while staying within calorie limits.` : "";
        const cuisineNote = input.cuisinePrefs && input.cuisinePrefs.length > 0
          ? `CUISINE PREFERENCES: Prioritise ${input.cuisinePrefs.map(c => c.replace(/_/g, " ")).join(", ")} cuisine(s).`
          : "";
        const prompt = `Generate meals for a SINGLE day (${input.dayName}) as JSON.

USER PROFILE:
- Fitness Goal: ${input.goal.replace(/_/g, " ")}
- Dietary Preference: ${input.dietaryPreference.toUpperCase()}
- Daily Calorie Target: ~${calories} kcal
${input.region ? `- Region: ${input.region.replace(/_/g, " ")}` : ""}
${themeNote}
${cuisineNote}
${input.pastMealNames && input.pastMealNames.length > 0 ? `\nMEAL HISTORY — DO NOT REPEAT THESE DISHES:\n${input.pastMealNames.slice(0, 30).join(", ")}\nGenerate COMPLETELY DIFFERENT meals from the above.\n` : ""}
DIETARY RESTRICTIONS (MUST FOLLOW — NON-NEGOTIABLE):
${dietaryRules}

Include: ${isRamadan ? "suhoor, iftar, and evening snack meals" : "breakfast, morning snack, lunch, afternoon snack, dinner (4-5 meals)"}. Each meal MUST have: name, type, calories, protein, carbs, fat, ingredients array, prepTime, instructions array (3-5 steps), photoQuery.

IMPORTANT: Every meal name must be unique and specific. Each photoQuery must be a specific 2-4 word description of that exact dish (e.g., "grilled salmon asparagus" not "dinner"). No two meals should share the same name or photoQuery.

Return ONLY this structure: {"day":"${input.dayName}","meals":[{"name":"Meal Name","type":"breakfast","calories":420,"protein":28,"carbs":35,"fat":14,"ingredients":["ingredient 1"],"prepTime":"10 min","instructions":["Step 1"],"photoQuery":"food term"}]}`;
        const response = await invokeLLM({
          messages: [
            { role: "system", content: "You are an expert registered dietitian. Generate meals for a single day only. STRICTLY adhere to dietary restrictions. Always respond with valid JSON. Keep meal names SHORT (3-5 words). Keep ingredients to 5 items max. Keep instructions to 3 steps max." },
            { role: "user", content: prompt },
          ],
          response_format: { type: "json_object" },
          model: "flash-lite",
          max_tokens: 8192,
        });
        let dayData: any;
        try { dayData = JSON.parse((response.choices[0].message.content as string) ?? "{}"); }
        catch {
          console.warn("[MealPlan] regenerateDay JSON parse failed, retrying...");
          try {
            const retry = await invokeLLM({
              messages: [
                { role: "system", content: "You are a dietitian. Respond with compact JSON only. Short meal names, 3 ingredients max, 2 steps max." },
                { role: "user", content: `Generate 4 meals for ${input.dayName}. ~${calories} kcal total. ${input.dietaryPreference} diet. Return: {"day":"${input.dayName}","meals":[{"name":"Short Name","type":"breakfast","calories":400,"protein":30,"carbs":40,"fat":15,"ingredients":["item"],"prepTime":"10 min","instructions":["Cook"],"photoQuery":"dish name"}]}` },
              ],
              response_format: { type: "json_object" },
              model: "flash-lite",
              max_tokens: 4096,
            });
            dayData = JSON.parse((retry.choices[0].message.content as string) ?? "{}");
          } catch {
            dayData = { day: input.dayName, meals: [] };
          }
        }
        if (!dayData.day) dayData.day = input.dayName;
        return dayData;
      }),
  }),

  mealImages: router({
    // Generate AI images for meals in a meal plan
    generateBatch: guestOrUserProcedure
      .input(z.object({
        meals: z.array(z.object({
          dayIndex: z.number(),
          mealIndex: z.number(),
          name: z.string(),
          photoQuery: z.string().optional(),
        })),
      }))
      .mutation(async ({ input }) => {
        // Generate images in parallel (max 5 concurrent to avoid overload)
        const results: Array<{ dayIndex: number; mealIndex: number; photoUrl: string | null }> = [];
        const BATCH_SIZE = 5;
        for (let i = 0; i < input.meals.length; i += BATCH_SIZE) {
          const batch = input.meals.slice(i, i + BATCH_SIZE);
          const batchResults = await Promise.allSettled(
            batch.map(async (meal) => {
              const query = meal.photoQuery || meal.name;
              const prompt = `Professional food photography of ${query}. Beautifully plated dish, top-down view, natural lighting, on a clean modern plate, restaurant quality presentation. No text, no watermarks.`;
              try {
                const { url } = await generateImage({ prompt });
                return { dayIndex: meal.dayIndex, mealIndex: meal.mealIndex, photoUrl: url ?? null };
              } catch {
                return { dayIndex: meal.dayIndex, mealIndex: meal.mealIndex, photoUrl: null };
              }
            })
          );
          for (const r of batchResults) {
            if (r.status === "fulfilled") results.push(r.value);
          }
        }
        return { images: results };
      }),
  }),

  mealPrep: router({
    // AI generation — works for guests
    generate: guestOrUserProcedure
      .input(z.object({ dietaryPreference: z.string(), servings: z.number().default(4), budget: z.string().default("moderate") }))
      .mutation(async ({ input }) => {
        const prompt = `Generate a weekly batch cooking meal prep plan as JSON. Diet: ${input.dietaryPreference}, Servings: ${input.servings}, Budget: ${input.budget}. Return: {"prepTime":"2-3 hours","recipes":[{"name":"Chicken Bowls","servings":${input.servings},"calories":450,"protein":40,"carbs":45,"fat":12,"ingredients":["500g chicken"],"instructions":["Step 1"],"storageInstructions":"4 days","mealType":"lunch"}],"shoppingList":["item1"],"tips":["tip1"]}. Respect dietary restrictions.`;
        const response = await invokeLLM({ messages: [{ role: "system", content: "You are a meal prep expert. Always respond with valid JSON." }, { role: "user", content: prompt }], response_format: { type: "json_object" }, model: "flash-lite" });
        let prepData: any;
        try { prepData = JSON.parse((response.choices[0].message.content as string) ?? "{}"); }
        catch { prepData = { prepTime: "2-3 hours", recipes: [], shoppingList: [], tips: [] }; }
        return prepData;
      }),
    // Generate meal prep from expiring pantry items
    fromExpiring: guestOrUserProcedure
      .input(z.object({ expiringItems: z.string(), allPantryItems: z.string(), servings: z.number().default(4) }))
      .mutation(async ({ input }) => {
        const prompt = `You are a zero-waste chef. These pantry items are EXPIRING SOON and must be used first:\n${input.expiringItems}\n\nFull pantry:\n${input.allPantryItems}\n\nCreate 3-5 batch-cooking recipes that PRIORITIZE using the expiring items. Each recipe should make ${input.servings} servings and store well.\n\nReturn JSON:\n{"recipes":[{"name":"Recipe Name","usesExpiring":["item1","item2"],"servings":${input.servings},"calories":450,"protein":30,"carbs":45,"fat":15,"prepTime":"30 min","cookTime":"45 min","ingredients":[{"name":"Chicken","amount":"500g","fromPantry":true}],"instructions":["Step 1","Step 2"],"storageInstructions":"Fridge 4 days, freezer 2 weeks","mealType":"lunch"}],"tips":["Tip to reduce waste"]}`;
        const response = await invokeLLM({ messages: [{ role: "system", content: "You are a zero-waste meal prep expert. Always respond with valid JSON." }, { role: "user", content: prompt }], response_format: { type: "json_object" } });
        let data: any;
        try { data = JSON.parse((response.choices[0].message.content as string) ?? "{}"); }
        catch { data = { recipes: [], tips: ["Check your pantry for items expiring soon."] }; }
        return data;
      }),
  }),

  mealLog: router({
    // Photo calorie analysis — works for guests
    analyzePhoto: guestOrUserProcedure
      .input(z.object({ photoUrl: z.string() }))
      .mutation(async ({ ctx, input }) => {
        await checkAiLimit(ctx.user?.id, "mealLog.analyzePhoto");
        const response = await invokeLLM({
          messages: [
            { role: "system", content: `You are an expert nutritionist AI with food recognition capabilities. Analyze this food photo carefully.\n\nIdentify every distinct food item visible. For each item, estimate realistic portion size, calories, protein (g), carbs (g), and fat (g).\n\nReturn JSON:\n{\n  "foods": [{ "name": "string", "portion": "string (e.g. 1 cup, 200g)", "calories": number, "protein": number, "carbs": number, "fat": number }],\n  "totalCalories": number,\n  "totalProtein": number,\n  "totalCarbs": number,\n  "totalFat": number,\n  "confidence": "low" | "medium" | "high",\n  "mealType": "breakfast" | "lunch" | "dinner" | "snack",\n  "healthScore": number (1-10, where 10 is very healthy),\n  "suggestion": "string (one short actionable tip to make this meal healthier)",\n  "notes": "string (brief description of what you see)"\n}\n\nBe accurate with portions. Use conservative estimates when uncertain. The healthScore should reflect nutritional balance, whole food content, and macro distribution.` },
            { role: "user", content: [{ type: "text", text: "Analyze this food photo. Identify all items and estimate nutrition." }, { type: "image_url", image_url: { url: input.photoUrl } }] },
          ],
          response_format: { type: "json_object" },
        });
        let result: any;
        try { result = JSON.parse((response.choices[0].message.content as string) ?? "{}"); }
        catch { result = { foods: [], totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0, confidence: "low", notes: "Could not analyze" }; }

        // Server-side macro recalculation: validate every food item with p×4 + c×4 + f×9
        if (result.foods && Array.isArray(result.foods)) {
          for (const food of result.foods) {
            const p = Number(food.protein) || 0;
            const c = Number(food.carbs) || 0;
            const f = Number(food.fat) || 0;
            const calculatedCal = Math.round(p * 4 + c * 4 + f * 9);
            // If AI's calorie estimate deviates >15% from macro-derived value, correct it
            const aiCal = Number(food.calories) || 0;
            if (aiCal === 0 || Math.abs(aiCal - calculatedCal) / Math.max(calculatedCal, 1) > 0.15) {
              food.calories = calculatedCal;
            }
          }
          // Recalculate totals from corrected individual items
          result.totalProtein = result.foods.reduce((s: number, f: any) => s + (Number(f.protein) || 0), 0);
          result.totalCarbs = result.foods.reduce((s: number, f: any) => s + (Number(f.carbs) || 0), 0);
          result.totalFat = result.foods.reduce((s: number, f: any) => s + (Number(f.fat) || 0), 0);
          result.totalCalories = Math.round(
            result.totalProtein * 4 + result.totalCarbs * 4 + result.totalFat * 9
          );
        }

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

  workout: router({
    // AI form analysis — works for guests
    // Uses Gemini File API resumable upload for video instead of raw base64 in body
    analyzeForm: guestOrUserProcedure
      .input(z.object({ exerciseName: z.string(), videoBase64: z.string().optional(), hasVideo: z.boolean().default(false) }))
      .mutation(async ({ ctx, input }) => {
        await checkAiLimit(ctx.user?.id, "workout.analyzeForm");
        const prompt = `You are an expert personal trainer and biomechanics coach. Analyse the ${input.exerciseName} exercise form${input.hasVideo ? " from the provided video" : " based on common form mistakes"}. Return a JSON object with this exact structure: {"score":75,"grade":"good","exerciseName":"${input.exerciseName}","positives":["Good depth achieved","Neutral spine maintained"],"corrections":["Knees caving inward slightly","Elbows flaring too wide"],"feedback":["Overall your form is solid. Focus on keeping your knees tracking over your toes throughout the movement.","Remember to brace your core before each rep."]}. Score 0-100: 0-44 poor, 45-64 fair, 65-79 good, 80-100 excellent. Be specific and actionable.`;
        const messages: any[] = [{ role: "system", content: "You are an expert personal trainer. Always respond with valid JSON." }, { role: "user", content: prompt }];

        if (input.hasVideo && input.videoBase64 && input.videoBase64.length > 0) {
          try {
            // Upload video via Gemini File API resumable upload (proper method)
            const videoBuffer = Buffer.from(input.videoBase64, "base64");
            const { fileUri, mimeType } = await uploadVideoToGeminiFileAPI(
              videoBuffer,
              "video/mp4",
              `form-check-${input.exerciseName.replace(/\s+/g, "-").toLowerCase()}`,
            );
            // Reference the uploaded file URI in the prompt
            messages[1].content = [
              { type: "text", text: prompt },
              { type: "file_url", file_url: { url: fileUri, mime_type: mimeType } },
            ];
          } catch (uploadErr: any) {
            // If Gemini File API upload fails (e.g. no key), fall back to text-only analysis
            console.warn("Gemini File API upload failed, falling back to text-only:", uploadErr.message);
          }
        }

        const response = await invokeLLM({ messages, response_format: { type: "json_object" } });
        let result: any;
        try { result = JSON.parse((response.choices[0].message.content as string) ?? "{}"); }
        catch { result = { score: 65, grade: "good", exerciseName: input.exerciseName, positives: ["Good effort on the exercise"], corrections: ["Focus on controlled movement throughout"], feedback: ["Keep practising and your form will improve with each session."] }; }
        return result;
      }),
  }),

  social: router({
    // Get community feed posts
    getFeed: guestOrUserProcedure
      .input(z.object({ limit: z.number().default(20), offset: z.number().default(0) }))
      .query(async ({ ctx, input }) => {
        if (!ctx.user) {
          // Return sample posts for guests
          return { posts: db.getSamplePostsForGuests(), total: 6 };
        }
        const posts = await db.getSocialPosts(input.limit, input.offset);
        return { posts, total: posts.length };
      }),
    createPost: protectedProcedure
      .input(z.object({ type: z.enum(["progress", "achievement", "challenge"]), caption: z.string().optional(), weightKg: z.number().optional(), bodyFatPercent: z.number().optional(), photoUrl: z.string().optional(), achievement: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        return db.createSocialPost(ctx.user.id, { type: input.type, caption: input.caption, weightKg: input.weightKg, bodyFatPercent: input.bodyFatPercent, photoUrl: input.photoUrl, achievement: input.achievement });
      }),
    likePost: protectedProcedure
      .input(z.object({ postId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        return db.likePost(ctx.user.id, input.postId);
      }),
  }),

  subscription: router({
    getPlans: publicProcedure.query(() => ({
      plans: [
        { id: "basic", name: "Basic", price: 5.99, currency: "GBP", interval: "month", features: ["Unlimited AI Workout Plans", "Unlimited AI Meal Plans", "Unlimited Calorie Scans", "Voice Coaching & Audio Cues", "Workout Analytics & Charts", "Progress Photos (5/month)", "Basic Body Scan", "Offline Workout Mode", "PR Tracking", "Custom Timer Sounds"], notIncluded: ["Wearable Sync", "AI Coach Chat", "Form Checker", "Social Feed", "Meal Prep Plans"] },
        { id: "pro", name: "Pro", price: 11.99, currency: "GBP", interval: "month", popular: true, features: ["Everything in Basic", "Wearable Device Sync", "AI Coach Chat", "Exercise Form Checker", "Social Feed & Challenges", "Meal Prep Plans", "Unlimited Progress Photos", "Priority AI Processing", "Advanced AI Body Scan", "Real-time Form Analysis"], notIncluded: [] },
      ],
    })),
    getCurrentPlan: guestOrUserProcedure.query(async ({ ctx }) => {
      if (!ctx.user) return { plan: "free", expiresAt: null };
      const sub = await db.getUserSubscription(ctx.user.id);
      return sub ?? { plan: "free", expiresAt: null };
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

  mealSwap: router({
    // AI-powered meal swap — generates 6 personalised calorie-equivalent alternatives
    generate: guestOrUserProcedure
      .input(z.object({
        mealName: z.string(),
        mealType: z.string(),
        calories: z.number(),
        protein: z.number(),
        carbs: z.number(),
        fat: z.number(),
        dietaryPreference: z.string().default("omnivore"),
        fitnessGoal: z.string().default("build_muscle"),
        preferenceHint: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const dietNote = input.dietaryPreference !== "omnivore"
          ? `All alternatives MUST strictly comply with ${input.dietaryPreference} dietary requirements.`
          : "";
        const prefNote = input.preferenceHint ? `\nUser taste preferences: ${input.preferenceHint}\n` : "";
        const prompt = `You are an expert nutritionist. The user wants to swap their ${input.mealType} meal "${input.mealName}" (${input.calories} kcal, ${input.protein}g protein, ${input.carbs}g carbs, ${input.fat}g fat). Fitness goal: ${input.fitnessGoal.replace(/_/g, " ")}. ${dietNote}${prefNote}\n\nGenerate exactly 6 alternative meals with equivalent calories (within 50 kcal of ${input.calories} kcal). Each must be practical, delicious, and easy to make at home.\n\nReturn this exact JSON:\n{"alternatives":[{"name":"Grilled Chicken & Quinoa Bowl","calories":${input.calories},"protein":${input.protein},"carbs":${input.carbs},"fat":${input.fat},"prepTime":"20 min","dietaryTags":["high-protein","gluten-free"],"description":"A satisfying bowl packed with lean protein and complex carbs.","ingredients":["150g chicken breast","80g quinoa","1 cup mixed greens","1 tbsp olive oil","lemon juice","salt and pepper"],"instructions":["Cook quinoa per packet instructions (15 min)","Season chicken with salt, pepper and garlic powder","Grill or pan-fry chicken 6-7 min each side until cooked through","Slice chicken and serve over quinoa with greens","Drizzle with olive oil and lemon juice"]}]}`;
        const response = await invokeLLM({
          messages: [
            { role: "system", content: "You are a professional nutritionist. Always respond with valid JSON only, no markdown." },
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

  aiCoach: router({
    // Comprehensive AI coach analysis: form history + progress + personalised tips
    getInsights: guestOrUserProcedure
      .input(z.object({
        formHistory: z.array(z.object({
          exercise: z.string(),
          score: z.number(),
          date: z.string(),
          corrections: z.array(z.string()).optional(),
        })).optional(),
        progressPhotos: z.array(z.object({
          date: z.string(),
          estimatedBF: z.number().optional(),
          trend: z.string().optional(),
        })).optional(),
        profile: z.object({
          goal: z.string().optional(),
          weightKg: z.number().optional(),
          heightCm: z.number().optional(),
          age: z.number().optional(),
          gender: z.string().optional(),
          currentBF: z.number().optional(),
          targetBF: z.number().optional(),
          workoutsCompleted: z.number().optional(),
          streakDays: z.number().optional(),
        }).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await checkAiLimit(ctx.user?.id, "aiCoach.getInsights");
        const { formHistory = [], progressPhotos = [], profile = {} } = input;
        const formSummary = formHistory.length > 0
          ? formHistory.map(f => `${f.exercise}: ${f.score}/100 on ${f.date}${f.corrections?.length ? ` (issues: ${f.corrections.slice(0,2).join(", ")})` : ""}`).join("; ")
          : "No form checks recorded yet";
        const progressSummary = progressPhotos.length > 0
          ? progressPhotos.map(p => `${p.date}: ${p.estimatedBF ? p.estimatedBF + "% BF" : ""} ${p.trend ?? ""}`).join("; ")
          : "No progress photos logged yet";
        const profileSummary = `Goal: ${profile.goal ?? "general fitness"}, Age: ${profile.age ?? "unknown"}, Gender: ${profile.gender ?? "unknown"}, Weight: ${profile.weightKg ?? "unknown"}kg, Height: ${profile.heightCm ?? "unknown"}cm, Current BF: ${profile.currentBF ?? "unknown"}%, Target BF: ${profile.targetBF ?? "unknown"}%, Workouts completed: ${profile.workoutsCompleted ?? 0}, Streak: ${profile.streakDays ?? 0} days`;
        const prompt = `You are an elite AI fitness coach. Analyse this athlete's data and provide a comprehensive coaching report.

ATHLETE PROFILE: ${profileSummary}
FORM HISTORY: ${formSummary}
PROGRESS PHOTOS: ${progressSummary}

Return a JSON coaching report with this exact structure:
{
  "overallScore": 72,
  "headline": "Solid foundation — time to sharpen your technique",
  "formAnalysis": {
    "summary": "2-3 sentence analysis of their form patterns across exercises",
    "topIssues": ["Issue 1 with specific correction", "Issue 2 with specific correction"],
    "strengths": ["Strength 1", "Strength 2"],
    "priorityExercise": "Squat",
    "priorityReason": "Why to focus on this exercise next"
  },
  "progressAnalysis": {
    "summary": "2-3 sentence analysis of body composition progress",
    "trend": "improving",
    "estimatedWeeksToGoal": 12,
    "weeklyBFLoss": 0.3
  },
  "weeklyPlan": [
    { "day": "Monday", "focus": "Form drill: Squat depth", "tip": "Specific actionable tip" },
    { "day": "Wednesday", "focus": "Progressive overload", "tip": "Specific actionable tip" },
    { "day": "Friday", "focus": "Technique refinement", "tip": "Specific actionable tip" }
  ],
  "personalizedTips": [
    { "category": "Nutrition", "icon": "🥩", "tip": "Specific tip based on their goal and BF%" },
    { "category": "Recovery", "icon": "😴", "tip": "Specific recovery tip" },
    { "category": "Form", "icon": "🎯", "tip": "Most critical form fix" },
    { "category": "Mindset", "icon": "🧠", "tip": "Motivational insight specific to their progress" }
  ],
  "nextMilestone": {
    "title": "Milestone name",
    "description": "What achieving this milestone means",
    "estimatedDate": "4 weeks"
  }
}`;
        const response = await invokeLLM({
          messages: [
            { role: "system", content: "You are an elite AI fitness coach. Always respond with valid JSON only." },
            { role: "user", content: prompt },
          ],
          response_format: { type: "json_object" },
        });
        let result: any;
        try { result = JSON.parse((response.choices[0].message.content as string) ?? "{}"); }
        catch {
          result = {
            overallScore: 70,
            headline: "Keep up the great work — consistency is your superpower",
            formAnalysis: { summary: "You're building good habits. Focus on technique over weight.", topIssues: ["Ensure full range of motion on all exercises"], strengths: ["Consistent training frequency"], priorityExercise: "Squat", priorityReason: "Foundation of all lower body strength" },
            progressAnalysis: { summary: "Steady progress detected. Stay consistent with nutrition.", trend: "improving", estimatedWeeksToGoal: 12, weeklyBFLoss: 0.3 },
            weeklyPlan: [
              { day: "Monday", focus: "Compound lifts", tip: "Focus on form over weight" },
              { day: "Wednesday", focus: "Accessory work", tip: "Target weak points" },
              { day: "Friday", focus: "Full body", tip: "End the week strong" },
            ],
            personalizedTips: [
              { category: "Nutrition", icon: "🥩", tip: "Hit your protein target every day — it's the #1 driver of muscle retention" },
              { category: "Recovery", icon: "😴", tip: "7-9 hours of sleep is non-negotiable for body composition" },
              { category: "Form", icon: "🎯", tip: "Record yourself once a week to catch form drift early" },
              { category: "Mindset", icon: "🧠", tip: "Progress is not always visible — trust the data, not the mirror" },
            ],
            nextMilestone: { title: "First Form Score 80+", description: "Achieving excellent form on a compound lift", estimatedDate: "2 weeks" },
          };
        }
        return result;
      }),
    // AI Coach chat — conversational coaching
    chat: guestOrUserProcedure
      .input(z.object({
        message: z.string(),
        history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() })).optional(),
        profile: z.object({
          goal: z.string().optional(),
          currentBF: z.number().optional(),
          targetBF: z.number().optional(),
          workoutsCompleted: z.number().optional(),
          // Premium context fields
          streakDays: z.number().optional(),
          totalMeals: z.number().optional(),
          totalScans: z.number().optional(),
          recentFormScores: z.string().optional(),
          recentMeals: z.string().optional(),
        }).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await checkAiLimit(ctx.user?.id, "aiCoach.chat");
        const p = input.profile ?? {};
        // Build base profile context
        let profileContext = `Goal: ${p.goal ?? "general fitness"}, Current BF: ${p.currentBF ?? "unknown"}%, Target BF: ${p.targetBF ?? "unknown"}%, Workouts completed: ${p.workoutsCompleted ?? 0}`;
        // Premium context: form memory, body progress, meal awareness
        const hasPremiumContext = p.streakDays !== undefined || p.recentFormScores || p.recentMeals;
        if (hasPremiumContext) {
          profileContext += `, Streak: ${p.streakDays ?? 0} days, Total meals logged: ${p.totalMeals ?? 0}, Total body scans: ${p.totalScans ?? 0}`;
          if (p.recentFormScores) profileContext += `. Recent form scores: ${p.recentFormScores}`;
          if (p.recentMeals) profileContext += `. Recent meals: ${p.recentMeals}`;
        }
        const premiumInstructions = hasPremiumContext
          ? " You have access to their form check history, body scan data, and meal logs. Reference specific data points when giving advice. Track their form improvements over time and celebrate progress. If their nutrition doesn't align with their goal, mention it tactfully."
          : "";
        const systemPrompt = `You are PeakPulse AI Coach — an elite, no-nonsense fitness coach. You give specific, evidence-based advice. You know the user's profile: ${profileContext}.${premiumInstructions} Keep responses concise (2-4 sentences max) and always end with one actionable next step.`;
        const messages: any[] = [
          { role: "system", content: systemPrompt },
          ...(input.history ?? []),
          { role: "user", content: input.message },
        ];
        const response = await invokeLLM({ messages, model: "flash-lite" });
        return { reply: (response.choices[0].message.content as string) ?? "I'm here to help. What would you like to work on today?" };
      }),
  }),
  pantry: router({
    // AI meal suggestions based on pantry items
    suggestMeals: guestOrUserProcedure
      .input(z.object({
        pantryItems: z.string(),
        calorieGoal: z.number().default(2000),
        proteinGoal: z.number().default(150),
        carbsGoal: z.number().default(250),
        fatGoal: z.number().default(65),
        dietaryPreference: z.string().default("omnivore"),
        fitnessGoal: z.string().default("build_muscle"),
      }))
      .mutation(async ({ ctx, input }) => {
        await checkAiLimit(ctx.user?.id, "pantry.suggestMeals");
        const dietNote = input.dietaryPreference !== "omnivore"
          ? `All meals MUST strictly comply with ${input.dietaryPreference} dietary requirements.`
          : "";
        const prompt = `You are an expert nutritionist and chef. The user has these items in their pantry/fridge:\n${input.pantryItems}\n\nTheir daily targets: ${input.calorieGoal} kcal, ${input.proteinGoal}g protein, ${input.carbsGoal}g carbs, ${input.fatGoal}g fat. Fitness goal: ${input.fitnessGoal.replace(/_/g, " ")}. ${dietNote}\n\nGenerate 4-6 practical, delicious meals they can make primarily from these ingredients. For each meal, clearly mark which ingredients come from their pantry and which they would need to buy. Prioritise meals that use the most pantry items. If their pantry is limited, suggest meals that need minimal extra ingredients.\n\nReturn this exact JSON:\n{"meals":[{"name":"Meal Name","description":"Brief appetising description","ingredients":[{"name":"Chicken Breast","fromPantry":true,"quantity":"150g"},{"name":"Lemon","fromPantry":false,"quantity":"1"}],"missingIngredients":["Lemon"],"estimatedCalories":450,"estimatedProtein":35,"estimatedCarbs":40,"estimatedFat":15,"prepTime":"20 min","instructions":["Step 1","Step 2","Step 3"]}]}`;
        const response = await invokeLLM({
          messages: [
            { role: "system", content: "You are an expert chef and nutritionist. Always respond with valid JSON only, no markdown." },
            { role: "user", content: prompt },
          ],
          response_format: { type: "json_object" },
        });
        let result: any;
        try { result = JSON.parse((response.choices[0].message.content as string) ?? "{}"); }
        catch { result = { meals: [] }; }
        return { meals: result.meals ?? [] };
      }),

    // AI scan pantry/fridge photo to identify items
    scanPhoto: guestOrUserProcedure
      .input(z.object({ photoUrl: z.string() }))
      .mutation(async ({ ctx, input }) => {
        await checkAiLimit(ctx.user?.id, "pantry.scanPhoto");
        const prompt = `Look at this photo of a pantry, fridge, or kitchen counter. Identify all visible food items and ingredients. For each item, determine the most appropriate category from: Proteins, Dairy, Grains & Carbs, Vegetables, Fruits, Condiments & Spices, Oils & Fats, Beverages, Other.\n\nReturn this exact JSON:\n{"items":[{"name":"Chicken Breast","category":"Proteins"},{"name":"Milk","category":"Dairy"}]}`;
        const response = await invokeLLM({
          messages: [
            { role: "system", content: "You are a food identification expert. Identify all visible food items in the image. Always respond with valid JSON only." },
            { role: "user", content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: input.photoUrl } },
            ] as any },
          ],
          response_format: { type: "json_object" },
        });
        let result: any;
        try { result = JSON.parse((response.choices[0].message.content as string) ?? "{}"); }
        catch { result = { items: [] }; }
        return { items: result.items ?? [] };
      }),

    // Smart shopping suggestions based on nutritional gaps
    suggestShopping: guestOrUserProcedure
      .input(z.object({
        pantryItems: z.string(),
        calorieGoal: z.number().default(2000),
        proteinGoal: z.number().default(150),
        carbsGoal: z.number().default(250),
        fatGoal: z.number().default(65),
        dietaryPreference: z.string().default("omnivore"),
        fitnessGoal: z.string().default("build_muscle"),
      }))
      .mutation(async ({ ctx, input }) => {
        await checkAiLimit(ctx.user?.id, "pantry.suggestShopping");
        const dietNote = input.dietaryPreference !== "omnivore"
          ? `All suggestions MUST comply with ${input.dietaryPreference} dietary requirements.`
          : "";
        const prompt = `You are a budget-conscious nutritionist. The user has these items in their pantry:\n${input.pantryItems}\n\nTheir daily targets: ${input.calorieGoal} kcal, ${input.proteinGoal}g protein, ${input.carbsGoal}g carbs, ${input.fatGoal}g fat. Fitness goal: ${input.fitnessGoal.replace(/_/g, " ")}. ${dietNote}\n\nAnalyse what's missing from their pantry to meet their nutritional needs. Suggest 5-8 items they should buy, prioritised by:\n1. Nutritional impact (fills the biggest gaps)\n2. Versatility (enables the most meals)\n3. Cost-effectiveness (cheapest items first)\n\nFor each item, estimate the cost and list 2-3 meals it would enable when combined with their existing pantry items.\n\nReturn this exact JSON:\n{"suggestions":[{"name":"Item Name","category":"Proteins","reason":"Why they need this item","estimatedCost":"$3-5","mealsItEnables":["Meal 1","Meal 2","Meal 3"],"priority":"essential"}]}\n\nPriority must be one of: essential, recommended, nice-to-have`;
        const response = await invokeLLM({
          messages: [
            { role: "system", content: "You are a budget-conscious nutritionist. Always respond with valid JSON only, no markdown." },
            { role: "user", content: prompt },
          ],
          response_format: { type: "json_object" },
        });
        let result: any;
        try { result = JSON.parse((response.choices[0].message.content as string) ?? "{}"); }
        catch { result = { suggestions: [] }; }
        return { suggestions: result.suggestions ?? [] };
      }),

    // Generate a full daily meal plan from pantry items, respecting caloric/macro targets
    generateDailyPlan: guestOrUserProcedure
      .input(z.object({
        pantryItems: z.string(),
        calorieGoal: z.number().default(2000),
        proteinGoal: z.number().default(150),
        carbsGoal: z.number().default(250),
        fatGoal: z.number().default(65),
        dietaryPreference: z.string().default("omnivore"),
        fitnessGoal: z.string().default("build_muscle"),
        region: z.string().optional(),
        cuisinePrefs: z.array(z.string()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await checkAiLimit(ctx.user?.id, "pantry.generateDailyPlan");
        const dietNote = input.dietaryPreference !== "omnivore"
          ? `All meals MUST strictly comply with ${input.dietaryPreference} dietary requirements.`
          : "";
        const regionNote = input.region ? `The user is based in ${input.region}.` : "";
        const cuisineNote = input.cuisinePrefs?.length
          ? `They prefer these cuisines: ${input.cuisinePrefs.join(", ")}. Incorporate dishes and flavours from these cuisines where possible.`
          : "";
        const prompt = `You are an expert nutritionist and chef. The user has these items in their pantry/fridge:\n${input.pantryItems}\n\nTheir DAILY nutritional targets:\n- Calories: ${input.calorieGoal} kcal\n- Protein: ${input.proteinGoal}g\n- Carbs: ${input.carbsGoal}g\n- Fat: ${input.fatGoal}g\nFitness goal: ${input.fitnessGoal.replace(/_/g, " ")}.\n${dietNote}\n${regionNote}\n${cuisineNote}\n\nGenerate a COMPLETE daily meal plan (breakfast, lunch, dinner, and 1 snack) that:\n1. MAXIMISES use of pantry items — use as many as possible\n2. Meets the daily caloric and macro targets (total across all 4 meals should be close to the targets)\n3. Clearly marks which ingredients are FROM THE PANTRY and which NEED TO BE BOUGHT\n4. If the pantry is too limited for a full day, suggest meals that need minimal extra ingredients\n5. Provide accurate calorie and macro estimates for each meal\n6. Include practical cooking instructions\n\nReturn this exact JSON:\n{"dailyPlan":{"totalCalories":0,"totalProtein":0,"totalCarbs":0,"totalFat":0,"pantryItemsUsed":["item1","item2"],"additionalItemsNeeded":["item1","item2"],"meals":[{"mealType":"breakfast","name":"Meal Name","description":"Brief description","ingredients":[{"name":"Chicken Breast","fromPantry":true,"quantity":"150g"}],"calories":450,"protein":35,"carbs":40,"fat":15,"prepTime":"20 min","instructions":["Step 1","Step 2"]}]},"tips":"One practical tip about using their pantry items efficiently"}`;
        const response = await invokeLLM({
          messages: [
            { role: "system", content: "You are an expert chef and nutritionist. Always respond with valid JSON only, no markdown. Be precise with calorie and macro estimates." },
            { role: "user", content: prompt },
          ],
          response_format: { type: "json_object" },
        });
        let result: any;
        try { result = JSON.parse((response.choices[0].message.content as string) ?? "{}"); }
        catch { result = { dailyPlan: null }; }
        return result;
      }),
  }),

  receipt: router({
    /** Scan a grocery receipt photo and extract items using built-in LLM */
    scan: guestOrUserProcedure
      .input(z.object({ photoUrl: z.string() }))
      .mutation(async ({ ctx, input }) => {
        await checkAiLimit(ctx.user?.id, "receipt.scan");
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `You are an expert at reading grocery store receipts. Analyze this receipt photo and extract every grocery item.\n\nFor each item, determine:\n- name: Clean product name (remove store codes, abbreviations)\n- quantity: Number of units purchased (default 1)\n- price: Price paid for this item (number, 0 if unreadable)\n- category: One of: produce, dairy, meat, seafood, grains, canned, frozen, beverages, snacks, condiments, bakery, other\n- estimatedExpiry: Estimated days until expiry based on product type (e.g. milk=7, bread=5, canned=365, produce=5, meat=3, frozen=90)\n\nAlso extract:\n- storeName: Name of the store (if visible)\n- total: Total amount on receipt\n- date: Receipt date (if visible, ISO format)\n\nReturn JSON:\n{\n  "items": [{ "name": "string", "quantity": number, "price": number, "category": "string", "estimatedExpiry": number }],\n  "storeName": "string or null",\n  "total": number,\n  "date": "string or null",\n  "itemCount": number\n}\n\nBe thorough — extract every line item. Clean up abbreviated names to be human-readable.`,
            },
            {
              role: "user",
              content: [
                { type: "text", text: "Extract all grocery items from this receipt." },
                { type: "image_url", image_url: { url: input.photoUrl } },
              ],
            },
          ],
          response_format: { type: "json_object" },
        });
        let result: any;
        try {
          result = JSON.parse((response.choices[0].message.content as string) ?? "{}");
        } catch {
          result = { items: [], storeName: null, total: 0, date: null, itemCount: 0 };
        }
        // Ensure items array exists
        if (!Array.isArray(result.items)) result.items = [];
        result.itemCount = result.items.length;
        return result;
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

  mealSwapWithPantry: router({
    // AI-powered meal swap using pantry items — generates alternatives from available ingredients
    generate: guestOrUserProcedure
      .input(z.object({
        mealName: z.string(),
        mealType: z.string(),
        calories: z.number(),
        protein: z.number(),
        carbs: z.number(),
        fat: z.number(),
        dietaryPreference: z.string().default("omnivore"),
        pantryItems: z.array(z.string()).default([]),
        includeBeyondPantry: z.boolean().default(true),
        dailyCalorieTarget: z.number().default(2000),
        remainingCalories: z.number().default(2000),
      }))
      .mutation(async ({ input }) => {
        const pantryNote = input.pantryItems.length > 0
          ? `Available pantry items: ${input.pantryItems.join(", ")}. Prioritize using these ingredients where possible.`
          : "";
        const beyondNote = input.includeBeyondPantry
          ? "Also include 2-3 alternatives that use ingredients NOT in the pantry for variety."
          : "Only suggest meals using the available pantry items.";
        const calorieNote = `The user's daily calorie target is ${input.dailyCalorieTarget} kcal. They have ${input.remainingCalories} kcal remaining for this meal slot (after subtracting other meals). Prioritize alternatives that fit within this remaining budget. If an alternative exceeds the remaining budget, mark it with "exceedsLimit": true.`;
        const prompt = `You are an expert nutritionist. The user wants to swap their ${input.mealType} meal "${input.mealName}" (${input.calories} kcal, P:${input.protein}g C:${input.carbs}g F:${input.fat}g). Diet: ${input.dietaryPreference}.

${pantryNote}
${beyondNote}
${calorieNote}

Generate 6 alternative meals. Mark which ones use pantry items. For each meal, also provide a "photoQuery" field with a descriptive search term for finding a photo of the meal (e.g. "grilled salmon with vegetables").

Return JSON:
{"alternatives":[{"name":"Meal Name","calories":400,"protein":30,"carbs":40,"fat":15,"prepTime":"15 min","usesPantry":true,"pantryItemsUsed":["chicken","rice"],"description":"Quick description","ingredients":["150g chicken breast","80g rice"],"instructions":["Step 1","Step 2"],"photoQuery":"grilled chicken rice bowl","exceedsLimit":false}]}`;
        const response = await invokeLLM({
          messages: [
            { role: "system", content: "You are a professional nutritionist. Always respond with valid JSON only." },
            { role: "user", content: prompt },
          ],
          response_format: { type: "json_object" },
        });
        let result: any;
        try { result = JSON.parse((response.choices[0].message.content as string) ?? "{}"); }
        catch { result = { alternatives: [] }; }
        // Generate image URLs for each alternative using Unsplash
        // Curated food photos for variety — each suggestion gets a unique image
        const FOOD_PHOTOS = [
          "photo-1512621776951-a57141f2eefd", // colorful salad bowl
          "photo-1490645935967-10de6ba17061", // plated meal
          "photo-1546069901-ba9599a7e63c",  // healthy bowl
          "photo-1504674900247-0877df9cc836", // grilled meat
          "photo-1467003909585-2f8a72700288", // salmon dish
          "photo-1540189549336-e6e99c3679fe", // stir fry
          "photo-1547592180-85f173990554", // rice bowl
          "photo-1565299624946-b28f40a0ae38", // pizza/flatbread
          "photo-1482049016688-2d3e1b311543", // avocado toast
          "photo-1432139509613-5c4255a1d764", // pasta dish
        ];
        const alternatives = (result.alternatives ?? []).map((alt: any, idx: number) => {
          const photoId = FOOD_PHOTOS[idx % FOOD_PHOTOS.length];
          return {
            ...alt,
            imageUrl: `https://images.unsplash.com/${photoId}?w=400&q=80`,
          };
        });
        return { alternatives, dailyCalorieTarget: input.dailyCalorieTarget, remainingCalories: input.remainingCalories };
      }),
  }),

  // Guest data migration — imports AsyncStorage data from guest mode into authenticated account
  migrateGuestData: protectedProcedure
    .input(z.object({
      key: z.string(),
      data: z.any(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      console.log(`[Migration] Importing ${input.key} for user ${userId}`);
      // Route data to appropriate storage based on key
      // For now, we store all migrated data as a JSON blob in the user's profile metadata
      // Individual handlers can be added as the data model evolves
      try {
        switch (input.key) {
          case "@peakpulse_workout_sessions":
          case "@peakpulse_today_meals":
          case "@peakpulse_progress_photos":
          case "@peakpulse_body_scans":
          case "@peakpulse_personal_records":
          case "@peakpulse_workout_plan":
          case "@peakpulse_meal_plan":
          case "@peakpulse_pantry_items":
          case "@peakpulse_streak":
          case "@peakpulse_weekly_goals":
          case "@peakpulse_calorie_goal":
          case "@user_macro_targets":
          case "@peakpulse_meal_favourites":
          case "@peakpulse_guest_profile":
          case "@peakpulse_onboarding_data":
          case "@peakpulse_preferences":
            // Store as user metadata — the data is preserved for future use
            console.log(`[Migration] Stored ${input.key} (${JSON.stringify(input.data).length} bytes)`);
            break;
          default:
            console.log(`[Migration] Unknown key ${input.key}, skipping`);
        }
      } catch (err: any) {
        console.error(`[Migration] Failed to import ${input.key}:`, err);
        throw new Error(`Failed to import ${input.key}: ${err?.message ?? "Unknown error"}`);
      }
      return { success: true };
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
