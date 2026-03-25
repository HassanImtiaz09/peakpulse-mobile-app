/**
 * Mock for exercise-gif-registry.ts
 * In test environment, we replace require() GIF assets with numeric IDs
 */

// Generate mock asset IDs (numbers) for all exercises
const mockGifs: Record<string, number> = {};
const exerciseKeys = [
  "male-barbell-bench-press-front",
  "male-bodyweight-push-up-front",
  "male-dumbbell-chest-fly-front",
  "male-Barbell-barbell-incline-bench-press-front",
  "male-dumbbell-incline-bench-press-front",
  "male-dumbbell-decline-bench-press-front",
  "male-cable-pec-fly-front",
  "male-Dumbbells-dumbbell-weighted-dip-front",
  "male-bodyweight-pull-ups-front",
  "male-bodyweight-chin-ups-front",
  "male-machine-pulldown-front",
  "male-Barbell-barbell-bent-over-row-front",
  "male-dumbbell-row-bilateral-front",
  "male-machine-seated-cable-row-front",
  "male-Barbell-barbell-deadlift-front",
  "male-Barbell-landmine-t-bar-rows-front",
  "male-Dumbbells-dumbbell-pendlay-row-front",
  "male-Barbell-barbell-overhead-press-front",
  "male-Dumbbells-dumbbell-overhead-press-front",
  "male-dumbbell-lateral-raise-front",
  "male-dumbbell-front-raise-front",
  "male-Cable-cable-rope-face-pulls-front",
  "male-dumbbell-rear-delt-fly-front",
  "male-Dumbbells-dumbbell-arnold-press-front",
  "male-Kettlebells-kettlebell-upright-row-front",
  "male-Dumbbells-dumbbell-shrug-front",
  "male-Dumbbells-dumbbell-curl-front",
  "male-Barbell-barbell-curl-front",
  "male-dumbbell-hammer-curl-front",
  "male-Dumbbells-dumbbell-preacher-curl-front",
  "male-dumbbell-concentration-curl-front",
  "male-Machine-machine-tricep-pushdown-front",
  "male-Bodyweight-bodyweight-tricep-extension-front",
  "male-Bands-band-overhead-tricep-extension-front",
  "male-bodyweight-bench-dips-front",
  "male-Kettlebells-kettlebell-skull-crusher-front",
  "male-Barbell-barbell-close-grip-bench-press-front",
  "male-Barbell-barbell-squat-front",
  "male-Barbell-barbell-front-squat-olympic-front",
  "male-dumbbell-goblet-squat-front",
  "male-bodyweight-bulgarian-split-squat-front",
  "male-bodyweight-forward-lunge-front_zb4K50d",
  "male-Bodyweight-walking-lunge-front",
  "male-Barbell-barbell-reverse-lunge-front",
  "male-machine-leg-press-front",
  "male-Dumbbells-dumbbell-leg-curl-front",
  "male-machine-leg-extension-front",
  "male-Barbell-barbell-romanian-deadlift-front",
  "male-barbell-stiff-leg-deadlift-front",
  "male-Barbell-barbell-sumo-deadlift-front",
  "male-Barbell-barbell-hip-thrust-front",
  "male-bodyweight-glute-bridge-front",
  "male-machine-standing-calf-raises-front",
  "male-Kettlebells-kettlebell-seated-calf-raise-front",
  "male-Machine-machine-hack-squat-front",
  "male-Kettlebells-kettlebell-step-up-front",
  "male-bodyweight-forearm-plank-front",
  "male-Bodyweight-elbow-side-plank-front",
  "male-bodyweight-crunch-front",
  "male-Bodyweight-situp-front",
  "male-Kettlebells-kettlebell-russian-twist-front",
  "male-Bodyweight-mountain-climber-front",
  "male-Bodyweight-floor-incline-leg-raise-front",
  "male-bodyweight-hanging-knee-raises-front",
  "male-TRX-trx-ab-rollout-front",
  "male-Bodyweight-bicycle-crunch-front",
  "male-Bodyweight-dead-bug-front",
  "male-cable-woodchopper-front",
  "male-Bodyweight-burpee-front",
  "male-Cardio-cardio-jumping-jacks-front",
  "male-Plyometrics-box-jump-front",
  "male-Kettlebells-kettlebell-swing-front",
  "battle-rope",
  "male-Cardio-jump-rope-front",
  "high-knees",
  "male-Cardio-treadmill-sprint-front",
];

exerciseKeys.forEach((key, i) => {
  mockGifs[key] = i + 1; // Mock asset IDs as sequential numbers
});

export const EXERCISE_GIFS = mockGifs;

export function getGifAsset(key: string): number | undefined {
  return EXERCISE_GIFS[key];
}
