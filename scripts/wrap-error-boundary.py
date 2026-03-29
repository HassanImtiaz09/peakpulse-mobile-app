#!/usr/bin/env python3
"""
Wrap tab screen default exports with ErrorBoundary.
For each tab screen, we:
1. Add the ErrorBoundary import
2. Rename the existing default export function to XxxContent
3. Create a new default export that wraps XxxContent with ErrorBoundary
"""
import re, os

BASE = "/home/ubuntu/peakpulse-mobile"

TAB_SCREENS = {
    "app/(tabs)/index.tsx": "Dashboard",
    "app/(tabs)/plans.tsx": "Plans",
    "app/(tabs)/meals.tsx": "Meals",
    "app/(tabs)/profile.tsx": "Profile",
    "app/(tabs)/scan.tsx": "Scan",
    "app/(tabs)/ai-coach.tsx": "AI Coach",
}

for rel, screen_name in TAB_SCREENS.items():
    path = os.path.join(BASE, rel)
    if not os.path.exists(path):
        print(f"  SKIP: {rel} (not found)")
        continue
    
    with open(path, "r") as f:
        content = f.read()
    
    # Skip if already wrapped
    if 'ErrorBoundary' in content:
        print(f"  SKIP: {rel} (ErrorBoundary already present)")
        continue
    
    # 1. Add import
    # Find last import line
    lines = content.split('\n')
    last_import_idx = 0
    for i, line in enumerate(lines):
        if line.startswith('import ') or (line.startswith('} from ') and ';' in line):
            last_import_idx = i
    
    lines.insert(last_import_idx + 1, 'import { ErrorBoundary } from "@/components/error-boundary";')
    content = '\n'.join(lines)
    
    # 2. Find the default export function and wrap it
    # Pattern: export default function SomeName() {
    match = re.search(r'export default function (\w+)\s*\(', content)
    if not match:
        print(f"  SKIP: {rel} (no default export function found)")
        continue
    
    func_name = match.group(1)
    content_name = func_name + "Content"
    
    # Rename the function
    content = content.replace(
        f'export default function {func_name}(',
        f'function {content_name}(',
        1
    )
    
    # Add new default export at the end
    content = content.rstrip() + f'\n\nexport default function {func_name}() {{\n  return (\n    <ErrorBoundary fallbackScreen="{screen_name}">\n      <{content_name} />\n    </ErrorBoundary>\n  );\n}}\n'
    
    with open(path, "w") as f:
        f.write(content)
    
    print(f"  OK: {rel} (wrapped {func_name} -> {content_name} + ErrorBoundary)")

print("\n=== Done: ErrorBoundary wrapping ===")
