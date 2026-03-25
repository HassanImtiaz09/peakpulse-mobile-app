#!/usr/bin/env python3
"""Fetch videos for the 12 remaining exercises using their MuscleWiki IDs"""
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

# Map: output filename -> MuscleWiki exercise ID
EXERCISES = {
    "male-Barbell-barbell-bent-over-row-front": 48,      # Barbell Bent Over Row
    "male-Bodyweight-burpee-front": 475,                  # Burpee
    "male-Bodyweight-elbow-side-plank-front": 325,        # Elbow Side Plank
    "male-Bodyweight-floor-incline-leg-raise-front": 1410, # Floor Incline Leg Raise
    "male-Bodyweight-walking-lunge-front": 1384,          # Walking Lunge
    "male-Cable-cable-rope-face-pulls-front": 22,         # Cable Rope Face Pulls
    "male-Dumbbells-dumbbell-leg-curl-front": 436,        # Dumbbell Leg Curl
    "male-Dumbbells-dumbbell-pendlay-row-front": 445,     # Dumbbell Pendlay Row
    "male-TRX-trx-ab-rollout-front": 585,                # TRX Ab Rollout
    "male-bodyweight-bench-dips-front": 18,               # Bench Dips
    "male-bodyweight-chin-ups-front": 184,                # Chin Ups
    "male-bodyweight-pull-ups-front": 25,                 # Pull Ups
}

def get_video_url(exercise_id):
    """Get the front-view male video URL"""
    try:
        resp = requests.get(f"{BASE}/exercises/{exercise_id}", 
                          headers=HEADERS, timeout=15)
        if resp.status_code == 200:
            data = resp.json()
            for v in data.get("videos", []):
                if v.get("gender") == "male" and v.get("angle") == "front":
                    return v["url"]
            # If no front view, take any male video
            for v in data.get("videos", []):
                if v.get("gender") == "male":
                    return v["url"]
    except Exception as e:
        print(f"  API error: {e}")
    return None

def download_and_convert(url, output_filename):
    """Download MP4 and convert to GIF"""
    gif_path = os.path.join(OUTDIR, f"{output_filename}.gif")
    if os.path.exists(gif_path) and os.path.getsize(gif_path) > 0:
        print(f"  SKIP (exists)")
        return True
    
    mp4_path = os.path.join(TMPDIR, f"{output_filename}.mp4")
    
    try:
        resp = requests.get(url, headers=HEADERS, timeout=60, stream=True)
        if resp.status_code == 200:
            with open(mp4_path, 'wb') as f:
                for chunk in resp.iter_content(chunk_size=8192):
                    f.write(chunk)
            size = os.path.getsize(mp4_path)
            if size < 1000:
                print(f"  Download too small: {size} bytes")
                os.remove(mp4_path)
                return False
            print(f"  Downloaded: {size // 1024}KB")
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
        print(f"  Converted: {size_kb}KB GIF")
        os.remove(mp4_path)
        return True
    else:
        print(f"  Conversion failed")
        if os.path.exists(mp4_path):
            os.remove(mp4_path)
        return False

print("=== Fetching final 12 exercises ===\n")

converted = 0
failed = 0
failed_list = []

for filename, ex_id in EXERCISES.items():
    gif_path = os.path.join(OUTDIR, f"{filename}.gif")
    if os.path.exists(gif_path) and os.path.getsize(gif_path) > 0:
        print(f"SKIP: {filename}")
        converted += 1
        continue
    
    print(f"\n{filename} (ID={ex_id})")
    url = get_video_url(ex_id)
    if url:
        print(f"  Video URL: {url}")
        if download_and_convert(url, filename):
            converted += 1
        else:
            failed += 1
            failed_list.append(filename)
    else:
        print(f"  No video URL found!")
        failed += 1
        failed_list.append(filename)
    
    time.sleep(1)

print(f"\n=== RESULTS ===")
print(f"Converted: {converted}")
print(f"Failed: {failed}")
if failed_list:
    print(f"Failed: {', '.join(failed_list)}")
total = len([f for f in os.listdir(OUTDIR) if f.endswith('.gif')])
print(f"Total GIFs: {total}")
