/**
 * Muscle Balance Analysis Engine
 *
 * Tracks workout history per muscle group, calculates frequency/volume,
 * and classifies each muscle group as over-exercised, optimal, or under-exercised.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { MuscleGroup } from "@/components/body-diagram";
import { getExerciseInfo, getAllExercises } from "@/lib/exercise-data";

// ── Types ────────────────────────────────────────────────────────────────────

export type MuscleStatus = "over" | "optimal" | "under" | "none";

export interface MuscleBalanceEntry {
  muscle: MuscleGroup;
  /** Number of times this muscle was trained (primary) in the time window */
  primaryHits: number;
  /** Number of times this muscle was trained (secondary) in the time window */
  secondaryHits: number;
  /** Weighted score: primaryHits * 1.0 + secondaryHits * 0.5 */
  score: number;
  /** Recommended weekly sessions for this muscle group */
  recommended: number;
  /** Status classification */
  status: MuscleStatus;
  /** Percentage relative to recommended (100% = optimal) */
  percentage: number;
}

export interface MuscleBalanceReport {
  entries: MuscleBalanceEntry[];
  /** Time window in days */
  windowDays: number;
  /** Total workouts in the window */
  totalWorkouts: number;
  /** Timestamp of analysis */
  analyzedAt: string;
  /** Over-exercised muscle groups */
  overExercised: MuscleGroup[];
  /** Optimally exercised muscle groups */
  optimal: MuscleGroup[];
  /** Under-exercised muscle groups */
  underExercised: MuscleGroup[];
}

export interface WorkoutSession {
  dayName: string;
  focus: string;
  completedExercisesJson: string;
  durationMinutes: number;
  completedAt: string;
}

export interface ExerciseSuggestion {
  exerciseName: string;
  reason: string;
  targetMuscles: MuscleGroup[];
  priority: "high" | "medium" | "low";
}

export interface PlanChange {
  type: "add" | "replace" | "remove" | "rest";
  dayName: string;
  exerciseName?: string;
  replacementName?: string;
  reason: string;
  targetMuscles: MuscleGroup[];
}

// ── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY = "@muscle_balance_history";
const WORKOUT_SESSIONS_KEY = "@workout_sessions_local";
const WORKOUT_LOG_KEY = "@workout_log_history";

/** Recommended weekly training frequency per muscle group (sessions per week) */
const RECOMMENDED_WEEKLY: Record<MuscleGroup, number> = {
  chest: 2,
  back: 2,
  shoulders: 2,
  biceps: 2,
  triceps: 2,
  forearms: 1.5,
  abs: 3,
  obliques: 2,
  quads: 2,
  hamstrings: 2,
  glutes: 2,
  calves: 2,
  traps: 1.5,
  lats: 2,
  lower_back: 1.5,
  hip_flexors: 1,
  full_body: 2,
};

/** Thresholds for classification (relative to recommended) */
const OVER_THRESHOLD = 1.4; // >140% of recommended = over-exercised
const UNDER_THRESHOLD = 0.5; // <50% of recommended = under-exercised

const TRACKABLE_MUSCLES: MuscleGroup[] = [
  "chest", "back", "shoulders", "biceps", "triceps", "forearms",
  "abs", "obliques", "quads", "hamstrings", "glutes", "calves",
  "traps", "lats", "lower_back",
];

// ── Core Analysis ────────────────────────────────────────────────────────────

/**
 * Get all workout sessions from local storage (both guest and logged).
 */
export async function getWorkoutSessions(): Promise<WorkoutSession[]> {
  try {
    const [localRaw, logRaw] = await Promise.all([
      AsyncStorage.getItem(WORKOUT_SESSIONS_KEY),
      AsyncStorage.getItem(WORKOUT_LOG_KEY),
    ]);

    const sessions: WorkoutSession[] = [];

    if (localRaw) {
      try {
        const local = JSON.parse(localRaw);
        if (Array.isArray(local)) sessions.push(...local);
      } catch {}
    }

    if (logRaw) {
      try {
        const logs = JSON.parse(logRaw);
        if (Array.isArray(logs)) {
          for (const entry of logs) {
            if (entry.workout) {
              sessions.push({
                dayName: entry.workout.dayName ?? "",
                focus: entry.workout.focus ?? "",
                completedExercisesJson: entry.workout.completedExercisesJson ?? "[]",
                durationMinutes: entry.workout.durationMinutes ?? 0,
                completedAt: entry.workout.startDate ?? entry.workout.completedAt ?? "",
              });
            }
          }
        }
      } catch {}
    }

    return sessions;
  } catch {
    return [];
  }
}

