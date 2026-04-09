/**
 * Weekly Progress Report — Data Aggregation
 *
 * Collects data from all app sources to build a comprehensive weekly summary:
 *   - Workout volume, frequency, and duration (from workout-analytics)
 *   - Calorie and macro intake (from calorie-context / getHistoricalMeals)
 *   - Body measurements / weight (from daily check-ins)
 *   - Body scan changes (from body_scan_history)
 *   - Streak and XP stats (from streak-tracking and xp-engine)
 */

// ── Types ────────────────────────────────────────────────────────────────────

export interface WeeklyWorkoutStats {
  workoutsCompleted: number;
  totalVolumeKg: number;
  totalMinutes: number;
  avgSessionMinutes: number;
  muscleGroupsHit: string[];
  /** vs previous week */
  volumeChange: number | null; // percentage
  frequencyChange: number | null; // absolute
}

export interface WeeklyNutritionStats {
  daysLogged: number;
  avgCalories: number;
  avgProtein: number;
  avgCarbs: number;
  avgFat: number;
  totalCalories: number;
  calorieGoal: number | null;
  /** percentage of goal met on average */
  adherencePercent: number | null;
  /** vs previous week */
  calorieChange: number | null; // percentage
}

export interface WeeklyBodyStats {
  currentWeightKg: number | null;
  previousWeightKg: number | null;
  weightChangeKg: number | null;
  latestBodyFat: number | null;
  previousBodyFat: number | null;
  bodyFatChange: number | null;
}

export interface WeeklyStreakStats {
  currentStreak: number;
  longestStreak: number;
  xpEarnedThisWeek: number;
  currentLevel: number;
  levelTitle: string;
  dailyStreak: number;
}

export interface WeeklyProgressReport {
  weekStart: string; // YYYY-MM-DD
  weekEnd: string;   // YYYY-MM-DD
  workout: WeeklyWorkoutStats;
  nutrition: WeeklyNutritionStats;
  body: WeeklyBodyStats;
  streak: WeeklyStreakStats;
  highlights: string[];
  generatedAt: string;
}

// ── Pure Helpers (testable without AsyncStorage) ─────────────────────────────

/**
 * Get the Monday of the current week (ISO week).
 * Uses UTC methods to avoid timezone offset issues.
 */
export function getWeekStart(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getUTCDay(); // 0=Sun, 1=Mon...
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().split("T")[0];
}

/**
 * Get the Sunday of the current week.
 * Uses UTC methods to avoid timezone offset issues.
 */
export function getWeekEnd(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = day === 0 ? 0 : 7 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().split("T")[0];
}

/**
 * Check if a date string falls within a given week (Monday–Sunday).
 */
export function isInWeek(dateStr: string, weekStart: string): boolean {
  const d = new Date(dateStr);
  const ws = new Date(weekStart);
  const we = new Date(ws);
  we.setDate(we.getDate() + 6);
  we.setHours(23, 59, 59, 999);
  return d >= ws && d <= we;
}

/**
 * Get the previous week's Monday.
 */
export function getPreviousWeekStart(weekStart: string): string {
  const d = new Date(weekStart);
  d.setDate(d.getDate() - 7);
  return d.toISOString().split("T")[0];
}

/**
 * Calculate percentage change between two values.
 */
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 100);
}

// ── Workout Stats Aggregation ────────────────────────────────────────────────

export interface WorkoutLogForReport {
  startDate: string;
  durationMinutes: number;
  completedExercisesJson: string;
  focus?: string;
}

