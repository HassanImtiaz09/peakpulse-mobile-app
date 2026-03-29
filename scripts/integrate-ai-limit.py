#!/usr/bin/env python3
"""
Integrate useAiLimit into screens that have AI-related tRPC mutations.
Adds import + replaces direct Alert.alert("Error", e.message) in catch blocks
with AI_LIMIT_EXCEEDED check first.
"""
import re, os

# Screens that use AI mutations and should get the AI limit modal
AI_SCREENS = [
    "app/(tabs)/ai-coach.tsx",
    "app/(tabs)/meals.tsx",
    "app/(tabs)/plans.tsx",
    "app/(tabs)/scan.tsx",
    "app/ai-coach.tsx",
    "app/daily-checkin.tsx",
    "app/form-checker.tsx",
    "app/meal-prep.tsx",
    "app/onboarding.tsx",
    "app/scan-receipt.tsx",
    "app/active-workout.tsx",
    "app/progress-photos.tsx",
]

BASE = "/home/ubuntu/peakpulse-mobile"

for rel in AI_SCREENS:
    path = os.path.join(BASE, rel)
    if not os.path.exists(path):
        print(f"  SKIP: {rel} (not found)")
        continue
    
    with open(path, "r") as f:
        content = f.read()
    
    changed = False
    
    # 1. Add import if not present
    if 'useAiLimit' not in content:
        # Find last import line
        lines = content.split('\n')
        last_import_idx = 0
        for i, line in enumerate(lines):
            if line.startswith('import ') or line.startswith('} from '):
                last_import_idx = i
        
        lines.insert(last_import_idx + 1, 'import { useAiLimit } from "@/components/ai-limit-modal";')
        content = '\n'.join(lines)
        changed = True
        print(f"  OK: {rel} (import added)")
    else:
        print(f"  SKIP: {rel} (import already present)")
    
    # 2. Add useAiLimit() hook call if not present
    if 'useAiLimit()' not in content:
        # Find the first useState or useRouter call and add after it
        hook_pattern = r'(const \[.*?\] = useState.*?;|const router = useRouter\(\);)'
        match = re.search(hook_pattern, content)
        if match:
            insert_pos = match.end()
            content = content[:insert_pos] + '\n  const { showLimitModal } = useAiLimit();' + content[insert_pos:]
            changed = True
            print(f"  OK: {rel} (hook added)")
        else:
            print(f"  WARN: {rel} (no hook insertion point found)")
    
    if changed:
        with open(path, "w") as f:
            f.write(content)

print("\n=== Done: AI limit modal integration ===")
print("NOTE: Actual catch block replacement requires manual review per screen.")
