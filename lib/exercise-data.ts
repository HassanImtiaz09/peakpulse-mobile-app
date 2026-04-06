/**
 * Exercise Data Module
 *
 * Extended exercise metadata including muscle group targeting, multi-angle GIF views,
 * and focus angle annotations for detailed form study.
 */
import type { MuscleGroup } from "@/components/body-diagram";

export interface ExerciseAngleView {
  /** GIF URL for this angle */
  gifUrl: string;
  /** Label for this angle (e.g., "Front View", "Side View") */
  label: string;
  /** Focus annotation — what to watch for from this angle */
  focus: string;
}

export interface ExerciseInfo {
  /** Display name */
  name: string;
  /** Normalised key for lookup */
  key: string;
  /** Primary muscle groups targeted */
  primaryMuscles: MuscleGroup[];
  /** Secondary muscle groups targeted */
  secondaryMuscles: MuscleGroup[];
  /** Category for filtering */
  category: "chest" | "back" | "shoulders" | "arms" | "legs" | "core" | "cardio" | "full_body";
  /** Equipment needed */
  equipment: string;
  /** Difficulty level */
  difficulty: "beginner" | "intermediate" | "advanced";
  /** Multi-angle GIF views (2-3 per exercise) */
  angleViews: ExerciseAngleView[];
  /** Short form cue */
  cue: string;
}

// ── Exercise Database ─────────────────────────────────────────────────────────
// Each exercise has 2-3 angle views with focus annotations

