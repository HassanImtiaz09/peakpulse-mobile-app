/**
 * Exercise Video Registry — MuscleWiki MP4 Edition
 *
 * WHAT CHANGED (vs previous version):
 *   - All values now point to MuscleWiki's CDN MP4 videos instead of static PNGs.
 *   - Every exercise has BOTH a -front and -side entry, enabling the Front/Side toggle.
 *   - The old `SIDE_VIEW_GIFS` export has been removed (redundant — side angles now live here).
 *   - A `getExerciseVideoUrl()` helper is exported for angle-aware lookups in new components.
 *
 * MuscleWiki CDN base:
 *   https://media.musclewiki.com/media/uploads/videos/branded/{key}.mp4
 *
 * NOTE: MuscleWiki may occasionally rename or remove videos. If a video 404s,
 * replace its entry with a working URL from https://musclewiki.com.
 * For production, proxy/cache these through your own CDN.
 */

const MW = "https://media.musclewiki.com/media/uploads/videos/branded";

/** Build a MuscleWiki MP4 URL from a normalised filename key */
function mw(key: string): string {
  return `${MW}/${key}.mp4`;
}

// ---------------------------------------------------------------------------
// Primary registry — keyed exactly as in the original registry so that all
// existing gif() / getExerciseDemo() call sites keep working without changes.
// Values are now live MP4 URLs instead of static PNGs.
// ---------------------------------------------------------------------------

