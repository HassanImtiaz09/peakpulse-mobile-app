"""
Fetch MuscleWiki exercise videos for all exercises in the app.
Search endpoint returns a list of full exercise objects with videos included.
"""
import os
import json
import requests
import time

API_KEY = os.environ.get("MUSCLEWIKI_API_KEY", "")
BASE_URL = "https://api.musclewiki.com"
HEADERS = {"X-API-Key": API_KEY}

# All unique exercises from exercise-demos.ts (deduplicated by canonical name)
APP_EXERCISES = [
    # Chest
    "bench press",
    "push up",
    "dumbbell fly",
    "incline bench press",
    "incline dumbbell press",
    "decline bench press",
    "cable fly",
    "cable crossover",
    "dip",
    # Back
    "pull up",
    "chin up",
    "lat pulldown",
    "bent over row",
    "dumbbell row",
    "seated cable row",
    "deadlift",
    "t-bar row",
    "pendlay row",
    # Shoulders
    "overhead press",
    "shoulder press",
    "military press",
    "dumbbell shoulder press",
    "lateral raise",
    "front raise",
    "face pull",
    "rear delt fly",
    "arnold press",
    "upright row",
    "shrug",
    # Arms
    "bicep curl",
    "barbell curl",
    "dumbbell curl",
    "hammer curl",
    "preacher curl",
    "concentration curl",
    "tricep pushdown",
    "tricep extension",
    "overhead tricep extension",
    "tricep dip",
    "skull crusher",
    "close grip bench press",
    # Legs
    "squat",
    "back squat",
    "front squat",
    "goblet squat",
    "bulgarian split squat",
    "lunge",
    "walking lunge",
    "reverse lunge",
    "leg press",
    "leg curl",
    "leg extension",
    "romanian deadlift",
    "stiff leg deadlift",
    "sumo deadlift",
    "hip thrust",
    "glute bridge",
    "calf raise",
    "standing calf raise",
    "seated calf raise",
    "hack squat",
    "step up",
    # Core
    "plank",
    "side plank",
    "crunch",
    "sit up",
    "russian twist",
    "mountain climber",
    "leg raise",
    "hanging leg raise",
    "ab wheel rollout",
    "bicycle crunch",
    "dead bug",
    "cable woodchop",
    # Cardio
    "burpee",
    "jumping jack",
    "box jump",
    "kettlebell swing",
    "battle rope",
    "jump rope",
    "high knees",
    "sprint",
]

# Alternative search terms for exercises that might not match directly
ALT_TERMS = {
    "push up": "pushup",
    "pull up": "pullup",
    "chin up": "chin up",
    "dip": "chest dip",
    "bent over row": "barbell bent over row",
    "back squat": "barbell back squat",
    "bicep curl": "dumbbell bicep curl",
    "tricep pushdown": "cable tricep pushdown",
    "tricep extension": "cable tricep extension",
    "overhead tricep extension": "dumbbell overhead tricep extension",
    "tricep dip": "bench dip",
    "skull crusher": "barbell skull crusher",
    "shrug": "barbell shrug",
    "face pull": "cable face pull",
    "rear delt fly": "dumbbell reverse fly",
    "cable fly": "cable chest fly",
    "cable crossover": "cable crossover",
    "step up": "dumbbell step up",
    "calf raise": "standing calf raise",
    "sit up": "situp",
    "dead bug": "dead bug",
    "cable woodchop": "cable woodchop",
    "battle rope": "battle ropes",
    "jump rope": "jump rope",
    "high knees": "high knee",
    "sprint": "running",
    "shoulder press": "dumbbell shoulder press",
    "military press": "barbell overhead press",
    "overhead press": "barbell overhead press",
}