const EXERCISE_DB: ExerciseInfo[] = [
  // ── CHEST ──────────────────────────────────────────────────────────────────
  {
    name: "Bench Press",
    key: "bench press",
    primaryMuscles: ["chest"],
    secondaryMuscles: ["triceps", "shoulders"],
    category: "chest",
    equipment: "Barbell, Bench",
    difficulty: "intermediate",
    cue: "Keep shoulder blades retracted. Bar touches mid-chest.",
    angleViews: [
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-barbell-bench-press-front.mp4", label: "Front View", focus: "Grip width should be just outside shoulder width, wrists stacked over elbows" },
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-barbell-bench-press-side_KciuhbB.mp4", label: "Side View", focus: "Watch elbow angle at 45° from torso, bar path should be slightly diagonal" }
      ],
  },
  {
    name: "Push Up",
    key: "push up",
    primaryMuscles: ["chest"],
    secondaryMuscles: ["triceps", "shoulders", "abs"],
    category: "chest",
    equipment: "Bodyweight",
    difficulty: "beginner",
    cue: "Straight body line. Lower until chest nearly touches floor.",
    angleViews: [
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-Bodyweight-push-up-front.mp4", label: "Front View", focus: "Hands placed slightly wider than shoulders, fingers spread for stability" },
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-Bodyweight-push-up-side.mp4", label: "Side View", focus: "Body forms a straight line from head to heels, no hip sag or pike" }
      ],
  },
  {
    name: "Dumbbell Fly",
    key: "dumbbell fly",
    primaryMuscles: ["chest"],
    secondaryMuscles: ["shoulders"],
    category: "chest",
    equipment: "Dumbbells, Bench",
    difficulty: "intermediate",
    cue: "Slight elbow bend throughout. Squeeze chest at top.",
    angleViews: [
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-dumbbell-chest-fly-front.mp4", label: "Front View", focus: "Dumbbells lower to chest level, not below — protect shoulder joint" },
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-dumbbell-chest-fly-side.mp4", label: "Side View", focus: "Maintain slight bend in elbows throughout — arms should look like hugging a barrel" }
      ],
  },
  {
    name: "Incline Bench Press",
    key: "incline bench press",
    primaryMuscles: ["chest", "shoulders"],
    secondaryMuscles: ["triceps"],
    category: "chest",
    equipment: "Barbell, Incline Bench",
    difficulty: "intermediate",
    cue: "30-45° incline. Drive bar in a slight arc to upper chest.",
    angleViews: [
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-Barbell-barbell-incline-bench-press-front.mp4", label: "Front View", focus: "Grip slightly narrower than flat bench, elbows at 45° from torso" },
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-Barbell-barbell-incline-bench-press-side.mp4", label: "Side View", focus: "Bench angle between 30-45°, bar touches upper chest just below collarbone" }
      ],
  },
  {
    name: "Incline Dumbbell Press",
    key: "incline dumbbell press",
    primaryMuscles: ["chest", "shoulders"],
    secondaryMuscles: ["triceps"],
    category: "chest",
    equipment: "Dumbbells, Incline Bench",
    difficulty: "intermediate",
    cue: "Press dumbbells up and slightly inward. Squeeze at top.",
    angleViews: [
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-dumbbell-incline-bench-press-front_q2q0T12.mp4", label: "Front View", focus: "Palms face forward, dumbbells don't touch at top — maintain tension" },
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-dumbbell-incline-bench-press-side_2HBfFN3.mp4", label: "Side View", focus: "Dumbbells start at shoulder level, press up in a slight arc converging at top" }
      ],
  },
  {
    name: "Decline Bench Press",
    key: "decline bench press",
    primaryMuscles: ["chest"],
    secondaryMuscles: ["triceps"],
    category: "chest",
    equipment: "Barbell, Decline Bench",
    difficulty: "intermediate",
    cue: "Secure feet. Lower bar to lower chest. Drive up.",
    angleViews: [
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-dumbbell-decline-bench-press-front.mp4", label: "Front View", focus: "Grip width same as flat bench, secure legs firmly under pad" },
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-dumbbell-decline-bench-press-side.mp4", label: "Side View", focus: "Bar path targets lower pec line, decline angle 15-30°" }
      ],
  },
  {
    name: "Cable Fly",
    key: "cable fly",
    primaryMuscles: ["chest"],
    secondaryMuscles: ["shoulders"],
    category: "chest",
    equipment: "Cable Machine",
    difficulty: "intermediate",
    cue: "Step forward for stretch. Bring hands together at chest height.",
    angleViews: [
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-cable-pec-fly-front.mp4", label: "Front View", focus: "Hands meet at midline, slight bend in elbows maintained throughout" },
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-cable-pec-fly-side.mp4", label: "Side View", focus: "Lean slightly forward, one foot ahead for stability" }
      ],
  },
  {
    name: "Cable Crossover",
    key: "cable crossover",
    primaryMuscles: ["chest"],
    secondaryMuscles: ["shoulders"],
    category: "chest",
    equipment: "Cable Machine",
    difficulty: "intermediate",
    cue: "High to low arc. Squeeze at bottom.",
    angleViews: [
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-cable-chestpress-front.mp4", label: "Front View", focus: "Cables set high, hands cross at waist level for lower chest emphasis" },
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-cable-chestpress-side.mp4", label: "Side View", focus: "Maintain forward lean, control the eccentric phase" }
      ],
  },
  {
    name: "Dip",
    key: "dip",
    primaryMuscles: ["chest", "triceps"],
    secondaryMuscles: ["shoulders"],
    category: "chest",
    equipment: "Dip Station",
    difficulty: "intermediate",
    cue: "Lean forward for chest emphasis. Lower until upper arms parallel.",
    angleViews: [
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-Dumbbells-dumbbell-weighted-dip-front.mp4", label: "Front View", focus: "Elbows track slightly outward, lower until 90° elbow bend" },
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-Dumbbells-dumbbell-weighted-dip-side.mp4", label: "Side View", focus: "Forward lean targets chest, upright targets triceps — lean 30° forward" }
      ],
  },
  {
    name: "Chest Dip",
    key: "chest dip",
    primaryMuscles: ["chest"],
    secondaryMuscles: ["triceps", "shoulders"],
    category: "chest",
    equipment: "Dip Station",
    difficulty: "intermediate",
    cue: "Lean forward. Deep stretch at bottom. Squeeze chest at top.",
    angleViews: [
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-Dumbbells-dumbbell-weighted-dip-front.mp4", label: "Front View", focus: "Wide grip on bars, elbows flare slightly outward" },
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-Dumbbells-dumbbell-weighted-dip-side.mp4", label: "Side View", focus: "Greater forward lean than tricep dip, lower deeper for chest stretch" }
      ],
  },

  // ── BACK ───────────────────────────────────────────────────────────────────
  {
    name: "Pull Up",
    key: "pull up",
    primaryMuscles: ["lats", "back"],
    secondaryMuscles: ["biceps", "forearms"],
    category: "back",
    equipment: "Pull-Up Bar",
    difficulty: "intermediate",
    cue: "Full hang at bottom. Chin clears bar. Control the descent.",
    angleViews: [
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-bodyweight-pullup-front.mp4", label: "Front View", focus: "Grip slightly wider than shoulders, pull elbows down and back" },
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-bodyweight-pullup-side.mp4", label: "Side View", focus: "Slight lean back, chest drives toward bar — avoid kipping" }
      ],
  },
  {
    name: "Chin Up",
    key: "chin up",
    primaryMuscles: ["lats", "biceps"],
    secondaryMuscles: ["back", "forearms"],
    category: "back",
    equipment: "Pull-Up Bar",
    difficulty: "intermediate",
    cue: "Supinated grip. Chin clears bar at top.",
    angleViews: [
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-bodyweight-chinup-front.mp4", label: "Front View", focus: "Underhand grip shoulder-width, biceps assist the pull" },
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-bodyweight-chinup-side.mp4", label: "Side View", focus: "Drive chest to bar, squeeze at top for 1 second" }
      ],
  },
  {
    name: "Lat Pulldown",
    key: "lat pulldown",
    primaryMuscles: ["lats"],
    secondaryMuscles: ["biceps", "back"],
    category: "back",
    equipment: "Cable Machine",
    difficulty: "beginner",
    cue: "Lean back slightly. Pull bar to upper chest.",
    angleViews: [
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-machine-pulldown-front.mp4", label: "Front View", focus: "Wide grip, pull bar to upper chest — not behind neck" },
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-machine-pulldown-side.mp4", label: "Side View", focus: "Slight lean back (15-20°), chest up, squeeze shoulder blades" }
      ],
  },
  {
    name: "Bent Over Row",
    key: "bent over row",
    primaryMuscles: ["back", "lats"],
    secondaryMuscles: ["biceps", "lower_back"],
    category: "back",
    equipment: "Barbell",
    difficulty: "intermediate",
    cue: "Hinge at hips. Pull bar to lower chest. Squeeze back.",
    angleViews: [
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-barbell-bent-over-row-front.mp4", label: "Front View", focus: "Knees slightly bent, back flat — no rounding of lower back" },
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-barbell-bent-over-row-side.mp4", label: "Side View", focus: "Torso at 45° angle, bar travels straight up to lower chest/upper abs" }
      ],
  },
  {
    name: "Dumbbell Row",
    key: "dumbbell row",
    primaryMuscles: ["back", "lats"],
    secondaryMuscles: ["biceps", "forearms"],
    category: "back",
    equipment: "Dumbbell, Bench",
    difficulty: "beginner",
    cue: "One arm on bench. Pull dumbbell to hip. Squeeze lat.",
    angleViews: [
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-Dumbbells-dumbbell-row-bilateral-front.mp4", label: "Front View", focus: "Back flat, supporting hand and knee on bench for stability" },
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-Dumbbells-dumbbell-row-bilateral-side.mp4", label: "Side View", focus: "Pull to hip not shoulder, elbow drives past torso line" }
      ],
  },
  {
    name: "Seated Cable Row",
    key: "seated cable row",
    primaryMuscles: ["back"],
    secondaryMuscles: ["biceps", "lats"],
    category: "back",
    equipment: "Cable Machine",
    difficulty: "beginner",
    cue: "Sit tall. Pull handle to lower chest. Squeeze shoulder blades.",
    angleViews: [
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-machine-seated-cable-row-front.mp4", label: "Front View", focus: "Elbows stay close to body, pull to belly button area" },
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-machine-seated-cable-row-side.mp4", label: "Side View", focus: "Torso stays upright, don't lean back excessively — slight lean OK" }
      ],
  },
  {
    name: "Deadlift",
    key: "deadlift",
    primaryMuscles: ["back", "hamstrings", "glutes"],
    secondaryMuscles: ["lower_back", "forearms", "quads"],
    category: "back",
    equipment: "Barbell",
    difficulty: "advanced",
    cue: "Flat back. Drive through heels. Lock out hips at top.",
    angleViews: [
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-Barbell-barbell-deadlift-front.mp4", label: "Front View", focus: "Feet hip-width, grip just outside knees, shoulders over the bar" },
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-Barbell-barbell-deadlift-side.mp4", label: "Side View", focus: "Bar stays close to shins, back angle consistent until bar passes knees" }
      ],
  },
  {
    name: "T-Bar Row",
    key: "tbar row",
    primaryMuscles: ["back", "lats"],
    secondaryMuscles: ["biceps", "lower_back"],
    category: "back",
    equipment: "T-Bar Machine",
    difficulty: "intermediate",
    cue: "Chest on pad. Pull to chest. Squeeze back.",
    angleViews: [
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-Barbell-landmine-t-bar-rows-front.mp4", label: "Front View", focus: "Neutral grip, squeeze shoulder blades at top of movement" },
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-Barbell-landmine-t-bar-rows-side.mp4", label: "Side View", focus: "Torso at 45°, pull handle to chest, elbows drive back" }
      ],
  },
  {
    name: "Pendlay Row",
    key: "pendlay row",
    primaryMuscles: ["back", "lats"],
    secondaryMuscles: ["biceps", "lower_back"],
    category: "back",
    equipment: "Barbell",
    difficulty: "advanced",
    cue: "Torso parallel to floor. Explosive pull. Bar returns to floor each rep.",
    angleViews: [
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-dumbbell-pendlay-row-front.mp4", label: "Front View", focus: "Overhand grip slightly wider than shoulder width" },
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-dumbbell-pendlay-row-side.mp4", label: "Side View", focus: "Back parallel to floor, explosive concentric, controlled return to floor" }
      ],
  },

  // ── SHOULDERS ──────────────────────────────────────────────────────────────
  {
    name: "Overhead Press",
    key: "overhead press",
    primaryMuscles: ["shoulders"],
    secondaryMuscles: ["triceps", "abs"],
    category: "shoulders",
    equipment: "Barbell",
    difficulty: "intermediate",
    cue: "Brace core. Press bar overhead. Lock out arms.",
    angleViews: [
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-Barbell-barbell-overhead-press-front.mp4", label: "Front View", focus: "Bar starts at collarbone, press straight up — head moves back to let bar pass" },
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-Barbell-barbell-overhead-press-side.mp4", label: "Side View", focus: "Bar path is straight vertical line, core braced, no excessive back lean" }
      ],
  },
  {
    name: "Dumbbell Shoulder Press",
    key: "dumbbell shoulder press",
    primaryMuscles: ["shoulders"],
    secondaryMuscles: ["triceps"],
    category: "shoulders",
    equipment: "Dumbbells",
    difficulty: "beginner",
    cue: "Press dumbbells overhead. Don't lock elbows fully.",
    angleViews: [
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-Dumbbells-dumbbell-overhead-press-front.mp4", label: "Front View", focus: "Dumbbells at ear level to start, press up in slight arc" },
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-Dumbbells-dumbbell-overhead-press-side.mp4", label: "Side View", focus: "Elbows at 90° at bottom, full extension at top" }
      ],
  },
  {
    name: "Lateral Raise",
    key: "lateral raise",
    primaryMuscles: ["shoulders"],
    secondaryMuscles: ["traps"],
    category: "shoulders",
    equipment: "Dumbbells",
    difficulty: "beginner",
    cue: "Slight bend in elbows. Raise to shoulder height. Control descent.",
    angleViews: [
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-Dumbbells-dumbbell-lateral-raise-front.mp4", label: "Front View", focus: "Raise to shoulder height only — going higher shifts to traps" },
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-Dumbbells-dumbbell-lateral-raise-side.mp4", label: "Side View", focus: "Slight forward lean, lead with elbows not wrists" }
      ],
  },
  {
    name: "Front Raise",
    key: "front raise",
    primaryMuscles: ["shoulders"],
    secondaryMuscles: ["chest"],
    category: "shoulders",
    equipment: "Dumbbells",
    difficulty: "beginner",
    cue: "Raise to eye level. Alternate arms or both together.",
    angleViews: [
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-Dumbbells-dumbbell-front-raise-front.mp4", label: "Front View", focus: "Palms face down or neutral, don't swing — use strict form" },
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-Dumbbells-dumbbell-front-raise-side.mp4", label: "Side View", focus: "Arm raises to eye level, slight bend in elbow, control the negative" }
      ],
  },
  {
    name: "Face Pull",
    key: "face pull",
    primaryMuscles: ["shoulders"],
    secondaryMuscles: ["traps", "back"],
    category: "shoulders",
    equipment: "Cable Machine, Rope",
    difficulty: "beginner",
    cue: "Pull rope to face. Externally rotate at end.",
    angleViews: [
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-Machine-machine-face-pulls-front.mp4", label: "Front View", focus: "Pull to forehead level, hands end up beside ears" },
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-Machine-machine-face-pulls-side.mp4", label: "Side View", focus: "External rotation at end — thumbs point back, squeeze rear delts" }
      ],
  },
  {
    name: "Rear Delt Fly",
    key: "rear delt fly",
    primaryMuscles: ["shoulders"],
    secondaryMuscles: ["traps", "back"],
    category: "shoulders",
    equipment: "Dumbbells",
    difficulty: "beginner",
    cue: "Bend forward. Raise dumbbells to sides. Squeeze rear delts.",
    angleViews: [
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-Dumbbells-dumbbell-rear-delt-fly-front.mp4", label: "Front View", focus: "Bent over 45-60°, raise arms to shoulder height, squeeze at top" },
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-Dumbbells-dumbbell-rear-delt-fly-side.mp4", label: "Side View", focus: "Slight bend in elbows, lead with elbows not hands" }
      ],
  },
  {
    name: "Arnold Press",
    key: "arnold press",
    primaryMuscles: ["shoulders"],
    secondaryMuscles: ["triceps"],
    category: "shoulders",
    equipment: "Dumbbells",
    difficulty: "intermediate",
    cue: "Start palms facing you. Rotate as you press up.",
    angleViews: [
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-Dumbbells-dumbbell-arnold-press-front.mp4", label: "Front View", focus: "Start with palms facing chest, rotate 180° as you press overhead" },
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-Dumbbells-dumbbell-arnold-press-side.mp4", label: "Side View", focus: "Smooth rotation throughout press, don't pause mid-rotation" }
      ],
  },
  {
    name: "Upright Row",
    key: "upright row",
    primaryMuscles: ["shoulders", "traps"],
    secondaryMuscles: ["biceps"],
    category: "shoulders",
    equipment: "Barbell or Dumbbells",
    difficulty: "intermediate",
    cue: "Pull bar to chin. Elbows lead the movement.",
    angleViews: [
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-Kettlebells-kettlebell-upright-row-front.mp4", label: "Front View", focus: "Elbows lead and stay higher than wrists, pull to chin level" },
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-Kettlebells-kettlebell-upright-row-side.mp4", label: "Side View", focus: "Bar stays close to body, don't lean back" }
      ],
  },
  {
    name: "Shrug",
    key: "shrug",
    primaryMuscles: ["traps"],
    secondaryMuscles: ["shoulders"],
    category: "shoulders",
    equipment: "Barbell or Dumbbells",
    difficulty: "beginner",
    cue: "Shrug straight up. Hold at top. Don't roll shoulders.",
    angleViews: [
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-Dumbbells-dumbbell-shrug-front.mp4", label: "Front View", focus: "Straight up and down — no rolling, hold peak contraction 1-2 seconds" },
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-Dumbbells-dumbbell-shrug-side.mp4", label: "Side View", focus: "Ears to shoulders motion, arms stay straight" }
      ],
  },

  // ── ARMS ───────────────────────────────────────────────────────────────────
  {
    name: "Bicep Curl",
    key: "bicep curl",
    primaryMuscles: ["biceps"],
    secondaryMuscles: ["forearms"],
    category: "arms",
    equipment: "Dumbbells",
    difficulty: "beginner",
    cue: "Keep elbows pinned. Full range of motion. Squeeze at top.",
    angleViews: [
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-Dumbbells-dumbbell-curl-front.mp4", label: "Front View", focus: "Elbows stay pinned to sides, no swinging — strict curl" },
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-Dumbbells-dumbbell-curl-side.mp4", label: "Side View", focus: "Full extension at bottom, full contraction at top, 2-second negative" }
      ],
  },
  {
    name: "Barbell Curl",
    key: "barbell curl",
    primaryMuscles: ["biceps"],
    secondaryMuscles: ["forearms"],
    category: "arms",
    equipment: "Barbell",
    difficulty: "beginner",
    cue: "Shoulder-width grip. Curl to shoulders. No swinging.",
    angleViews: [
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-Barbell-barbell-curl-front.mp4", label: "Front View", focus: "Shoulder-width grip, elbows stationary, curl to shoulder level" },
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-Barbell-barbell-curl-side.mp4", label: "Side View", focus: "Upper arms don't move, only forearms rotate up" }
      ],
  },
  {
    name: "Hammer Curl",
    key: "hammer curl",
    primaryMuscles: ["biceps", "forearms"],
    secondaryMuscles: [],
    category: "arms",
    equipment: "Dumbbells",
    difficulty: "beginner",
    cue: "Neutral grip (palms facing each other). Curl to shoulder.",
    angleViews: [
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-Dumbbells-dumbbell-hammer-curl-front.mp4", label: "Front View", focus: "Palms face each other throughout — targets brachialis and brachioradialis" },
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-Dumbbells-dumbbell-hammer-curl-side.mp4", label: "Side View", focus: "Neutral grip maintained, no wrist rotation during curl" }
      ],
  },
  {
    name: "Preacher Curl",
    key: "preacher curl",
    primaryMuscles: ["biceps"],
    secondaryMuscles: ["forearms"],
    category: "arms",
    equipment: "Preacher Bench, Barbell",
    difficulty: "intermediate",
    cue: "Arm flat on pad. Curl to top. Slow negative.",
    angleViews: [
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-Dumbbells-dumbbell-preacher-curl-front.mp4", label: "Front View", focus: "Full extension at bottom (careful with heavy weight), squeeze at top" },
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-Dumbbells-dumbbell-preacher-curl-side.mp4", label: "Side View", focus: "Upper arm flat on pad, don't lift elbows — isolates bicep peak" }
      ],
  },
  {
    name: "Concentration Curl",
    key: "concentration curl",
    primaryMuscles: ["biceps"],
    secondaryMuscles: [],
    category: "arms",
    equipment: "Dumbbell",
    difficulty: "beginner",
    cue: "Elbow braced on inner thigh. Curl and squeeze.",
    angleViews: [
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-dumbbell-concentration-curl-front.mp4", label: "Front View", focus: "Elbow braced against inner thigh, curl to shoulder, squeeze 2 seconds" },
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-dumbbell-concentration-curl-side.mp4", label: "Side View", focus: "Only forearm moves, upper arm stays completely still" }
      ],
  },
  {
    name: "Tricep Pushdown",
    key: "tricep pushdown",
    primaryMuscles: ["triceps"],
    secondaryMuscles: [],
    category: "arms",
    equipment: "Cable Machine",
    difficulty: "beginner",
    cue: "Elbows pinned. Push down to full extension. Squeeze.",
    angleViews: [
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-Cables-cable-push-down-front.mp4", label: "Front View", focus: "Slight forward lean, don't use body momentum" },
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-Cables-cable-push-down-side.mp4", label: "Side View", focus: "Elbows pinned to sides, push to full lockout, squeeze triceps" }
      ],
  },
  {
    name: "Tricep Extension",
    key: "tricep extension",
    primaryMuscles: ["triceps"],
    secondaryMuscles: [],
    category: "arms",
    equipment: "Dumbbell or Cable",
    difficulty: "beginner",
    cue: "Overhead. Extend arms fully. Keep elbows close to head.",
    angleViews: [
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-Bodyweight-bodyweight-tricep-extension-front.mp4", label: "Front View", focus: "Elbows close to head, full extension at top" },
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-Bodyweight-bodyweight-tricep-extension-side.mp4", label: "Side View", focus: "Elbows point to ceiling, only forearms move — upper arms stay vertical" }
      ],
  },
  {
    name: "Overhead Tricep Extension",
    key: "overhead tricep extension",
    primaryMuscles: ["triceps"],
    secondaryMuscles: [],
    category: "arms",
    equipment: "Dumbbell",
    difficulty: "beginner",
    cue: "Hold dumbbell overhead. Lower behind head. Extend.",
    angleViews: [
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-Band-band-overhead-tricep-extension-front.mp4", label: "Front View", focus: "Elbows point forward, lower weight behind head to 90° then extend" },
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-Band-band-overhead-tricep-extension-side.mp4", label: "Side View", focus: "Elbows point forward, lower weight behind head to 90° then extend" }
      ],
  },
  {
    name: "Skull Crusher",
    key: "skull crusher",
    primaryMuscles: ["triceps"],
    secondaryMuscles: [],
    category: "arms",
    equipment: "EZ Bar, Bench",
    difficulty: "intermediate",
    cue: "Lower bar to forehead. Extend arms. Keep elbows in.",
    angleViews: [
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-Kettlebells-kettlebell-skull-crusher-front.mp4", label: "Front View", focus: "Elbows shoulder-width apart, don't flare — isolates long head" },
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-Kettlebells-kettlebell-skull-crusher-side.mp4", label: "Side View", focus: "Bar lowers to forehead level, elbows stay pointed at ceiling" }
      ],
  },
  {
    name: "Close Grip Bench Press",
    key: "close grip bench press",
    primaryMuscles: ["triceps"],
    secondaryMuscles: ["chest", "shoulders"],
    category: "arms",
    equipment: "Barbell, Bench",
    difficulty: "intermediate",
    cue: "Hands shoulder-width. Elbows close to body. Press up.",
    angleViews: [
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-Barbell-barbell-close-grip-bench-press-front.mp4", label: "Front View", focus: "Bar touches lower chest, elbows at 30° from torso" },
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-Barbell-barbell-close-grip-bench-press-side.mp4", label: "Side View", focus: "Grip shoulder-width, elbows tuck close to body — targets triceps" }
      ],
  },

  // ── LEGS ───────────────────────────────────────────────────────────────────
  {
    name: "Squat",
    key: "squat",
    primaryMuscles: ["quads", "glutes"],
    secondaryMuscles: ["hamstrings", "lower_back", "abs"],
    category: "legs",
    equipment: "Barbell, Squat Rack",
    difficulty: "intermediate",
    cue: "Chest up. Knees track over toes. Depth to parallel.",
    angleViews: [
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-Barbell-barbell-squat-front.mp4", label: "Front View", focus: "Feet shoulder-width, toes slightly out, knees don't cave inward" },
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-Barbell-barbell-squat-side.mp4", label: "Side View", focus: "Knees track over toes, hip crease below knee at bottom, chest stays up" }
      ],
  },
  {
    name: "Front Squat",
    key: "front squat",
    primaryMuscles: ["quads"],
    secondaryMuscles: ["glutes", "abs"],
    category: "legs",
    equipment: "Barbell, Squat Rack",
    difficulty: "advanced",
    cue: "Elbows high. Upright torso. Drive through heels.",
    angleViews: [
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-Barbell-barbell-front-squat-olympic-front.mp4", label: "Front View", focus: "Bar rests on front delts, fingertips support — elbows parallel to floor" },
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-Barbell-barbell-front-squat-olympic-side.mp4", label: "Side View", focus: "Elbows high, torso much more upright than back squat" }
      ],
  },
  {
    name: "Goblet Squat",
    key: "goblet squat",
    primaryMuscles: ["quads", "glutes"],
    secondaryMuscles: ["abs"],
    category: "legs",
    equipment: "Dumbbell or Kettlebell",
    difficulty: "beginner",
    cue: "Hold weight at chest. Sit between heels. Elbows inside knees.",
    angleViews: [
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-dumbbell-goblet-squat-front.mp4", label: "Front View", focus: "Weight held at chest, elbows inside knees at bottom — opens hips" },
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-dumbbell-goblet-squat-side.mp4", label: "Side View", focus: "Upright torso, sit back and down, full depth" }
      ],
  },
  {
    name: "Bulgarian Split Squat",
    key: "bulgarian split squat",
    primaryMuscles: ["quads", "glutes"],
    secondaryMuscles: ["hamstrings"],
    category: "legs",
    equipment: "Dumbbells, Bench",
    difficulty: "intermediate",
    cue: "Rear foot on bench. Lower until front thigh parallel.",
    angleViews: [
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-Bodyweight-bulgarian-split-squat-front.mp4", label: "Front View", focus: "Torso upright, front knee tracks over toes, don't lean forward" },
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-Bodyweight-bulgarian-split-squat-side.mp4", label: "Side View", focus: "Front shin vertical, rear foot on bench, lower until front thigh parallel" }
      ],
  },
  {
    name: "Lunge",
    key: "lunge",
    primaryMuscles: ["quads", "glutes"],
    secondaryMuscles: ["hamstrings"],
    category: "legs",
    equipment: "Bodyweight or Dumbbells",
    difficulty: "beginner",
    cue: "Step forward. Lower until both knees at 90°. Push back up.",
    angleViews: [
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-bodyweight-forward-lunge-front_zb4K50d.mp4", label: "Front View", focus: "Step far enough forward, torso stays upright, drive through front heel" },
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-bodyweight-forward-lunge-side_4k0dfH0.mp4", label: "Side View", focus: "Both knees at 90° at bottom, front knee doesn't pass toes" }
      ],
  },
  {
    name: "Leg Press",
    key: "leg press",
    primaryMuscles: ["quads"],
    secondaryMuscles: ["glutes", "hamstrings"],
    category: "legs",
    equipment: "Leg Press Machine",
    difficulty: "beginner",
    cue: "Feet shoulder-width on platform. Lower to 90°. Press up.",
    angleViews: [
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-Machine-machine-leg-press-front.mp4", label: "Front View", focus: "Feet placement: high = more glutes/hams, low = more quads" },
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-Machine-machine-leg-press-side.mp4", label: "Side View", focus: "Lower until knees at 90°, don't let lower back round off the pad" }
      ],
  },
  {
    name: "Leg Curl",
    key: "leg curl",
    primaryMuscles: ["hamstrings"],
    secondaryMuscles: ["calves"],
    category: "legs",
    equipment: "Leg Curl Machine",
    difficulty: "beginner",
    cue: "Curl heels to glutes. Slow eccentric.",
    angleViews: [
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-dumbbell-leg-curl-front.mp4", label: "Front View", focus: "Hips stay flat on pad, don't lift hips to assist" },
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-dumbbell-leg-curl-side.mp4", label: "Side View", focus: "Full range — from straight legs to heels touching glutes" }
      ],
  },
  {
    name: "Leg Extension",
    key: "leg extension",
    primaryMuscles: ["quads"],
    secondaryMuscles: [],
    category: "legs",
    equipment: "Leg Extension Machine",
    difficulty: "beginner",
    cue: "Full extension at top. Pause 1 second.",
    angleViews: [
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-machine-leg-extension-front.mp4", label: "Front View", focus: "Back flat against pad, don't use momentum" },
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-machine-leg-extension-side.mp4", label: "Side View", focus: "Full extension at top, squeeze quads, 1-second hold" }
      ],
  },
  {
    name: "Romanian Deadlift",
    key: "romanian deadlift",
    primaryMuscles: ["hamstrings", "glutes"],
    secondaryMuscles: ["lower_back"],
    category: "legs",
    equipment: "Barbell or Dumbbells",
    difficulty: "intermediate",
    cue: "Hinge at hips. Bar slides down thighs. Feel hamstring stretch.",
    angleViews: [
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-Barbell-barbell-romanian-deadlift-front.mp4", label: "Front View", focus: "Slight knee bend, back stays flat, shoulders over the bar" },
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-Barbell-barbell-romanian-deadlift-side_dnNh5UH.mp4", label: "Side View", focus: "Hinge at hips, bar slides down thighs, stop when hamstrings fully stretched" }
      ],
  },
  {
    name: "Hip Thrust",
    key: "hip thrust",
    primaryMuscles: ["glutes"],
    secondaryMuscles: ["hamstrings", "quads"],
    category: "legs",
    equipment: "Barbell, Bench",
    difficulty: "intermediate",
    cue: "Upper back on bench. Drive hips up. Squeeze glutes at top.",
    angleViews: [
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-Barbell-barbell-hip-thrust-front.mp4", label: "Front View", focus: "Feet flat, knees at 90° at top, don't hyperextend lower back" },
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-Barbell-barbell-hip-thrust-side.mp4", label: "Side View", focus: "Drive hips to full extension, chin tucked, squeeze glutes 2 seconds at top" }
      ],
  },
  {
    name: "Glute Bridge",
    key: "glute bridge",
    primaryMuscles: ["glutes"],
    secondaryMuscles: ["hamstrings"],
    category: "legs",
    equipment: "Bodyweight",
    difficulty: "beginner",
    cue: "Lie flat. Drive hips up. Squeeze glutes at top.",
    angleViews: [
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-Bodyweight-glute-bridge-front.mp4", label: "Front View", focus: "Knees hip-width, don't let knees cave inward" },
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-Bodyweight-glute-bridge-side.mp4", label: "Side View", focus: "Feet flat on floor, drive through heels, squeeze glutes at top" }
      ],
  },
  {
    name: "Calf Raise",
    key: "calf raise",
    primaryMuscles: ["calves"],
    secondaryMuscles: [],
    category: "legs",
    equipment: "Bodyweight or Machine",
    difficulty: "beginner",
    cue: "Rise onto toes. Pause at top. Full stretch at bottom.",
    angleViews: [
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-machine-standing-calf-raises-front.mp4", label: "Front View", focus: "Full range — deep stretch at bottom, high on toes at top" },
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-machine-standing-calf-raises-side.mp4", label: "Side View", focus: "Full range — deep stretch at bottom, high on toes at top" }
      ],
  },
    {
      name: "Seated Calf Raise",
      key: "seated calf raise",
      primaryMuscles: ["calves"],
      secondaryMuscles: [],
      category: "legs",
      equipment: "Seated Calf Machine",
      difficulty: "beginner",
      cue: "Place pad on thighs. Rise onto toes. Pause at top. Full stretch at bottom.",
      angleViews: [
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-machine-seated-calf-raise-front.mp4", label: "Front View", focus: "Knees at 90 degrees, full range of motion through ankle" },
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-machine-seated-calf-raise-side.mp4", label: "Side View", focus: "Full stretch at bottom, high on toes at top" }
      ],
    },
  {
    name: "Hack Squat",
    key: "hack squat",
    primaryMuscles: ["quads"],
    secondaryMuscles: ["glutes"],
    category: "legs",
    equipment: "Hack Squat Machine",
    difficulty: "intermediate",
    cue: "Feet shoulder-width. Lower to 90°. Drive through heels.",
    angleViews: [
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-Machine-machine-hack-squat-front.mp4", label: "Front View", focus: "Feet placement affects emphasis — narrow = more quads, wide = more inner thigh" },
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-Machine-machine-hack-squat-side.mp4", label: "Side View", focus: "Back flat against pad, lower to 90° knee angle" }
      ],
  },
  {
    name: "Step Up",
    key: "step up",
    primaryMuscles: ["quads", "glutes"],
    secondaryMuscles: ["hamstrings"],
    category: "legs",
    equipment: "Bench or Box, Dumbbells",
    difficulty: "beginner",
    cue: "Full foot on box. Drive through heel. Stand tall at top.",
    angleViews: [
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-Kettlebells-kettlebell-step-up-front.mp4", label: "Front View", focus: "Knee tracks over toes, torso upright" },
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-Kettlebells-kettlebell-step-up-side.mp4", label: "Side View", focus: "Full foot on box, drive through front heel, don't push off back foot" }
      ],
  },
  {
    name: "Reverse Lunge",
    key: "reverse lunge",
    primaryMuscles: ["quads", "glutes"],
    secondaryMuscles: ["hamstrings"],
    category: "legs",
    equipment: "Bodyweight or Dumbbells",
    difficulty: "beginner",
    cue: "Step back. Lower until both knees at 90°. Push forward to stand.",
    angleViews: [
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-barbell-reverse-lunge-front.mp4", label: "Front View", focus: "Torso upright, drive through front heel to return" },
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-barbell-reverse-lunge-side.mp4", label: "Side View", focus: "Step back far enough for 90° angles, front knee stays over ankle" }
      ],
  },
  {
    name: "Sumo Deadlift",
    key: "sumo deadlift",
    primaryMuscles: ["quads", "glutes"],
    secondaryMuscles: ["hamstrings", "lower_back"],
    category: "legs",
    equipment: "Barbell",
    difficulty: "advanced",
    cue: "Wide stance. Toes out. Grip inside knees. Drive hips forward.",
    angleViews: [
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-Barbell-barbell-sumo-deadlift-front_hI2eO77.mp4", label: "Front View", focus: "Wide stance, toes pointed out 45°, grip inside knees" },
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-Barbell-barbell-sumo-deadlift-side_5lcmI1F.mp4", label: "Side View", focus: "More upright torso than conventional, hips closer to bar" }
      ],
  },
  {
    name: "Stiff Leg Deadlift",
    key: "stiff leg deadlift",
    primaryMuscles: ["hamstrings"],
    secondaryMuscles: ["glutes", "lower_back"],
    category: "legs",
    equipment: "Barbell",
    difficulty: "intermediate",
    cue: "Legs nearly straight. Hinge at hips. Feel hamstring stretch.",
    angleViews: [
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-barbell-stiff-leg-deadlift-front.mp4", label: "Front View", focus: "Back stays flat, stop when hamstrings fully stretched" },
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-barbell-stiff-leg-deadlift-side.mp4", label: "Side View", focus: "Minimal knee bend, hinge from hips, bar slides down legs" }
      ],
  },

  // ── CORE ───────────────────────────────────────────────────────────────────
  {
    name: "Plank",
    key: "plank",
    primaryMuscles: ["abs"],
    secondaryMuscles: ["shoulders", "lower_back"],
    category: "core",
    equipment: "Bodyweight",
    difficulty: "beginner",
    cue: "Straight line from head to heels. Brace core. Breathe.",
    angleViews: [
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-Medicine-Ball-plank-front.mp4", label: "Front View", focus: "Elbows under shoulders, forearms parallel, core braced" },
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-Medicine-Ball-plank-side.mp4", label: "Side View", focus: "Straight line from head to heels — no hip sag or pike" }
      ],
  },
  {
    name: "Side Plank",
    key: "side plank",
    primaryMuscles: ["obliques"],
    secondaryMuscles: ["abs", "shoulders"],
    category: "core",
    equipment: "Bodyweight",
    difficulty: "beginner",
    cue: "Stack feet. Hips up. Straight line from head to feet.",
    angleViews: [
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-bodyweight-elbow-side-plank-front.mp4", label: "Front View", focus: "Elbow under shoulder, hips lifted, body in straight line" },
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-bodyweight-elbow-side-plank-side.mp4", label: "Side View", focus: "Don't let hips drop, stack or stagger feet for stability" }
      ],
  },
  {
    name: "Crunch",
    key: "crunch",
    primaryMuscles: ["abs"],
    secondaryMuscles: [],
    category: "core",
    equipment: "Bodyweight",
    difficulty: "beginner",
    cue: "Curl shoulders off floor. Don't pull neck. Exhale up.",
    angleViews: [
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-bodyweight-crunch-front.mp4", label: "Front View", focus: "Hands behind head but don't pull neck — look at ceiling" },
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-bodyweight-crunch-side.mp4", label: "Side View", focus: "Shoulders lift 30° off floor, lower back stays down" }
      ],
  },
  {
    name: "Sit Up",
    key: "sit up",
    primaryMuscles: ["abs"],
    secondaryMuscles: ["hip_flexors"],
    category: "core",
    equipment: "Bodyweight",
    difficulty: "beginner",
    cue: "Full range. Curl up to seated. Control descent.",
    angleViews: [
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-Bodyweight-situp-front.mp4", label: "Front View", focus: "Feet anchored, arms crossed on chest or behind head" },
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-Bodyweight-situp-side.mp4", label: "Side View", focus: "Full range from flat to seated, curl up vertebra by vertebra" }
      ],
  },
  {
    name: "Russian Twist",
    key: "russian twist",
    primaryMuscles: ["obliques"],
    secondaryMuscles: ["abs"],
    category: "core",
    equipment: "Bodyweight or Medicine Ball",
    difficulty: "intermediate",
    cue: "Lean back 45°. Rotate torso side to side. Feet off floor.",
    angleViews: [
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-Kettlebells-kettlebell-russian-twist-front.mp4", label: "Front View", focus: "Lean back 45°, rotate from thoracic spine not just arms" },
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-Kettlebells-kettlebell-russian-twist-side.mp4", label: "Side View", focus: "Feet elevated for more challenge, touch weight to floor each side" }
      ],
  },
  {
    name: "Mountain Climber",
    key: "mountain climber",
    primaryMuscles: ["abs"],
    secondaryMuscles: ["shoulders", "hip_flexors", "quads"],
    category: "core",
    equipment: "Bodyweight",
    difficulty: "beginner",
    cue: "Plank position. Drive knees to chest alternately. Keep hips level.",
    angleViews: [
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-bodyweight-mountain-climber-front.mp4", label: "Front View", focus: "Hands under shoulders, core tight, don't bounce hips up" },
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-bodyweight-mountain-climber-side.mp4", label: "Side View", focus: "Hips stay level, drive knee to chest, quick alternating rhythm" }
      ],
  },
  {
    name: "Leg Raise",
    key: "leg raise",
    primaryMuscles: ["abs"],
    secondaryMuscles: ["hip_flexors"],
    category: "core",
    equipment: "Bodyweight",
    difficulty: "intermediate",
    cue: "Lie flat. Raise legs to 90°. Lower slowly. Don't arch back.",
    angleViews: [
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-Bodyweight-laying-leg-raises-front.mp4", label: "Front View", focus: "Legs together, hands under hips for support if needed" },
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-Bodyweight-laying-leg-raises-side.mp4", label: "Side View", focus: "Lower back stays pressed to floor, legs raise to 90° then lower slowly" }
      ],
  },
  {
    name: "Hanging Leg Raise",
    key: "hanging leg raise",
    primaryMuscles: ["abs"],
    secondaryMuscles: ["hip_flexors", "forearms"],
    category: "core",
    equipment: "Pull-Up Bar",
    difficulty: "advanced",
    cue: "Dead hang. Raise legs to 90°. Control the swing.",
    angleViews: [
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-bodyweight-hanging-knee-raises-front.mp4", label: "Front View", focus: "Grip shoulder-width, legs together, posterior pelvic tilt at top" },
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-bodyweight-hanging-knee-raises-side.mp4", label: "Side View", focus: "Raise legs to 90° or higher, control the negative — no swinging" }
      ],
  },
  {
    name: "Ab Wheel Rollout",
    key: "ab wheel rollout",
    primaryMuscles: ["abs"],
    secondaryMuscles: ["shoulders", "lower_back"],
    category: "core",
    equipment: "Ab Wheel",
    difficulty: "advanced",
    cue: "Roll out slowly. Extend as far as possible. Roll back with core.",
    angleViews: [
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-trx-ab-rollout-front.mp4", label: "Front View", focus: "Arms straight, core braced, roll back using abs not hip flexors" },
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-trx-ab-rollout-side.mp4", label: "Side View", focus: "Extend as far as you can control, don't let lower back sag" }
      ],
  },
  {
    name: "Bicycle Crunch",
    key: "bicycle crunch",
    primaryMuscles: ["abs", "obliques"],
    secondaryMuscles: [],
    category: "core",
    equipment: "Bodyweight",
    difficulty: "beginner",
    cue: "Opposite elbow to knee. Extend other leg. Rotate torso.",
    angleViews: [
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-Bodyweight-bicycle-crunch-front.mp4", label: "Front View", focus: "Rotate from thoracic spine, opposite elbow meets opposite knee" },
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-Bodyweight-bicycle-crunch-side.mp4", label: "Side View", focus: "Shoulders stay off floor throughout, controlled pace" }
      ],
  },
  {
    name: "Dead Bug",
    key: "dead bug",
    primaryMuscles: ["abs"],
    secondaryMuscles: ["lower_back"],
    category: "core",
    equipment: "Bodyweight",
    difficulty: "beginner",
    cue: "Lie on back. Opposite arm and leg extend. Keep back flat.",
    angleViews: [
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-Bodyweight-dead-bug-front.mp4", label: "Front View", focus: "Slow and controlled, exhale as you extend, inhale as you return" },
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-Bodyweight-dead-bug-side.mp4", label: "Side View", focus: "Lower back pressed to floor throughout, extend opposite arm and leg" }
      ],
  },
  {
    name: "Cable Woodchop",
    key: "cable woodchop",
    primaryMuscles: ["obliques"],
    secondaryMuscles: ["abs", "shoulders"],
    category: "core",
    equipment: "Cable Machine",
    difficulty: "intermediate",
    cue: "Rotate torso. Pull cable diagonally. Control the return.",
    angleViews: [
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-cable-woodchopper-front.mp4", label: "Front View", focus: "Rotate from core not arms, feet planted, hips face forward" },
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-cable-woodchopper-side.mp4", label: "Side View", focus: "Diagonal pull from high to low (or low to high), control eccentric" }
      ],
  },

  // ── CARDIO / FULL BODY ─────────────────────────────────────────────────────
  {
    name: "Burpee",
    key: "burpee",
    primaryMuscles: ["chest", "quads"],
    secondaryMuscles: ["shoulders", "abs", "glutes"],
    category: "cardio",
    equipment: "Bodyweight",
    difficulty: "intermediate",
    cue: "Drop to push-up. Jump feet in. Explode up.",
    angleViews: [
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-bodyweight-burpee-front.mp4", label: "Front View", focus: "Hands shoulder-width, feet jump to outside of hands" },
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-bodyweight-burpee-side.mp4", label: "Side View", focus: "Chest to floor, explosive jump up, full hip extension at top" }
      ],
  },
  {
    name: "Jumping Jack",
    key: "jumping jack",
    primaryMuscles: ["shoulders"],
    secondaryMuscles: ["calves", "quads"],
    category: "cardio",
    equipment: "Bodyweight",
    difficulty: "beginner",
    cue: "Jump feet out, arms up. Jump feet in, arms down.",
    angleViews: [
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-Cardio-cardio-jumping-jacks-front.mp4", label: "Front View", focus: "Arms fully overhead, feet wider than shoulders at peak" },
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-Cardio-cardio-jumping-jacks-side.mp4", label: "Side View", focus: "Land softly on balls of feet, maintain rhythm" }
      ],
  },
  {
    name: "Box Jump",
    key: "box jump",
    primaryMuscles: ["quads", "glutes"],
    secondaryMuscles: ["calves", "hamstrings"],
    category: "cardio",
    equipment: "Plyo Box",
    difficulty: "intermediate",
    cue: "Swing arms. Explode up. Land softly. Step down.",
    angleViews: [
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-Bodyweight-box-jump-front.mp4", label: "Front View", focus: "Feet hip-width, land with full foot on box, stand tall at top" },
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-Bodyweight-box-jump-side.mp4", label: "Side View", focus: "Arm swing for momentum, land softly with knees bent, step down don't jump" }
      ],
  },
  {
    name: "Kettlebell Swing",
    key: "kettlebell swing",
    primaryMuscles: ["glutes", "hamstrings"],
    secondaryMuscles: ["shoulders", "abs", "lower_back"],
    category: "cardio",
    equipment: "Kettlebell",
    difficulty: "intermediate",
    cue: "Hinge at hips. Snap hips forward. Arms are pendulum.",
    angleViews: [
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-Kettlebells-kettlebell-swing-front.mp4", label: "Front View", focus: "Feet shoulder-width, kettlebell swings to chest height" },
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-Kettlebells-kettlebell-swing-side.mp4", label: "Side View", focus: "Hip hinge drives the swing, arms are passive — power from glutes" }
      ],
  },
  {
    name: "Battle Rope",
    key: "battle rope",
    primaryMuscles: ["shoulders"],
    secondaryMuscles: ["abs", "biceps", "forearms"],
    category: "cardio",
    equipment: "Battle Ropes",
    difficulty: "intermediate",
    cue: "Alternating waves. Keep core tight. Slight squat stance.",
    angleViews: [
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-Kettlebells-kettlebell-swing-front.mp4", label: "Front View", focus: "Alternate arms rapidly, keeping core tight and stable" },
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-Kettlebells-kettlebell-swing-side.mp4", label: "Side View", focus: "Maintain slight hip hinge, generate power from legs" }
      ],
  },
  {
    name: "Jump Rope",
    key: "jump rope",
    primaryMuscles: ["calves"],
    secondaryMuscles: ["shoulders", "forearms"],
    category: "cardio",
    equipment: "Jump Rope",
    difficulty: "beginner",
    cue: "Wrists drive rotation. Light bounces. Stay on balls of feet.",
    angleViews: [
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-Cardio-jump-rope-front.mp4", label: "Front View", focus: "Elbows close to body, wrists rotate the rope, minimal jump height" },
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-Cardio-jump-rope-side.mp4", label: "Side View", focus: "Land on balls of feet, knees slightly bent, stay light" }
      ],
  },
  {
    name: "Sprint",
    key: "sprint",
    primaryMuscles: ["quads", "hamstrings", "glutes"],
    secondaryMuscles: ["calves", "abs"],
    category: "cardio",
    equipment: "Open Space",
    difficulty: "intermediate",
    cue: "Drive knees high. Pump arms. Stay on balls of feet.",
    angleViews: [
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-Cardio-treadmill-sprint-front.mp4", label: "Front View", focus: "Arms pump straight forward-back, not across body" },
        { gifUrl: "https://media.musclewiki.com/media/uploads/videos/branded/male-Cardio-treadmill-sprint-side.mp4", label: "Side View", focus: "Forward lean from ankles, powerful arm drive, knees high" }
      ],
  },
];