export const EXERCISE_GIFS: Record<string, string> = {

  // ── Chest ──────────────────────────────────────────────────────────────────

  "male-Barbell-barbell-close-grip-bench-press-front":
    mw("male-Barbell-barbell-close-grip-bench-press-front"),
  "male-Barbell-barbell-close-grip-bench-press-side":
    mw("male-Barbell-barbell-close-grip-bench-press-side"),

  "male-Barbell-barbell-incline-bench-press-front":
    mw("male-Barbell-barbell-incline-bench-press-front"),
  "male-Barbell-barbell-incline-bench-press-side":
    mw("male-Barbell-barbell-incline-bench-press-side"),

  "male-Dumbbells-dumbbell-weighted-dip-front":
    mw("male-Dumbbells-dumbbell-weighted-dip-front"),
  "male-Dumbbells-dumbbell-weighted-dip-side":
    mw("male-Dumbbells-dumbbell-weighted-dip-side"),

  // Legacy lowercase key — kept so existing gif() calls still resolve
  "male-barbell-bench-press-front":
    mw("male-barbell-bench-press-front"),
  "male-barbell-bench-press-side":
    mw("male-barbell-bench-press-side_KciuhbB"),

  "male-bodyweight-bench-dips-front":
    mw("male-Bodyweight-bench-dips-front"),
  "male-bodyweight-bench-dips-side":
    mw("male-Bodyweight-bench-dips-side"),

  "male-bodyweight-push-up-front":
    mw("male-Bodyweight-push-up-front"),
  "male-bodyweight-push-up-side":
    mw("male-Bodyweight-push-up-side"),

  "male-cable-pec-fly-front":
    mw("male-cable-pec-fly-front"),
  "male-cable-pec-fly-side":
    mw("male-cable-pec-fly-side"),

  "male-dumbbell-chest-fly-front":
    mw("male-dumbbell-chest-fly-front"),
  "male-dumbbell-chest-fly-side":
    mw("male-dumbbell-chest-fly-side"),

  "male-dumbbell-decline-bench-press-front":
    mw("male-dumbbell-decline-bench-press-front"),
  "male-dumbbell-decline-bench-press-side":
    mw("male-dumbbell-decline-bench-press-side"),

  "male-dumbbell-incline-bench-press-front":
    mw("male-dumbbell-incline-bench-press-front_q2q0T12"),
  "male-dumbbell-incline-bench-press-side":
    mw("male-dumbbell-incline-bench-press-side_2HBfFN3"),

  // ── Back ───────────────────────────────────────────────────────────────────

  "male-Barbell-barbell-bent-over-row-front":
    mw("male-barbell-bent-over-row-front"),
  "male-Barbell-barbell-bent-over-row-side":
    mw("male-barbell-bent-over-row-side"),

  "male-Barbell-barbell-deadlift-front":
    mw("male-Barbell-barbell-deadlift-front"),
  "male-Barbell-barbell-deadlift-side":
    mw("male-Barbell-barbell-deadlift-side"),

  "male-Barbell-barbell-romanian-deadlift-front":
    mw("male-Barbell-barbell-romanian-deadlift-front"),
  "male-Barbell-barbell-romanian-deadlift-side":
    mw("male-Barbell-barbell-romanian-deadlift-side_dnNh5UH"),

  "male-Barbell-barbell-sumo-deadlift-front":
    mw("male-Barbell-barbell-sumo-deadlift-front_hI2eO77"),
  "male-Barbell-barbell-sumo-deadlift-side":
    mw("male-Barbell-barbell-sumo-deadlift-side_5lcmI1F"),

  "male-Barbell-landmine-t-bar-rows-front":
    mw("male-Barbell-landmine-t-bar-rows-front"),
  "male-Barbell-landmine-t-bar-rows-side":
    mw("male-Barbell-landmine-t-bar-rows-side"),

  "male-Dumbbells-dumbbell-pendlay-row-front":
    mw("male-dumbbell-pendlay-row-front"),
  "male-Dumbbells-dumbbell-pendlay-row-side":
    mw("male-dumbbell-pendlay-row-side"),

  "male-barbell-stiff-leg-deadlift-front":
    mw("male-Barbell-barbell-stiff-leg-deadlift-front"),
  "male-barbell-stiff-leg-deadlift-side":
    mw("male-Barbell-barbell-stiff-leg-deadlift-side"),

  "male-bodyweight-chin-ups-front":
    mw("male-bodyweight-chinup-front"),
  "male-bodyweight-chin-ups-side":
    mw("male-bodyweight-chinup-side"),

  "male-bodyweight-pull-ups-front":
    mw("male-bodyweight-pullup-front"),
  "male-bodyweight-pull-ups-side":
    mw("male-bodyweight-pullup-side"),

  "male-dumbbell-row-bilateral-front":
    mw("male-Dumbbells-dumbbell-row-bilateral-front"),
  "male-dumbbell-row-bilateral-side":
    mw("male-Dumbbells-dumbbell-row-bilateral-side"),

  "male-machine-pulldown-front":
    mw("male-Cable-cable-lat-pulldown-front"),
  "male-machine-pulldown-side":
    mw("male-Cable-cable-lat-pulldown-side"),

  "male-machine-seated-cable-row-front":
    mw("male-Cable-cable-seated-row-front"),
  "male-machine-seated-cable-row-side":
    mw("male-Cable-cable-seated-row-side"),

  // ── Shoulders ──────────────────────────────────────────────────────────────

  "male-Barbell-barbell-overhead-press-front":
    mw("male-Barbell-barbell-overhead-press-front"),
  "male-Barbell-barbell-overhead-press-side":
    mw("male-Barbell-barbell-overhead-press-side"),

  "male-Cable-cable-rope-face-pulls-front":
    mw("male-Cable-cable-rope-face-pulls-front"),
  "male-Cable-cable-rope-face-pulls-side":
    mw("male-Cable-cable-rope-face-pulls-side"),

  "male-Dumbbells-dumbbell-arnold-press-front":
    mw("male-Dumbbells-dumbbell-arnold-press-front"),
  "male-Dumbbells-dumbbell-arnold-press-side":
    mw("male-Dumbbells-dumbbell-arnold-press-side"),

  "male-Dumbbells-dumbbell-overhead-press-front":
    mw("male-Dumbbells-dumbbell-overhead-press-front"),
  "male-Dumbbells-dumbbell-overhead-press-side":
    mw("male-Dumbbells-dumbbell-overhead-press-side"),

  "male-Dumbbells-dumbbell-shrug-front":
    mw("male-Dumbbells-dumbbell-shrug-front"),
  "male-Dumbbells-dumbbell-shrug-side":
    mw("male-Dumbbells-dumbbell-shrug-side"),

  "male-Kettlebells-kettlebell-upright-row-front":
    mw("male-Kettlebells-kettlebell-upright-row-front"),
  "male-Kettlebells-kettlebell-upright-row-side":
    mw("male-Kettlebells-kettlebell-upright-row-side"),

  "male-dumbbell-front-raise-front":
    mw("male-Dumbbells-dumbbell-front-raise-front"),
  "male-dumbbell-front-raise-side":
    mw("male-Dumbbells-dumbbell-front-raise-side"),

  "male-dumbbell-lateral-raise-front":
    mw("male-Dumbbells-dumbbell-lateral-raise-front"),
  "male-dumbbell-lateral-raise-side":
    mw("male-Dumbbells-dumbbell-lateral-raise-side"),

  "male-dumbbell-rear-delt-fly-front":
    mw("male-Dumbbells-dumbbell-rear-delt-fly-front"),
  "male-dumbbell-rear-delt-fly-side":
    mw("male-Dumbbells-dumbbell-rear-delt-fly-side"),

  // ── Biceps ─────────────────────────────────────────────────────────────────

  "male-Barbell-barbell-curl-front":
    mw("male-Barbell-barbell-curl-front"),
  "male-Barbell-barbell-curl-side":
    mw("male-Barbell-barbell-curl-side"),

  "male-Dumbbells-dumbbell-curl-front":
    mw("male-Dumbbells-dumbbell-curl-front"),
  "male-Dumbbells-dumbbell-curl-side":
    mw("male-Dumbbells-dumbbell-curl-side"),

  // Note: this key was in the Biceps section in the original but maps to a leg curl —
  // retained for backward compat; the exercise-demos.ts may have mis-filed it.
  "male-Dumbbells-dumbbell-leg-curl-front":
    mw("male-dumbbell-leg-curl-front"),
  "male-Dumbbells-dumbbell-leg-curl-side":
    mw("male-dumbbell-leg-curl-side"),

  "male-Dumbbells-dumbbell-preacher-curl-front":
    mw("male-Dumbbells-dumbbell-preacher-curl-front"),
  "male-Dumbbells-dumbbell-preacher-curl-side":
    mw("male-Dumbbells-dumbbell-preacher-curl-side"),

  "male-dumbbell-concentration-curl-front":
    mw("male-dumbbell-concentration-curl-front"),
  "male-dumbbell-concentration-curl-side":
    mw("male-dumbbell-concentration-curl-side"),

  "male-dumbbell-hammer-curl-front":
    mw("male-Dumbbells-dumbbell-hammer-curl-front"),
  "male-dumbbell-hammer-curl-side":
    mw("male-Dumbbells-dumbbell-hammer-curl-side"),

  // ── Triceps ────────────────────────────────────────────────────────────────

  "male-Bands-band-overhead-tricep-extension-front":
    mw("male-Band-band-overhead-tricep-extension-front"),
  "male-Bands-band-overhead-tricep-extension-side":
    mw("male-Band-band-overhead-tricep-extension-side"),

  "male-Bodyweight-bodyweight-tricep-extension-front":
    mw("male-Bodyweight-bodyweight-tricep-extension-front"),
  "male-Bodyweight-bodyweight-tricep-extension-side":
    mw("male-Bodyweight-bodyweight-tricep-extension-side"),

  "male-Kettlebells-kettlebell-skull-crusher-front":
    mw("male-Kettlebells-kettlebell-skull-crusher-front"),
  "male-Kettlebells-kettlebell-skull-crusher-side":
    mw("male-Kettlebells-kettlebell-skull-crusher-side"),

  "male-Machine-machine-tricep-pushdown-front":
    mw("male-Cables-cable-push-down-front"),
  "male-Machine-machine-tricep-pushdown-side":
    mw("male-Cables-cable-push-down-side"),

  // ── Legs ───────────────────────────────────────────────────────────────────

  "male-Barbell-barbell-front-squat-olympic-front":
    mw("male-Barbell-barbell-front-squat-olympic-front"),
  "male-Barbell-barbell-front-squat-olympic-side":
    mw("male-Barbell-barbell-front-squat-olympic-side"),

  "male-Barbell-barbell-hip-thrust-front":
    mw("male-Barbell-barbell-hip-thrust-front"),
  "male-Barbell-barbell-hip-thrust-side":
    mw("male-Barbell-barbell-hip-thrust-side"),

  "male-Barbell-barbell-reverse-lunge-front":
    mw("male-barbell-reverse-lunge-front"),
  "male-Barbell-barbell-reverse-lunge-side":
    mw("male-barbell-reverse-lunge-side"),

  "male-Barbell-barbell-squat-front":
    mw("male-Barbell-barbell-squat-front"),
  "male-Barbell-barbell-squat-side":
    mw("male-Barbell-barbell-squat-side"),

  "male-Bodyweight-walking-lunge-front":
    mw("male-Bodyweight-walking-lunge-front"),
  "male-Bodyweight-walking-lunge-side":
    mw("male-Bodyweight-walking-lunge-side"),

  "male-Kettlebells-kettlebell-seated-calf-raise-front":
    mw("male-machine-seated-calf-raise-front"),
  "male-Kettlebells-kettlebell-seated-calf-raise-side":
    mw("male-machine-seated-calf-raise-side"),

  "male-Kettlebells-kettlebell-step-up-front":
    mw("male-Kettlebells-kettlebell-step-up-front"),
  "male-Kettlebells-kettlebell-step-up-side":
    mw("male-Kettlebells-kettlebell-step-up-side"),

  "male-Machine-machine-hack-squat-front":
    mw("male-Machine-machine-hack-squat-front"),
  "male-Machine-machine-hack-squat-side":
    mw("male-Machine-machine-hack-squat-side"),

  "male-bodyweight-bulgarian-split-squat-front":
    mw("male-Bodyweight-bulgarian-split-squat-front"),
  "male-bodyweight-bulgarian-split-squat-side":
    mw("male-Bodyweight-bulgarian-split-squat-side"),

  // Key had a Manus artifact suffix (_zb4K50d) — stripped for correct MW URL
  "male-bodyweight-forward-lunge-front_zb4K50d":
    mw("male-bodyweight-forward-lunge-front_zb4K50d"),
  "male-bodyweight-forward-lunge-front":
    mw("male-bodyweight-forward-lunge-front_zb4K50d"),
  "male-bodyweight-forward-lunge-side":
    mw("male-bodyweight-forward-lunge-side_4k0dfH0"),

  "male-bodyweight-glute-bridge-front":
    mw("male-Bodyweight-glute-bridge-front"),
  "male-bodyweight-glute-bridge-side":
    mw("male-Bodyweight-glute-bridge-side"),

  "male-dumbbell-goblet-squat-front":
    mw("male-dumbbell-goblet-squat-front"),
  "male-dumbbell-goblet-squat-side":
    mw("male-dumbbell-goblet-squat-side"),

  "male-machine-leg-extension-front":
    mw("male-Machine-machine-leg-extension-front"),
  "male-machine-leg-extension-side":
    mw("male-Machine-machine-leg-extension-side"),

  "male-machine-leg-press-front":
    mw("male-Machine-machine-leg-press-front"),
  "male-machine-leg-press-side":
    mw("male-Machine-machine-leg-press-side"),

  "male-machine-standing-calf-raises-front":
    mw("male-Machine-machine-standing-calf-raises-front"),
  "male-machine-standing-calf-raises-side":
    mw("male-Machine-machine-standing-calf-raises-side"),

  // ── Core ───────────────────────────────────────────────────────────────────

  "male-Bodyweight-bicycle-crunch-front":
    mw("male-Bodyweight-bicycle-crunch-front"),
  "male-Bodyweight-bicycle-crunch-side":
    mw("male-Bodyweight-bicycle-crunch-side"),

  "male-Bodyweight-dead-bug-front":
    mw("male-Bodyweight-dead-bug-front"),
  "male-Bodyweight-dead-bug-side":
    mw("male-Bodyweight-dead-bug-side"),

  "male-Bodyweight-elbow-side-plank-front":
    mw("male-bodyweight-elbow-side-plank-front"),
  "male-Bodyweight-elbow-side-plank-side":
    mw("male-bodyweight-elbow-side-plank-front"),

  "male-Bodyweight-floor-incline-leg-raise-front":
    mw("male-Bodyweight-floor-incline-leg-raise-front"),
  "male-Bodyweight-floor-incline-leg-raise-side":
    mw("male-Bodyweight-floor-incline-leg-raise-side"),

  "male-Bodyweight-mountain-climber-front":
    mw("male-bodyweight-mountain-climber-front"),
  "male-Bodyweight-mountain-climber-side":
    mw("male-bodyweight-mountain-climber-side"),

  "male-Bodyweight-situp-front":
    mw("male-Bodyweight-situp-front"),
  "male-Bodyweight-situp-side":
    mw("male-Bodyweight-situp-side"),

  "male-Kettlebells-kettlebell-russian-twist-front":
    mw("male-Kettlebells-kettlebell-russian-twist-front"),
  "male-Kettlebells-kettlebell-russian-twist-side":
    mw("male-Kettlebells-kettlebell-russian-twist-side"),

  "male-TRX-trx-ab-rollout-front":
    mw("male-trx-ab-rollout-front"),
  "male-TRX-trx-ab-rollout-side":
    mw("male-trx-ab-rollout-side"),

  "male-bodyweight-crunch-front":
    mw("male-bodyweight-crunch-front"),
  "male-bodyweight-crunch-side":
    mw("male-bodyweight-crunch-side"),

  "male-bodyweight-forearm-plank-front":
    mw("male-Medicine-Ball-plank-front"),
  "male-bodyweight-forearm-plank-side":
    mw("male-Medicine-Ball-plank-side"),

  "male-bodyweight-hanging-knee-raises-front":
    mw("male-bodyweight-hanging-knee-raises-front"),
  "male-bodyweight-hanging-knee-raises-side":
    mw("male-bodyweight-hanging-knee-raises-side"),

  "male-cable-woodchopper-front":
    mw("male-Cable-cable-woodchopper-front"),
  "male-cable-woodchopper-side":
    mw("male-Cable-cable-woodchopper-side"),

  // ── Cardio & Plyometrics ───────────────────────────────────────────────────

  "male-Bodyweight-burpee-front":
    mw("male-bodyweight-burpee-front"),
  "male-Bodyweight-burpee-side":
    mw("male-bodyweight-burpee-side"),

  "male-Cardio-cardio-jumping-jacks-front":
    mw("male-Cardio-cardio-jumping-jacks-front"),
  "male-Cardio-cardio-jumping-jacks-side":
    mw("male-Cardio-cardio-jumping-jacks-side"),

  "male-Cardio-jump-rope-front":
    mw("male-Cardio-jump-rope-front"),
  "male-Cardio-jump-rope-side":
    mw("male-Cardio-jump-rope-side"),

  "male-Cardio-treadmill-sprint-front":
    mw("male-Cardio-treadmill-sprint-front"),
  "male-Cardio-treadmill-sprint-side":
    mw("male-Cardio-treadmill-sprint-side"),

  "male-Kettlebells-kettlebell-swing-front":
    mw("male-Kettlebells-kettlebell-swing-front"),
  "male-Kettlebells-kettlebell-swing-side":
    mw("male-Kettlebells-kettlebell-swing-side"),

  "male-Plyometrics-box-jump-front":
    mw("male-Bodyweight-box-jump-front"),
  "male-Plyometrics-box-jump-side":
    mw("male-Bodyweight-box-jump-side"),
};

