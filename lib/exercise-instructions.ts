/**
 * Exercise Instructions — Concise Step-by-Step Form Scripts
 *
 * Each exercise has 3–5 short steps explaining proper form.
 * Designed to supplement the GIF demo so users can study
 * the movement with both visual and written guidance.
 *
 * Keyed by lowercase exercise name for easy lookup.
 */

export interface ExerciseInstruction {
  /** 3–5 concise steps for performing the exercise */
  steps: string[];
  /** Common mistakes to avoid (1–2 items) */
  avoid: string[];
  /** Breathing pattern */
  breathing: string;
}

const INSTRUCTIONS: Record<string, ExerciseInstruction> = {
  // ── CHEST ──────────────────────────────────────────────────────────────────
  "bench press": {
    steps: [
      "Lie flat on the bench with feet firmly on the floor. Grip the bar slightly wider than shoulder-width.",
      "Retract your shoulder blades and arch your upper back slightly to create a stable base.",
      "Unrack the bar and lower it in a controlled arc to your mid-chest, keeping elbows at about 45°.",
      "Press the bar back up in a slight arc toward your eyes until arms are fully extended.",
      "Keep your glutes on the bench and maintain tension throughout the movement.",
    ],
    avoid: ["Flaring elbows to 90° — increases shoulder injury risk", "Bouncing the bar off your chest"],
    breathing: "Inhale as you lower the bar, exhale as you press up.",
  },
  "push up": {
    steps: [
      "Start in a high plank position with hands slightly wider than shoulder-width.",
      "Keep your body in a straight line from head to heels — engage your core.",
      "Lower your body until your chest nearly touches the floor, elbows at 45°.",
      "Push back up to the starting position by fully extending your arms.",
    ],
    avoid: ["Sagging hips or piking up — maintain a rigid plank", "Flaring elbows straight out to the sides"],
    breathing: "Inhale on the way down, exhale as you push up.",
  },
  "dumbbell fly": {
    steps: [
      "Lie on a flat bench holding dumbbells above your chest with a slight bend in your elbows.",
      "Open your arms in a wide arc, lowering the dumbbells until you feel a stretch in your chest.",
      "Maintain the same elbow angle throughout — don't straighten or bend further.",
      "Squeeze your chest to bring the dumbbells back together above your chest.",
    ],
    avoid: ["Going too heavy — this is an isolation movement", "Straightening arms at the bottom (turns it into a press)"],
    breathing: "Inhale as you open your arms, exhale as you squeeze them together.",
  },
  "incline bench press": {
    steps: [
      "Set the bench to 30–45° incline. Grip the bar slightly wider than shoulder-width.",
      "Retract shoulder blades and plant feet firmly on the floor.",
      "Lower the bar to your upper chest just below the collarbone.",
      "Press the bar up and slightly back until arms are fully extended.",
    ],
    avoid: ["Setting the incline too steep (above 45°) — shifts work to shoulders", "Losing shoulder blade retraction"],
    breathing: "Inhale as you lower, exhale as you press.",
  },
  "incline dumbbell press": {
    steps: [
      "Set bench to 30–45°. Hold dumbbells at chest level with palms facing forward.",
      "Press the dumbbells up and slightly inward until they nearly touch at the top.",
      "Lower them back slowly to chest level, keeping elbows at about 45°.",
    ],
    avoid: ["Clanking dumbbells together at the top", "Letting the dumbbells drift too far forward"],
    breathing: "Inhale on the descent, exhale on the press.",
  },
  "decline bench press": {
    steps: [
      "Secure your legs on the decline bench. Grip the bar slightly wider than shoulder-width.",
      "Unrack and lower the bar to your lower chest in a controlled manner.",
      "Press the bar back up until arms are fully extended.",
    ],
    avoid: ["Letting the bar drift toward your face", "Using too much decline angle — 15–30° is sufficient"],
    breathing: "Inhale as you lower, exhale as you press.",
  },
  "cable fly": {
    steps: [
      "Set the pulleys to chest height. Stand in a staggered stance with a slight forward lean.",
      "With a slight bend in your elbows, bring your hands together in front of your chest.",
      "Squeeze your chest at the peak contraction for a moment.",
      "Slowly return to the starting position, feeling the stretch in your chest.",
    ],
    avoid: ["Using too much weight and turning it into a press", "Losing the elbow angle during the movement"],
    breathing: "Exhale as you bring hands together, inhale as you open.",
  },
  "cable crossover": {
    steps: [
      "Set pulleys high. Step forward into a split stance with slight forward lean.",
      "Pull the handles down and together in a sweeping arc to your lower chest.",
      "Squeeze and hold the contraction briefly.",
      "Return slowly to the starting position with arms wide.",
    ],
    avoid: ["Rounding your upper back", "Using momentum instead of controlled movement"],
    breathing: "Exhale as you pull down, inhale as you return.",
  },
  "dip": {
    steps: [
      "Grip the parallel bars and lift yourself to a straight-arm position.",
      "Lean your torso slightly forward for chest emphasis.",
      "Lower your body until your upper arms are roughly parallel to the floor.",
      "Press back up to full arm extension.",
    ],
    avoid: ["Going too deep if you have shoulder issues", "Swinging or kipping to generate momentum"],
    breathing: "Inhale as you lower, exhale as you push up.",
  },
  "chest dip": {
    steps: [
      "Grip the bars and lean your torso forward about 30° throughout the movement.",
      "Lower your body until you feel a deep stretch in your chest.",
      "Keep elbows flared slightly outward to emphasize the chest.",
      "Press back up, squeezing your chest at the top.",
    ],
    avoid: ["Staying too upright — that shifts emphasis to triceps", "Dropping too fast without control"],
    breathing: "Inhale on the descent, exhale on the press.",
  },
  // ── BACK ───────────────────────────────────────────────────────────────────
  "pull up": {
    steps: [
      "Hang from the bar with an overhand grip slightly wider than shoulder-width.",
      "Engage your lats by pulling your shoulder blades down and back.",
      "Pull yourself up until your chin clears the bar.",
      "Lower yourself slowly to a full hang — control the descent.",
    ],
    avoid: ["Kipping or swinging to get your chin over the bar", "Only doing half reps — full range of motion matters"],
    breathing: "Exhale as you pull up, inhale as you lower.",
  },
  "chin up": {
    steps: [
      "Hang from the bar with an underhand (supinated) grip, hands shoulder-width apart.",
      "Pull yourself up by driving your elbows down toward your hips.",
      "Continue until your chin clears the bar.",
      "Lower slowly to a full dead hang.",
    ],
    avoid: ["Using excessive body swing", "Shrugging shoulders up — keep them packed down"],
    breathing: "Exhale as you pull up, inhale as you lower.",
  },
  "lat pulldown": {
    steps: [
      "Sit with thighs secured under the pads. Grip the bar wider than shoulder-width.",
      "Lean back slightly and pull the bar down to your upper chest.",
      "Squeeze your shoulder blades together at the bottom of the movement.",
      "Return the bar up slowly with control — don't let it yank your arms up.",
    ],
    avoid: ["Pulling the bar behind your neck — stresses the shoulders", "Leaning too far back (turns it into a row)"],
    breathing: "Exhale as you pull down, inhale as you release up.",
  },
  "bent over row": {
    steps: [
      "Stand with feet hip-width apart. Hinge at the hips until your torso is roughly 45° to the floor.",
      "Grip the barbell with hands slightly wider than shoulder-width.",
      "Pull the bar to your lower chest/upper abdomen, driving elbows back.",
      "Lower the bar with control to full arm extension.",
    ],
    avoid: ["Rounding your lower back — keep it neutral", "Using momentum by jerking the weight up"],
    breathing: "Exhale as you row up, inhale as you lower.",
  },
  "dumbbell row": {
    steps: [
      "Place one knee and hand on a bench. Hold a dumbbell in the other hand, arm hanging straight.",
      "Pull the dumbbell to your hip, driving your elbow straight back.",
      "Squeeze your lat at the top for a moment.",
      "Lower the dumbbell slowly to full extension.",
    ],
    avoid: ["Rotating your torso to heave the weight up", "Shrugging your shoulder — keep it packed down"],
    breathing: "Exhale as you row, inhale as you lower.",
  },
  "seated cable row": {
    steps: [
      "Sit with feet on the platform, knees slightly bent. Grab the V-handle.",
      "Sit tall with chest up. Pull the handle to your lower chest.",
      "Squeeze your shoulder blades together at the end of the pull.",
      "Extend your arms forward slowly — don't let the weight stack pull you forward.",
    ],
    avoid: ["Rounding your back as you reach forward", "Using excessive body lean to generate momentum"],
    breathing: "Exhale as you pull, inhale as you extend.",
  },
  "deadlift": {
    steps: [
      "Stand with feet hip-width apart, bar over mid-foot. Grip the bar just outside your knees.",
      "Drop your hips, lift your chest, and brace your core hard.",
      "Drive through your feet to stand up, keeping the bar close to your body.",
      "Lock out at the top with hips fully extended and shoulders back.",
      "Reverse the movement to lower the bar — hinge at the hips first, then bend knees.",
    ],
    avoid: ["Rounding your lower back at any point", "Jerking the bar off the floor — build tension first"],
    breathing: "Brace and inhale before the pull, exhale at lockout.",
  },
  "t-bar row": {
    steps: [
      "Straddle the bar with feet wide. Grip the handle with both hands.",
      "Hinge forward at the hips, keeping your back flat and chest up.",
      "Pull the bar to your chest, squeezing your back muscles.",
      "Lower with control to full arm extension.",
    ],
    avoid: ["Standing too upright — maintain the hip hinge", "Heaving the weight with your lower back"],
    breathing: "Exhale as you row, inhale as you lower.",
  },
  "pendlay row": {
    steps: [
      "Set up like a deadlift with torso parallel to the floor. Bar starts on the ground each rep.",
      "Explosively row the bar to your lower chest.",
      "Lower the bar back to the floor with control — full stop between reps.",
    ],
    avoid: ["Lifting your torso during the row — stay parallel", "Bouncing the bar off the floor"],
    breathing: "Brace before each rep, exhale as you row.",
  },
  // ── SHOULDERS ──────────────────────────────────────────────────────────────
  "overhead press": {
    steps: [
      "Stand with feet shoulder-width apart. Grip the bar just outside shoulder-width at collarbone height.",
      "Brace your core and press the bar straight overhead.",
      "Move your head slightly back as the bar passes, then push it forward once the bar is overhead.",
      "Lock out with the bar directly over your mid-foot.",
      "Lower the bar back to your collarbone with control.",
    ],
    avoid: ["Excessive back lean — keep your core braced", "Pressing the bar forward instead of straight up"],
    breathing: "Inhale at the bottom, exhale as you press overhead.",
  },
  "dumbbell shoulder press": {
    steps: [
      "Sit or stand with dumbbells at shoulder height, palms facing forward.",
      "Press both dumbbells overhead until arms are fully extended.",
      "Lower them back to shoulder height with control.",
    ],
    avoid: ["Flaring your rib cage — keep core tight", "Clanking dumbbells at the top"],
    breathing: "Exhale as you press, inhale as you lower.",
  },
  "lateral raise": {
    steps: [
      "Stand with dumbbells at your sides, slight bend in your elbows.",
      "Raise your arms out to the sides until they're parallel to the floor.",
      "Lead with your elbows, not your hands — imagine pouring water from a pitcher.",
      "Lower slowly — don't just drop the weight.",
    ],
    avoid: ["Using momentum by swinging your body", "Raising above shoulder height (impingement risk)"],
    breathing: "Exhale as you raise, inhale as you lower.",
  },
  "front raise": {
    steps: [
      "Stand holding dumbbells in front of your thighs, palms facing your body.",
      "Raise one or both arms straight in front of you to shoulder height.",
      "Hold briefly at the top, then lower with control.",
    ],
    avoid: ["Swinging the weight — use strict form", "Going above shoulder height"],
    breathing: "Exhale as you raise, inhale as you lower.",
  },
  "face pull": {
    steps: [
      "Set a cable pulley to upper chest height with a rope attachment.",
      "Pull the rope toward your face, separating the ends as you pull.",
      "Finish with your hands beside your ears, elbows high and back.",
      "Squeeze your rear delts and upper back, then return slowly.",
    ],
    avoid: ["Using too much weight — this is a precision movement", "Pulling to your chest instead of your face"],
    breathing: "Exhale as you pull, inhale as you return.",
  },
  "rear delt fly": {
    steps: [
      "Bend forward at the hips or lie face-down on an incline bench.",
      "Hold dumbbells hanging below you with a slight elbow bend.",
      "Raise your arms out to the sides, squeezing your rear delts.",
      "Lower slowly to the starting position.",
    ],
    avoid: ["Using your traps to shrug the weight up", "Straightening your arms completely"],
    breathing: "Exhale as you raise, inhale as you lower.",
  },
  "arnold press": {
    steps: [
      "Start with dumbbells at chest height, palms facing you (like the top of a curl).",
      "As you press up, rotate your palms to face forward.",
      "Finish with arms fully extended overhead, palms forward.",
      "Reverse the rotation as you lower back to the starting position.",
    ],
    avoid: ["Rushing the rotation — it should be smooth and continuous", "Leaning back excessively"],
    breathing: "Exhale as you press and rotate, inhale as you lower.",
  },
  "upright row": {
    steps: [
      "Stand holding a barbell or dumbbells with a narrow grip in front of your thighs.",
      "Pull the weight straight up along your body to chest height.",
      "Lead with your elbows — they should always be higher than your hands.",
      "Lower with control.",
    ],
    avoid: ["Pulling too high (above chest) — can cause shoulder impingement", "Using a grip that's too narrow"],
    breathing: "Exhale as you pull up, inhale as you lower.",
  },
  "shrug": {
    steps: [
      "Stand holding a barbell or dumbbells at your sides with arms straight.",
      "Elevate your shoulders straight up toward your ears as high as possible.",
      "Hold the top position for a moment, squeezing your traps.",
      "Lower slowly to the starting position.",
    ],
    avoid: ["Rolling your shoulders — just go straight up and down", "Using momentum by bending your knees"],
    breathing: "Exhale as you shrug up, inhale as you lower.",
  },
  // ── ARMS ───────────────────────────────────────────────────────────────────
  "bicep curl": {
    steps: [
      "Stand with dumbbells at your sides, palms facing forward.",
      "Curl the weights up by bending at the elbow — keep your upper arms stationary.",
      "Squeeze your biceps at the top of the movement.",
      "Lower slowly to full arm extension.",
    ],
    avoid: ["Swinging your body to lift the weight", "Not fully extending at the bottom"],
    breathing: "Exhale as you curl up, inhale as you lower.",
  },
  "barbell curl": {
    steps: [
      "Stand with feet shoulder-width apart, gripping the barbell with an underhand grip.",
      "Keep your elbows pinned to your sides throughout.",
      "Curl the bar up to shoulder height, squeezing your biceps.",
      "Lower the bar slowly — resist gravity on the way down.",
    ],
    avoid: ["Leaning back to swing the weight up", "Moving your elbows forward during the curl"],
    breathing: "Exhale as you curl, inhale as you lower.",
  },
  "hammer curl": {
    steps: [
      "Stand with dumbbells at your sides, palms facing each other (neutral grip).",
      "Curl the weights up while keeping your palms facing inward the entire time.",
      "Squeeze at the top, then lower with control.",
    ],
    avoid: ["Rotating your wrists during the movement", "Using body momentum"],
    breathing: "Exhale as you curl, inhale as you lower.",
  },
  "preacher curl": {
    steps: [
      "Sit at a preacher bench with your upper arms resting flat on the pad.",
      "Grip the bar or dumbbells with an underhand grip.",
      "Curl the weight up, keeping your upper arms pressed against the pad.",
      "Lower slowly to near-full extension — don't hyperextend at the bottom.",
    ],
    avoid: ["Lifting your elbows off the pad", "Dropping the weight too fast at the bottom"],
    breathing: "Exhale as you curl, inhale as you lower.",
  },
  "concentration curl": {
    steps: [
      "Sit on a bench with legs spread. Brace the back of your upper arm against your inner thigh.",
      "Curl the dumbbell up toward your shoulder.",
      "Squeeze your bicep hard at the top.",
      "Lower slowly to full extension.",
    ],
    avoid: ["Using your shoulder to swing the weight", "Not bracing your arm firmly against your thigh"],
    breathing: "Exhale as you curl, inhale as you lower.",
  },
  "tricep pushdown": {
    steps: [
      "Stand facing a cable machine with a straight bar or rope attachment at head height.",
      "Pin your elbows to your sides. Push the handle down until your arms are fully extended.",
      "Squeeze your triceps at the bottom.",
      "Let the handle return slowly to the starting position — don't let your elbows drift forward.",
    ],
    avoid: ["Flaring your elbows out", "Leaning over the handle to use body weight"],
    breathing: "Exhale as you push down, inhale as you return.",
  },
  "tricep extension": {
    steps: [
      "Hold a dumbbell or cable handle behind your head with both hands.",
      "Extend your arms overhead until they're fully straight.",
      "Keep your upper arms close to your ears throughout.",
      "Lower the weight behind your head with control.",
    ],
    avoid: ["Flaring your elbows outward", "Using too much weight — this stresses the elbow joint"],
    breathing: "Exhale as you extend, inhale as you lower.",
  },
  "overhead tricep extension": {
    steps: [
      "Stand or sit holding a dumbbell with both hands overhead, arms fully extended.",
      "Lower the weight behind your head by bending at the elbows.",
      "Keep your upper arms vertical and close to your head.",
      "Extend back to the starting position, squeezing your triceps.",
    ],
    avoid: ["Letting your elbows flare wide", "Arching your lower back"],
    breathing: "Exhale as you extend, inhale as you lower.",
  },
  "skull crusher": {
    steps: [
      "Lie on a flat bench holding an EZ bar or dumbbells with arms extended over your chest.",
      "Bend at the elbows to lower the weight toward your forehead.",
      "Keep your upper arms perpendicular to the floor — only your forearms move.",
      "Extend back to the starting position.",
    ],
    avoid: ["Letting your elbows flare outward", "Lowering the bar to your nose instead of your forehead"],
    breathing: "Inhale as you lower, exhale as you extend.",
  },
  "close grip bench press": {
    steps: [
      "Lie on a flat bench. Grip the bar with hands about shoulder-width apart.",
      "Lower the bar to your lower chest, keeping elbows tucked close to your body.",
      "Press the bar back up to full extension.",
    ],
    avoid: ["Gripping too narrow — shoulder-width is sufficient", "Flaring elbows out (shifts work to chest)"],
    breathing: "Inhale as you lower, exhale as you press.",
  },
  // ── LEGS ───────────────────────────────────────────────────────────────────
  "squat": {
    steps: [
      "Stand with feet shoulder-width apart, bar resting on your upper traps.",
      "Brace your core. Initiate the movement by pushing your hips back and bending your knees.",
      "Descend until your hip crease is at or below your knee level (parallel or deeper).",
      "Drive through your whole foot to stand back up, keeping your chest tall.",
    ],
    avoid: ["Letting your knees cave inward — push them out over your toes", "Rising hips faster than your chest (good morning squat)"],
    breathing: "Inhale and brace at the top, hold through the descent, exhale as you stand.",
  },
  "front squat": {
    steps: [
      "Rest the bar on the front of your shoulders in a clean grip or cross-arm grip.",
      "Keep your elbows high and chest tall throughout.",
      "Squat down, keeping your torso as upright as possible.",
      "Drive up through your feet to return to standing.",
    ],
    avoid: ["Letting your elbows drop — the bar will roll forward", "Leaning too far forward"],
    breathing: "Inhale and brace before descending, exhale as you stand.",
  },
  "goblet squat": {
    steps: [
      "Hold a dumbbell or kettlebell at chest height with both hands, elbows pointing down.",
      "Squat down between your legs, keeping your chest up and elbows inside your knees.",
      "Go as deep as your mobility allows while maintaining a flat back.",
      "Stand back up by driving through your heels.",
    ],
    avoid: ["Rounding your upper back", "Letting the weight pull you forward"],
    breathing: "Inhale on the way down, exhale on the way up.",
  },
  "bulgarian split squat": {
    steps: [
      "Stand about 2 feet in front of a bench. Place the top of your rear foot on the bench.",
      "Lower your body by bending your front knee until your rear knee nearly touches the floor.",
      "Keep your torso upright and front knee tracking over your toes.",
      "Drive through your front foot to return to standing.",
    ],
    avoid: ["Leaning too far forward", "Placing your front foot too close to the bench"],
    breathing: "Inhale as you lower, exhale as you drive up.",
  },
  "lunge": {
    steps: [
      "Stand tall with feet together. Step forward with one leg.",
      "Lower your body until both knees are at about 90°.",
      "Your front knee should be over your ankle, not past your toes.",
      "Push off your front foot to return to the starting position.",
    ],
    avoid: ["Taking too short a step — your knee will go past your toes", "Leaning your torso forward"],
    breathing: "Inhale as you step and lower, exhale as you push back.",
  },
  "leg press": {
    steps: [
      "Sit in the leg press machine with your back flat against the pad.",
      "Place feet shoulder-width apart on the platform, about mid-height.",
      "Release the safety catches. Lower the platform until your knees are at about 90°.",
      "Press the platform back up without fully locking your knees at the top.",
    ],
    avoid: ["Letting your lower back round off the pad at the bottom", "Locking your knees at full extension"],
    breathing: "Inhale as you lower, exhale as you press.",
  },
  "leg curl": {
    steps: [
      "Lie face-down on the leg curl machine. Adjust the pad so it sits just above your ankles.",
      "Curl your heels toward your glutes by bending at the knees.",
      "Squeeze your hamstrings at the top of the movement.",
      "Lower slowly to the starting position.",
    ],
    avoid: ["Lifting your hips off the pad", "Using momentum to swing the weight up"],
    breathing: "Exhale as you curl, inhale as you lower.",
  },
  "leg extension": {
    steps: [
      "Sit in the machine with your back against the pad. Adjust the ankle pad to sit on your lower shins.",
      "Extend your legs until they're fully straight.",
      "Squeeze your quads at the top for a moment.",
      "Lower slowly — don't let the weight stack slam down.",
    ],
    avoid: ["Using too much weight — this stresses the knee joint", "Swinging or using momentum"],
    breathing: "Exhale as you extend, inhale as you lower.",
  },
  "romanian deadlift": {
    steps: [
      "Stand with feet hip-width apart, holding a barbell at hip height.",
      "Push your hips back while keeping a slight bend in your knees.",
      "Lower the bar along your legs until you feel a deep stretch in your hamstrings.",
      "Drive your hips forward to return to standing, squeezing your glutes at the top.",
    ],
    avoid: ["Rounding your lower back — keep it neutral throughout", "Bending your knees too much (turns it into a conventional deadlift)"],
    breathing: "Inhale as you hinge down, exhale as you stand.",
  },
  "hip thrust": {
    steps: [
      "Sit on the floor with your upper back against a bench. Roll a barbell over your hips.",
      "Plant your feet flat on the floor, about hip-width apart.",
      "Drive through your heels to lift your hips until your body forms a straight line from shoulders to knees.",
      "Squeeze your glutes hard at the top, then lower with control.",
    ],
    avoid: ["Hyperextending your lower back at the top", "Placing feet too far from or too close to the bench"],
    breathing: "Exhale as you thrust up, inhale as you lower.",
  },
  "glute bridge": {
    steps: [
      "Lie on your back with knees bent and feet flat on the floor, hip-width apart.",
      "Drive through your heels to lift your hips toward the ceiling.",
      "Squeeze your glutes at the top — your body should form a straight line from shoulders to knees.",
      "Lower your hips back to the floor with control.",
    ],
    avoid: ["Pushing through your toes instead of your heels", "Arching your lower back at the top"],
    breathing: "Exhale as you lift, inhale as you lower.",
  },
  "calf raise": {
    steps: [
      "Stand on the edge of a step or platform with the balls of your feet on the edge.",
      "Rise up onto your toes as high as possible, squeezing your calves.",
      "Hold the top position for a moment.",
      "Lower your heels below the platform level for a full stretch.",
    ],
    avoid: ["Bouncing at the bottom — use a full, controlled range", "Bending your knees (keep legs straight)"],
    breathing: "Exhale as you rise, inhale as you lower.",
  },
  "hack squat": {
    steps: [
      "Position yourself in the hack squat machine with your back against the pad.",
      "Place feet shoulder-width apart on the platform.",
      "Release the safety handles. Lower yourself until your thighs are at least parallel.",
      "Drive through your feet to press back up.",
    ],
    avoid: ["Letting your knees cave inward", "Placing feet too high or too low on the platform"],
    breathing: "Inhale as you lower, exhale as you press up.",
  },
  "step up": {
    steps: [
      "Stand facing a bench or box at about knee height.",
      "Step up with one foot, driving through your heel to stand on top of the box.",
      "Bring your other foot up, then step back down with the same foot.",
      "Keep your torso upright throughout.",
    ],
    avoid: ["Pushing off your back foot — let the front leg do the work", "Using a box that's too high for your mobility"],
    breathing: "Exhale as you step up, inhale as you step down.",
  },
  "reverse lunge": {
    steps: [
      "Stand tall with feet together. Step backward with one leg.",
      "Lower until both knees are at about 90°.",
      "Keep your front shin roughly vertical.",
      "Push off your back foot to return to standing.",
    ],
    avoid: ["Leaning forward — keep your torso upright", "Stepping too far or too short"],
    breathing: "Inhale as you step back, exhale as you return.",
  },
  "sumo deadlift": {
    steps: [
      "Stand with a wide stance, toes pointed out about 30–45°. Grip the bar inside your knees.",
      "Drop your hips, lift your chest, and brace your core.",
      "Drive through your feet, pushing the floor apart, to stand up.",
      "Lock out with hips fully extended.",
    ],
    avoid: ["Letting your knees cave inward — push them out over your toes", "Rounding your back off the floor"],
    breathing: "Brace and inhale before the pull, exhale at lockout.",
  },
  "stiff leg deadlift": {
    steps: [
      "Stand with feet hip-width apart, holding a barbell at hip height.",
      "Keep your legs nearly straight (very slight knee bend) as you hinge forward.",
      "Lower the bar along your legs until you feel a maximal hamstring stretch.",
      "Return to standing by driving your hips forward.",
    ],
    avoid: ["Rounding your back — maintain a neutral spine", "Bending your knees too much"],
    breathing: "Inhale as you lower, exhale as you stand.",
  },
  // ── CORE ───────────────────────────────────────────────────────────────────
  "plank": {
    steps: [
      "Start in a forearm plank position with elbows directly under your shoulders.",
      "Keep your body in a perfectly straight line from head to heels.",
      "Engage your core, glutes, and quads — don't let your hips sag or pike.",
      "Hold the position for the prescribed duration.",
    ],
    avoid: ["Sagging hips — squeeze your glutes to maintain alignment", "Looking up — keep your neck neutral"],
    breathing: "Breathe steadily throughout — don't hold your breath.",
  },
  "side plank": {
    steps: [
      "Lie on your side with your elbow directly under your shoulder.",
      "Lift your hips off the ground, creating a straight line from head to feet.",
      "Stack your feet or stagger them for balance.",
      "Hold the position, keeping your core engaged.",
    ],
    avoid: ["Letting your hips drop toward the floor", "Rotating your torso forward or backward"],
    breathing: "Breathe steadily — don't hold your breath.",
  },
  "crunch": {
    steps: [
      "Lie on your back with knees bent and feet flat. Place hands behind your head or across your chest.",
      "Curl your upper body toward your knees, lifting your shoulder blades off the floor.",
      "Squeeze your abs at the top of the movement.",
      "Lower back down slowly — don't just drop.",
    ],
    avoid: ["Pulling on your neck with your hands", "Using momentum to swing up"],
    breathing: "Exhale as you crunch up, inhale as you lower.",
  },
  "sit up": {
    steps: [
      "Lie on your back with knees bent and feet anchored (or held down).",
      "Cross your arms over your chest or place hands behind your head.",
      "Sit all the way up by curling your torso toward your knees.",
      "Lower back down with control.",
    ],
    avoid: ["Pulling on your neck", "Using hip flexors to jerk yourself up"],
    breathing: "Exhale as you sit up, inhale as you lower.",
  },
  "russian twist": {
    steps: [
      "Sit on the floor with knees bent and feet slightly elevated.",
      "Lean back to about 45° — keep your back straight, not rounded.",
      "Hold a weight at your chest and rotate your torso to one side.",
      "Rotate to the other side — that's one rep.",
    ],
    avoid: ["Rounding your back", "Moving only your arms instead of rotating your torso"],
    breathing: "Exhale as you rotate to each side.",
  },
  "mountain climber": {
    steps: [
      "Start in a high plank position with hands under your shoulders.",
      "Drive one knee toward your chest, then quickly switch legs.",
      "Keep your hips level — don't let them bounce up and down.",
      "Maintain a fast, controlled pace.",
    ],
    avoid: ["Piking your hips up high", "Letting your hands creep forward"],
    breathing: "Breathe rhythmically — exhale every 2–3 steps.",
  },
  "leg raise": {
    steps: [
      "Lie flat on your back with legs straight and hands under your glutes for support.",
      "Keeping legs straight, raise them until they're perpendicular to the floor.",
      "Lower them slowly back down — stop just before they touch the floor.",
    ],
    avoid: ["Arching your lower back off the floor — press it down", "Using momentum to swing your legs up"],
    breathing: "Exhale as you raise, inhale as you lower.",
  },
  "hanging leg raise": {
    steps: [
      "Hang from a pull-up bar with an overhand grip, arms fully extended.",
      "Raise your legs in front of you until they're parallel to the floor (or higher).",
      "Lower them slowly with control — no swinging.",
    ],
    avoid: ["Swinging your body — keep it controlled", "Using momentum from your hip flexors"],
    breathing: "Exhale as you raise your legs, inhale as you lower.",
  },
  "ab wheel rollout": {
    steps: [
      "Kneel on the floor holding an ab wheel with both hands.",
      "Roll the wheel forward, extending your body as far as you can while maintaining a flat back.",
      "Engage your core to pull the wheel back to the starting position.",
    ],
    avoid: ["Letting your hips sag — maintain a straight line", "Going too far out before you have the strength"],
    breathing: "Inhale as you roll out, exhale as you pull back.",
  },
  "bicycle crunch": {
    steps: [
      "Lie on your back with hands behind your head and legs raised, knees at 90°.",
      "Bring your right elbow toward your left knee while extending your right leg.",
      "Switch sides in a pedaling motion — left elbow to right knee.",
      "Keep your shoulder blades off the floor throughout.",
    ],
    avoid: ["Pulling on your neck", "Moving too fast — focus on the rotation"],
    breathing: "Exhale as you twist to each side.",
  },
  "dead bug": {
    steps: [
      "Lie on your back with arms extended toward the ceiling and knees at 90°.",
      "Slowly lower your right arm overhead and left leg toward the floor simultaneously.",
      "Return to the starting position, then repeat on the other side.",
      "Keep your lower back pressed firmly into the floor throughout.",
    ],
    avoid: ["Arching your lower back off the floor", "Moving too quickly — this is a slow, controlled exercise"],
    breathing: "Exhale as you extend, inhale as you return.",
  },
  "cable woodchop": {
    steps: [
      "Set a cable pulley to the highest position. Stand sideways to the machine.",
      "Grip the handle with both hands above your far shoulder.",
      "Pull the handle diagonally across your body to your opposite hip, rotating your torso.",
      "Return slowly to the starting position.",
    ],
    avoid: ["Using your arms to pull — the power comes from your core rotation", "Rounding your back"],
    breathing: "Exhale as you chop down, inhale as you return.",
  },
  // ── CARDIO / FULL BODY ────────────────────────────────────────────────────
  "burpee": {
    steps: [
      "Stand with feet shoulder-width apart.",
      "Drop into a squat and place your hands on the floor.",
      "Jump your feet back into a plank position, then perform a push-up.",
      "Jump your feet forward to your hands, then explosively jump up with arms overhead.",
    ],
    avoid: ["Skipping the push-up if the workout calls for full burpees", "Landing with stiff knees on the jump"],
    breathing: "Exhale on the jump up, breathe naturally through the rest.",
  },
  "jumping jack": {
    steps: [
      "Stand with feet together and arms at your sides.",
      "Jump your feet out wide while raising your arms overhead.",
      "Jump back to the starting position.",
      "Maintain a steady, rhythmic pace.",
    ],
    avoid: ["Landing flat-footed — stay on the balls of your feet", "Letting your arms go slack"],
    breathing: "Breathe rhythmically — inhale on the out, exhale on the in.",
  },
  "box jump": {
    steps: [
      "Stand facing a sturdy box or platform at an appropriate height.",
      "Swing your arms back, then explosively jump onto the box.",
      "Land softly with both feet fully on the box, knees slightly bent.",
      "Stand up fully on the box, then step back down (don't jump down).",
    ],
    avoid: ["Landing on the edge of the box", "Jumping down — step down to protect your joints"],
    breathing: "Exhale as you jump, inhale as you reset.",
  },
  "kettlebell swing": {
    steps: [
      "Stand with feet wider than shoulder-width, kettlebell on the floor in front of you.",
      "Hinge at your hips to grip the kettlebell. Hike it back between your legs.",
      "Explosively drive your hips forward to swing the kettlebell to chest height.",
      "Let the kettlebell swing back between your legs and repeat — it's a hip hinge, not a squat.",
    ],
    avoid: ["Squatting instead of hinging — push your hips back", "Using your arms to lift — the power comes from your hips"],
    breathing: "Exhale sharply as you drive your hips forward.",
  },
  "battle rope": {
    steps: [
      "Stand with feet shoulder-width apart, knees slightly bent, holding one rope end in each hand.",
      "Alternate raising and slamming each arm to create waves in the rope.",
      "Keep your core braced and maintain an athletic stance.",
      "Vary patterns: alternating waves, double slams, circles.",
    ],
    avoid: ["Standing too upright — maintain a slight squat", "Letting the waves die out — keep intensity high"],
    breathing: "Breathe rhythmically — don't hold your breath.",
  },
  "jump rope": {
    steps: [
      "Hold the rope handles at hip height with elbows close to your body.",
      "Rotate the rope using your wrists, not your arms.",
      "Jump just high enough to clear the rope — about 1 inch off the ground.",
      "Land softly on the balls of your feet.",
    ],
    avoid: ["Jumping too high — wastes energy", "Using big arm circles to turn the rope"],
    breathing: "Breathe naturally and rhythmically.",
  },
  "high knees": {
    steps: [
      "Stand tall with feet hip-width apart.",
      "Drive one knee up to hip height while pumping the opposite arm.",
      "Quickly switch to the other leg in a running motion.",
      "Stay on the balls of your feet and maintain a fast pace.",
    ],
    avoid: ["Leaning back — stay tall or lean slightly forward", "Not bringing knees high enough"],
    breathing: "Breathe rhythmically — exhale every 2–3 steps.",
  },
  "sprint": {
    steps: [
      "Start in an athletic stance or from starting blocks.",
      "Drive your knees high and pump your arms powerfully.",
      "Land on the balls of your feet with a slight forward lean.",
      "Maintain maximum effort for the prescribed distance or time.",
    ],
    avoid: ["Heel striking — stay on your forefoot", "Tensing your upper body — keep shoulders relaxed"],
    breathing: "Breathe naturally — don't try to control it during max effort.",
  },
};

/**
 * Get exercise instructions by name.
 * Returns null if no instructions are available.
 */
export function getExerciseInstructions(
  exerciseName: string
): ExerciseInstruction | null {
  const key = exerciseName.toLowerCase().trim();
  return INSTRUCTIONS[key] ?? null;
}

/**
 * Check if instructions exist for an exercise.
 */
export function hasExerciseInstructions(exerciseName: string): boolean {
  return exerciseName.toLowerCase().trim() in INSTRUCTIONS;
}
