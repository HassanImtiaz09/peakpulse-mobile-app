# PeakPulse AI — Mobile App Design

## Brand Identity
- **Primary Color**: Deep violet-purple (#7C3AED) with electric blue accents (#3B82F6)
- **Background**: Near-black (#0D0D18) for immersive dark fitness aesthetic
- **Surface**: Dark card (#13131F) with subtle borders
- **Accent**: Neon green (#22C55E) for success/progress, orange (#F97316) for calories/energy
- **Text**: White (#FFFFFF) primary, gray (#9CA3AF) secondary

## Screen List

### Onboarding
1. **Welcome** — App intro, CTA to get started
2. **Profile Setup** — Name, age, height, weight, gender, goal selection
3. **Workout Style** — Gym / Home / Mix / Calisthenics picker
4. **Dietary Preferences** — Halal, Vegan, Vegetarian, Omnivore, Keto, Paleo

### Main Tabs (5 tabs)
1. **Dashboard** (Home) — Overview stats, AI daily insight, quick actions
2. **Plans** — Workout plan + Meal plan tabs
3. **Scan** (Center FAB-style) — AI Body Scan camera entry point
4. **Meal Log** — Manual entry + Photo calorie estimator
5. **Profile** — Progress photos, settings, wearable sync, gym finder

### Screens (accessed from tabs)
- **AI Body Scan** — Camera capture, AI body fat estimation, transformation previews
- **Transformation Detail** — Select target BF%, see AI-generated preview
- **Workout Plan** — 7-day AI-generated plan, exercise cards, log completion
- **Active Workout** — Exercise-by-exercise session tracker
- **Meal Plan** — AI-generated weekly meal plan with macros
- **Meal Prep** — Batch cooking plans based on dietary preferences
- **Meal Log** — Manual entry + Photo AI calorie estimator
- **Food Diary** — Daily calorie/macro tracker
- **Progress Photos** — Grid of progress photos, before/after compare, AI analysis
- **Wearable Sync** — Connect Fitbit, Garmin, WHOOP, Google Fit, Apple Watch
- **Gym Finder** — Map view of nearby gyms using device location
- **Settings** — Profile edit, units, notifications, dietary preferences

## Key User Flows

### Body Scan Flow
User taps Scan tab → Camera opens → Takes full-body photo → AI analyzes → Shows estimated BF% + transformation previews at 5 target levels → User selects target → Redirected to Plans

### Workout Plan Flow
User taps Plans → Workout tab → View 7-day plan → Tap day → See exercises → Tap "Start Workout" → Active session screen → Complete exercises → Session summary

### Meal Log Flow
User taps Meal Log → Choose Manual or Photo → Photo: camera opens → AI estimates calories → Confirm and log → Diary updated

### Progress Tracking Flow
User taps Profile → Progress Photos → Add Photo → AI compares with baseline → Shows commentary on muscle gains, fat loss, posture

### Gym Finder Flow
User taps Profile → Find Gyms → Location permission → Map shows nearby gyms → Tap pin → Gym details (name, distance, phone)

## Color Choices
- Background: `#0D0D18` (deep space black)
- Surface: `#13131F` (dark card)
- Primary: `#7C3AED` (electric violet)
- Secondary: `#3B82F6` (electric blue)
- Accent: `#F97316` (energy orange)
- Success: `#22C55E` (neon green)
- Warning: `#FBBF24` (gold)
- Error: `#EF4444` (red)
- Text: `#FFFFFF` / `#9CA3AF`
