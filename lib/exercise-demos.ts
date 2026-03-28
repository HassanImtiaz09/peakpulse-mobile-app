/**
 * Exercise Demo Library
 *
 * Maps common exercise names to CDN-hosted AI-generated exercise images.
 * Assets are served from manuscdn.com and cloudfront CDN — NOT local files.
 *
 * Architecture:
 * - `gifAsset` field: resolved via EXERCISE_GIFS registry → CDN URL string
 * - `gifUrl` field: legacy, kept as empty string for backward compatibility
 * - Resolution chain: gif() → EXERCISE_GIFS[key] → CDN URL
 * - No local require() needed — Metro does not bundle these assets.
 *   The CDN URLs are fetched at runtime by expo-image / Image component.
 */

import { EXERCISE_GIFS } from "@/lib/exercise-gif-registry";

export interface ExerciseDemo {
  /** Short cue text shown below the demo */
  cue: string;
  /** Exercise image asset — CDN URL string or legacy require() number */
  gifAsset: number | string;
  /** Legacy URL field for backward compatibility (empty string for CDN assets) */
  gifUrl: string;
}

/** Normalise an exercise name for lookup */
export function normaliseExerciseName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
}

// Helper to get an exercise image asset with a fallback
function gif(key: string): number | string {
  return EXERCISE_GIFS[key] ?? EXERCISE_GIFS["male-bodyweight-push-up-front"];
}

/**
 * Primary lookup map: normalised exercise name → demo
 * 77 local GIF assets covering 80+ exercise name variants.
 */
