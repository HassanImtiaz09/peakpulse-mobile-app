/**
 * Missed Workout Detection & Rescheduling Engine
 *
 * Detects when planned workout days have passed without completion
 * and offers intelligent redistribution of missed exercises across
 * remaining days in the week.
 */

// ── Types ──

export interface WorkoutDay {
  day: string; // e.g. "Monday", "Tuesday"
  focus: string; // e.g. "Chest & Triceps"
  isRest: boolean;
  exercises: WorkoutExercise[];
}

export interface WorkoutExercise {
  name: string;
  sets: string | number;
  reps: string | number;
  rest?: string;
  muscleGroup?: string;
  equipment?: string;
  notes?: string;
}

export interface MissedDay {
  day: string;
  focus: string;
  exercises: WorkoutExercise[];
  dayIndex: number; // index in DAY_ORDER
}

export interface ReschedulePreview {
  /** The remaining workout days that will receive extra exercises */
  updatedDays: RescheduledDay[];
  /** Total exercises being redistributed */
  totalRedistributed: number;
  /** Days that were missed */
  missedDays: MissedDay[];
}

export interface RescheduledDay {
  day: string;
  focus: string;
  isRest: boolean;
  exercises: WorkoutExercise[];
  /** Exercises added from missed days */
  addedExercises: WorkoutExercise[];
  /** Original exercise count before redistribution */
  originalCount: number;
}

// ── Constants ──

export const DAY_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/** Maximum exercises per day after redistribution (to avoid overwhelming sessions) */
const MAX_EXERCISES_PER_DAY = 8;

/** Muscle groups that conflict (shouldn't be stacked on the same day) */
const MUSCLE_GROUP_CONFLICTS: Record<string, string[]> = {
  chest: ["chest"],
  back: ["back"],
  legs: ["legs", "quads", "hamstrings", "glutes"],
  shoulders: ["shoulders"],
  quads: ["legs", "quads"],
  hamstrings: ["legs", "hamstrings"],
  glutes: ["legs", "glutes"],
};

// ── Core Functions ──

/**
 * Get the current day index (0=Monday, 6=Sunday).
 */
export function getTodayIndex(now?: Date): number {
  const d = now ?? new Date();
  // JS getDay: 0=Sun, 1=Mon ... 6=Sat → convert to 0=Mon, 6=Sun
  const jsDay = d.getDay();
  return jsDay === 0 ? 6 : jsDay - 1;
}

/**
 * Normalize a day name to match DAY_ORDER (case-insensitive, partial match).
 */
export function normalizeDayName(dayStr: string): string | null {
  const lower = dayStr.toLowerCase().trim();
  return DAY_ORDER.find(d => lower.includes(d.toLowerCase())) ?? null;
}

/**
 * Get the day index from a schedule day object.
 */
export function getDayIndex(day: WorkoutDay): number {
  const normalized = normalizeDayName(day.day);
  return normalized ? DAY_ORDER.indexOf(normalized) : -1;
}

/**
 * Detect missed workout days.
 *
 * A day is "missed" if:
 * 1. It's a workout day (not rest)
 * 2. Its day-of-week has already passed (before today)
 * 3. It's not marked as completed in completedDays
 * 4. It hasn't been previously dismissed
 */
export function detectMissedDays(
  schedule: WorkoutDay[],
  completedDays: Record<string, boolean>,
  dismissedDays: string[],
  now?: Date
): MissedDay[] {
  const todayIdx = getTodayIndex(now);
  const missed: MissedDay[] = [];

  for (const day of schedule) {
    if (day.isRest) continue;
    if (!day.exercises || day.exercises.length === 0) continue;

    const dayIdx = getDayIndex(day);
    if (dayIdx < 0) continue;

    // Only days that have already passed (strictly before today)
    if (dayIdx >= todayIdx) continue;

    // Not completed
    if (completedDays[day.day]) continue;

    // Not dismissed
    if (dismissedDays.includes(day.day)) continue;

    missed.push({
      day: day.day,
      focus: day.focus,
      exercises: day.exercises,
      dayIndex: dayIdx,
    });
  }

  // Sort by day order
  missed.sort((a, b) => a.dayIndex - b.dayIndex);
  return missed;
}

/**
 * Get remaining workout days (today and after) that can receive extra exercises.
 */
export function getRemainingDays(
  schedule: WorkoutDay[],
  now?: Date
): WorkoutDay[] {
  const todayIdx = getTodayIndex(now);
  return schedule.filter(day => {
    if (day.isRest) return false;
    const dayIdx = getDayIndex(day);
    return dayIdx >= todayIdx;
  });
}

/**
 * Get the primary muscle group from an exercise.
 */
export function getExerciseMuscleGroup(ex: WorkoutExercise): string {
  return (ex.muscleGroup ?? "").toLowerCase().trim();
}

/**
 * Check if adding an exercise to a day would create a muscle group conflict.
 * Returns true if the exercise's muscle group is already heavily represented.
 */
export function hasMuscleConflict(
  dayExercises: WorkoutExercise[],
  newExercise: WorkoutExercise
): boolean {
  const newMuscle = getExerciseMuscleGroup(newExercise);
  if (!newMuscle) return false;

  const conflicts = MUSCLE_GROUP_CONFLICTS[newMuscle] ?? [newMuscle];
  const existingMuscles = dayExercises.map(getExerciseMuscleGroup);

  // Count how many exercises already target the same muscle group
  const conflictCount = existingMuscles.filter(m =>
    conflicts.includes(m) || (MUSCLE_GROUP_CONFLICTS[m] ?? [m]).includes(newMuscle)
  ).length;

  // Allow up to 2 exercises for the same muscle group
  return conflictCount >= 2;
}

