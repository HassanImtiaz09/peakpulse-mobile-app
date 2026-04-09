/**
 * Adaptive Meal Plan Adjustment
 *
 * Analyses recent meal logging patterns (from CalorieContext / getHistoricalMeals)
 * and detects:
 *   1. Consistent under-eating (3+ days below 80% of calorie target)
 *   2. Consistent over-eating (3+ days above 120% of calorie target)
 *   3. Missed meals (days with 0 logged meals when a meal plan exists)
 *   4. Skewed macros (protein consistently below 70% of target)
 *
 * Produces actionable insights and suggested adjustments that the UI
 * can present as a contextual banner on the Meals tab.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { MealEntry } from "@/lib/calorie-context";

// ── Types ────────────────────────────────────────────────────────────────

export type InsightSeverity = "info" | "warning" | "success";

export interface MealInsight {
  id: string;
  type:
    | "under_eating"
    | "over_eating"
    | "missed_meals"
    | "low_protein"
    | "on_track"
    | "great_streak";
  severity: InsightSeverity;
  title: string;
  message: string;
  suggestion: string;
  /** Number of days that triggered this insight */
  triggerDays: number;
}

export interface DaySummary {
  date: string;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  mealCount: number;
}

export interface AdaptiveAnalysis {
  /** All insights found, sorted by severity (warning > info > success) */
  insights: MealInsight[];
  /** Per-day summaries for the analysis window */
  daySummaries: DaySummary[];
  /** Suggested calorie adjustment (positive = eat more, negative = eat less) */
  suggestedCalorieAdjustment: number;
  /** Suggested macro adjustments */
  suggestedMacroAdjustment: {
    protein: number; // grams delta
    carbs: number;
    fat: number;
  };
  /** Average daily intake over the window */
  averageDailyCalories: number;
  /** Average daily protein over the window */
  averageDailyProtein: number;
  /** Days with logged meals / total days */
  loggingConsistency: number;
}

// ── Constants ────────────────────────────────────────────────────────────

export const ANALYSIS_WINDOW_DAYS = 7;
export const UNDER_EATING_THRESHOLD = 0.80; // below 80% of target
export const OVER_EATING_THRESHOLD = 1.20;  // above 120% of target
export const LOW_PROTEIN_THRESHOLD = 0.70;  // below 70% of protein target
export const MIN_TRIGGER_DAYS = 3;          // need 3+ days to trigger
export const DISMISS_STORAGE_KEY = "@peakpulse_meal_insight_dismissed";

// ── Severity ordering ────────────────────────────────────────────────────

const SEVERITY_ORDER: Record<InsightSeverity, number> = {
  warning: 0,
  info: 1,
  success: 2,
};

// ── Helpers ──────────────────────────────────────────────────────────────

/**
 * Build per-day summaries from historical meal data.
 */
export function buildDaySummaries(
  historicalMeals: Record<string, MealEntry[]>,
): DaySummary[] {
  const summaries: DaySummary[] = [];

  for (const [date, meals] of Object.entries(historicalMeals)) {
    summaries.push({
      date,
      totalCalories: meals.reduce((s, m) => s + (m.calories || 0), 0),
      totalProtein: meals.reduce((s, m) => s + (m.protein || 0), 0),
      totalCarbs: meals.reduce((s, m) => s + (m.carbs || 0), 0),
      totalFat: meals.reduce((s, m) => s + (m.fat || 0), 0),
      mealCount: meals.length,
    });
  }

  // Sort by date ascending
  summaries.sort((a, b) => a.date.localeCompare(b.date));
  return summaries;
}

/**
 * Analyse meal logging patterns and produce insights.
 */
