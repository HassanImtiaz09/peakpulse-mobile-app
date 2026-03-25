#!/usr/bin/env python3
"""
Download side-view exercise videos from MuscleWiki API and convert to GIFs.
Uses the API key for authenticated access to streaming endpoints.
"""
import subprocess
import os
import sys
import time

API_KEY = "mw_3iyO6WlWCh"
GIF_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "assets", "exercise-gifs")
os.makedirs(GIF_DIR, exist_ok=True)

# Read all side-view URLs
with open("/tmp/side-urls.txt") as f:
    urls = [line.strip() for line in f if line.strip()]

print(f"Total side-view URLs to process: {len(urls)}")

success = 0
failed = []
skipped = 0

for i, url in enumerate(urls):
    # Extract filename stem
    filename = url.split("/")[-1].replace(".mp4", "")
    gif_path = os.path.join(GIF_DIR, f"{filename}.gif")
    
    # Skip if already exists
    if os.path.exists(gif_path) and os.path.getsize(gif_path) > 1000:
        skipped += 1
        continue
    
    print(f"[{i+1}/{len(urls)}] Downloading: {filename}")
    
    # Download video with API key
    tmp_mp4 = f"/tmp/side-{filename}.mp4"
    
    try:
        # Try downloading with API key
        result = subprocess.run(
            ["curl", "-sL", "--connect-timeout", "15", "--max-time", "30",
             "-H", f"x-api-key: {API_KEY}",
             "-o", tmp_mp4, url],
            capture_output=True, text=True, timeout=45
        )
        
        if not os.path.exists(tmp_mp4) or os.path.getsize(tmp_mp4) < 5000:
            # Try media CDN as fallback
            media_url = url.replace("api.musclewiki.com/stream/videos", "media.musclewiki.com/media/uploads/videos")
            result = subprocess.run(
                ["curl", "-sL", "--connect-timeout", "15", "--max-time", "30",
                 "-o", tmp_mp4, media_url],
                capture_output=True, text=True, timeout=45
            )
        
        if not os.path.exists(tmp_mp4) or os.path.getsize(tmp_mp4) < 5000:
            print(f"  FAILED: Could not download {filename}")
            failed.append(filename)
            continue
        
        # Convert to GIF with ffmpeg
        result = subprocess.run(
            ["ffmpeg", "-y", "-i", tmp_mp4,
             "-vf", "fps=10,scale=320:-1:flags=lanczos",
             "-loop", "0",
             gif_path],
            capture_output=True, text=True, timeout=60
        )
        
        if os.path.exists(gif_path) and os.path.getsize(gif_path) > 1000:
            size_kb = os.path.getsize(gif_path) / 1024
            print(f"  OK: {size_kb:.0f}KB")
            success += 1
        else:
            print(f"  FAILED: ffmpeg conversion failed for {filename}")
            failed.append(filename)
        
        # Clean up temp file
        if os.path.exists(tmp_mp4):
            os.remove(tmp_mp4)
            
    except Exception as e:
        print(f"  ERROR: {e}")
        failed.append(filename)
        if os.path.exists(tmp_mp4):
            os.remove(tmp_mp4)
    
    # Small delay to avoid rate limiting
    time.sleep(0.3)

print(f"\n=== Summary ===")
print(f"Success: {success}")
print(f"Skipped (already exist): {skipped}")
print(f"Failed: {len(failed)}")
if failed:
    print(f"Failed exercises:")
    for f in failed:
        print(f"  - {f}")
