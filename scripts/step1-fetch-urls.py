#!/usr/bin/env python3
"""
Step 1: Query MuscleWiki API for each exercise to get correct video URLs.
Saves results to /tmp/musclewiki-urls.json for Step 2 to download.
Uses 2-second delay between API calls to avoid rate limiting.
"""
import json
import time
import urllib.request
import urllib.parse
import os

API_KEY = "mw_3iyO6po09klnJ32xUqmf7BLsY2X4cy1fRO9kqpi9LlU"
OUTPUT_FILE = "/tmp/musclewiki-urls.json"

# Exercise key → search query
EXERCISES = {
    "bench-press": "barbell bench press",
    "push-up": "push up",
    "dumbbell-fly": "dumbbell chest fly",
    "incline-bench-press": "barbell incline bench press",
    "incline-dumbbell-press": "dumbbell incline bench press",
    "decline-bench-press": "barbell decline bench press",
    "cable-fly": "cable pec fly",
    "dip": "weighted dip",
    "pull-up": "pull ups",
    "chin-up": "chin ups",
    "lat-pulldown": "machine pulldown",
    "bent-over-row": "barbell bent over row",
    "dumbbell-row": "dumbbell row",
    "seated-cable-row": "seated cable row",
    "deadlift": "barbell deadlift",
    "t-bar-row": "t bar row",
    "pendlay-row": "dumbbell pendlay row",
    "overhead-press": "barbell overhead press",
    "shoulder-press": "dumbbell overhead press",
    "lateral-raise": "dumbbell lateral raise",
    "front-raise": "dumbbell front raise",
    "face-pull": "cable rope face pulls",
    "rear-delt-fly": "dumbbell rear delt fly",
    "arnold-press": "dumbbell arnold press",
    "upright-row": "barbell upright row",
    "shrug": "dumbbell shrug",
    "bicep-curl": "dumbbell curl",
    "barbell-curl": "barbell curl",
    "hammer-curl": "dumbbell hammer curl",
    "preacher-curl": "dumbbell preacher curl",
    "concentration-curl": "dumbbell concentration curl",
    "tricep-pushdown": "cable tricep pushdown",
    "tricep-extension": "bodyweight tricep extension",
    "overhead-tricep-extension": "band overhead tricep extension",
    "tricep-dip": "dip",
    "skull-crusher": "barbell skull crusher",
    "close-grip-bench-press": "barbell close grip bench press",
    "squat": "barbell squat",
    "front-squat": "barbell front squat",
    "goblet-squat": "dumbbell goblet squat",
    "bulgarian-split-squat": "dumbbell bulgarian split squat",
    "lunge": "dumbbell forward lunge",
    "walking-lunge": "bodyweight walking lunge",
    "reverse-lunge": "barbell reverse lunge",
    "leg-press": "machine leg press",
    "leg-curl": "dumbbell leg curl",
    "leg-extension": "machine leg extension",
    "romanian-deadlift": "barbell romanian deadlift",
    "stiff-leg-deadlift": "barbell stiff leg deadlift",
    "sumo-deadlift": "barbell sumo deadlift",
    "hip-thrust": "barbell hip thrust",
    "glute-bridge": "barbell glute bridge",
    "calf-raise": "machine standing calf raise",
    "seated-calf-raise": "machine seated calf raise",
    "hack-squat": "machine hack squat",
    "step-up": "dumbbell step up",
    "plank": "bodyweight forearm plank",
    "side-plank": "bodyweight elbow side plank",
    "crunch": "bodyweight crunch",
    "sit-up": "bodyweight situp",
    "russian-twist": "bodyweight russian twist",
    "mountain-climber": "bodyweight mountain climber",
    "leg-raise": "bodyweight floor incline leg raise",
    "hanging-leg-raise": "bodyweight hanging knee raise",
    "ab-wheel-rollout": "ab rollout",
    "bicycle-crunch": "bodyweight bicycle crunch",
    "dead-bug": "bodyweight dead bug",
    "cable-woodchop": "cable woodchopper",
    "burpee": "bodyweight burpee",
    "jumping-jack": "cardio jumping jacks",
    "box-jump": "bodyweight box jump",
    "kettlebell-swing": "kettlebell swing",
    "jump-rope": "cardio jump rope",
    "sprint": "cardio treadmill sprint",
}

def api_search(query, retries=3):
    """Search MuscleWiki API with retry logic."""
    url = f"https://api.musclewiki.com/search?q={urllib.parse.quote(query)}"
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={"X-API-Key": API_KEY})
            with urllib.request.urlopen(req, timeout=15) as resp:
                return json.loads(resp.read())
        except Exception as e:
            if attempt < retries - 1:
                wait = (attempt + 1) * 3
                print(f"  Retry in {wait}s... ({e})")
                time.sleep(wait)
            else:
                print(f"  FAILED after {retries} attempts: {e}")
                return []
    return []

# Load existing results to resume
results = {}
if os.path.exists(OUTPUT_FILE):
    with open(OUTPUT_FILE) as f:
        results = json.load(f)
    print(f"Loaded {len(results)} existing results")

total = len(EXERCISES)
for i, (key, query) in enumerate(EXERCISES.items()):
    if key in results and results[key].get("front_url"):
        print(f"[{i+1}/{total}] SKIP {key} (already found)")
        continue
    
    print(f"[{i+1}/{total}] {key} → '{query}'")
    
    data = api_search(query)
    time.sleep(2)  # 2s delay between calls
    
    if not data:
        results[key] = {"name": query, "front_url": None, "side_url": None, "error": "no results"}
        continue
    
    ex = data[0]
    front_url = None
    side_url = None
    for v in ex.get("videos", []):
        if v.get("gender") == "male":
            if v.get("angle") == "front":
                front_url = v["url"]
            elif v.get("angle") == "side":
                side_url = v["url"]
    
    results[key] = {
        "mw_id": ex["id"],
        "mw_name": ex["name"],
        "front_url": front_url,
        "side_url": side_url,
    }
    
    print(f"  → {ex['name']} (ID: {ex['id']})")
    if front_url:
        print(f"    front: {front_url.split('/')[-1]}")
    if side_url:
        print(f"    side:  {side_url.split('/')[-1]}")
    
    # Save after each result
    with open(OUTPUT_FILE, "w") as f:
        json.dump(results, f, indent=2)

# Summary
found = sum(1 for r in results.values() if r.get("front_url"))
missing = sum(1 for r in results.values() if not r.get("front_url"))
print(f"\n=== SUMMARY ===")
print(f"Found: {found}/{total}")
print(f"Missing: {missing}")
if missing:
    for k, v in results.items():
        if not v.get("front_url"):
            print(f"  - {k}: {v.get('error', 'unknown')}")
print(f"Results saved to: {OUTPUT_FILE}")
