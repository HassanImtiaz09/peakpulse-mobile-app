#!/usr/bin/env python3
"""
Apply a11y import + back button props to ALL screens that have router.back() 
but don't yet have a11yButton.
"""
import re, os, glob

BASE = "/home/ubuntu/peakpulse-mobile"
import_line = 'import { a11yButton, a11yHeader, a11yImage, a11yProgress, a11ySwitch, A11Y_LABELS } from "@/lib/accessibility";'

# Find all .tsx files under app/ that have router.back()
all_screens = glob.glob(os.path.join(BASE, "app/**/*.tsx"), recursive=True)

import_added = 0
back_added = 0

for path in sorted(all_screens):
    rel = os.path.relpath(path, BASE)
    
    with open(path, "r") as f:
        content = f.read()
    
    if "router.back()" not in content:
        continue
    
    changed = False
    
    # Step 1: Add import if missing
    if "a11yButton" not in content and "@/lib/accessibility" not in content:
        lines = content.split('\n')
        last_import_idx = 0
        for i, line in enumerate(lines):
            stripped = line.strip()
            if stripped.startswith('import ') or (stripped.startswith('} from ') and ';' in stripped):
                last_import_idx = i
        lines.insert(last_import_idx + 1, import_line)
        content = '\n'.join(lines)
        changed = True
        import_added += 1
    
    # Step 2: Add a11y to back buttons
    # Pattern: onPress={() => router.back()} followed by > (possibly with whitespace)
    pattern = r'(onPress=\{[^}]*router\.back\(\)[^}]*\})\s*>'
    
    new_content, count = re.subn(
        pattern,
        lambda m: m.group(0) if ('a11yButton' in m.group(0) or 'accessibilityLabel' in m.group(0)) else m.group(1) + ' {...a11yButton(A11Y_LABELS.backButton)}>',
        content
    )
    
    if count > 0 and new_content != content:
        content = new_content
        changed = True
        back_added += 1
    
    if changed:
        with open(path, "w") as f:
            f.write(content)
        print(f"  OK: {rel}")

print(f"\n=== Done ===")
print(f"  Imports added: {import_added}")
print(f"  Back buttons annotated: {back_added}")
