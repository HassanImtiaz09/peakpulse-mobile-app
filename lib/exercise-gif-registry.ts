/**
 * Exercise GIF Asset Registry
 *
 * Maps exercise GIF filenames to their local require() paths.
 * These GIFs are bundled with the app for offline access and reliable playback.
 * Source: MuscleWiki (professionally filmed exercise demonstrations) + ExerciseDB fallbacks.
 */

/* eslint-disable @typescript-eslint/no-require-imports */

export const EXERCISE_GIFS: Record<string, number> = {
  // ── Chest ───────────────────────────────────────────────────────────────
  "male-barbell-bench-press-front": require("@/assets/exercise-gifs/male-barbell-bench-press-front.gif"),
  "male-bodyweight-push-up-front": require("@/assets/exercise-gifs/male-bodyweight-push-up-front.gif"),
  "male-dumbbell-chest-fly-front": require("@/assets/exercise-gifs/male-dumbbell-chest-fly-front.gif"),
  "male-Barbell-barbell-incline-bench-press-front": require("@/assets/exercise-gifs/male-Barbell-barbell-incline-bench-press-front.gif"),
  "male-dumbbell-incline-bench-press-front": require("@/assets/exercise-gifs/male-dumbbell-incline-bench-press-front.gif"),
  "male-dumbbell-decline-bench-press-front": require("@/assets/exercise-gifs/male-dumbbell-decline-bench-press-front.gif"),
  "male-cable-pec-fly-front": require("@/assets/exercise-gifs/male-cable-pec-fly-front.gif"),
  "male-Dumbbells-dumbbell-weighted-dip-front": require("@/assets/exercise-gifs/male-Dumbbells-dumbbell-weighted-dip-front.gif"),

  // ── Back ────────────────────────────────────────────────────────────────
  "male-bodyweight-pull-ups-front": require("@/assets/exercise-gifs/male-bodyweight-pull-ups-front.gif"),
  "male-bodyweight-chin-ups-front": require("@/assets/exercise-gifs/male-bodyweight-chin-ups-front.gif"),
  "male-machine-pulldown-front": require("@/assets/exercise-gifs/male-machine-pulldown-front.gif"),
  "male-Barbell-barbell-bent-over-row-front": require("@/assets/exercise-gifs/male-Barbell-barbell-bent-over-row-front.gif"),
  "male-dumbbell-row-bilateral-front": require("@/assets/exercise-gifs/male-dumbbell-row-bilateral-front.gif"),
  "male-machine-seated-cable-row-front": require("@/assets/exercise-gifs/male-machine-seated-cable-row-front.gif"),
  "male-Barbell-barbell-deadlift-front": require("@/assets/exercise-gifs/male-Barbell-barbell-deadlift-front.gif"),
  "male-Barbell-landmine-t-bar-rows-front": require("@/assets/exercise-gifs/male-Barbell-landmine-t-bar-rows-front.gif"),
  "male-Dumbbells-dumbbell-pendlay-row-front": require("@/assets/exercise-gifs/male-Dumbbells-dumbbell-pendlay-row-front.gif"),

  // ── Shoulders ───────────────────────────────────────────────────────────
  "male-Barbell-barbell-overhead-press-front": require("@/assets/exercise-gifs/male-Barbell-barbell-overhead-press-front.gif"),
  "male-Dumbbells-dumbbell-overhead-press-front": require("@/assets/exercise-gifs/male-Dumbbells-dumbbell-overhead-press-front.gif"),
  "male-dumbbell-lateral-raise-front": require("@/assets/exercise-gifs/male-dumbbell-lateral-raise-front.gif"),
  "male-dumbbell-front-raise-front": require("@/assets/exercise-gifs/male-dumbbell-front-raise-front.gif"),
  "male-Cable-cable-rope-face-pulls-front": require("@/assets/exercise-gifs/male-Cable-cable-rope-face-pulls-front.gif"),
  "male-dumbbell-rear-delt-fly-front": require("@/assets/exercise-gifs/male-dumbbell-rear-delt-fly-front.gif"),
  "male-Dumbbells-dumbbell-arnold-press-front": require("@/assets/exercise-gifs/male-Dumbbells-dumbbell-arnold-press-front.gif"),
  "male-Kettlebells-kettlebell-upright-row-front": require("@/assets/exercise-gifs/male-Kettlebells-kettlebell-upright-row-front.gif"),
  "male-Dumbbells-dumbbell-shrug-front": require("@/assets/exercise-gifs/male-Dumbbells-dumbbell-shrug-front.gif"),

  // ── Arms ────────────────────────────────────────────────────────────────
  "male-Dumbbells-dumbbell-curl-front": require("@/assets/exercise-gifs/male-Dumbbells-dumbbell-curl-front.gif"),
  "male-Barbell-barbell-curl-front": require("@/assets/exercise-gifs/male-Barbell-barbell-curl-front.gif"),
  "male-dumbbell-hammer-curl-front": require("@/assets/exercise-gifs/male-dumbbell-hammer-curl-front.gif"),
  "male-Dumbbells-dumbbell-preacher-curl-front": require("@/assets/exercise-gifs/male-Dumbbells-dumbbell-preacher-curl-front.gif"),
  "male-dumbbell-concentration-curl-front": require("@/assets/exercise-gifs/male-dumbbell-concentration-curl-front.gif"),
  "male-Machine-machine-tricep-pushdown-front": require("@/assets/exercise-gifs/male-Machine-machine-tricep-pushdown-front.gif"),
  "male-Bodyweight-bodyweight-tricep-extension-front": require("@/assets/exercise-gifs/male-Bodyweight-bodyweight-tricep-extension-front.gif"),
  "male-Bands-band-overhead-tricep-extension-front": require("@/assets/exercise-gifs/male-Bands-band-overhead-tricep-extension-front.gif"),
  "male-bodyweight-bench-dips-front": require("@/assets/exercise-gifs/male-bodyweight-bench-dips-front.gif"),
  "male-Kettlebells-kettlebell-skull-crusher-front": require("@/assets/exercise-gifs/male-Kettlebells-kettlebell-skull-crusher-front.gif"),
  "male-Barbell-barbell-close-grip-bench-press-front": require("@/assets/exercise-gifs/male-Barbell-barbell-close-grip-bench-press-front.gif"),

  // ── Legs ────────────────────────────────────────────────────────────────
  "male-Barbell-barbell-squat-front": require("@/assets/exercise-gifs/male-Barbell-barbell-squat-front.gif"),
  "male-Barbell-barbell-front-squat-olympic-front": require("@/assets/exercise-gifs/male-Barbell-barbell-front-squat-olympic-front.gif"),
  "male-dumbbell-goblet-squat-front": require("@/assets/exercise-gifs/male-dumbbell-goblet-squat-front.gif"),
  "male-bodyweight-bulgarian-split-squat-front": require("@/assets/exercise-gifs/male-bodyweight-bulgarian-split-squat-front.gif"),
  "male-bodyweight-forward-lunge-front_zb4K50d": require("@/assets/exercise-gifs/male-bodyweight-forward-lunge-front_zb4K50d.gif"),
  "male-Bodyweight-walking-lunge-front": require("@/assets/exercise-gifs/male-Bodyweight-walking-lunge-front.gif"),
  "male-Barbell-barbell-reverse-lunge-front": require("@/assets/exercise-gifs/male-Barbell-barbell-reverse-lunge-front.gif"),
  "male-machine-leg-press-front": require("@/assets/exercise-gifs/male-machine-leg-press-front.gif"),
  "male-Dumbbells-dumbbell-leg-curl-front": require("@/assets/exercise-gifs/male-Dumbbells-dumbbell-leg-curl-front.gif"),
  "male-machine-leg-extension-front": require("@/assets/exercise-gifs/male-machine-leg-extension-front.gif"),
  "male-Barbell-barbell-romanian-deadlift-front": require("@/assets/exercise-gifs/male-Barbell-barbell-romanian-deadlift-front.gif"),
  "male-barbell-stiff-leg-deadlift-front": require("@/assets/exercise-gifs/male-barbell-stiff-leg-deadlift-front.gif"),
  "male-Barbell-barbell-sumo-deadlift-front": require("@/assets/exercise-gifs/male-Barbell-barbell-sumo-deadlift-front.gif"),
  "male-Barbell-barbell-hip-thrust-front": require("@/assets/exercise-gifs/male-Barbell-barbell-hip-thrust-front.gif"),
  "male-bodyweight-glute-bridge-front": require("@/assets/exercise-gifs/male-bodyweight-glute-bridge-front.gif"),
  "male-machine-standing-calf-raises-front": require("@/assets/exercise-gifs/male-machine-standing-calf-raises-front.gif"),
  "male-Kettlebells-kettlebell-seated-calf-raise-front": require("@/assets/exercise-gifs/male-Kettlebells-kettlebell-seated-calf-raise-front.gif"),
  "male-Machine-machine-hack-squat-front": require("@/assets/exercise-gifs/male-Machine-machine-hack-squat-front.gif"),
  "male-Kettlebells-kettlebell-step-up-front": require("@/assets/exercise-gifs/male-Kettlebells-kettlebell-step-up-front.gif"),

  // ── Core ────────────────────────────────────────────────────────────────
  "male-bodyweight-forearm-plank-front": require("@/assets/exercise-gifs/male-bodyweight-forearm-plank-front.gif"),
  "male-Bodyweight-elbow-side-plank-front": require("@/assets/exercise-gifs/male-Bodyweight-elbow-side-plank-front.gif"),
  "male-bodyweight-crunch-front": require("@/assets/exercise-gifs/male-bodyweight-crunch-front.gif"),
  "male-Bodyweight-situp-front": require("@/assets/exercise-gifs/male-Bodyweight-situp-front.gif"),
  "male-Kettlebells-kettlebell-russian-twist-front": require("@/assets/exercise-gifs/male-Kettlebells-kettlebell-russian-twist-front.gif"),
  "male-Bodyweight-mountain-climber-front": require("@/assets/exercise-gifs/male-Bodyweight-mountain-climber-front.gif"),
  "male-Bodyweight-floor-incline-leg-raise-front": require("@/assets/exercise-gifs/male-Bodyweight-floor-incline-leg-raise-front.gif"),
  "male-bodyweight-hanging-knee-raises-front": require("@/assets/exercise-gifs/male-bodyweight-hanging-knee-raises-front.gif"),
  "male-TRX-trx-ab-rollout-front": require("@/assets/exercise-gifs/male-TRX-trx-ab-rollout-front.gif"),
  "male-Bodyweight-bicycle-crunch-front": require("@/assets/exercise-gifs/male-Bodyweight-bicycle-crunch-front.gif"),
  "male-Bodyweight-dead-bug-front": require("@/assets/exercise-gifs/male-Bodyweight-dead-bug-front.gif"),
  "male-cable-woodchopper-front": require("@/assets/exercise-gifs/male-cable-woodchopper-front.gif"),

  // ── Cardio / HIIT ──────────────────────────────────────────────────────
  "male-Bodyweight-burpee-front": require("@/assets/exercise-gifs/male-Bodyweight-burpee-front.gif"),
  "male-Cardio-cardio-jumping-jacks-front": require("@/assets/exercise-gifs/male-Cardio-cardio-jumping-jacks-front.gif"),
  "male-Plyometrics-box-jump-front": require("@/assets/exercise-gifs/male-Plyometrics-box-jump-front.gif"),
  "male-Kettlebells-kettlebell-swing-front": require("@/assets/exercise-gifs/male-Kettlebells-kettlebell-swing-front.gif"),
  "battle-rope": require("@/assets/exercise-gifs/battle-rope.gif"),
  "male-Cardio-jump-rope-front": require("@/assets/exercise-gifs/male-Cardio-jump-rope-front.gif"),
  "high-knees": require("@/assets/exercise-gifs/high-knees.gif"),
  "male-Cardio-treadmill-sprint-front": require("@/assets/exercise-gifs/male-Cardio-treadmill-sprint-front.gif"),
};

/**
 * Get a local GIF asset by its filename key.
 * Returns the require() number for use with expo-image or Image source.
 */
export function getExerciseGif(key: string): number | undefined {
  return EXERCISE_GIFS[key];
}