export function analyseMealPatterns(
  daySummaries: DaySummary[],
  calorieGoal: number,
  proteinTarget: number,
): AdaptiveAnalysis {
  const insights: MealInsight[] = [];

  if (daySummaries.length === 0 || calorieGoal <= 0) {
    return {
      insights: [],
      daySummaries,
      suggestedCalorieAdjustment: 0,
      suggestedMacroAdjustment: { protein: 0, carbs: 0, fat: 0 },
      averageDailyCalories: 0,
      averageDailyProtein: 0,
      loggingConsistency: 0,
    };
  }

  // Only consider days that are not today (today is still in progress)
  const today = new Date().toISOString().split("T")[0];
  const pastDays = daySummaries.filter((d) => d.date < today);

  if (pastDays.length === 0) {
    return {
      insights: [],
      daySummaries,
      suggestedCalorieAdjustment: 0,
      suggestedMacroAdjustment: { protein: 0, carbs: 0, fat: 0 },
      averageDailyCalories: 0,
      averageDailyProtein: 0,
      loggingConsistency: 0,
    };
  }

  // Calculate averages
  const daysWithMeals = pastDays.filter((d) => d.mealCount > 0);
  const totalCals = daysWithMeals.reduce((s, d) => s + d.totalCalories, 0);
  const totalProt = daysWithMeals.reduce((s, d) => s + d.totalProtein, 0);
  const avgCalories = daysWithMeals.length > 0 ? Math.round(totalCals / daysWithMeals.length) : 0;
  const avgProtein = daysWithMeals.length > 0 ? Math.round(totalProt / daysWithMeals.length) : 0;
  const loggingConsistency = pastDays.length > 0 ? daysWithMeals.length / pastDays.length : 0;

  // 1. Under-eating detection
  const underEatingDays = daysWithMeals.filter(
    (d) => d.totalCalories < calorieGoal * UNDER_EATING_THRESHOLD,
  );
  if (underEatingDays.length >= MIN_TRIGGER_DAYS) {
    const deficit = calorieGoal - avgCalories;
    insights.push({
      id: "under_eating",
      type: "under_eating",
      severity: "warning",
      title: "You're under-eating",
      message: `You've been below 80% of your ${calorieGoal} kcal target for ${underEatingDays.length} of the last ${pastDays.length} days (averaging ${avgCalories} kcal).`,
      suggestion: underEatingDays.length >= 5
        ? "Consider simpler, calorie-dense meals like smoothies, nut butter toast, or meal prep batches to hit your targets more easily."
        : "Try adding a high-protein snack between meals — a handful of nuts, Greek yogurt, or a protein shake can close the gap.",
      triggerDays: underEatingDays.length,
    });
  }

  // 2. Over-eating detection
  const overEatingDays = daysWithMeals.filter(
    (d) => d.totalCalories > calorieGoal * OVER_EATING_THRESHOLD,
  );
  if (overEatingDays.length >= MIN_TRIGGER_DAYS) {
    const surplus = avgCalories - calorieGoal;
    insights.push({
      id: "over_eating",
      type: "over_eating",
      severity: "warning",
      title: "Calorie surplus detected",
      message: `You've exceeded 120% of your ${calorieGoal} kcal target for ${overEatingDays.length} of the last ${pastDays.length} days (averaging ${avgCalories} kcal).`,
      suggestion: "Try swapping one high-calorie meal for a lighter alternative, or reduce portion sizes slightly. Your meal plan can be adjusted to better match your actual appetite.",
      triggerDays: overEatingDays.length,
    });
  }

  // 3. Missed meals detection
  const missedDays = pastDays.filter((d) => d.mealCount === 0);
  if (missedDays.length >= MIN_TRIGGER_DAYS) {
    insights.push({
      id: "missed_meals",
      type: "missed_meals",
      severity: "warning",
      title: "Meals not logged",
      message: `No meals were logged on ${missedDays.length} of the last ${pastDays.length} days. Consistent tracking helps the AI personalize your plan.`,
      suggestion: "Even a quick photo log counts! Try the camera estimator for fast logging, or use favourite meals for one-tap re-logging.",
      triggerDays: missedDays.length,
    });
  }

  // 4. Low protein detection
  if (proteinTarget > 0) {
    const lowProteinDays = daysWithMeals.filter(
      (d) => d.totalProtein < proteinTarget * LOW_PROTEIN_THRESHOLD,
    );
    if (lowProteinDays.length >= MIN_TRIGGER_DAYS) {
      insights.push({
        id: "low_protein",
        type: "low_protein",
        severity: "info",
        title: "Protein intake is low",
        message: `Your protein has been below 70% of your ${proteinTarget}g target on ${lowProteinDays.length} days (averaging ${avgProtein}g).`,
        suggestion: "Add a protein source to each meal — eggs at breakfast, chicken or tofu at lunch, and Greek yogurt as a snack can make a big difference.",
        triggerDays: lowProteinDays.length,
      });
    }
  }

  // 5. On-track / great streak (positive reinforcement)
  if (insights.length === 0 && daysWithMeals.length >= 3) {
    const onTrackDays = daysWithMeals.filter(
      (d) =>
        d.totalCalories >= calorieGoal * UNDER_EATING_THRESHOLD &&
        d.totalCalories <= calorieGoal * OVER_EATING_THRESHOLD,
    );

    if (onTrackDays.length >= 5) {
      insights.push({
        id: "great_streak",
        type: "great_streak",
        severity: "success",
        title: "Amazing consistency!",
        message: `You've hit your calorie target ${onTrackDays.length} out of ${daysWithMeals.length} days. Keep it up!`,
        suggestion: "Your nutrition is dialled in. Consider focusing on meal variety to keep things interesting.",
        triggerDays: onTrackDays.length,
      });
    } else if (onTrackDays.length >= 3) {
      insights.push({
        id: "on_track",
        type: "on_track",
        severity: "success",
        title: "You're on track",
        message: `${onTrackDays.length} of your last ${daysWithMeals.length} logged days were within your calorie target range.`,
        suggestion: "Solid progress! Keep logging consistently to help the AI fine-tune your plan.",
        triggerDays: onTrackDays.length,
      });
    }
  }

  // Sort by severity
  insights.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);

  // Calculate suggested adjustments
  let suggestedCalorieAdjustment = 0;
  if (underEatingDays.length >= MIN_TRIGGER_DAYS) {
    // Suggest reducing the goal slightly to be more achievable
    suggestedCalorieAdjustment = -Math.round((calorieGoal - avgCalories) * 0.5);
  } else if (overEatingDays.length >= MIN_TRIGGER_DAYS) {
    // Suggest increasing the goal slightly to match reality
    suggestedCalorieAdjustment = Math.round((avgCalories - calorieGoal) * 0.5);
  }

  // Macro adjustments
  const proteinDelta = proteinTarget > 0 ? Math.round(avgProtein - proteinTarget) : 0;

  return {
    insights,
    daySummaries,
    suggestedCalorieAdjustment,
    suggestedMacroAdjustment: {
      protein: proteinDelta,
      carbs: 0,
      fat: 0,
    },
    averageDailyCalories: avgCalories,
    averageDailyProtein: avgProtein,
    loggingConsistency,
  };
}