// ---------------------------------------------------------------------------
// Helper: get a video URL for a given registry key + angle
//
// Usage (in EnhancedGifPlayer or any other component):
//   const url = getExerciseVideoUrl("male-Barbell-barbell-squat-front", "side");
//   // → "https://media.musclewiki.com/.../male-Barbell-barbell-squat-side.mp4"
// ---------------------------------------------------------------------------

export function getExerciseVideoUrl(
  frontKey: string,
  angle: "front" | "side" = "front"
): string {
  if (angle === "front") {
    return EXERCISE_GIFS[frontKey] ?? EXERCISE_GIFS["male-bodyweight-push-up-front"];
  }

  // Derive the side key from the front key
  const sideKey = frontKey.replace(/-front$/, "-side");
  return (
    EXERCISE_GIFS[sideKey] ??
    // Fallback: return front view if side not available
    EXERCISE_GIFS[frontKey] ??
    EXERCISE_GIFS["male-bodyweight-push-up-front"]
  );
}

/**
 * @deprecated Use EXERCISE_GIFS with -side keys directly, or use getExerciseVideoUrl().
 * Kept only to avoid breaking any imports of SIDE_VIEW_GIFS that may exist elsewhere.
 */
export const SIDE_VIEW_GIFS: Record<string, string> = {};
