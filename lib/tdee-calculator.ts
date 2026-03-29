/**
 * Shared TDEE Calculator — Mifflin-St Jeor equation with goal adjustments.
 * Used by onboarding, settings recalculate, and dashboard breakdown display.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

export const ACTIVITY_LEVELS = [
  { key: "sedentary",   label: "Sedentary",         desc: "Little or no exercise",      multiplier: 1.2 },
  { key: "light",       label: "Lightly Active",    desc: "1-3 days/week",               multiplier: 1.375 },
  { key: "moderate",    label: "Moderately Active",  desc: "3-5 days/week",              multiplier: 1.55 },
  { key: "very_active", label: "Very Active",        desc: "6-7 days/week",              multiplier: 1.725 },
  { key: "extra",       label: "Extra Active",       desc: "Twice daily / physical job", multiplier: 1.9 },
] as const;

export const GOAL_OPTIONS = [
  { key: "lose_fat",      label: "Lose Fat",           multiplier: 0.80, desc: "20% caloric deficit" },
  { key: "build_muscle",  label: "Build Muscle",       multiplier: 1.15, desc: "15% caloric surplus" },
  { key: "athletic",      label: "Athletic / Recomp",  multiplier: 0.92, desc: "8% caloric deficit" },
  { key: "maintain",      label: "Maintain",           multiplier: 1.00, desc: "No adjustment" },
] as const;

export interface TDEEBreakdown {
  bmr: number;
  activityMultiplier: number;
  activityLabel: string;
  maintenanceTdee: number;
  goalMultiplier: number;
  goalLabel: string;
  goalAdjustmentDesc: string;
  adjustedTdee: number;
  /** Input values used for the calculation */
  inputs: {
    weightKg: number;
    heightCm: number;
    age: number;
    gender: "male" | "female";
    activityKey: string;
    goal: string;
  };
}

const TDEE_BREAKDOWN_KEY = "@peakpulse_tdee_breakdown";

/**
 * Calculate TDEE with full breakdown data.
 */
export function calculateTDEEBreakdown(
  weightKg: number,
  heightCm: number,
  age: number,
  gender: "male" | "female",
  activityKey: string,
  goal: string,
): TDEEBreakdown {
  // Mifflin-St Jeor BMR (Frankenfield et al. 2005)
  const bmr = gender === "male"
    ? 10 * weightKg + 6.25 * heightCm - 5 * age + 5
    : 10 * weightKg + 6.25 * heightCm - 5 * age - 161;

  const activity = ACTIVITY_LEVELS.find(a => a.key === activityKey) ?? ACTIVITY_LEVELS[2];
  const maintenanceTdee = bmr * activity.multiplier;

  const goalOption = GOAL_OPTIONS.find(g => g.key === goal) ?? GOAL_OPTIONS[3];
  let adjusted = maintenanceTdee * goalOption.multiplier;

  // Safety floors
  const minCalories = gender === "male" ? 1500 : 1200;
  adjusted = Math.max(adjusted, minCalories);

  return {
    bmr: Math.round(bmr),
    activityMultiplier: activity.multiplier,
    activityLabel: activity.label,
    maintenanceTdee: Math.round(maintenanceTdee),
    goalMultiplier: goalOption.multiplier,
    goalLabel: goalOption.label,
    goalAdjustmentDesc: goalOption.desc,
    adjustedTdee: Math.round(adjusted),
    inputs: { weightKg, heightCm, age, gender, activityKey, goal },
  };
}

/**
 * Persist TDEE breakdown to AsyncStorage.
 */
export async function saveTDEEBreakdown(breakdown: TDEEBreakdown): Promise<void> {
  await AsyncStorage.setItem(TDEE_BREAKDOWN_KEY, JSON.stringify(breakdown));
  // Also update the calorie goal keys for dashboard sync
  await AsyncStorage.setItem("@user_tdee", String(breakdown.adjustedTdee));
  await AsyncStorage.setItem("@peakpulse_calorie_goal", String(breakdown.adjustedTdee));
}

/**
 * Load persisted TDEE breakdown from AsyncStorage.
 */
export async function loadTDEEBreakdown(): Promise<TDEEBreakdown | null> {
  try {
    const raw = await AsyncStorage.getItem(TDEE_BREAKDOWN_KEY);
    if (raw) return JSON.parse(raw) as TDEEBreakdown;
  } catch {}
  return null;
}

/**
 * Calculate macro targets from TDEE, weight, and goal.
 */
export function calculateMacros(
  tdee: number,
  weightKg: number,
  goal: string,
): { protein: number; carbs: number; fat: number } {
  let proteinPerKg = 1.6;
  let fatPct = 0.30;
  if (goal === "build_muscle") { proteinPerKg = 2.0; fatPct = 0.25; }
  else if (goal === "lose_fat") { proteinPerKg = 2.2; fatPct = 0.25; }
  else if (goal === "athletic") { proteinPerKg = 1.8; fatPct = 0.25; }

  const protein = Math.round(proteinPerKg * weightKg);
  const fat = Math.round((tdee * fatPct) / 9);
  const carbCals = tdee - (protein * 4) - (fat * 9);
  const carbs = Math.max(0, Math.round(carbCals / 4));
  return { protein, carbs, fat };
}