// ── Lookup Maps ──────────────────────────────────────────────────────────────

/** Map from normalised exercise key to ExerciseInfo */
const EXERCISE_INFO_MAP = new Map<string, ExerciseInfo>();
for (const ex of EXERCISE_DB) {
  EXERCISE_INFO_MAP.set(ex.key, ex);
}

// Also add common aliases
const ALIASES: Record<string, string> = {
  "pushup": "push up",
  "push-up": "push up",
  "pullup": "pull up",
  "pull-up": "pull up",
  "chin-up": "chin up",
  "chinup": "chin up",
  "dumbbell flye": "dumbbell fly",
  "back squat": "squat",
  "barbell squat": "squat",
  "barbell row": "bent over row",
  "cable row": "seated cable row",
  "hamstring curl": "leg curl",
  "standing calf raise": "calf raise",
  "walking lunge": "lunge",
  "military press": "overhead press",
  "shoulder press": "dumbbell shoulder press",
  "side lateral raise": "lateral raise",
  "dumbbell curl": "bicep curl",
  "biceps curl": "bicep curl",
  "tricep dip": "dip",
  "t-bar row": "tbar row",
};

function normalise(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
}

/**
 * Get extended exercise info including muscle groups and multi-angle views.
 * Returns undefined if exercise not found.
 */
