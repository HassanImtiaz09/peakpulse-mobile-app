/**
 * Exercise Demo Video Library
 *
 * Maps common exercise names to animated GIF URLs for exercise demos.
 * Each exercise has an animated GIF from ExerciseDB for offline guidance.
 */

export interface ExerciseDemo {
  /** Short cue text shown below the video */
  cue: string;
  /** Animated GIF URL from ExerciseDB for offline exercise guidance */
  gifUrl: string;
}

/** Normalise an exercise name for lookup */
export function normaliseExerciseName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
}

/**
 * Primary lookup map: normalised exercise name \u2192 demo
 * Curated ExerciseDB GIF URLs for 70+ exercises.
 */
const DEMO_MAP: Record<string, ExerciseDemo> = {
  // \u2500\u2500 Chest \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  "bench press": {
    cue: "Keep shoulder blades retracted. Bar touches mid-chest.",
    gifUrl: "https://static.exercisedb.dev/media/qJfFHiU.gif",
  },
  "push up": {
    cue: "Straight body line. Lower until chest nearly touches floor.",
    gifUrl: "https://static.exercisedb.dev/media/Jm8xnlR.gif",
  },
  "push-up": {
    cue: "Straight body line. Lower until chest nearly touches floor.",
    gifUrl: "https://static.exercisedb.dev/media/Jm8xnlR.gif",
  },
  "pushup": {
    cue: "Straight body line. Lower until chest nearly touches floor.",
    gifUrl: "https://static.exercisedb.dev/media/Jm8xnlR.gif",
  },
  "dumbbell fly": {
    cue: "Slight elbow bend throughout. Squeeze chest at top.",
    gifUrl: "https://static.exercisedb.dev/media/yz9nUhF.gif",
  },
  "dumbbell flye": {
    cue: "Slight elbow bend throughout. Squeeze chest at top.",
    gifUrl: "https://static.exercisedb.dev/media/yz9nUhF.gif",
  },
  "incline bench press": {
    cue: "30-45\u00b0 incline. Drive bar in a slight arc to upper chest.",
    gifUrl: "https://static.exercisedb.dev/media/WcHl7ru.gif",
  },
  "incline dumbbell press": {
    cue: "30-45\u00b0 incline. Press dumbbells up and slightly inward.",
    gifUrl: "https://static.exercisedb.dev/media/BReCuOn.gif",
  },
  "decline bench press": {
    cue: "Slight decline. Bar to lower chest. Controlled movement.",
    gifUrl: "https://static.exercisedb.dev/media/72BC5Za.gif",
  },
  "cable fly": {
    cue: "Hinge forward slightly. Bring hands together in an arc.",
    gifUrl: "https://static.exercisedb.dev/media/27NNGFr.gif",
  },
  "cable crossover": {
    cue: "Step forward. Squeeze chest as hands cross at bottom.",
    gifUrl: "https://static.exercisedb.dev/media/3KAoAEn.gif",
  },
  "dip": {
    cue: "Lean forward for chest. Lower until elbows reach 90\u00b0.",
    gifUrl: "https://static.exercisedb.dev/media/9WTm7dq.gif",
  },
  "chest dip": {
    cue: "Lean forward for chest. Lower until elbows reach 90\u00b0.",
    gifUrl: "https://static.exercisedb.dev/media/9WTm7dq.gif",
  },
  // \u2500\u2500 Back \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  "pull up": {
    cue: "Full hang at bottom. Drive elbows down to pull up.",
    gifUrl: "https://static.exercisedb.dev/media/oLrKqDH.gif",
  },
  "pull-up": {
    cue: "Full hang at bottom. Drive elbows down to pull up.",
    gifUrl: "https://static.exercisedb.dev/media/oLrKqDH.gif",
  },
  "pullup": {
    cue: "Full hang at bottom. Drive elbows down to pull up.",
    gifUrl: "https://static.exercisedb.dev/media/oLrKqDH.gif",
  },
  "chin up": {
    cue: "Supinated grip. Chin clears bar at top.",
    gifUrl: "https://static.exercisedb.dev/media/Eh2v5Iu.gif",
  },
  "chin-up": {
    cue: "Supinated grip. Chin clears bar at top.",
    gifUrl: "https://static.exercisedb.dev/media/Eh2v5Iu.gif",
  },
  "lat pulldown": {
    cue: "Lean back slightly. Pull bar to upper chest.",
    gifUrl: "https://static.exercisedb.dev/media/fUBheHs.gif",
  },
  "bent over row": {
    cue: "Hinge at hips, back flat. Pull bar to lower rib cage.",
    gifUrl: "https://static.exercisedb.dev/media/eZyBC3j.gif",
  },
  "barbell row": {
    cue: "Hinge at hips, back flat. Pull bar to lower rib cage.",
    gifUrl: "https://static.exercisedb.dev/media/eZyBC3j.gif",
  },
  "dumbbell row": {
    cue: "One arm on bench. Pull to hip, squeeze lat at top.",
    gifUrl: "https://static.exercisedb.dev/media/8d8qJQI.gif",
  },
  "seated cable row": {
    cue: "Tall posture. Pull handle to navel, squeeze shoulder blades.",
    gifUrl: "https://static.exercisedb.dev/media/SJqRxOt.gif",
  },
  "cable row": {
    cue: "Tall posture. Pull handle to navel, squeeze shoulder blades.",
    gifUrl: "https://static.exercisedb.dev/media/SJqRxOt.gif",
  },
  "deadlift": {
    cue: "Bar over mid-foot. Hinge hips back, keep back neutral.",
    gifUrl: "https://static.exercisedb.dev/media/RYcV1kH.gif",
  },
  "t-bar row": {
    cue: "Chest on pad. Pull to chest, squeeze shoulder blades.",
    gifUrl: "https://static.exercisedb.dev/media/VPPtusI.gif",
  },
  "pendlay row": {
    cue: "Bar returns to floor each rep. Explosive pull.",
    gifUrl: "https://static.exercisedb.dev/media/SzX3uzM.gif",
  },
  // \u2500\u2500 Shoulders \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  "overhead press": {
    cue: "Brace core. Press bar in a straight line overhead.",
    gifUrl: "https://static.exercisedb.dev/media/84RyJf8.gif",
  },
  "shoulder press": {
    cue: "Elbows at 90\u00b0 at bottom. Full extension at top.",
    gifUrl: "https://static.exercisedb.dev/media/PzQanLE.gif",
  },
  "military press": {
    cue: "Strict press. No leg drive. Bar overhead.",
    gifUrl: "https://static.exercisedb.dev/media/84RyJf8.gif",
  },
  "dumbbell shoulder press": {
    cue: "Press dumbbells up and slightly inward. Full lockout.",
    gifUrl: "https://static.exercisedb.dev/media/5vfAI0I.gif",
  },
  "lateral raise": {
    cue: "Slight forward lean. Raise to shoulder height, pinky up.",
    gifUrl: "https://static.exercisedb.dev/media/AQ0mC4Y.gif",
  },
  "side lateral raise": {
    cue: "Slight forward lean. Raise to shoulder height, pinky up.",
    gifUrl: "https://static.exercisedb.dev/media/AQ0mC4Y.gif",
  },
  "front raise": {
    cue: "Controlled raise to eye level. Lower slowly.",
    gifUrl: "https://static.exercisedb.dev/media/jDnrkar.gif",
  },
  "face pull": {
    cue: "Pull rope to face. Elbows high and wide at end.",
    gifUrl: "https://static.exercisedb.dev/media/DgZQ11d.gif",
  },
  "rear delt fly": {
    cue: "Bent over. Raise arms to sides, squeeze rear delts.",
    gifUrl: "https://static.exercisedb.dev/media/XUUD0Fs.gif",
  },
  "arnold press": {
    cue: "Rotate palms from facing you to facing forward as you press.",
    gifUrl: "https://static.exercisedb.dev/media/Xy4jlWA.gif",
  },
  "upright row": {
    cue: "Pull bar to chin. Elbows lead the movement.",
    gifUrl: "https://static.exercisedb.dev/media/dmgMp3n.gif",
  },
  "shrug": {
    cue: "Straight up, hold at top. No rolling.",
    gifUrl: "https://static.exercisedb.dev/media/LMGXZn8.gif",
  },
  // \u2500\u2500 Arms \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  "bicep curl": {
    cue: "Elbows fixed at sides. Full range of motion.",
    gifUrl: "https://static.exercisedb.dev/media/ANbbry2.gif",
  },
  "biceps curl": {
    cue: "Elbows fixed at sides. Full range of motion.",
    gifUrl: "https://static.exercisedb.dev/media/ANbbry2.gif",
  },
  "barbell curl": {
    cue: "Elbows fixed at sides. Squeeze at top.",
    gifUrl: "https://static.exercisedb.dev/media/82LxxkW.gif",
  },
  "dumbbell curl": {
    cue: "Alternate or together. Full supination at top.",
    gifUrl: "https://static.exercisedb.dev/media/YtaCTYl.gif",
  },
  "hammer curl": {
    cue: "Neutral grip throughout. Controlled eccentric.",
    gifUrl: "https://static.exercisedb.dev/media/q6y3OhV.gif",
  },
  "preacher curl": {
    cue: "Arms on pad. Full stretch at bottom, squeeze at top.",
    gifUrl: "https://static.exercisedb.dev/media/b6hQYMb.gif",
  },
  "concentration curl": {
    cue: "Elbow on inner thigh. Isolate the bicep.",
    gifUrl: "https://static.exercisedb.dev/media/Db7eEgw.gif",
  },
  "tricep pushdown": {
    cue: "Elbows pinned to sides. Full extension at bottom.",
    gifUrl: "https://static.exercisedb.dev/media/QTXKWPh.gif",
  },
  "tricep extension": {
    cue: "Elbows point to ceiling. Full stretch and extension.",
    gifUrl: "https://static.exercisedb.dev/media/dZl9Q27.gif",
  },
  "overhead tricep extension": {
    cue: "Elbows close to head. Full stretch behind head.",
    gifUrl: "https://static.exercisedb.dev/media/Z5YStHW.gif",
  },
  "tricep dip": {
    cue: "Upright torso for triceps. Lower until elbows reach 90\u00b0.",
    gifUrl: "https://static.exercisedb.dev/media/8K7m2SS.gif",
  },
  "skull crusher": {
    cue: "Elbows point to ceiling. Lower bar to forehead slowly.",
    gifUrl: "https://static.exercisedb.dev/media/oHg8eop.gif",
  },
  "close grip bench press": {
    cue: "Hands shoulder-width. Elbows close to body.",
    gifUrl: "https://static.exercisedb.dev/media/SGY8Zui.gif",
  },
  // \u2500\u2500 Legs \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  "squat": {
    cue: "Feet shoulder-width. Knees track toes. Depth to parallel.",
    gifUrl: "https://static.exercisedb.dev/media/qXTaZnJ.gif",
  },
  "back squat": {
    cue: "Bar on traps. Brace core. Drive through heels.",
    gifUrl: "https://static.exercisedb.dev/media/qXTaZnJ.gif",
  },
  "barbell squat": {
    cue: "Bar on traps. Brace core. Drive through heels.",
    gifUrl: "https://static.exercisedb.dev/media/qXTaZnJ.gif",
  },
  "front squat": {
    cue: "Elbows high. Bar on front delts. Upright torso.",
    gifUrl: "https://static.exercisedb.dev/media/hvV79Si.gif",
  },
  "goblet squat": {
    cue: "Hold dumbbell at chest. Elbows inside knees at bottom.",
    gifUrl: "https://static.exercisedb.dev/media/WM6TvvW.gif",
  },
  "bulgarian split squat": {
    cue: "Rear foot on bench. Front knee over ankle.",
    gifUrl: "https://static.exercisedb.dev/media/QpXqiq8.gif",
  },
  "lunge": {
    cue: "Step forward. Back knee hovers above floor.",
    gifUrl: "https://static.exercisedb.dev/media/veXwo0D.gif",
  },
  "walking lunge": {
    cue: "Continuous forward motion. Upright torso.",
    gifUrl: "https://static.exercisedb.dev/media/03lzqwk.gif",
  },
  "reverse lunge": {
    cue: "Step backward. Front knee stays over ankle.",
    gifUrl: "https://static.exercisedb.dev/media/mr7pkqP.gif",
  },
  "leg press": {
    cue: "Feet hip-width. Don\u2019t lock knees at top.",
    gifUrl: "https://static.exercisedb.dev/media/GaSzzuh.gif",
  },
  "leg curl": {
    cue: "Curl heels to glutes. Slow eccentric.",
    gifUrl: "https://static.exercisedb.dev/media/Tq6gbK6.gif",
  },
  "hamstring curl": {
    cue: "Curl heels to glutes. Slow eccentric.",
    gifUrl: "https://static.exercisedb.dev/media/Tq6gbK6.gif",
  },
  "leg extension": {
    cue: "Full extension at top. Pause 1 second.",
    gifUrl: "https://static.exercisedb.dev/media/GSDioYu.gif",
  },
  "romanian deadlift": {
    cue: "Hinge at hips. Bar stays close to legs. Feel hamstring stretch.",
    gifUrl: "https://static.exercisedb.dev/media/PNtsX17.gif",
  },
  "stiff leg deadlift": {
    cue: "Minimal knee bend. Hinge at hips. Stretch hamstrings.",
    gifUrl: "https://static.exercisedb.dev/media/c8oybX6.gif",
  },
  "sumo deadlift": {
    cue: "Wide stance. Toes out. Drive hips forward.",
    gifUrl: "https://static.exercisedb.dev/media/UM8mgyG.gif",
  },
  "hip thrust": {
    cue: "Shoulders on bench. Drive hips up. Squeeze glutes at top.",
    gifUrl: "https://static.exercisedb.dev/media/sTg7iys.gif",
  },
  "glute bridge": {
    cue: "Feet flat on floor. Drive hips up. Squeeze glutes.",
    gifUrl: "https://static.exercisedb.dev/media/CosupLu.gif",
  },
  "calf raise": {
    cue: "Full stretch at bottom. Full contraction at top.",
    gifUrl: "https://static.exercisedb.dev/media/lCKm4Rs.gif",
  },
  "standing calf raise": {
    cue: "Full stretch at bottom. Full contraction at top.",
    gifUrl: "https://static.exercisedb.dev/media/xTjr103.gif",
  },
  "seated calf raise": {
    cue: "Knees at 90\u00b0. Full range of motion.",
    gifUrl: "https://static.exercisedb.dev/media/hxyTtWj.gif",
  },
  "hack squat": {
    cue: "Shoulders against pad. Feet forward. Full depth.",
    gifUrl: "https://static.exercisedb.dev/media/HsjbB1z.gif",
  },
  "step up": {
    cue: "Drive through front heel. Full extension at top.",
    gifUrl: "https://static.exercisedb.dev/media/Nu7jqFE.gif",
  },
  // \u2500\u2500 Core \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  "plank": {
    cue: "Straight line from head to heels. Don\u2019t let hips sag.",
    gifUrl: "https://static.exercisedb.dev/media/VBAWRPG.gif",
  },
  "side plank": {
    cue: "Stack feet. Hips up. Straight line from head to feet.",
    gifUrl: "https://static.exercisedb.dev/media/X6ytgYZ.gif",
  },
  "crunch": {
    cue: "Curl shoulders off floor. Lower slowly.",
    gifUrl: "https://static.exercisedb.dev/media/TFqbd8t.gif",
  },
  "sit up": {
    cue: "Feet anchored. Full range of motion.",
    gifUrl: "https://static.exercisedb.dev/media/AR0ig3o.gif",
  },
  "russian twist": {
    cue: "Lean back 45\u00b0. Rotate shoulders, not just arms.",
    gifUrl: "https://static.exercisedb.dev/media/XVDdcoj.gif",
  },
  "mountain climber": {
    cue: "Hips level. Drive knees to chest alternately.",
    gifUrl: "https://static.exercisedb.dev/media/RJgzwny.gif",
  },
  "leg raise": {
    cue: "Lower back pressed to floor. Slow eccentric.",
    gifUrl: "https://static.exercisedb.dev/media/nCU1Ekp.gif",
  },
  "hanging leg raise": {
    cue: "Hang from bar. Raise legs to 90\u00b0. Control the descent.",
    gifUrl: "https://static.exercisedb.dev/media/I3tsCnC.gif",
  },
  "ab wheel rollout": {
    cue: "Core tight. Roll out slowly. Don\u2019t let hips sag.",
    gifUrl: "https://static.exercisedb.dev/media/KtRomty.gif",
  },
  "bicycle crunch": {
    cue: "Elbow to opposite knee. Controlled rotation.",
    gifUrl: "https://static.exercisedb.dev/media/tZkGYZ9.gif",
  },
  "dead bug": {
    cue: "Lower back flat. Opposite arm and leg extend.",
    gifUrl: "https://static.exercisedb.dev/media/iny3m5y.gif",
  },
  "cable woodchop": {
    cue: "Rotate from hips. Arms stay extended.",
    gifUrl: "https://static.exercisedb.dev/media/UFGF6gk.gif",
  },
  // \u2500\u2500 Cardio / HIIT \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  "burpee": {
    cue: "Explosive jump at top. Chest to floor at bottom.",
    gifUrl: "https://static.exercisedb.dev/media/dK9394r.gif",
  },
  "jumping jack": {
    cue: "Arms and legs in sync. Land softly.",
    gifUrl: "https://static.exercisedb.dev/media/HtfCpfi.gif",
  },
  "box jump": {
    cue: "Swing arms for momentum. Land softly with bent knees.",
    gifUrl: "https://static.exercisedb.dev/media/Qoujh3Q.gif",
  },
  "kettlebell swing": {
    cue: "Hip hinge, not squat. Snap hips forward explosively.",
    gifUrl: "https://static.exercisedb.dev/media/JOZhu2h.gif",
  },
  "battle rope": {
    cue: "Alternate arms. Keep core tight.",
    gifUrl: "https://static.exercisedb.dev/media/RJa4tCo.gif",
  },
  "jump rope": {
    cue: "Wrists drive the rope. Light on feet.",
    gifUrl: "https://static.exercisedb.dev/media/e1e76I2.gif",
  },
  "high knees": {
    cue: "Drive knees to hip height. Pump arms.",
    gifUrl: "https://static.exercisedb.dev/media/ealLwvX.gif",
  },
  "sprint": {
    cue: "Drive knees high. Pump arms. Stay on balls of feet.",
    gifUrl: "https://static.exercisedb.dev/media/pX9Elbe.gif",
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
  gifUrl: "https://static.exercisedb.dev/media/BReCuOn.gif",
};

/**
 * Look up a demo for an exercise by name.
 * Returns a form cue and animated GIF URL for the exercise.
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
