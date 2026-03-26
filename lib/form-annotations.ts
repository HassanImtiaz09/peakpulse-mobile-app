/**
 * Exercise Form Annotations
 *
 * Provides overlay annotation data for exercise images including:
 * - Joint angle indicators (e.g., 90° elbow bend)
 * - Body alignment lines (e.g., spine neutral, knees over toes)
 * - Key checkpoint markers with descriptions
 * - Common mistake warnings
 */

// ── Types ────────────────────────────────────────────────────────────────────

export interface JointAngle {
  /** Joint name */
  joint: string;
  /** Target angle in degrees */
  angle: number;
  /** Tolerance range (+/-) */
  tolerance: number;
  /** Position on image as percentage (0-100) */
  x: number;
  y: number;
  /** Rotation of the angle arc in degrees */
  rotation: number;
}

export interface AlignmentLine {
  /** Label for the alignment */
  label: string;
  /** Start point as percentage (0-100) */
  x1: number;
  y1: number;
  /** End point as percentage (0-100) */
  x2: number;
  y2: number;
  /** Line type */
  type: "correct" | "warning";
}

export interface FormCheckpoint {
  /** Checkpoint label */
  label: string;
  /** Description of what to check */
  description: string;
  /** Position on image as percentage (0-100) */
  x: number;
  y: number;
  /** Whether this is a common mistake warning */
  isWarning: boolean;
}

export interface FormAnnotation {
  /** Exercise key (normalised name) */
  exerciseKey: string;
  /** Joint angle indicators */
  jointAngles: JointAngle[];
  /** Body alignment lines */
  alignmentLines: AlignmentLine[];
  /** Key checkpoints */
  checkpoints: FormCheckpoint[];
}

// ── Annotation Data ──────────────────────────────────────────────────────────

