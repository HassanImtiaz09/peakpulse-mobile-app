/**
 * Exercise Demo Video Library
 *
 * Maps common exercise names to specific YouTube video IDs for in-app playback.
 * Each exercise has a curated tutorial video from a top fitness creator.
 */

export interface ExerciseDemo {
  /** YouTube video ID for in-app embedded playback */
  videoId: string;
  /** Short cue text shown below the video */
  cue: string;
}

/** Normalise an exercise name for lookup */
export function normaliseExerciseName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
}

/**
 * Primary lookup map: normalised exercise name → demo
 * Curated YouTube video IDs for 70+ exercises, grouped by muscle group.
 */
const DEMO_MAP: Record<string, ExerciseDemo> = {
  // ── Chest ─────────────────────────────────────────────────────────────────
  "bench press": {
    videoId: "hWbUlkb5Ms4",
    cue: "Keep shoulder blades retracted. Bar touches mid-chest.",
  },
  "push up": {
    videoId: "_YrJc-kTYA0",
    cue: "Straight body line. Lower until chest nearly touches floor.",
  },
  "push-up": {
    videoId: "_YrJc-kTYA0",
    cue: "Straight body line. Lower until chest nearly touches floor.",
  },
  "pushup": {
    videoId: "_YrJc-kTYA0",
    cue: "Straight body line. Lower until chest nearly touches floor.",
  },
  "dumbbell fly": {
    videoId: "QENKPHhQVi4",
    cue: "Slight elbow bend throughout. Squeeze chest at top.",
  },
  "dumbbell flye": {
    videoId: "QENKPHhQVi4",
    cue: "Slight elbow bend throughout. Squeeze chest at top.",
  },
  "incline bench press": {
    videoId: "98HWfiRonkE",
    cue: "30-45° incline. Drive bar in a slight arc to upper chest.",
  },
  "incline dumbbell press": {
    videoId: "8fXfwG4ftaQ",
    cue: "30-45° incline. Press dumbbells up and slightly inward.",
  },
  "decline bench press": {
    videoId: "6fotcWsMb0c",
    cue: "Slight decline. Bar to lower chest. Controlled movement.",
  },
  "cable fly": {
    videoId: "M97ra0UR-40",
    cue: "Hinge forward slightly. Bring hands together in an arc.",
  },
  "cable crossover": {
    videoId: "JUDTGZh4rhg",
    cue: "Step forward. Squeeze chest as hands cross at bottom.",
  },
  "dip": {
    videoId: "yN6Q1UI_xkE",
    cue: "Lean forward for chest. Lower until elbows reach 90°.",
  },
  "chest dip": {
    videoId: "yN6Q1UI_xkE",
    cue: "Lean forward for chest. Lower until elbows reach 90°.",
  },
  // ── Back ──────────────────────────────────────────────────────────────────
  "pull up": {
    videoId: "bxguzp1DCFw",
    cue: "Full hang at bottom. Drive elbows down to pull up.",
  },
  "pull-up": {
    videoId: "bxguzp1DCFw",
    cue: "Full hang at bottom. Drive elbows down to pull up.",
  },
  "pullup": {
    videoId: "bxguzp1DCFw",
    cue: "Full hang at bottom. Drive elbows down to pull up.",
  },
  "chin up": {
    videoId: "e1YSApl-QcM",
    cue: "Supinated grip. Chin clears bar at top.",
  },
  "chin-up": {
    videoId: "e1YSApl-QcM",
    cue: "Supinated grip. Chin clears bar at top.",
  },
  "lat pulldown": {
    videoId: "SALxEARiMkw",
    cue: "Lean back slightly. Pull bar to upper chest.",
  },
  "bent over row": {
    videoId: "qXrTDQG1oUQ",
    cue: "Hinge at hips, back flat. Pull bar to lower rib cage.",
  },
  "barbell row": {
    videoId: "qXrTDQG1oUQ",
    cue: "Hinge at hips, back flat. Pull bar to lower rib cage.",
  },
  "dumbbell row": {
    videoId: "gfUg6qWohTk",
    cue: "One arm on bench. Pull to hip, squeeze lat at top.",
  },
  "seated cable row": {
    videoId: "vwHG9Jfu4sw",
    cue: "Tall posture. Pull handle to navel, squeeze shoulder blades.",
  },
  "cable row": {
    videoId: "vwHG9Jfu4sw",
    cue: "Tall posture. Pull handle to navel, squeeze shoulder blades.",
  },
  "deadlift": {
    videoId: "ZaTM37cfiDs",
    cue: "Bar over mid-foot. Hinge hips back, keep back neutral.",
  },
  "t-bar row": {
    videoId: "TyLoy3n_a10",
    cue: "Chest on pad. Pull to chest, squeeze shoulder blades.",
  },
  "pendlay row": {
    videoId: "h4nkoayPFWw",
    cue: "Bar returns to floor each rep. Explosive pull.",
  },
  // ── Shoulders ─────────────────────────────────────────────────────────────
  "overhead press": {
    videoId: "zoN5EH50Dro",
    cue: "Brace core. Press bar in a straight line overhead.",
  },
  "shoulder press": {
    videoId: "zoN5EH50Dro",
    cue: "Elbows at 90° at bottom. Full extension at top.",
  },
  "military press": {
    videoId: "zoN5EH50Dro",
    cue: "Strict press. No leg drive. Bar overhead.",
  },
  "dumbbell shoulder press": {
    videoId: "E9ShwbwZ1zw",
    cue: "Press dumbbells up and slightly inward. Full lockout.",
  },
  "lateral raise": {
    videoId: "JMt_uxE8bBc",
    cue: "Slight forward lean. Raise to shoulder height, pinky up.",
  },
  "side lateral raise": {
    videoId: "JMt_uxE8bBc",
    cue: "Slight forward lean. Raise to shoulder height, pinky up.",
  },
  "front raise": {
    videoId: "4HXCYnztyh8",
    cue: "Controlled raise to eye level. Lower slowly.",
  },
  "face pull": {
    videoId: "8686PLZB_1Q",
    cue: "Pull rope to face. Elbows high and wide at end.",
  },
  "rear delt fly": {
    videoId: "LsT-bR_zxLo",
    cue: "Bent over. Raise arms to sides, squeeze rear delts.",
  },
  "arnold press": {
    videoId: "6K_N9AGhItQ",
    cue: "Rotate palms from facing you to facing forward as you press.",
  },
  "upright row": {
    videoId: "jaAV-rD45I0",
    cue: "Pull bar to chin. Elbows lead the movement.",
  },
  "shrug": {
    videoId: "0Jmi-byV8ns",
    cue: "Straight up, hold at top. No rolling.",
  },
  // ── Arms ──────────────────────────────────────────────────────────────────
  "bicep curl": {
    videoId: "VCw_uIxW8WE",
    cue: "Elbows fixed at sides. Full range of motion.",
  },
  "biceps curl": {
    videoId: "VCw_uIxW8WE",
    cue: "Elbows fixed at sides. Full range of motion.",
  },
  "barbell curl": {
    videoId: "N6paU6TGFWU",
    cue: "Elbows fixed at sides. Squeeze at top.",
  },
  "dumbbell curl": {
    videoId: "XE_pHwbst04",
    cue: "Alternate or together. Full supination at top.",
  },
  "hammer curl": {
    videoId: "BRVDS6HVR9Q",
    cue: "Neutral grip throughout. Controlled eccentric.",
  },
  "preacher curl": {
    videoId: "Htw-s61mOw0",
    cue: "Arms on pad. Full stretch at bottom, squeeze at top.",
  },
  "concentration curl": {
    videoId: "cHxRJdSVIkA",
    cue: "Elbow on inner thigh. Isolate the bicep.",
  },
  "tricep pushdown": {
    videoId: "-zLyUAo1gMw",
    cue: "Elbows pinned to sides. Full extension at bottom.",
  },
  "tricep extension": {
    videoId: "b5le--KkyH0",
    cue: "Elbows point to ceiling. Full stretch and extension.",
  },
  "overhead tricep extension": {
    videoId: "b5le--KkyH0",
    cue: "Elbows close to head. Full stretch behind head.",
  },
  "tricep dip": {
    videoId: "yN6Q1UI_xkE",
    cue: "Upright torso for triceps. Lower until elbows reach 90°.",
  },
  "skull crusher": {
    videoId: "D1y1-sXZDA0",
    cue: "Elbows point to ceiling. Lower bar to forehead slowly.",
  },
  "close grip bench press": {
    videoId: "vEUyEOVn3yM",
    cue: "Hands shoulder-width. Elbows close to body.",
  },
  // ── Legs ──────────────────────────────────────────────────────────────────
  "squat": {
    videoId: "MLoZuAkIyZI",
    cue: "Feet shoulder-width. Knees track toes. Depth to parallel.",
  },
  "back squat": {
    videoId: "MLoZuAkIyZI",
    cue: "Bar on traps. Brace core. Drive through heels.",
  },
  "barbell squat": {
    videoId: "MLoZuAkIyZI",
    cue: "Bar on traps. Brace core. Drive through heels.",
  },
  "front squat": {
    videoId: "nmUof3vszxM",
    cue: "Elbows high. Bar on front delts. Upright torso.",
  },
  "goblet squat": {
    videoId: "lRYBbchqxtI",
    cue: "Hold dumbbell at chest. Elbows inside knees at bottom.",
  },
  "bulgarian split squat": {
    videoId: "uODWo4YqbT8",
    cue: "Rear foot on bench. Front knee over ankle.",
  },
  "lunge": {
    videoId: "1cS-6KsJW9g",
    cue: "Step forward. Back knee hovers above floor.",
  },
  "walking lunge": {
    videoId: "1cS-6KsJW9g",
    cue: "Continuous forward motion. Upright torso.",
  },
  "reverse lunge": {
    videoId: "mzPFverp8tM",
    cue: "Step backward. Front knee stays over ankle.",
  },
  "leg press": {
    videoId: "nDh_BlnLCGc",
    cue: "Feet hip-width. Don't lock knees at top.",
  },
  "leg curl": {
    videoId: "_lgE0gPvbik",
    cue: "Curl heels to glutes. Slow eccentric.",
  },
  "hamstring curl": {
    videoId: "_lgE0gPvbik",
    cue: "Curl heels to glutes. Slow eccentric.",
  },
  "leg extension": {
    videoId: "uM86QE59Tgc",
    cue: "Full extension at top. Pause 1 second.",
  },
  "romanian deadlift": {
    videoId: "5zmlnbWb-g4",
    cue: "Hinge at hips. Bar stays close to legs. Feel hamstring stretch.",
  },
  "stiff leg deadlift": {
    videoId: "CN_7cz3P-1U",
    cue: "Minimal knee bend. Hinge at hips. Stretch hamstrings.",
  },
  "sumo deadlift": {
    videoId: "e7oLkRlT2CQ",
    cue: "Wide stance. Toes out. Drive hips forward.",
  },
  "hip thrust": {
    videoId: "pF17m_CXfL0",
    cue: "Shoulders on bench. Drive hips up. Squeeze glutes at top.",
  },
  "glute bridge": {
    videoId: "OUgsJ8-Vi0E",
    cue: "Feet flat on floor. Drive hips up. Squeeze glutes.",
  },
  "calf raise": {
    videoId: "baEXLy09Ncc",
    cue: "Full stretch at bottom. Full contraction at top.",
  },
  "standing calf raise": {
    videoId: "baEXLy09Ncc",
    cue: "Full stretch at bottom. Full contraction at top.",
  },
  "seated calf raise": {
    videoId: "ORY-ke6vcgk",
    cue: "Knees at 90°. Full range of motion.",
  },
  "hack squat": {
    videoId: "g9i05umL5vc",
    cue: "Shoulders against pad. Feet forward. Full depth.",
  },
  "step up": {
    videoId: "8q9LVgN2RD4",
    cue: "Drive through front heel. Full extension at top.",
  },
  // ── Core ──────────────────────────────────────────────────────────────────
  "plank": {
    videoId: "v25dawSzRTM",
    cue: "Straight line from head to heels. Don't let hips sag.",
  },
  "side plank": {
    videoId: "BFOyHDlY2UE",
    cue: "Stack feet. Hips up. Straight line from head to feet.",
  },
  "crunch": {
    videoId: "MKmrqcoCZ-M",
    cue: "Curl shoulders off floor. Lower slowly.",
  },
  "sit up": {
    videoId: "MKmrqcoCZ-M",
    cue: "Feet anchored. Full range of motion.",
  },
  "russian twist": {
    videoId: "9V9csctSKj0",
    cue: "Lean back 45°. Rotate shoulders, not just arms.",
  },
  "mountain climber": {
    videoId: "7W4JEfEKuC4",
    cue: "Hips level. Drive knees to chest alternately.",
  },
  "leg raise": {
    videoId: "2n4UqRIJyk4",
    cue: "Lower back pressed to floor. Slow eccentric.",
  },
  "hanging leg raise": {
    videoId: "2n4UqRIJyk4",
    cue: "Hang from bar. Raise legs to 90°. Control the descent.",
  },
  "ab wheel rollout": {
    videoId: "9ZCoAbI7uX0",
    cue: "Core tight. Roll out slowly. Don't let hips sag.",
  },
  "bicycle crunch": {
    videoId: "PAEo-zRSanM",
    cue: "Elbow to opposite knee. Controlled rotation.",
  },
  "dead bug": {
    videoId: "Aoipu_fl3HA",
    cue: "Lower back flat. Opposite arm and leg extend.",
  },
  "cable woodchop": {
    videoId: "ZDt4MCvjMAA",
    cue: "Rotate from hips. Arms stay extended.",
  },
  // ── Cardio / HIIT ─────────────────────────────────────────────────────────
  "burpee": {
    videoId: "G2hv_NYhM-A",
    cue: "Explosive jump at top. Chest to floor at bottom.",
  },
  "jumping jack": {
    videoId: "uLVt6u15L98",
    cue: "Arms and legs in sync. Land softly.",
  },
  "box jump": {
    videoId: "HJZh-12p6vg",
    cue: "Swing arms for momentum. Land softly with bent knees.",
  },
  "kettlebell swing": {
    videoId: "aSYap2yhW8s",
    cue: "Hip hinge, not squat. Snap hips forward explosively.",
  },
  "battle rope": {
    videoId: "pQb2xIGioyQ",
    cue: "Alternate arms. Keep core tight.",
  },
  "jump rope": {
    videoId: "vEJ7XbbAMAg",
    cue: "Wrists drive the rope. Light on feet.",
  },
  "high knees": {
    videoId: "WrKc4YsgAEA",
    cue: "Drive knees to hip height. Pump arms.",
  },
  "sprint": {
    videoId: "6m_fjNhRhkY",
    cue: "Drive knees high. Pump arms. Stay on balls of feet.",
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
  videoId: "MLoZuAkIyZI",
  cue: "Maintain proper form throughout. Control the movement.",
};

/**
 * Look up a demo for an exercise by name.
 * Returns a YouTube video ID and form cue for the exercise.
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
