/**
 * Smart Meal Suggestions
 *
 * When the adaptive banner detects under-eating, this module finds meals
 * from the user's current weekly meal plan that would best close the
 * remaining calorie gap for the day.
 *
 * Unlike the generic SimpleMealSuggestions (hardcoded options), these are
 * personalized — drawn from the user's own AI-generated meal plan.
 */

// ── Types ────────────────────────────────────────────────────────────────

export interface PlanMeal {
  name: string;
  type: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  photoUrl?: string;
  photoQuery?: string;
}

export interface PlanDay {
  day: string;
  meals: PlanMeal[];
}

export interface SmartSuggestion {
  /** Meal name from the plan */
  name: string;
  /** Meal type (breakfast, lunch, dinner, snack) */
  type: string;
  /** Calories of the meal */
  calories: number;
  /** Protein in grams */
  protein: number;
  /** Carbs in grams */
  carbs: number;
  /** Fat in grams */
  fat: number;
  /** Which day of the plan this meal comes from */
  fromDay: string;
  /** Photo URL if available */
  photoUrl?: string;
  /** How well this meal fits the calorie gap (0 = perfect fit, higher = worse) */
  fitScore: number;
}

// ── Core Algorithm ──────────────────────────────────────────────────────

/**
 * Find the best meals from the weekly plan to close a calorie gap.
 *
 * Strategy:
 * 1. Collect all unique meals across the 7-day plan
 * 2. Exclude meals already logged today (by name match)
 * 3. Score each by how well it fills the gap (prefer meals ≤ gap, closest to gap)
 * 4. Return top N suggestions sorted by fit score
 *
 * @param planDays - The user's current weekly meal plan
 * @param calorieGap - Remaining calories to fill today (positive number)
 * @param alreadyLoggedNames - Names of meals already logged today (case-insensitive)
 * @param maxResults - Maximum number of suggestions to return (default 4)
 */
export function getSmartMealSuggestions(
  planDays: PlanDay[],
  calorieGap: number,
  alreadyLoggedNames: string[] = [],
  maxResults: number = 4,
): SmartSuggestion[] {
  if (!planDays || planDays.length === 0 || calorieGap <= 0) {
    return [];
  }

  const loggedLower = new Set(alreadyLoggedNames.map((n) => n.toLowerCase().trim()));

  // Collect all unique meals (deduplicate by name)
  const seenNames = new Set<string>();
  const allMeals: SmartSuggestion[] = [];

  for (const day of planDays) {
    if (!day.meals) continue;
    for (const meal of day.meals) {
      const nameLower = (meal.name || "").toLowerCase().trim();
      if (!nameLower || seenNames.has(nameLower)) continue;
      if (loggedLower.has(nameLower)) continue;

      seenNames.add(nameLower);

      const calories = meal.calories || 0;
      if (calories <= 0) continue;

      // Fit score: prefer meals that are ≤ the gap and as close to it as possible
      // Meals over the gap get a penalty
      const diff = calories - calorieGap;
      const fitScore = diff <= 0
        ? Math.abs(diff) // Under gap: distance from gap (lower = better)
        : diff * 2;      // Over gap: penalized distance

      allMeals.push({
        name: meal.name,
        type: meal.type || "meal",
        calories,
        protein: meal.protein || 0,
        carbs: meal.carbs || 0,
        fat: meal.fat || 0,
        fromDay: day.day,
        photoUrl: meal.photoUrl,
        fitScore,
      });
    }
  }

  // Sort by fit score (best fit first)
  allMeals.sort((a, b) => a.fitScore - b.fitScore);

  return allMeals.slice(0, maxResults);
}

/**
 * Find a combination of meals that together best fill the calorie gap.
 * Uses a greedy approach: pick the best single meal, then try to fill
 * remaining gap with another meal.
 *
 * @returns Array of 1-2 meals that together approximate the calorie gap
 */
export function getSmartMealCombo(
  planDays: PlanDay[],
  calorieGap: number,
  alreadyLoggedNames: string[] = [],
): SmartSuggestion[] {
  const suggestions = getSmartMealSuggestions(planDays, calorieGap, alreadyLoggedNames, 20);
  if (suggestions.length === 0) return [];

  // Find best single meal
  const best = suggestions[0];
  const result: SmartSuggestion[] = [best];

  // If the best meal leaves a significant gap (>150 cal), try to fill it
  const remainingGap = calorieGap - best.calories;
  if (remainingGap > 150) {
    const second = suggestions.find(
      (s) => s.name !== best.name && s.calories <= remainingGap * 1.2,
    );
    if (second) {
      result.push(second);
    }
  }

  return result;
}

/**
 * Format a calorie gap as a human-readable string.
 */
export function formatCalorieGap(gap: number): string {
  if (gap <= 0) return "on track";
  if (gap < 200) return `${Math.round(gap)} cal short — a snack would help`;
  if (gap < 500) return `${Math.round(gap)} cal short — add a meal`;
  return `${Math.round(gap)} cal short — you need a full meal`;
}

/**
 * Get the meal type icon for display.
 */
export function getMealTypeIcon(type: string): string {
  const t = (type || "").toLowerCase();
  if (t.includes("breakfast")) return "wb-sunny";
  if (t.includes("lunch")) return "restaurant";
  if (t.includes("dinner")) return "dinner-dining";
  if (t.includes("snack")) return "cookie";
  return "restaurant-menu";
}
