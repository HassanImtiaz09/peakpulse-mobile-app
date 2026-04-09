/**
 * Quick-Pick Exercise Logic
 * Selects a single exercise based on muscle recovery state, recent workout history,
 * and current energy level. Used by the "Just One Exercise" quick start feature.
 */
import type { ExerciseInfo } from "@/lib/exercise-data";

// ── Types ────────────────────────────────────────────────────────────────

export interface WorkoutHistoryEntry {
  exerciseName: string;
  muscleGroups: string[];
  date: string; // ISO date string
}

export interface QuickPickExercise {
  name: string;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  equipment: string;
  difficulty: string;
  suggestedSets: number;
  suggestedReps: number;
  reason: string;
  cue: string;
}

export interface QuickPickOptions {
  energyLevel: "low" | "normal" | "high";
  excludeExercises?: string[];
}

interface SessionConfig {
  sets: number;
  reps: number;
  preferDifficulty: string[];
}

// ── Config ───────────────────────────────────────────────────────────────

export const QUICK_SESSION_CONFIG: Record<string, SessionConfig> = {
  low: { sets: 2, reps: 12, preferDifficulty: ["beginner", "intermediate"] },
  normal: { sets: 3, reps: 10, preferDifficulty: ["beginner", "intermediate", "advanced"] },
  high: { sets: 4, reps: 8, preferDifficulty: ["intermediate", "advanced"] },
};

// ── Motivational Messages ────────────────────────────────────────────────

const MOTIVATIONAL_LOW = [
  "Showing up is the hardest part. You're already winning.",
  "One exercise is infinitely more than zero. Let's go.",
  "Even a single set keeps the habit alive. You've got this.",
  "Low energy days still count. Every rep matters.",
  "The best workout is the one you actually do.",
];

const MOTIVATIONAL_NORMAL = [
  "Quick and focused. Let's make this one count.",
  "One great exercise can change your whole day.",
  "Quality over quantity. Let's nail this one.",
  "You showed up. Now let's make it worth it.",
  "Focus on form, feel the muscle, own it.",
];

const MOTIVATIONAL_HIGH = [
  "You're fired up! Let's channel that energy.",
  "High energy day — let's push the limits on this one.",
  "Bring the intensity. One exercise, maximum effort.",
  "Let's make this the best set of the week.",
  "Full power mode. Let's crush it.",
];

export function getMotivationalMessage(energyLevel: string): string {
  const pool =
    energyLevel === "low" ? MOTIVATIONAL_LOW :
    energyLevel === "high" ? MOTIVATIONAL_HIGH :
    MOTIVATIONAL_NORMAL;
  return pool[Math.floor(Math.random() * pool.length)];
}

// ── Muscle Recovery ──────────────────────────────────────────────────────

/**
 * Returns a recovery score 0-1 for a muscle group.
 * 1.0 = fully recovered (not worked recently)
 * 0.0 = just worked today
 */
export function getMuscleRecoveryScore(
  muscle: string,
  history: WorkoutHistoryEntry[]
): number {
  const now = Date.now();
  let mostRecentMs = Infinity;

  for (const entry of history) {
    if (entry.muscleGroups.includes(muscle)) {
      const entryTime = new Date(entry.date).getTime();
      const ageMs = now - entryTime;
      if (ageMs < mostRecentMs) {
        mostRecentMs = ageMs;
      }
    }
  }

  if (mostRecentMs === Infinity) return 1.0; // Never worked

  const ageDays = mostRecentMs / (24 * 60 * 60 * 1000);

  // Full recovery after 3 days, partial before
  if (ageDays >= 3) return 1.0;
  if (ageDays >= 2) return 0.8;
  if (ageDays >= 1) return 0.5;
  return 0.2; // Worked today
}

// ── Exercise Selection ───────────────────────────────────────────────────

/**
 * Parse raw workout log entries into WorkoutHistoryEntry format.
 */
export function parseWorkoutHistory(logs: any[]): WorkoutHistoryEntry[] {
  if (!Array.isArray(logs)) return [];

  const entries: WorkoutHistoryEntry[] = [];

  for (const log of logs) {
    if (!log) continue;
    const date = log.date || log.completedAt || new Date().toISOString();
    const exercises = log.exercises || [];

    for (const ex of exercises) {
      if (!ex) continue;
      const name = ex.name || ex.exerciseName || "";
      if (!name) continue;

      // Try to extract muscle groups from exercise data
      const muscles: string[] = ex.primaryMuscles || ex.muscleGroups || [];
      entries.push({
        exerciseName: name,
        muscleGroups: muscles,
        date,
      });
    }
  }

  return entries;
}

/**
 * Select the best single exercise based on recovery state and preferences.
 */
export function selectQuickExercise(
  exercises: ExerciseInfo[],
  history: WorkoutHistoryEntry[],
  options: QuickPickOptions
): QuickPickExercise | null {
  if (!exercises || exercises.length === 0) return null;

  const config = QUICK_SESSION_CONFIG[options.energyLevel] || QUICK_SESSION_CONFIG.normal;
  const excludeSet = new Set((options.excludeExercises || []).map((n) => n.toLowerCase()));

  // Filter out excluded exercises
  let candidates = exercises.filter((e) => !excludeSet.has(e.name.toLowerCase()));

  if (candidates.length === 0) return null;

  // Score each exercise
  const scored = candidates.map((exercise) => {
    let score = 0;

    // 1. Muscle recovery score (0-40 points) — prefer recovered muscles
    const primaryRecovery = exercise.primaryMuscles.reduce((sum, m) => {
      return sum + getMuscleRecoveryScore(m, history);
    }, 0) / Math.max(exercise.primaryMuscles.length, 1);
    score += primaryRecovery * 40;

    // 2. Difficulty match (0-20 points)
    if (config.preferDifficulty.includes(exercise.difficulty)) {
      score += 20;
    }
    // Extra bonus for beginner on low energy
    if (options.energyLevel === "low" && exercise.difficulty === "beginner") {
      score += 10;
    }

    // 3. Compound movement bonus (0-10 points) — more bang for buck
    if (exercise.secondaryMuscles.length >= 2) {
      score += 10;
    } else if (exercise.secondaryMuscles.length >= 1) {
      score += 5;
    }

    // 4. Randomness factor (0-15 points) — keep it fresh
    score += Math.random() * 15;

    return { exercise, score };
  });

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  const best = scored[0].exercise;

  // Generate reason
  const primaryRecovery = best.primaryMuscles.reduce((sum, m) => {
    return sum + getMuscleRecoveryScore(m, history);
  }, 0) / Math.max(best.primaryMuscles.length, 1);

  let reason: string;
  if (primaryRecovery >= 0.9) {
    reason = `Your ${best.primaryMuscles[0]?.replace(/_/g, " ") || "target muscles"} are fully recovered and ready to work.`;
  } else if (primaryRecovery >= 0.6) {
    reason = `Good recovery on ${best.primaryMuscles[0]?.replace(/_/g, " ") || "target muscles"} — a solid pick for today.`;
  } else {
    reason = `A balanced choice that works well with your recent training.`;
  }

  if (best.secondaryMuscles.length > 0) {
    reason += ` Also hits ${best.secondaryMuscles.slice(0, 2).map((m) => m.replace(/_/g, " ")).join(" and ")}.`;
  }

  return {
    name: best.name,
    primaryMuscles: best.primaryMuscles,
    secondaryMuscles: best.secondaryMuscles,
    equipment: best.equipment,
    difficulty: best.difficulty,
    suggestedSets: config.sets,
    suggestedReps: config.reps,
    reason,
    cue: best.cue || "",
  };
}