export function getExerciseInfo(exerciseName: string): ExerciseInfo | undefined {
  const norm = normalise(exerciseName);

  // Direct match
  if (EXERCISE_INFO_MAP.has(norm)) return EXERCISE_INFO_MAP.get(norm);

  // Alias match
  const aliasKey = ALIASES[norm];
  if (aliasKey && EXERCISE_INFO_MAP.has(aliasKey)) return EXERCISE_INFO_MAP.get(aliasKey);

  // Partial match — find first exercise whose key is contained in the search
  for (const ex of EXERCISE_DB) {
    if (norm.includes(ex.key) || ex.key.includes(norm)) return ex;
  }

  return undefined;
}

/**
 * Get all exercises, optionally filtered by category.
 */
export function getAllExercises(category?: ExerciseInfo["category"]): ExerciseInfo[] {
  if (!category) return [...EXERCISE_DB];
  return EXERCISE_DB.filter((ex) => ex.category === category);
}

/**
 * Get all unique categories.
 */
export function getCategories(): ExerciseInfo["category"][] {
  return ["chest", "back", "shoulders", "arms", "legs", "core", "cardio"];
}

/**
 * Search exercises by name.
 */
export function searchExercises(query: string): ExerciseInfo[] {
  const norm = normalise(query);
  if (!norm) return [...EXERCISE_DB];

  return EXERCISE_DB.filter((ex) => {
    const nameMatch = ex.key.includes(norm) || ex.name.toLowerCase().includes(norm);
    const muscleMatch = ex.primaryMuscles.some((m) => m.includes(norm));
    const equipmentMatch = ex.equipment.toLowerCase().includes(norm);
    return nameMatch || muscleMatch || equipmentMatch;
  });
}