const DEMO_MAP: Record<string, ExerciseDemo> = {
  // ── Chest ─────────────────────────────────────────────────────────────────
  "bench press": {
    cue: "Keep shoulder blades retracted. Bar touches mid-chest.",
    gifAsset: gif("male-barbell-bench-press-front"),
    gifUrl: "",
  },
  "push up": {
    cue: "Straight body line. Lower until chest nearly touches floor.",
    gifAsset: gif("male-bodyweight-push-up-front"),
    gifUrl: "",
  },
  "push-up": {
    cue: "Straight body line. Lower until chest nearly touches floor.",
    gifAsset: gif("male-bodyweight-push-up-front"),
    gifUrl: "",
  },
  "pushup": {
    cue: "Straight body line. Lower until chest nearly touches floor.",
    gifAsset: gif("male-bodyweight-push-up-front"),
    gifUrl: "",
  },
  "dumbbell fly": {
    cue: "Slight elbow bend throughout. Squeeze chest at top.",
    gifAsset: gif("male-dumbbell-chest-fly-front"),
    gifUrl: "",
  },
  "dumbbell flye": {
    cue: "Slight elbow bend throughout. Squeeze chest at top.",
    gifAsset: gif("male-dumbbell-chest-fly-front"),
    gifUrl: "",
  },
  "incline bench press": {
    cue: "30-45\u00b0 incline. Drive bar in a slight arc to upper chest.",
    gifAsset: gif("male-Barbell-barbell-incline-bench-press-front"),
    gifUrl: "",
  },
  "incline dumbbell press": {
    cue: "30-45\u00b0 incline. Press dumbbells up and slightly inward.",
    gifAsset: gif("male-dumbbell-incline-bench-press-front"),
    gifUrl: "",
  },
  "decline bench press": {
    cue: "Slight decline. Bar to lower chest. Controlled movement.",
    gifAsset: gif("male-dumbbell-decline-bench-press-front"),
    gifUrl: "",
  },
  "cable fly": {
    cue: "Hinge forward slightly. Bring hands together in an arc.",
    gifAsset: gif("male-cable-pec-fly-front"),
    gifUrl: "",
  },
  "cable crossover": {
    cue: "Step forward. Squeeze chest as hands cross at bottom.",
    gifAsset: gif("male-cable-pec-fly-front"),
    gifUrl: "",
  },
  "dip": {
    cue: "Lean forward for chest. Lower until elbows reach 90\u00b0.",
    gifAsset: gif("male-Dumbbells-dumbbell-weighted-dip-front"),
    gifUrl: "",
  },
  "chest dip": {
    cue: "Lean forward for chest. Lower until elbows reach 90\u00b0.",
    gifAsset: gif("male-Dumbbells-dumbbell-weighted-dip-front"),
    gifUrl: "",
  },
  // ── Back ──────────────────────────────────────────────────────────────────
  "pull up": {
    cue: "Full hang at bottom. Drive elbows down to pull up.",
    gifAsset: gif("male-bodyweight-pull-ups-front"),
    gifUrl: "",
  },
  "pull-up": {
    cue: "Full hang at bottom. Drive elbows down to pull up.",
    gifAsset: gif("male-bodyweight-pull-ups-front"),
    gifUrl: "",
  },
  "pullup": {
    cue: "Full hang at bottom. Drive elbows down to pull up.",
    gifAsset: gif("male-bodyweight-pull-ups-front"),
    gifUrl: "",
  },
  "chin up": {
    cue: "Supinated grip. Chin clears bar at top.",
    gifAsset: gif("male-bodyweight-chin-ups-front"),
    gifUrl: "",
  },
  "chin-up": {
    cue: "Supinated grip. Chin clears bar at top.",
    gifAsset: gif("male-bodyweight-chin-ups-front"),
    gifUrl: "",
  },
  "lat pulldown": {
    cue: "Lean back slightly. Pull bar to upper chest.",
    gifAsset: gif("male-machine-pulldown-front"),
    gifUrl: "",
  },
  "bent over row": {
    cue: "Hinge at hips, back flat. Pull bar to lower rib cage.",
    gifAsset: gif("male-Barbell-barbell-bent-over-row-front"),
    gifUrl: "",
  },
  "barbell row": {
    cue: "Hinge at hips, back flat. Pull bar to lower rib cage.",
    gifAsset: gif("male-Barbell-barbell-bent-over-row-front"),
    gifUrl: "",
  },
  "dumbbell row": {
    cue: "One arm on bench. Pull to hip, squeeze lat at top.",
    gifAsset: gif("male-dumbbell-row-bilateral-front"),
    gifUrl: "",
  },
  "seated cable row": {
    cue: "Tall posture. Pull handle to navel, squeeze shoulder blades.",
    gifAsset: gif("male-machine-seated-cable-row-front"),
    gifUrl: "",
  },
  "cable row": {
    cue: "Tall posture. Pull handle to navel, squeeze shoulder blades.",
    gifAsset: gif("male-machine-seated-cable-row-front"),
    gifUrl: "",
  },
  "deadlift": {
    cue: "Bar over mid-foot. Hinge hips back, keep back neutral.",
    gifAsset: gif("male-Barbell-barbell-deadlift-front"),
    gifUrl: "",
  },
  "t-bar row": {
    cue: "Chest on pad. Pull to chest, squeeze shoulder blades.",
    gifAsset: gif("male-Barbell-landmine-t-bar-rows-front"),
    gifUrl: "",
  },
  "tbar row": {
    cue: "Chest on pad. Pull to chest, squeeze shoulder blades.",
    gifAsset: gif("male-Barbell-landmine-t-bar-rows-front"),
    gifUrl: "",
  },
  "pendlay row": {
    cue: "Bar returns to floor each rep. Explosive pull.",
    gifAsset: gif("male-Dumbbells-dumbbell-pendlay-row-front"),
    gifUrl: "",
  },
  // ── Shoulders ─────────────────────────────────────────────────────────────
  "overhead press": {
    cue: "Brace core. Press bar in a straight line overhead.",
    gifAsset: gif("male-Barbell-barbell-overhead-press-front"),
    gifUrl: "",
  },
  "shoulder press": {
    cue: "Elbows at 90\u00b0 at bottom. Full extension at top.",
    gifAsset: gif("male-Dumbbells-dumbbell-overhead-press-front"),
    gifUrl: "",
  },
  "military press": {
    cue: "Strict press. No leg drive. Bar overhead.",
    gifAsset: gif("male-Barbell-barbell-overhead-press-front"),
    gifUrl: "",
  },
  "dumbbell shoulder press": {
    cue: "Press dumbbells up and slightly inward. Full lockout.",
    gifAsset: gif("male-Dumbbells-dumbbell-overhead-press-front"),
    gifUrl: "",
  },
  "lateral raise": {
    cue: "Slight forward lean. Raise to shoulder height, pinky up.",
    gifAsset: gif("male-dumbbell-lateral-raise-front"),
    gifUrl: "",
  },
  "side lateral raise": {
    cue: "Slight forward lean. Raise to shoulder height, pinky up.",
    gifAsset: gif("male-dumbbell-lateral-raise-front"),
    gifUrl: "",
  },
  "front raise": {
    cue: "Controlled raise to eye level. Lower slowly.",
    gifAsset: gif("male-dumbbell-front-raise-front"),
    gifUrl: "",
  },
  "face pull": {
    cue: "Pull rope to face. Elbows high and wide at end.",
    gifAsset: gif("male-Cable-cable-rope-face-pulls-front"),
    gifUrl: "",
  },
  "rear delt fly": {
    cue: "Bent over. Raise arms to sides, squeeze rear delts.",
    gifAsset: gif("male-dumbbell-rear-delt-fly-front"),
    gifUrl: "",
  },
  "arnold press": {
    cue: "Rotate palms from facing you to facing forward as you press.",
    gifAsset: gif("male-Dumbbells-dumbbell-arnold-press-front"),
    gifUrl: "",
  },
  "upright row": {
    cue: "Pull bar to chin. Elbows lead the movement.",
    gifAsset: gif("male-Kettlebells-kettlebell-upright-row-front"),
    gifUrl: "",
  },
  "shrug": {
    cue: "Straight up, hold at top. No rolling.",
    gifAsset: gif("male-Dumbbells-dumbbell-shrug-front"),
    gifUrl: "",
  },
  // ── Arms ──────────────────────────────────────────────────────────────────
  "bicep curl": {
    cue: "Elbows fixed at sides. Full range of motion.",
    gifAsset: gif("male-Dumbbells-dumbbell-curl-front"),
    gifUrl: "",
  },
  "biceps curl": {
    cue: "Elbows fixed at sides. Full range of motion.",
    gifAsset: gif("male-Dumbbells-dumbbell-curl-front"),
    gifUrl: "",
  },
  "barbell curl": {
    cue: "Elbows fixed at sides. Squeeze at top.",
    gifAsset: gif("male-Barbell-barbell-curl-front"),
    gifUrl: "",
  },
  "dumbbell curl": {
    cue: "Alternate or together. Full supination at top.",
    gifAsset: gif("male-Dumbbells-dumbbell-curl-front"),
    gifUrl: "",
  },
  "hammer curl": {
    cue: "Neutral grip throughout. Controlled eccentric.",
    gifAsset: gif("male-dumbbell-hammer-curl-front"),
    gifUrl: "",
  },
  "preacher curl": {
    cue: "Arms on pad. Full stretch at bottom, squeeze at top.",
    gifAsset: gif("male-Dumbbells-dumbbell-preacher-curl-front"),
    gifUrl: "",
  },
  "concentration curl": {
    cue: "Elbow on inner thigh. Isolate the bicep.",
    gifAsset: gif("male-dumbbell-concentration-curl-front"),
    gifUrl: "",
  },
  "tricep pushdown": {
    cue: "Elbows pinned to sides. Full extension at bottom.",
    gifAsset: gif("male-Machine-machine-tricep-pushdown-front"),
    gifUrl: "",
  },
  "tricep extension": {
    cue: "Elbows point to ceiling. Full stretch and extension.",
    gifAsset: gif("male-Bodyweight-bodyweight-tricep-extension-front"),
    gifUrl: "",
  },
  "overhead tricep extension": {
    cue: "Elbows close to head. Full stretch behind head.",
    gifAsset: gif("male-Bands-band-overhead-tricep-extension-front"),
    gifUrl: "",
  },
  "tricep dip": {
    cue: "Upright torso for triceps. Lower until elbows reach 90\u00b0.",
    gifAsset: gif("male-bodyweight-bench-dips-front"),
    gifUrl: "",
  },
  "bench dip": {
    cue: "Hands on bench behind you. Lower until elbows reach 90\u00b0.",
    gifAsset: gif("male-bodyweight-bench-dips-front"),
    gifUrl: "",
  },
  "skull crusher": {
    cue: "Elbows point to ceiling. Lower bar to forehead slowly.",
    gifAsset: gif("male-Kettlebells-kettlebell-skull-crusher-front"),
    gifUrl: "",
  },
  "close grip bench press": {
    cue: "Hands shoulder-width. Elbows close to body.",
    gifAsset: gif("male-Barbell-barbell-close-grip-bench-press-front"),
    gifUrl: "",
  },
  // ── Legs ──────────────────────────────────────────────────────────────────
  "squat": {
    cue: "Feet shoulder-width. Knees track toes. Depth to parallel.",
    gifAsset: gif("male-Barbell-barbell-squat-front"),
    gifUrl: "",
  },
  "back squat": {
    cue: "Bar on traps. Brace core. Drive through heels.",
    gifAsset: gif("male-Barbell-barbell-squat-front"),
    gifUrl: "",
  },
  "barbell squat": {
    cue: "Bar on traps. Brace core. Drive through heels.",
    gifAsset: gif("male-Barbell-barbell-squat-front"),
    gifUrl: "",
  },
  "front squat": {
    cue: "Elbows high. Bar on front delts. Upright torso.",
    gifAsset: gif("male-Barbell-barbell-front-squat-olympic-front"),
    gifUrl: "",
  },
  "goblet squat": {
    cue: "Hold dumbbell at chest. Elbows inside knees at bottom.",
    gifAsset: gif("male-dumbbell-goblet-squat-front"),
    gifUrl: "",
  },
  "bulgarian split squat": {
    cue: "Rear foot on bench. Front knee over ankle.",
    gifAsset: gif("male-bodyweight-bulgarian-split-squat-front"),
    gifUrl: "",
  },
  "lunge": {
    cue: "Step forward. Back knee hovers above floor.",
    gifAsset: gif("male-bodyweight-forward-lunge-front_zb4K50d"),
    gifUrl: "",
  },
  "walking lunge": {
    cue: "Continuous forward motion. Upright torso.",
    gifAsset: gif("male-Bodyweight-walking-lunge-front"),
    gifUrl: "",
  },
  "reverse lunge": {
    cue: "Step backward. Front knee stays over ankle.",
    gifAsset: gif("male-Barbell-barbell-reverse-lunge-front"),
    gifUrl: "",
  },
  "leg press": {
    cue: "Feet hip-width. Don\u2019t lock knees at top.",
    gifAsset: gif("male-machine-leg-press-front"),
    gifUrl: "",
  },
  "leg curl": {
    cue: "Curl heels to glutes. Slow eccentric.",
    gifAsset: gif("male-Dumbbells-dumbbell-leg-curl-front"),
    gifUrl: "",
  },
  "hamstring curl": {
    cue: "Curl heels to glutes. Slow eccentric.",
    gifAsset: gif("male-Dumbbells-dumbbell-leg-curl-front"),
    gifUrl: "",
  },
  "leg extension": {
    cue: "Full extension at top. Pause 1 second.",
    gifAsset: gif("male-machine-leg-extension-front"),
    gifUrl: "",
  },
  "romanian deadlift": {
    cue: "Hinge at hips. Bar stays close to legs. Feel hamstring stretch.",
    gifAsset: gif("male-Barbell-barbell-romanian-deadlift-front"),
    gifUrl: "",
  },
  "stiff leg deadlift": {
    cue: "Minimal knee bend. Hinge at hips. Stretch hamstrings.",
    gifAsset: gif("male-barbell-stiff-leg-deadlift-front"),
    gifUrl: "",
  },
  "sumo deadlift": {
    cue: "Wide stance. Toes out. Drive hips forward.",
    gifAsset: gif("male-Barbell-barbell-sumo-deadlift-front"),
    gifUrl: "",
  },
  "hip thrust": {
    cue: "Shoulders on bench. Drive hips up. Squeeze glutes at top.",
    gifAsset: gif("male-Barbell-barbell-hip-thrust-front"),
    gifUrl: "",
  },
  "glute bridge": {
    cue: "Feet flat on floor. Drive hips up. Squeeze glutes.",
    gifAsset: gif("male-bodyweight-glute-bridge-front"),
    gifUrl: "",
  },
  "calf raise": {
    cue: "Full stretch at bottom. Full contraction at top.",
    gifAsset: gif("male-machine-standing-calf-raises-front"),
    gifUrl: "",
  },
  "standing calf raise": {
    cue: "Full stretch at bottom. Full contraction at top.",
    gifAsset: gif("male-machine-standing-calf-raises-front"),
    gifUrl: "",
  },
  "seated calf raise": {
    cue: "Knees at 90\u00b0. Full range of motion.",
    gifAsset: gif("male-Kettlebells-kettlebell-seated-calf-raise-front"),
    gifUrl: "",
  },
  "hack squat": {
    cue: "Shoulders against pad. Feet forward. Full depth.",
    gifAsset: gif("male-Machine-machine-hack-squat-front"),
    gifUrl: "",
  },
  "step up": {
    cue: "Drive through front heel. Full extension at top.",
    gifAsset: gif("male-Kettlebells-kettlebell-step-up-front"),
    gifUrl: "",
  },
  // ── Core ──────────────────────────────────────────────────────────────────
  "plank": {
    cue: "Straight line from head to heels. Don\u2019t let hips sag.",
    gifAsset: gif("male-bodyweight-forearm-plank-front"),
    gifUrl: "",
  },
  "side plank": {
    cue: "Stack feet. Hips up. Straight line from head to feet.",
    gifAsset: gif("male-Bodyweight-elbow-side-plank-front"),
    gifUrl: "",
  },
  "crunch": {
    cue: "Curl shoulders off floor. Lower slowly.",
    gifAsset: gif("male-bodyweight-crunch-front"),
    gifUrl: "",
  },
  "sit up": {
    cue: "Feet anchored. Full range of motion.",
    gifAsset: gif("male-Bodyweight-situp-front"),
    gifUrl: "",
  },
  "russian twist": {
    cue: "Lean back 45\u00b0. Rotate shoulders, not just arms.",
    gifAsset: gif("male-Kettlebells-kettlebell-russian-twist-front"),
    gifUrl: "",
  },
  "mountain climber": {
    cue: "Hips level. Drive knees to chest alternately.",
    gifAsset: gif("male-Bodyweight-mountain-climber-front"),
    gifUrl: "",
  },
  "leg raise": {
    cue: "Lower back pressed to floor. Slow eccentric.",
    gifAsset: gif("male-Bodyweight-floor-incline-leg-raise-front"),
    gifUrl: "",
  },
  "hanging leg raise": {
    cue: "Hang from bar. Raise legs to 90\u00b0. Control the descent.",
    gifAsset: gif("male-bodyweight-hanging-knee-raises-front"),
    gifUrl: "",
  },
  "ab wheel rollout": {
    cue: "Core tight. Roll out slowly. Don\u2019t let hips sag.",
    gifAsset: gif("male-TRX-trx-ab-rollout-front"),
    gifUrl: "",
  },
  "bicycle crunch": {
    cue: "Elbow to opposite knee. Controlled rotation.",
    gifAsset: gif("male-Bodyweight-bicycle-crunch-front"),
    gifUrl: "",
  },
  "dead bug": {
    cue: "Lower back flat. Opposite arm and leg extend.",
    gifAsset: gif("male-Bodyweight-dead-bug-front"),
    gifUrl: "",
  },
  "cable woodchop": {
    cue: "Rotate from hips. Arms stay extended.",
    gifAsset: gif("male-cable-woodchopper-front"),
    gifUrl: "",
  },
  // ── Cardio / HIIT ─────────────────────────────────────────────────────────
  "burpee": {
    cue: "Explosive jump at top. Chest to floor at bottom.",
    gifAsset: gif("male-Bodyweight-burpee-front"),
    gifUrl: "",
  },
  "jumping jack": {
    cue: "Arms and legs in sync. Land softly.",
    gifAsset: gif("male-Cardio-cardio-jumping-jacks-front"),
    gifUrl: "",
  },
  "box jump": {
    cue: "Swing arms for momentum. Land softly with bent knees.",
    gifAsset: gif("male-Plyometrics-box-jump-front"),
    gifUrl: "",
  },
  "kettlebell swing": {
    cue: "Hip hinge, not squat. Snap hips forward explosively.",
    gifAsset: gif("male-Kettlebells-kettlebell-swing-front"),
    gifUrl: "",
  },
  "battle rope": {
    cue: "Alternate arms. Keep core tight.",
    gifAsset: gif("battle-rope"),
    gifUrl: "",
  },
  "jump rope": {
    cue: "Wrists drive the rope. Light on feet.",
    gifAsset: gif("male-Cardio-jump-rope-front"),
    gifUrl: "",
  },
  "high knees": {
    cue: "Drive knees to hip height. Pump arms.",
    gifAsset: gif("high-knees"),
    gifUrl: "",
  },
  "sprint": {
    cue: "Drive knees high. Pump arms. Stay on balls of feet.",
    gifAsset: gif("male-Cardio-treadmill-sprint-front"),
    gifUrl: "",
  },
};

