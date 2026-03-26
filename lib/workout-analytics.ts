/**
 * Workout Analytics Service
 *
 * Aggregates workout history data for charts:
 * - Volume over time (total weight × reps per session)
 * - Workout frequency (sessions per week/month)
 * - Strength progression (1RM estimates per exercise over time)
 * - Muscle group distribution
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { getExerciseInfo } from "@/lib/exercise-data";

// ── Types ────────────────────────────────────────────────────────────────────

export type TimePeriod = "1w" | "1m" | "3m" | "6m" | "all";

export interface VolumeDataPoint {
  date: string; // ISO date (YYYY-MM-DD)
  label: string; // Display label (e.g., "Mon 3/15")
  totalVolume: number; // weight × reps summed across all exercises
  exerciseCount: number;
  durationMinutes: number;
}

export interface FrequencyDataPoint {
  weekLabel: string; // e.g., "Mar 10"
  weekStart: string; // ISO date
  sessions: number;
  totalMinutes: number;
}

export interface StrengthDataPoint {
  date: string;
  label: string;
  weight: number;
  reps: number;
  estimated1RM: number;
  volume: number;
}

export interface MuscleDistribution {
  muscle: string;
  sets: number;
  percentage: number;
}

export interface AnalyticsSummary {
  totalWorkouts: number;
  totalVolume: number;
  totalMinutes: number;
  avgSessionVolume: number;
  avgSessionDuration: number;
  currentStreak: number;
  bestStreak: number;
  workoutsThisWeek: number;
  workoutsLastWeek: number;
  weekOverWeekChange: number; // percentage
}

export interface WorkoutLogEntry {
  workout: {
    dayName: string;
    focus: string;
    completedExercisesJson: string;
    durationMinutes: number;
    startDate: string;
    completedAt?: string;
  };
}

export interface CompletedExercise {
  name: string;
  logs: { weight: string; reps: string; completed: boolean }[];
}

// ── Storage Keys ────────────────────────────────────────────────────────────

const WORKOUT_LOG_KEY = "@workout_log_history";
const WORKOUT_SESSIONS_KEY = "@workout_sessions_local";
const PR_STORAGE_KEY = "@personal_records_v1";

// ── Data Loading ────────────────────────────────────────────────────────────

/**
 * Load all workout log entries from AsyncStorage.
 */
