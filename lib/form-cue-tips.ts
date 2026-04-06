/**
 * Exercise Form Cue Tips
 *
 * Quick-reference form tips shown as an overlay when users tap
 * the animated exercise GIF. Each exercise has:
 * - 2-4 key tips (concise, actionable)
 * - 1-2 common mistakes to avoid
 * - 1 breathing cue
 *
 * Coverage: all 104+ exercises in the ExerciseDB mapping.
 */

export interface FormTip {
  /** Short tip text (max ~40 chars for overlay readability) */
  text: string;
  /** Category for icon/colour coding */
  category: "form" | "mistake" | "breathing" | "safety";
}

export interface ExerciseFormTips {
  /** Display name */
  name: string;
  /** Ordered list of tips */
  tips: FormTip[];
}

// ── Form Tip Data ──────────────────────────────────────────────────────────

const FORM_TIPS: Record<string, ExerciseFormTips> = {
  // ── CHEST ────────────────────────────────────────────────────────────────
  "bench press": {
    name: "Bench Press",
    tips: [
      { text: "Retract shoulder blades into bench", category: "form" },
      { text: "Bar touches mid-chest, not neck", category: "form" },
      { text: "Drive through heels for stability", category: "form" },
      { text: "Don't flare elbows to 90°", category: "mistake" },
      { text: "Inhale down, exhale pressing up", category: "breathing" },
    ],
  },
  "dumbbell bench press": {
    name: "Dumbbell Bench Press",
    tips: [
      { text: "Squeeze shoulder blades together", category: "form" },
      { text: "Lower to chest level, elbows at 45°", category: "form" },
      { text: "Don't clank dumbbells at top", category: "mistake" },
      { text: "Exhale as you press up", category: "breathing" },
    ],
  },
  "incline bench press": {
    name: "Incline Bench Press",
    tips: [
      { text: "Set bench to 30-45° angle", category: "form" },
      { text: "Bar path to upper chest", category: "form" },
      { text: "Don't let butt lift off bench", category: "mistake" },
      { text: "Inhale lowering, exhale pressing", category: "breathing" },
    ],
  },
  "incline dumbbell press": {
    name: "Incline Dumbbell Press",
    tips: [
      { text: "30-45° incline, feet flat", category: "form" },
      { text: "Press in slight arc, not straight up", category: "form" },
      { text: "Don't overarch lower back", category: "mistake" },
      { text: "Exhale at the top of press", category: "breathing" },
    ],
  },
  "decline bench press": {
    name: "Decline Bench Press",
    tips: [
      { text: "Secure legs under pad firmly", category: "safety" },
      { text: "Bar touches lower chest", category: "form" },
      { text: "Don't bounce bar off chest", category: "mistake" },
      { text: "Exhale pressing up", category: "breathing" },
    ],
  },
  "close grip bench press": {
    name: "Close Grip Bench Press",
    tips: [
      { text: "Hands shoulder-width apart", category: "form" },
      { text: "Keep elbows tucked close to body", category: "form" },
      { text: "Don't go too narrow — wrist strain", category: "safety" },
      { text: "Exhale pressing up", category: "breathing" },
    ],
  },
  "push up": {
    name: "Push Up",
    tips: [
      { text: "Body straight from head to heels", category: "form" },
      { text: "Hands just outside shoulders", category: "form" },
      { text: "Don't let hips sag or pike up", category: "mistake" },
      { text: "Inhale down, exhale pushing up", category: "breathing" },
    ],
  },
  "push-up": {
    name: "Push Up",
    tips: [
      { text: "Body straight from head to heels", category: "form" },
      { text: "Hands just outside shoulders", category: "form" },
      { text: "Don't let hips sag or pike up", category: "mistake" },
      { text: "Inhale down, exhale pushing up", category: "breathing" },
    ],
  },
  "pushup": {
    name: "Push Up",
    tips: [
      { text: "Body straight from head to heels", category: "form" },
      { text: "Hands just outside shoulders", category: "form" },
      { text: "Don't let hips sag or pike up", category: "mistake" },
      { text: "Inhale down, exhale pushing up", category: "breathing" },
    ],
  },
  "dumbbell fly": {
    name: "Dumbbell Fly",
    tips: [
      { text: "Maintain slight elbow bend always", category: "form" },
      { text: "Lower to chest level, not below", category: "form" },
      { text: "Don't straighten arms fully", category: "mistake" },
      { text: "Inhale opening, exhale squeezing", category: "breathing" },
    ],
  },
  "cable crossover": {
    name: "Cable Crossover",
    tips: [
      { text: "Step forward for stretch at top", category: "form" },
      { text: "Squeeze chest at bottom of arc", category: "form" },
      { text: "Don't use momentum to swing", category: "mistake" },
      { text: "Exhale as hands come together", category: "breathing" },
    ],
  },
  "cable fly": {
    name: "Cable Fly",
    tips: [
      { text: "Slight forward lean, soft elbows", category: "form" },
      { text: "Bring hands together at chest level", category: "form" },
      { text: "Don't lock elbows straight", category: "mistake" },
      { text: "Exhale squeezing together", category: "breathing" },
    ],
  },
  "chest press machine": {
    name: "Chest Press Machine",
    tips: [
      { text: "Seat height: handles at mid-chest", category: "form" },
      { text: "Press forward, don't lock elbows", category: "form" },
      { text: "Don't let shoulders roll forward", category: "mistake" },
      { text: "Exhale pressing, inhale returning", category: "breathing" },
    ],
  },
  "pec deck": {
    name: "Pec Deck",
    tips: [
      { text: "Elbows at shoulder height on pads", category: "form" },
      { text: "Squeeze chest, don't push with arms", category: "form" },
      { text: "Don't go too far back — shoulder strain", category: "safety" },
      { text: "Exhale squeezing together", category: "breathing" },
    ],
  },
  "dip": {
    name: "Dip",
    tips: [
      { text: "Lean forward 30° for chest focus", category: "form" },
      { text: "Lower until upper arms parallel", category: "form" },
      { text: "Stop if shoulders hurt", category: "safety" },
      { text: "Exhale pressing up", category: "breathing" },
    ],
  },
  "chest dip": {
    name: "Chest Dip",
    tips: [
      { text: "Lean forward 30° for chest focus", category: "form" },
      { text: "Lower until upper arms parallel", category: "form" },
      { text: "Stop if shoulders hurt", category: "safety" },
      { text: "Exhale pressing up", category: "breathing" },
    ],
  },

  // ── BACK ─────────────────────────────────────────────────────────────────
  "deadlift": {
    name: "Deadlift",
    tips: [
      { text: "Keep back flat — no rounding", category: "form" },
      { text: "Bar stays close to shins/thighs", category: "form" },
      { text: "Drive hips back, not down", category: "form" },
      { text: "Don't jerk the bar off floor", category: "mistake" },
      { text: "Brace core, exhale at lockout", category: "breathing" },
    ],
  },
  "barbell row": {
    name: "Barbell Row",
    tips: [
      { text: "Hinge at hips, back at 45°", category: "form" },
      { text: "Pull bar to lower chest/navel", category: "form" },
      { text: "Don't use momentum to swing up", category: "mistake" },
      { text: "Exhale pulling, inhale lowering", category: "breathing" },
    ],
  },
  "barbell bent over row": {
    name: "Barbell Bent Over Row",
    tips: [
      { text: "Hinge at hips, back at 45°", category: "form" },
      { text: "Pull bar to lower chest/navel", category: "form" },
      { text: "Don't round your lower back", category: "mistake" },
      { text: "Exhale pulling, inhale lowering", category: "breathing" },
    ],
  },
  "dumbbell bent over row": {
    name: "Dumbbell Bent Over Row",
    tips: [
      { text: "Brace free hand on bench", category: "form" },
      { text: "Pull to hip, squeeze shoulder blade", category: "form" },
      { text: "Don't rotate torso to lift", category: "mistake" },
      { text: "Exhale pulling up", category: "breathing" },
    ],
  },
  "pull up": {
    name: "Pull Up",
    tips: [
      { text: "Start from full dead hang", category: "form" },
      { text: "Pull chin over bar, chest to bar", category: "form" },
      { text: "No kipping or swinging", category: "mistake" },
      { text: "Exhale pulling up", category: "breathing" },
    ],
  },
  "chin up": {
    name: "Chin Up",
    tips: [
      { text: "Underhand grip, shoulder width", category: "form" },
      { text: "Pull chin over bar, squeeze biceps", category: "form" },
      { text: "Don't half-rep — full ROM", category: "mistake" },
      { text: "Exhale pulling up", category: "breathing" },
    ],
  },
  "chin-up": {
    name: "Chin Up",
    tips: [
      { text: "Underhand grip, shoulder width", category: "form" },
      { text: "Pull chin over bar, squeeze biceps", category: "form" },
      { text: "Don't half-rep — full ROM", category: "mistake" },
      { text: "Exhale pulling up", category: "breathing" },
    ],
  },
  "lat pulldown": {
    name: "Lat Pulldown",
    tips: [
      { text: "Slight lean back (10-15°)", category: "form" },
      { text: "Pull bar to upper chest", category: "form" },
      { text: "Don't pull behind neck", category: "safety" },
      { text: "Exhale pulling down", category: "breathing" },
    ],
  },
  "seated cable row": {
    name: "Seated Cable Row",
    tips: [
      { text: "Sit tall, chest up throughout", category: "form" },
      { text: "Pull handle to lower chest", category: "form" },
      { text: "Don't lean back excessively", category: "mistake" },
      { text: "Exhale pulling, inhale extending", category: "breathing" },
    ],
  },
  "t-bar row": {
    name: "T-Bar Row",
    tips: [
      { text: "Chest against pad if available", category: "form" },
      { text: "Pull to mid-chest, squeeze lats", category: "form" },
      { text: "Don't round upper back", category: "mistake" },
      { text: "Exhale pulling up", category: "breathing" },
    ],
  },
  "bent over row": {
    name: "Bent Over Row",
    tips: [
      { text: "Hinge at hips, flat back", category: "form" },
      { text: "Squeeze shoulder blades at top", category: "form" },
      { text: "Don't use body momentum", category: "mistake" },
      { text: "Exhale pulling up", category: "breathing" },
    ],
  },
  "dumbbell row": {
    name: "Dumbbell Row",
    tips: [
      { text: "One hand on bench for support", category: "form" },
      { text: "Pull to hip, elbow past torso", category: "form" },
      { text: "Don't rotate torso to cheat", category: "mistake" },
      { text: "Exhale pulling up", category: "breathing" },
    ],
  },
  "pendlay row": {
    name: "Pendlay Row",
    tips: [
      { text: "Back parallel to floor each rep", category: "form" },
      { text: "Bar returns to floor between reps", category: "form" },
      { text: "Don't use momentum — reset each rep", category: "mistake" },
      { text: "Brace core, exhale pulling", category: "breathing" },
    ],
  },
  "tbar row": {
    name: "T-Bar Row",
    tips: [
      { text: "Chest against pad if available", category: "form" },
      { text: "Pull to mid-chest, squeeze lats", category: "form" },
      { text: "Don't round upper back", category: "mistake" },
      { text: "Exhale pulling up", category: "breathing" },
    ],
  },
  "single arm dumbbell row": {
    name: "Single Arm Dumbbell Row",
    tips: [
      { text: "Brace opposite hand on bench", category: "form" },
      { text: "Pull to hip, squeeze at top", category: "form" },
      { text: "Don't rotate torso", category: "mistake" },
      { text: "Exhale pulling up", category: "breathing" },
    ],
  },

  // ── SHOULDERS ────────────────────────────────────────────────────────────
  "overhead press": {
    name: "Overhead Press",
    tips: [
      { text: "Brace core, squeeze glutes", category: "form" },
      { text: "Press straight up, biceps by ears", category: "form" },
      { text: "Don't arch lower back", category: "mistake" },
      { text: "Exhale pressing up", category: "breathing" },
    ],
  },
  "military press": {
    name: "Military Press",
    tips: [
      { text: "Strict form — no leg drive", category: "form" },
      { text: "Bar clears face, then straight up", category: "form" },
      { text: "Don't lean back excessively", category: "mistake" },
      { text: "Exhale pressing overhead", category: "breathing" },
    ],
  },
  "shoulder press": {
    name: "Shoulder Press",
    tips: [
      { text: "Core braced to protect lower back", category: "form" },
      { text: "Full lockout overhead", category: "form" },
      { text: "Don't let ribs flare out", category: "mistake" },
      { text: "Exhale pressing up", category: "breathing" },
    ],
  },
  "arnold press": {
    name: "Arnold Press",
    tips: [
      { text: "Start palms facing you at chin", category: "form" },
      { text: "Rotate wrists as you press up", category: "form" },
      { text: "Don't rush the rotation", category: "mistake" },
      { text: "Exhale pressing overhead", category: "breathing" },
    ],
  },
  "lateral raise": {
    name: "Lateral Raise",
    tips: [
      { text: "Slight elbow bend, raise to shoulder", category: "form" },
      { text: "Lead with elbows, not hands", category: "form" },
      { text: "Don't shrug — keep shoulders down", category: "mistake" },
      { text: "Exhale raising, inhale lowering", category: "breathing" },
    ],
  },
  "cable lateral raise": {
    name: "Cable Lateral Raise",
    tips: [
      { text: "Stand sideways to cable machine", category: "form" },
      { text: "Raise to shoulder height, no higher", category: "form" },
      { text: "Don't lean away to cheat", category: "mistake" },
      { text: "Exhale raising up", category: "breathing" },
    ],
  },
  "dumbbell shoulder press": {
    name: "Dumbbell Shoulder Press",
    tips: [
      { text: "Start at ear level, press overhead", category: "form" },
      { text: "Don't clank dumbbells at top", category: "form" },
      { text: "Don't arch your back", category: "mistake" },
      { text: "Exhale pressing up", category: "breathing" },
    ],
  },
  "front raise": {
    name: "Front Raise",
    tips: [
      { text: "Arms straight, raise to eye level", category: "form" },
      { text: "Controlled tempo, no swinging", category: "form" },
      { text: "Don't use body momentum", category: "mistake" },
      { text: "Exhale raising, inhale lowering", category: "breathing" },
    ],
  },
  "face pull": {
    name: "Face Pull",
    tips: [
      { text: "Pull rope to face, elbows high", category: "form" },
      { text: "Squeeze rear delts at end", category: "form" },
      { text: "Don't use too much weight", category: "mistake" },
      { text: "Exhale pulling back", category: "breathing" },
    ],
  },
  "rear delt fly": {
    name: "Rear Delt Fly",
    tips: [
      { text: "Bend forward, arms hang down", category: "form" },
      { text: "Raise out to sides, squeeze back", category: "form" },
      { text: "Don't use momentum to swing", category: "mistake" },
      { text: "Exhale raising, inhale lowering", category: "breathing" },
    ],
  },
  "upright row": {
    name: "Upright Row",
    tips: [
      { text: "Pull bar to chin, elbows lead", category: "form" },
      { text: "Narrow grip for traps, wide for delts", category: "form" },
      { text: "Stop if shoulders hurt", category: "safety" },
      { text: "Exhale pulling up", category: "breathing" },
    ],
  },
  "shrug": {
    name: "Shrug",
    tips: [
      { text: "Straight up — don't roll shoulders", category: "form" },
      { text: "Hold at top for 1-2 seconds", category: "form" },
      { text: "Don't bend elbows to cheat", category: "mistake" },
      { text: "Exhale shrugging up", category: "breathing" },
    ],
  },

  // ── ARMS ─────────────────────────────────────────────────────────────────
  "barbell curl": {
    name: "Barbell Curl",
    tips: [
      { text: "Elbows pinned to sides", category: "form" },
      { text: "Full ROM — extend and squeeze", category: "form" },
      { text: "Don't swing body to curl", category: "mistake" },
      { text: "Exhale curling up", category: "breathing" },
    ],
  },
  "bicep curl": {
    name: "Bicep Curl",
    tips: [
      { text: "Keep elbows pinned to sides", category: "form" },
      { text: "Squeeze biceps at top", category: "form" },
      { text: "Don't use body momentum", category: "mistake" },
      { text: "Exhale curling up", category: "breathing" },
    ],
  },
  "dumbbell curl": {
    name: "Dumbbell Curl",
    tips: [
      { text: "Alternate or both — elbows fixed", category: "form" },
      { text: "Supinate wrist at top for peak", category: "form" },
      { text: "Don't swing the weight", category: "mistake" },
      { text: "Exhale curling up", category: "breathing" },
    ],
  },
  "hammer curl": {
    name: "Hammer Curl",
    tips: [
      { text: "Neutral grip — thumbs up position", category: "form" },
      { text: "Elbows stay at sides throughout", category: "form" },
      { text: "Don't swing body forward", category: "mistake" },
      { text: "Exhale curling up", category: "breathing" },
    ],
  },
  "preacher curl": {
    name: "Preacher Curl",
    tips: [
      { text: "Armpits snug against pad top", category: "form" },
      { text: "Lower fully, don't half-rep", category: "form" },
      { text: "Don't hyperextend at bottom", category: "safety" },
      { text: "Exhale curling up", category: "breathing" },
    ],
  },
  "concentration curl": {
    name: "Concentration Curl",
    tips: [
      { text: "Elbow braced against inner thigh", category: "form" },
      { text: "Slow controlled curl, squeeze top", category: "form" },
      { text: "Don't use shoulder to lift", category: "mistake" },
      { text: "Exhale curling up", category: "breathing" },
    ],
  },
  "cable curl": {
    name: "Cable Curl",
    tips: [
      { text: "Constant tension throughout ROM", category: "form" },
      { text: "Elbows fixed at sides", category: "form" },
      { text: "Don't lean back to curl", category: "mistake" },
      { text: "Exhale curling up", category: "breathing" },
    ],
  },
  "tricep pushdown": {
    name: "Tricep Pushdown",
    tips: [
      { text: "Elbows pinned at sides", category: "form" },
      { text: "Fully extend arms at bottom", category: "form" },
      { text: "Don't flare elbows out", category: "mistake" },
      { text: "Exhale pushing down", category: "breathing" },
    ],
  },
  "skull crusher": {
    name: "Skull Crusher",
    tips: [
      { text: "Lower bar to forehead, not nose", category: "form" },
      { text: "Upper arms stay vertical", category: "form" },
      { text: "Don't flare elbows wide", category: "mistake" },
      { text: "Inhale lowering, exhale pressing", category: "breathing" },
    ],
  },
  "overhead tricep extension": {
    name: "Overhead Tricep Extension",
    tips: [
      { text: "Elbows point forward, close to head", category: "form" },
      { text: "Full stretch at bottom, lock at top", category: "form" },
      { text: "Don't let elbows flare wide", category: "mistake" },
      { text: "Exhale extending up", category: "breathing" },
    ],
  },
  "tricep extension": {
    name: "Tricep Extension",
    tips: [
      { text: "Keep upper arm stationary", category: "form" },
      { text: "Full extension at bottom/top", category: "form" },
      { text: "Don't swing the weight", category: "mistake" },
      { text: "Exhale extending", category: "breathing" },
    ],
  },
  "tricep dip": {
    name: "Tricep Dip",
    tips: [
      { text: "Stay upright for tricep focus", category: "form" },
      { text: "Lower until upper arms parallel", category: "form" },
      { text: "Don't go too deep — shoulder strain", category: "safety" },
      { text: "Exhale pressing up", category: "breathing" },
    ],
  },
  "dumbbell kickback": {
    name: "Dumbbell Kickback",
    tips: [
      { text: "Upper arm parallel to floor", category: "form" },
      { text: "Extend fully, squeeze at top", category: "form" },
      { text: "Don't swing the weight", category: "mistake" },
      { text: "Exhale extending back", category: "breathing" },
    ],
  },

  // ── LEGS ─────────────────────────────────────────────────────────────────
  "squat": {
    name: "Squat",
    tips: [
      { text: "Feet shoulder-width, toes out 30°", category: "form" },
      { text: "Hip crease below knee level", category: "form" },
      { text: "Don't let knees cave inward", category: "mistake" },
      { text: "Brace core, exhale standing up", category: "breathing" },
    ],
  },
  "barbell squat": {
    name: "Barbell Squat",
    tips: [
      { text: "Bar on upper traps, chest up", category: "form" },
      { text: "Sit back and down, knees track toes", category: "form" },
      { text: "Don't round lower back", category: "mistake" },
      { text: "Brace core, exhale standing", category: "breathing" },
    ],
  },
  "front squat": {
    name: "Front Squat",
    tips: [
      { text: "Elbows high, bar on front delts", category: "form" },
      { text: "Stay more upright than back squat", category: "form" },
      { text: "Don't let elbows drop", category: "mistake" },
      { text: "Brace core, exhale standing", category: "breathing" },
    ],
  },
  "goblet squat": {
    name: "Goblet Squat",
    tips: [
      { text: "Hold dumbbell at chest level", category: "form" },
      { text: "Elbows inside knees at bottom", category: "form" },
      { text: "Don't lean forward excessively", category: "mistake" },
      { text: "Exhale standing up", category: "breathing" },
    ],
  },
  "hack squat": {
    name: "Hack Squat",
    tips: [
      { text: "Shoulders under pads, back flat", category: "form" },
      { text: "Feet shoulder-width on platform", category: "form" },
      { text: "Don't lock knees at top", category: "safety" },
      { text: "Exhale pressing up", category: "breathing" },
    ],
  },
  "leg press": {
    name: "Leg Press",
    tips: [
      { text: "Feet shoulder-width, mid-platform", category: "form" },
      { text: "Lower until 90° knee angle", category: "form" },
      { text: "Don't lock knees fully at top", category: "safety" },
      { text: "Exhale pressing, keep back flat", category: "breathing" },
    ],
  },
  "romanian deadlift": {
    name: "Romanian Deadlift",
    tips: [
      { text: "Soft knees, hinge at hips", category: "form" },
      { text: "Bar slides down thighs, back flat", category: "form" },
      { text: "Don't round your back", category: "mistake" },
      { text: "Exhale standing, squeeze glutes", category: "breathing" },
    ],
  },
  "leg curl": {
    name: "Leg Curl",
    tips: [
      { text: "Pad above ankles, hips down", category: "form" },
      { text: "Curl fully, squeeze hamstrings", category: "form" },
      { text: "Don't lift hips off pad", category: "mistake" },
      { text: "Exhale curling up", category: "breathing" },
    ],
  },
  "leg extension": {
    name: "Leg Extension",
    tips: [
      { text: "Pad on lower shins, back against seat", category: "form" },
      { text: "Extend fully, squeeze quads at top", category: "form" },
      { text: "Don't use momentum to swing", category: "mistake" },
      { text: "Exhale extending", category: "breathing" },
    ],
  },
  "calf raise": {
    name: "Calf Raise",
    tips: [
      { text: "Rise to full tiptoe, pause at top", category: "form" },
      { text: "Lower below platform for stretch", category: "form" },
      { text: "Don't bend knees to cheat", category: "mistake" },
      { text: "Exhale rising up", category: "breathing" },
    ],
  },
  "seated calf raise": {
    name: "Seated Calf Raise",
    tips: [
      { text: "Pad on lower thighs, balls of feet", category: "form" },
      { text: "Full ROM — stretch and squeeze", category: "form" },
      { text: "Don't bounce at the bottom", category: "mistake" },
      { text: "Exhale rising up", category: "breathing" },
    ],
  },
  "hip thrust": {
    name: "Hip Thrust",
    tips: [
      { text: "Upper back on bench, feet flat", category: "form" },
      { text: "Drive hips to full lockout", category: "form" },
      { text: "Don't hyperextend lower back", category: "mistake" },
      { text: "Exhale thrusting up, squeeze glutes", category: "breathing" },
    ],
  },
  "lunge": {
    name: "Lunge",
    tips: [
      { text: "Long step, both knees at 90°", category: "form" },
      { text: "Front knee tracks over toes", category: "form" },
      { text: "Don't let knee pass toes", category: "mistake" },
      { text: "Exhale stepping back up", category: "breathing" },
    ],
  },
  "bulgarian split squat": {
    name: "Bulgarian Split Squat",
    tips: [
      { text: "Rear foot on bench, laces down", category: "form" },
      { text: "Lower until front thigh parallel", category: "form" },
      { text: "Don't lean forward excessively", category: "mistake" },
      { text: "Exhale driving up", category: "breathing" },
    ],
  },
  "reverse lunge": {
    name: "Reverse Lunge",
    tips: [
      { text: "Step back, lower until 90° angles", category: "form" },
      { text: "Keep torso upright throughout", category: "form" },
      { text: "Don't let front knee cave in", category: "mistake" },
      { text: "Exhale stepping forward", category: "breathing" },
    ],
  },
  "step up": {
    name: "Step Up",
    tips: [
      { text: "Full foot on box, drive through heel", category: "form" },
      { text: "Stand tall at top, control descent", category: "form" },
      { text: "Don't push off back foot", category: "mistake" },
      { text: "Exhale stepping up", category: "breathing" },
    ],
  },
  "glute bridge": {
    name: "Glute Bridge",
    tips: [
      { text: "Feet flat, knees at 90° at top", category: "form" },
      { text: "Squeeze glutes hard at top", category: "form" },
      { text: "Don't hyperextend lower back", category: "mistake" },
      { text: "Exhale lifting hips", category: "breathing" },
    ],
  },
  "sumo deadlift": {
    name: "Sumo Deadlift",
    tips: [
      { text: "Wide stance, toes pointed out 45°", category: "form" },
      { text: "Chest up, push knees out", category: "form" },
      { text: "Don't let knees cave inward", category: "mistake" },
      { text: "Brace core, exhale at lockout", category: "breathing" },
    ],
  },
  "stiff leg deadlift": {
    name: "Stiff Leg Deadlift",
    tips: [
      { text: "Legs nearly straight, slight bend", category: "form" },
      { text: "Feel hamstring stretch, back flat", category: "form" },
      { text: "Don't round your back", category: "mistake" },
      { text: "Exhale standing up", category: "breathing" },
    ],
  },

  // ── CORE ─────────────────────────────────────────────────────────────────
  "plank": {
    name: "Plank",
    tips: [
      { text: "Straight line: head to heels", category: "form" },
      { text: "Elbows under shoulders, core tight", category: "form" },
      { text: "Don't let hips sag or pike", category: "mistake" },
      { text: "Breathe steadily, don't hold breath", category: "breathing" },
    ],
  },
  "russian twist": {
    name: "Russian Twist",
    tips: [
      { text: "Lean back 45°, feet off floor", category: "form" },
      { text: "Rotate from torso, not just arms", category: "form" },
      { text: "Don't rush — control each twist", category: "mistake" },
      { text: "Exhale each side", category: "breathing" },
    ],
  },
  "hanging leg raise": {
    name: "Hanging Leg Raise",
    tips: [
      { text: "Dead hang, no swinging", category: "form" },
      { text: "Raise legs to parallel or higher", category: "form" },
      { text: "Don't use momentum to swing", category: "mistake" },
      { text: "Exhale raising legs", category: "breathing" },
    ],
  },
  "cable crunch": {
    name: "Cable Crunch",
    tips: [
      { text: "Kneel, rope behind head", category: "form" },
      { text: "Crunch down, bring elbows to knees", category: "form" },
      { text: "Don't pull with arms — use abs", category: "mistake" },
      { text: "Exhale crunching down", category: "breathing" },
    ],
  },
  "mountain climber": {
    name: "Mountain Climber",
    tips: [
      { text: "Plank position, hands under shoulders", category: "form" },
      { text: "Drive knees to chest alternately", category: "form" },
      { text: "Don't let hips bounce up", category: "mistake" },
      { text: "Breathe rhythmically with legs", category: "breathing" },
    ],
  },
  "bicycle crunch": {
    name: "Bicycle Crunch",
    tips: [
      { text: "Opposite elbow to opposite knee", category: "form" },
      { text: "Fully extend the straight leg", category: "form" },
      { text: "Don't pull on your neck", category: "mistake" },
      { text: "Exhale each rotation", category: "breathing" },
    ],
  },
  "ab wheel rollout": {
    name: "Ab Wheel Rollout",
    tips: [
      { text: "Start on knees, roll out slowly", category: "form" },
      { text: "Keep core tight, don't collapse", category: "form" },
      { text: "Don't hyperextend lower back", category: "safety" },
      { text: "Exhale rolling back in", category: "breathing" },
    ],
  },
  "crunch": {
    name: "Crunch",
    tips: [
      { text: "Shoulder blades off floor, small curl", category: "form" },
      { text: "Hands support head, don't pull", category: "form" },
      { text: "Don't pull on your neck", category: "mistake" },
      { text: "Exhale crunching up", category: "breathing" },
    ],
  },
  "sit up": {
    name: "Sit Up",
    tips: [
      { text: "Feet anchored, arms on chest", category: "form" },
      { text: "Curl up fully, controlled descent", category: "form" },
      { text: "Don't use momentum to jerk up", category: "mistake" },
      { text: "Exhale sitting up", category: "breathing" },
    ],
  },
  "leg raise": {
    name: "Leg Raise",
    tips: [
      { text: "Hands under hips for support", category: "form" },
      { text: "Lower legs slowly, don't drop", category: "form" },
      { text: "Don't arch lower back off floor", category: "mistake" },
      { text: "Exhale raising legs", category: "breathing" },
    ],
  },
  "side plank": {
    name: "Side Plank",
    tips: [
      { text: "Elbow under shoulder, hips stacked", category: "form" },
      { text: "Straight line from head to feet", category: "form" },
      { text: "Don't let hips drop", category: "mistake" },
      { text: "Breathe steadily throughout", category: "breathing" },
    ],
  },
  "cable woodchop": {
    name: "Cable Woodchop",
    tips: [
      { text: "Rotate from hips and core", category: "form" },
      { text: "Arms stay extended, guide the cable", category: "form" },
      { text: "Don't twist with just arms", category: "mistake" },
      { text: "Exhale chopping down/across", category: "breathing" },
    ],
  },
  "dead bug": {
    name: "Dead Bug",
    tips: [
      { text: "Back flat on floor throughout", category: "form" },
      { text: "Opposite arm and leg extend", category: "form" },
      { text: "Don't let back arch off floor", category: "mistake" },
      { text: "Exhale extending, inhale returning", category: "breathing" },
    ],
  },

  // ── FULL BODY / CARDIO ──────────────────────────────────────────────────
  "burpee": {
    name: "Burpee",
    tips: [
      { text: "Squat, hands down, jump back", category: "form" },
      { text: "Push up, jump feet in, jump up", category: "form" },
      { text: "Don't skip the push up", category: "mistake" },
      { text: "Breathe rhythmically each rep", category: "breathing" },
    ],
  },
  "power clean": {
    name: "Power Clean",
    tips: [
      { text: "Start like deadlift, explosive pull", category: "form" },
      { text: "Catch on front delts, elbows high", category: "form" },
      { text: "Don't reverse curl the bar", category: "mistake" },
      { text: "Exhale at the catch", category: "breathing" },
    ],
  },
  "clean and jerk": {
    name: "Clean and Jerk",
    tips: [
      { text: "Clean to shoulders, then jerk overhead", category: "form" },
      { text: "Split or power jerk — lock out", category: "form" },
      { text: "Don't press out — it's a jerk", category: "mistake" },
      { text: "Brace core for each phase", category: "breathing" },
    ],
  },
  "snatch": {
    name: "Snatch",
    tips: [
      { text: "Wide grip, explosive pull overhead", category: "form" },
      { text: "Catch in overhead squat position", category: "form" },
      { text: "Don't muscle it up — use hips", category: "mistake" },
      { text: "Brace core throughout", category: "breathing" },
    ],
  },
  "box jump": {
    name: "Box Jump",
    tips: [
      { text: "Swing arms, explode from both feet", category: "form" },
      { text: "Land softly with bent knees", category: "form" },
      { text: "Don't land with locked knees", category: "safety" },
      { text: "Exhale on takeoff", category: "breathing" },
    ],
  },
  "kettlebell swing": {
    name: "Kettlebell Swing",
    tips: [
      { text: "Hip hinge, not a squat", category: "form" },
      { text: "Snap hips forward, arms follow", category: "form" },
      { text: "Don't lift with arms — use hips", category: "mistake" },
      { text: "Sharp exhale at top of swing", category: "breathing" },
    ],
  },
  "farmer walk": {
    name: "Farmer Walk",
    tips: [
      { text: "Grip tight, shoulders back and down", category: "form" },
      { text: "Walk tall, short quick steps", category: "form" },
      { text: "Don't lean to one side", category: "mistake" },
      { text: "Breathe steadily while walking", category: "breathing" },
    ],
  },
  "battle rope": {
    name: "Battle Rope",
    tips: [
      { text: "Athletic stance, knees slightly bent", category: "form" },
      { text: "Alternate arms, create waves", category: "form" },
      { text: "Don't stand too upright", category: "mistake" },
      { text: "Breathe rhythmically with waves", category: "breathing" },
    ],
  },
  "rowing machine": {
    name: "Rowing Machine",
    tips: [
      { text: "Drive with legs first, then pull", category: "form" },
      { text: "Handle to lower chest, lean back", category: "form" },
      { text: "Don't pull with arms first", category: "mistake" },
      { text: "Exhale on the drive phase", category: "breathing" },
    ],
  },
  "jump rope": {
    name: "Jump Rope",
    tips: [
      { text: "Wrists turn the rope, not arms", category: "form" },
      { text: "Small jumps, land on balls of feet", category: "form" },
      { text: "Don't jump too high", category: "mistake" },
      { text: "Breathe rhythmically", category: "breathing" },
    ],
  },
  "jumping jack": {
    name: "Jumping Jack",
    tips: [
      { text: "Arms overhead, feet wide simultaneously", category: "form" },
      { text: "Land softly on balls of feet", category: "form" },
      { text: "Don't land flat-footed", category: "mistake" },
      { text: "Breathe rhythmically", category: "breathing" },
    ],
  },
  "sprint": {
    name: "Sprint",
    tips: [
      { text: "Drive knees high, pump arms", category: "form" },
      { text: "Land on balls of feet, lean forward", category: "form" },
      { text: "Don't overstride", category: "mistake" },
      { text: "Breathe powerfully with stride", category: "breathing" },
    ],
  },
  "run": {
    name: "Run",
    tips: [
      { text: "Mid-foot strike, relaxed shoulders", category: "form" },
      { text: "Short stride, high cadence", category: "form" },
      { text: "Don't heel strike heavily", category: "mistake" },
      { text: "Breathe in rhythm with steps", category: "breathing" },
    ],
  },
};

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Get form tips for an exercise by name.
 * Returns null if no tips are available.
 */
