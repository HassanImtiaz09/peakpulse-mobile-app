#!/usr/bin/env python3
"""
Apply accessibility props to key interactive elements across PeakPulse screens.
Adds import + specific a11y props to TouchableOpacity buttons.
"""
import re, os

BASE = "/home/ubuntu/peakpulse-mobile"

# ── Step 1: Add a11y import to screens that don't have it yet ──
SCREENS_NEEDING_A11Y = [
    "app/(tabs)/plans.tsx",
    "app/(tabs)/meals.tsx",
    "app/(tabs)/profile.tsx",
    "app/(tabs)/scan.tsx",
    "app/(tabs)/ai-coach.tsx",
    "app/active-workout.tsx",
    "app/form-checker.tsx",
    "app/daily-checkin.tsx",
    "app/meal-prep.tsx",
    "app/progress-photos.tsx",
    "app/onboarding.tsx",
    "app/chat.tsx",
    "app/create-workout.tsx",
    "app/pantry.tsx",
    "app/weekly-goals.tsx",
    "app/workout-history.tsx",
    "app/body-scan-compare.tsx",
    "app/scan-receipt.tsx",
    "app/social-feed.tsx",
    "app/workout-calendar.tsx",
    "app/personal-records.tsx",
    "app/streak-details.tsx",
    "app/muscle-balance.tsx",
    "app/challenge.tsx",
    "app/feedback.tsx",
    "app/subscription.tsx",
    "app/subscription-plans.tsx",
    "app/wearable-settings.tsx",
    "app/digest-settings.tsx",
    "app/notification-settings.tsx",
    "app/user-guide.tsx",
    "app/referral.tsx",
    "app/social-circle.tsx",
]

import_line = 'import { a11yButton, a11yHeader, a11yImage, a11yProgress, a11ySwitch, A11Y_LABELS } from "@/lib/accessibility";'

for rel in SCREENS_NEEDING_A11Y:
    path = os.path.join(BASE, rel)
    if not os.path.exists(path):
        continue
    
    with open(path, "r") as f:
        content = f.read()
    
    if "a11yButton" in content:
        continue  # already imported
    
    lines = content.split('\n')
    last_import_idx = 0
    for i, line in enumerate(lines):
        stripped = line.strip()
        if stripped.startswith('import ') or (stripped.startswith('} from ') and ';' in stripped):
            last_import_idx = i
    
    lines.insert(last_import_idx + 1, import_line)
    content = '\n'.join(lines)
    
    with open(path, "w") as f:
        f.write(content)
    
    print(f"  OK: {rel} (a11y import added)")

# ── Step 2: Add a11y props to common back button patterns ──
# Pattern: router.back() buttons with arrow-back icon
BACK_BUTTON_SCREENS = [
    "app/(tabs)/plans.tsx",
    "app/(tabs)/meals.tsx",
    "app/(tabs)/profile.tsx",
    "app/(tabs)/scan.tsx",
    "app/(tabs)/ai-coach.tsx",
    "app/active-workout.tsx",
    "app/form-checker.tsx",
    "app/daily-checkin.tsx",
    "app/meal-prep.tsx",
    "app/progress-photos.tsx",
    "app/chat.tsx",
    "app/create-workout.tsx",
    "app/pantry.tsx",
    "app/weekly-goals.tsx",
    "app/workout-history.tsx",
    "app/body-scan-compare.tsx",
    "app/scan-receipt.tsx",
    "app/social-feed.tsx",
    "app/workout-calendar.tsx",
    "app/personal-records.tsx",
    "app/streak-details.tsx",
    "app/muscle-balance.tsx",
    "app/challenge.tsx",
    "app/feedback.tsx",
    "app/subscription.tsx",
    "app/subscription-plans.tsx",
    "app/wearable-settings.tsx",
    "app/digest-settings.tsx",
    "app/notification-settings.tsx",
    "app/user-guide.tsx",
    "app/referral.tsx",
    "app/social-circle.tsx",
]

back_count = 0
for rel in BACK_BUTTON_SCREENS:
    path = os.path.join(BASE, rel)
    if not os.path.exists(path):
        continue
    
    with open(path, "r") as f:
        content = f.read()
    
    # Pattern: onPress={() => router.back()}> (end of opening tag)
    pattern = r'(onPress=\{[^}]*router\.back\(\)[^}]*\})\s*>'
    
    new_content, count = re.subn(
        pattern,
        lambda m: m.group(0) if ('a11yButton' in m.group(0) or 'accessibilityLabel' in m.group(0)) else m.group(1) + ' {...a11yButton(A11Y_LABELS.backButton)}>',
        content
    )
    
    if count > 0 and new_content != content:
        with open(path, "w") as f:
            f.write(new_content)
        back_count += 1
        print(f"  OK: {rel} (back button a11y added, {count} replacements)")

print(f"\n  Back buttons updated in {back_count} files")

# ── Step 3: Add a11yHeader to SectionTitle-like patterns ──
# Many screens have header text like <Text style={...title...}>Section Name</Text>
# We'll add accessibilityRole="header" to section title Views
header_count = 0
for rel in SCREENS_NEEDING_A11Y:
    path = os.path.join(BASE, rel)
    if not os.path.exists(path):
        continue
    
    with open(path, "r") as f:
        content = f.read()
    
    # Find header bar patterns: <View style={styles.headerBar}> or similar
    # Add accessible and accessibilityRole to the title Text
    # This is too varied to automate perfectly, so we'll skip complex patterns
    pass

print(f"\n=== Done: Accessibility props applied ===")
print(f"  - a11y imports added to screens")
print(f"  - Back button a11y props added to {back_count} screens")
print(f"  - Dashboard fully annotated (done in previous step)")
