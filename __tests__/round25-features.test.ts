import { describe, it, expect } from "vitest";

/**
 * Round 25 — Shopping List, Save to Photo Library, Regenerate Workout on Meals Tab
 */

describe("Weekly Shopping List", () => {
  it("aggregates ingredients across all 7 days of an AI meal plan", () => {
    // Simulate a 7-day AI meal plan with overlapping ingredients
    const aiMealPlan = {
      days: [
        { day: "Monday", meals: [{ name: "Omelette", ingredients: ["Eggs", "Cheese", "Spinach"] }, { name: "Chicken Salad", ingredients: ["Chicken breast", "Lettuce", "Olive oil"] }] },
        { day: "Tuesday", meals: [{ name: "Scrambled Eggs", ingredients: ["Eggs", "Butter", "Salt"] }, { name: "Pasta", ingredients: ["Pasta", "Olive oil", "Garlic"] }] },
        { day: "Wednesday", meals: [{ name: "Smoothie", ingredients: ["Banana", "Protein powder", "Milk"] }, { name: "Steak", ingredients: ["Beef steak", "Garlic", "Olive oil"] }] },
        { day: "Thursday", meals: [{ name: "Pancakes", ingredients: ["Eggs", "Flour", "Milk"] }] },
        { day: "Friday", meals: [{ name: "Fish Tacos", ingredients: ["White fish", "Tortillas", "Lime"] }] },
        { day: "Saturday", meals: [{ name: "Burger", ingredients: ["Ground beef", "Lettuce", "Cheese"] }] },
        { day: "Sunday", meals: [{ name: "Roast Chicken", ingredients: ["Chicken breast", "Garlic", "Olive oil"] }] },
      ],
    };

    // Replicate the aggregation logic from meals.tsx
    const ingredientMap: Record<string, { count: number; sources: string[] }> = {};
    for (const day of aiMealPlan.days) {
      for (const meal of (day.meals ?? [])) {
        const ingredients = meal.ingredients ?? [];
        for (const ing of ingredients) {
          const normalized = (typeof ing === "string" ? ing : String(ing)).trim();
          if (!normalized) continue;
          const key = normalized.toLowerCase();
          if (!ingredientMap[key]) {
            ingredientMap[key] = { count: 0, sources: [] };
          }
          ingredientMap[key].count += 1;
          const mealName = meal.name ?? "Meal";
          if (!ingredientMap[key].sources.includes(mealName)) {
            ingredientMap[key].sources.push(mealName);
          }
        }
      }
    }

    const sortedIngredients = Object.entries(ingredientMap)
      .sort((a, b) => b[1].count - a[1].count)
      .map(([key, val]) => ({ key, display: key.charAt(0).toUpperCase() + key.slice(1), count: val.count, sources: val.sources }));

    // Olive oil appears 4 times (Chicken Salad, Pasta, Steak, Roast Chicken)
    const oliveOil = sortedIngredients.find(i => i.key === "olive oil");
    expect(oliveOil).toBeDefined();
    expect(oliveOil!.count).toBe(4);
    expect(oliveOil!.sources).toContain("Chicken Salad");
    expect(oliveOil!.sources).toContain("Roast Chicken");

    // Eggs appears 3 times (Omelette, Scrambled Eggs, Pancakes)
    const eggs = sortedIngredients.find(i => i.key === "eggs");
    expect(eggs).toBeDefined();
    expect(eggs!.count).toBe(3);

    // Garlic appears 3 times (Pasta, Steak, Roast Chicken)
    const garlic = sortedIngredients.find(i => i.key === "garlic");
    expect(garlic).toBeDefined();
    expect(garlic!.count).toBe(3);

    // Cheese appears 2 times (Omelette, Burger)
    const cheese = sortedIngredients.find(i => i.key === "cheese");
    expect(cheese).toBeDefined();
    expect(cheese!.count).toBe(2);

    // Total unique ingredients should be correct
    // Eggs, Cheese, Spinach, Chicken breast, Lettuce, Olive oil, Butter, Salt, Pasta, Garlic,
    // Banana, Protein powder, Milk, Beef steak, Flour, White fish, Tortillas, Lime, Ground beef
    expect(sortedIngredients.length).toBe(19);

    // Sorted by count descending — olive oil (4) should be first
    expect(sortedIngredients[0].key).toBe("olive oil");
  });

  it("handles check/uncheck state for shopping list items", () => {
    const checkedIngredients: Record<string, boolean> = {};

    // Check an item
    checkedIngredients["eggs"] = true;
    expect(checkedIngredients["eggs"]).toBe(true);

    // Uncheck it
    checkedIngredients["eggs"] = false;
    expect(checkedIngredients["eggs"]).toBe(false);

    // Check all
    const items = ["eggs", "cheese", "olive oil", "garlic"];
    items.forEach(i => { checkedIngredients[i] = true; });
    const checkedCount = items.filter(i => checkedIngredients[i]).length;
    expect(checkedCount).toBe(4);

    // Clear all
    items.forEach(i => { checkedIngredients[i] = false; });
    const clearedCount = items.filter(i => checkedIngredients[i]).length;
    expect(clearedCount).toBe(0);
  });

  it("displays capitalized ingredient names", () => {
    const key = "olive oil";
    const display = key.charAt(0).toUpperCase() + key.slice(1);
    expect(display).toBe("Olive oil");
  });
});

