/**
 * Workout Progression Engine
 *
 * Tracks exercise performance history and detects when the user consistently
 * completes all sets at their current weight/reps, then suggests a "Level Up"
 * with incremented weight or reps.
 *
 * Progression rules:
 * - Compound lifts (bench, squat, deadlift, OHP, row): +2.5 kg / 5 lb per level
 * - Isolation lifts (curl, extension, fly, raise): +1.25 kg / 2.5 lb per level
 * - Bodyweight / no weight: +1-2 reps per level
 * - Trigger: user completes all prescribed sets at current level for N consecutive sessions (default 3)
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface ExerciseSession {
  exerciseName: string;
  date: string; // ISO
  prescribedSets: number;
  completedSets: number;
  weight: number; // kg (0 for bodyweight)
  reps: number; // target reps
  allSetsCompleted: boolean;
}

export interface ProgressionSuggestion {
  exerciseName: string;
  currentWeight: number;
  currentReps: number;
  suggestedWeight: number;
  suggestedReps: number;
  consecutiveCompletions: number;
  exerciseType: ExerciseType;
  message: string;
}

export type ExerciseType = "compound" | "isolation" | "bodyweight";

export interface ExerciseHistory {
  sessions: ExerciseSession[];
}

// ── Constants ──────────────────────────────────────────────────────────────────

const STORAGE_KEY = "@workout_progression_history";
const CONSECUTIVE_THRESHOLD = 3; // sessions needed to trigger level-up

// Compound exercise keywords
const COMPOUND_KEYWORDS = [
  "bench press", "squat", "deadlift", "overhead press", "barbell row",
  "pull-up", "chin-up", "dip", "military press", "clean", "snatch",
  "front squat", "romanian deadlift", "hip thrust", "leg press",
  "incline press", "decline press", "bent over row", "pendlay row",
  "t-bar row", "power clean", "push press", "sumo deadlift",
];

// Bodyweight exercise keywords
const BODYWEIGHT_KEYWORDS = [
  "push-up", "pushup", "sit-up", "situp", "crunch", "plank",
  "burpee", "mountain climber", "jumping jack", "lunge walk",
  "bodyweight squat", "body weight", "wall sit", "flutter kick",
  "leg raise", "bicycle crunch", "russian twist", "superman",
  "bird dog", "glute bridge", "calf raise",
];

// ── Classification ─────────────────────────────────────────────────────────────

export function classifyExercise(name: string): ExerciseType {
  const lower = name.toLowerCase();
  if (BODYWEIGHT_KEYWORDS.some((kw) => lower.includes(kw))) return "bodyweight";
  if (COMPOUND_KEYWORDS.some((kw) => lower.includes(kw))) return "compound";
  return "isolation";
}

// ── Progression Calculation ────────────────────────────────────────────────────

export function calculateProgression(
  exerciseName: string,
  currentWeight: number,
  currentReps: number,
  exerciseType?: ExerciseType,
): { suggestedWeight: number; suggestedReps: number } {
  const type = exerciseType ?? classifyExercise(exerciseName);

  if (type === "bodyweight" || currentWeight === 0) {
    // Bodyweight: increase reps by 1-2
    return {
      suggestedWeight: 0,
      suggestedReps: currentReps + (currentReps < 15 ? 2 : 1),
    };
  }

  if (type === "compound") {
    // Compound: +2.5 kg
    return {
      suggestedWeight: currentWeight + 2.5,
      suggestedReps: currentReps,
    };
  }

  // Isolation: +1.25 kg
  return {
    suggestedWeight: currentWeight + 1.25,
    suggestedReps: currentReps,
  };
}

// ── History Management ─────────────────────────────────────────────────────────

export async function loadProgressionHistory(): Promise<Record<string, ExerciseHistory>> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export async function saveProgressionHistory(history: Record<string, ExerciseHistory>): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

export async function recordExerciseSession(session: ExerciseSession): Promise<void> {
  const history = await loadProgressionHistory();
  const key = session.exerciseName.toLowerCase().trim();
  if (!history[key]) {
    history[key] = { sessions: [] };
  }
  history[key].sessions.push(session);
  // Keep last 20 sessions per exercise
  if (history[key].sessions.length > 20) {
    history[key].sessions = history[key].sessions.slice(-20);
  }
  await saveProgressionHistory(history);
}

// ── Progression Detection ──────────────────────────────────────────────────────

export function getConsecutiveCompletions(sessions: ExerciseSession[]): number {
  if (sessions.length === 0) return 0;

  let count = 0;
  // Count from most recent backwards
  for (let i = sessions.length - 1; i >= 0; i--) {
    if (sessions[i].allSetsCompleted) {
      count++;
    } else {
      break;
    }
  }
  return count;
}

export function getLatestPerformance(sessions: ExerciseSession[]): {
  weight: number;
  reps: number;
} | null {
  if (sessions.length === 0) return null;
  const latest = sessions[sessions.length - 1];
  return { weight: latest.weight, reps: latest.reps };
}

export async function checkProgressionForExercises(
  completedExercises: {
    name: string;
    logs: { weight: string; reps: string; completed: boolean }[];
  }[],
): Promise<ProgressionSuggestion[]> {
  const suggestions: ProgressionSuggestion[] = [];
  const history = await loadProgressionHistory();

  for (const ex of completedExercises) {
    const completedSets = ex.logs.filter((l) => l.completed);
    if (completedSets.length === 0) continue;

    // Calculate average weight and reps from completed sets
    let totalWeight = 0;
    let totalReps = 0;
    for (const set of completedSets) {
      totalWeight += parseFloat(set.weight) || 0;
      totalReps += parseInt(set.reps) || 0;
    }
    const avgWeight = completedSets.length > 0 ? totalWeight / completedSets.length : 0;
    const avgReps = completedSets.length > 0 ? Math.round(totalReps / completedSets.length) : 0;

    // Record this session
    const session: ExerciseSession = {
      exerciseName: ex.name,
      date: new Date().toISOString(),
      prescribedSets: ex.logs.length,
      completedSets: completedSets.length,
      weight: Math.round(avgWeight * 100) / 100,
      reps: avgReps,
      allSetsCompleted: completedSets.length >= ex.logs.length,
    };
    await recordExerciseSession(session);

    // Check consecutive completions
    const key = ex.name.toLowerCase().trim();
    const exerciseHistory = history[key]?.sessions ?? [];
    // Include the session we just recorded
    const allSessions = [...exerciseHistory, session];
    const consecutive = getConsecutiveCompletions(allSessions);

    if (consecutive >= CONSECUTIVE_THRESHOLD) {
      const exerciseType = classifyExercise(ex.name);
      const { suggestedWeight, suggestedReps } = calculateProgression(
        ex.name,
        session.weight,
        session.reps,
        exerciseType,
      );

      const message = buildProgressionMessage(
        ex.name,
        exerciseType,
        session.weight,
        session.reps,
        suggestedWeight,
        suggestedReps,
        consecutive,
      );

      suggestions.push({
        exerciseName: ex.name,
        currentWeight: session.weight,
        currentReps: session.reps,
        suggestedWeight,
        suggestedReps,
        consecutiveCompletions: consecutive,
        exerciseType,
        message,
      });
    }
  }

  return suggestions;
}

// ── Message Builder ────────────────────────────────────────────────────────────

export function buildProgressionMessage(
  exerciseName: string,
  exerciseType: ExerciseType,
  currentWeight: number,
  currentReps: number,
  suggestedWeight: number,
  suggestedReps: number,
  consecutive: number,
): string {
  const streak = `${consecutive} sessions in a row`;

  if (exerciseType === "bodyweight" || currentWeight === 0) {
    return `You've crushed ${exerciseName} for ${streak}! Time to level up from ${currentReps} to ${suggestedReps} reps.`;
  }

  const weightDiff = suggestedWeight - currentWeight;
  return `You've completed all sets of ${exerciseName} for ${streak}! Ready to increase from ${currentWeight}kg to ${suggestedWeight}kg (+${weightDiff}kg).`;
}

// ── Summary Stats ──────────────────────────────────────────────────────────────

export async function getProgressionStats(): Promise<{
  totalExercisesTracked: number;
  totalLevelUps: number;
  exercisesNearLevelUp: string[];
}> {
  const history = await loadProgressionHistory();
  let totalLevelUps = 0;
  const nearLevelUp: string[] = [];

  for (const [name, data] of Object.entries(history)) {
    const consecutive = getConsecutiveCompletions(data.sessions);
    if (consecutive >= CONSECUTIVE_THRESHOLD) {
      totalLevelUps++;
    } else if (consecutive >= CONSECUTIVE_THRESHOLD - 1) {
      nearLevelUp.push(name);
    }
  }

  return {
    totalExercisesTracked: Object.keys(history).length,
    totalLevelUps,
    exercisesNearLevelUp: nearLevelUp,
  };
}

// ── Reset ──────────────────────────────────────────────────────────────────────

export async function clearProgressionHistory(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}
