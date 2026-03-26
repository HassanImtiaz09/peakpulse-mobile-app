/**
 * Exercise Video Registry
 *
 * Maps exercise keys to MuscleWiki demonstration video URLs (mp4).
 * Videos are short looping clips showing proper form from front and side angles.
 *
 * Attribution: Exercise videos powered by MuscleWiki (musclewiki.com)
 */

export interface ExerciseVideo {
  front: string;
  side: string | null;
}

const MW = "https://media.musclewiki.com/media/uploads/videos/branded";

/**
 * Registry of exercise video URLs from MuscleWiki.
 * Keys are normalised exercise names (lowercase).
 */
export const EXERCISE_VIDEOS: Record<string, ExerciseVideo> = {
  // ── CHEST ──────────────────────────────────────────────────────────
  "bench press": {
    front: `${MW}/male-barbell-bench-press-front.mp4`,
    side: `${MW}/male-barbell-bench-press-side.mp4`,
  },
  "incline dumbbell press": {
    front: `${MW}/male-dumbbell-incline-bench-press-front.mp4`,
    side: `${MW}/male-dumbbell-incline-bench-press-side.mp4`,
  },

  // ── BACK ───────────────────────────────────────────────────────────
  "deadlift": {
    front: `${MW}/male-Barbell-barbell-deadlift-front.mp4`,
    side: `${MW}/male-Barbell-barbell-deadlift-side.mp4`,
  },
  "barbell row": {
    front: `${MW}/male-barbell-bent-over-row-front.mp4`,
    side: `${MW}/male-barbell-bent-over-row-side.mp4`,
  },
  "pull up": {
    front: `${MW}/male-bodyweight-pullup-front.mp4`,
    side: `${MW}/male-bodyweight-pullup-side.mp4`,
  },

  // ── SHOULDERS ──────────────────────────────────────────────────────
  "overhead press": {
    front: `${MW}/male-barbell-overhead-press-front.mp4`,
    side: `${MW}/male-barbell-overhead-press-side.mp4`,
  },

  // ── ARMS ───────────────────────────────────────────────────────────
  "barbell curl": {
    front: `${MW}/male-Barbell-barbell-curl-front.mp4`,
    side: `${MW}/male-Barbell-barbell-curl-side.mp4`,
  },

  // ── LEGS ───────────────────────────────────────────────────────────
  "squat": {
    front: `${MW}/male-Barbell-barbell-squat-front.mp4`,
    side: `${MW}/male-Barbell-barbell-squat-side.mp4`,
  },
  "leg press": {
    front: `${MW}/male-Machine-machine-leg-press-front.mp4`,
    side: `${MW}/male-Machine-machine-leg-press-side.mp4`,
  },
  "romanian deadlift": {
    front: `${MW}/male-Barbell-barbell-romanian-deadlift-front.mp4`,
    side: `${MW}/male-Barbell-barbell-romanian-deadlift-side.mp4`,
  },
  "leg extension": {
    front: `${MW}/male-machine-leg-extension-front.mp4`,
    side: `${MW}/male-machine-leg-extension-side.mp4`,
  },
  "calf raise": {
    front: `${MW}/male-machine-seated-calf-raise-front.mp4`,
    side: `${MW}/male-machine-seated-calf-raise-side.mp4`,
  },
  "hip thrust": {
    front: `${MW}/male-Barbell-barbell-hip-thrust-front.mp4`,
    side: `${MW}/male-Barbell-barbell-hip-thrust-side.mp4`,
  },

  // ── CORE ───────────────────────────────────────────────────────────
  "russian twist": {
    front: `${MW}/male-bodyweight-russian-twist-front.mp4`,
    side: null,
  },

  // ── FULL BODY ──────────────────────────────────────────────────────
  "clean and press": {
    front: `${MW}/male-Barbell-barbell-clean-and-press-front.mp4`,
    side: `${MW}/male-Barbell-barbell-clean-and-press-side.mp4`,
  },
  "burpee": {
    front: `${MW}/male-bodyweight-burpee-front.mp4`,
    side: `${MW}/male-bodyweight-burpee-side.mp4`,
  },
};

/**
 * Lookup a video URL for a given exercise name and angle.
 * Returns null if no video is available.
 */
export function getExerciseVideoUrl(
  exerciseName: string,
  angle: "front" | "side" = "front"
): string | null {
  const key = exerciseName.toLowerCase().trim();
  const entry = EXERCISE_VIDEOS[key];
  if (!entry) return null;
  return angle === "side" ? entry.side : entry.front;
}

/**
 * Check if an exercise has a video demonstration available.
 */
export function hasExerciseVideo(exerciseName: string): boolean {
  const key = exerciseName.toLowerCase().trim();
  return key in EXERCISE_VIDEOS;
}

/**
 * Get both front and side video URLs for an exercise.
 * Returns null if no video is available.
 */
export function getExerciseVideos(exerciseName: string): ExerciseVideo | null {
  const key = exerciseName.toLowerCase().trim();
  return EXERCISE_VIDEOS[key] ?? null;
}
