#!/usr/bin/env python3
"""
Download MuscleWiki exercise videos and convert to compact GIF files.
Uses API key for authentication and includes rate limiting.
"""
import subprocess
import os
import re
import time

API_KEY = "mw_3iyO6po09klnJ32xUqmf7BLsY2X4cy1fRO9kqpi9LlU"
DEMOS_FILE = "/home/ubuntu/peakpulse-mobile/lib/exercise-demos.ts"
DATA_FILE = "/home/ubuntu/peakpulse-mobile/lib/exercise-data.ts"
OUTPUT_DIR = "/home/ubuntu/peakpulse-mobile/assets/exercise-gifs"
TEMP_DIR = "/tmp/exercise-videos"

os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(TEMP_DIR, exist_ok=True)

# Parse all unique MuscleWiki URLs
with open(DEMOS_FILE, "r") as f:
    demos_content = f.read()
with open(DATA_FILE, "r") as f:
    data_content = f.read()

demos_urls = set(re.findall(r'https://api\.musclewiki\.com/stream/videos/branded/[^"]+\.mp4', demos_content))
data_urls = set(re.findall(r'https://api\.musclewiki\.com/stream/videos/branded/[^"]+\.mp4', data_content))
all_urls = sorted(demos_urls | data_urls)
print(f"Total unique MuscleWiki URLs: {len(all_urls)}")

def url_to_filename(url):
    name = url.split("/")[-1].replace(".mp4", "")
    name = re.sub(r'[^a-zA-Z0-9_-]', '-', name)
    return name

success = 0
failed = 0
skipped = 0
failed_list = []

for i, url in enumerate(all_urls):
    name = url_to_filename(url)
    gif_path = os.path.join(OUTPUT_DIR, f"{name}.gif")
    mp4_path = os.path.join(TEMP_DIR, f"{name}.mp4")
    
    if os.path.exists(gif_path) and os.path.getsize(gif_path) > 1000:
        skipped += 1
        continue
    
    print(f"[{i+1}/{len(all_urls)}] {name}")
    
    # Download with API key and retry
    for attempt in range(3):
        dl_result = subprocess.run(
            ["curl", "-s", "-o", mp4_path, "-L", "--max-time", "30",
             "-H", f"X-API-Key: {API_KEY}", url],
            capture_output=True, text=True
        )
        if os.path.exists(mp4_path) and os.path.getsize(mp4_path) > 1000:
            break
        time.sleep(2)
    
    if not os.path.exists(mp4_path) or os.path.getsize(mp4_path) < 1000:
        print(f"  FAILED download")
        failed += 1
        failed_list.append(name)
        continue
    
    # Convert to GIF
    try:
        subprocess.run(
            ["ffmpeg", "-y", "-i", mp4_path,
             "-vf", "fps=10,scale=200:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=48[p];[s1][p]paletteuse=dither=bayer:bayer_scale=3",
             "-loop", "0", gif_path],
            capture_output=True, text=True, timeout=60
        )
    except subprocess.TimeoutExpired:
        print(f"  FAILED convert (timeout)")
        failed += 1
        failed_list.append(name)
        continue
    
    if os.path.exists(gif_path) and os.path.getsize(gif_path) > 1000:
        size_kb = os.path.getsize(gif_path) / 1024
        print(f"  OK ({size_kb:.0f}KB)")
        success += 1
    else:
        print(f"  FAILED convert")
        failed += 1
        failed_list.append(name)
    
    # Clean up MP4
    if os.path.exists(mp4_path):
        os.remove(mp4_path)
    
    # Rate limit: 0.5s between downloads
    time.sleep(0.5)

print(f"\n=== SUMMARY ===")
print(f"Success: {success}")
print(f"Skipped (already done): {skipped}")
print(f"Failed:  {failed}")
print(f"Total GIFs: {success + skipped}")
if failed_list:
    print(f"Failed exercises: {', '.join(failed_list)}")

total_size = sum(os.path.getsize(os.path.join(OUTPUT_DIR, f)) for f in os.listdir(OUTPUT_DIR) if f.endswith(".gif"))
print(f"Total GIF size: {total_size / 1024 / 1024:.1f}MB")