/** Keyword fragments for partial matching */
const KEYWORD_FALLBACKS: Array<{ keywords: string[]; demo: ExerciseDemo }> = [
  { keywords: ["squat"], demo: DEMO_MAP["squat"] },
  { keywords: ["press", "bench"], demo: DEMO_MAP["bench press"] },
  { keywords: ["pull", "row"], demo: DEMO_MAP["lat pulldown"] },
  { keywords: ["curl", "bicep"], demo: DEMO_MAP["bicep curl"] },
  { keywords: ["tricep", "dip"], demo: DEMO_MAP["tricep pushdown"] },
  { keywords: ["lunge"], demo: DEMO_MAP["lunge"] },
  { keywords: ["deadlift"], demo: DEMO_MAP["deadlift"] },
  { keywords: ["plank", "core"], demo: DEMO_MAP["plank"] },
  { keywords: ["push"], demo: DEMO_MAP["push up"] },
  { keywords: ["shoulder", "raise"], demo: DEMO_MAP["lateral raise"] },
  { keywords: ["run", "jog", "sprint", "cardio"], demo: DEMO_MAP["jumping jack"] },
  { keywords: ["fly", "flye"], demo: DEMO_MAP["dumbbell fly"] },
  { keywords: ["crunch", "sit"], demo: DEMO_MAP["crunch"] },
  { keywords: ["calf"], demo: DEMO_MAP["calf raise"] },
  { keywords: ["glute", "hip"], demo: DEMO_MAP["hip thrust"] },
  { keywords: ["swing", "kettle"], demo: DEMO_MAP["kettlebell swing"] },
];

/** Generic fallback for unknown exercises */
const GENERIC_DEMO: ExerciseDemo = {
  cue: "Maintain proper form throughout. Control the movement.",
  gifAsset: gif("male-bodyweight-push-up-front"),
  gifUrl: "",
};

/**
 * Look up a demo for an exercise by name.
 * Returns a form cue and local GIF asset for the exercise.
 */
export function getExerciseDemo(exerciseName: string): ExerciseDemo {
  const norm = normaliseExerciseName(exerciseName);

  // Exact match
  if (DEMO_MAP[norm]) return DEMO_MAP[norm];

  // Partial keyword match
  for (const { keywords, demo } of KEYWORD_FALLBACKS) {
    if (keywords.some(kw => norm.includes(kw))) return demo;
  }

  // Fallback
  return GENERIC_DEMO;
}
