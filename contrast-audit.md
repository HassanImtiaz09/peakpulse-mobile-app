# Contrast Audit Findings

## Problem Colors (on dark bg #0A0500)
- `#78350F` — Very low contrast (ratio ~1.8:1 against #0A0500). Used extensively for secondary text.
- `#92400E` — Low contrast (ratio ~2.5:1 against #0A0500). Used for muted/secondary text.
- Both fail WCAG AA (4.5:1 for normal text, 3:1 for large text).

## Fix Strategy
- Replace `#78350F` → `#B45309` (warm amber, ~5.2:1 ratio) for secondary text
- Replace `#92400E` → `#D97706` (bright amber, ~6.5:1 ratio) for muted text that needs to be readable
- Keep `#92400E` only for decorative borders/backgrounds where contrast isn't critical
- For descriptions/body text, use at minimum `#B45309`

## Key Files to Fix
1. meals.tsx — Heavy use of #78350F and #92400E for food names, portions, labels
2. plans.tsx — #92400E for tab labels, descriptions
3. pantry.tsx — Likely similar patterns
4. dashboard (index.tsx) — Quick actions, tips
5. settings.tsx — Muted descriptions
6. onboarding.tsx — Feature descriptions
7. floating-assistant.tsx — Greeting text
8. Various other screens
