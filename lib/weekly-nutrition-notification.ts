/**
 * Weekly Nutrition Summary Notification
 *
 * Pushes a Sunday-evening digest with the week's calorie/protein averages,
 * macro adherence, and a motivational insight.
 *
 * Reads from the same AsyncStorage-backed meal history used by the Tracker tab.
 * Scheduled as a repeating weekly notification (Sunday 7 PM).
 */
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getHistoricalMeals, type MealEntry } from "@/lib/calorie-context";

// ── Storage Keys ────────────────────────────────────────────────────────
const NUTRITION_NOTIF_ID_KEY = "@weekly_nutrition_notif_id";
const NUTRITION_ENABLED_KEY = "@weekly_nutrition_enabled";
const MACRO_TARGETS_KEY = "@user_macro_targets";
const GOAL_KEY = "@peakpulse_calorie_goal";

// ── Types ───────────────────────────────────────────────────────────────

export interface WeeklyNutritionSummary {
  daysLogged: number;
  avgCalories: number;
  avgProtein: number;
  avgCarbs: number;
  avgFat: number;
  calorieGoal: number;
  proteinGoal: number;
  calorieAdherence: number; // 0–100 percentage
  proteinAdherence: number; // 0–100 percentage
  bestDay: string | null;   // date with closest-to-goal calories
  insight: string;
}

// ── Core Logic (pure, testable) ─────────────────────────────────────────

/**
 * Compute weekly nutrition summary from raw meal data.
 * Pure function — no side effects.
 */
export function computeWeeklyNutritionSummary(
  mealsByDate: Record<string, MealEntry[]>,
  calorieGoal: number,
  macroTargets: { protein: number; carbs: number; fat: number },
): WeeklyNutritionSummary {
  const dates = Object.keys(mealsByDate).sort();
  const loggedDates = dates.filter((d) => mealsByDate[d].length > 0);
  const daysLogged = loggedDates.length;

  if (daysLogged === 0) {
    return {
      daysLogged: 0,
      avgCalories: 0,
      avgProtein: 0,
      avgCarbs: 0,
      avgFat: 0,
      calorieGoal,
      proteinGoal: macroTargets.protein,
      calorieAdherence: 0,
      proteinAdherence: 0,
      bestDay: null,
      insight: "No meals logged this week. Start tracking to get personalised insights!",
    };
  }

  // Per-day totals
  const dailyTotals = loggedDates.map((date) => {
    const meals = mealsByDate[date];
    return {
      date,
      calories: meals.reduce((s, m) => s + m.calories, 0),
      protein: meals.reduce((s, m) => s + m.protein, 0),
      carbs: meals.reduce((s, m) => s + m.carbs, 0),
      fat: meals.reduce((s, m) => s + m.fat, 0),
    };
  });

  const avgCalories = Math.round(dailyTotals.reduce((s, d) => s + d.calories, 0) / daysLogged);
  const avgProtein = Math.round(dailyTotals.reduce((s, d) => s + d.protein, 0) / daysLogged);
  const avgCarbs = Math.round(dailyTotals.reduce((s, d) => s + d.carbs, 0) / daysLogged);
  const avgFat = Math.round(dailyTotals.reduce((s, d) => s + d.fat, 0) / daysLogged);

  // Adherence: how close average is to goal (capped at 100%)
  const calorieAdherence = calorieGoal > 0
    ? Math.min(100, Math.round((1 - Math.abs(avgCalories - calorieGoal) / calorieGoal) * 100))
    : 0;
  const proteinAdherence = macroTargets.protein > 0
    ? Math.min(100, Math.round((avgProtein / macroTargets.protein) * 100))
    : 0;

  // Best day = closest to calorie goal
  let bestDay: string | null = null;
  let bestDiff = Infinity;
  for (const d of dailyTotals) {
    const diff = Math.abs(d.calories - calorieGoal);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestDay = d.date;
    }
  }

  // Generate insight
  const insight = generateInsight(avgCalories, calorieGoal, avgProtein, macroTargets.protein, daysLogged, calorieAdherence);

  return {
    daysLogged,
    avgCalories,
    avgProtein,
    avgCarbs,
    avgFat,
    calorieGoal,
    proteinGoal: macroTargets.protein,
    calorieAdherence: Math.max(0, calorieAdherence),
    proteinAdherence: Math.min(100, Math.max(0, proteinAdherence)),
    bestDay,
    insight,
  };
}

