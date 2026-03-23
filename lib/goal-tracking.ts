/**
 * Goal Tracking Service
 *
 * Manages weekly fitness goals (steps, calories burned, workouts) with
 * AsyncStorage persistence. Calculates progress from wearable data
 * and workout history.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

// ── Types ──────────────────────────────────────────────────────────

export interface WeeklyGoals {
  stepsTarget: number;       // daily average target
  caloriesTarget: number;    // daily calories burned target
  workoutsTarget: number;    // total workouts per week
}

export interface WeeklyProgress {
  steps: { current: number; target: number; percentage: number };
  calories: { current: number; target: number; percentage: number };
  workouts: { current: number; target: number; percentage: number };
  weekStart: string;  // ISO date string (Monday)
  weekEnd: string;    // ISO date string (Sunday)
  daysElapsed: number;
  daysRemaining: number;
}

export interface GoalHistory {
  weekStart: string;
  goals: WeeklyGoals;
  progress: WeeklyProgress;
  completedAt?: string;
}

// ── Storage Keys ──────────────────────────────────────────────────

const GOALS_KEY = "@weekly_goals";
const GOALS_ENABLED_KEY = "@weekly_goals_enabled";
const GOALS_HISTORY_KEY = "@weekly_goals_history";

// ── Default Goals ─────────────────────────────────────────────────

export const DEFAULT_GOALS: WeeklyGoals = {
  stepsTarget: 10000,    // 10K steps/day
  caloriesTarget: 500,   // 500 kcal/day burned
  workoutsTarget: 4,     // 4 workouts/week
};

// ── Goal Presets ──────────────────────────────────────────────────

export interface GoalPreset {
  name: string;
  description: string;
  icon: string;
  goals: WeeklyGoals;
}

export const GOAL_PRESETS: GoalPreset[] = [
  {
    name: "Beginner",
    description: "Start your fitness journey",
    icon: "directions-walk",
    goals: { stepsTarget: 7000, caloriesTarget: 300, workoutsTarget: 3 },
  },
  {
    name: "Active",
    description: "Maintain a healthy lifestyle",
    icon: "directions-run",
    goals: { stepsTarget: 10000, caloriesTarget: 500, workoutsTarget: 4 },
  },
  {
    name: "Athlete",
    description: "Push your limits",
    icon: "fitness-center",
    goals: { stepsTarget: 15000, caloriesTarget: 800, workoutsTarget: 6 },
  },
  {
    name: "Elite",
    description: "Peak performance mode",
    icon: "bolt",
    goals: { stepsTarget: 20000, caloriesTarget: 1000, workoutsTarget: 7 },
  },
];

// ── Week Helpers ──────────────────────────────────────────────────

function getWeekBounds(): { weekStart: Date; weekEnd: Date; daysElapsed: number; daysRemaining: number } {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon, ...
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() + mondayOffset);
  weekStart.setHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  const daysElapsed = Math.min(7, Math.floor((now.getTime() - weekStart.getTime()) / (24 * 60 * 60 * 1000)) + 1);
  const daysRemaining = 7 - daysElapsed;

  return { weekStart, weekEnd, daysElapsed, daysRemaining };
}

export function getCurrentWeekStart(): string {
  return getWeekBounds().weekStart.toISOString().split("T")[0];
}

// ── CRUD Operations ───────────────────────────────────────────────

export async function getWeeklyGoals(): Promise<WeeklyGoals> {
  try {
    const raw = await AsyncStorage.getItem(GOALS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn("[GoalTracking] Failed to load goals:", e);
  }
  return DEFAULT_GOALS;
}

export async function saveWeeklyGoals(goals: WeeklyGoals): Promise<void> {
  try {
    await AsyncStorage.setItem(GOALS_KEY, JSON.stringify(goals));
  } catch (e) {
    console.warn("[GoalTracking] Failed to save goals:", e);
  }
}

export async function isGoalTrackingEnabled(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(GOALS_ENABLED_KEY);
    return raw === null ? true : raw === "true"; // enabled by default
  } catch {
    return true;
  }
}

export async function setGoalTrackingEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(GOALS_ENABLED_KEY, String(enabled));
}

// ── Progress Calculation ──────────────────────────────────────────

interface ProgressInput {
  /** Average daily steps this week (from wearable) */
  avgDailySteps: number;
  /** Average daily calories burned this week (from wearable) */
  avgDailyCalories: number;
  /** Number of workouts logged this week */
  workoutsThisWeek: number;
}

export function calculateWeeklyProgress(
  goals: WeeklyGoals,
  input: ProgressInput,
): WeeklyProgress {
  const { weekStart, weekEnd, daysElapsed, daysRemaining } = getWeekBounds();

  const stepsProgress = goals.stepsTarget > 0
    ? Math.min(100, Math.round((input.avgDailySteps / goals.stepsTarget) * 100))
    : 0;

  const caloriesProgress = goals.caloriesTarget > 0
    ? Math.min(100, Math.round((input.avgDailyCalories / goals.caloriesTarget) * 100))
    : 0;

  const workoutsProgress = goals.workoutsTarget > 0
    ? Math.min(100, Math.round((input.workoutsThisWeek / goals.workoutsTarget) * 100))
    : 0;

  return {
    steps: { current: Math.round(input.avgDailySteps), target: goals.stepsTarget, percentage: stepsProgress },
    calories: { current: Math.round(input.avgDailyCalories), target: goals.caloriesTarget, percentage: caloriesProgress },
    workouts: { current: input.workoutsThisWeek, target: goals.workoutsTarget, percentage: workoutsProgress },
    weekStart: weekStart.toISOString().split("T")[0],
    weekEnd: weekEnd.toISOString().split("T")[0],
    daysElapsed,
    daysRemaining,
  };
}

// ── Workout Count Helper ──────────────────────────────────────────

const WORKOUT_HISTORY_KEY = "@workout_log_history";

export async function getWorkoutsThisWeek(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(WORKOUT_HISTORY_KEY);
    if (!raw) return 0;
    const entries = JSON.parse(raw) as Array<{ workout: { startDate: string } }>;
    const { weekStart, weekEnd } = getWeekBounds();

    return entries.filter((e) => {
      const d = new Date(e.workout.startDate);
      return d >= weekStart && d <= weekEnd;
    }).length;
  } catch {
    return 0;
  }
}

// ── Goal History ──────────────────────────────────────────────────

export async function saveGoalHistory(entry: GoalHistory): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(GOALS_HISTORY_KEY);
    const history: GoalHistory[] = raw ? JSON.parse(raw) : [];
    // Replace if same week, otherwise prepend
    const idx = history.findIndex((h) => h.weekStart === entry.weekStart);
    if (idx >= 0) {
      history[idx] = entry;
    } else {
      history.unshift(entry);
    }
    // Keep last 12 weeks
    await AsyncStorage.setItem(GOALS_HISTORY_KEY, JSON.stringify(history.slice(0, 12)));
  } catch (e) {
    console.warn("[GoalTracking] Failed to save history:", e);
  }
}

export async function getGoalHistory(): Promise<GoalHistory[]> {
  try {
    const raw = await AsyncStorage.getItem(GOALS_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