export function aggregateWorkoutStats(
  logs: WorkoutLogForReport[],
  weekStart: string,
): { current: WeeklyWorkoutStats; previousVolume: number; previousCount: number } {
  const prevWeekStart = getPreviousWeekStart(weekStart);

  const thisWeekLogs = logs.filter((l) => isInWeek(l.startDate, weekStart));
  const prevWeekLogs = logs.filter((l) => isInWeek(l.startDate, prevWeekStart));

  function calcVolume(entries: WorkoutLogForReport[]): { volume: number; minutes: number; muscles: Set<string> } {
    let volume = 0;
    let minutes = 0;
    const muscles = new Set<string>();
    for (const entry of entries) {
      minutes += entry.durationMinutes || 0;
      if (entry.focus) muscles.add(entry.focus);
      try {
        const exercises = JSON.parse(entry.completedExercisesJson || "[]");
        for (const ex of exercises) {
          if (ex.muscleGroup) muscles.add(ex.muscleGroup);
          for (const log of ex.logs || []) {
            if (log.completed) {
              const w = parseFloat(log.weight) || 0;
              const r = parseInt(log.reps) || 0;
              volume += w * r;
            }
          }
        }
      } catch {}
    }
    return { volume: Math.round(volume), minutes, muscles };
  }

  const current = calcVolume(thisWeekLogs);
  const previous = calcVolume(prevWeekLogs);

  return {
    current: {
      workoutsCompleted: thisWeekLogs.length,
      totalVolumeKg: current.volume,
      totalMinutes: current.minutes,
      avgSessionMinutes: thisWeekLogs.length > 0 ? Math.round(current.minutes / thisWeekLogs.length) : 0,
      muscleGroupsHit: Array.from(current.muscles),
      volumeChange: percentChange(current.volume, previous.volume),
      frequencyChange: thisWeekLogs.length - prevWeekLogs.length,
    },
    previousVolume: previous.volume,
    previousCount: prevWeekLogs.length,
  };
}

// ── Nutrition Stats Aggregation ──────────────────────────────────────────────