const FORM_ANNOTATIONS: Record<string, FormAnnotation> = {
  "bench press": {
    exerciseKey: "bench press",
    jointAngles: [
      { joint: "Elbow", angle: 90, tolerance: 10, x: 30, y: 52, rotation: -45 },
      { joint: "Elbow", angle: 90, tolerance: 10, x: 70, y: 52, rotation: 45 },
      { joint: "Shoulder", angle: 45, tolerance: 10, x: 42, y: 40, rotation: -20 },
    ],
    alignmentLines: [
      { label: "Bar Path", x1: 50, y1: 30, x2: 50, y2: 65, type: "correct" },
      { label: "Wrist Stack", x1: 28, y1: 48, x2: 28, y2: 58, type: "correct" },
    ],
    checkpoints: [
      { label: "Shoulder Blades", description: "Retracted and depressed — squeeze together", x: 50, y: 42, isWarning: false },
      { label: "Grip Width", description: "Just outside shoulder width", x: 30, y: 48, isWarning: false },
      { label: "Elbow Flare", description: "Keep elbows at 45° from torso, not 90°", x: 25, y: 55, isWarning: true },
      { label: "Feet Flat", description: "Drive through heels, maintain arch", x: 50, y: 88, isWarning: false },
    ],
  },
  "squat": {
    exerciseKey: "squat",
    jointAngles: [
      { joint: "Knee", angle: 90, tolerance: 15, x: 45, y: 65, rotation: 0 },
      { joint: "Hip", angle: 90, tolerance: 15, x: 50, y: 50, rotation: -10 },
      { joint: "Ankle", angle: 75, tolerance: 10, x: 45, y: 82, rotation: 10 },
    ],
    alignmentLines: [
      { label: "Spine Neutral", x1: 50, y1: 20, x2: 50, y2: 55, type: "correct" },
      { label: "Knee Track", x1: 42, y1: 60, x2: 42, y2: 85, type: "correct" },
    ],
    checkpoints: [
      { label: "Depth", description: "Hip crease below knee level for full ROM", x: 55, y: 55, isWarning: false },
      { label: "Knee Tracking", description: "Knees track over toes, don't cave inward", x: 40, y: 68, isWarning: true },
      { label: "Chest Up", description: "Maintain upright torso, eyes forward", x: 50, y: 28, isWarning: false },
      { label: "Weight Distribution", description: "Mid-foot to heel, not on toes", x: 45, y: 90, isWarning: false },
    ],
  },
  "deadlift": {
    exerciseKey: "deadlift",
    jointAngles: [
      { joint: "Hip", angle: 45, tolerance: 10, x: 50, y: 48, rotation: -15 },
      { joint: "Knee", angle: 160, tolerance: 10, x: 45, y: 68, rotation: 5 },
    ],
    alignmentLines: [
      { label: "Flat Back", x1: 40, y1: 25, x2: 55, y2: 50, type: "correct" },
      { label: "Bar Over Mid-Foot", x1: 48, y1: 55, x2: 48, y2: 90, type: "correct" },
    ],
    checkpoints: [
      { label: "Neutral Spine", description: "No rounding — maintain natural curve", x: 48, y: 35, isWarning: true },
      { label: "Lats Engaged", description: "Pull shoulders back, protect the bar from drifting", x: 55, y: 38, isWarning: false },
      { label: "Hip Hinge", description: "Drive hips back, not down — this is not a squat", x: 55, y: 50, isWarning: false },
      { label: "Lockout", description: "Squeeze glutes at top, stand tall", x: 50, y: 25, isWarning: false },
    ],
  },
  "push up": {
    exerciseKey: "push up",
    jointAngles: [
      { joint: "Elbow", angle: 90, tolerance: 10, x: 35, y: 50, rotation: -30 },
      { joint: "Shoulder", angle: 45, tolerance: 10, x: 45, y: 38, rotation: -10 },
    ],
    alignmentLines: [
      { label: "Body Line", x1: 30, y1: 25, x2: 70, y2: 75, type: "correct" },
    ],
    checkpoints: [
      { label: "Hand Placement", description: "Slightly wider than shoulders, fingers spread", x: 35, y: 60, isWarning: false },
      { label: "Hip Sag", description: "Don't let hips drop — maintain plank position", x: 55, y: 55, isWarning: true },
      { label: "Head Position", description: "Neutral neck, look slightly ahead of hands", x: 30, y: 30, isWarning: false },
    ],
  },
  "pull up": {
    exerciseKey: "pull up",
    jointAngles: [
      { joint: "Elbow", angle: 45, tolerance: 15, x: 30, y: 45, rotation: -60 },
      { joint: "Shoulder", angle: 160, tolerance: 15, x: 40, y: 30, rotation: -80 },
    ],
    alignmentLines: [
      { label: "Vertical Torso", x1: 50, y1: 20, x2: 50, y2: 80, type: "correct" },
    ],
    checkpoints: [
      { label: "Full Hang", description: "Start from dead hang, arms fully extended", x: 50, y: 80, isWarning: false },
      { label: "Chin Over Bar", description: "Pull until chin clears the bar", x: 50, y: 18, isWarning: false },
      { label: "No Kipping", description: "Control the movement — no swinging", x: 55, y: 60, isWarning: true },
      { label: "Grip", description: "Slightly wider than shoulders, overhand grip", x: 35, y: 15, isWarning: false },
    ],
  },
  "lat pulldown": {
    exerciseKey: "lat pulldown",
    jointAngles: [
      { joint: "Elbow", angle: 90, tolerance: 15, x: 28, y: 50, rotation: -45 },
    ],
    alignmentLines: [
      { label: "Pull Path", x1: 50, y1: 15, x2: 50, y2: 55, type: "correct" },
    ],
    checkpoints: [
      { label: "Lean Back", description: "Slight lean back (10-15°), not excessive", x: 52, y: 35, isWarning: false },
      { label: "Pull to Chest", description: "Bar comes to upper chest, not behind neck", x: 50, y: 55, isWarning: true },
      { label: "Squeeze", description: "Squeeze shoulder blades together at bottom", x: 50, y: 42, isWarning: false },
    ],
  },
  "shoulder press": {
    exerciseKey: "shoulder press",
    jointAngles: [
      { joint: "Elbow", angle: 90, tolerance: 10, x: 30, y: 48, rotation: -90 },
      { joint: "Elbow", angle: 90, tolerance: 10, x: 70, y: 48, rotation: 90 },
    ],
    alignmentLines: [
      { label: "Press Path", x1: 50, y1: 45, x2: 50, y2: 15, type: "correct" },
    ],
    checkpoints: [
      { label: "Core Braced", description: "Engage core to protect lower back", x: 50, y: 60, isWarning: false },
      { label: "Lockout", description: "Full extension overhead, biceps by ears", x: 50, y: 15, isWarning: false },
      { label: "Rib Flare", description: "Don't let ribs flare out — keep core tight", x: 50, y: 55, isWarning: true },
    ],
  },
  "bicep curl": {
    exerciseKey: "bicep curl",
    jointAngles: [
      { joint: "Elbow", angle: 45, tolerance: 10, x: 40, y: 55, rotation: 0 },
    ],
    alignmentLines: [
      { label: "Upper Arm Fixed", x1: 40, y1: 40, x2: 40, y2: 60, type: "correct" },
    ],
    checkpoints: [
      { label: "Elbow Position", description: "Keep elbows pinned to sides — no swinging", x: 40, y: 50, isWarning: true },
      { label: "Full ROM", description: "Extend fully at bottom, squeeze at top", x: 40, y: 65, isWarning: false },
      { label: "No Momentum", description: "Control the weight, don't swing body", x: 50, y: 40, isWarning: true },
    ],
  },
  "lateral raise": {
    exerciseKey: "lateral raise",
    jointAngles: [
      { joint: "Shoulder", angle: 90, tolerance: 15, x: 25, y: 38, rotation: -90 },
      { joint: "Elbow", angle: 170, tolerance: 10, x: 20, y: 45, rotation: -80 },
    ],
    alignmentLines: [
      { label: "Raise Path", x1: 40, y1: 55, x2: 20, y2: 35, type: "correct" },
    ],
    checkpoints: [
      { label: "Slight Bend", description: "Maintain slight elbow bend throughout", x: 22, y: 42, isWarning: false },
      { label: "Shoulder Height", description: "Raise to shoulder level, not above", x: 25, y: 35, isWarning: false },
      { label: "Traps Takeover", description: "Don't shrug — keep shoulders down", x: 45, y: 28, isWarning: true },
    ],
  },
  "hip thrust": {
    exerciseKey: "hip thrust",
    jointAngles: [
      { joint: "Knee", angle: 90, tolerance: 10, x: 55, y: 60, rotation: 0 },
      { joint: "Hip", angle: 180, tolerance: 10, x: 50, y: 45, rotation: 0 },
    ],
    alignmentLines: [
      { label: "Torso Line", x1: 35, y1: 35, x2: 60, y2: 45, type: "correct" },
    ],
    checkpoints: [
      { label: "Full Extension", description: "Drive hips to full lockout, squeeze glutes", x: 50, y: 40, isWarning: false },
      { label: "Chin Tucked", description: "Look forward, not up — avoid hyperextending neck", x: 30, y: 30, isWarning: true },
      { label: "Foot Position", description: "Feet flat, shins vertical at top", x: 60, y: 75, isWarning: false },
    ],
  },
  "plank": {
    exerciseKey: "plank",
    jointAngles: [
      { joint: "Shoulder", angle: 90, tolerance: 10, x: 35, y: 40, rotation: -90 },
    ],
    alignmentLines: [
      { label: "Body Line", x1: 25, y1: 35, x2: 75, y2: 55, type: "correct" },
    ],
    checkpoints: [
      { label: "Neutral Spine", description: "Straight line from head to heels", x: 50, y: 42, isWarning: false },
      { label: "Hip Position", description: "Don't let hips sag or pike up", x: 55, y: 48, isWarning: true },
      { label: "Forearm Position", description: "Elbows directly under shoulders", x: 32, y: 50, isWarning: false },
    ],
  },
  "lunge": {
    exerciseKey: "lunge",
    jointAngles: [
      { joint: "Front Knee", angle: 90, tolerance: 10, x: 40, y: 62, rotation: 0 },
      { joint: "Back Knee", angle: 90, tolerance: 10, x: 60, y: 75, rotation: 0 },
    ],
    alignmentLines: [
      { label: "Upright Torso", x1: 45, y1: 20, x2: 45, y2: 55, type: "correct" },
    ],
    checkpoints: [
      { label: "Knee Over Ankle", description: "Front knee doesn't pass toes", x: 38, y: 65, isWarning: true },
      { label: "Step Length", description: "Long enough step for both knees at 90°", x: 50, y: 70, isWarning: false },
      { label: "Balance", description: "Keep weight centered, core engaged", x: 45, y: 40, isWarning: false },
    ],
  },
  "dumbbell fly": {
    exerciseKey: "dumbbell fly",
    jointAngles: [
      { joint: "Elbow", angle: 160, tolerance: 10, x: 25, y: 48, rotation: -70 },
    ],
    alignmentLines: [
      { label: "Arc Path", x1: 50, y1: 35, x2: 20, y2: 50, type: "correct" },
    ],
    checkpoints: [
      { label: "Elbow Bend", description: "Maintain slight bend — don't straighten arms", x: 25, y: 45, isWarning: false },
      { label: "Depth", description: "Lower to chest level, not below — protect shoulders", x: 30, y: 52, isWarning: true },
      { label: "Squeeze", description: "Squeeze chest at top, don't clank dumbbells", x: 50, y: 35, isWarning: false },
    ],
  },
  "tricep pushdown": {
    exerciseKey: "tricep pushdown",
    jointAngles: [
      { joint: "Elbow", angle: 180, tolerance: 10, x: 45, y: 55, rotation: 0 },
    ],
    alignmentLines: [
      { label: "Upper Arm Fixed", x1: 45, y1: 38, x2: 45, y2: 55, type: "correct" },
    ],
    checkpoints: [
      { label: "Elbows Pinned", description: "Keep elbows at sides, only forearms move", x: 45, y: 45, isWarning: true },
      { label: "Full Extension", description: "Straighten arms completely at bottom", x: 45, y: 65, isWarning: false },
      { label: "Lean", description: "Slight forward lean for better angle", x: 50, y: 35, isWarning: false },
    ],
  },
  "barbell row": {
    exerciseKey: "barbell row",
    jointAngles: [
      { joint: "Hip", angle: 45, tolerance: 10, x: 50, y: 45, rotation: -20 },
      { joint: "Elbow", angle: 90, tolerance: 15, x: 35, y: 52, rotation: -30 },
    ],
    alignmentLines: [
      { label: "Flat Back", x1: 40, y1: 25, x2: 55, y2: 48, type: "correct" },
      { label: "Pull Path", x1: 45, y1: 70, x2: 45, y2: 48, type: "correct" },
    ],
    checkpoints: [
      { label: "Flat Back", description: "Maintain neutral spine throughout", x: 48, y: 35, isWarning: true },
      { label: "Pull to Navel", description: "Row bar to lower chest / upper abs", x: 45, y: 52, isWarning: false },
      { label: "Squeeze", description: "Squeeze shoulder blades at top", x: 50, y: 40, isWarning: false },
    ],
  },
  "calf raise": {
    exerciseKey: "calf raise",
    jointAngles: [
      { joint: "Ankle", angle: 130, tolerance: 10, x: 50, y: 80, rotation: 0 },
    ],
    alignmentLines: [
      { label: "Vertical Rise", x1: 50, y1: 60, x2: 50, y2: 85, type: "correct" },
    ],
    checkpoints: [
      { label: "Full ROM", description: "Rise to full tiptoe, lower below platform", x: 50, y: 78, isWarning: false },
      { label: "Pause at Top", description: "Hold peak contraction for 1 second", x: 50, y: 70, isWarning: false },
      { label: "Straight Knees", description: "Keep legs straight, don't bend knees", x: 50, y: 60, isWarning: true },
    ],
  },
  "crunch": {
    exerciseKey: "crunch",
    jointAngles: [
      { joint: "Spine", angle: 30, tolerance: 10, x: 50, y: 40, rotation: -10 },
    ],
    alignmentLines: [
      { label: "Curl Path", x1: 50, y1: 25, x2: 50, y2: 50, type: "correct" },
    ],
    checkpoints: [
      { label: "Neck Neutral", description: "Don't pull on neck — hands support, not pull", x: 45, y: 25, isWarning: true },
      { label: "Short ROM", description: "Small controlled curl, shoulder blades off floor", x: 50, y: 38, isWarning: false },
      { label: "Exhale Up", description: "Breathe out as you crunch up", x: 55, y: 35, isWarning: false },
    ],
  },
  "dip": {
    exerciseKey: "dip",
    jointAngles: [
      { joint: "Elbow", angle: 90, tolerance: 10, x: 35, y: 50, rotation: -90 },
      { joint: "Shoulder", angle: 30, tolerance: 10, x: 40, y: 35, rotation: -20 },
    ],
    alignmentLines: [
      { label: "Forward Lean", x1: 45, y1: 20, x2: 50, y2: 60, type: "correct" },
    ],
    checkpoints: [
      { label: "Lean Angle", description: "30° forward lean for chest, upright for triceps", x: 48, y: 40, isWarning: false },
      { label: "Depth", description: "Lower until upper arms parallel to floor", x: 38, y: 52, isWarning: false },
      { label: "Shoulder Pain", description: "Stop if shoulders hurt — don't go too deep", x: 42, y: 35, isWarning: true },
    ],
  },
  "leg press": {
    exerciseKey: "leg press",
    jointAngles: [
      { joint: "Knee", angle: 90, tolerance: 10, x: 45, y: 55, rotation: 0 },
      { joint: "Hip", angle: 90, tolerance: 15, x: 50, y: 45, rotation: -10 },
    ],
    alignmentLines: [
      { label: "Press Path", x1: 50, y1: 55, x2: 50, y2: 25, type: "correct" },
    ],
    checkpoints: [
      { label: "Foot Placement", description: "Shoulder width, mid-platform", x: 50, y: 30, isWarning: false },
      { label: "Knee Lockout", description: "Don't fully lock knees at top", x: 48, y: 40, isWarning: true },
      { label: "Lower Back", description: "Keep lower back pressed into pad", x: 55, y: 60, isWarning: true },
    ],
  },
  "romanian deadlift": {
    exerciseKey: "romanian deadlift",
    jointAngles: [
      { joint: "Hip", angle: 90, tolerance: 15, x: 50, y: 48, rotation: -10 },
      { joint: "Knee", angle: 170, tolerance: 10, x: 45, y: 68, rotation: 5 },
    ],
    alignmentLines: [
      { label: "Flat Back", x1: 40, y1: 25, x2: 55, y2: 50, type: "correct" },
    ],
    checkpoints: [
      { label: "Soft Knees", description: "Slight bend, not locked or deeply bent", x: 45, y: 68, isWarning: false },
      { label: "Hamstring Stretch", description: "Feel stretch in hamstrings, not lower back", x: 50, y: 55, isWarning: false },
      { label: "Bar Close", description: "Keep bar close to legs throughout", x: 48, y: 60, isWarning: true },
    ],
  },
};

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Get form annotations for an exercise by name.
 * Returns null if no annotations are available.
 */
export function getFormAnnotations(exerciseName: string): FormAnnotation | null {
  const norm = exerciseName.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
  return FORM_ANNOTATIONS[norm] ?? null;
}

/**
 * Get all exercises that have form annotations.
 */
export function getAnnotatedExercises(): string[] {
  return Object.keys(FORM_ANNOTATIONS);
}

/**
 * Check if an exercise has form annotations available.
 */
export function hasFormAnnotations(exerciseName: string): boolean {
  const norm = exerciseName.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
  return norm in FORM_ANNOTATIONS;
}

/**
 * Get the total number of annotated exercises.
 */
export function getAnnotationCount(): number {
  return Object.keys(FORM_ANNOTATIONS).length;
}