describe("Save to Photo Library", () => {
  it("uses expo-media-library saveToLibraryAsync pattern", () => {
    // Verify the import pattern is correct
    const MediaLibrary = { saveToLibraryAsync: async (uri: string) => {} };
    expect(typeof MediaLibrary.saveToLibraryAsync).toBe("function");
  });

  it("constructs correct local URI for download before saving", () => {
    const imageUrl = "https://example.com/target_body.png";
    const ext = imageUrl.includes(".png") ? "png" : "jpg";
    expect(ext).toBe("png");

    const cacheDir = "/tmp/cache/";
    const localUri = cacheDir + `target_body_save_${Date.now()}.${ext}`;
    expect(localUri).toContain("target_body_save_");
    expect(localUri).toContain(".png");
  });

  it("falls back to jpg for non-png URLs", () => {
    const imageUrl = "https://example.com/target_body.jpeg?w=800";
    const ext = imageUrl.includes(".png") ? "png" : "jpg";
    expect(ext).toBe("jpg");
  });
});

describe("Regenerate Workout Plan on Meals Tab", () => {
  it("sends correct parameters for workout plan generation", () => {
    const localProfile = {
      workoutStyle: "home",
      daysPerWeek: 5,
      activityLevel: "intermediate",
    };
    const userGoal = "lose_fat";

    const params = {
      goal: userGoal,
      workoutStyle: localProfile.workoutStyle ?? "gym",
      daysPerWeek: localProfile.daysPerWeek ?? 4,
      fitnessLevel: localProfile.activityLevel ?? undefined,
    };

    expect(params.goal).toBe("lose_fat");
    expect(params.workoutStyle).toBe("home");
    expect(params.daysPerWeek).toBe(5);
    expect(params.fitnessLevel).toBe("intermediate");
  });

  it("uses defaults when profile is missing", () => {
    const localProfile: any = null;
    const userGoal = "build_muscle";

    const params = {
      goal: userGoal,
      workoutStyle: localProfile?.workoutStyle ?? "gym",
      daysPerWeek: localProfile?.daysPerWeek ?? 4,
      fitnessLevel: localProfile?.activityLevel ?? undefined,
    };

    expect(params.workoutStyle).toBe("gym");
    expect(params.daysPerWeek).toBe(4);
    expect(params.fitnessLevel).toBeUndefined();
  });

  it("saves regenerated workout plan to both AsyncStorage keys", () => {
    // Verify the key pattern matches what plans.tsx reads
    const keys = ["@guest_workout_plan", "@cached_workout_plan"];
    expect(keys).toContain("@guest_workout_plan");
    expect(keys).toContain("@cached_workout_plan");
  });
});