/**
 * Get exercises by muscle group.
 */
export function getExercisesByMuscle(muscle: MuscleGroup): ExerciseInfo[] {
  return EXERCISE_DB.filter(
    (ex) => ex.primaryMuscles.includes(muscle) || ex.secondaryMuscles.includes(muscle)
  );
}

/**
 * Get alternative exercises that target the same primary muscle groups.
 * Returns up to `limit` exercises from the same category, excluding the original.
 * Results are sorted by muscle overlap (most shared muscles first).
 */
export function getAlternativeExercises(
  exerciseName: string,
  limit: number = 5,
): ExerciseInfo[] {
  const info = getExerciseInfo(exerciseName);
  if (!info) return [];

  const candidates = EXERCISE_DB.filter((ex) => ex.key !== info.key);

  // Score each candidate by muscle overlap with the original exercise
  const scored = candidates.map((ex) => {
    let score = 0;
    // Primary-to-primary overlap is worth 3 points
    for (const m of ex.primaryMuscles) {
      if (info.primaryMuscles.includes(m)) score += 3;
      if (info.secondaryMuscles.includes(m)) score += 1;
    }
    // Secondary overlap is worth 1 point
    for (const m of ex.secondaryMuscles) {
      if (info.primaryMuscles.includes(m)) score += 1;
    }
    // Same category bonus
    if (ex.category === info.category) score += 2;
    return { exercise: ex, score };
  });

  // Filter out exercises with 0 overlap, sort by score descending
  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.exercise);
}