export async function loadWorkoutLogs(): Promise<WorkoutLogEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(WORKOUT_LOG_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Load all PR entries from AsyncStorage.
 */
export async function loadAllPRData(): Promise<Record<string, { weight: number; reps: number; sets: number; estimated1RM: number; volume: number; date: string }[]>> {
  try {
    const raw = await AsyncStorage.getItem(PR_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

// ── Volume Analytics ────────────────────────────────────────────────────────

/**
 * Calculate volume data points over time.
 */
export async function getVolumeOverTime(period: TimePeriod): Promise<VolumeDataPoint[]> {
  const logs = await loadWorkoutLogs();
  const cutoff = getCutoffDate(period);

  const filtered = logs.filter((entry) => {
    const d = new Date(entry.workout.startDate);
    return d >= cutoff;
  });

  // Sort by date ascending
  filtered.sort((a, b) => new Date(a.workout.startDate).getTime() - new Date(b.workout.startDate).getTime());

  return filtered.map((entry) => {
    const d = new Date(entry.workout.startDate);
    let totalVolume = 0;
    let exerciseCount = 0;

    try {
      const exercises: CompletedExercise[] = JSON.parse(entry.workout.completedExercisesJson || "[]");
      exerciseCount = exercises.length;
      for (const ex of exercises) {
        for (const log of ex.logs) {
          if (log.completed) {
            const w = parseFloat(log.weight) || 0;
            const r = parseInt(log.reps) || 0;
            totalVolume += w * r;
          }
        }
      }
    } catch {}

    return {
      date: d.toISOString().split("T")[0],
      label: formatShortDate(d),
      totalVolume: Math.round(totalVolume),
      exerciseCount,
      durationMinutes: entry.workout.durationMinutes || 0,
    };
  });
}

// ── Frequency Analytics ─────────────────────────────────────────────────────

/**
 * Calculate workout frequency by week.
 */
export async function getFrequencyByWeek(period: TimePeriod): Promise<FrequencyDataPoint[]> {
  const logs = await loadWorkoutLogs();
  const cutoff = getCutoffDate(period);

  const filtered = logs.filter((entry) => {
    const d = new Date(entry.workout.startDate);
    return d >= cutoff;
  });

  // Group by week
  const weekMap = new Map<string, { sessions: number; totalMinutes: number; weekStart: Date }>();

  for (const entry of filtered) {
    const d = new Date(entry.workout.startDate);
    const weekStart = getWeekStart(d);
    const key = weekStart.toISOString().split("T")[0];

    if (!weekMap.has(key)) {
      weekMap.set(key, { sessions: 0, totalMinutes: 0, weekStart });
    }
    const week = weekMap.get(key)!;
    week.sessions++;
    week.totalMinutes += entry.workout.durationMinutes || 0;
  }

  // Fill in empty weeks
  const result: FrequencyDataPoint[] = [];
  const now = new Date();
  let current = getWeekStart(cutoff);

  while (current <= now) {
    const key = current.toISOString().split("T")[0];
    const data = weekMap.get(key);
    result.push({
      weekLabel: formatShortDate(current),
      weekStart: key,
      sessions: data?.sessions ?? 0,
      totalMinutes: data?.totalMinutes ?? 0,
    });
    current = new Date(current.getTime() + 7 * 24 * 60 * 60 * 1000);
  }

  return result;
}

// ── Strength Progression ────────────────────────────────────────────────────

/**
 * Get strength progression for a specific exercise.
 */
export async function getStrengthProgression(exerciseName: string, period: TimePeriod): Promise<StrengthDataPoint[]> {
  const allPRs = await loadAllPRData();
  const key = exerciseName.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
  const history = allPRs[key] ?? [];
  const cutoff = getCutoffDate(period);

  const filtered = history.filter((entry) => new Date(entry.date) >= cutoff);
  filtered.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return filtered.map((entry) => ({
    date: new Date(entry.date).toISOString().split("T")[0],
    label: formatShortDate(new Date(entry.date)),
    weight: entry.weight,
    reps: entry.reps,
    estimated1RM: entry.estimated1RM,
    volume: entry.volume,
  }));
}

/**
 * Get list of exercises that have PR history (for exercise picker).
 */
export async function getExercisesWithHistory(): Promise<string[]> {
  const allPRs = await loadAllPRData();
  return Object.keys(allPRs).filter((k) => allPRs[k].length > 0);
}

// ── Muscle Distribution ─────────────────────────────────────────────────────

/**
 * Calculate muscle group distribution from workout history.
 */
export async function getMuscleDistribution(period: TimePeriod): Promise<MuscleDistribution[]> {
  const logs = await loadWorkoutLogs();
  const cutoff = getCutoffDate(period);

  const muscleMap = new Map<string, number>();

  for (const entry of logs) {
    const d = new Date(entry.workout.startDate);
    if (d < cutoff) continue;

    try {
      const exercises: CompletedExercise[] = JSON.parse(entry.workout.completedExercisesJson || "[]");
      for (const ex of exercises) {
        const info = getExerciseInfo(ex.name);
        if (!info) continue;
        const completedSets = ex.logs.filter((l) => l.completed).length;
        for (const m of info.primaryMuscles) {
          muscleMap.set(m, (muscleMap.get(m) ?? 0) + completedSets);
        }
        for (const m of info.secondaryMuscles) {
          muscleMap.set(m, (muscleMap.get(m) ?? 0) + Math.round(completedSets * 0.5));
        }
      }
    } catch {}
  }

  const totalSets = Array.from(muscleMap.values()).reduce((a, b) => a + b, 0);
  const result: MuscleDistribution[] = Array.from(muscleMap.entries())
    .map(([muscle, sets]) => ({
      muscle: formatMuscleName(muscle),
      sets,
      percentage: totalSets > 0 ? Math.round((sets / totalSets) * 100) : 0,
    }))
    .sort((a, b) => b.sets - a.sets);

  return result;
}

// ── Summary ─────────────────────────────────────────────────────────────────

/**
 * Get overall analytics summary.
 */
export async function getAnalyticsSummary(): Promise<AnalyticsSummary> {
  const logs = await loadWorkoutLogs();

  const now = new Date();
  const thisWeekStart = getWeekStart(now);
  const lastWeekStart = new Date(thisWeekStart.getTime() - 7 * 24 * 60 * 60 * 1000);

  let totalVolume = 0;
  let totalMinutes = 0;
  let workoutsThisWeek = 0;
  let workoutsLastWeek = 0;

  // Sort by date for streak calculation
  const sortedDates = logs
    .map((e) => new Date(e.workout.startDate).toISOString().split("T")[0])
    .sort();
  const uniqueDates = [...new Set(sortedDates)];

  for (const entry of logs) {
    const d = new Date(entry.workout.startDate);
    totalMinutes += entry.workout.durationMinutes || 0;

    try {
      const exercises: CompletedExercise[] = JSON.parse(entry.workout.completedExercisesJson || "[]");
      for (const ex of exercises) {
        for (const log of ex.logs) {
          if (log.completed) {
            totalVolume += (parseFloat(log.weight) || 0) * (parseInt(log.reps) || 0);
          }
        }
      }
    } catch {}

    if (d >= thisWeekStart) workoutsThisWeek++;
    if (d >= lastWeekStart && d < thisWeekStart) workoutsLastWeek++;
  }

  // Calculate streaks (consecutive days with workouts)
  let currentStreak = 0;
  let bestStreak = 0;
  let tempStreak = 0;

  for (let i = 0; i < uniqueDates.length; i++) {
    if (i === 0) {
      tempStreak = 1;
    } else {
      const prev = new Date(uniqueDates[i - 1]);
      const curr = new Date(uniqueDates[i]);
      const diffDays = Math.round((curr.getTime() - prev.getTime()) / (24 * 60 * 60 * 1000));
      tempStreak = diffDays <= 1 ? tempStreak + 1 : 1;
    }
    bestStreak = Math.max(bestStreak, tempStreak);
  }

  // Check if current streak is still active (last workout was today or yesterday)
  if (uniqueDates.length > 0) {
    const lastDate = new Date(uniqueDates[uniqueDates.length - 1]);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.round((today.getTime() - lastDate.getTime()) / (24 * 60 * 60 * 1000));
    currentStreak = diffDays <= 1 ? tempStreak : 0;
  }

  const weekOverWeekChange = workoutsLastWeek > 0
    ? Math.round(((workoutsThisWeek - workoutsLastWeek) / workoutsLastWeek) * 100)
    : workoutsThisWeek > 0 ? 100 : 0;

  return {
    totalWorkouts: logs.length,
    totalVolume: Math.round(totalVolume),
    totalMinutes,
    avgSessionVolume: logs.length > 0 ? Math.round(totalVolume / logs.length) : 0,
    avgSessionDuration: logs.length > 0 ? Math.round(totalMinutes / logs.length) : 0,
    currentStreak,
    bestStreak,
    workoutsThisWeek,
    workoutsLastWeek,
    weekOverWeekChange,
  };
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function getCutoffDate(period: TimePeriod): Date {
  const now = new Date();
  switch (period) {
    case "1w": return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case "1m": return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case "3m": return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    case "6m": return new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
    case "all": return new Date(0);
  }
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  d.setDate(d.getDate() - day); // Sunday start
  return d;
}

function formatShortDate(date: Date): string {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[date.getMonth()]} ${date.getDate()}`;
}

function formatMuscleName(muscle: string): string {
  return muscle
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export { getCutoffDate, getWeekStart, formatShortDate, formatMuscleName };