/**
 * Generate a rescheduling preview showing how missed exercises would be redistributed.
 *
 * Strategy:
 * 1. Collect all exercises from missed days
 * 2. For each remaining workout day, calculate available capacity
 * 3. Distribute exercises round-robin, respecting muscle group balance and max cap
 * 4. If exercises can't fit anywhere, add them to the day with most capacity
 */
export function generateReschedulePreview(
  schedule: WorkoutDay[],
  missedDays: MissedDay[],
  now?: Date
): ReschedulePreview {
  const remaining = getRemainingDays(schedule, now);

  // Initialize rescheduled days
  const rescheduledDays: RescheduledDay[] = remaining.map(day => ({
    day: day.day,
    focus: day.focus,
    isRest: day.isRest,
    exercises: [...day.exercises],
    addedExercises: [],
    originalCount: day.exercises.length,
  }));

  // Collect all missed exercises
  const allMissedExercises: WorkoutExercise[] = missedDays.flatMap(d => d.exercises);

  if (rescheduledDays.length === 0 || allMissedExercises.length === 0) {
    return {
      updatedDays: rescheduledDays,
      totalRedistributed: 0,
      missedDays,
    };
  }

  let redistributed = 0;

  for (const exercise of allMissedExercises) {
    // Find the best day for this exercise
    let bestDay: RescheduledDay | null = null;
    let bestScore = -Infinity;

    for (const day of rescheduledDays) {
      const totalExercises = day.exercises.length + day.addedExercises.length;

      // Skip if at capacity
      if (totalExercises >= MAX_EXERCISES_PER_DAY) continue;

      // Calculate score: prefer days with more capacity and less muscle conflict
      const capacity = MAX_EXERCISES_PER_DAY - totalExercises;
      const allDayExercises = [...day.exercises, ...day.addedExercises];
      const hasConflict = hasMuscleConflict(allDayExercises, exercise);

      // Score: capacity bonus + muscle diversity bonus
      let score = capacity;
      if (!hasConflict) score += 5; // Strong preference for muscle diversity
      if (day.addedExercises.length === 0) score += 2; // Prefer spreading across days

      if (score > bestScore) {
        bestScore = score;
        bestDay = day;
      }
    }

    if (bestDay) {
      bestDay.addedExercises.push(exercise);
      redistributed++;
    } else {
      // Fallback: add to the day with the fewest total exercises (even if over cap)
      const leastLoaded = [...rescheduledDays].sort(
        (a, b) => (a.exercises.length + a.addedExercises.length) - (b.exercises.length + b.addedExercises.length)
      )[0];
      if (leastLoaded) {
        leastLoaded.addedExercises.push(exercise);
        redistributed++;
      }
    }
  }

  return {
    updatedDays: rescheduledDays,
    totalRedistributed: redistributed,
    missedDays,
  };
}

/**
 * Apply the rescheduling preview to produce an updated schedule.
 * Merges added exercises into each day's exercise list.
 */
export function applyReschedule(
  originalSchedule: WorkoutDay[],
  preview: ReschedulePreview
): WorkoutDay[] {
  return originalSchedule.map(day => {
    const rescheduled = preview.updatedDays.find(rd => rd.day === day.day);
    if (!rescheduled || rescheduled.addedExercises.length === 0) {
      return day;
    }

    return {
      ...day,
      exercises: [
        ...day.exercises,
        ...rescheduled.addedExercises.map(ex => ({
          ...ex,
          notes: ex.notes
            ? `${ex.notes} (redistributed)`
            : `Redistributed from missed day`,
        })),
      ],
    };
  });
}

/**
 * Get a human-readable summary of the rescheduling.
 */
export function getRescheduleSummary(preview: ReschedulePreview): string {
  if (preview.totalRedistributed === 0) {
    return "No exercises to redistribute.";
  }

  const missedNames = preview.missedDays.map(d => d.day).join(", ");
  const receivingDays = preview.updatedDays
    .filter(d => d.addedExercises.length > 0)
    .map(d => `${d.day} (+${d.addedExercises.length})`)
    .join(", ");

  return `${preview.totalRedistributed} exercise${preview.totalRedistributed > 1 ? "s" : ""} from ${missedNames} → ${receivingDays}`;
}

// ── AsyncStorage Keys ──

export const STORAGE_KEYS = {
  DISMISSED_MISSED_DAYS: "@peakpulse_dismissed_missed_days",
  LAST_RESCHEDULE_WEEK: "@peakpulse_last_reschedule_week",
} as const;

/**
 * Get the ISO week identifier for a date (YYYY-Www).
 */
export function getWeekId(now?: Date): string {
  const d = now ?? new Date();
  const year = d.getFullYear();
  // Simple week number: days since Jan 1 / 7
  const start = new Date(year, 0, 1);
  const diff = d.getTime() - start.getTime();
  const week = Math.ceil((diff / 86400000 + start.getDay() + 1) / 7);
  return `${year}-W${String(week).padStart(2, "0")}`;
}
