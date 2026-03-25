#!/usr/bin/env python3
"""Fetch video URLs for the 12 remaining exercises from MuscleWiki API"""
import requests
import subprocess
import os
import time

API_KEY = "mw_3iyO6po09klnJ32xUqmf7BLsY2X4cy1fRO9kqpi9LlU"
HEADERS = {"x-api-key": API_KEY}
BASE = "https://api.musclewiki.com"
OUTDIR = "/home/ubuntu/peakpulse-mobile/assets/exercise-gifs"
TMPDIR = "/tmp/exercise-videos"
os.makedirs(OUTDIR, exist_ok=True)
os.makedirs(TMPDIR, exist_ok=True)

# Map: original filename -> search terms to find on MuscleWiki
MISSING = {
    "male-Barbell-barbell-bent-over-row-front": ["Barbell Bent Over Row", "Barbell Row"],
    "male-Bodyweight-burpee-front": ["Burpee", "Burpees"],
    "male-Bodyweight-elbow-side-plank-front": ["Side Plank", "Elbow Side Plank"],
    "male-Bodyweight-floor-incline-leg-raise-front": ["Leg Raise", "Lying Leg Raise", "Floor Leg Raise"],
    "male-Bodyweight-walking-lunge-front": ["Walking Lunge", "Walking Lunges"],
    "male-Cable-cable-rope-face-pulls-front": ["Face Pull", "Cable Face Pull", "Rope Face Pull"],
    "male-Dumbbells-dumbbell-leg-curl-front": ["Leg Curl", "Lying Leg Curl", "Dumbbell Leg Curl"],
    "male-Dumbbells-dumbbell-pendlay-row-front": ["Pendlay Row", "Barbell Pendlay Row"],
    "male-TRX-trx-ab-rollout-front": ["Ab Rollout", "Ab Wheel", "Ab Wheel Rollout"],
    "male-bodyweight-bench-dips-front": ["Bench Dip", "Bench Dips", "Tricep Dip"],
    "male-bodyweight-chin-ups-front": ["Chin Up", "Chin-Up", "Chinup"],
    "male-bodyweight-pull-ups-front": ["Pull Up", "Pull-Up", "Pullup"],
}

def search_exercise(terms):
    """Search MuscleWiki for an exercise by name terms"""
    for term in terms:
        try:
            resp = requests.get(f"{BASE}/exercises", 
                              headers=HEADERS, 
                              params={"name": term, "limit": 10},
                              timeout=15)
            if resp.status_code == 200:
                data = resp.json()
                for r in data.get("results", []):
                    if any(t.lower() in r["name"].lower() for t in terms):
                        return r["id"], r["name"]
        except Exception as e:
            print(f"  Search error for '{term}': {e}")
        time.sleep(0.5)
    return None, None

def get_exercise_video(exercise_id):
    """Get the front-view male video URL for an exercise"""
    try:
        resp = requests.get(f"{BASE}/exercises/{exercise_id}", 
                          headers=HEADERS, timeout=15)
        if resp.status_code == 200:
            data = resp.json()
            for v in data.get("videos", []):
                if v.get("gender") == "male" and v.get("angle") == "front":
                    return v["url"]
    except Exception as e:
        print(f"  Video fetch error: {e}")
    return None

def download_and_convert(url, output_filename):
    """Download MP4 and convert to GIF"""
    gif_path = os.path.join(OUTDIR, f"{output_filename}.gif")
    if os.path.exists(gif_path) and os.path.getsize(gif_path) > 0:
        print(f"  SKIP (exists): {output_filename}")
        return True
    
    mp4_path = os.path.join(TMPDIR, f"{output_filename}.mp4")
    
    # Download with API key
    try:
        resp = requests.get(url, headers=HEADERS, timeout=60, stream=True)
        if resp.status_code == 200:
            with open(mp4_path, 'wb') as f:
                for chunk in resp.iter_content(chunk_size=8192):
                    f.write(chunk)
            print(f"  Downloaded: {os.path.getsize(mp4_path)} bytes")
        else:
            print(f"  Download failed: HTTP {resp.status_code}")
            return False
    except Exception as e:
        print(f"  Download error: {e}")
        return False
    
    # Convert to GIF
    cmd = [
        "ffmpeg", "-y", "-i", mp4_path,
        "-vf", "fps=10,scale=180:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=48:stats_mode=diff[p];[s1][p]paletteuse=dither=bayer:bayer_scale=3",
        "-loop", "0", gif_path
    ]
    result = subprocess.run(cmd, capture_output=True, timeout=60)
    
    if os.path.exists(gif_path) and os.path.getsize(gif_path) > 0:
        size_kb = os.path.getsize(gif_path) // 1024
        print(f"  Converted: {size_kb}KB")
        os.remove(mp4_path)
        return True
    else:
        print(f"  Conversion failed")
        return False

print("=== Fetching remaining 12 exercises from MuscleWiki API ===\n")

converted = 0
failed = 0

for filename, terms in MISSING.items():
    gif_path = os.path.join(OUTDIR, f"{filename}.gif")
    if os.path.exists(gif_path) and os.path.getsize(gif_path) > 0:
        print(f"SKIP: {filename}")
        converted += 1
        continue
    
    print(f"\n--- {filename} ---")
    print(f"  Searching: {terms}")
    
    ex_id, ex_name = search_exercise(terms)
    if ex_id:
        print(f"  Found: ID={ex_id} Name={ex_name}")
        video_url = get_exercise_video(ex_id)
        if video_url:
            print(f"  Video: {video_url}")
            if download_and_convert(video_url, filename):
                converted += 1
                continue
    
    print(f"  FAILED - no video found")
    failed += 1

print(f"\n=== RESULTS ===")
print(f"Converted: {converted}")
print(f"Failed: {failed}")
total = len([f for f in os.listdir(OUTDIR) if f.endswith('.gif')])
print(f"Total GIFs: {total}")
