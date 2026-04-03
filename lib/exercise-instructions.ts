/**
 * Exercise Instructions â Concise Step-by-Step Form Scripts
 *
 * Trimmed to core essentials: 3 key steps, 1 common mistake, breathing pattern.
 */

export interface ExerciseInstruction {
  /** 3 concise steps for performing the exercise */
  steps: string[];
  /** Most critical mistake to avoid */
  avoid: string[];
  /** Breathing pattern */
  breathing: string;
}

const INSTRUCTIONS: Record<string, ExerciseInstruction> = {
  "bench press": {
    steps: [
      "Lie flat on the bench with feet firmly on the floor. Grip the bar slightly wider than shoulder-width.",
      "Unrack the bar and lower it in a controlled arc to your mid-chest, keeping elbows at about 45ÃÂ°.",
      "Keep your glutes on the bench and maintain tension throughout the movement.",
    ],
    avoid: ["Flaring elbows to 90ÃÂ° Ã¢ÂÂ increases shoulder injury risk"],
    breathing: "Inhale as you lower the bar, exhale as you press up.",
  },
  "push up": {
    steps: [
      "Start in a high plank position with hands slightly wider than shoulder-width.",
      "Lower your body until your chest nearly touches the floor, elbows at 45ÃÂ°.",
      "Push back up to the starting position by fully extending your arms.",
    ],
    avoid: ["Sagging hips or piking up Ã¢ÂÂ maintain a rigid plank"],
    breathing: "Inhale on the way down, exhale as you push up.",
  },
  "dumbbell fly": {
    steps: [
      "Lie on a flat bench holding dumbbells above your chest with a slight bend in your elbows.",
      "Maintain the same elbow angle throughout Ã¢ÂÂ don't straighten or bend further.",
      "Squeeze your chest to bring the dumbbells back together above your chest.",
    ],
    avoid: ["Going too heavy Ã¢ÂÂ this is an isolation movement"],
    breathing: "Inhale as you open your arms, exhale as you squeeze them together.",
  },
  "incline bench press": {
    steps: [
      "Set the bench to 30Ã¢ÂÂ45ÃÂ° incline. Grip the bar slightly wider than shoulder-width.",
      "Lower the bar to your upper chest just below the collarbone.",
      "Press the bar up and slightly back until arms are fully extended.",
    ],
    avoid: ["Setting the incline too steep (above 45ÃÂ°) Ã¢ÂÂ shifts work to shoulders"],
    breathing: "Inhale as you lower, exhale as you press.",
  },
  "incline dumbbell press": {
    steps: [
      "Set bench to 30Ã¢ÂÂ45ÃÂ°. Hold dumbbells at chest level with palms facing forward.",
      "Press the dumbbells up and slightly inward until they nearly touch at the top.",
      "Lower them back slowly to chest level, keeping elbows at about 45ÃÂ°.",
    ],
    avoid: ["Clanking dumbbells together at the top"],
    breathing: "Inhale on the descent, exhale on the press.",
  },
  "decline bench press": {
    steps: [
      "Secure your legs on the decline bench. Grip the bar slightly wider than shoulder-width.",
      "Unrack and lower the bar to your lower chest in a controlled manner.",
      "Press the bar back up until arms are fully extended.",
    ],
    avoid: ["Letting the bar drift toward your face"],
    breathing: "Inhale as you lower, exhale as you press.",
  },
  "cable fly": {
    steps: [
      "Set the pulleys to chest height. Stand in a staggered stance with a slight forward lean.",
      "Squeeze your chest at the peak contraction for a moment.",
      "Slowly return to the starting position, feeling the stretch in your chest.",
    ],
    avoid: ["Using too much weight and turning it into a press"],
    breathing: "Exhale as you bring hands together, inhale as you open.",
  },
  "cable crossover": {
    steps: [
      "Set pulleys high. Step forward into a split stance with slight forward lean.",
      "Squeeze and hold the contraction briefly.",
      "Return slowly to the starting position with arms wide.",
    ],
    avoid: ["Rounding your upper back"],
    breathing: "Exhale as you pull down, inhale as you return.",
  },
  "dip": {
    steps: [
      "Grip the parallel bars and lift yourself to a straight-arm position.",
      "Lower your body until your upper arms are roughly parallel to the floor.",
      "Press back up to full arm extension.",
    ],
    avoid: ["Going too deep if you have shoulder issues"],
    breathing: "Inhale as you lower, exhale as you push up.",
  },
  "chest dip": {
    steps: [
      "Grip the bars and lean your torso forward about 30ÃÂ° throughout the movement.",
      "Keep elbows flared slightly outward to emphasize the chest.",
      "Press back up, squeezing your chest at the top.",
    ],
    avoid: ["Staying too upright Ã¢ÂÂ that shifts emphasis to triceps"],
    breathing: "Inhale on the descent, exhale on the press.",
  },
  "pull up": {
    steps: [
      "Hang from the bar with an overhand grip slightly wider than shoulder-width.",
      "Pull yourself up until your chin clears the bar.",
      "Lower yourself slowly to a full hang Ã¢ÂÂ control the descent.",
    ],
    avoid: ["Kipping or swinging to get your chin over the bar"],
    breathing: "Exhale as you pull up, inhale as you lower.",
  },
  "chin up": {
    steps: [
      "Hang from the bar with an underhand (supinated) grip, hands shoulder-width apart.",
      "Continue until your chin clears the bar.",
      "Lower slowly to a full dead hang.",
    ],
    avoid: ["Using excessive body swing"],
    breathing: "Exhale as you pull up, inhale as you lower.",
  },
  "lat pulldown": {
    steps: [
      "Sit with thighs secured under the pads. Grip the bar wider than shoulder-width.",
      "Squeeze your shoulder blades together at the bottom of the movement.",
      "Return the bar up slowly with control Ã¢ÂÂ don't let it yank your arms up.",
    ],
    avoid: ["Pulling the bar behind your neck Ã¢ÂÂ stresses the shoulders"],
    breathing: "Exhale as you pull down, inhale as you release up.",
  },
  "bent over row": {
    steps: [
      "Stand with feet hip-width apart. Hinge at the hips until your torso is roughly 45ÃÂ° to the floor.",
      "Pull the bar to your lower chest/upper abdomen, driving elbows back.",
      "Lower the bar with control to full arm extension.",
    ],
    avoid: ["Rounding your lower back Ã¢ÂÂ keep it neutral"],
    breathing: "Exhale as you row up, inhale as you lower.",
  },
  "dumbbell row": {
    steps: [
      "Place one knee and hand on a bench. Hold a dumbbell in the other hand, arm hanging straight.",
      "Squeeze your lat at the top for a moment.",
      "Lower the dumbbell slowly to full extension.",
    ],
    avoid: ["Rotating your torso to heave the weight up"],
    breathing: "Exhale as you row, inhale as you lower.",
  },
  "seated cable row": {
    steps: [
      "Sit with feet on the platform, knees slightly bent. Grab the V-handle.",
      "Squeeze your shoulder blades together at the end of the pull.",
      "Extend your arms forward slowly Ã¢ÂÂ don't let the weight stack pull you forward.",
    ],
    avoid: ["Rounding your back as you reach forward"],
    breathing: "Exhale as you pull, inhale as you extend.",
  },
  "deadlift": {
    steps: [
      "Stand with feet hip-width apart, bar over mid-foot. Grip the bar just outside your knees.",
      "Drive through your feet to stand up, keeping the bar close to your body.",
      "Reverse the movement to lower the bar Ã¢ÂÂ hinge at the hips first, then bend knees.",
    ],
    avoid: ["Rounding your lower back at any point"],
    breathing: "Brace and inhale before the pull, exhale at lockout.",
  },
  "t-bar row": {
    steps: [
      "Straddle the bar with feet wide. Grip the handle with both hands.",
      "Pull the bar to your chest, squeezing your back muscles.",
      "Lower with control to full arm extension.",
    ],
    avoid: ["Standing too upright Ã¢ÂÂ maintain the hip hinge"],
    breathing: "Exhale as you row, inhale as you lower.",
  },
  "pendlay row": {
    steps: [
      "Set up like a deadlift with torso parallel to the floor. Bar starts on the ground each rep.",
      "Explosively row the bar to your lower chest.",
      "Lower the bar back to the floor with control Ã¢ÂÂ full stop between reps.",
    ],
    avoid: ["Lifting your torso during the row Ã¢ÂÂ stay parallel"],
    breathing: "Brace before each rep, exhale as you row.",
  },
  "overhead press": {
    steps: [
      "Stand with feet shoulder-width apart. Grip the bar just outside shoulder-width at collarbone height.",
      "Move your head slightly back as the bar passes, then push it forward once the bar is overhead.",
      "Lower the bar back to your collarbone with control.",
    ],
    avoid: ["Excessive back lean Ã¢ÂÂ keep your core braced"],
    breathing: "Inhale at the bottom, exhale as you press overhead.",
  },
  "dumbbell shoulder press": {
    steps: [
      "Sit or stand with dumbbells at shoulder height, palms facing forward.",
      "Press both dumbbells overhead until arms are fully extended.",
      "Lower them back to shoulder height with control.",
    ],
    avoid: ["Flaring your rib cage Ã¢ÂÂ keep core tight"],
    breathing: "Exhale as you press, inhale as you lower.",
  },
  "lateral raise": {
    steps: [
      "Stand with dumbbells at your sides, slight bend in your elbows.",
      "Lead with your elbows, not your hands Ã¢ÂÂ imagine pouring water from a pitcher.",
      "Lower slowly Ã¢ÂÂ don't just drop the weight.",
    ],
    avoid: ["Using momentum by swinging your body"],
    breathing: "Exhale as you raise, inhale as you lower.",
  },
  "front raise": {
    steps: [
      "Stand holding dumbbells in front of your thighs, palms facing your body.",
      "Raise one or both arms straight in front of you to shoulder height.",
      "Hold briefly at the top, then lower with control.",
    ],
    avoid: ["Swinging the weight Ã¢ÂÂ use strict form"],
    breathing: "Exhale as you raise, inhale as you lower.",
  },
  "face pull": {
    steps: [
      "Set a cable pulley to upper chest height with a rope attachment.",
      "Finish with your hands beside your ears, elbows high and back.",
      "Squeeze your rear delts and upper back, then return slowly.",
    ],
    avoid: ["Using too much weight Ã¢ÂÂ this is a precision movement"],
    breathing: "Exhale as you pull, inhale as you return.",
  },
  "rear delt fly": {
    steps: [
      "Bend forward at the hips or lie face-down on an incline bench.",
      "Raise your arms out to the sides, squeezing your rear delts.",
      "Lower slowly to the starting position.",
    ],
    avoid: ["Using your traps to shrug the weight up"],
    breathing: "Exhale as you raise, inhale as you lower.",
  },
  "arnold press": {
    steps: [
      "Start with dumbbells at chest height, palms facing you (like the top of a curl).",
      "Finish with arms fully extended overhead, palms forward.",
      "Reverse the rotation as you lower back to the starting position.",
    ],
    avoid: ["Rushing the rotation Ã¢ÂÂ it should be smooth and continuous"],
    breathing: "Exhale as you press and rotate, inhale as you lower.",
  },
  "upright row": {
    steps: [
      "Stand holding a barbell or dumbbells with a narrow grip in front of your thighs.",
      "Lead with your elbows Ã¢ÂÂ they should always be higher than your hands.",
      "Lower with control.",
    ],
    avoid: ["Pulling too high (above chest) Ã¢ÂÂ can cause shoulder impingement"],
    breathing: "Exhale as you pull up, inhale as you lower.",
  },
  "shrug": {
    steps: [
      "Stand holding a barbell or dumbbells at your sides with arms straight.",
      "Hold the top position for a moment, squeezing your traps.",
      "Lower slowly to the starting position.",
    ],
    avoid: ["Rolling your shoulders Ã¢ÂÂ just go straight up and down"],
    breathing: "Exhale as you shrug up, inhale as you lower.",
  },
  "bicep curl": {
    steps: [
      "Stand with dumbbells at your sides, palms facing forward.",
      "Squeeze your biceps at the top of the movement.",
      "Lower slowly to full arm extension.",
    ],
    avoid: ["Swinging your body to lift the weight"],
    breathing: "Exhale as you curl up, inhale as you lower.",
  },
  "barbell curl": {
    steps: [
      "Stand with feet shoulder-width apart, gripping the barbell with an underhand grip.",
      "Curl the bar up to shoulder height, squeezing your biceps.",
      "Lower the bar slowly Ã¢ÂÂ resist gravity on the way down.",
    ],
    avoid: ["Leaning back to swing the weight up"],
    breathing: "Exhale as you curl, inhale as you lower.",
  },
  "hammer curl": {
    steps: [
      "Stand with dumbbells at your sides, palms facing each other (neutral grip).",
      "Curl the weights up while keeping your palms facing inward the entire time.",
      "Squeeze at the top, then lower with control.",
    ],
    avoid: ["Rotating your wrists during the movement"],
    breathing: "Exhale as you curl, inhale as you lower.",
  },
  "preacher curl": {
    steps: [
      "Sit at a preacher bench with your upper arms resting flat on the pad.",
      "Curl the weight up, keeping your upper arms pressed against the pad.",
      "Lower slowly to near-full extension Ã¢ÂÂ don't hyperextend at the bottom.",
    ],
    avoid: ["Lifting your elbows off the pad"],
    breathing: "Exhale as you curl, inhale as you lower.",
  },
  "concentration curl": {
    steps: [
      "Sit on a bench with legs spread. Brace the back of your upper arm against your inner thigh.",
      "Squeeze your bicep hard at the top.",
      "Lower slowly to full extension.",
    ],
    avoid: ["Using your shoulder to swing the weight"],
    breathing: "Exhale as you curl, inhale as you lower.",
  },
  "tricep pushdown": {
    steps: [
      "Stand facing a cable machine with a straight bar or rope attachment at head height.",
      "Squeeze your triceps at the bottom.",
      "Let the handle return slowly to the starting position Ã¢ÂÂ don't let your elbows drift forward.",
    ],
    avoid: ["Flaring your elbows out"],
    breathing: "Exhale as you push down, inhale as you return.",
  },
  "tricep extension": {
    steps: [
      "Hold a dumbbell or cable handle behind your head with both hands.",
      "Keep your upper arms close to your ears throughout.",
      "Lower the weight behind your head with control.",
    ],
    avoid: ["Flaring your elbows outward"],
    breathing: "Exhale as you extend, inhale as you lower.",
  },
  "overhead tricep extension": {
    steps: [
      "Stand or sit holding a dumbbell with both hands overhead, arms fully extended.",
      "Keep your upper arms vertical and close to your head.",
      "Extend back to the starting position, squeezing your triceps.",
    ],
    avoid: ["Letting your elbows flare wide"],
    breathing: "Exhale as you extend, inhale as you lower.",
  },
  "skull crusher": {
    steps: [
      "Lie on a flat bench holding an EZ bar or dumbbells with arms extended over your chest.",
      "Keep your upper arms perpendicular to the floor Ã¢ÂÂ only your forearms move.",
      "Extend back to the starting position.",
    ],
    avoid: ["Letting your elbows flare outward"],
    breathing: "Inhale as you lower, exhale as you extend.",
  },
  "close grip bench press": {
    steps: [
      "Lie on a flat bench. Grip the bar with hands about shoulder-width apart.",
      "Lower the bar to your lower chest, keeping elbows tucked close to your body.",
      "Press the bar back up to full extension.",
    ],
    avoid: ["Gripping too narrow Ã¢ÂÂ shoulder-width is sufficient"],
    breathing: "Inhale as you lower, exhale as you press.",
  },
  "squat": {
    steps: [
      "Stand with feet shoulder-width apart, bar resting on your upper traps.",
      "Descend until your hip crease is at or below your knee level (parallel or deeper).",
      "Drive through your whole foot to stand back up, keeping your chest tall.",
    ],
    avoid: ["Letting your knees cave inward Ã¢ÂÂ push them out over your toes"],
    breathing: "Inhale and brace at the top, hold through the descent, exhale as you stand.",
  },
  "front squat": {
    steps: [
      "Rest the bar on the front of your shoulders in a clean grip or cross-arm grip.",
      "Squat down, keeping your torso as upright as possible.",
      "Drive up through your feet to return to standing.",
    ],
    avoid: ["Letting your elbows drop Ã¢ÂÂ the bar will roll forward"],
    breathing: "Inhale and brace before descending, exhale as you stand.",
  },
  "goblet squat": {
    steps: [
      "Hold a dumbbell or kettlebell at chest height with both hands, elbows pointing down.",
      "Go as deep as your mobility allows while maintaining a flat back.",
      "Stand back up by driving through your heels.",
    ],
    avoid: ["Rounding your upper back"],
    breathing: "Inhale on the way down, exhale on the way up.",
  },
  "bulgarian split squat": {
    steps: [
      "Stand about 2 feet in front of a bench. Place the top of your rear foot on the bench.",
      "Keep your torso upright and front knee tracking over your toes.",
      "Drive through your front foot to return to standing.",
    ],
    avoid: ["Leaning too far forward"],
    breathing: "Inhale as you lower, exhale as you drive up.",
  },
  "lunge": {
    steps: [
      "Stand tall with feet together. Step forward with one leg.",
      "Your front knee should be over your ankle, not past your toes.",
      "Push off your front foot to return to the starting position.",
    ],
    avoid: ["Taking too short a step Ã¢ÂÂ your knee will go past your toes"],
    breathing: "Inhale as you step and lower, exhale as you push back.",
  },
  "leg press": {
    steps: [
      "Sit in the leg press machine with your back flat against the pad.",
      "Release the safety catches. Lower the platform until your knees are at about 90ÃÂ°.",
      "Press the platform back up without fully locking your knees at the top.",
    ],
    avoid: ["Letting your lower back round off the pad at the bottom"],
    breathing: "Inhale as you lower, exhale as you press.",
  },
  "leg curl": {
    steps: [
      "Lie face-down on the leg curl machine. Adjust the pad so it sits just above your ankles.",
      "Squeeze your hamstrings at the top of the movement.",
      "Lower slowly to the starting position.",
    ],
    avoid: ["Lifting your hips off the pad"],
    breathing: "Exhale as you curl, inhale as you lower.",
  },
  "leg extension": {
    steps: [
      "Sit in the machine with your back against the pad. Adjust the ankle pad to sit on your lower shins.",
      "Squeeze your quads at the top for a moment.",
      "Lower slowly Ã¢ÂÂ don't let the weight stack slam down.",
    ],
    avoid: ["Using too much weight Ã¢ÂÂ this stresses the knee joint"],
    breathing: "Exhale as you extend, inhale as you lower.",
  },
  "romanian deadlift": {
    steps: [
      "Stand with feet hip-width apart, holding a barbell at hip height.",
      "Lower the bar along your legs until you feel a deep stretch in your hamstrings.",
      "Drive your hips forward to return to standing, squeezing your glutes at the top.",
    ],
    avoid: ["Rounding your lower back Ã¢ÂÂ keep it neutral throughout"],
    breathing: "Inhale as you hinge down, exhale as you stand.",
  },
  "hip thrust": {
    steps: [
      "Sit on the floor with your upper back against a bench. Roll a barbell over your hips.",
      "Drive through your heels to lift your hips until your body forms a straight line from shoulders to knees.",
      "Squeeze your glutes hard at the top, then lower with control.",
    ],
    avoid: ["Hyperextending your lower back at the top"],
    breathing: "Exhale as you thrust up, inhale as you lower.",
  },
  "glute bridge": {
    steps: [
      "Lie on your back with knees bent and feet flat on the floor, hip-width apart.",
      "Squeeze your glutes at the top Ã¢ÂÂ your body should form a straight line from shoulders to knees.",
      "Lower your hips back to the floor with control.",
    ],
    avoid: ["Pushing through your toes instead of your heels"],
    breathing: "Exhale as you lift, inhale as you lower.",
  },
  "calf raise": {
    steps: [
      "Stand on the edge of a step or platform with the balls of your feet on the edge.",
      "Hold the top position for a moment.",
      "Lower your heels below the platform level for a full stretch.",
    ],
    avoid: ["Bouncing at the bottom Ã¢ÂÂ use a full, controlled range"],
    breathing: "Exhale as you rise, inhale as you lower.",
  },
  "hack squat": {
    steps: [
      "Position yourself in the hack squat machine with your back against the pad.",
      "Release the safety handles. Lower yourself until your thighs are at least parallel.",
      "Drive through your feet to press back up.",
    ],
    avoid: ["Letting your knees cave inward"],
    breathing: "Inhale as you lower, exhale as you press up.",
  },
  "step up": {
    steps: [
      "Stand facing a bench or box at about knee height.",
      "Bring your other foot up, then step back down with the same foot.",
      "Keep your torso upright throughout.",
    ],
    avoid: ["Pushing off your back foot Ã¢ÂÂ let the front leg do the work"],
    breathing: "Exhale as you step up, inhale as you step down.",
  },
  "reverse lunge": {
    steps: [
      "Stand tall with feet together. Step backward with one leg.",
      "Keep your front shin roughly vertical.",
      "Push off your back foot to return to standing.",
    ],
    avoid: ["Leaning forward Ã¢ÂÂ keep your torso upright"],
    breathing: "Inhale as you step back, exhale as you return.",
  },
  "sumo deadlift": {
    steps: [
      "Stand with a wide stance, toes pointed out about 30Ã¢ÂÂ45ÃÂ°. Grip the bar inside your knees.",
      "Drive through your feet, pushing the floor apart, to stand up.",
      "Lock out with hips fully extended.",
    ],
    avoid: ["Letting your knees cave inward Ã¢ÂÂ push them out over your toes"],
    breathing: "Brace and inhale before the pull, exhale at lockout.",
  },
  "stiff leg deadlift": {
    steps: [
      "Stand with feet hip-width apart, holding a barbell at hip height.",
      "Lower the bar along your legs until you feel a maximal hamstring stretch.",
      "Return to standing by driving your hips forward.",
    ],
    avoid: ["Rounding your back Ã¢ÂÂ maintain a neutral spine"],
    breathing: "Inhale as you lower, exhale as you stand.",
  },
  "plank": {
    steps: [
      "Start in a forearm plank position with elbows directly under your shoulders.",
      "Engage your core, glutes, and quads Ã¢ÂÂ don't let your hips sag or pike.",
      "Hold the position for the prescribed duration.",
    ],
    avoid: ["Sagging hips Ã¢ÂÂ squeeze your glutes to maintain alignment"],
    breathing: "Breathe steadily throughout Ã¢ÂÂ don't hold your breath.",
  },
  "side plank": {
    steps: [
      "Lie on your side with your elbow directly under your shoulder.",
      "Stack your feet or stagger them for balance.",
      "Hold the position, keeping your core engaged.",
    ],
    avoid: ["Letting your hips drop toward the floor"],
    breathing: "Breathe steadily Ã¢ÂÂ don't hold your breath.",
  },
  "crunch": {
    steps: [
      "Lie on your back with knees bent and feet flat. Place hands behind your head or across your chest.",
      "Squeeze your abs at the top of the movement.",
      "Lower back down slowly Ã¢ÂÂ don't just drop.",
    ],
    avoid: ["Pulling on your neck with your hands"],
    breathing: "Exhale as you crunch up, inhale as you lower.",
  },
  "sit up": {
    steps: [
      "Lie on your back with knees bent and feet anchored (or held down).",
      "Sit all the way up by curling your torso toward your knees.",
      "Lower back down with control.",
    ],
    avoid: ["Pulling on your neck"],
    breathing: "Exhale as you sit up, inhale as you lower.",
  },
  "russian twist": {
    steps: [
      "Sit on the floor with knees bent and feet slightly elevated.",
      "Hold a weight at your chest and rotate your torso to one side.",
      "Rotate to the other side Ã¢ÂÂ that's one rep.",
    ],
    avoid: ["Rounding your back"],
    breathing: "Exhale as you rotate to each side.",
  },
  "mountain climber": {
    steps: [
      "Start in a high plank position with hands under your shoulders.",
      "Keep your hips level Ã¢ÂÂ don't let them bounce up and down.",
      "Maintain a fast, controlled pace.",
    ],
    avoid: ["Piking your hips up high"],
    breathing: "Breathe rhythmically Ã¢ÂÂ exhale every 2Ã¢ÂÂ3 steps.",
  },
  "leg raise": {
    steps: [
      "Lie flat on your back with legs straight and hands under your glutes for support.",
      "Keeping legs straight, raise them until they're perpendicular to the floor.",
      "Lower them slowly back down Ã¢ÂÂ stop just before they touch the floor.",
    ],
    avoid: ["Arching your lower back off the floor Ã¢ÂÂ press it down"],
    breathing: "Exhale as you raise, inhale as you lower.",
  },
  "hanging leg raise": {
    steps: [
      "Hang from a pull-up bar with an overhand grip, arms fully extended.",
      "Raise your legs in front of you until they're parallel to the floor (or higher).",
      "Lower them slowly with control Ã¢ÂÂ no swinging.",
    ],
    avoid: ["Swinging your body Ã¢ÂÂ keep it controlled"],
    breathing: "Exhale as you raise your legs, inhale as you lower.",
  },
  "ab wheel rollout": {
    steps: [
      "Kneel on the floor holding an ab wheel with both hands.",
      "Roll the wheel forward, extending your body as far as you can while maintaining a flat back.",
      "Engage your core to pull the wheel back to the starting position.",
    ],
    avoid: ["Letting your hips sag Ã¢ÂÂ maintain a straight line"],
    breathing: "Inhale as you roll out, exhale as you pull back.",
  },
  "bicycle crunch": {
    steps: [
      "Lie on your back with hands behind your head and legs raised, knees at 90ÃÂ°.",
      "Switch sides in a pedaling motion Ã¢ÂÂ left elbow to right knee.",
      "Keep your shoulder blades off the floor throughout.",
    ],
    avoid: ["Pulling on your neck"],
    breathing: "Exhale as you twist to each side.",
  },
  "dead bug": {
    steps: [
      "Lie on your back with arms extended toward the ceiling and knees at 90ÃÂ°.",
      "Return to the starting position, then repeat on the other side.",
      "Keep your lower back pressed firmly into the floor throughout.",
    ],
    avoid: ["Arching your lower back off the floor"],
    breathing: "Exhale as you extend, inhale as you return.",
  },
  "cable woodchop": {
    steps: [
      "Set a cable pulley to the highest position. Stand sideways to the machine.",
      "Pull the handle diagonally across your body to your opposite hip, rotating your torso.",
      "Return slowly to the starting position.",
    ],
    avoid: ["Using your arms to pull Ã¢ÂÂ the power comes from your core rotation"],
    breathing: "Exhale as you chop down, inhale as you return.",
  },
  "burpee": {
    steps: [
      "Stand with feet shoulder-width apart.",
      "Jump your feet back into a plank position, then perform a push-up.",
      "Jump your feet forward to your hands, then explosively jump up with arms overhead.",
    ],
    avoid: ["Skipping the push-up if the workout calls for full burpees"],
    breathing: "Exhale on the jump up, breathe naturally through the rest.",
  },
  "jumping jack": {
    steps: [
      "Stand with feet together and arms at your sides.",
      "Jump back to the starting position.",
      "Maintain a steady, rhythmic pace.",
    ],
    avoid: ["Landing flat-footed Ã¢ÂÂ stay on the balls of your feet"],
    breathing: "Breathe rhythmically Ã¢ÂÂ inhale on the out, exhale on the in.",
  },
  "box jump": {
    steps: [
      "Stand facing a sturdy box or platform at an appropriate height.",
      "Land softly with both feet fully on the box, knees slightly bent.",
      "Stand up fully on the box, then step back down (don't jump down).",
    ],
    avoid: ["Landing on the edge of the box"],
    breathing: "Exhale as you jump, inhale as you reset.",
  },
  "kettlebell swing": {
    steps: [
      "Stand with feet wider than shoulder-width, kettlebell on the floor in front of you.",
      "Explosively drive your hips forward to swing the kettlebell to chest height.",
      "Let the kettlebell swing back between your legs and repeat Ã¢ÂÂ it's a hip hinge, not a squat.",
    ],
    avoid: ["Squatting instead of hinging Ã¢ÂÂ push your hips back"],
    breathing: "Exhale sharply as you drive your hips forward.",
  },
  "battle rope": {
    steps: [
      "Stand with feet shoulder-width apart, knees slightly bent, holding one rope end in each hand.",
      "Keep your core braced and maintain an athletic stance.",
      "Vary patterns: alternating waves, double slams, circles.",
    ],
    avoid: ["Standing too upright Ã¢ÂÂ maintain a slight squat"],
    breathing: "Breathe rhythmically Ã¢ÂÂ don't hold your breath.",
  },
  "jump rope": {
    steps: [
      "Hold the rope handles at hip height with elbows close to your body.",
      "Jump just high enough to clear the rope Ã¢ÂÂ about 1 inch off the ground.",
      "Land softly on the balls of your feet.",
    ],
    avoid: ["Jumping too high Ã¢ÂÂ wastes energy"],
    breathing: "Breathe naturally and rhythmically.",
  },
  "sprint": {
    steps: [
      "Start in an athletic stance or from starting blocks.",
      "Land on the balls of your feet with a slight forward lean.",
      "Maintain maximum effort for the prescribed distance or time.",
    ],
    avoid: ["Heel striking Ã¢ÂÂ stay on your forefoot"],
    breathing: "Breathe naturally Ã¢ÂÂ don't try to control it during max effort.",
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

