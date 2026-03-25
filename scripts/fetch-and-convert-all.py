#!/usr/bin/env python3
"""
Step 1: Query MuscleWiki API for each exercise to get CORRECT video URLs.
Step 2: Download each video and convert to compact GIF.
Outputs a JSON mapping file for updating exercise-demos.ts.
"""
import subprocess
import os
import re
import json
import time
import urllib.request
import urllib.error

API_KEY = "mw_3iyO6po09klnJ32xUqmf7BLsY2X4cy1fRO9kqpi9LlU"
OUTPUT_DIR = "/home/ubuntu/peakpulse-mobile/assets/exercise-gifs"
TEMP_DIR = "/tmp/exercise-videos"
MAPPING_FILE = "/tmp/exercise-gif-mapping.json"

os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(TEMP_DIR, exist_ok=True)

# All exercises we need GIFs for (exercise key → search terms)
EXERCISES = {
    "bench-press": "bench press",
    "push-up": "push up",
    "dumbbell-fly": "dumbbell chest fly",
    "incline-bench-press": "incline bench press",
    "incline-dumbbell-press": "incline dumbbell press",
    "decline-bench-press": "decline bench press",
    "cable-fly": "cable pec fly",
    "dip": "weighted dip",
    "pull-up": "pull ups",
    "chin-up": "chin ups",
    "lat-pulldown": "pulldown",
    "bent-over-row": "bent over row",
    "dumbbell-row": "dumbbell row",
    "seated-cable-row": "seated cable row",
    "deadlift": "barbell deadlift",
    "t-bar-row": "t bar row",
    "pendlay-row": "pendlay row",
    "overhead-press": "barbell overhead press",
    "shoulder-press": "dumbbell overhead press",
    "lateral-raise": "lateral raise",
    "front-raise": "front raise",
    "face-pull": "face pulls",
    "rear-delt-fly": "rear delt fly",
    "arnold-press": "arnold press",
    "upright-row": "upright row",
    "shrug": "dumbbell shrug",
    "bicep-curl": "dumbbell curl",
    "barbell-curl": "barbell curl",
    "hammer-curl": "hammer curl",
    "preacher-curl": "preacher curl",
    "concentration-curl": "concentration curl",
    "tricep-pushdown": "tricep pushdown",
    "tricep-extension": "tricep extension",
    "overhead-tricep-extension": "overhead tricep extension",
    "tricep-dip": "dip",
    "skull-crusher": "skull crusher",
    "close-grip-bench-press": "close grip bench press",
    "squat": "barbell squat",
    "front-squat": "front squat",
    "goblet-squat": "goblet squat",
    "bulgarian-split-squat": "bulgarian split squat",
    "lunge": "forward lunge",
    "walking-lunge": "walking lunge",
    "reverse-lunge": "reverse lunge",
    "leg-press": "leg press",
    "leg-curl": "leg curl",
    "leg-extension": "leg extension",
    "romanian-deadlift": "romanian deadlift",
    "stiff-leg-deadlift": "stiff leg deadlift",
    "sumo-deadlift": "sumo deadlift",
    "hip-thrust": "hip thrust",
    "glute-bridge": "glute bridge",
    "calf-raise": "standing calf raise",
    "seated-calf-raise": "seated calf raise",
    "hack-squat": "hack squat",
    "step-up": "step up",
    "plank": "forearm plank",
    "side-plank": "side plank",
    "crunch": "crunch",
    "sit-up": "situp",
    "russian-twist": "russian twist",
    "mountain-climber": "mountain climber",
    "leg-raise": "leg raise",
    "hanging-leg-raise": "hanging knee raise",
    "ab-wheel-rollout": "ab rollout",
    "bicycle-crunch": "bicycle crunch",
    "dead-bug": "dead bug",
    "cable-woodchop": "woodchopper",
    "burpee": "burpee",
    "jumping-jack": "jumping jacks",
    "box-jump": "box jump",
    "kettlebell-swing": "kettlebell swing",
    "jump-rope": "jump rope",
    "sprint": "treadmill sprint",
}