// ── Simpler meal suggestions ─────────────────────────────────────────────

export interface SimpleMealSuggestion {
  name: string;
  calories: number;
  protein: number;
  prepTime: string;
  icon: string;
}

/**
 * Returns quick, simple meal suggestions for users who are consistently
 * under-eating. These are calorie-dense, low-effort options.
 */
export function getSimpleMealSuggestions(
  calorieGap: number,
  dietaryPref?: string,
): SimpleMealSuggestion[] {
  const base: SimpleMealSuggestion[] = [
    { name: "Protein Smoothie", calories: 350, protein: 30, prepTime: "3 min", icon: "local-cafe" },
    { name: "Nut Butter Toast", calories: 280, protein: 12, prepTime: "2 min", icon: "breakfast-dining" },
    { name: "Greek Yogurt + Granola", calories: 300, protein: 20, prepTime: "1 min", icon: "icecream" },
    { name: "Trail Mix (50g)", calories: 260, protein: 8, prepTime: "0 min", icon: "spa" },
    { name: "Banana + Peanut Butter", calories: 290, protein: 10, prepTime: "1 min", icon: "nutrition" },
    { name: "Overnight Oats", calories: 380, protein: 15, prepTime: "5 min (night before)", icon: "dark-mode" },
  ];

  const veganOptions: SimpleMealSuggestion[] = [
    { name: "Avocado Toast + Seeds", calories: 320, protein: 10, prepTime: "3 min", icon: "eco" },
    { name: "Hummus + Veggie Wrap", calories: 340, protein: 14, prepTime: "4 min", icon: "lunch-dining" },
  ];

  const highProtein: SimpleMealSuggestion[] = [
    { name: "Cottage Cheese + Fruit", calories: 220, protein: 24, prepTime: "1 min", icon: "restaurant" },
    { name: "Hard-Boiled Eggs (3)", calories: 210, protein: 18, prepTime: "0 min (pre-made)", icon: "egg" },
  ];

  let suggestions = [...base];
  if (dietaryPref === "vegan" || dietaryPref === "vegetarian") {
    suggestions = [...suggestions, ...veganOptions];
  } else {
    suggestions = [...suggestions, ...highProtein];
  }

  // Sort by how well they fill the gap
  suggestions.sort((a, b) => {
    const aDiff = Math.abs(a.calories - calorieGap / 2);
    const bDiff = Math.abs(b.calories - calorieGap / 2);
    return aDiff - bDiff;
  });

  return suggestions.slice(0, 4);
}