/**
 * Extract muscle groups hit by a list of exercise names.
 */
export function getMusclesFromExercises(exerciseNames: string[]): {
  primary: Map<MuscleGroup, number>;
  secondary: Map<MuscleGroup, number>;
} {
  const primary = new Map<MuscleGroup, number>();
  const secondary = new Map<MuscleGroup, number>();

  for (const name of exerciseNames) {
    const info = getExerciseInfo(name);
    if (!info) continue;

    for (const m of info.primaryMuscles) {
      const mg = m as MuscleGroup;
      primary.set(mg, (primary.get(mg) ?? 0) + 1);
    }
    for (const m of info.secondaryMuscles) {
      const mg = m as MuscleGroup;
      secondary.set(mg, (secondary.get(mg) ?? 0) + 1);
    }
  }

  return { primary, secondary };
}

/**
 * Analyze muscle balance over a given time window.
 */
export async function analyzeMuscleBalance(
  windowDays: number = 7
): Promise<MuscleBalanceReport> {
  const sessions = await getWorkoutSessions();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - windowDays);

  // Filter sessions within the time window
  const recentSessions = sessions.filter((s) => {
    if (!s.completedAt) return false;
    return new Date(s.completedAt) >= cutoff;
  });

  // Aggregate muscle hits
  const primaryHits = new Map<MuscleGroup, number>();
  const secondaryHits = new Map<MuscleGroup, number>();

  for (const session of recentSessions) {
    let exercises: string[] = [];
    try {
      exercises = JSON.parse(session.completedExercisesJson);
    } catch {
      // Try to extract from focus field
      if (session.focus) {
        exercises = [session.focus];
      }
    }

    const { primary, secondary } = getMusclesFromExercises(exercises);
    for (const [m, count] of primary) {
      primaryHits.set(m, (primaryHits.get(m) ?? 0) + count);
    }
    for (const [m, count] of secondary) {
      secondaryHits.set(m, (secondaryHits.get(m) ?? 0) + count);
    }
  }

  // Scale recommended to actual window
  const weekScale = windowDays / 7;

  // Build entries
  const entries: MuscleBalanceEntry[] = TRACKABLE_MUSCLES.map((muscle) => {
    const ph = primaryHits.get(muscle) ?? 0;
    const sh = secondaryHits.get(muscle) ?? 0;
    const score = ph + sh * 0.5;
    const recommended = (RECOMMENDED_WEEKLY[muscle] ?? 2) * weekScale;
    const percentage = recommended > 0 ? (score / recommended) * 100 : 0;

    let status: MuscleStatus = "none";
    if (recentSessions.length === 0) {
      status = "none";
    } else if (percentage > OVER_THRESHOLD * 100) {
      status = "over";
    } else if (percentage >= UNDER_THRESHOLD * 100) {
      status = "optimal";
    } else {
      status = "under";
    }

    return {
      muscle,
      primaryHits: ph,
      secondaryHits: sh,
      score,
      recommended,
      status,
      percentage: Math.round(percentage),
    };
  });

  const overExercised = entries.filter((e) => e.status === "over").map((e) => e.muscle);
  const optimal = entries.filter((e) => e.status === "optimal").map((e) => e.muscle);
  const underExercised = entries.filter((e) => e.status === "under").map((e) => e.muscle);

  const report: MuscleBalanceReport = {
    entries,
    windowDays,
    totalWorkouts: recentSessions.length,
    analyzedAt: new Date().toISOString(),
    overExercised,
    optimal,
    underExercised,
  };

  // Cache the report
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(report));
  } catch {}

  return report;
}

