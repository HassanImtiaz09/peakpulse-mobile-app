/**
 * Exercise Demo Video Library
 *
 * Maps common exercise names to MuscleWiki video URLs for accurate exercise demos.
 * Each exercise has professionally filmed front-view MP4 video from MuscleWiki.
 * The gifUrl field is kept for backward compatibility but now contains MP4 URLs.
 */

export interface ExerciseDemo {
  /** Short cue text shown below the video */
  cue: string;
  /** Video/GIF URL for exercise guidance (MuscleWiki MP4 or fallback GIF) */
  gifUrl: string;
}

/** Normalise an exercise name for lookup */
export function normaliseExerciseName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
}

/**
 * Primary lookup map: normalised exercise name → demo
 * Curated MuscleWiki video URLs for 80+ exercises.
 */
const DEMO_MAP: Record<string, ExerciseDemo> = {
  // ── Chest ─────────────────────────────────────────────────────────────────
  "bench press": {
    cue: "Keep shoulder blades retracted. Bar touches mid-chest.",
    gifUrl: "https://api.musclewiki.com/stream/videos/branded/male-barbell-bench-press-front.mp4",
  },
  "push up": {
    cue: "Straight body line. Lower until chest nearly touches floor.",
    gifUrl: "https://api.musclewiki.com/stream/videos/branded/male-bodyweight-push-up-front.mp4",
  },
  "push-up": {
    cue: "Straight body line. Lower until chest nearly touches floor.",
    gifUrl: "https://api.musclewiki.com/stream/videos/branded/male-bodyweight-push-up-front.mp4",
  },
  "pushup": {
    cue: "Straight body line. Lower until chest nearly touches floor.",
    gifUrl: "https://api.musclewiki.com/stream/videos/branded/male-bodyweight-push-up-front.mp4",
  },
  "dumbbell fly": {
    cue: "Slight elbow bend throughout. Squeeze chest at top.",
    gifUrl: "https://api.musclewiki.com/stream/videos/branded/male-dumbbell-chest-fly-front.mp4",
  },
  "dumbbell flye": {
    cue: "Slight elbow bend throughout. Squeeze chest at top.",
    gifUrl: "https://api.musclewiki.com/stream/videos/branded/male-dumbbell-chest-fly-front.mp4",
  },
  "incline bench press": {
    cue: "30-45° incline. Drive bar in a slight arc to upper chest.",
    gifUrl: "https://api.musclewiki.com/stream/videos/branded/male-Barbell-barbell-incline-bench-press-front.mp4",
  },
  "incline dumbbell press": {
    cue: "30-45° incline. Press dumbbells up and slightly inward.",
    gifUrl: "https://api.musclewiki.com/stream/videos/branded/male-dumbbell-incline-bench-press-front.mp4",
  },
  "decline bench press": {
    cue: "Slight decline. Bar to lower chest. Controlled movement.",
    gifUrl: "https://api.musclewiki.com/stream/videos/branded/male-dumbbell-decline-bench-press-front.mp4",
  },
  "cable fly": {
    cue: "Hinge forward slightly. Bring hands together in an arc.",
    gifUrl: "https://api.musclewiki.com/stream/videos/branded/male-cable-pec-fly-front.mp4",
  },
  "cable crossover": {
    cue: "Step forward. Squeeze chest as hands cross at bottom.",
    gifUrl: "https://api.musclewiki.com/stream/videos/branded/male-cable-pec-fly-front.mp4",
  },
  "dip": {
    cue: "Lean forward for chest. Lower until elbows reach 90°.",
    gifUrl: "https://api.musclewiki.com/stream/videos/branded/male-Dumbbells-dumbbell-weighted-dip-front.mp4",
  },
  "chest dip": {
    cue: "Lean forward for chest. Lower until elbows reach 90°.",
    gifUrl: "https://api.musclewiki.com/stream/videos/branded/male-Dumbbells-dumbbell-weighted-dip-front.mp4",
  },
  // ── Back ──────────────────────────────────────────────────────────────────
  "pull up": {
    cue: "Full hang at bottom. Drive elbows down to pull up.",
    gifUrl: "https://api.musclewiki.com/stream/videos/branded/male-bodyweight-pull-ups-front.mp4",
  },
  "pull-up": {
    cue: "Full hang at bottom. Drive elbows down to pull up.",
    gifUrl: "https://api.musclewiki.com/stream/videos/branded/male-bodyweight-pull-ups-front.mp4",
  },
  "pullup": {
    cue: "Full hang at bottom. Drive elbows down to pull up.",
    gifUrl: "https://api.musclewiki.com/stream/videos/branded/male-bodyweight-pull-ups-front.mp4",
  },
  "chin up": {
    cue: "Supinated grip. Chin clears bar at top.",
    gifUrl: "https://api.musclewiki.com/stream/videos/branded/male-bodyweight-chin-ups-front.mp4",
  },
  "chin-up": {
    cue: "Supinated grip. Chin clears bar at top.",
    gifUrl: "https://api.musclewiki.com/stream/videos/branded/male-bodyweight-chin-ups-front.mp4",
  },
  "lat pulldown": {
    cue: "Lean back slightly. Pull bar to upper chest.",
    gifUrl: "https://api.musclewiki.com/stream/videos/branded/male-machine-pulldown-front.mp4",
  },
  "bent over row": {
    cue: "Hinge at hips, back flat. Pull bar to lower rib cage.",
    gifUrl: "https://api.musclewiki.com/stream/videos/branded/male-Barbell-barbell-bent-over-row-front.mp4",
  },
  "barbell row": {
    cue: "Hinge at hips, back flat. Pull bar to lower rib cage.",
    gifUrl: "https://api.musclewiki.com/stream/videos/branded/male-Barbell-barbell-bent-over-row-front.mp4",
  },
  "dumbbell row": {
    cue: "One arm on bench. Pull to hip, squeeze lat at top.",
    gifUrl: "https://api.musclewiki.com/stream/videos/branded/male-dumbbell-row-bilateral-front.mp4",
  },
  "seated cable row": {
    cue: "Tall posture. Pull handle to navel, squeeze shoulder blades.",
    gifUrl: "https://api.musclewiki.com/stream/videos/branded/male-machine-seated-cable-row-front.mp4",
  },
  "cable row": {
    cue: "Tall posture. Pull handle to navel, squeeze shoulder blades.",
    gifUrl: "https://api.musclewiki.com/stream/videos/branded/male-machine-seated-cable-row-front.mp4",
  },
  "deadlift": {
    cue: "Bar over mid-foot. Hinge hips back, keep back neutral.",
    gifUrl: "https://api.musclewiki.com/stream/videos/branded/male-Barbell-barbell-deadlift-front.mp4",
  },
  "t-bar row": {
    cue: "Chest on pad. Pull to chest, squeeze shoulder blades.",
    gifUrl: "https://api.musclewiki.com/stream/videos/branded/male-Barbell-landmine-t-bar-rows-front.mp4",
  },
  "tbar row": {
    cue: "Chest on pad. Pull to chest, squeeze shoulder blades.",
    gifUrl: "https://api.musclewiki.com/stream/videos/branded/male-Barbell-landmine-t-bar-rows-front.mp4",
  },
  "pendlay row": {
    cue: "Bar returns to floor each rep. Explosive pull.",
    gifUrl: "https://api.musclewiki.com/stream/videos/branded/male-Dumbbells-dumbbell-pendlay-row-front.mp4",
  },
  // ── Shoulders ─────────────────────────────────────────────────────────────
  "overhead press": {
    cue: "Brace core. Press bar in a straight line overhead.",
    gifUrl: "https://api.musclewiki.com/stream/videos/branded/male-Barbell-barbell-overhead-press-front.mp4",
  },
  "shoulder press": {
    cue: "Elbows at 90° at bottom. Full extension at top.",
    gifUrl: "https://api.musclewiki.com/stream/videos/branded/male-Dumbbells-dumbbell-overhead-press-front.mp4",
  },
  "military press": {
    cue: "Strict press. No leg drive. Bar overhead.",
    gifUrl: "https://api.musclewiki.com/stream/videos/branded/male-Barbell-barbell-overhead-press-front.mp4",
  },
  "dumbbell shoulder press": {
    cue: "Press dumbbells up and slightly inward. Full lockout.",
    gifUrl: "https://api.musclewiki.com/stream/videos/branded/male-Dumbbells-dumbbell-overhead-press-front.mp4",
  },
  "lateral raise": {
    cue: "Slight forward lean. Raise to shoulder height, pinky up.",
    gifUrl: "https://api.musclewiki.com/stream/videos/branded/male-dumbbell-lateral-raise-front.mp4",
  },
  "side lateral raise": {
    cue: "Slight forward lean. Raise to shoulder height, pinky up.",
    gifUrl: "https://api.musclewiki.com/stream/videos/branded/male-dumbbell-lateral-raise-front.mp4",
  },
  "front raise": {
    cue: "Controlled raise to eye level. Lower slowly.",
    gifUrl: "https://api.musclewiki.com/stream/videos/branded/male-dumbbell-front-raise-front.mp4",
  },
  "face pull": {
    cue: "Pull rope to face. Elbows high and wide at end.",
    gifUrl: "https://api.musclewiki.com/stream/videos/branded/male-Cable-cable-rope-face-pulls-front.mp4",
  },
  "rear delt fly": {
    cue: "Bent over. Raise arms to sides, squeeze rear delts.",
    gifUrl: "https://api.musclewiki.com/stream/videos/branded/male-dumbbell-rear-delt-fly-front.mp4",
  },
  "arnold press": {
    cue: "Rotate palms from facing you to facing forward as you press.",
    gifUrl: "https://api.musclewiki.com/stream/videos/branded/male-Dumbbells-dumbbell-arnold-press-front.mp4",
  },
  "upright row": {
    cue: "Pull bar to chin. Elbows lead the movement.",
    gifUrl: "https://api.musclewiki.com/stream/videos/branded/male-Kettlebells-kettlebell-upright-row-front.mp4",
  },
  "shrug": {
    cue: "Straight up, hold at top. No rolling.",
    gifUrl: "https://api.musclewiki.com/stream/videos/branded/male-Dumbbells-dumbbell-shrug-front.mp4",
  },
  // ── Arms ──────────────────────────────────────────────────────────────────
  "bicep curl": {
    cue: "Elbows fixed at sides. Full range of motion.",
    gifUrl: "https://api.musclewiki.com/stream/videos/branded/male-Dumbbells-dumbbell-curl-front.mp4",
  },
  "biceps curl": {
    cue: "Elbows fixed at sides. Full range of motion.",
    gifUrl: "https://api.musclewiki.com/stream/videos/branded/male-Dumbbells-dumbbell-curl-front.mp4",
  },
  "barbell curl": {
    cue: "Elbows fixed at sides. Squeeze at top.",
    gifUrl: "https://api.musclewiki.com/stream/videos/branded/male-Barbell-barbell-curl-front.mp4",
  },
  "dumbbell curl": {
    cue: "Alternate or together. Full supination at top.",
    gifUrl: "https://api.musclewiki.com/stream/videos/branded/male-Dumbbells-dumbbell-curl-front.mp4",
  },
  "hammer curl": {
    cue: "Neutral grip throughout. Controlled eccentric.",
    gifUrl: "https://api.musclewiki.com/stream/videos/branded/male-dumbbell-hammer-curl-front.mp4",
  },
  "preacher curl": {
    cue: "Arms on pad. Full stretch at bottom, squeeze at top.",
    gifUrl: "https://api.musclewiki.com/stream/videos/branded/male-Dumbbells-dumbbell-preacher-curl-front.mp4",
  },
  "concentration curl": {
    cue: "Elbow on inner thigh. Isolate the bicep.",
    gifUrl: "https://api.musclewiki.com/stream/videos/branded/male-dumbbell-concentration-curl-front.mp4",
  },
  "tricep pushdown": {
    cue: "Elbows pinned to sides. Full extension at bottom.",
    gifUrl: "https://api.musclewiki.com/stream/videos/branded/male-Machine-machine-tricep-pushdown-front.mp4",
  },
  "tricep extension": {
    cue: "Elbows point to ceiling. Full stretch and extension.",
    gifUrl: "https://api.musclewiki.com/stream/videos/branded/male-Bodyweight-bodyweight-tricep-extension-front.mp4",
  },
  "overhead tricep extension": {
    cue: "Elbows close to head. Full stretch behind head.",
    gifUrl: "https://api.musclewiki.com/stream/videos/branded/male-Bands-band-overhead-tricep-extension-front.mp4",
  },
  "tricep dip": {
    cue: "Upright torso for triceps. Lower until elbows reach 90°.",
    gifUrl: "https://api.musclewiki.com/stream/videos/branded/male-bodyweight-bench-dips-front.mp4",
  },
  "skull crusher": {
    cue: "Elbows point to ceiling. Lower bar to forehead slowly.",
    gifUrl: "https://api.musclewiki.com/stream/videos/branded/male-Kettlebells-kettlebell-skull-crusher-front.mp4",
  },
  "close grip bench press": {
    cue: "Hands shoulder-width. Elbows close to body.",
    gifUrl: "https://api.musclewiki.com/stream/videos/branded/male-Barbell-barbell-close-grip-bench-press-front.mp4",
  },
  // ── Legs ──────────────────────────────────────────────────────────────────
  "squat": {
    cue: "Feet shoulder-width. Knees track toes. Depth to parallel.",
    gifUrl: "https://api.musclewiki.com/stream/videos/branded/male-Barbell-barbell-squat-front.mp4",
  },
  "back squat": {
    cue: "Bar on traps. Brace core. Drive through heels.",
    gifUrl: "https://api.musclewiki.com/stream/videos/branded/male-Barbell-barbell-squat-front.mp4",
  },
  "barbell squat": {
    cue: "Bar on traps. Brace core. Drive through heels.",
    gifUrl: "https://api.musclewiki.com/stream/videos/branded/male-Barbell-barbell-squat-front.mp4",
  },
  "front squat": {
    cue: "Elbows high. Bar on front delts. Upright torso.",
    gifUrl: "https://api.musclewiki.com/stream/videos/branded/male-Barbell-barbell-front-squat-olympic-front.mp4",
  },
  "goblet squat": {
    cue: "Hold dumbbell at chest. Elbows inside knees at bottom.",
    gifUrl: "https://api.musclewiki.com/stream/videos/branded/male-dumbbell-goblet-squat-front.mp4",
  },
  "bulgarian split squat": {
    cue: "Rear foot on bench. Front knee over ankle.",
    gifUrl: "https://api.musclewiki.com/stream/videos/branded/male-bodyweight-bulgarian-split-squat-front.mp4",
  },
  "lunge": {
    cue: "Step forward. Back knee hovers above floor.",
    gifUrl: "https://api.musclewiki.com/stream/videos/branded/male-bodyweight-forward-lunge-front_zb4K50d.mp4",
  },
  "walking lunge": {
    cue: "Continuous forward motion. Upright torso.",
    gifUrl: "https://api.musclewiki.com/stream/videos/branded/male-Bodyweight-walking-lunge-front.mp4",
  },
  "reverse lunge": {
    cue: "Step backward. Front knee stays over ankle.",
    gifUrl: "https://api.musclewiki.com/stream/videos/branded/male-Barbell-barbell-reverse-lunge-front.mp4",
  },
  "leg press": {
    cue: "Feet hip-width. Don\u2019t lock knees at top.",
    gifUrl: "https://api.musclewiki.com/stream/videos/branded/male-machine-leg-press-front.mp4",
  },
  "leg curl": {
    cue: "Curl heels to glutes. Slow eccentric.",
    gifUrl: "https://api.musclewiki.com/stream/videos/branded/male-Dumbbells-dumbbell-leg-curl-front.mp4",
  },
  "hamstring curl": {
    cue: "Curl heels to glutes. Slow eccentric.",
    gifUrl: "https://api.musclewiki.com/stream/videos/branded/male-Dumbbells-dumbbell-leg-curl-front.mp4",
  },
  "leg extension": {
    cue: "Full extension at top. Pause 1 second.",
    gifUrl: "https://api.musclewiki.com/stream/videos/branded/male-machine-leg-extension-front.mp4",
  },
  "romanian deadlift": {
    cue: "Hinge at hips. Bar stays close to legs. Feel hamstring stretch.",
    gifUrl: "https://api.musclewiki.com/stream/videos/branded/male-Barbell-barbell-romanian-deadlift-front.mp4",
  },
  "stiff leg deadlift": {
    cue: "Minimal knee bend. Hinge at hips. Stretch hamstrings.",
    gifUrl: "https://api.musclewiki.com/stream/videos/branded/male-barbell-stiff-leg-deadlift-front.mp4",
  },
  "sumo deadlift": {
    cue: "Wide stance. Toes out. Drive hips forward.",
    gifUrl: "https://api.musclewiki.com/stream/videos/branded/male-Barbell-barbell-sumo-deadlift-front.mp4",
  },
  "hip thrust": {
    cue: "Shoulders on bench. Drive hips up. Squeeze glutes at top.",
    gifUrl: "https://api.musclewiki.com/stream/videos/branded/male-Barbell-barbell-hip-thrust-front.mp4",
  },
  "glute bridge": {
    cue: "Feet flat on floor. Drive hips up. Squeeze glutes.",
    gifUrl: "https://api.musclewiki.com/stream/videos/branded/male-bodyweight-glute-bridge-front.mp4",
  },
  "calf raise": {
    cue: "Full stretch at bottom. Full contraction at top.",
    gifUrl: "https://api.musclewiki.com/stream/videos/branded/male-machine-standing-calf-raises-front.mp4",
  },
  "standing calf raise": {
    cue: "Full stretch at bottom. Full contraction at top.",
    gifUrl: "https://api.musclewiki.com/stream/videos/branded/male-machine-standing-calf-raises-front.mp4",
  },
  "seated calf raise": {
    cue: "Knees at 90°. Full range of motion.",
    gifUrl: "https://api.musclewiki.com/stream/videos/branded/male-Kettlebells-kettlebell-seated-calf-raise-front.mp4",
  },
  "hack squat": {
    cue: "Shoulders against pad. Feet forward. Full depth.",
    gifUrl: "https://api.musclewiki.com/stream/videos/branded/male-Machine-machine-hack-squat-front.mp4",
  },
  "step up": {
    cue: "Drive through front heel. Full extension at top.",
    gifUrl: "https://api.musclewiki.com/stream/videos/branded/male-Kettlebells-kettlebell-step-up-front.mp4",
  },
  // ── Core ──────────────────────────────────────────────────────────────────
  "plank": {
    cue: "Straight line from head to heels. Don\u2019t let hips sag.",
    gifUrl: "https://api.musclewiki.com/stream/videos/branded/male-bodyweight-forearm-plank-front.mp4",
  },
  "side plank": {
    cue: "Stack feet. Hips up. Straight line from head to feet.",
    gifUrl: "https://api.musclewiki.com/stream/videos/branded/male-Bodyweight-elbow-side-plank-front.mp4",
  },
  "crunch": {
    cue: "Curl shoulders off floor. Lower slowly.",
    gifUrl: "https://api.musclewiki.com/stream/videos/branded/male-bodyweight-crunch-front.mp4",
  },
  "sit up": {
    cue: "Feet anchored. Full range of motion.",
    gifUrl: "https://api.musclewiki.com/stream/videos/branded/male-Bodyweight-situp-front.mp4",
  },
  "russian twist": {
    cue: "Lean back 45°. Rotate shoulders, not just arms.",
    gifUrl: "https://api.musclewiki.com/stream/videos/branded/male-Kettlebells-kettlebell-russian-twist-front.mp4",
  },
  "mountain climber": {
    cue: "Hips level. Drive knees to chest alternately.",
    gifUrl: "https://api.musclewiki.com/stream/videos/branded/male-Bodyweight-mountain-climber-front.mp4",
  },
  "leg raise": {
    cue: "Lower back pressed to floor. Slow eccentric.",
    gifUrl: "https://api.musclewiki.com/stream/videos/branded/male-Bodyweight-floor-incline-leg-raise-front.mp4",
  },
  "hanging leg raise": {
    cue: "Hang from bar. Raise legs to 90°. Control the descent.",
    gifUrl: "https://api.musclewiki.com/stream/videos/branded/male-bodyweight-hanging-knee-raises-front.mp4",
  },
  "ab wheel rollout": {
    cue: "Core tight. Roll out slowly. Don\u2019t let hips sag.",
    gifUrl: "https://api.musclewiki.com/stream/videos/branded/male-TRX-trx-ab-rollout-front.mp4",
  },
  "bicycle crunch": {
    cue: "Elbow to opposite knee. Controlled rotation.",
    gifUrl: "https://api.musclewiki.com/stream/videos/branded/male-Bodyweight-bicycle-crunch-front.mp4",
  },
  "dead bug": {
    cue: "Lower back flat. Opposite arm and leg extend.",
    gifUrl: "https://api.musclewiki.com/stream/videos/branded/male-Bodyweight-dead-bug-front.mp4",
  },
  "cable woodchop": {
    cue: "Rotate from hips. Arms stay extended.",
    gifUrl: "https://api.musclewiki.com/stream/videos/branded/male-cable-woodchopper-front.mp4",
  },
  // ── Cardio / HIIT ─────────────────────────────────────────────────────────
  "burpee": {
    cue: "Explosive jump at top. Chest to floor at bottom.",
    gifUrl: "https://api.musclewiki.com/stream/videos/branded/male-Bodyweight-burpee-front.mp4",
  },
  "jumping jack": {
    cue: "Arms and legs in sync. Land softly.",
    gifUrl: "https://api.musclewiki.com/stream/videos/branded/male-Cardio-cardio-jumping-jacks-front.mp4",
  },
  "box jump": {
    cue: "Swing arms for momentum. Land softly with bent knees.",
    gifUrl: "https://api.musclewiki.com/stream/videos/branded/male-Plyometrics-box-jump-front.mp4",
  },
  "kettlebell swing": {
    cue: "Hip hinge, not squat. Snap hips forward explosively.",
    gifUrl: "https://api.musclewiki.com/stream/videos/branded/male-Kettlebells-kettlebell-swing-front.mp4",
  },
  "battle rope": {
    cue: "Alternate arms. Keep core tight.",
    gifUrl: "https://static.exercisedb.dev/media/RJa4tCo.gif",
  },
  "jump rope": {
    cue: "Wrists drive the rope. Light on feet.",
    gifUrl: "https://api.musclewiki.com/stream/videos/branded/male-Cardio-jump-rope-front.mp4",
  },
  "high knees": {
    cue: "Drive knees to hip height. Pump arms.",
    gifUrl: "https://static.exercisedb.dev/media/ealLwvX.gif",
  },
  "sprint": {
    cue: "Drive knees high. Pump arms. Stay on balls of feet.",
    gifUrl: "https://api.musclewiki.com/stream/videos/branded/male-Cardio-treadmill-sprint-front.mp4",
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
  gifUrl: "https://api.musclewiki.com/stream/videos/branded/male-bodyweight-push-up-front.mp4",
};

/**
 * Look up a demo for an exercise by name.
 * Returns a form cue and video URL for the exercise.
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
