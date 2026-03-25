#!/usr/bin/env python3
"""Find the 12 missing exercises in MuscleWiki API by browsing all exercises"""
import requests
import json
import time

API_KEY = "mw_3iyO6po09klnJ32xUqmf7BLsY2X4cy1fRO9kqpi9LlU"
HEADERS = {"x-api-key": API_KEY}
BASE = "https://api.musclewiki.com"

targets = ['bent over row', 'burpee', 'side plank', 'leg raise', 'walking lunge', 
           'face pull', 'leg curl', 'pendlay', 'ab rollout', 'ab wheel',
           'bench dip', 'chin up', 'chin-up', 'pull up', 'pull-up']

all_exercises = []
offset = 0
limit = 100

while True:
    try:
        resp = requests.get(f"{BASE}/exercises", headers=HEADERS, 
                          params={"limit": limit, "offset": offset}, timeout=15)
        if resp.status_code != 200:
            print(f"Error: HTTP {resp.status_code}")
            break
        data = resp.json()
        results = data.get("results", [])
        if not results:
            break
        all_exercises.extend(results)
        print(f"Fetched {len(all_exercises)}/{data.get('total', '?')} exercises...")
        offset += limit
        if offset >= data.get("total", 0):
            break
        time.sleep(0.5)
    except Exception as e:
        print(f"Error: {e}")
        break

print(f"\nTotal exercises: {len(all_exercises)}")
print("\n=== Matching exercises ===")

for ex in all_exercises:
    name_lower = ex["name"].lower()
    for t in targets:
        if t in name_lower:
            print(f"  ID={ex['id']:4d} Name={ex['name']}")
            break