def api_search(query):
    """Search MuscleWiki API for an exercise."""
    url = f"https://api.musclewiki.com/search?q={urllib.parse.quote(query)}"
    req = urllib.request.Request(url, headers={"X-API-Key": API_KEY})
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return json.loads(resp.read())
    except Exception as e:
        print(f"  API error: {e}")
        return []

def get_video_url(exercise_data, angle="front", gender="male"):
    """Extract video URL from exercise data."""
    for v in exercise_data.get("videos", []):
        if v.get("angle") == angle and v.get("gender") == gender:
            return v["url"]
    return None

def download_and_convert(url, gif_path):
    """Download MP4 and convert to compact GIF."""
    mp4_path = gif_path.replace(".gif", ".mp4")
    
    # Download
    result = subprocess.run(
        ["curl", "-s", "-o", mp4_path, "-L", "--max-time", "30", url],
        capture_output=True, text=True
    )
    
    if not os.path.exists(mp4_path) or os.path.getsize(mp4_path) < 1000:
        return False
    
    # Convert to GIF
    try:
        subprocess.run(
            ["ffmpeg", "-y", "-i", mp4_path,
             "-vf", "fps=10,scale=200:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=48[p];[s1][p]paletteuse=dither=bayer:bayer_scale=3",
             "-loop", "0", gif_path],
            capture_output=True, text=True, timeout=60
        )
    except subprocess.TimeoutExpired:
        if os.path.exists(mp4_path):
            os.remove(mp4_path)
        return False
    
    # Clean up MP4
    if os.path.exists(mp4_path):
        os.remove(mp4_path)
    
    return os.path.exists(gif_path) and os.path.getsize(gif_path) > 1000

import urllib.parse

mapping = {}
success = 0
failed = 0
skipped = 0

for i, (key, search_term) in enumerate(EXERCISES.items()):
    gif_path = os.path.join(OUTPUT_DIR, f"{key}.gif")
    
    # Skip if already exists
    if os.path.exists(gif_path) and os.path.getsize(gif_path) > 5000:
        skipped += 1
        mapping[key] = gif_path
        print(f"[{i+1}/{len(EXERCISES)}] SKIP {key} (exists)")
        continue
    
    print(f"[{i+1}/{len(EXERCISES)}] {key} (searching: '{search_term}')")
    
    # Search API
    results = api_search(search_term)
    time.sleep(0.3)  # Rate limit
    
    if not results:
        print(f"  No results found")
        failed += 1
        continue
    
    # Get first result's front video URL
    exercise = results[0]
    video_url = get_video_url(exercise, "front", "male")
    
    if not video_url:
        print(f"  No front video for: {exercise['name']}")
        failed += 1
        continue
    
    print(f"  Found: {exercise['name']} → {video_url.split('/')[-1]}")
    
    # Download and convert
    if download_and_convert(video_url, gif_path):
        size_kb = os.path.getsize(gif_path) / 1024
        print(f"  OK ({size_kb:.0f}KB)")
        mapping[key] = gif_path
        success += 1
    else:
        print(f"  FAILED to download/convert")
        failed += 1
    
    time.sleep(0.3)  # Rate limit

# Save mapping
with open(MAPPING_FILE, "w") as f:
    json.dump(mapping, f, indent=2)

print(f"\n=== SUMMARY ===")
print(f"Success: {success}")
print(f"Skipped: {skipped}")
print(f"Failed:  {failed}")
print(f"Total GIFs: {success + skipped}")

total_size = sum(os.path.getsize(os.path.join(OUTPUT_DIR, f)) for f in os.listdir(OUTPUT_DIR) if f.endswith(".gif"))
print(f"Total GIF size: {total_size / 1024 / 1024:.1f}MB")
print(f"Mapping saved to: {MAPPING_FILE}")
