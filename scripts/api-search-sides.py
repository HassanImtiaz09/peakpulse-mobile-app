#!/usr/bin/env python3
"""
Use MuscleWiki API to search for exercises by name and get their side-view video URLs.
Then download and convert to GIF.
"""
import subprocess
import os
import time
import json
import urllib.request
import urllib.parse

API_KEY = "mw_3iyO6WlWCh"
GIF_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "assets", "exercise-gifs")

# Map failed stems to search terms
EXERCISES = {
    "male-Bands-band-overhead-tricep-extension-side": "overhead tricep extension",
    "male-Barbell-barbell-bent-over-row-side": "bent over row",
    "male-Barbell-barbell-reverse-lunge-side": "reverse lunge",
    "male-Bodyweight-floor-incline-leg-raise-side": "leg raise",
    "male-Cable-cable-rope-face-pulls-side": "face pull",
    "male-Dumbbells-dumbbell-leg-curl-side": "leg curl",
    "male-Dumbbells-dumbbell-pendlay-row-side": "pendlay row",
    "male-Plyometrics-box-jump-side": "box jump",
    "male-TRX-trx-ab-rollout-side": "ab rollout",
    "male-bodyweight-bulgarian-split-squat-side": "bulgarian split squat",
    "male-bodyweight-chin-ups-side": "chin up",
    "male-bodyweight-glute-bridge-side": "glute bridge",
    "male-bodyweight-pull-ups-side": "pull up",
    "male-bodyweight-push-up-side": "push up",
    "male-dumbbell-front-raise-side": "front raise",
    "male-dumbbell-hammer-curl-side": "hammer curl",
    "male-dumbbell-lateral-raise-side": "lateral raise",
    "male-dumbbell-rear-delt-fly-side": "rear delt fly",
    "male-dumbbell-row-bilateral-side": "dumbbell row",
    "male-machine-leg-press-side": "leg press",
}

def search_exercise(name):
    """Search MuscleWiki API for exercise and return side video URL."""
    try:
        url = f"https://api.musclewiki.com/exercises?name={urllib.parse.quote(name)}&limit=10"
        req = urllib.request.Request(url, headers={"x-api-key": API_KEY})
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read())
            if data and isinstance(data, list):
                for ex in data:
                    # Check for male side video
                    videos = ex.get("videos", {})
                    male_videos = videos.get("male", {})
                    side_url = male_videos.get("side", "")
                    if side_url and ".mp4" in side_url:
                        return side_url, ex.get("name", "")
    except Exception as e:
        print(f"  API error: {e}")
    return None, None

def download_and_convert(url, stem):
    """Download video and convert to GIF."""
    gif_path = os.path.join(GIF_DIR, f"{stem}.gif")
    tmp_mp4 = f"/tmp/side-{stem}.mp4"
    
    try:
        # Download with API key
        subprocess.run(
            ["curl", "-sL", "--connect-timeout", "15", "--max-time", "30",
             "-H", f"x-api-key: {API_KEY}",
             "-o", tmp_mp4, url],
            capture_output=True, text=True, timeout=45
        )
        
        if not os.path.exists(tmp_mp4) or os.path.getsize(tmp_mp4) < 5000:
            # Try without API key (media CDN)
            media_url = url.replace("api.musclewiki.com/stream/videos", "media.musclewiki.com/media/uploads/videos")
            subprocess.run(
                ["curl", "-sL", "--connect-timeout", "15", "--max-time", "30",
                 "-o", tmp_mp4, media_url],
                capture_output=True, text=True, timeout=45
            )
        
        if not os.path.exists(tmp_mp4) or os.path.getsize(tmp_mp4) < 5000:
            return False
        
        subprocess.run(
            ["ffmpeg", "-y", "-i", tmp_mp4,
             "-vf", "fps=10,scale=320:-1:flags=lanczos",
             "-loop", "0", gif_path],
            capture_output=True, text=True, timeout=60
        )
        
        if os.path.exists(tmp_mp4):
            os.remove(tmp_mp4)
        
        return os.path.exists(gif_path) and os.path.getsize(gif_path) > 1000
    except Exception as e:
        print(f"  Download error: {e}")
        if os.path.exists(tmp_mp4):
            os.remove(tmp_mp4)
        return False

success = 0
still_failed = []

for stem, search_term in EXERCISES.items():
    gif_path = os.path.join(GIF_DIR, f"{stem}.gif")
    if os.path.exists(gif_path) and os.path.getsize(gif_path) > 1000:
        print(f"SKIP: {stem}")
        success += 1
        continue
    
    print(f"Searching: '{search_term}' for {stem}")
    url, found_name = search_exercise(search_term)
    
    if url:
        print(f"  Found: {found_name} → {url}")
        if download_and_convert(url, stem):
            size_kb = os.path.getsize(gif_path) / 1024
            print(f"  OK: {size_kb:.0f}KB")
            success += 1
        else:
            still_failed.append(stem)
            print(f"  FAILED: download/convert error")
    else:
        still_failed.append(stem)
        print(f"  NOT FOUND in API")
    
    time.sleep(0.5)

print(f"\n=== Summary ===")
print(f"Success: {success}")
print(f"Still failed: {len(still_failed)}")
if still_failed:
    for f in still_failed:
        print(f"  - {f}")
