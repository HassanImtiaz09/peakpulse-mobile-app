/**
 * Daily State Aggregator — Centralized daily snapshot
 *
 * Computes a single DailyState object from all app data sources:
 *   - Meals logged today (count + macros) vs planned meals
 *   - Calories consumed / remaining / goal
 *   - Workout status (completed, scheduled, rest day)
 *   - Streak data (daily XP streak + weekly goal streak)
 *   - Macro balance (protein/carbs/fat vs targets)
 *   - Time-of-day context (morning/midday/evening/night)
 *
 * The state refreshes on:
 *   - App open (foreground resume)
 *   - Meal log events
 *   - Workout completion events
 *   - Manual refresh calls
 *
 * Persists to AsyncStorage for instant load on next app open.
 * Designed as a pure-function module (no React hooks) so it can be
 * consumed by hooks, notification schedulers, and background tasks.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

// ── Storage Keys (unchanged from existing patterns) ──────────────────────────
const DAILY_STATE_KEY = "@peakpulse_daily_state";
const MEALS_KEY = "@peakpulse_today_meals";
const CALORIE_GOAL_KEY = "@peakpulse_calorie_goal";
const MACRO_TARGETS_KEY = "@user_macro_targets";
const WORKOUT_SESSIONS_KEY = "@workout_sessions_local";
const XP_DATA_KEY = "@peakpulse_xp_data";
const STREAK_DATA_KEY = "@goal_streak_data";
const WORKOUT_PLAN_KEYS = ["@cached_workout_plan", "@guest_workout_plan"];

// ── Types ────────────────────────────────────────────────────────────────────

export type TimeOfDay = "morning" | "midday" | "evening" | "night";

export type WorkoutStatus =
  | "completed"     // User finished today's workout
  | "scheduled"     // Workout planned for today, not yet done
  | "rest_day"      // No workout planned for today
  | "skipped";      // Workout was planned but day is almost over

export interface MacroSnapshot {
  protein: number;
  carbs: number;
  fat: number;
  proteinTarget: number;
  carbsTarget: number;
  fatTarget: number;
  /** 0–1 adherence ratio (consumed / target), capped at 1.5 */
  proteinAdherence: number;
  carbsAdherence: number;
  fatAdherence: number;
}

export interface DailyState {
  /** ISO date string YYYY-MM-DD */
  date: string;
  /** When this state was last computed */
  computedAt: string;

  // ── Meals ──
  mealsLogged: number;
  mealsPlanned: number;
  mealTypes: string[];        // e.g. ["breakfast", "lunch"]

  // ── Calories ──
  caloriesConsumed: number;
  calorieGoal: number;
  caloriesRemaining: number;
  /** 0–1 ratio of consumed / goal */
  calorieProgress: number;

  // ── Macros ──
  macros: MacroSnapshot;

  // ── Workout ──
  workoutStatus: WorkoutStatus;
  todayWorkoutName: string | null;
  workoutsCompletedToday: number;

  // ── Streaks & XP ──
  dailyXPStreak: number;
  weeklyGoalStreak: number;
  totalXP: number;
  currentLevel: number;

  // ── Context ──
  timeOfDay: TimeOfDay;
  dayOfWeek: string;          // e.g. "Monday"
  isWeekend: boolean;
}

// ── Pure Helpers (testable without AsyncStorage) ─────────────────────────────

/**
 * Determine the time-of-day bucket from an hour (0–23).
 */
export function getTimeOfDay(hour: number): TimeOfDay {
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "midday";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
}

/**
 * Get today's date as YYYY-MM-DD in local timezone.
 */
