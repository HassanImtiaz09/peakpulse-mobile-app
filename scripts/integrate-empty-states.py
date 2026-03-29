#!/usr/bin/env python3
"""
Integrate EmptyState component into 7 screens.
For each screen, add the import and insert the empty state check at the appropriate location.
"""
import re
import os

PROJECT = "/home/ubuntu/peakpulse-mobile"

def add_import_if_missing(content, import_line):
    """Add an import line after the last import if not already present."""
    if "empty-state" in content:
        return content
    lines = content.split('\n')
    last_import_idx = -1
    for idx, line in enumerate(lines):
        stripped = line.strip()
        if stripped.startswith('import ') or stripped.startswith('import{'):
            last_import_idx = idx
        elif last_import_idx >= 0 and (stripped.startswith('}') and 'from' in stripped):
            last_import_idx = idx
    if last_import_idx >= 0:
        lines.insert(last_import_idx + 1, import_line)
        return '\n'.join(lines)
    return import_line + '\n' + content

def process_plans():
    """plans.tsx — show empty state when no workout plan exists."""
    path = os.path.join(PROJECT, "app/(tabs)/plans.tsx")
    with open(path, 'r') as f:
        content = f.read()
    content = add_import_if_missing(content, 'import { EmptyState, EMPTY_STATES } from "@/components/empty-state";')
    with open(path, 'w') as f:
        f.write(content)
    print("  OK: plans.tsx (import added)")

def process_meals():
    """meals.tsx — show empty state when no meal plan exists."""
    path = os.path.join(PROJECT, "app/(tabs)/meals.tsx")
    with open(path, 'r') as f:
        content = f.read()
    content = add_import_if_missing(content, 'import { EmptyState, EMPTY_STATES } from "@/components/empty-state";')
    with open(path, 'w') as f:
        f.write(content)
    print("  OK: meals.tsx (import added)")

def process_progress_photos():
    """progress-photos.tsx — show empty state when photos array is empty."""
    path = os.path.join(PROJECT, "app/progress-photos.tsx")
    with open(path, 'r') as f:
        content = f.read()
    content = add_import_if_missing(content, 'import { EmptyState, EMPTY_STATES } from "@/components/empty-state";')
    with open(path, 'w') as f:
        f.write(content)
    print("  OK: progress-photos.tsx (import added)")

def process_workout_history():
    """workout-history.tsx — show empty state when sessions array is empty."""
    path = os.path.join(PROJECT, "app/workout-history.tsx")
    with open(path, 'r') as f:
        content = f.read()
    content = add_import_if_missing(content, 'import { EmptyState, EMPTY_STATES } from "@/components/empty-state";')
    with open(path, 'w') as f:
        f.write(content)
    print("  OK: workout-history.tsx (import added)")

def process_workout_analytics():
    """workout-analytics.tsx — show empty state when insufficient data."""
    path = os.path.join(PROJECT, "app/workout-analytics.tsx")
    with open(path, 'r') as f:
        content = f.read()
    content = add_import_if_missing(content, 'import { EmptyState, EMPTY_STATES } from "@/components/empty-state";')
    with open(path, 'w') as f:
        f.write(content)
    print("  OK: workout-analytics.tsx (import added)")

def process_social_feed():
    """social-feed.tsx — show empty state when no real posts."""
    path = os.path.join(PROJECT, "app/social-feed.tsx")
    with open(path, 'r') as f:
        content = f.read()
    content = add_import_if_missing(content, 'import { EmptyState, EMPTY_STATES } from "@/components/empty-state";')
    with open(path, 'w') as f:
        f.write(content)
    print("  OK: social-feed.tsx (import added)")

def process_pantry():
    """pantry.tsx — show empty state when pantry is empty."""
    path = os.path.join(PROJECT, "app/pantry.tsx")
    with open(path, 'r') as f:
        content = f.read()
    content = add_import_if_missing(content, 'import { EmptyState, EMPTY_STATES } from "@/components/empty-state";')
    with open(path, 'w') as f:
        f.write(content)
    print("  OK: pantry.tsx (import added)")

if __name__ == "__main__":
    process_plans()
    process_meals()
    process_progress_photos()
    process_workout_history()
    process_workout_analytics()
    process_social_feed()
    process_pantry()
    print("\n=== Done: imports added to 7 screens ===")
    print("NOTE: Actual empty state rendering requires manual integration per screen.")
