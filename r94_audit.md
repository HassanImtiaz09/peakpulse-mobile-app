# Round 94 Audit: Missing Features from Dashboard

## Pre-overhaul sections (from Round 91 / commit 55f8204):
1. Hero Header with streak badge ✅ (kept)
2. Today's Workout card ✅ (kept)
3. Today's Nutrition / Calorie Progress ✅ (kept as Daily Progress)
4. Stats Ring Row (streak, workouts, calories) → partially in Weekly Goals
5. Transformation Progress Ring → MISSING
6. BF% Estimate Card → MISSING
7. **Wearable Metrics Panel** → MISSING (was always visible)
8. Weekly Goal Progress Rings ✅ (kept)
9. Streak Badge (detailed) → partially in Quick Insights
10. **Progress Photos Tile** → moved to Explore grid as "Progress"
11. **AI Coach Animated Card** → moved to Explore grid + Quick Insights
12. Milestone Celebration Modal → MISSING
13. **Quick Actions (grouped categories)** → MISSING entirely:
    - Workout & Recovery: My Plans, Workout Calendar, Rest Timer, Voice Coach, Workout Analytics
    - Nutrition: My Meals, AI Calorie Scan, **My Pantry**, Meal Prep
    - Body & Progress: Body Scan, Progress Photos, Body Measurements, Personal Records
    - Tools & Settings: **Wearables**, Gym Finder, Notification Settings
    - **Social & Challenges**: 7-Day Challenge, Challenges, **Social Circle**
14. **Muscle Balance Heatmap** → MISSING
15. **Suggested Exercises** → MISSING
16. **Muscle Balance Trend Chart** → MISSING
17. **Personal Records section** → MISSING (only in Explore grid)
18. **Tips & Tricks** → MISSING
19. **Premium Feature Promotions** → MISSING
20. Trial/Guest banners ✅ (kept)

## Features MISSING from current dashboard:
- My Pantry (not in Explore grid or Quick Actions)
- Wearable Metrics Panel + Wearables link
- Social Circle / Social features
- 7-Day Challenge / Challenges
- Muscle Balance Heatmap (was a key visual)
- Personal Records section (detailed, not just Explore tile)
- Transformation Progress Ring
- BF% Estimate Card
- Tips & Tricks
- Premium Feature Promotions/Teasers
- Milestone Celebration Modal
- Quick Actions grouped categories (the entire section is gone)

## Explore Grid currently has 6 tiles:
Analytics, Body Scan, Progress, AI Coach, Calendar, Find Gym

## MUST ADD to Explore Grid or Dashboard:
- My Pantry
- Wearables
- Social Circle
- Challenges
- Personal Records
- Voice Coach (currently only in Quick Insights)
- Rest Timer Settings
- Meal Prep

## Exercise GIF Issues:
- GIFs are not animated (static images)
- No side views for exercises
- Need to fix the exercise-demos.ts to provide animated GIFs with multiple angles