export function getTodayDate(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Get the day name from a Date object.
 */
export function getDayName(now: Date = new Date()): string {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return days[now.getDay()];
}

/**
 * Check if a date is a weekend (Saturday or Sunday).
 */
export function isWeekend(now: Date = new Date()): boolean {
  const day = now.getDay();
  return day === 0 || day === 6;
}

/**
 * Compute calorie progress ratio, clamped to [0, 1.5].
 */
export function computeCalorieProgress(consumed: number, goal: number): number {
  if (goal <= 0) return 0;
  return Math.min(consumed / goal, 1.5);
}

/**
 * Compute macro adherence ratio, clamped to [0, 1.5].
 */
export function computeAdherence(consumed: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(consumed / target, 1.5);
}

/**
 * Count planned meals for today from a meal plan object.
 * Meal plans have a `days` array with day names and meals.
 */
export function countPlannedMeals(mealPlan: any, dayName: string): number {
  if (!mealPlan?.days && !mealPlan?.schedule) return 3; // default assumption
  const days = mealPlan.days || mealPlan.schedule || [];
  const todayPlan = days.find((d: any) => {
    const name = (d.day || d.name || "").toLowerCase();
    return name === dayName.toLowerCase() || name.startsWith(dayName.toLowerCase().slice(0, 3));
  });
  if (!todayPlan) return 3;
  const meals = todayPlan.meals || [];
  return meals.length || 3;
}

/**
 * Determine workout status from plan and session data.
 */
export function determineWorkoutStatus(
  todayWorkout: any | null,
  sessionsToday: number,
  hour: number
): WorkoutStatus {
  if (sessionsToday > 0) return "completed";
  if (!todayWorkout) return "rest_day";
  // Check if it's a rest day in the plan
  const focus = (todayWorkout.focus || todayWorkout.name || "").toLowerCase();
  const exercises = todayWorkout.exercises || [];
  if (focus.includes("rest") || focus.includes("recovery") || focus.includes("off") || exercises.length === 0) {
    return "rest_day";
  }
  // If it's late and workout not done, mark as skipped
  if (hour >= 22) return "skipped";
  return "scheduled";
}

/**
 * Extract today's workout from a workout plan.
 */
export function extractTodayWorkout(plan: any, dayName: string): any | null {
  if (!plan?.schedule) return null;
  const match = plan.schedule.find((d: any) => {
    const dayStr = (d.day ?? "").toLowerCase();
    return dayStr === dayName.toLowerCase() || dayStr.startsWith(dayName.toLowerCase().slice(0, 3));
  });
  return match || null;
}

/**
 * Count workout sessions completed today from session history.
 */
export function countTodaySessions(sessions: any[], todayDate: string): number {
  return sessions.filter((s: any) => {
    const sessionDate = (s.date || s.completedAt || "").split("T")[0];
    return sessionDate === todayDate;
  }).length;
}

/**
 * Build a DailyState from raw data inputs (pure function, no I/O).
 */
export function buildDailyState(inputs: {
  now: Date;
  meals: Array<{ calories: number; protein: number; carbs: number; fat: number; mealType: string }>;
  calorieGoal: number;
  macroTargets: { protein: number; carbs: number; fat: number };
  workoutPlan: any | null;
  sessions: any[];
  xpData: { totalXP: number; level: number; dailyStreak: number } | null;
  streakData: { currentStreak: number } | null;
  mealPlan: any | null;
}): DailyState {
  const { now, meals, calorieGoal, macroTargets, workoutPlan, sessions, xpData, streakData, mealPlan } = inputs;

  const todayDate = getTodayDate(now);
  const dayName = getDayName(now);
  const hour = now.getHours();

  // Meals
  const mealsLogged = meals.length;
  const mealsPlanned = countPlannedMeals(mealPlan, dayName);
  const mealTypes = [...new Set(meals.map(m => m.mealType).filter(Boolean))];

  // Calories
  const caloriesConsumed = meals.reduce((sum, m) => sum + (m.calories || 0), 0);
  const caloriesRemaining = Math.max(0, calorieGoal - caloriesConsumed);
  const calorieProgress = computeCalorieProgress(caloriesConsumed, calorieGoal);

  // Macros
  const totalProtein = meals.reduce((sum, m) => sum + (m.protein || 0), 0);
  const totalCarbs = meals.reduce((sum, m) => sum + (m.carbs || 0), 0);
  const totalFat = meals.reduce((sum, m) => sum + (m.fat || 0), 0);

  const macros: MacroSnapshot = {
    protein: totalProtein,
    carbs: totalCarbs,
    fat: totalFat,
    proteinTarget: macroTargets.protein || 0,
    carbsTarget: macroTargets.carbs || 0,
    fatTarget: macroTargets.fat || 0,
    proteinAdherence: computeAdherence(totalProtein, macroTargets.protein),
    carbsAdherence: computeAdherence(totalCarbs, macroTargets.carbs),
    fatAdherence: computeAdherence(totalFat, macroTargets.fat),
  };

  // Workout
  const todayWorkout = extractTodayWorkout(workoutPlan, dayName);
  const todaySessions = countTodaySessions(sessions, todayDate);
  const workoutStatus = determineWorkoutStatus(todayWorkout, todaySessions, hour);
  const todayWorkoutName = todayWorkout?.focus || todayWorkout?.name || null;

  return {
    date: todayDate,
    computedAt: now.toISOString(),
    mealsLogged,
    mealsPlanned,
    mealTypes,
    caloriesConsumed,
    calorieGoal,
    caloriesRemaining,
    calorieProgress,
    macros,
    workoutStatus,
    todayWorkoutName,
    workoutsCompletedToday: todaySessions,
    dailyXPStreak: xpData?.dailyStreak ?? 0,
    weeklyGoalStreak: streakData?.currentStreak ?? 0,
    totalXP: xpData?.totalXP ?? 0,
    currentLevel: xpData?.level ?? 1,
    timeOfDay: getTimeOfDay(hour),
    dayOfWeek: dayName,
    isWeekend: isWeekend(now),
  };
}

// ── Async I/O Layer ──────────────────────────────────────────────────────────

/**
 * Load the cached daily state from AsyncStorage.
 * Returns null if no cached state exists or if it's from a different day.
 */
export async function loadCachedDailyState(): Promise<DailyState | null> {
  try {
    const raw = await AsyncStorage.getItem(DAILY_STATE_KEY);
    if (!raw) return null;
    const state: DailyState = JSON.parse(raw);
    // Only return if it's from today
    if (state.date === getTodayDate()) return state;
    return null;
  } catch {
    return null;
  }
}

/**
 * Save the daily state to AsyncStorage.
 */
export async function saveDailyState(state: DailyState): Promise<void> {
  try {
    await AsyncStorage.setItem(DAILY_STATE_KEY, JSON.stringify(state));
  } catch (err) {
    console.warn("[DailyState] Failed to save:", err);
  }
}

/**
 * Refresh the daily state by reading all data sources.
 * This is the main entry point — call on app open, after meal logs, after workouts.
 */
export async function refreshDailyState(now: Date = new Date()): Promise<DailyState> {
  const todayDate = getTodayDate(now);

  // Read all data sources in parallel
  const [
    mealsRaw,
    calorieGoalRaw,
    macroTargetsRaw,
    sessionsRaw,
    xpDataRaw,
    streakDataRaw,
    ...planRaws
  ] = await Promise.all([
    AsyncStorage.getItem(`${MEALS_KEY}_${todayDate}`),
    AsyncStorage.getItem(CALORIE_GOAL_KEY),
    AsyncStorage.getItem(MACRO_TARGETS_KEY),
    AsyncStorage.getItem(WORKOUT_SESSIONS_KEY),
    AsyncStorage.getItem(XP_DATA_KEY),
    AsyncStorage.getItem(STREAK_DATA_KEY),
    ...WORKOUT_PLAN_KEYS.map(k => AsyncStorage.getItem(k)),
  ]);

  // Parse data with safe defaults
  const meals = mealsRaw ? JSON.parse(mealsRaw) : [];
  const calorieGoal = calorieGoalRaw ? parseInt(calorieGoalRaw, 10) : 2000;
  const macroTargets = macroTargetsRaw
    ? JSON.parse(macroTargetsRaw)
    : { protein: 0, carbs: 0, fat: 0 };
  const sessions = sessionsRaw ? JSON.parse(sessionsRaw) : [];
  const xpData = xpDataRaw ? JSON.parse(xpDataRaw) : null;
  const streakData = streakDataRaw ? JSON.parse(streakDataRaw) : null;

  // Find the first available workout plan
  let workoutPlan: any = null;
  for (const raw of planRaws) {
    if (raw) {
      try {
        workoutPlan = JSON.parse(raw);
        break;
      } catch {}
    }
  }

  // Also try to load a meal plan for planned meal count
  let mealPlan: any = null;
  try {
    const mealPlanRaw = await AsyncStorage.getItem("@guest_meal_plan");
    if (mealPlanRaw) mealPlan = JSON.parse(mealPlanRaw);
  } catch {}

  const state = buildDailyState({
    now,
    meals,
    calorieGoal: isNaN(calorieGoal) ? 2000 : calorieGoal,
    macroTargets,
    workoutPlan,
    sessions,
    xpData,
    streakData,
    mealPlan,
  });

  // Persist for instant load next time
  await saveDailyState(state);

  return state;
}

/**
 * Get the daily state — returns cached if fresh (< 5 min old), otherwise refreshes.
 * Use this for non-critical reads (e.g., notification content).
 */
export async function getDailyState(): Promise<DailyState> {
  const cached = await loadCachedDailyState();
  if (cached) {
    const age = Date.now() - new Date(cached.computedAt).getTime();
    if (age < 5 * 60 * 1000) return cached; // Fresh enough
  }
  return refreshDailyState();
}

/**
 * Create a default/empty daily state for the current day.
 * Useful as a fallback when data loading fails.
 */
export function createEmptyDailyState(now: Date = new Date()): DailyState {
  return buildDailyState({
    now,
    meals: [],
    calorieGoal: 2000,
    macroTargets: { protein: 0, carbs: 0, fat: 0 },
    workoutPlan: null,
    sessions: [],
    xpData: null,
    streakData: null,
    mealPlan: null,
  });
}
