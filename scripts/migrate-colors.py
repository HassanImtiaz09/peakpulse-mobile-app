#!/usr/bin/env python3
"""
Batch migrate local SF/C color objects to centralized import from @/constants/ui-colors.
For each file:
  1. Remove the local `const SF = { ... }` or `const C = { ... }` block
  2. Add the appropriate import at the top of the file
"""
import re
import os
import sys

PROJECT = "/home/ubuntu/peakpulse-mobile"

# Files that use SF
SF_FILES = [
    "app/(tabs)/index.tsx",
    "app/(tabs)/plans.tsx",
    "app/(tabs)/meals.tsx",
    "app/(tabs)/profile.tsx",
    "app/(tabs)/ai-coach.tsx",
    "app/onboarding.tsx",
    "app/active-workout.tsx",
    "app/social-feed.tsx",
    "app/subscription-plans.tsx",
    "app/exercise-library.tsx",
    "app/exercise-detail.tsx",
    "app/progress-photos.tsx",
    "app/body-scan-compare.tsx",
    "app/workout-history.tsx",
    "app/workout-calendar.tsx",
    "app/workout-templates.tsx",
    "app/create-workout.tsx",
    "app/meal-prep.tsx",
    "app/meal-timeline.tsx",
    "app/meal-photo-gallery.tsx",
    "app/nutrition-charts.tsx",
    "app/pantry.tsx",
    "app/gym-finder.tsx",
    "app/form-checker.tsx",
    "app/form-compare.tsx",
    "app/streak-details.tsx",
    "app/achievements.tsx",
    "app/challenge.tsx",
    "app/settings.tsx",
    "app/weekly-goals.tsx",
    "app/weekly-summary.tsx",
    "app/health-trends.tsx",
    "app/daily-checkin.tsx",
    "app/referral.tsx",
    "app/social-circle.tsx",
    "app/share-workout.tsx",
    "app/log-workout.tsx",
    "app/rest-timer-settings.tsx",
    "app/rest-timer-sounds.tsx",
    "app/voice-coach-settings.tsx",
    "app/user-guide.tsx",
    "app/feedback.tsx",
    "app/notification-preferences.tsx",
    "app/notification-settings.tsx",
    "app/smart-reminders.tsx",
    "app/offline-cache.tsx",
    "app/chat.tsx",
    "app/barcode-scanner.tsx",
    "app/scan-receipt.tsx",
    "components/paywall-modal.tsx",
    "components/floating-assistant.tsx",
    "components/premium-feature-banner.tsx",
    "components/feature-gate.tsx",
    "app/(tabs)/scan.tsx",
    "app/onboarding-summary.tsx",
]

# Files that use C (may also have SF)
C_FILES = [
    "app/workout-analytics.tsx",
    "components/workout-timer-coach.tsx",
]

def remove_color_block(content, var_name):
    """Remove a `const SF = { ... };` or `const C = { ... };` block."""
    # Pattern: const SF = { ... }; or const C = { ... };
    # Handle multi-line object with nested content
    # We need to find the opening and match braces
    
    # Try regex first for simple cases
    pattern = rf'(?:^|\n)([ \t]*(?:export\s+)?const\s+{var_name}\s*=\s*\{{)'
    match = re.search(pattern, content)
    if not match:
        return content, False
    
    start = match.start()
    if content[start] == '\n':
        start += 1
    
    # Find the matching closing brace
    brace_start = content.index('{', match.start() + 1)
    depth = 0
    i = brace_start
    while i < len(content):
        if content[i] == '{':
            depth += 1
        elif content[i] == '}':
            depth -= 1
            if depth == 0:
                break
        i += 1
    
    # Find the end of the statement (semicolon, optional whitespace/newlines)
    end = i + 1
    while end < len(content) and content[end] in ' \t':
        end += 1
    if end < len(content) and content[end] == ';':
        end += 1
    # Also eat trailing newlines (up to 2)
    newlines_eaten = 0
    while end < len(content) and content[end] == '\n' and newlines_eaten < 2:
        end += 1
        newlines_eaten += 1
    
    content = content[:start] + content[end:]
    return content, True

def add_import(content, var_name):
    """Add import statement for the centralized color file."""
    # Check if already imported
    if '@/constants/ui-colors' in content:
        return content
    
    if var_name == "C":
        import_line = 'import { C } from "@/constants/ui-colors";\n'
    else:
        # Use `import { UI as SF }` so existing SF.xxx references still work
        import_line = 'import { UI as SF } from "@/constants/ui-colors";\n'
    
    # Insert after the last import statement
    lines = content.split('\n')
    last_import_idx = -1
    for idx, line in enumerate(lines):
        stripped = line.strip()
        if stripped.startswith('import ') or stripped.startswith('import{'):
            last_import_idx = idx
        # Also handle multi-line imports
        elif last_import_idx >= 0 and (stripped.startswith('}') and 'from' in stripped):
            last_import_idx = idx
    
    if last_import_idx >= 0:
        lines.insert(last_import_idx + 1, import_line.rstrip())
        return '\n'.join(lines)
    else:
        # No imports found, add at top
        return import_line + content

def process_file(filepath, var_name):
    """Process a single file: remove local color block and add import."""
    full_path = os.path.join(PROJECT, filepath)
    if not os.path.exists(full_path):
        print(f"  SKIP (not found): {filepath}")
        return False
    
    with open(full_path, 'r') as f:
        content = f.read()
    
    # Check if already migrated
    if '@/constants/ui-colors' in content:
        print(f"  SKIP (already migrated): {filepath}")
        return False
    
    # Check if the file actually has a local color block
    has_sf = bool(re.search(r'(?:^|\n)\s*(?:export\s+)?const\s+SF\s*=\s*\{', content))
    has_c = bool(re.search(r'(?:^|\n)\s*(?:export\s+)?const\s+C\s*=\s*\{', content))
    
    if var_name == "SF" and not has_sf:
        # Maybe it uses C instead
        if has_c:
            var_name = "C"
        else:
            print(f"  SKIP (no local {var_name} found): {filepath}")
            return False
    elif var_name == "C" and not has_c:
        if has_sf:
            var_name = "SF"
        else:
            print(f"  SKIP (no local {var_name} found): {filepath}")
            return False
    
    original = content
    
    # Remove the local color block
    content, removed = remove_color_block(content, var_name)
    if not removed:
        print(f"  WARN (block not removed): {filepath}")
        return False
    
    # Also try removing the other variant if present
    if var_name == "SF" and has_c:
        content, _ = remove_color_block(content, "C")
    elif var_name == "C" and has_sf:
        content, _ = remove_color_block(content, "SF")
    
    # Add the import
    content = add_import(content, var_name)
    
    if content != original:
        with open(full_path, 'w') as f:
            f.write(content)
        print(f"  OK: {filepath} (removed local {var_name}, added import)")
        return True
    
    print(f"  SKIP (no changes): {filepath}")
    return False

def main():
    migrated = 0
    skipped = 0
    
    print("=== Migrating SF files ===")
    for f in SF_FILES:
        if process_file(f, "SF"):
            migrated += 1
        else:
            skipped += 1
    
    print("\n=== Migrating C files ===")
    for f in C_FILES:
        if process_file(f, "C"):
            migrated += 1
        else:
            skipped += 1
    
    print(f"\n=== Done: {migrated} migrated, {skipped} skipped ===")

if __name__ == "__main__":
    main()