/**
 * Get cached muscle balance report.
 */
export async function getCachedMuscleBalance(): Promise<MuscleBalanceReport | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// ── Today's Target Muscles ───────────────────────────────────────────────────

/**
 * Extract today's targeted muscle groups from a workout plan schedule.
 */
export function getTodayTargetMuscles(
  schedule: Array<{ day: string; isRest?: boolean; exercises?: Array<{ name: string; muscleGroup?: string }> }> | undefined
): { primary: MuscleGroup[]; secondary: MuscleGroup[] } {
  if (!schedule) return { primary: [], secondary: [] };

  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const todayName = days[new Date().getDay()];

  const todayPlan = schedule.find((d) =>
    d.day.toLowerCase().includes(todayName.toLowerCase())
  );

  if (!todayPlan || todayPlan.isRest || !todayPlan.exercises) {
    return { primary: [], secondary: [] };
  }

  const primarySet = new Set<MuscleGroup>();
  const secondarySet = new Set<MuscleGroup>();

  for (const ex of todayPlan.exercises) {
    const info = getExerciseInfo(ex.name);
    if (info) {
      for (const m of info.primaryMuscles) primarySet.add(m as MuscleGroup);
      for (const m of info.secondaryMuscles) secondarySet.add(m as MuscleGroup);
    } else if (ex.muscleGroup) {
      // Fallback: use the muscleGroup field from the plan
      const mg = ex.muscleGroup.toLowerCase().replace(/\s+/g, "_") as MuscleGroup;
      if (TRACKABLE_MUSCLES.includes(mg)) primarySet.add(mg);
    }
  }

  // Remove secondary if already primary
  for (const m of primarySet) secondarySet.delete(m);

  return {
    primary: Array.from(primarySet),
    secondary: Array.from(secondarySet),
  };
}

// ── Exercise Suggestions ─────────────────────────────────────────────────────

/**
 * Generate exercise suggestions based on muscle balance analysis.
 */
export function generateSuggestions(report: MuscleBalanceReport): ExerciseSuggestion[] {
  const suggestions: ExerciseSuggestion[] = [];
  const allExercises = getAllExercises();

  // Prioritize under-exercised muscles
  for (const muscle of report.underExercised) {
    const exercises = allExercises.filter((ex) =>
      ex.primaryMuscles.includes(muscle)
    );

    if (exercises.length > 0) {
      // Pick top 2 exercises for this muscle
      const picks = exercises.slice(0, 2);
      for (const ex of picks) {
        suggestions.push({
          exerciseName: ex.name,
          reason: `${formatMuscle(muscle)} is under-exercised (${report.entries.find((e) => e.muscle === muscle)?.percentage ?? 0}% of recommended). Add this exercise to strengthen this area.`,
          targetMuscles: ex.primaryMuscles as MuscleGroup[],
          priority: "high",
        });
      }
    }
  }

  // Suggest rest for over-exercised muscles
  for (const muscle of report.overExercised) {
    const entry = report.entries.find((e) => e.muscle === muscle);
    suggestions.push({
      exerciseName: `Rest ${formatMuscle(muscle)}`,
      reason: `${formatMuscle(muscle)} is over-exercised (${entry?.percentage ?? 0}% of recommended). Consider reducing volume or taking a rest day for this muscle group.`,
      targetMuscles: [muscle],
      priority: "medium",
    });
  }

  return suggestions;
}

/**
 * Generate plan change recommendations based on muscle balance.
 */
