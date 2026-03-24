/**
 * Personal Records (PR) Tracking System
 *
 * Tracks weight, reps, and sets per exercise with timestamps.
 * Persists to AsyncStorage for offline-first operation.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

const PR_STORAGE_KEY = "@personal_records_v1";

// ── Types ────────────────────────────────────────────────────────────────────

export interface PREntry {
  /** Exercise name (normalised lowercase) */
  exercise: string;
  /** Weight used (kg or lbs) */
  weight: number;
  /** Reps completed */
  reps: number;
  /** Sets completed */
  sets: number;
  /** Estimated 1RM using Epley formula */
  estimated1RM: number;
  /** Volume = weight × reps × sets */
  volume: number;
  /** ISO timestamp */
  date: string;
}

export interface ExercisePR {
  /** Best weight ever lifted for this exercise */
  bestWeight: PREntry;
  /** Best volume (weight × reps × sets) */
  bestVolume: PREntry;
  /** Best estimated 1RM */
  best1RM: PREntry;
  /** Most reps in a single set */
  bestReps: PREntry;
  /** Full history sorted by date desc */
  history: PREntry[];
}

export interface PRSummary {
  totalExercisesTracked: number;
  totalPREntries: number;
  recentPRs: { exercise: string; entry: PREntry; type: string }[];
  topLifts: { exercise: string; weight: number; date: string }[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function normalise(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
}

/** Epley formula: 1RM = weight × (1 + reps / 30) */
function calculate1RM(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0;
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
}

// ── Storage ──────────────────────────────────────────────────────────────────

async function loadAllPRs(): Promise<Record<string, PREntry[]>> {
  try {
    const raw = await AsyncStorage.getItem(PR_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

async function saveAllPRs(data: Record<string, PREntry[]>): Promise<void> {
  try {
    await AsyncStorage.setItem(PR_STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Log a new PR entry for an exercise.
 */
export async function logPR(
  exerciseName: string,
  weight: number,
  reps: number,
  sets: number = 1,
): Promise<PREntry> {
  const key = normalise(exerciseName);
  const estimated1RM = calculate1RM(weight, reps);
  const volume = weight * reps * sets;

  const entry: PREntry = {
    exercise: key,
    weight,
    reps,
    sets,
    estimated1RM,
    volume,
    date: new Date().toISOString(),
  };

  const all = await loadAllPRs();
  if (!all[key]) all[key] = [];
  all[key].unshift(entry);

  // Keep max 200 entries per exercise
  if (all[key].length > 200) all[key] = all[key].slice(0, 200);

  await saveAllPRs(all);
  return entry;
}

/**
 * Get PR data for a specific exercise.
 */
export async function getExercisePR(exerciseName: string): Promise<ExercisePR | null> {
  const key = normalise(exerciseName);
  const all = await loadAllPRs();
  const history = all[key];

  if (!history || history.length === 0) return null;

  const bestWeight = history.reduce((best, e) => e.weight > best.weight ? e : best, history[0]);
  const bestVolume = history.reduce((best, e) => e.volume > best.volume ? e : best, history[0]);
  const best1RM = history.reduce((best, e) => e.estimated1RM > best.estimated1RM ? e : best, history[0]);
  const bestReps = history.reduce((best, e) => e.reps > best.reps ? e : best, history[0]);

  return { bestWeight, bestVolume, best1RM, bestReps, history };
}

/**
 * Get PR history for a specific exercise (for charts).
 */
export async function getPRHistory(exerciseName: string, limit: number = 30): Promise<PREntry[]> {
  const key = normalise(exerciseName);
  const all = await loadAllPRs();
  const history = all[key] ?? [];
  return history.slice(0, limit);
}

/**
 * Get a summary of all PRs across exercises.
 */
export async function getPRSummary(): Promise<PRSummary> {
  const all = await loadAllPRs();
  const exercises = Object.keys(all);
  let totalEntries = 0;
  const recentPRs: PRSummary["recentPRs"] = [];
  const topLifts: PRSummary["topLifts"] = [];

  for (const key of exercises) {
    const history = all[key];
    if (!history || history.length === 0) continue;
    totalEntries += history.length;

    // Find best weight for this exercise
    const best = history.reduce((b, e) => e.weight > b.weight ? e : b, history[0]);
    topLifts.push({ exercise: key, weight: best.weight, date: best.date });

    // Check if latest entry is a new PR
    if (history.length >= 2) {
      const latest = history[0];
      const previousBest1RM = history.slice(1).reduce((b, e) => Math.max(b, e.estimated1RM), 0);
      if (latest.estimated1RM > previousBest1RM) {
        recentPRs.push({ exercise: key, entry: latest, type: "1RM" });
      }
      const previousBestWeight = history.slice(1).reduce((b, e) => Math.max(b, e.weight), 0);
      if (latest.weight > previousBestWeight && !recentPRs.find(r => r.exercise === key)) {
        recentPRs.push({ exercise: key, entry: latest, type: "Weight" });
      }
    }
  }

  // Sort top lifts by weight desc
  topLifts.sort((a, b) => b.weight - a.weight);

  // Sort recent PRs by date desc
  recentPRs.sort((a, b) => new Date(b.entry.date).getTime() - new Date(a.entry.date).getTime());

  return {
    totalExercisesTracked: exercises.length,
    totalPREntries: totalEntries,
    recentPRs: recentPRs.slice(0, 5),
    topLifts: topLifts.slice(0, 10),
  };
}

/**
 * Get progress data for chart rendering.
 * Returns entries grouped by date for a specific metric.
 */
export async function getProgressChartData(
  exerciseName: string,
  metric: "weight" | "volume" | "estimated1RM" | "reps" = "weight",
  days: number = 90,
): Promise<{ date: string; value: number }[]> {
  const history = await getPRHistory(exerciseName, 200);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  const filtered = history
    .filter(e => new Date(e.date) >= cutoff)
    .reverse(); // oldest first for charts

  return filtered.map(e => ({
    date: e.date,
    value: e[metric],
  }));
}

/**
 * Auto-log PRs from a completed workout session.
 * Called when a workout is finished.
 */
export async function logWorkoutPRs(
  completedExercises: { name: string; logs: { weight: string; reps: string; completed: boolean }[] }[],
): Promise<{ exercise: string; isNewPR: boolean; entry: PREntry }[]> {
  const results: { exercise: string; isNewPR: boolean; entry: PREntry }[] = [];

  for (const ex of completedExercises) {
    const completedSets = ex.logs.filter(l => l.completed);
    if (completedSets.length === 0) continue;

    // Find the best set (highest weight × reps)
    let bestSet = completedSets[0];
    let bestScore = 0;
    for (const set of completedSets) {
      const w = parseFloat(set.weight) || 0;
      const r = parseInt(set.reps) || 0;
      const score = w * r;
      if (score > bestScore) {
        bestScore = score;
        bestSet = set;
      }
    }

    const weight = parseFloat(bestSet.weight) || 0;
    const reps = parseInt(bestSet.reps) || 0;
    if (weight <= 0 && reps <= 0) continue;

    // Check if this is a new PR before logging
    const existingPR = await getExercisePR(ex.name);
    const entry = await logPR(ex.name, weight, reps, completedSets.length);

    const isNewPR = !existingPR ||
      entry.estimated1RM > existingPR.best1RM.estimated1RM ||
      entry.weight > existingPR.bestWeight.weight;

    results.push({ exercise: ex.name, isNewPR, entry });
  }

  return results;
}

/**
 * Clear all PR data (for testing/reset).
 */
export async function clearAllPRs(): Promise<void> {
  await AsyncStorage.removeItem(PR_STORAGE_KEY);
}
