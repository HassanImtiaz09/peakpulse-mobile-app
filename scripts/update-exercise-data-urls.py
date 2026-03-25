"""
Update exercise-data.ts angleViews to use MuscleWiki video URLs.

For each exercise, the angleViews currently have 2-3 entries all using the same
ExerciseDB GIF URL with different labels (Side View, Front View, etc.).

We'll replace them with:
- View 1: MuscleWiki front video URL
- View 2: MuscleWiki side video URL (if available, otherwise front again)
- Remove the 3rd view if it existed (Close-Up/Top-Down) since MuscleWiki only has front+side

The focus text and labels are kept accurate.
"""
import json
import re

# Load the MuscleWiki mapping
with open("scripts/musclewiki-final-mapping.json") as f:
    mw_map = json.load(f)

# Build lookup: exercise name -> {front, side}
# Also build lookup by old GIF URL
name_to_urls = {}
gif_to_urls = {}

for name, data in mw_map.items():
    front = data.get("front", "")
    side = data.get("side", "")
    if front:
        name_to_urls[name.lower()] = {"front": front, "side": side or front}

# Read exercise-data.ts
with open("lib/exercise-data.ts") as f:
    content = f.read()

# We need to find each exercise block and update the gifUrl in angleViews
# Strategy: find each gifUrl line and replace the URL based on context

# First, let's extract exercise keys and their GIF URLs
# Pattern: key: "exercise-name" ... angleViews: [ { gifUrl: "...", label: "...", focus: "..." } ]

# Find all exercisedb URLs and build a mapping from old URL to exercise name
# by looking at the exercise-demos.ts mapping
import os

# Read exercise-demos.ts to get old URL -> exercise name mapping
with open("lib/exercise-demos.ts") as f:
    demos_content = f.read()

# Now we need to map old ExerciseDB URLs to MuscleWiki URLs
# The exercise-data.ts uses the same ExerciseDB URLs that were in exercise-demos.ts
# We need to figure out which exercise each URL belongs to

# Parse exercise-data.ts to find exercise entries
# Each entry has: key: "name", ... angleViews: [{ gifUrl: "...", label: "...", focus: "..." }, ...]
exercise_pattern = re.compile(
    r'key:\s*"([^"]+)".*?angleViews:\s*\[(.*?)\]',
    re.DOTALL
)

angle_pattern = re.compile(
    r'\{\s*gifUrl:\s*"([^"]+)",\s*label:\s*"([^"]+)",\s*focus:\s*"([^"]+)"\s*\}'
)

replacements = {}
exercises_found = 0
exercises_updated = 0

