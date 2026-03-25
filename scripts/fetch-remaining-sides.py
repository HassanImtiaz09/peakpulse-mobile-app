#!/usr/bin/env python3
"""
Fetch remaining 23 side-view exercises using MuscleWiki API exercise search.
For exercises that can't be found, try alternate URL patterns.
"""
import subprocess
import os
import time
import json
import urllib.request
import urllib.error

API_KEY = "mw_3iyO6WlWCh"
GIF_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "assets", "exercise-gifs")

FAILED = [
    "male-Bands-band-overhead-tricep-extension-side",
    "male-Barbell-barbell-bent-over-row-side",
    "male-Barbell-barbell-reverse-lunge-side",
    "male-Bodyweight-burpee-side",
    "male-Bodyweight-elbow-side-plank-side",
    "male-Bodyweight-floor-incline-leg-raise-side",
    "male-Bodyweight-mountain-climber-side",
    "male-Cable-cable-rope-face-pulls-side",
    "male-Dumbbells-dumbbell-leg-curl-side",
    "male-Dumbbells-dumbbell-pendlay-row-side",
    "male-Plyometrics-box-jump-side",
    "male-TRX-trx-ab-rollout-side",
    "male-bodyweight-bulgarian-split-squat-side",
    "male-bodyweight-chin-ups-side",
    "male-bodyweight-glute-bridge-side",
    "male-bodyweight-pull-ups-side",
    "male-bodyweight-push-up-side",
    "male-dumbbell-front-raise-side",
    "male-dumbbell-hammer-curl-side",
    "male-dumbbell-lateral-raise-side",
    "male-dumbbell-rear-delt-fly-side",
    "male-dumbbell-row-bilateral-side",
    "male-machine-leg-press-side",
]

def extract_exercise_name(stem):
    """Extract human-readable exercise name from stem."""
    # Remove male- prefix and equipment prefix
    parts = stem.replace("male-", "").split("-")
    # Remove common equipment prefixes
    equip = ["barbell", "bodyweight", "dumbbell", "dumbbells", "cable", "machine", 
             "bands", "band", "kettlebells", "kettlebell", "plyometrics", "trx", "cardio"]
    words = []
    skip_next = False
    for p in parts:
        if p.lower() in equip and not words:
            continue
        if p == "side":
            continue
        words.append(p)
    return " ".join(words)

def try_api_search(name):
    """Search MuscleWiki API for exercise and get side video URL."""
    try:
        search_name = name.replace("-", " ").replace("_", " ")
        url = f"https://api.musclewiki.com/exercises?name={urllib.parse.quote(search_name)}&limit=5"
        req = urllib.request.Request(url, headers={"x-api-key": API_KEY})
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read())
            if data and isinstance(data, list):
                for ex in data:
                    videos = ex.get("videos", {})
                    side_url = videos.get("male", {}).get("side", "")
                    if side_url:
                        return side_url
    except Exception as e:
        pass
    return None

def try_alternate_urls(stem):
    """Try alternate URL patterns for the side-view video."""
    base = "https://media.musclewiki.com/media/uploads/videos/branded"
    
    # Try various patterns
    patterns = [
        f"{base}/{stem}.mp4",
        f"{base}/{stem.lower()}.mp4",
        # Try with different casing
        f"{base}/{stem.replace('Bodyweight', 'bodyweight').replace('Barbell', 'barbell').replace('Dumbbells', 'dumbbells').replace('Cable', 'cable').replace('Machine', 'machine').replace('Bands', 'bands').replace('Plyometrics', 'plyometrics').replace('TRX', 'trx')}.mp4",
    ]
    
    for url in patterns:
        try:
            result = subprocess.run(
                ["curl", "-sL", "--connect-timeout", "10", "--max-time", "20",
                 "-o", "/tmp/test-side.mp4", "-w", "%{http_code}", url],
                capture_output=True, text=True, timeout=30
            )
            code = result.stdout.strip()
            if code == "200" and os.path.exists("/tmp/test-side.mp4") and os.path.getsize("/tmp/test-side.mp4") > 5000:
                return url
        except:
            pass
    return None

import urllib.parse

success = 0
still_failed = []

for stem in FAILED:
    gif_path = os.path.join(GIF_DIR, f"{stem}.gif")
    if os.path.exists(gif_path) and os.path.getsize(gif_path) > 1000:
        print(f"SKIP (exists): {stem}")
        success += 1
        continue
    
    print(f"Trying: {stem}")
    
    # Try API search first
    name = extract_exercise_name(stem)
    api_url = try_api_search(name)
    
    download_url = None
    if api_url:
        download_url = api_url
        print(f"  Found via API: {api_url}")
    else:
        # Try alternate URL patterns
        alt_url = try_alternate_urls(stem)
        if alt_url:
            download_url = alt_url
            print(f"  Found via alternate URL: {alt_url}")
    
    if download_url:
        tmp_mp4 = f"/tmp/side-{stem}.mp4"
        try:
            subprocess.run(
                ["curl", "-sL", "--connect-timeout", "15", "--max-time", "30",
                 "-H", f"x-api-key: {API_KEY}",
                 "-o", tmp_mp4, download_url],
                capture_output=True, text=True, timeout=45
            )
            
            if os.path.exists(tmp_mp4) and os.path.getsize(tmp_mp4) > 5000:
                subprocess.run(
                    ["ffmpeg", "-y", "-i", tmp_mp4,
                     "-vf", "fps=10,scale=320:-1:flags=lanczos",
                     "-loop", "0", gif_path],
                    capture_output=True, text=True, timeout=60
                )
                
                if os.path.exists(gif_path) and os.path.getsize(gif_path) > 1000:
                    size_kb = os.path.getsize(gif_path) / 1024
                    print(f"  OK: {size_kb:.0f}KB")
                    success += 1
                else:
                    still_failed.append(stem)
                    print(f"  FAILED: conversion error")
            else:
                still_failed.append(stem)
                print(f"  FAILED: download too small")
            
            if os.path.exists(tmp_mp4):
                os.remove(tmp_mp4)
        except Exception as e:
            still_failed.append(stem)
            print(f"  ERROR: {e}")
    else:
        still_failed.append(stem)
        print(f"  FAILED: no URL found")
    
    time.sleep(0.3)

print(f"\n=== Summary ===")
print(f"Success: {success}")
print(f"Still failed: {len(still_failed)}")
if still_failed:
    for f in still_failed:
        print(f"  - {f}")
