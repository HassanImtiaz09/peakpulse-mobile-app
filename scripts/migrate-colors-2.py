#!/usr/bin/env python3
"""Second pass: migrate remaining files with local SF/C color blocks."""
import re
import os

PROJECT = "/home/ubuntu/peakpulse-mobile"

REMAINING = [
    ("app/ai-coach.tsx", "SF"),
    ("app/transformation-reminder.tsx", "SF"),
    ("components/explore-grid.tsx", "SF"),
    ("components/quick-insights-carousel.tsx", "SF"),
    ("components/trend-chart.tsx", "SF"),
    ("components/tutorial-overlay.tsx", "SF"),
    ("app/browse-by-muscle.tsx", "C"),
    ("app/login.tsx", "C"),
    ("components/body-diagram.tsx", "C"),
    ("components/exercise-swap-sheet.tsx", "C"),
    ("components/muscle-svg-diagram.tsx", "C"),
    ("components/wearable-metrics-panel.tsx", "C"),
]

def remove_color_block(content, var_name):
    pattern = rf'(?:^|\n)([ \t]*(?:export\s+)?const\s+{var_name}\s*=\s*\{{)'
    match = re.search(pattern, content)
    if not match:
        return content, False
    
    start = match.start()
    if content[start] == '\n':
        start += 1
    
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
    
    end = i + 1
    while end < len(content) and content[end] in ' \t':
        end += 1
    if end < len(content) and content[end] == ';':
        end += 1
    newlines_eaten = 0
    while end < len(content) and content[end] == '\n' and newlines_eaten < 2:
        end += 1
        newlines_eaten += 1
    
    content = content[:start] + content[end:]
    return content, True

def add_import(content, var_name):
    if '@/constants/ui-colors' in content:
        return content
    
    if var_name == "C":
        import_line = 'import { C } from "@/constants/ui-colors";'
    else:
        import_line = 'import { UI as SF } from "@/constants/ui-colors";'
    
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
    else:
        return import_line + '\n' + content

def process_file(filepath, var_name):
    full_path = os.path.join(PROJECT, filepath)
    if not os.path.exists(full_path):
        print(f"  SKIP (not found): {filepath}")
        return False
    
    with open(full_path, 'r') as f:
        content = f.read()
    
    if '@/constants/ui-colors' in content:
        print(f"  SKIP (already migrated): {filepath}")
        return False
    
    original = content
    content, removed = remove_color_block(content, var_name)
    if not removed:
        print(f"  WARN (block not removed): {filepath}")
        return False
    
    content = add_import(content, var_name)
    
    if content != original:
        with open(full_path, 'w') as f:
            f.write(content)
        print(f"  OK: {filepath} (removed local {var_name}, added import)")
        return True
    
    print(f"  SKIP (no changes): {filepath}")
    return False

migrated = 0
for filepath, var_name in REMAINING:
    if process_file(filepath, var_name):
        migrated += 1

print(f"\n=== Done: {migrated} migrated ===")