// ── Remaining day adjustment ─────────────────────────────────────────────

/**
 * Calculate adjusted calorie/macro targets for the remaining days of the week
 * based on what has already been consumed.
 */
export function calculateRemainingDayTargets(
  weeklyCalorieTarget: number,
  weeklyProteinTarget: number,
  consumedSoFar: { calories: number; protein: number },
  daysRemaining: number,
): { dailyCalories: number; dailyProtein: number; isAdjusted: boolean } {
  if (daysRemaining <= 0) {
    return { dailyCalories: 0, dailyProtein: 0, isAdjusted: false };
  }

  const remainingCalories = weeklyCalorieTarget - consumedSoFar.calories;
  const remainingProtein = weeklyProteinTarget - consumedSoFar.protein;

  const dailyCalories = Math.round(Math.max(remainingCalories / daysRemaining, 1200));
  const dailyProtein = Math.round(Math.max(remainingProtein / daysRemaining, 50));

  const normalDailyCalories = Math.round(weeklyCalorieTarget / 7);
  const isAdjusted = Math.abs(dailyCalories - normalDailyCalories) > 100;

  return { dailyCalories, dailyProtein, isAdjusted };
}

// ── Dismiss persistence ──────────────────────────────────────────────────

/**
 * Get the current week ID for dismiss tracking.
 */
export function getWeekId(): string {
  const now = new Date();
  const year = now.getFullYear();
  const startOfYear = new Date(year, 0, 1);
  const daysSinceStart = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
  const weekNum = Math.ceil((daysSinceStart + startOfYear.getDay() + 1) / 7);
  return `${year}-W${weekNum}`;
}

/**
 * Check if a specific insight has been dismissed this week.
 */
export async function isInsightDismissed(insightId: string): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(DISMISS_STORAGE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    if (data.weekId !== getWeekId()) return false;
    return (data.dismissed ?? []).includes(insightId);
  } catch {
    return false;
  }
}

/**
 * Dismiss an insight for the current week.
 */
export async function dismissInsight(insightId: string): Promise<void> {
  try {
    const weekId = getWeekId();
    const raw = await AsyncStorage.getItem(DISMISS_STORAGE_KEY);
    let data = { weekId, dismissed: [] as string[] };
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.weekId === weekId) {
        data = parsed;
      }
    }
    if (!data.dismissed.includes(insightId)) {
      data.dismissed.push(insightId);
    }
    data.weekId = weekId;
    await AsyncStorage.setItem(DISMISS_STORAGE_KEY, JSON.stringify(data));
  } catch {}
}
