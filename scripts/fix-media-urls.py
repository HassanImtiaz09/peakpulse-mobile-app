#!/usr/bin/env python3
"""
Convert api.musclewiki.com URLs to media.musclewiki.com URLs and test them.
The media CDN pattern is:
  https://media.musclewiki.com/media/uploads/videos/branded/{Category}-{exercise-name}-{angle}.mp4
where Category has capital first letter.
"""
import re
import subprocess
import json
import time

# Read current exercise-demos.ts
with open('lib/exercise-demos.ts') as f:
    content = f.read()

# Extract all API URLs
api_urls = re.findall(r'https://api\.musclewiki\.com/stream/videos/branded/([^"]+\.mp4)', content)
unique_filenames = sorted(set(api_urls))
print(f"Found {len(unique_filenames)} unique video filenames")

# Convert to media CDN URL
MEDIA_BASE = "https://media.musclewiki.com/media/uploads/videos/branded"

results = {}
working = 0
broken = 0

for fn in unique_filenames:
    # Try the filename as-is first on media CDN
    url = f"{MEDIA_BASE}/{fn}"
    r = subprocess.run(['curl', '-s', '-o', '/dev/null', '-w', '%{http_code}', url],
                      capture_output=True, text=True, timeout=15)
    code = r.stdout.strip()
    
    if code == '200':
        results[fn] = url
        working += 1
        print(f"OK: {fn}")
    else:
        # Try alternative: strip the category prefix duplication
        # e.g., "male-Bodyweight-bodyweight-push-up-front.mp4" → "male-Bodyweight-push-up-front.mp4"
        parts = fn.split('-')
        # Find pattern: male-Category-category-rest → male-Category-rest
        if len(parts) >= 3:
            # Try removing the lowercase duplicate after the capitalized category
            category_idx = 1  # parts[1] should be the category
            if parts[category_idx][0].isupper() and len(parts) > 2:
                # Check if parts[2] is lowercase version of parts[1]
                if parts[2].lower() == parts[category_idx].lower():
                    alt_fn = '-'.join(parts[:2] + parts[3:])
                    alt_url = f"{MEDIA_BASE}/{alt_fn}"
                    r2 = subprocess.run(['curl', '-s', '-o', '/dev/null', '-w', '%{http_code}', alt_url],
                                       capture_output=True, text=True, timeout=15)
                    if r2.stdout.strip() == '200':
                        results[fn] = alt_url
                        working += 1
                        print(f"OK (alt1): {fn} → {alt_fn}")
                        continue
            
            # Try capitalizing the category
            if parts[1][0].islower():
                parts_cap = parts.copy()
                parts_cap[1] = parts_cap[1].capitalize()
                alt_fn = '-'.join(parts_cap)
                alt_url = f"{MEDIA_BASE}/{alt_fn}"
                r3 = subprocess.run(['curl', '-s', '-o', '/dev/null', '-w', '%{http_code}', alt_url],
                                   capture_output=True, text=True, timeout=15)
                if r3.stdout.strip() == '200':
                    results[fn] = alt_url
                    working += 1
                    print(f"OK (cap): {fn} → {alt_fn}")
                    continue
        
        results[fn] = None
        broken += 1
        print(f"FAIL ({code}): {fn}")
    
    time.sleep(0.3)

print(f"\n=== SUMMARY ===")
print(f"Working: {working}/{len(unique_filenames)}")
print(f"Broken: {broken}/{len(unique_filenames)}")

# Save results
with open('/tmp/media-url-results.json', 'w') as f:
    json.dump(results, f, indent=2)
print(f"Results saved to /tmp/media-url-results.json")

if broken:
    print("\n=== BROKEN ===")
    for fn, url in results.items():
        if url is None:
            print(f"  {fn}")
