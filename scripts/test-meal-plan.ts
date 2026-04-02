/**
 * Diagnostic: Call the meal plan generate endpoint and check if all 7 days have unique meals.
 * Run with: npx tsx scripts/test-meal-plan.ts
 */
import { invokeLLM } from "../server/_core/llm";

async function testMealPlanGeneration() {
  console.log("=== Testing Meal Plan AI Generation ===\n");

  const prompt = `Generate a 7-day meal plan as JSON.

USER PROFILE:
- Fitness Goal: build muscle
- Dietary Preference: BALANCED
- Daily Calorie Target: ~2200 kcal

DIETARY RESTRICTIONS (MUST FOLLOW — NON-NEGOTIABLE):
No specific restrictions. Balanced diet with variety.

Each day must include: breakfast, morning snack, lunch, afternoon snack, dinner (4-5 meals). Include calories, protein (g), carbs (g), and fat (g) for each meal. Each meal MUST have ingredients array, instructions array (3-5 steps), and photoQuery (2-4 word food search term for finding a photo of this SPECIFIC dish).

IMPORTANT: The "days" array MUST contain exactly 7 entries, one for each day of the week, using these EXACT day names in this order: "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday". Do NOT use abbreviations, numbers, or any other format.

CRITICAL VARIETY REQUIREMENT — THIS IS THE MOST IMPORTANT RULE:
1. Every single meal name across ALL 7 days MUST be completely unique. There must be ZERO repeated meal names in the entire plan.
2. Each day MUST have its OWN set of meals — do NOT copy/paste the same meals from one day to another.
3. Monday's breakfast MUST be different from Tuesday's breakfast, which MUST be different from Wednesday's breakfast, etc.
4. Vary cooking methods (grilled, baked, stir-fried, steamed, raw, poached, roasted, sautéed), protein sources (chicken, fish, beef, tofu, eggs, lentils, beans), and cuisines across the week.
5. Each meal's photoQuery MUST be specific to that exact dish (e.g., "grilled salmon asparagus" not just "dinner plate"). Every photoQuery must be different.
6. SELF-CHECK: Before returning, count all meal names. If ANY two meals share the same name, replace one with a different recipe.
7. The plan must contain exactly 7 day objects with DIFFERENT meals in each — the user should see completely new food every day.

Return this exact structure: {"dailyCalories":2200,"proteinTarget":150,"carbTarget":200,"fatTarget":65,"dietType":"balanced","isRamadan":false,"days":[{"day":"Monday","meals":[{"name":"Meal Name","type":"breakfast","calories":420,"protein":28,"carbs":35,"fat":14,"ingredients":["ingredient 1","ingredient 2"],"prepTime":"10 min","instructions":["Step 1","Step 2","Step 3"],"photoQuery":"food search term"}]},{"day":"Tuesday","meals":[...]},{"day":"Wednesday","meals":[...]},{"day":"Thursday","meals":[...]},{"day":"Friday","meals":[...]},{"day":"Saturday","meals":[...]},{"day":"Sunday","meals":[...]}],"insight":"personalized nutrition tip"}`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: "You are an expert registered dietitian. Always respond with valid JSON matching the required schema." },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0].message.content as string;
    console.log("Raw response length:", content.length);
    console.log("First 500 chars:", content.slice(0, 500));
    console.log("Last 200 chars:", content.slice(-200));
    console.log("");
    let planData: any;
    try {
      planData = JSON.parse(content);
    } catch (e) {
      console.error("JSON parse error:", e);
      // Try to salvage by finding the days array
      const daysMatch = content.match(/"days"\s*:\s*\[/);
      if (daysMatch) {
        console.log("Found days array at position:", daysMatch.index);
      }
      return;
    }

    console.log(`Number of days: ${planData.days?.length ?? 0}`);
    console.log(`Daily calories target: ${planData.dailyCalories}`);
    console.log("");

    if (!planData.days || planData.days.length === 0) {
      console.error("ERROR: No days returned!");
      return;
    }

    // Check each day
    const allMealNames: string[] = [];
    const daySignatures: string[] = [];

    for (const day of planData.days) {
      const meals = day.meals ?? [];
      const mealNames = meals.map((m: any) => m.name);
      const sig = mealNames.map((n: string) => n.toLowerCase().trim()).sort().join("|");
      daySignatures.push(sig);
      allMealNames.push(...mealNames);

      console.log(`${day.day}: ${meals.length} meals`);
      for (const meal of meals) {
        console.log(`  - ${meal.type}: ${meal.name} (${meal.calories} kcal) [photo: ${meal.photoQuery}]`);
      }
      console.log("");
    }

    // Check for duplicates
    const uniqueNames = new Set(allMealNames.map(n => n.toLowerCase().trim()));
    console.log(`\n=== ANALYSIS ===`);
    console.log(`Total meals: ${allMealNames.length}`);
    console.log(`Unique meal names: ${uniqueNames.size}`);
    console.log(`Duplicate names: ${allMealNames.length - uniqueNames.size}`);

    // Check if days have identical meal sets
    const uniqueSigs = new Set(daySignatures);
    console.log(`Unique day signatures: ${uniqueSigs.size} / ${daySignatures.length}`);

    if (uniqueSigs.size < daySignatures.length) {
      console.error("\nERROR: Some days have IDENTICAL meal sets!");
      daySignatures.forEach((sig, i) => {
        const firstIdx = daySignatures.indexOf(sig);
        if (firstIdx < i) {
          console.error(`  ${planData.days[i].day} is identical to ${planData.days[firstIdx].day}`);
        }
      });
    } else {
      console.log("\n✅ All days have unique meal sets!");
    }

    if (uniqueNames.size === allMealNames.length) {
      console.log("✅ All meal names are unique!");
    } else {
      console.error("\n❌ Some meal names are duplicated:");
      const nameCounts: Record<string, number> = {};
      for (const n of allMealNames) {
        const key = n.toLowerCase().trim();
        nameCounts[key] = (nameCounts[key] ?? 0) + 1;
      }
      for (const [name, count] of Object.entries(nameCounts)) {
        if (count > 1) console.error(`  "${name}" appears ${count} times`);
      }
    }

    // Check photoQuery uniqueness
    const allPhotoQueries = planData.days.flatMap((d: any) => (d.meals ?? []).map((m: any) => m.photoQuery?.toLowerCase().trim()));
    const uniqueQueries = new Set(allPhotoQueries.filter(Boolean));
    console.log(`\nPhoto queries: ${allPhotoQueries.length} total, ${uniqueQueries.size} unique`);

  } catch (err) {
    console.error("Error:", err);
  }
}

testMealPlanGeneration();
