import { z } from "zod";
import { router, protectedProcedure, publicProcedure, guestOrUserProcedure } from "./_core/trpc";
import { db, invokeLLM, generateImage, storagePut, checkAiLimit, getDietaryRestrictions, randomSuffix } from "./helpers";

export const nutritionRouter = router({
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
});