for match in exercise_pattern.finditer(content):
    key = match.group(1)
    angles_block = match.group(2)
    exercises_found += 1
    
    # Look up this exercise in MuscleWiki mapping
    lookup_name = key.replace("-", " ").lower()
    mw_data = name_to_urls.get(lookup_name)
    
    if not mw_data:
        # Try common aliases
        aliases = {
            "push-up": "push up",
            "pull-up": "pull up",
            "chin-up": "chin up",
            "t-bar-row": "t-bar row",
            "dumbbell-fly": "dumbbell fly",
            "cable-fly": "cable fly",
            "cable-crossover": "cable crossover",
            "chest-dip": "chest dip",
            "tricep-dip": "tricep dip",
            "bent-over-row": "bent over row",
            "barbell-row": "barbell row",
            "dumbbell-row": "dumbbell row",
            "seated-cable-row": "seated cable row",
            "cable-row": "cable row",
            "pendlay-row": "pendlay row",
            "overhead-press": "overhead press",
            "shoulder-press": "shoulder press",
            "military-press": "military press",
            "dumbbell-shoulder-press": "dumbbell shoulder press",
            "lateral-raise": "lateral raise",
            "side-lateral-raise": "side lateral raise",
            "front-raise": "front raise",
            "face-pull": "face pull",
            "rear-delt-fly": "rear delt fly",
            "arnold-press": "arnold press",
            "upright-row": "upright row",
            "bicep-curl": "bicep curl",
            "barbell-curl": "barbell curl",
            "dumbbell-curl": "dumbbell curl",
            "hammer-curl": "hammer curl",
            "preacher-curl": "preacher curl",
            "concentration-curl": "concentration curl",
            "tricep-pushdown": "tricep pushdown",
            "tricep-extension": "tricep extension",
            "overhead-tricep-extension": "overhead tricep extension",
            "skull-crusher": "skull crusher",
            "close-grip-bench-press": "close grip bench press",
            "back-squat": "back squat",
            "barbell-squat": "barbell squat",
            "front-squat": "front squat",
            "goblet-squat": "goblet squat",
            "bulgarian-split-squat": "bulgarian split squat",
            "walking-lunge": "walking lunge",
            "reverse-lunge": "reverse lunge",
            "leg-press": "leg press",
            "leg-curl": "leg curl",
            "hamstring-curl": "hamstring curl",
            "leg-extension": "leg extension",
            "romanian-deadlift": "romanian deadlift",
            "stiff-leg-deadlift": "stiff leg deadlift",
            "sumo-deadlift": "sumo deadlift",
            "hip-thrust": "hip thrust",
            "glute-bridge": "glute bridge",
            "calf-raise": "calf raise",
            "standing-calf-raise": "standing calf raise",
            "seated-calf-raise": "seated calf raise",
            "hack-squat": "hack squat",
            "step-up": "step up",
            "side-plank": "side plank",
            "sit-up": "sit up",
            "russian-twist": "russian twist",
            "mountain-climber": "mountain climber",
            "leg-raise": "leg raise",
            "hanging-leg-raise": "hanging leg raise",
            "ab-wheel-rollout": "ab wheel rollout",
            "bicycle-crunch": "bicycle crunch",
            "dead-bug": "dead bug",
            "cable-woodchop": "cable woodchop",
            "jumping-jack": "jumping jack",
            "box-jump": "box jump",
            "kettlebell-swing": "kettlebell swing",
            "battle-rope": "battle rope",
            "jump-rope": "jump rope",
            "high-knees": "high knees",
            "bench-press": "bench press",
            "incline-bench-press": "incline bench press",
            "incline-dumbbell-press": "incline dumbbell press",
            "decline-bench-press": "decline bench press",
        }
        alias = aliases.get(key)
        if alias:
            mw_data = name_to_urls.get(alias)
    
    if not mw_data:
        print(f"  SKIP: {key} (no MuscleWiki mapping)")
        continue
    
    # Parse existing angles
    angles = angle_pattern.findall(angles_block)
    if not angles:
        print(f"  SKIP: {key} (no angles found)")
        continue
    
    # Build new angleViews with MuscleWiki URLs
    # Keep only Front View and Side View (2 angles)
    front_url = mw_data["front"]
    side_url = mw_data["side"]
    
    new_angles = []
    front_focus = ""
    side_focus = ""
    
    for old_url, label, focus in angles:
        if "Front" in label:
            front_focus = focus
        elif "Side" in label:
            side_focus = focus
    
    # If no specific focus found, use first and second
    if not front_focus and len(angles) > 0:
        front_focus = angles[0][2]
    if not side_focus and len(angles) > 1:
        side_focus = angles[1][2]
    elif not side_focus:
        side_focus = front_focus
    
    # Build the new angles block
    new_block = f'{{ gifUrl: "{front_url}", label: "Front View", focus: "{front_focus}" }},\n      {{ gifUrl: "{side_url}", label: "Side View", focus: "{side_focus}" }}'
    
    # Replace the old angles block
    old_block = angles_block.strip()
    if old_block in content:
        content = content.replace(old_block, new_block, 1)
        exercises_updated += 1
    else:
        # Try replacing individual URLs within this exercise's block
        # Find the exact position and replace
        start = match.start()
        end = match.end()
        old_section = content[start:end]
        
        # Replace all ExerciseDB URLs in this section
        new_section = old_section
        for old_url, label, focus in angles:
            if "exercisedb" in old_url:
                if "Front" in label:
                    new_section = new_section.replace(old_url, front_url, 1)
                elif "Side" in label:
                    new_section = new_section.replace(old_url, side_url, 1)
                else:
                    new_section = new_section.replace(old_url, front_url, 1)
        
        if new_section != old_section:
            content = content[:start] + new_section + content[end:]
            exercises_updated += 1

print(f"\nExercises found: {exercises_found}")
print(f"Exercises updated: {exercises_updated}")

# Write updated file
with open("lib/exercise-data.ts", "w") as f:
    f.write(content)

print("Updated lib/exercise-data.ts")
