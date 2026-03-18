/**
 * Exercise Demo Video Library
 *
 * Maps common exercise names (normalised to lowercase) to YouTube search links
 * that open the YouTube app or browser with a relevant exercise demo search.
 * This replaces broken Pixabay CDN URLs with reliable YouTube search links.
 *
 * Fallback: if no exact match, we try a partial keyword match, then fall back
 * to a generic exercise search.
 */

export interface ExerciseDemo {
  /** YouTube search URL for the exercise demo */
  youtubeUrl: string;
  /** Short cue text shown below the video */
  cue: string;
  /** Optional: direct video URL if available (for inline playback) */
  videoUrl?: string;
}

/** Normalise an exercise name for lookup */
export function normaliseExerciseName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
}

/** Build a YouTube search URL for an exercise */
function ytSearch(exercise: string): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(exercise + " form tutorial")}`;
}

/**
 * Primary lookup map: normalised exercise name → demo
 * YouTube search links for 70+ exercises, grouped by muscle group.
 */
const DEMO_MAP: Record<string, ExerciseDemo> = {
  // ── Chest ──────────────────────────────────────────────────────────────────
  "bench press": {
    youtubeUrl: ytSearch("bench press proper form"),
    cue: "Keep shoulder blades retracted. Bar touches mid-chest.",
  },
  "push up": {
    youtubeUrl: ytSearch("push up proper form"),
    cue: "Straight body line. Lower until chest nearly touches floor.",
  },
  "push-up": {
    youtubeUrl: ytSearch("push up proper form"),
    cue: "Straight body line. Lower until chest nearly touches floor.",
  },
  "pushup": {
    youtubeUrl: ytSearch("push up proper form"),
    cue: "Straight body line. Lower until chest nearly touches floor.",
  },
  "dumbbell fly": {
    youtubeUrl: ytSearch("dumbbell fly form"),
    cue: "Slight elbow bend throughout. Squeeze chest at top.",
  },
  "dumbbell flye": {
    youtubeUrl: ytSearch("dumbbell fly form"),
    cue: "Slight elbow bend throughout. Squeeze chest at top.",
  },
  "incline bench press": {
    youtubeUrl: ytSearch("incline bench press form"),
    cue: "30-45° incline. Drive bar in a slight arc to upper chest.",
  },
  "incline dumbbell press": {
    youtubeUrl: ytSearch("incline dumbbell press form"),
    cue: "30-45° incline. Press dumbbells up and slightly inward.",
  },
  "decline bench press": {
    youtubeUrl: ytSearch("decline bench press form"),
    cue: "Slight decline. Bar to lower chest. Controlled movement.",
  },
  "cable fly": {
    youtubeUrl: ytSearch("cable fly form"),
    cue: "Hinge forward slightly. Bring hands together in an arc.",
  },
  "cable crossover": {
    youtubeUrl: ytSearch("cable crossover form"),
    cue: "Step forward. Squeeze chest as hands cross at bottom.",
  },
  "dip": {
    youtubeUrl: ytSearch("chest dip form"),
    cue: "Lean forward for chest. Lower until elbows reach 90°.",
  },
  "chest dip": {
    youtubeUrl: ytSearch("chest dip form"),
    cue: "Lean forward for chest. Lower until elbows reach 90°.",
  },

  // ── Back ───────────────────────────────────────────────────────────────────
  "pull up": {
    youtubeUrl: ytSearch("pull up proper form"),
    cue: "Full hang at bottom. Drive elbows down to pull up.",
  },
  "pull-up": {
    youtubeUrl: ytSearch("pull up proper form"),
    cue: "Full hang at bottom. Drive elbows down to pull up.",
  },
  "pullup": {
    youtubeUrl: ytSearch("pull up proper form"),
    cue: "Full hang at bottom. Drive elbows down to pull up.",
  },
  "chin up": {
    youtubeUrl: ytSearch("chin up form"),
    cue: "Supinated grip. Chin clears bar at top.",
  },
  "chin-up": {
    youtubeUrl: ytSearch("chin up form"),
    cue: "Supinated grip. Chin clears bar at top.",
  },
  "lat pulldown": {
    youtubeUrl: ytSearch("lat pulldown form"),
    cue: "Lean back slightly. Pull bar to upper chest.",
  },
  "bent over row": {
    youtubeUrl: ytSearch("bent over row form"),
    cue: "Hinge at hips, back flat. Pull bar to lower rib cage.",
  },
  "barbell row": {
    youtubeUrl: ytSearch("barbell row form"),
    cue: "Hinge at hips, back flat. Pull bar to lower rib cage.",
  },
  "dumbbell row": {
    youtubeUrl: ytSearch("dumbbell row form"),
    cue: "One arm on bench. Pull to hip, squeeze lat at top.",
  },
  "seated cable row": {
    youtubeUrl: ytSearch("seated cable row form"),
    cue: "Tall posture. Pull handle to navel, squeeze shoulder blades.",
  },
  "cable row": {
    youtubeUrl: ytSearch("seated cable row form"),
    cue: "Tall posture. Pull handle to navel, squeeze shoulder blades.",
  },
  "deadlift": {
    youtubeUrl: ytSearch("deadlift proper form"),
    cue: "Bar over mid-foot. Hinge hips back, keep back neutral.",
  },
  "t-bar row": {
    youtubeUrl: ytSearch("t-bar row form"),
    cue: "Chest on pad. Pull to chest, squeeze shoulder blades.",
  },
  "pendlay row": {
    youtubeUrl: ytSearch("pendlay row form"),
    cue: "Bar returns to floor each rep. Explosive pull.",
  },

  // ── Shoulders ─────────────────────────────────────────────────────────────
  "overhead press": {
    youtubeUrl: ytSearch("overhead press form"),
    cue: "Brace core. Press bar in a straight line overhead.",
  },
  "shoulder press": {
    youtubeUrl: ytSearch("shoulder press form"),
    cue: "Elbows at 90° at bottom. Full extension at top.",
  },
  "military press": {
    youtubeUrl: ytSearch("military press form"),
    cue: "Strict press. No leg drive. Bar overhead.",
  },
  "dumbbell shoulder press": {
    youtubeUrl: ytSearch("dumbbell shoulder press form"),
    cue: "Press dumbbells up and slightly inward. Full lockout.",
  },
  "lateral raise": {
    youtubeUrl: ytSearch("lateral raise form"),
    cue: "Slight forward lean. Raise to shoulder height, pinky up.",
  },
  "side lateral raise": {
    youtubeUrl: ytSearch("lateral raise form"),
    cue: "Slight forward lean. Raise to shoulder height, pinky up.",
  },
  "front raise": {
    youtubeUrl: ytSearch("front raise form"),
    cue: "Controlled raise to eye level. Lower slowly.",
  },
  "face pull": {
    youtubeUrl: ytSearch("face pull form"),
    cue: "Pull rope to face. Elbows high and wide at end.",
  },
  "rear delt fly": {
    youtubeUrl: ytSearch("rear delt fly form"),
    cue: "Bent over. Raise arms to sides, squeeze rear delts.",
  },
  "arnold press": {
    youtubeUrl: ytSearch("arnold press form"),
    cue: "Rotate palms from facing you to facing forward as you press.",
  },
  "upright row": {
    youtubeUrl: ytSearch("upright row form"),
    cue: "Pull bar to chin. Elbows lead the movement.",
  },
  "shrug": {
    youtubeUrl: ytSearch("barbell shrug form"),
    cue: "Straight up, hold at top. No rolling.",
  },

  // ── Arms ──────────────────────────────────────────────────────────────────
  "bicep curl": {
    youtubeUrl: ytSearch("bicep curl form"),
    cue: "Elbows fixed at sides. Full range of motion.",
  },
  "biceps curl": {
    youtubeUrl: ytSearch("bicep curl form"),
    cue: "Elbows fixed at sides. Full range of motion.",
  },
  "barbell curl": {
    youtubeUrl: ytSearch("barbell curl form"),
    cue: "Elbows fixed at sides. Squeeze at top.",
  },
  "dumbbell curl": {
    youtubeUrl: ytSearch("dumbbell curl form"),
    cue: "Alternate or together. Full supination at top.",
  },
  "hammer curl": {
    youtubeUrl: ytSearch("hammer curl form"),
    cue: "Neutral grip throughout. Controlled eccentric.",
  },
  "preacher curl": {
    youtubeUrl: ytSearch("preacher curl form"),
    cue: "Arms on pad. Full stretch at bottom, squeeze at top.",
  },
  "concentration curl": {
    youtubeUrl: ytSearch("concentration curl form"),
    cue: "Elbow on inner thigh. Isolate the bicep.",
  },
  "tricep pushdown": {
    youtubeUrl: ytSearch("tricep pushdown form"),
    cue: "Elbows pinned to sides. Full extension at bottom.",
  },
  "tricep extension": {
    youtubeUrl: ytSearch("tricep extension form"),
    cue: "Elbows point to ceiling. Full stretch and extension.",
  },
  "overhead tricep extension": {
    youtubeUrl: ytSearch("overhead tricep extension form"),
    cue: "Elbows close to head. Full stretch behind head.",
  },
  "tricep dip": {
    youtubeUrl: ytSearch("tricep dip form"),
    cue: "Upright torso for triceps. Lower until elbows reach 90°.",
  },
  "skull crusher": {
    youtubeUrl: ytSearch("skull crusher form"),
    cue: "Elbows point to ceiling. Lower bar to forehead slowly.",
  },
  "close grip bench press": {
    youtubeUrl: ytSearch("close grip bench press form"),
    cue: "Hands shoulder-width. Elbows close to body.",
  },

  // ── Legs ──────────────────────────────────────────────────────────────────
  "squat": {
    youtubeUrl: ytSearch("squat proper form"),
    cue: "Feet shoulder-width. Knees track toes. Depth to parallel.",
  },
  "back squat": {
    youtubeUrl: ytSearch("back squat form"),
    cue: "Bar on traps. Brace core. Drive through heels.",
  },
  "barbell squat": {
    youtubeUrl: ytSearch("barbell squat form"),
    cue: "Bar on traps. Brace core. Drive through heels.",
  },
  "front squat": {
    youtubeUrl: ytSearch("front squat form"),
    cue: "Elbows high. Bar on front delts. Upright torso.",
  },
  "goblet squat": {
    youtubeUrl: ytSearch("goblet squat form"),
    cue: "Hold dumbbell at chest. Elbows inside knees at bottom.",
  },
  "bulgarian split squat": {
    youtubeUrl: ytSearch("bulgarian split squat form"),
    cue: "Rear foot on bench. Front knee over ankle.",
  },
  "lunge": {
    youtubeUrl: ytSearch("lunge proper form"),
    cue: "Step forward. Back knee hovers above floor.",
  },
  "walking lunge": {
    youtubeUrl: ytSearch("walking lunge form"),
    cue: "Continuous forward motion. Upright torso.",
  },
  "reverse lunge": {
    youtubeUrl: ytSearch("reverse lunge form"),
    cue: "Step backward. Front knee stays over ankle.",
  },
  "leg press": {
    youtubeUrl: ytSearch("leg press form"),
    cue: "Feet hip-width. Don't lock knees at top.",
  },
  "leg curl": {
    youtubeUrl: ytSearch("leg curl form"),
    cue: "Curl heels to glutes. Slow eccentric.",
  },
  "hamstring curl": {
    youtubeUrl: ytSearch("hamstring curl form"),
    cue: "Curl heels to glutes. Slow eccentric.",
  },
  "leg extension": {
    youtubeUrl: ytSearch("leg extension form"),
    cue: "Full extension at top. Pause 1 second.",
  },
  "romanian deadlift": {
    youtubeUrl: ytSearch("romanian deadlift form"),
    cue: "Hinge at hips. Bar stays close to legs. Feel hamstring stretch.",
  },
  "stiff leg deadlift": {
    youtubeUrl: ytSearch("stiff leg deadlift form"),
    cue: "Minimal knee bend. Hinge at hips. Stretch hamstrings.",
  },
  "sumo deadlift": {
    youtubeUrl: ytSearch("sumo deadlift form"),
    cue: "Wide stance. Toes out. Drive hips forward.",
  },
  "hip thrust": {
    youtubeUrl: ytSearch("hip thrust form"),
    cue: "Shoulders on bench. Drive hips up. Squeeze glutes at top.",
  },
  "glute bridge": {
    youtubeUrl: ytSearch("glute bridge form"),
    cue: "Feet flat on floor. Drive hips up. Squeeze glutes.",
  },
  "calf raise": {
    youtubeUrl: ytSearch("calf raise form"),
    cue: "Full stretch at bottom. Full contraction at top.",
  },
  "standing calf raise": {
    youtubeUrl: ytSearch("standing calf raise form"),
    cue: "Full stretch at bottom. Full contraction at top.",
  },
  "seated calf raise": {
    youtubeUrl: ytSearch("seated calf raise form"),
    cue: "Knees at 90°. Full range of motion.",
  },
  "hack squat": {
    youtubeUrl: ytSearch("hack squat form"),
    cue: "Shoulders against pad. Feet forward. Full depth.",
  },
  "step up": {
    youtubeUrl: ytSearch("step up exercise form"),
    cue: "Drive through front heel. Full extension at top.",
  },

  // ── Core ──────────────────────────────────────────────────────────────────
  "plank": {
    youtubeUrl: ytSearch("plank proper form"),
    cue: "Straight line from head to heels. Don't let hips sag.",
  },
  "side plank": {
    youtubeUrl: ytSearch("side plank form"),
    cue: "Stack feet. Hips up. Straight line from head to feet.",
  },
  "crunch": {
    youtubeUrl: ytSearch("crunch proper form"),
    cue: "Curl shoulders off floor. Lower slowly.",
  },
  "sit up": {
    youtubeUrl: ytSearch("sit up form"),
    cue: "Feet anchored. Full range of motion.",
  },
  "russian twist": {
    youtubeUrl: ytSearch("russian twist form"),
    cue: "Lean back 45°. Rotate shoulders, not just arms.",
  },
  "mountain climber": {
    youtubeUrl: ytSearch("mountain climber form"),
    cue: "Hips level. Drive knees to chest alternately.",
  },
  "leg raise": {
    youtubeUrl: ytSearch("leg raise form"),
    cue: "Lower back pressed to floor. Slow eccentric.",
  },
  "hanging leg raise": {
    youtubeUrl: ytSearch("hanging leg raise form"),
    cue: "Hang from bar. Raise legs to 90°. Control the descent.",
  },
  "ab wheel rollout": {
    youtubeUrl: ytSearch("ab wheel rollout form"),
    cue: "Core tight. Roll out slowly. Don't let hips sag.",
  },
  "bicycle crunch": {
    youtubeUrl: ytSearch("bicycle crunch form"),
    cue: "Elbow to opposite knee. Controlled rotation.",
  },
  "dead bug": {
    youtubeUrl: ytSearch("dead bug exercise form"),
    cue: "Lower back flat. Opposite arm and leg extend.",
  },
  "cable woodchop": {
    youtubeUrl: ytSearch("cable woodchop form"),
    cue: "Rotate from hips. Arms stay extended.",
  },

  // ── Cardio / HIIT ─────────────────────────────────────────────────────────
  "burpee": {
    youtubeUrl: ytSearch("burpee proper form"),
    cue: "Explosive jump at top. Chest to floor at bottom.",
  },
  "jumping jack": {
    youtubeUrl: ytSearch("jumping jack form"),
    cue: "Arms and legs in sync. Land softly.",
  },
  "box jump": {
    youtubeUrl: ytSearch("box jump form"),
    cue: "Swing arms for momentum. Land softly with bent knees.",
  },
  "kettlebell swing": {
    youtubeUrl: ytSearch("kettlebell swing form"),
    cue: "Hip hinge, not squat. Snap hips forward explosively.",
  },
  "battle rope": {
    youtubeUrl: ytSearch("battle rope exercise form"),
    cue: "Alternate arms. Keep core tight.",
  },
  "jump rope": {
    youtubeUrl: ytSearch("jump rope technique"),
    cue: "Wrists drive the rope. Light on feet.",
  },
  "high knees": {
    youtubeUrl: ytSearch("high knees exercise form"),
    cue: "Drive knees to hip height. Pump arms.",
  },
  "sprint": {
    youtubeUrl: ytSearch("sprint technique form"),
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
  youtubeUrl: ytSearch("exercise form tutorial"),
  cue: "Maintain proper form throughout. Control the movement.",
};

/**
 * Look up a demo for an exercise by name.
 * Returns a YouTube search URL and form cue for the exercise.
 */
export function getExerciseDemo(exerciseName: string): ExerciseDemo {
  const norm = normaliseExerciseName(exerciseName);

  // Exact match
  if (DEMO_MAP[norm]) return DEMO_MAP[norm];

  // Partial keyword match
  for (const { keywords, demo } of KEYWORD_FALLBACKS) {
    if (keywords.some(kw => norm.includes(kw))) return demo;
  }

  // Dynamic fallback: generate a YouTube search URL for the specific exercise
  return {
    youtubeUrl: ytSearch(exerciseName + " exercise form"),
    cue: "Maintain proper form throughout. Control the movement.",
  };
}