def search_exercise(query):
    """Search MuscleWiki API for an exercise by name. Returns a list of exercise objects."""
    try:
        resp = requests.get(
            f"{BASE_URL}/search",
            params={"q": query, "limit": 5},
            headers=HEADERS,
            timeout=10,
        )
        if resp.status_code == 200:
            data = resp.json()
            # Search returns a list directly
            if isinstance(data, list):
                return data
            # Or it might be paginated
            elif isinstance(data, dict):
                return data.get("results", [])
            return []
        else:
            print(f"  Search failed ({resp.status_code}): {resp.text[:100]}")
            return []
    except Exception as e:
        print(f"  Search error: {e}")
        return []

def find_best_match(query, results):
    """Find the best matching exercise from search results."""
    query_lower = query.lower().strip()
    query_words = set(query_lower.split())
    
    # Score each result
    scored = []
    for r in results:
        name = r.get("name", "").lower().strip()
        name_words = set(name.split())
        
        # Exact match
        if name == query_lower:
            scored.append((100, r))
            continue
        
        # Word overlap score
        overlap = len(query_words & name_words)
        total = len(query_words | name_words)
        score = (overlap / total) * 50 if total > 0 else 0
        
        # Contains bonus
        if query_lower in name:
            score += 30
        elif name in query_lower:
            score += 20
        
        scored.append((score, r))
    
    scored.sort(key=lambda x: -x[0])
    if scored and scored[0][0] > 10:
        return scored[0][1]
    return None

def extract_videos(exercise):
    """Extract front and side video URLs for male from exercise data."""
    videos = exercise.get("videos", [])
    if not videos:
        return None, None, None, None
    
    male_front = next((v for v in videos if v.get("gender") == "male" and v.get("angle") == "front"), None)
    male_side = next((v for v in videos if v.get("gender") == "male" and v.get("angle") == "side"), None)
    
    front_url = male_front["url"] if male_front else (videos[0]["url"] if videos else None)
    side_url = male_side["url"] if male_side else None
    front_og = male_front.get("og_image", "") if male_front else ""
    side_og = male_side.get("og_image", "") if male_side else ""
    
    return front_url, side_url, front_og, side_og

def main():
    results = {}
    not_found = []
    
    print(f"Fetching MuscleWiki videos for {len(APP_EXERCISES)} exercises...\n")
    
    for i, exercise_name in enumerate(APP_EXERCISES):
        print(f"[{i+1}/{len(APP_EXERCISES)}] Searching: {exercise_name}")
        
        search_results = search_exercise(exercise_name)
        match = find_best_match(exercise_name, search_results)
        
        if not match:
            # Try alternative search term
            alt = ALT_TERMS.get(exercise_name)
            if alt:
                print(f"  Trying alternative: {alt}")
                search_results = search_exercise(alt)
                match = find_best_match(alt, search_results)
        
        if match:
            front_url, side_url, front_og, side_og = extract_videos(match)
            if front_url:
                results[exercise_name] = {
                    "mw_id": match.get("id"),
                    "mw_name": match.get("name", ""),
                    "primary_muscles": match.get("primary_muscles", []),
                    "category": match.get("category", ""),
                    "difficulty": match.get("difficulty", ""),
                    "steps": match.get("steps", []),
                    "front_video": front_url,
                    "side_video": side_url or "",
                    "front_og_image": front_og,
                    "side_og_image": side_og,
                }
                print(f"  -> {match.get('name')} (ID: {match.get('id')}) ✓")
            else:
                not_found.append(exercise_name)
                print(f"  -> {match.get('name')} (no videos)")
        else:
            not_found.append(exercise_name)
            print(f"  -> No match found")
        
        # Rate limiting
        time.sleep(0.3)
    
    # Save results
    output_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "musclewiki-mapping.json")
    with open(output_path, "w") as f:
        json.dump({"exercises": results, "not_found": not_found, "total_mapped": len(results)}, f, indent=2)
    
    print(f"\n{'='*60}")
    print(f"Results: {len(results)} mapped, {len(not_found)} not found")
    if not_found:
        print(f"Not found: {not_found}")
    print(f"Saved to: {output_path}")

if __name__ == "__main__":
    main()