export interface MealForReport {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export function aggregateNutritionStats(
  /** Map of date (YYYY-MM-DD) → meals */
  mealsByDate: Record<string, MealForReport[]>,
  weekStart: string,
  calorieGoal: number | null,
): { current: WeeklyNutritionStats; previousAvgCalories: number } {
  const prevWeekStart = getPreviousWeekStart(weekStart);

  function calcWeek(ws: string): { days: number; totalCal: number; totalP: number; totalC: number; totalF: number } {
    let days = 0;
    let totalCal = 0;
    let totalP = 0;
    let totalC = 0;
    let totalF = 0;
    for (const [date, meals] of Object.entries(mealsByDate)) {
      if (isInWeek(date, ws) && meals.length > 0) {
        days++;
        for (const m of meals) {
          totalCal += m.calories;
          totalP += m.protein;
          totalC += m.carbs;
          totalF += m.fat;
        }
      }
    }
    return { days, totalCal, totalP, totalC, totalF };
  }

  const curr = calcWeek(weekStart);
  const prev = calcWeek(prevWeekStart);

  const avgCal = curr.days > 0 ? Math.round(curr.totalCal / curr.days) : 0;
  const prevAvgCal = prev.days > 0 ? Math.round(prev.totalCal / prev.days) : 0;

  return {
    current: {
      daysLogged: curr.days,
      avgCalories: avgCal,
      avgProtein: curr.days > 0 ? Math.round(curr.totalP / curr.days) : 0,
      avgCarbs: curr.days > 0 ? Math.round(curr.totalC / curr.days) : 0,
      avgFat: curr.days > 0 ? Math.round(curr.totalF / curr.days) : 0,
      totalCalories: Math.round(curr.totalCal),
      calorieGoal,
      adherencePercent: calorieGoal && avgCal > 0 ? Math.round((avgCal / calorieGoal) * 100) : null,
      calorieChange: percentChange(avgCal, prevAvgCal),
    },
    previousAvgCalories: prevAvgCal,
  };
}

// ── Body Stats Aggregation ───────────────────────────────────────────────────

export interface CheckInForReport {
  date: string;
  weightKg?: number;
}

export interface BodyScanForReport {
  date: string;
  estimatedBodyFat?: number;
}

export function aggregateBodyStats(
  checkIns: CheckInForReport[],
  bodyScans: BodyScanForReport[],
  weekStart: string,
): WeeklyBodyStats {
  const prevWeekStart = getPreviousWeekStart(weekStart);

  // Find latest weight in this week and previous week
  const thisWeekCheckins = checkIns
    .filter((c) => c.weightKg && isInWeek(c.date, weekStart))
    .sort((a, b) => b.date.localeCompare(a.date));
  const prevWeekCheckins = checkIns
    .filter((c) => c.weightKg && isInWeek(c.date, prevWeekStart))
    .sort((a, b) => b.date.localeCompare(a.date));

  const currentWeight = thisWeekCheckins[0]?.weightKg ?? null;
  const previousWeight = prevWeekCheckins[0]?.weightKg ?? null;

  // Find latest body fat in this week and previous week
  const thisWeekScans = bodyScans
    .filter((s) => s.estimatedBodyFat && isInWeek(s.date, weekStart))
    .sort((a, b) => b.date.localeCompare(a.date));
  const prevWeekScans = bodyScans
    .filter((s) => s.estimatedBodyFat && isInWeek(s.date, prevWeekStart))
    .sort((a, b) => b.date.localeCompare(a.date));

  const latestBF = thisWeekScans[0]?.estimatedBodyFat ?? null;
  const previousBF = prevWeekScans[0]?.estimatedBodyFat ?? null;

  return {
    currentWeightKg: currentWeight,
    previousWeightKg: previousWeight,
    weightChangeKg: currentWeight !== null && previousWeight !== null
      ? Math.round((currentWeight - previousWeight) * 10) / 10
      : null,
    latestBodyFat: latestBF,
    previousBodyFat: previousBF,
    bodyFatChange: latestBF !== null && previousBF !== null
      ? Math.round((latestBF - previousBF) * 10) / 10
      : null,
  };
}

// ── Streak & XP Stats ────────────────────────────────────────────────────────

export interface XPHistoryForReport {
  xp: number;
  timestamp: string;
}

export function aggregateStreakStats(
  streakData: { currentStreak: number; longestStreak: number },
  xpData: { totalXP: number; level: number; dailyStreak: number },
  xpHistory: XPHistoryForReport[],
  weekStart: string,
  getLevelTitleFn: (level: number) => string,
): WeeklyStreakStats {
  const weekXP = xpHistory
    .filter((e) => isInWeek(e.timestamp, weekStart))
    .reduce((sum, e) => sum + e.xp, 0);

  return {
    currentStreak: streakData.currentStreak,
    longestStreak: streakData.longestStreak,
    xpEarnedThisWeek: weekXP,
    currentLevel: xpData.level,
    levelTitle: getLevelTitleFn(xpData.level),
    dailyStreak: xpData.dailyStreak,
  };
}

// ── Highlights Generator ─────────────────────────────────────────────────────

export function generateHighlights(report: Omit<WeeklyProgressReport, "highlights" | "generatedAt">): string[] {
  const highlights: string[] = [];
  const { workout, nutrition, body, streak } = report;

  // Workout highlights
  if (workout.workoutsCompleted > 0) {
    highlights.push(`Completed ${workout.workoutsCompleted} workout${workout.workoutsCompleted > 1 ? "s" : ""} this week`);
  }
  if (workout.volumeChange !== null && workout.volumeChange > 0) {
    highlights.push(`Volume up ${workout.volumeChange}% from last week`);
  }
  if (workout.totalVolumeKg > 0) {
    const tons = workout.totalVolumeKg >= 1000
      ? `${(workout.totalVolumeKg / 1000).toFixed(1)}t`
      : `${workout.totalVolumeKg}kg`;
    highlights.push(`Lifted a total of ${tons}`);
  }

  // Nutrition highlights
  if (nutrition.daysLogged >= 5) {
    highlights.push(`Logged meals ${nutrition.daysLogged} out of 7 days`);
  }
  if (nutrition.adherencePercent !== null && nutrition.adherencePercent >= 90 && nutrition.adherencePercent <= 110) {
    highlights.push(`Hit calorie target within 10% on average`);
  }
  if (nutrition.avgProtein > 0) {
    highlights.push(`Averaged ${nutrition.avgProtein}g protein per day`);
  }

  // Body highlights
  if (body.weightChangeKg !== null && body.weightChangeKg !== 0) {
    const dir = body.weightChangeKg < 0 ? "down" : "up";
    highlights.push(`Weight ${dir} ${Math.abs(body.weightChangeKg)}kg from last week`);
  }
  if (body.bodyFatChange !== null && body.bodyFatChange < 0) {
    highlights.push(`Body fat decreased by ${Math.abs(body.bodyFatChange)}%`);
  }

  // Streak highlights
  if (streak.xpEarnedThisWeek > 0) {
    highlights.push(`Earned ${streak.xpEarnedThisWeek} XP this week`);
  }
  if (streak.dailyStreak >= 7) {
    highlights.push(`${streak.dailyStreak}-day activity streak`);
  }

  // Fallback
  if (highlights.length === 0) {
    highlights.push("Start logging workouts and meals to see your weekly highlights!");
  }

  return highlights.slice(0, 6); // max 6 highlights
}

// ── Full Report Builder (uses AsyncStorage) ──────────────────────────────────

import AsyncStorage from "@react-native-async-storage/async-storage";
import { loadWorkoutLogs } from "./workout-analytics";
import { getHistoricalMeals } from "./calorie-context";
import { getStreakData } from "./streak-tracking";
import { loadXPData, loadXPHistory, getLevelTitle } from "./xp-engine";

export async function buildWeeklyReport(date: Date = new Date()): Promise<WeeklyProgressReport> {
  const weekStart = getWeekStart(date);
  const weekEnd = getWeekEnd(date);

  // 1. Workout data
  const workoutLogs = await loadWorkoutLogs();
  const workoutEntries = workoutLogs.map((l) => ({
    startDate: l.workout.startDate,
    durationMinutes: l.workout.durationMinutes,
    completedExercisesJson: l.workout.completedExercisesJson,
    focus: l.workout.focus,
  }));
  const { current: workoutStats } = aggregateWorkoutStats(workoutEntries, weekStart);

  // 2. Nutrition data (14 days to cover this + previous week)
  const mealHistory = await getHistoricalMeals(14);
  const calorieGoalRaw = await AsyncStorage.getItem("@calorie_goal");
  const calorieGoal = calorieGoalRaw ? parseInt(calorieGoalRaw) || null : null;
  const { current: nutritionStats } = aggregateNutritionStats(mealHistory, weekStart, calorieGoal);

  // 3. Body data
  const checkInsRaw = await AsyncStorage.getItem("peakpulse_checkins");
  const checkIns: CheckInForReport[] = checkInsRaw ? JSON.parse(checkInsRaw) : [];
  const bodyScansRaw = await AsyncStorage.getItem("@body_scan_history");
  const bodyScans: BodyScanForReport[] = bodyScansRaw ? JSON.parse(bodyScansRaw) : [];
  const bodyStats = aggregateBodyStats(checkIns, bodyScans, weekStart);

  // 4. Streak & XP data
  const streakData = await getStreakData();
  const xpData = await loadXPData();
  const xpHistory = await loadXPHistory(200);
  const streakStats = aggregateStreakStats(streakData, xpData, xpHistory, weekStart, getLevelTitle);

  // Build partial report for highlights
  const partial = { weekStart, weekEnd, workout: workoutStats, nutrition: nutritionStats, body: bodyStats, streak: streakStats };
  const highlights = generateHighlights(partial);

  return {
    ...partial,
    highlights,
    generatedAt: new Date().toISOString(),
  };
}