export function generatePlanChanges(
  report: MuscleBalanceReport,
  currentSchedule: Array<{ day: string; isRest?: boolean; focus?: string; exercises?: Array<{ name: string; muscleGroup?: string; sets?: number; reps?: string; rest?: string }> }>
): PlanChange[] {
  const changes: PlanChange[] = [];
  const allExercises = getAllExercises();

  // For each non-rest day, check if we can swap over-exercised exercises for under-exercised ones
  for (const day of currentSchedule) {
    if (day.isRest || !day.exercises) continue;

    for (const ex of day.exercises) {
      const info = getExerciseInfo(ex.name);
      if (!info) continue;

      // Check if this exercise primarily targets an over-exercised muscle
      const isOverTarget = info.primaryMuscles.some((m) =>
        report.overExercised.includes(m as MuscleGroup)
      );

      if (isOverTarget && report.underExercised.length > 0) {
        // Find a replacement that targets an under-exercised muscle
        const underMuscle = report.underExercised[0];
        const replacement = allExercises.find(
          (e) =>
            e.primaryMuscles.includes(underMuscle) &&
            e.name !== ex.name &&
            // Try to match equipment type
            e.equipment.toLowerCase().includes(info.equipment.toLowerCase().split(" ")[0])
        ) || allExercises.find(
          (e) => e.primaryMuscles.includes(underMuscle) && e.name !== ex.name
        );

        if (replacement) {
          changes.push({
            type: "replace",
            dayName: day.day,
            exerciseName: ex.name,
            replacementName: replacement.name,
            reason: `${formatMuscle(info.primaryMuscles[0] as MuscleGroup)} is over-exercised. Replace with ${replacement.name} to work ${formatMuscle(underMuscle)}.`,
            targetMuscles: replacement.primaryMuscles as MuscleGroup[],
          });
        }
      }
    }

    // If no exercises target under-exercised muscles, suggest adding one
    if (day.exercises.length < 8) {
      for (const muscle of report.underExercised) {
        const alreadyTargeted = day.exercises.some((ex) => {
          const info = getExerciseInfo(ex.name);
          return info?.primaryMuscles.includes(muscle);
        });

        if (!alreadyTargeted) {
          const suggestion = allExercises.find(
            (e) => e.primaryMuscles.includes(muscle)
          );
          if (suggestion) {
            changes.push({
              type: "add",
              dayName: day.day,
              exerciseName: suggestion.name,
              reason: `Add ${suggestion.name} to target under-exercised ${formatMuscle(muscle)}.`,
              targetMuscles: suggestion.primaryMuscles as MuscleGroup[],
            });
            break; // Only suggest one addition per day
          }
        }
      }
    }
  }

  // Limit to most impactful changes
  return changes.slice(0, 5);
}

/**
 * Apply plan changes to a workout schedule.
 * Returns a new schedule with the changes applied.
 */
export function applyPlanChanges(
  schedule: Array<{ day: string; isRest?: boolean; focus?: string; exercises?: Array<{ name: string; muscleGroup?: string; sets?: number; reps?: string; rest?: string; notes?: string }> }>,
  changes: PlanChange[]
): typeof schedule {
  const newSchedule = JSON.parse(JSON.stringify(schedule)); // Deep clone

  for (const change of changes) {
    const day = newSchedule.find((d: any) => d.day === change.dayName);
    if (!day || !day.exercises) continue;

    if (change.type === "replace" && change.exerciseName && change.replacementName) {
      const idx = day.exercises.findIndex((e: any) => e.name === change.exerciseName);
      if (idx >= 0) {
        const info = getExerciseInfo(change.replacementName);
        day.exercises[idx] = {
          name: change.replacementName,
          muscleGroup: info?.primaryMuscles[0] ?? "",
          sets: day.exercises[idx].sets ?? 3,
          reps: day.exercises[idx].reps ?? "10-12",
          rest: day.exercises[idx].rest ?? "60s",
          notes: `Suggested: ${change.reason}`,
        };
      }
    } else if (change.type === "add" && change.exerciseName) {
      const info = getExerciseInfo(change.exerciseName);
      day.exercises.push({
        name: change.exerciseName,
        muscleGroup: info?.primaryMuscles[0] ?? "",
        sets: 3,
        reps: "10-12",
        rest: "60s",
        notes: `Added: ${change.reason}`,
      });
    } else if (change.type === "remove" && change.exerciseName) {
      day.exercises = day.exercises.filter((e: any) => e.name !== change.exerciseName);
    }
  }

  return newSchedule;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatMuscle(m: string): string {
  return m.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export { TRACKABLE_MUSCLES, RECOMMENDED_WEEKLY };
