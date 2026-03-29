#!/usr/bin/env python3
"""
Wire AI_LIMIT_EXCEEDED handling into catch blocks across all 12 AI screens.

Strategy: In each catch block that calls Alert.alert("Error", ...) in an AI-related
mutation/function, add a check for AI_LIMIT_EXCEEDED before the Alert.

Pattern to inject:
  } catch (e: any) {
+   if (e?.message?.includes?.("AI_LIMIT_EXCEEDED") || e?.message?.includes?.("rate limit")) {
+     showLimitModal(e.message);
+     return;
+   }
    Alert.alert("Error", e.message);
  }

Also handle onError callbacks:
  onError: (e) => Alert.alert("Error", e.message),
becomes:
  onError: (e) => { if (e?.message?.includes?.("AI_LIMIT_EXCEEDED") || e?.message?.includes?.("rate limit")) { showLimitModal(e.message); return; } Alert.alert("Error", e.message); },
"""
import re, os

BASE = "/home/ubuntu/peakpulse-mobile"

AI_SCREENS = [
    "app/(tabs)/ai-coach.tsx",
    "app/(tabs)/meals.tsx",
    "app/(tabs)/plans.tsx",
    "app/(tabs)/scan.tsx",
    "app/active-workout.tsx",
    "app/ai-coach.tsx",
    "app/daily-checkin.tsx",
    "app/form-checker.tsx",
    "app/meal-prep.tsx",
    "app/onboarding.tsx",
    "app/progress-photos.tsx",
    "app/scan-receipt.tsx",
]

AI_LIMIT_CHECK = 'if (e?.message?.includes?.("AI_LIMIT_EXCEEDED") || e?.message?.includes?.("rate limit")) { showLimitModal(e.message); return; }'

total_changes = 0

for rel in AI_SCREENS:
    path = os.path.join(BASE, rel)
    if not os.path.exists(path):
        print(f"  SKIP: {rel} (not found)")
        continue
    
    with open(path, "r") as f:
        content = f.read()
    
    counter = [0]
    
    # Pattern 1: onError: (e) => Alert.alert("Error", e.message)
    pattern1 = r'onError:\s*\(e\)\s*=>\s*Alert\.alert\("Error",\s*e\.message\)'
    def replace_onError(m):
        full = m.group(0)
        if "AI_LIMIT_EXCEEDED" in full or "showLimitModal" in full:
            return full
        counter[0] += 1
        return f'onError: (e) => {{ {AI_LIMIT_CHECK} Alert.alert("Error", e.message); }}'
    content = re.sub(pattern1, replace_onError, content)
    
    # Pattern 2: onError: (e) => { Alert.alert("Error", e.message); }
    pattern2 = r'onError:\s*\(e\)\s*=>\s*\{\s*Alert\.alert\("Error",\s*e\.message\);?\s*\}'
    def replace_onError2(m):
        full = m.group(0)
        if "AI_LIMIT_EXCEEDED" in full or "showLimitModal" in full:
            return full
        counter[0] += 1
        return f'onError: (e) => {{ {AI_LIMIT_CHECK} Alert.alert("Error", e.message); }}'
    content = re.sub(pattern2, replace_onError2, content)
    
    # Pattern 3: catch (e: any) { ... Alert.alert("Error", e.message ... ) ... }
    # We need to add the AI_LIMIT_CHECK right after the catch opening
    # This is trickier because the catch block can be multi-line
    # Strategy: find "catch (e: any) {" or "catch (e) {" and the next Alert.alert("Error"
    # Insert the check between them
    
    # Simpler approach: find lines with Alert.alert("Error" or Alert.alert("Analysis Failed" 
    # in catch context and add the check before them
    lines = content.split('\n')
    new_lines = []
    i = 0
    while i < len(lines):
        line = lines[i]
        stripped = line.strip()
        
        # Check if this line has an Alert.alert in what looks like a catch error handler
        # and doesn't already have AI_LIMIT_EXCEEDED check
        if ('Alert.alert("Error"' in stripped or 'Alert.alert("Analysis Failed"' in stripped or 
            'Alert.alert("Scan Failed"' in stripped or 'Alert.alert("Generation Failed"' in stripped):
            # Check if previous lines indicate we're in a catch block
            in_catch = False
            for j in range(max(0, i-5), i):
                if 'catch' in lines[j] and ('e:' in lines[j] or 'e)' in lines[j] or 'err' in lines[j]):
                    in_catch = True
                    break
            
            # Also check if this is an onError callback (already handled above)
            is_onError = 'onError' in stripped
            
            # Check if AI_LIMIT_EXCEEDED check already exists nearby
            already_checked = False
            for j in range(max(0, i-3), i):
                if 'AI_LIMIT_EXCEEDED' in lines[j] or 'showLimitModal' in lines[j]:
                    already_checked = True
                    break
            
            if in_catch and not is_onError and not already_checked:
                # Get the indentation of the current line
                indent = len(line) - len(line.lstrip())
                indent_str = ' ' * indent
                # Insert the AI limit check before this line
                new_lines.append(f'{indent_str}if (e?.message?.includes?.("AI_LIMIT_EXCEEDED") || e?.message?.includes?.("rate limit")) {{ showLimitModal(e.message); return; }}')
                counter[0] += 1
        
        new_lines.append(line)
        i += 1
    
    content = '\n'.join(new_lines)
    
    changes = counter[0]
    if changes > 0:
        with open(path, "w") as f:
            f.write(content)
        total_changes += changes
        print(f"  OK: {rel} ({changes} AI limit checks added)")
    else:
        print(f"  SKIP: {rel} (no changes needed)")

print(f"\n=== Done: {total_changes} AI limit checks wired ===")
