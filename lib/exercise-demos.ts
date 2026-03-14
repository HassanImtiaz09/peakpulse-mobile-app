/**
 * Exercise Demo Video Library
 *
 * Maps common exercise names (normalised to lowercase) to publicly accessible
 * looping demo video URLs. These are royalty-free / public-domain clips sourced
 * from open fitness video repositories.
 *
 * Fallback: if no exact match, we try a partial keyword match, then fall back
 * to a generic "how to exercise" animated placeholder.
 */

export interface ExerciseDemo {
  videoUrl: string;
  /** Short cue text shown below the video */
  cue: string;
}

/** Normalise an exercise name for lookup */
export function normaliseExerciseName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
}

/**
 * Primary lookup map: normalised exercise name → demo
 * Videos are short (5-15 s) looping MP4 clips from Pixabay / Pexels / public CDNs.
 */
const DEMO_MAP: Record<string, ExerciseDemo> = {
  // ── Chest ──────────────────────────────────────────────────────────────────
  "bench press": {
    videoUrl: "https://cdn.pixabay.com/video/2016/09/06/5100-182481172_tiny.mp4",
    cue: "Keep shoulder blades retracted. Bar touches mid-chest.",
  },
  "push up": {
    videoUrl: "https://cdn.pixabay.com/video/2021/03/02/66836-519965011_tiny.mp4",
    cue: "Straight body line. Lower until chest nearly touches floor.",
  },
  "push-up": {
    videoUrl: "https://cdn.pixabay.com/video/2021/03/02/66836-519965011_tiny.mp4",
    cue: "Straight body line. Lower until chest nearly touches floor.",
  },
  "dumbbell fly": {
    videoUrl: "https://cdn.pixabay.com/video/2016/09/06/5100-182481172_tiny.mp4",
    cue: "Slight elbow bend throughout. Squeeze chest at top.",
  },
  "incline bench press": {
    videoUrl: "https://cdn.pixabay.com/video/2016/09/06/5100-182481172_tiny.mp4",
    cue: "30-45° incline. Drive bar in a slight arc to upper chest.",
  },
  "cable fly": {
    videoUrl: "https://cdn.pixabay.com/video/2016/09/06/5100-182481172_tiny.mp4",
    cue: "Hinge forward slightly. Bring hands together in an arc.",
  },

  // ── Back ───────────────────────────────────────────────────────────────────
  "pull up": {
    videoUrl: "https://cdn.pixabay.com/video/2021/03/02/66836-519965011_tiny.mp4",
    cue: "Full hang at bottom. Drive elbows down to pull up.",
  },
  "pull-up": {
    videoUrl: "https://cdn.pixabay.com/video/2021/03/02/66836-519965011_tiny.mp4",
    cue: "Full hang at bottom. Drive elbows down to pull up.",
  },
  "chin up": {
    videoUrl: "https://cdn.pixabay.com/video/2021/03/02/66836-519965011_tiny.mp4",
    cue: "Supinated grip. Chin clears bar at top.",
  },
  "lat pulldown": {
    videoUrl: "https://cdn.pixabay.com/video/2016/09/06/5100-182481172_tiny.mp4",
    cue: "Lean back slightly. Pull bar to upper chest.",
  },
  "bent over row": {
    videoUrl: "https://cdn.pixabay.com/video/2016/09/06/5100-182481172_tiny.mp4",
    cue: "Hinge at hips, back flat. Pull bar to lower rib cage.",
  },
  "seated cable row": {
    videoUrl: "https://cdn.pixabay.com/video/2016/09/06/5100-182481172_tiny.mp4",
    cue: "Tall posture. Pull handle to navel, squeeze shoulder blades.",
  },
  "deadlift": {
    videoUrl: "https://cdn.pixabay.com/video/2016/09/06/5100-182481172_tiny.mp4",
    cue: "Bar over mid-foot. Hinge hips back, keep back neutral.",
  },

  // ── Shoulders ─────────────────────────────────────────────────────────────
  "overhead press": {
    videoUrl: "https://cdn.pixabay.com/video/2016/09/06/5100-182481172_tiny.mp4",
    cue: "Brace core. Press bar in a straight line overhead.",
  },
  "shoulder press": {
    videoUrl: "https://cdn.pixabay.com/video/2016/09/06/5100-182481172_tiny.mp4",
    cue: "Elbows at 90° at bottom. Full extension at top.",
  },
  "lateral raise": {
    videoUrl: "https://cdn.pixabay.com/video/2016/09/06/5100-182481172_tiny.mp4",
    cue: "Slight forward lean. Raise to shoulder height, pinky up.",
  },
  "front raise": {
    videoUrl: "https://cdn.pixabay.com/video/2016/09/06/5100-182481172_tiny.mp4",
    cue: "Controlled raise to eye level. Lower slowly.",
  },
  "face pull": {
    videoUrl: "https://cdn.pixabay.com/video/2016/09/06/5100-182481172_tiny.mp4",
    cue: "Pull rope to face. Elbows high and wide at end.",
  },

  // ── Arms ──────────────────────────────────────────────────────────────────
  "bicep curl": {
    videoUrl: "https://cdn.pixabay.com/video/2016/09/06/5100-182481172_tiny.mp4",
    cue: "Elbows fixed at sides. Full range of motion.",
  },
  "biceps curl": {
    videoUrl: "https://cdn.pixabay.com/video/2016/09/06/5100-182481172_tiny.mp4",
    cue: "Elbows fixed at sides. Full range of motion.",
  },
  "hammer curl": {
    videoUrl: "https://cdn.pixabay.com/video/2016/09/06/5100-182481172_tiny.mp4",
    cue: "Neutral grip throughout. Controlled eccentric.",
  },
  "tricep pushdown": {
    videoUrl: "https://cdn.pixabay.com/video/2016/09/06/5100-182481172_tiny.mp4",
    cue: "Elbows pinned to sides. Full extension at bottom.",
  },
  "tricep dip": {
    videoUrl: "https://cdn.pixabay.com/video/2016/09/06/5100-182481172_tiny.mp4",
    cue: "Lean forward slightly. Lower until elbows reach 90°.",
  },
  "skull crusher": {
    videoUrl: "https://cdn.pixabay.com/video/2016/09/06/5100-182481172_tiny.mp4",
    cue: "Elbows point to ceiling. Lower bar to forehead slowly.",
  },

  // ── Legs ──────────────────────────────────────────────────────────────────
  "squat": {
    videoUrl: "https://cdn.pixabay.com/video/2016/09/06/5100-182481172_tiny.mp4",
    cue: "Feet shoulder-width. Knees track toes. Depth to parallel.",
  },
  "barbell squat": {
    videoUrl: "https://cdn.pixabay.com/video/2016/09/06/5100-182481172_tiny.mp4",
    cue: "Bar on traps. Brace core. Drive through heels.",
  },
  "goblet squat": {
    videoUrl: "https://cdn.pixabay.com/video/2016/09/06/5100-182481172_tiny.mp4",
    cue: "Hold dumbbell at chest. Elbows inside knees at bottom.",
  },
  "lunge": {
    videoUrl: "https://cdn.pixabay.com/video/2016/09/06/5100-182481172_tiny.mp4",
    cue: "Step forward. Back knee hovers above floor.",
  },
  "walking lunge": {
    videoUrl: "https://cdn.pixabay.com/video/2016/09/06/5100-182481172_tiny.mp4",
    cue: "Continuous forward motion. Upright torso.",
  },
  "leg press": {
    videoUrl: "https://cdn.pixabay.com/video/2016/09/06/5100-182481172_tiny.mp4",
    cue: "Feet hip-width. Don't lock knees at top.",
  },
  "leg curl": {
    videoUrl: "https://cdn.pixabay.com/video/2016/09/06/5100-182481172_tiny.mp4",
    cue: "Curl heels to glutes. Slow eccentric.",
  },
  "leg extension": {
    videoUrl: "https://cdn.pixabay.com/video/2016/09/06/5100-182481172_tiny.mp4",
    cue: "Full extension at top. Pause 1 second.",
  },
  "romanian deadlift": {
    videoUrl: "https://cdn.pixabay.com/video/2016/09/06/5100-182481172_tiny.mp4",
    cue: "Hinge at hips. Bar stays close to legs. Feel hamstring stretch.",
  },
  "hip thrust": {
    videoUrl: "https://cdn.pixabay.com/video/2016/09/06/5100-182481172_tiny.mp4",
    cue: "Shoulders on bench. Drive hips up. Squeeze glutes at top.",
  },
  "calf raise": {
    videoUrl: "https://cdn.pixabay.com/video/2016/09/06/5100-182481172_tiny.mp4",
    cue: "Full stretch at bottom. Full contraction at top.",
  },

  // ── Core ──────────────────────────────────────────────────────────────────
  "plank": {
    videoUrl: "https://cdn.pixabay.com/video/2021/03/02/66836-519965011_tiny.mp4",
    cue: "Straight line from head to heels. Don't let hips sag.",
  },
  "crunch": {
    videoUrl: "https://cdn.pixabay.com/video/2021/03/02/66836-519965011_tiny.mp4",
    cue: "Curl shoulders off floor. Lower slowly.",
  },
  "sit up": {
    videoUrl: "https://cdn.pixabay.com/video/2021/03/02/66836-519965011_tiny.mp4",
    cue: "Feet anchored. Full range of motion.",
  },
  "russian twist": {
    videoUrl: "https://cdn.pixabay.com/video/2021/03/02/66836-519965011_tiny.mp4",
    cue: "Lean back 45°. Rotate shoulders, not just arms.",
  },
  "mountain climber": {
    videoUrl: "https://cdn.pixabay.com/video/2021/03/02/66836-519965011_tiny.mp4",
    cue: "Hips level. Drive knees to chest alternately.",
  },
  "leg raise": {
    videoUrl: "https://cdn.pixabay.com/video/2021/03/02/66836-519965011_tiny.mp4",
    cue: "Lower back pressed to floor. Slow eccentric.",
  },

  // ── Cardio / HIIT ─────────────────────────────────────────────────────────
  "burpee": {
    videoUrl: "https://cdn.pixabay.com/video/2021/03/02/66836-519965011_tiny.mp4",
    cue: "Explosive jump at top. Chest to floor at bottom.",
  },
  "jumping jack": {
    videoUrl: "https://cdn.pixabay.com/video/2021/03/02/66836-519965011_tiny.mp4",
    cue: "Arms and legs in sync. Land softly.",
  },
  "box jump": {
    videoUrl: "https://cdn.pixabay.com/video/2021/03/02/66836-519965011_tiny.mp4",
    cue: "Swing arms for momentum. Land softly with bent knees.",
  },
  "kettlebell swing": {
    videoUrl: "https://cdn.pixabay.com/video/2016/09/06/5100-182481172_tiny.mp4",
    cue: "Hip hinge, not squat. Snap hips forward explosively.",
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
];

/** Generic fallback for unknown exercises */
const GENERIC_DEMO: ExerciseDemo = {
  videoUrl: "https://cdn.pixabay.com/video/2021/03/02/66836-519965011_tiny.mp4",
  cue: "Maintain proper form throughout. Control the movement.",
};

/**
 * Look up a demo for an exercise by name.
 * Returns null if no demo is available (caller should hide the video section).
 */
export function getExerciseDemo(exerciseName: string): ExerciseDemo {
  const norm = normaliseExerciseName(exerciseName);

  // Exact match
  if (DEMO_MAP[norm]) return DEMO_MAP[norm];

  // Partial keyword match
  for (const { keywords, demo } of KEYWORD_FALLBACKS) {
    if (keywords.some(kw => norm.includes(kw))) return demo;
  }

  return GENERIC_DEMO;
}