function generateInsight(
  avgCal: number,
  calGoal: number,
  avgProtein: number,
  proteinGoal: number,
  daysLogged: number,
  adherence: number,
): string {
  if (daysLogged <= 2) {
    return "Try logging meals more consistently — even 4-5 days gives much better insights.";
  }
  if (adherence >= 90) {
    return "Outstanding calorie adherence this week! You're dialled in.";
  }
  if (avgCal < calGoal * 0.75) {
    const deficit = calGoal - avgCal;
    return `You're averaging ${deficit} kcal under your goal. Consider adding a snack or larger portions to fuel recovery.`;
  }
  if (avgCal > calGoal * 1.15) {
    const surplus = avgCal - calGoal;
    return `You're averaging ${surplus} kcal over your goal. Small swaps (e.g. lighter sauces, smaller portions) can help.`;
  }
  if (proteinGoal > 0 && avgProtein < proteinGoal * 0.8) {
    return `Protein is a bit low (${avgProtein}g vs ${proteinGoal}g target). Add a scoop of whey or an extra chicken breast.`;
  }
  if (adherence >= 75) {
    return "Solid week! You're within range — keep the consistency going.";
  }
  return "Good effort logging this week. Focus on hitting your calorie target more days for better results.";
}

// ── Notification Content Builder ────────────────────────────────────────

export function buildNutritionNotificationContent(
  summary: WeeklyNutritionSummary,
): Notifications.NotificationContentInput {
  const calLine = `Avg ${summary.avgCalories} kcal/day (goal: ${summary.calorieGoal})`;
  const proteinLine = `Avg ${summary.avgProtein}g protein/day`;
  const adherenceLine = `Calorie adherence: ${summary.calorieAdherence}%`;
  const daysLine = `${summary.daysLogged}/7 days logged`;

  const body = [calLine, proteinLine, adherenceLine, daysLine, "", summary.insight].join("\n");

  return {
    title: "Weekly Nutrition Summary",
    subtitle: `${summary.daysLogged} days tracked this week`,
    body,
    data: { type: "weekly_nutrition", screen: "/(tabs)/meals" },
    sound: true,
    badge: 1,
  };
}

// ── Persistence Helpers ─────────────────────────────────────────────────

export async function getWeeklyNutritionEnabled(): Promise<boolean> {
  const raw = await AsyncStorage.getItem(NUTRITION_ENABLED_KEY);
  return raw === null ? true : raw === "true"; // enabled by default
}

export async function setWeeklyNutritionEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(NUTRITION_ENABLED_KEY, String(enabled));
  if (enabled) {
    await scheduleWeeklyNutritionNotification();
  } else {
    await cancelWeeklyNutritionNotification();
  }
}

// ── Generate Summary from Storage ───────────────────────────────────────

export async function generateWeeklyNutritionSummary(): Promise<WeeklyNutritionSummary> {
  const mealsByDate = await getHistoricalMeals(7);

  // Load calorie goal
  let calorieGoal = 2000;
  try {
    const raw = await AsyncStorage.getItem(GOAL_KEY);
    if (raw) calorieGoal = parseInt(raw, 10) || 2000;
  } catch {}

  // Load macro targets
  let macroTargets = { protein: 150, carbs: 250, fat: 65 };
  try {
    const raw = await AsyncStorage.getItem(MACRO_TARGETS_KEY);
    if (raw) macroTargets = JSON.parse(raw);
  } catch {}

  return computeWeeklyNutritionSummary(mealsByDate, calorieGoal, macroTargets);
}

// ── Schedule / Cancel ───────────────────────────────────────────────────

async function cancelExisting(): Promise<void> {
  try {
    const id = await AsyncStorage.getItem(NUTRITION_NOTIF_ID_KEY);
    if (id) {
      await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
      await AsyncStorage.removeItem(NUTRITION_NOTIF_ID_KEY);
    }
  } catch {}
}

export async function scheduleWeeklyNutritionNotification(
  hour: number = 19,
  minute: number = 30,
): Promise<string | null> {
  if (Platform.OS === "web") return null;

  const enabled = await getWeeklyNutritionEnabled();
  if (!enabled) {
    await cancelExisting();
    return null;
  }

  await cancelExisting();

  try {
    const summary = await generateWeeklyNutritionSummary();
    const content = buildNutritionNotificationContent(summary);

    const id = await Notifications.scheduleNotificationAsync({
      content,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: 1, // 1 = Sunday in Expo
        hour,
        minute,
      },
    });

    await AsyncStorage.setItem(NUTRITION_NOTIF_ID_KEY, id);
    return id;
  } catch (err) {
    console.warn("[WeeklyNutrition] Failed to schedule:", err);
    return null;
  }
}

export async function cancelWeeklyNutritionNotification(): Promise<void> {
  await cancelExisting();
}

/**
 * Send an immediate nutrition summary notification (for testing).
 */
export async function sendImmediateNutritionSummary(): Promise<string | null> {
  if (Platform.OS === "web") return null;
  try {
    const summary = await generateWeeklyNutritionSummary();
    const content = buildNutritionNotificationContent(summary);
    const id = await Notifications.scheduleNotificationAsync({
      content,
      trigger: null,
    });
    return id;
  } catch (err) {
    console.warn("[WeeklyNutrition] Failed to send immediate:", err);
    return null;
  }
}

/**
 * Initialize on app launch — schedule if enabled.
 */
export async function initWeeklyNutritionNotification(): Promise<void> {
  if (Platform.OS === "web") return;
  const enabled = await getWeeklyNutritionEnabled();
  if (enabled) {
    await scheduleWeeklyNutritionNotification();
  }
}
