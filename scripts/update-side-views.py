#!/usr/bin/env python3
"""Update exercise-data.ts side-view URLs with newly generated images."""

import re

# Mapping: exercise name substring → new side-view CDN URL
SIDE_VIEW_URLS = {
    "Bench Press": {
        "exact": ["Bench Press"],  # Only the plain "Bench Press", not incline/decline/close grip
        "url": "https://d2xsxph8kpxj0f.cloudfront.net/310519663430072618/TCxddYfhYS3he4wae2YPUE/side-barbell-bench-press-7VJGMpqMVBNhKxPbTUMnM5.png"
    },
    "Squat": {
        "exact": ["Squat"],  # Plain "Squat" only
        "url": "https://d2xsxph8kpxj0f.cloudfront.net/310519663430072618/TCxddYfhYS3he4wae2YPUE/side-barbell-squat-7VJGMpqMVBNhKxPbTUMnM5.png"
    },
    "Deadlift": {
        "exact": ["Deadlift"],  # Plain "Deadlift" only
        "url": "https://d2xsxph8kpxj0f.cloudfront.net/310519663430072618/TCxddYfhYS3he4wae2YPUE/side-barbell-deadlift-7VJGMpqMVBNhKxPbTUMnM5.png"
    },
    "Overhead Press": {
        "exact": ["Overhead Press"],  # Barbell overhead press
        "url": "https://d2xsxph8kpxj0f.cloudfront.net/310519663430072618/TCxddYfhYS3he4wae2YPUE/side-barbell-overhead-press-7VJGMpqMVBNhKxPbTUMnM5.png"
    },
    "Bent Over Row": {
        "exact": ["Bent Over Row"],
        "url": "https://d2xsxph8kpxj0f.cloudfront.net/310519663430072618/TCxddYfhYS3he4wae2YPUE/side-barbell-bent-over-row-7VJGMpqMVBNhKxPbTUMnM5.png"
    },
    "Romanian Deadlift": {
        "exact": ["Romanian Deadlift"],
        "url": "https://d2xsxph8kpxj0f.cloudfront.net/310519663430072618/TCxddYfhYS3he4wae2YPUE/side-barbell-romanian-deadlift-PdaKckR5iPBEtgPTBftRay.png"
    },
    "Hip Thrust": {
        "exact": ["Hip Thrust"],
        "url": "https://d2xsxph8kpxj0f.cloudfront.net/310519663430072618/TCxddYfhYS3he4wae2YPUE/side-barbell-hip-thrust-Std9bPpLJW6wjXH72ph8J6.png"
    },
    "Bicep Curl": {
        "exact": ["Bicep Curl"],
        "url": "https://d2xsxph8kpxj0f.cloudfront.net/310519663430072618/TCxddYfhYS3he4wae2YPUE/side-dumbbell-curl-gUeeCiuExpiLbuzwvS7vjo.png"
    },
    "Lateral Raise": {
        "exact": ["Lateral Raise"],
        "url": "https://d2xsxph8kpxj0f.cloudfront.net/310519663430072618/TCxddYfhYS3he4wae2YPUE/side-dumbbell-lateral-raise-dURoxRuLhNqxcAPa9juqnj.png"
    },
    "Pull-Up": {
        "exact": ["Pull-Up"],
        "url": "https://d2xsxph8kpxj0f.cloudfront.net/310519663430072618/TCxddYfhYS3he4wae2YPUE/side-bodyweight-pull-ups-8WS7ED3gLnJYx6tPSR6b56.png"
    },
    "Push-Up": {
        "exact": ["Push-Up"],
        "url": "https://d2xsxph8kpxj0f.cloudfront.net/310519663430072618/TCxddYfhYS3he4wae2YPUE/side-bodyweight-push-up-9agjrdHsJ7fNa3UcgJ5iz8.png"
    },
    "Leg Press": {
        "exact": ["Leg Press"],
        "url": "https://d2xsxph8kpxj0f.cloudfront.net/310519663430072618/TCxddYfhYS3he4wae2YPUE/side-machine-leg-press-NZfsSzg4b3SSiKvPWweit7.png"
    },
    "Front Squat": {
        "exact": ["Front Squat"],
        "url": "https://d2xsxph8kpxj0f.cloudfront.net/310519663430072618/TCxddYfhYS3he4wae2YPUE/side-barbell-front-squat-VKRiEPoa9RCEsnZrCB7PzX.png"
    },
    "Incline Bench Press": {
        "exact": ["Incline Bench Press"],
        "url": "https://d2xsxph8kpxj0f.cloudfront.net/310519663430072618/TCxddYfhYS3he4wae2YPUE/side-dumbbell-incline-bench-press-D93Vg9axNmgjjk3xpsQghq.png"
    },
    "Lat Pulldown": {
        "exact": ["Lat Pulldown"],
        "url": "https://d2xsxph8kpxj0f.cloudfront.net/310519663430072618/TCxddYfhYS3he4wae2YPUE/side-machine-pulldown-nL2vzyh6GyCwgAMJ46MyyG.png"
    },
}

with open("lib/exercise-data.ts", "r") as f:
    content = f.read()

# For each exercise, find the block and replace the Side View URL
replacements = 0
for exercise_key, info in SIDE_VIEW_URLS.items():
    for exact_name in info["exact"]:
        # Find the exercise block by name
        # Pattern: name: "Exact Name" ... angleViews: [ ... { gifUrl: "...", label: "Side View" ... } ]
        # We need to find the Side View entry within the angleViews of this specific exercise
        
        # Find all occurrences of this exercise name
        pattern = rf'(name:\s*"{re.escape(exact_name)}".*?label:\s*"Side View",\s*focus:\s*"[^"]*"\s*\}})'
        matches = list(re.finditer(pattern, content, re.DOTALL))
        
        for match in matches:
            block = match.group(1)
            # Find the gifUrl in the Side View entry
            side_url_pattern = r'(label:\s*"Side View")'
            # Actually, we need to find the gifUrl BEFORE the "Side View" label within this block
            # The structure is: { gifUrl: "URL", label: "Side View", focus: "..." }
            # Let's find the last gifUrl before "Side View" in this block
            
            # Find the Side View entry's gifUrl
            side_entry_pattern = rf'(\{{\s*gifUrl:\s*")([^"]+)(",\s*label:\s*"Side View")'
            side_matches = list(re.finditer(side_entry_pattern, block))
            if side_matches:
                for sm in side_matches:
                    old_url = sm.group(2)
                    new_url = info["url"]
                    if old_url != new_url:
                        content = content.replace(
                            sm.group(1) + old_url + sm.group(3),
                            sm.group(1) + new_url + sm.group(3),
                            1  # Replace only first occurrence
                        )
                        replacements += 1
                        print(f"Updated: {exact_name} side view")

print(f"\nTotal replacements: {replacements}")

with open("lib/exercise-data.ts", "w") as f:
    f.write(content)
