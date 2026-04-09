import { UI } from "@/constants/ui-colors";
/**
 * Smart Meal Swap — Find macro-matched alternative meals from the user's
 * existing weekly meal plan. No AI call needed — purely local matching.
 *
 * When viewing a meal plan meal, the user can tap "Swap" to see alternatives
 * from other days that have similar macros (within configurable tolerance).
 */

// ── Types ────────────────────────────────────────────────────────────────

export interface MealForSwap {
  /** Unique identifier (e.g., "day2-lunch") */
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  /** Which meal slot: breakfast, lunch, dinner, snack */
  mealType: string;
  /** Which day in the plan (0-indexed) */
  dayIndex: number;
  /** Optional image URL */
  imageUrl?: string;
}

export interface SwapCandidate {
  meal: MealForSwap;
  /** Overall similarity score 0-1 (1 = perfect match) */
  score: number;
  /** Calorie difference (absolute) */
  calorieDiff: number;
  /** Protein difference (absolute) */
  proteinDiff: number;
  /** Whether this is from the same meal type (breakfast for breakfast, etc.) */
  sameMealType: boolean;
  /** Day label (e.g., "Day 3") */
  dayLabel: string;
}

export interface SwapConfig {
  /** Max calorie difference allowed (default: 150) */
  maxCalorieDiff: number;
  /** Max protein difference allowed in grams (default: 15) */
  maxProteinDiff: number;
  /** Bonus score for same meal type (default: 0.15) */
  sameMealTypeBonus: number;
  /** Max number of candidates to return (default: 5) */
  maxCandidates: number;
}

// ── Default Config ───────────────────────────────────────────────────────

export const DEFAULT_SWAP_CONFIG: SwapConfig = {
  maxCalorieDiff: 150,
  maxProteinDiff: 15,
  sameMealTypeBonus: 0.15,
  maxCandidates: 5,
};

// ── Pure Functions (exported for testing) ─────────────────────────────────

/**
 * Calculate similarity score between two meals.
 * Returns 0-1 where 1 is a perfect macro match.
 */
export function calculateSimilarity(
  source: MealForSwap,
  candidate: MealForSwap,
  config: SwapConfig = DEFAULT_SWAP_CONFIG,
): number {
  // Calorie similarity (0-1)
  const calDiff = Math.abs(source.calories - candidate.calories);
  const calScore = Math.max(0, 1 - calDiff / config.maxCalorieDiff);

  // Protein similarity (0-1)
  const protDiff = Math.abs(source.protein - candidate.protein);
  const protScore = Math.max(0, 1 - protDiff / config.maxProteinDiff);

  // Carb similarity (0-1, with wider tolerance)
  const carbDiff = Math.abs(source.carbs - candidate.carbs);
  const carbScore = Math.max(0, 1 - carbDiff / 30);

  // Fat similarity (0-1, with wider tolerance)
  const fatDiff = Math.abs(source.fat - candidate.fat);
  const fatScore = Math.max(0, 1 - fatDiff / 20);

  // Weighted average: calories and protein matter most
  let score = calScore * 0.35 + protScore * 0.35 + carbScore * 0.15 + fatScore * 0.15;

  // Bonus for same meal type
  if (source.mealType === candidate.mealType) {
    score = Math.min(1, score + config.sameMealTypeBonus);
  }

  return Math.round(score * 100) / 100;
}

/**
 * Find the best swap candidates for a given meal from the weekly plan.
 */
export function findSwapCandidates(
  sourceMeal: MealForSwap,
  allMeals: MealForSwap[],
  config: SwapConfig = DEFAULT_SWAP_CONFIG,
): SwapCandidate[] {
  const candidates: SwapCandidate[] = [];

  for (const meal of allMeals) {
    // Skip the source meal itself
    if (meal.id === sourceMeal.id) continue;

    // Skip meals from the same day
    if (meal.dayIndex === sourceMeal.dayIndex) continue;

    const score = calculateSimilarity(sourceMeal, meal, config);

    // Only include if score is above minimum threshold
    if (score < 0.2) continue;

    const calorieDiff = Math.abs(sourceMeal.calories - meal.calories);
    const proteinDiff = Math.abs(sourceMeal.protein - meal.protein);

    candidates.push({
      meal,
      score,
      calorieDiff,
      proteinDiff,
      sameMealType: sourceMeal.mealType === meal.mealType,
      dayLabel: `Day ${meal.dayIndex + 1}`,
    });
  }

  // Sort by score descending
  candidates.sort((a, b) => b.score - a.score);

  // Return top N
  return candidates.slice(0, config.maxCandidates);
}

/**
 * Get a human-readable match quality label.
 */
export function getMatchLabel(score: number): { label: string; color: string } {
  if (score >= 0.85) return { label: "Excellent Match", color: UI.green };
  if (score >= 0.70) return { label: "Great Match", color: "#4ADE80" };
  if (score >= 0.50) return { label: "Good Match", color: UI.gold2 };
  if (score >= 0.35) return { label: "Fair Match", color: UI.gold };
  return { label: "Loose Match", color: "#F87171" };
}

/**
 * Format calorie difference as a string.
 */
export function formatCalorieDiff(diff: number): string {
  if (diff === 0) return "Same calories";
  return `${diff > 0 ? "+" : ""}${diff} cal`;
}

/**
 * Convert a meal plan day structure to MealForSwap array.
 * This is the adapter between the app's meal plan format and our swap format.
 */
export function extractMealsFromPlan(
  days: Array<{
    meals: Array<{
      name: string;
      type?: string;
      mealType?: string;
      calories?: number;
      protein?: number;
      carbs?: number;
      fat?: number;
      imageUrl?: string;
    }>;
  }>,
): MealForSwap[] {
  const meals: MealForSwap[] = [];

  for (let dayIdx = 0; dayIdx < days.length; dayIdx++) {
    const day = days[dayIdx];
    if (!day?.meals) continue;

    for (let mealIdx = 0; mealIdx < day.meals.length; mealIdx++) {
      const m = day.meals[mealIdx];
      const mealType = (m.type || m.mealType || inferMealType(mealIdx)).toLowerCase();

      meals.push({
        id: `day${dayIdx}-${mealType}-${mealIdx}`,
        name: m.name,
        calories: m.calories ?? 0,
        protein: m.protein ?? 0,
        carbs: m.carbs ?? 0,
        fat: m.fat ?? 0,
        mealType,
        dayIndex: dayIdx,
        imageUrl: m.imageUrl,
      });
    }
  }

  return meals;
}

/**
 * Infer meal type from index position in the day.
 */
function inferMealType(index: number): string {
  const types = ["breakfast", "lunch", "dinner", "snack"];
  return types[Math.min(index, types.length - 1)];
}