export function getFormTips(exerciseName: string): ExerciseFormTips | null {
  const norm = exerciseName.toLowerCase().replace(/[^a-z0-9 -]/g, "").trim();
  return FORM_TIPS[norm] ?? null;
}

/**
 * Check if an exercise has form tips available.
 */
export function hasFormTips(exerciseName: string): boolean {
  const norm = exerciseName.toLowerCase().replace(/[^a-z0-9 -]/g, "").trim();
  return norm in FORM_TIPS;
}

/**
 * Get the icon name for a tip category.
 */
export function getTipCategoryIcon(category: FormTip["category"]): string {
  switch (category) {
    case "form": return "check-circle";
    case "mistake": return "warning";
    case "breathing": return "air";
    case "safety": return "shield";
    default: return "info";
  }
}

/**
 * Get the colour for a tip category.
 */
export function getTipCategoryColor(category: FormTip["category"]): string {
  switch (category) {
    case "form": return "#22C55E";     // green
    case "mistake": return "#F59E0B";  // amber
    case "breathing": return "#3B82F6"; // blue
    case "safety": return "#EF4444";   // red
    default: return "#9BA1A6";
  }
}

/**
 * Get all exercises with form tips.
 */
export function getAllFormTipExercises(): string[] {
  return Object.keys(FORM_TIPS);
}

/**
 * Get the count of exercises with form tips.
 */
export function getFormTipCount(): number {
  return Object.keys(FORM_TIPS).length;
}
