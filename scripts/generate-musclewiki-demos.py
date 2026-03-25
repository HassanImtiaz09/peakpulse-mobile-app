"""
Generate updated exercise-demos.ts with MuscleWiki video URLs.
Also generates a mapping file for exercise-data.ts angleViews.

The MuscleWiki API returns MP4 video URLs. We need to:
1. Update exercise-demos.ts gifUrl -> videoUrl (but keep gifUrl field name for backward compat)
2. Update exercise-data.ts angleViews to use front/side MuscleWiki videos

The videos require the API key header to stream, so we'll need to add that to the player.
Actually, let's check if the stream URLs work without auth...
"""
import json
import os

# The complete mapping of app exercise names to MuscleWiki video URLs
# Manually curated from API search results, with corrections for best matches
EXERCISE_VIDEO_MAP = {
    # ── Chest ──────────────────────────────────────────────────────────────────
    "bench press": {
        "cue": "Keep shoulder blades retracted. Bar touches mid-chest.",
        "front": "https://api.musclewiki.com/stream/videos/branded/male-barbell-bench-press-front.mp4",
        "side": "https://api.musclewiki.com/stream/videos/branded/male-barbell-bench-press-side_KciuhbB.mp4",
        "mw_name": "Barbell Bench Press",
    },
    "push up": {
        "cue": "Straight body line. Lower until chest nearly touches floor.",
        "front": "https://api.musclewiki.com/stream/videos/branded/male-bodyweight-push-up-front.mp4",
        "side": "https://api.musclewiki.com/stream/videos/branded/male-bodyweight-push-up-side.mp4",
        "mw_name": "Push Up",
    },
    "dumbbell fly": {
        "cue": "Slight elbow bend throughout. Squeeze chest at top.",
        "front": "https://api.musclewiki.com/stream/videos/branded/male-dumbbell-chest-fly-front.mp4",
        "side": "https://api.musclewiki.com/stream/videos/branded/male-dumbbell-chest-fly-side.mp4",
        "mw_name": "Dumbbell Chest Fly",
    },
    "incline bench press": {
        "cue": "30-45° incline. Drive bar in a slight arc to upper chest.",
        "front": "https://api.musclewiki.com/stream/videos/branded/male-Barbell-barbell-incline-bench-press-front.mp4",
        "side": "https://api.musclewiki.com/stream/videos/branded/male-Barbell-barbell-incline-bench-press-side.mp4",
        "mw_name": "Barbell Incline Bench Press",
    },
    "incline dumbbell press": {
        "cue": "30-45° incline. Press dumbbells up and slightly inward.",
        "front": "https://api.musclewiki.com/stream/videos/branded/male-dumbbell-incline-bench-press-front.mp4",
        "side": "https://api.musclewiki.com/stream/videos/branded/male-dumbbell-incline-bench-press-side.mp4",
        "mw_name": "Dumbbell Incline Bench Press",
    },
    "decline bench press": {
        "cue": "Slight decline. Bar to lower chest. Controlled movement.",
        "front": "https://api.musclewiki.com/stream/videos/branded/male-dumbbell-decline-bench-press-front.mp4",
        "side": "https://api.musclewiki.com/stream/videos/branded/male-dumbbell-decline-bench-press-side.mp4",
        "mw_name": "Dumbbell Decline Bench Press",
    },
    "cable fly": {
        "cue": "Hinge forward slightly. Bring hands together in an arc.",
        "front": "https://api.musclewiki.com/stream/videos/branded/male-cable-pec-fly-front.mp4",
        "side": "https://api.musclewiki.com/stream/videos/branded/male-cable-pec-fly-side.mp4",
        "mw_name": "Cable Pec Fly",
    },
    "cable crossover": {
        "cue": "Step forward. Squeeze chest as hands cross at bottom.",
        "front": "https://api.musclewiki.com/stream/videos/branded/male-cable-pec-fly-front.mp4",
        "side": "https://api.musclewiki.com/stream/videos/branded/male-cable-pec-fly-side.mp4",
        "mw_name": "Cable Pec Fly",
    },
    "dip": {
        "cue": "Lean forward for chest. Lower until elbows reach 90°.",
        "front": "https://api.musclewiki.com/stream/videos/branded/male-Dumbbells-dumbbell-weighted-dip-front.mp4",
        "side": "https://api.musclewiki.com/stream/videos/branded/male-Dumbbells-dumbbell-weighted-dip-side.mp4",
        "mw_name": "Dumbbell Weighted Dip",
    },
    "chest dip": {
        "cue": "Lean forward for chest. Lower until elbows reach 90°.",
        "front": "https://api.musclewiki.com/stream/videos/branded/male-Dumbbells-dumbbell-weighted-dip-front.mp4",
        "side": "https://api.musclewiki.com/stream/videos/branded/male-Dumbbells-dumbbell-weighted-dip-side.mp4",
        "mw_name": "Dumbbell Weighted Dip",
    },
    # ── Back ──────────────────────────────────────────────────────────────────
    "pull up": {
        "cue": "Full hang at bottom. Drive elbows down to pull up.",
        "front": "https://api.musclewiki.com/stream/videos/branded/male-bodyweight-pull-ups-front.mp4",
        "side": "https://api.musclewiki.com/stream/videos/branded/male-bodyweight-pull-ups-side.mp4",
        "mw_name": "Pull Ups",
    },
    "chin up": {
        "cue": "Supinated grip. Chin clears bar at top.",
        "front": "https://api.musclewiki.com/stream/videos/branded/male-bodyweight-chin-ups-front.mp4",
        "side": "https://api.musclewiki.com/stream/videos/branded/male-bodyweight-chin-ups-side.mp4",
        "mw_name": "Chin Ups",
    },
    "lat pulldown": {
        "cue": "Lean back slightly. Pull bar to upper chest.",
        "front": "https://api.musclewiki.com/stream/videos/branded/male-machine-pulldown-front.mp4",
        "side": "https://api.musclewiki.com/stream/videos/branded/male-machine-pulldown-side.mp4",
        "mw_name": "Machine Pulldown",
    },
    "bent over row": {
        "cue": "Hinge at hips, back flat. Pull bar to lower rib cage.",
        "front": "https://api.musclewiki.com/stream/videos/branded/male-Barbell-barbell-bent-over-row-front.mp4",
        "side": "https://api.musclewiki.com/stream/videos/branded/male-Barbell-barbell-bent-over-row-side.mp4",
        "mw_name": "Barbell Bent Over Row",
    },
    "barbell row": {
        "cue": "Hinge at hips, back flat. Pull bar to lower rib cage.",
        "front": "https://api.musclewiki.com/stream/videos/branded/male-Barbell-barbell-bent-over-row-front.mp4",
        "side": "https://api.musclewiki.com/stream/videos/branded/male-Barbell-barbell-bent-over-row-side.mp4",
        "mw_name": "Barbell Bent Over Row",
    },
    "dumbbell row": {
        "cue": "One arm on bench. Pull to hip, squeeze lat at top.",
        "front": "https://api.musclewiki.com/stream/videos/branded/male-dumbbell-row-bilateral-front.mp4",
        "side": "https://api.musclewiki.com/stream/videos/branded/male-dumbbell-row-bilateral-side.mp4",
        "mw_name": "Dumbbell Row Bilateral",
    },
    "seated cable row": {
        "cue": "Tall posture. Pull handle to navel, squeeze shoulder blades.",
        "front": "https://api.musclewiki.com/stream/videos/branded/male-machine-seated-cable-row-front.mp4",
        "side": "https://api.musclewiki.com/stream/videos/branded/male-machine-seated-cable-row-side.mp4",
        "mw_name": "Machine Seated Cable Row",
    },
    "cable row": {
        "cue": "Tall posture. Pull handle to navel, squeeze shoulder blades.",
        "front": "https://api.musclewiki.com/stream/videos/branded/male-machine-seated-cable-row-front.mp4",
        "side": "https://api.musclewiki.com/stream/videos/branded/male-machine-seated-cable-row-side.mp4",
        "mw_name": "Machine Seated Cable Row",
    },
    "deadlift": {
        "cue": "Bar over mid-foot. Hinge hips back, keep back neutral.",
        "front": "https://api.musclewiki.com/stream/videos/branded/male-Barbell-barbell-deadlift-front.mp4",
        "side": "https://api.musclewiki.com/stream/videos/branded/male-Barbell-barbell-deadlift-side.mp4",
        "mw_name": "Barbell Deadlift",
    },
    "t-bar row": {
        "cue": "Chest on pad. Pull to chest, squeeze shoulder blades.",
        "front": "https://api.musclewiki.com/stream/videos/branded/male-Barbell-landmine-t-bar-rows-front.mp4",
        "side": "https://api.musclewiki.com/stream/videos/branded/male-Barbell-landmine-t-bar-rows-side.mp4",
        "mw_name": "Landmine T Bar Rows",
    },
    "pendlay row": {
        "cue": "Bar returns to floor each rep. Explosive pull.",
        "front": "https://api.musclewiki.com/stream/videos/branded/male-Dumbbells-dumbbell-pendlay-row-front.mp4",
        "side": "https://api.musclewiki.com/stream/videos/branded/male-Dumbbells-dumbbell-pendlay-row-side.mp4",
        "mw_name": "Dumbbell Pendlay Row",
    },
    # ── Shoulders ──────────────────────────────────────────────────────────────
    "overhead press": {
        "cue": "Brace core. Press bar in a straight line overhead.",
        "front": "https://api.musclewiki.com/stream/videos/branded/male-Barbell-barbell-overhead-press-front.mp4",
        "side": "https://api.musclewiki.com/stream/videos/branded/male-Barbell-barbell-overhead-press-side.mp4",
        "mw_name": "Barbell Overhead Press",
    },
    "shoulder press": {
        "cue": "Elbows at 90° at bottom. Full extension at top.",
        "front": "https://api.musclewiki.com/stream/videos/branded/male-Dumbbells-dumbbell-overhead-press-front.mp4",
        "side": "https://api.musclewiki.com/stream/videos/branded/male-Dumbbells-dumbbell-overhead-press-side.mp4",
        "mw_name": "Dumbbell Overhead Press",
    },
    "military press": {
        "cue": "Strict press. No leg drive. Bar overhead.",
        "front": "https://api.musclewiki.com/stream/videos/branded/male-Barbell-barbell-overhead-press-front.mp4",
        "side": "https://api.musclewiki.com/stream/videos/branded/male-Barbell-barbell-overhead-press-side.mp4",
        "mw_name": "Barbell Overhead Press",
    },
    "dumbbell shoulder press": {
        "cue": "Press dumbbells up and slightly inward. Full lockout.",
        "front": "https://api.musclewiki.com/stream/videos/branded/male-Dumbbells-dumbbell-overhead-press-front.mp4",
        "side": "https://api.musclewiki.com/stream/videos/branded/male-Dumbbells-dumbbell-overhead-press-side.mp4",
        "mw_name": "Dumbbell Overhead Press",
    },
    "lateral raise": {
        "cue": "Slight forward lean. Raise to shoulder height, pinky up.",
        "front": "https://api.musclewiki.com/stream/videos/branded/male-dumbbell-lateral-raise-front.mp4",
        "side": "https://api.musclewiki.com/stream/videos/branded/male-dumbbell-lateral-raise-side.mp4",
        "mw_name": "Dumbbell Lateral Raise",
    },
    "side lateral raise": {
        "cue": "Slight forward lean. Raise to shoulder height, pinky up.",
        "front": "https://api.musclewiki.com/stream/videos/branded/male-dumbbell-lateral-raise-front.mp4",
        "side": "https://api.musclewiki.com/stream/videos/branded/male-dumbbell-lateral-raise-side.mp4",
        "mw_name": "Dumbbell Lateral Raise",
    },
    "front raise": {
        "cue": "Controlled raise to eye level. Lower slowly.",
        "front": "https://api.musclewiki.com/stream/videos/branded/male-dumbbell-front-raise-front.mp4",
        "side": "https://api.musclewiki.com/stream/videos/branded/male-dumbbell-front-raise-side.mp4",
        "mw_name": "Dumbbell Front Raise",
    },
    "face pull": {
        "cue": "Pull rope to face. Elbows high and wide at end.",
        "front": "https://api.musclewiki.com/stream/videos/branded/male-Cable-cable-rope-face-pulls-front.mp4",
        "side": "https://api.musclewiki.com/stream/videos/branded/male-Cable-cable-rope-face-pulls-side.mp4",
        "mw_name": "Cable Rope Face Pulls",
    },
    "rear delt fly": {
        "cue": "Bent over. Raise arms to sides, squeeze rear delts.",
        "front": "https://api.musclewiki.com/stream/videos/branded/male-dumbbell-rear-delt-fly-front.mp4",
        "side": "https://api.musclewiki.com/stream/videos/branded/male-dumbbell-rear-delt-fly-side.mp4",
        "mw_name": "Dumbbell Rear Delt Fly",
    },
    "arnold press": {
        "cue": "Rotate palms from facing you to facing forward as you press.",
        "front": "https://api.musclewiki.com/stream/videos/branded/male-Dumbbells-dumbbell-arnold-press-front.mp4",
        "side": "https://api.musclewiki.com/stream/videos/branded/male-Dumbbells-dumbbell-arnold-press-side.mp4",
        "mw_name": "Dumbbell Arnold Press",
    },
    "upright row": {
        "cue": "Pull bar to chin. Elbows lead the movement.",
        "front": "https://api.musclewiki.com/stream/videos/branded/male-Kettlebells-kettlebell-upright-row-front.mp4",
        "side": "https://api.musclewiki.com/stream/videos/branded/male-Kettlebells-kettlebell-upright-row-side.mp4",
        "mw_name": "Kettlebell Upright Row",
    },
    "shrug": {
        "cue": "Straight up, hold at top. No rolling.",
        "front": "https://api.musclewiki.com/stream/videos/branded/male-Dumbbells-dumbbell-shrug-front.mp4",
        "side": "https://api.musclewiki.com/stream/videos/branded/male-Dumbbells-dumbbell-shrug-side.mp4",
        "mw_name": "Dumbbell Shrug",
    },
    # ── Arms ──────────────────────────────────────────────────────────────────
    "bicep curl": {
        "cue": "Elbows fixed at sides. Full range of motion.",
        "front": "https://api.musclewiki.com/stream/videos/branded/male-Dumbbells-dumbbell-curl-front.mp4",
        "side": "https://api.musclewiki.com/stream/videos/branded/male-Dumbbells-dumbbell-curl-side.mp4",
        "mw_name": "Dumbbell Curl",
    },
    "biceps curl": {
        "cue": "Elbows fixed at sides. Full range of motion.",
        "front": "https://api.musclewiki.com/stream/videos/branded/male-Dumbbells-dumbbell-curl-front.mp4",
        "side": "https://api.musclewiki.com/stream/videos/branded/male-Dumbbells-dumbbell-curl-side.mp4",
        "mw_name": "Dumbbell Curl",
    },
    "barbell curl": {
        "cue": "Elbows fixed at sides. Squeeze at top.",
        "front": "https://api.musclewiki.com/stream/videos/branded/male-Barbell-barbell-curl-front.mp4",
        "side": "https://api.musclewiki.com/stream/videos/branded/male-Barbell-barbell-curl-side.mp4",
        "mw_name": "Barbell Curl",
    },
    "dumbbell curl": {
        "cue": "Alternate or together. Full supination at top.",
        "front": "https://api.musclewiki.com/stream/videos/branded/male-Dumbbells-dumbbell-curl-front.mp4",
        "side": "https://api.musclewiki.com/stream/videos/branded/male-Dumbbells-dumbbell-curl-side.mp4",
        "mw_name": "Dumbbell Curl",
    },
    "hammer curl": {
        "cue": "Neutral grip throughout. Controlled eccentric.",
        "front": "https://api.musclewiki.com/stream/videos/branded/male-dumbbell-hammer-curl-front.mp4",
        "side": "https://api.musclewiki.com/stream/videos/branded/male-dumbbell-hammer-curl-side.mp4",
        "mw_name": "Dumbbell Hammer Curl",
    },
    "preacher curl": {
        "cue": "Arms on pad. Full stretch at bottom, squeeze at top.",
        "front": "https://api.musclewiki.com/stream/videos/branded/male-Dumbbells-dumbbell-preacher-curl-front.mp4",
        "side": "https://api.musclewiki.com/stream/videos/branded/male-Dumbbells-dumbbell-preacher-curl-side.mp4",
        "mw_name": "Dumbbell Preacher Curl",
    },
    "concentration curl": {
        "cue": "Elbow on inner thigh. Isolate the bicep.",
        "front": "https://api.musclewiki.com/stream/videos/branded/male-dumbbell-concentration-curl-front.mp4",
        "side": "https://api.musclewiki.com/stream/videos/branded/male-dumbbell-concentration-curl-side.mp4",
        "mw_name": "Dumbbell Concentration Curl",
    },
    "tricep pushdown": {
        "cue": "Elbows pinned to sides. Full extension at bottom.",
        "front": "https://api.musclewiki.com/stream/videos/branded/male-Machine-machine-tricep-pushdown-front.mp4",
        "side": "https://api.musclewiki.com/stream/videos/branded/male-Machine-machine-tricep-pushdown-side.mp4",
        "mw_name": "Machine Tricep Pushdown",
    },
    "tricep extension": {
        "cue": "Elbows point to ceiling. Full stretch and extension.",
        "front": "https://api.musclewiki.com/stream/videos/branded/male-Bodyweight-bodyweight-tricep-extension-front.mp4",
        "side": "https://api.musclewiki.com/stream/videos/branded/male-Bodyweight-bodyweight-tricep-extension-side.mp4",
        "mw_name": "Bodyweight Tricep Extension",
    },
    "overhead tricep extension": {
        "cue": "Elbows close to head. Full stretch behind head.",
        "front": "https://api.musclewiki.com/stream/videos/branded/male-Bands-band-overhead-tricep-extension-front.mp4",
        "side": "https://api.musclewiki.com/stream/videos/branded/male-Bands-band-overhead-tricep-extension-side.mp4",
        "mw_name": "Band Overhead Tricep Extension",
    },
    "tricep dip": {
        "cue": "Upright torso for triceps. Lower until elbows reach 90°.",
        "front": "https://api.musclewiki.com/stream/videos/branded/male-bodyweight-bench-dips-front.mp4",
        "side": "https://api.musclewiki.com/stream/videos/branded/male-bodyweight-bench-dips-side.mp4",
        "mw_name": "Bench Dips",
    },
    "skull crusher": {
        "cue": "Elbows point to ceiling. Lower bar to forehead slowly.",
        "front": "https://api.musclewiki.com/stream/videos/branded/male-Kettlebells-kettlebell-skull-crusher-front.mp4",
        "side": "https://api.musclewiki.com/stream/videos/branded/male-Kettlebells-kettlebell-skull-crusher-side.mp4",
        "mw_name": "Kettlebell Skull Crusher",
    },
    "close grip bench press": {
        "cue": "Hands shoulder-width. Elbows close to body.",
        "front": "https://api.musclewiki.com/stream/videos/branded/male-Barbell-barbell-close-grip-bench-press-front.mp4",
        "side": "https://api.musclewiki.com/stream/videos/branded/male-Barbell-barbell-close-grip-bench-press-side.mp4",
        "mw_name": "Barbell Close Grip Bench Press",
    },
    # ── Legs ──────────────────────────────────────────────────────────────────
    "squat": {
        "cue": "Feet shoulder-width. Knees track toes. Depth to parallel.",
        "front": "https://api.musclewiki.com/stream/videos/branded/male-Barbell-barbell-squat-front.mp4",
        "side": "https://api.musclewiki.com/stream/videos/branded/male-Barbell-barbell-squat-side.mp4",
        "mw_name": "Barbell Squat",
    },
    "back squat": {
        "cue": "Bar on traps. Brace core. Drive through heels.",
        "front": "https://api.musclewiki.com/stream/videos/branded/male-Barbell-barbell-squat-front.mp4",
        "side": "https://api.musclewiki.com/stream/videos/branded/male-Barbell-barbell-squat-side.mp4",
        "mw_name": "Barbell Squat",
    },
    "barbell squat": {
        "cue": "Bar on traps. Brace core. Drive through heels.",
        "front": "https://api.musclewiki.com/stream/videos/branded/male-Barbell-barbell-squat-front.mp4",
        "side": "https://api.musclewiki.com/stream/videos/branded/male-Barbell-barbell-squat-side.mp4",
        "mw_name": "Barbell Squat",
    },
    "front squat": {
        "cue": "Elbows high. Bar on front delts. Upright torso.",
        "front": "https://api.musclewiki.com/stream/videos/branded/male-Barbell-barbell-front-squat-olympic-front.mp4",
        "side": "https://api.musclewiki.com/stream/videos/branded/male-Barbell-barbell-front-squat-olympic-side.mp4",
        "mw_name": "Barbell Front Squat Olympic",
    },
    "goblet squat": {
        "cue": "Hold dumbbell at chest. Elbows inside knees at bottom.",
        "front": "https://api.musclewiki.com/stream/videos/branded/male-dumbbell-goblet-squat-front.mp4",
        "side": "https://api.musclewiki.com/stream/videos/branded/male-dumbbell-goblet-squat-side.mp4",
        "mw_name": "Dumbbell Goblet Squat",
    },
    "bulgarian split squat": {
        "cue": "Rear foot on bench. Front knee over ankle.",
        "front": "https://api.musclewiki.com/stream/videos/branded/male-bodyweight-bulgarian-split-squat-front.mp4",
        "side": "https://api.musclewiki.com/stream/videos/branded/male-bodyweight-bulgarian-split-squat-side.mp4",
        "mw_name": "Bulgarian Split Squat",
    },
    "lunge": {
        "cue": "Step forward. Back knee hovers above floor.",
        "front": "https://api.musclewiki.com/stream/videos/branded/male-bodyweight-forward-lunge-front_zb4K50d.mp4",
        "side": "https://api.musclewiki.com/stream/videos/branded/male-bodyweight-forward-lunge-side_4k0dfH0.mp4",
        "mw_name": "Forward Lunge",
    },
    "walking lunge": {
        "cue": "Continuous forward motion. Upright torso.",
        "front": "https://api.musclewiki.com/stream/videos/branded/male-Bodyweight-walking-lunge-front.mp4",
        "side": "https://api.musclewiki.com/stream/videos/branded/male-Bodyweight-walking-lunge-side.mp4",
        "mw_name": "Walking Lunge",
    },
    "reverse lunge": {
        "cue": "Step backward. Front knee stays over ankle.",
        "front": "https://api.musclewiki.com/stream/videos/branded/male-Barbell-barbell-reverse-lunge-front.mp4",
        "side": "https://api.musclewiki.com/stream/videos/branded/male-Barbell-barbell-reverse-lunge-side.mp4",
        "mw_name": "Barbell Reverse Lunge",
    },
    "leg press": {
        "cue": "Feet hip-width. Don\u2019t lock knees at top.",
        "front": "https://api.musclewiki.com/stream/videos/branded/male-machine-leg-press-front.mp4",
        "side": "https://api.musclewiki.com/stream/videos/branded/male-machine-leg-press-side.mp4",
        "mw_name": "Machine Leg Press",
    },
    "leg curl": {
        "cue": "Curl heels to glutes. Slow eccentric.",
        "front": "https://api.musclewiki.com/stream/videos/branded/male-Dumbbells-dumbbell-leg-curl-front.mp4",
        "side": "https://api.musclewiki.com/stream/videos/branded/male-Dumbbells-dumbbell-leg-curl-side.mp4",
        "mw_name": "Dumbbell Leg Curl",
    },
    "hamstring curl": {
        "cue": "Curl heels to glutes. Slow eccentric.",
        "front": "https://api.musclewiki.com/stream/videos/branded/male-Dumbbells-dumbbell-leg-curl-front.mp4",
        "side": "https://api.musclewiki.com/stream/videos/branded/male-Dumbbells-dumbbell-leg-curl-side.mp4",
        "mw_name": "Dumbbell Leg Curl",
    },
    "leg extension": {
        "cue": "Full extension at top. Pause 1 second.",
        "front": "https://api.musclewiki.com/stream/videos/branded/male-machine-leg-extension-front.mp4",
        "side": "https://api.musclewiki.com/stream/videos/branded/male-machine-leg-extension-side.mp4",
        "mw_name": "Machine Leg Extension",
    },
    "romanian deadlift": {
        "cue": "Hinge at hips. Bar stays close to legs. Feel hamstring stretch.",
        "front": "https://api.musclewiki.com/stream/videos/branded/male-Barbell-barbell-romanian-deadlift-front.mp4",
        "side": "https://api.musclewiki.com/stream/videos/branded/male-Barbell-barbell-romanian-deadlift-side_dnNh5UH.mp4",
        "mw_name": "Barbell Romanian Deadlift",
    },
    "stiff leg deadlift": {
        "cue": "Minimal knee bend. Hinge at hips. Stretch hamstrings.",
        "front": "https://api.musclewiki.com/stream/videos/branded/male-barbell-stiff-leg-deadlift-front.mp4",
        "side": "https://api.musclewiki.com/stream/videos/branded/male-barbell-stiff-leg-deadlift-side.mp4",
        "mw_name": "Barbell Stiff Leg Deadlifts",
    },
    "sumo deadlift": {
        "cue": "Wide stance. Toes out. Drive hips forward.",
        "front": "https://api.musclewiki.com/stream/videos/branded/male-Barbell-barbell-sumo-deadlift-front.mp4",
        "side": "https://api.musclewiki.com/stream/videos/branded/male-Barbell-barbell-sumo-deadlift-side.mp4",
        "mw_name": "Barbell Sumo Deadlift",
    },
    "hip thrust": {
        "cue": "Shoulders on bench. Drive hips up. Squeeze glutes at top.",
        "front": "https://api.musclewiki.com/stream/videos/branded/male-Barbell-barbell-hip-thrust-front.mp4",
        "side": "https://api.musclewiki.com/stream/videos/branded/male-Barbell-barbell-hip-thrust-side.mp4",
        "mw_name": "Barbell Hip Thrust",
    },
    "glute bridge": {
        "cue": "Feet flat on floor. Drive hips up. Squeeze glutes.",
        "front": "https://api.musclewiki.com/stream/videos/branded/male-bodyweight-glute-bridge-front.mp4",
        "side": "https://api.musclewiki.com/stream/videos/branded/male-bodyweight-glute-bridge-side.mp4",
        "mw_name": "Glute Bridge",
    },
    "calf raise": {
        "cue": "Full stretch at bottom. Full contraction at top.",
        "front": "https://api.musclewiki.com/stream/videos/branded/male-machine-standing-calf-raises-front.mp4",
        "side": "https://api.musclewiki.com/stream/videos/branded/male-machine-standing-calf-raises-side.mp4",
        "mw_name": "Machine Standing Calf Raises",
    },
    "standing calf raise": {
        "cue": "Full stretch at bottom. Full contraction at top.",
        "front": "https://api.musclewiki.com/stream/videos/branded/male-machine-standing-calf-raises-front.mp4",
        "side": "https://api.musclewiki.com/stream/videos/branded/male-machine-standing-calf-raises-side.mp4",
        "mw_name": "Machine Standing Calf Raises",
    },
    "seated calf raise": {
        "cue": "Knees at 90°. Full range of motion.",
        "front": "https://api.musclewiki.com/stream/videos/branded/male-Kettlebells-kettlebell-seated-calf-raise-front.mp4",
        "side": "https://api.musclewiki.com/stream/videos/branded/male-Kettlebells-kettlebell-seated-calf-raise-side.mp4",
        "mw_name": "Kettlebell Seated Calf Raise",
    },
    "hack squat": {
        "cue": "Shoulders against pad. Feet forward. Full depth.",
        "front": "https://api.musclewiki.com/stream/videos/branded/male-Machine-machine-hack-squat-front.mp4",
        "side": "https://api.musclewiki.com/stream/videos/branded/male-Machine-machine-hack-squat-side.mp4",
        "mw_name": "Machine Hack Squat",
    },
    "step up": {
        "cue": "Drive through front heel. Full extension at top.",
        "front": "https://api.musclewiki.com/stream/videos/branded/male-Kettlebells-kettlebell-step-up-front.mp4",
        "side": "https://api.musclewiki.com/stream/videos/branded/male-Kettlebells-kettlebell-step-up-side.mp4",
        "mw_name": "Kettlebell Step Up",
    },
    # ── Core ──────────────────────────────────────────────────────────────────
    "plank": {
        "cue": "Straight line from head to heels. Don\u2019t let hips sag.",
        "front": "https://api.musclewiki.com/stream/videos/branded/male-bodyweight-forearm-plank-front.mp4",
        "side": "https://api.musclewiki.com/stream/videos/branded/male-bodyweight-forearm-plank-side.mp4",
        "mw_name": "Forearm Plank",
    },
    "side plank": {
        "cue": "Stack feet. Hips up. Straight line from head to feet.",
        "front": "https://api.musclewiki.com/stream/videos/branded/male-Bodyweight-elbow-side-plank-front.mp4",
        "side": "https://api.musclewiki.com/stream/videos/branded/male-Bodyweight-elbow-side-plank-side.mp4",
        "mw_name": "Elbow Side Plank",
    },
    "crunch": {
        "cue": "Curl shoulders off floor. Lower slowly.",
        "front": "https://api.musclewiki.com/stream/videos/branded/male-bodyweight-crunch-front.mp4",
        "side": "https://api.musclewiki.com/stream/videos/branded/male-bodyweight-crunch-side.mp4",
        "mw_name": "Crunches",
    },
    "sit up": {
        "cue": "Feet anchored. Full range of motion.",
        "front": "https://api.musclewiki.com/stream/videos/branded/male-Bodyweight-situp-front.mp4",
        "side": "https://api.musclewiki.com/stream/videos/branded/male-Bodyweight-situp-side.mp4",
        "mw_name": "Situp",
    },
    "russian twist": {
        "cue": "Lean back 45°. Rotate shoulders, not just arms.",
        "front": "https://api.musclewiki.com/stream/videos/branded/male-Kettlebells-kettlebell-russian-twist-front.mp4",
        "side": "https://api.musclewiki.com/stream/videos/branded/male-Kettlebells-kettlebell-russian-twist-side.mp4",
        "mw_name": "Kettlebell Russian Twist",
    },
    "mountain climber": {
        "cue": "Hips level. Drive knees to chest alternately.",
        "front": "https://api.musclewiki.com/stream/videos/branded/male-Bodyweight-mountain-climber-front.mp4",
        "side": "https://api.musclewiki.com/stream/videos/branded/male-Bodyweight-mountain-climber-side.mp4",
        "mw_name": "Mountain Climber",
    },
    "leg raise": {
        "cue": "Lower back pressed to floor. Slow eccentric.",
        "front": "https://api.musclewiki.com/stream/videos/branded/male-Bodyweight-floor-incline-leg-raise-front.mp4",
        "side": "https://api.musclewiki.com/stream/videos/branded/male-Bodyweight-floor-incline-leg-raise-side.mp4",
        "mw_name": "Floor Incline Leg Raise",
    },
    "hanging leg raise": {
        "cue": "Hang from bar. Raise legs to 90°. Control the descent.",
        "front": "https://api.musclewiki.com/stream/videos/branded/male-bodyweight-hanging-knee-raises-front.mp4",
        "side": "https://api.musclewiki.com/stream/videos/branded/male-bodyweight-hanging-knee-raises-side.mp4",
        "mw_name": "Hanging Knee Raises",
    },
    "ab wheel rollout": {
        "cue": "Core tight. Roll out slowly. Don\u2019t let hips sag.",
        "front": "https://api.musclewiki.com/stream/videos/branded/male-TRX-trx-ab-rollout-front.mp4",
        "side": "https://api.musclewiki.com/stream/videos/branded/male-TRX-trx-ab-rollout-side.mp4",
        "mw_name": "TRX Ab Rollout",
    },
    "bicycle crunch": {
        "cue": "Elbow to opposite knee. Controlled rotation.",
        "front": "https://api.musclewiki.com/stream/videos/branded/male-Bodyweight-bicycle-crunch-front.mp4",
        "side": "https://api.musclewiki.com/stream/videos/branded/male-Bodyweight-bicycle-crunch-side.mp4",
        "mw_name": "Bicycle Crunch",
    },
    "dead bug": {
        "cue": "Lower back flat. Opposite arm and leg extend.",
        "front": "https://api.musclewiki.com/stream/videos/branded/male-Bodyweight-dead-bug-front.mp4",
        "side": "https://api.musclewiki.com/stream/videos/branded/male-Bodyweight-dead-bug-side.mp4",
        "mw_name": "Dead Bug",
    },
    "cable woodchop": {
        "cue": "Rotate from hips. Arms stay extended.",
        "front": "https://api.musclewiki.com/stream/videos/branded/male-cable-woodchopper-front.mp4",
        "side": "https://api.musclewiki.com/stream/videos/branded/male-cable-woodchopper-side.mp4",
        "mw_name": "Cable Wood Chopper",
    },
    # ── Cardio / HIIT ──────────────────────────────────────────────────────────
    "burpee": {
        "cue": "Explosive jump at top. Chest to floor at bottom.",
        "front": "https://api.musclewiki.com/stream/videos/branded/male-Bodyweight-burpee-front.mp4",
        "side": "https://api.musclewiki.com/stream/videos/branded/male-Bodyweight-burpee-side.mp4",
        "mw_name": "Burpee",
    },
    "jumping jack": {
        "cue": "Arms and legs in sync. Land softly.",
        "front": "https://api.musclewiki.com/stream/videos/branded/male-Cardio-cardio-jumping-jacks-front.mp4",
        "side": "https://api.musclewiki.com/stream/videos/branded/male-Cardio-cardio-jumping-jacks-side.mp4",
        "mw_name": "Cardio Jumping Jacks",
    },
    "box jump": {
        "cue": "Swing arms for momentum. Land softly with bent knees.",
        "front": "https://api.musclewiki.com/stream/videos/branded/male-Plyometrics-box-jump-front.mp4",
        "side": "https://api.musclewiki.com/stream/videos/branded/male-Plyometrics-box-jump-side.mp4",
        "mw_name": "Box Jump",
    },
    "kettlebell swing": {
        "cue": "Hip hinge, not squat. Snap hips forward explosively.",
        "front": "https://api.musclewiki.com/stream/videos/branded/male-Kettlebells-kettlebell-swing-front.mp4",
        "side": "https://api.musclewiki.com/stream/videos/branded/male-Kettlebells-kettlebell-swing-side.mp4",
        "mw_name": "Kettlebell Swing",
    },
    "battle rope": {
        "cue": "Alternate arms. Keep core tight.",
        # No MuscleWiki match - keep existing GIF
        "front": "https://static.exercisedb.dev/media/RJa4tCo.gif",
        "side": "",
        "mw_name": "Battle Rope",
    },
    "jump rope": {
        "cue": "Wrists drive the rope. Light on feet.",
        "front": "https://api.musclewiki.com/stream/videos/branded/male-Cardio-jump-rope-front.mp4",
        "side": "https://api.musclewiki.com/stream/videos/branded/male-Cardio-jump-rope-side.mp4",
        "mw_name": "Jump Rope",
    },
    "high knees": {
        "cue": "Drive knees to hip height. Pump arms.",
        # No accurate MuscleWiki match - keep existing GIF
        "front": "https://static.exercisedb.dev/media/ealLwvX.gif",
        "side": "",
        "mw_name": "High Knees",
    },
    "sprint": {
        "cue": "Drive knees high. Pump arms. Stay on balls of feet.",
        "front": "https://api.musclewiki.com/stream/videos/branded/male-Cardio-treadmill-sprint-front.mp4",
        "side": "https://api.musclewiki.com/stream/videos/branded/male-Cardio-treadmill-sprint-side.mp4",
        "mw_name": "Treadmill Sprint",
    },
}

# Save the mapping as JSON for reference
output_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "musclewiki-final-mapping.json")
with open(output_path, "w") as f:
    json.dump(EXERCISE_VIDEO_MAP, f, indent=2)

print(f"Saved {len(EXERCISE_VIDEO_MAP)} exercise mappings to {output_path}")

# Count exercises with MuscleWiki videos vs fallback GIFs
mw_count = sum(1 for v in EXERCISE_VIDEO_MAP.values() if "musclewiki.com" in v["front"])
gif_count = sum(1 for v in EXERCISE_VIDEO_MAP.values() if "exercisedb.dev" in v["front"])
print(f"MuscleWiki videos: {mw_count}, Fallback GIFs: {gif_count}")
