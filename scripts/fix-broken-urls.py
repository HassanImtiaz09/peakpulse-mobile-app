#!/usr/bin/env python3
"""
For the 21 broken videos, query the MuscleWiki API to get the exact video URLs,
then try variations on media.musclewiki.com to find working CDN URLs.
"""
import json
import subprocess
import time
import urllib.request

API_KEY = "mw_3iyO6po09klnJ32xUqmf7BLsY2X4cy1fRO9kqpi9LlU"
MEDIA_BASE = "https://media.musclewiki.com/media/uploads/videos/branded"

# Map broken filenames to exercise search terms for API lookup
BROKEN_EXERCISES = {
    "male-Bands-band-overhead-tricep-extension-front.mp4": "band overhead tricep extension",
    "male-Barbell-barbell-bent-over-row-front.mp4": "barbell bent over row",
    "male-Barbell-barbell-reverse-lunge-front.mp4": "barbell reverse lunge",
    "male-Bodyweight-burpee-front.mp4": "burpee",
    "male-Bodyweight-elbow-side-plank-front.mp4": "side plank",
    "male-Bodyweight-floor-incline-leg-raise-front.mp4": "leg raise",
    "male-Bodyweight-mountain-climber-front.mp4": "mountain climber",
    "male-Bodyweight-walking-lunge-front.mp4": "walking lunge",
    "male-Cable-cable-rope-face-pulls-front.mp4": "face pull",
    "male-Dumbbells-dumbbell-leg-curl-front.mp4": "dumbbell leg curl",
    "male-Dumbbells-dumbbell-pendlay-row-front.mp4": "pendlay row",
    "male-Plyometrics-box-jump-front.mp4": "box jump",
    "male-TRX-trx-ab-rollout-front.mp4": "ab rollout",
    "male-bodyweight-chin-ups-front.mp4": "chin ups",
    "male-bodyweight-pull-ups-front.mp4": "pull ups",
    "male-dumbbell-front-raise-front.mp4": "dumbbell front raise",
    "male-dumbbell-hammer-curl-front.mp4": "dumbbell hammer curl",
    "male-dumbbell-lateral-raise-front.mp4": "dumbbell lateral raise",
    "male-dumbbell-rear-delt-fly-front.mp4": "dumbbell rear delt fly",
    "male-dumbbell-row-bilateral-front.mp4": "dumbbell row",
    "male-machine-leg-press-front.mp4": "leg press",
}

def try_url(url):
    """Test if a URL returns 200."""
    r = subprocess.run(['curl', '-s', '-o', '/dev/null', '-w', '%{http_code}', url],
                      capture_output=True, text=True, timeout=15)
    return r.stdout.strip() == '200'

def api_search(query):
    """Search MuscleWiki API."""
    import urllib.parse
    url = f"https://api.musclewiki.com/search?q={urllib.parse.quote(query)}"
    try:
        req = urllib.request.Request(url, headers={"X-API-Key": API_KEY})
        with urllib.request.urlopen(req, timeout=15) as resp:
            return json.loads(resp.read())
    except Exception as e:
        print(f"  API error: {e}")
        return []

results = {}
for orig_fn, search_term in BROKEN_EXERCISES.items():
    print(f"\n--- {orig_fn} ---")
    print(f"  Searching API for: {search_term}")
    
    data = api_search(search_term)
    time.sleep(3)  # Longer delay to avoid rate limiting
    
    if not data:
        print("  No API results")
        results[orig_fn] = None
        continue
    
    # Get the first male front video URL from the API
    ex = data[0]
    print(f"  API match: {ex['name']} (ID: {ex['id']})")
    
    api_front_url = None
    for v in ex.get('videos', []):
        if v.get('gender') == 'male' and v.get('angle') == 'front':
            api_front_url = v['url']
            break
    
    if not api_front_url:
        print("  No male front video in API")
        results[orig_fn] = None
        continue
    
    # Extract filename from API URL
    api_fn = api_front_url.split('/')[-1]
    print(f"  API filename: {api_fn}")
    
    # Try the API filename on media CDN
    media_url = f"{MEDIA_BASE}/{api_fn}"
    if try_url(media_url):
        print(f"  FOUND: {media_url}")
        results[orig_fn] = media_url
        continue
    
    # Try variations: capitalize category, remove duplicate category word, etc.
    parts = api_fn.replace('.mp4', '').split('-')
    variations = []
    
    # Try capitalizing the second part (category)
    if len(parts) >= 2:
        p = parts.copy()
        p[1] = p[1].capitalize()
        variations.append('-'.join(p) + '.mp4')
    
    # Try removing duplicate category word
    if len(parts) >= 3 and parts[1].lower() == parts[2].lower():
        p = parts[:2] + parts[3:]
        variations.append('-'.join(p) + '.mp4')
    
    # Try with capitalized category and no duplicate
    if len(parts) >= 3:
        p = parts.copy()
        p[1] = p[1].capitalize()
        if p[1].lower() == p[2].lower():
            p = p[:2] + p[3:]
        variations.append('-'.join(p) + '.mp4')
    
    found = False
    for var in variations:
        var_url = f"{MEDIA_BASE}/{var}"
        if try_url(var_url):
            print(f"  FOUND (variation): {var_url}")
            results[orig_fn] = var_url
            found = True
            break
    
    if not found:
        print(f"  NOT FOUND (tried {len(variations) + 1} variations)")
        results[orig_fn] = None

# Summary
found_count = sum(1 for v in results.values() if v)
print(f"\n=== SUMMARY ===")
print(f"Found: {found_count}/{len(BROKEN_EXERCISES)}")
still_broken = [k for k, v in results.items() if not v]
if still_broken:
    print(f"Still broken: {len(still_broken)}")
    for fn in still_broken:
        print(f"  {fn}")

# Save results
with open('/tmp/broken-url-fixes.json', 'w') as f:
    json.dump(results, f, indent=2)
print(f"Results saved to /tmp/broken-url-fixes.json")
