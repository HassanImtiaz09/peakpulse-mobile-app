# PeakPulse AI — TODO

## Core Setup
- [x] Configure theme colors (dark fitness aesthetic — deep black/purple)
- [x] Set up tab navigation (5 tabs: Home, Scan, Plans, Meals, Profile)
- [x] Configure icon mappings for all tabs and screens
- [x] Update app.config.ts branding (PeakPulse AI)
- [x] Generate and set app logo (lightning bolt + pulse line)

## Onboarding
- [x] Welcome screen (login/get started)
- [x] Profile setup screen (age, height, weight, goal)
- [x] Workout style picker
- [x] Dietary preferences screen

## Dashboard (Home Tab)
- [x] Dashboard screen with stats overview
- [x] AI daily insight card
- [x] Quick action buttons (6 shortcuts)
- [x] Wearable data display (steps, calories, HR, sleep)
- [x] Streak and XP gamification
- [x] Today's workout preview
- [x] Calorie progress bar

## AI Body Scan
- [x] Body scan camera/gallery screen
- [x] AI body fat analysis (server-side LLM with image)
- [x] Transformation previews (5 BF% levels: 10/12/15/20/25%)
- [x] Target selection and save to profile
- [x] AI-generated transformation image per level (server-side image generation)

## Workout Plans
- [x] AI workout plan generation (server-side LLM)
- [x] 7-day plan display with exercise cards
- [x] Workout style selection (gym/home/mix/calisthenics)
- [x] Goal selection (build muscle/lose fat/maintain/athletic)
- [x] Days per week selection (3-6)
- [x] Active workout session screen with timer and exercise tracking
- [x] Exercise completion tracking and session logging

## Meal Plans
- [x] AI meal plan generation (server-side LLM)
- [x] Weekly meal plan display with macros (calories/protein/carbs/fat)
- [x] Dietary preference integration (halal/vegan/vegetarian/keto/paleo/omnivore)
- [x] Expandable day cards with meal details

## Meal Prep
- [x] Meal prep plan generation based on dietary choices
- [x] Halal / Vegan / Vegetarian / Keto / Paleo / Omnivore options
- [x] Ingredient lists and batch cooking instructions
- [x] Shopping list generation
- [x] Servings per recipe selector

## Meal Log & Food Diary
- [x] Manual meal entry form
- [x] Photo calorie estimator (camera + AI)
- [x] Daily food diary with macro totals
- [x] Calorie goal progress bar
- [x] Meal type categorization (breakfast/lunch/dinner/snack)

## Progress Tracking
- [x] Progress photos grid screen
- [x] Camera capture for new progress photo
- [x] Baseline photo designation
- [x] AI commentary on progress (comparing to baseline)
- [x] Photo notes and timestamps

## Wearable Sync
- [x] Wearable provider list (Apple Health, Fitbit, Garmin, Google Fit, WHOOP, Samsung Health)
- [x] Connection flow with simulated OAuth
- [x] Display synced metrics (steps, calories, HR, sleep, HRV, recovery)
- [x] Last sync timestamp display
- [x] Disconnect device option

## Gym Finder
- [x] Location permission request
- [x] Map view with nearby gym markers (react-native-maps)
- [x] Gym detail card (name, distance, phone, website, hours)
- [x] OpenStreetMap/Overpass API integration
- [x] Radius filter (1km/2km/5km/10km)
- [x] Open in Maps / Call gym actions

## Settings & Profile
- [x] Profile edit (age, gender, height, weight)
- [x] Fitness goal selection
- [x] Workout style preference
- [x] Dietary preferences edit
- [x] Quick links to all features
- [x] Sign out functionality

## Backend / Server
- [x] Database schema (user profiles, fitness plans, meal logs, progress photos, workout sessions, body scans)
- [x] tRPC routes for all AI features
- [x] LLM integration for body scan analysis
- [x] LLM integration for workout plan generation
- [x] LLM integration for meal plan generation
- [x] LLM integration for calorie estimation from photo
- [x] LLM integration for progress photo analysis
- [x] LLM integration for meal prep generation
- [x] Image generation for body transformation previews
- [x] S3 file storage for photos
- [x] Daily AI coaching insight endpoint

## New Requests (Round 2)

- [x] Add email/password login option (not just Google OAuth)
- [x] Add guest/skip mode — user can use app without any account
- [x] Update onboarding to offer: Google, Email, or Skip options
- [x] Store guest profile locally in AsyncStorage
- [x] Fix body scan flow: after analysis show "Create My Plan" CTA that navigates to workout/meal plan generation
- [x] Body scan results page: add goal selection, workout style picker, dietary prefs, then generate plans
- [x] Full UI redesign: spectacular premium fitness aesthetic (nano banana image-based style)
- [x] Redesign Dashboard with hero gradient, stats cards, animated feel
- [x] Redesign Body Scan screen with immersive camera UI
- [x] Redesign Plans screen with premium card design
- [x] Redesign Meals screen with rich food imagery style
- [x] Redesign Profile screen with sleek settings UI
- [x] Redesign onboarding/login with full-screen gradient hero

## Bug Fixes (Round 3)

- [x] Fix "Please login (10001)" error in guest mode for all AI features
- [x] Body scan: AI analysis must work for guest users (no auth required)
- [x] Workout plan generation: must work for guest users (store locally)
- [x] Meal plan generation: must work for guest users (store locally)
- [x] Meal log / calorie estimator: must work for guest users (store locally)
- [x] Progress photos: must work for guest users (store locally)
- [x] Profile save: must work for guest users (store locally)

## Feature Fixes (Round 4)

- [x] First-launch onboarding flow (shown only once, gated by AsyncStorage flag)
- [x] Onboarding: welcome slides → name/goal → workout style → dietary prefs → done
- [x] Merge meal prep into meal plan: each meal card has a "How to Prep" expandable section
- [x] Meal plan: AI-fetched meal photos (Unsplash/Pexels) shown per meal card
- [x] Meal plan generated from user's workout plan choice (goal + style)
- [x] Wearable sync: open real health apps via deep links (Apple Health, Google Fit, Fitbit, etc.)
- [x] Wearable sync: show honest connection state, no fake data injection

## Feature Additions (Round 5)

- [x] Exercise form checker: real-time AI video analysis integrated into workout plans
- [x] Exercise form checker: form quality bar (red/amber/green) updating in real time
- [x] Fix meal log calorie estimator: camera AI analysis must work end-to-end
- [x] Meal log: save food photo to daily log
- [x] Meal log: real-time calorie progress sync to dashboard (calories consumed + remaining)
- [x] Subscription plans screen: Basic and Advanced tiers with feature gating
- [x] Stripe integration: collect subscription fees into owner's Stripe account
- [x] Social feed / challenge tab: share progress (weight, BF%, before/after photos)
- [x] Daily body photo incentive: AI BF% assessment + motivational message per photo
- [x] Meal log visual redesign: NanoBanana food images per meal + embedded recipe in dropdown
- [x] Market research report: competitor analysis + revenue estimate document

## Feature Additions (Round 6)

- [x] Body scan: fullscreen transformation preview with pinch-to-zoom and before/after swipe comparison
- [x] Body scan: enlarged image modal when user taps a transformation card
- [x] Push notifications: daily workout reminder at user-preferred time
- [x] Push notifications: meal log nudge if no meal logged by noon/evening
- [x] 7-day challenge onboarding sequence (guided first week: 1 workout + 1 meal log + 1 progress photo)
- [x] Dashboard: animated SVG progress rings (calories, steps, water, protein)
- [x] Offline workout caching: store last generated plan in AsyncStorage for offline access
- [x] AI plan disclaimers on all generated workout and meal plans
- [x] Subscription: annual plan option ($39.99/yr Basic, $79.99/yr Advanced) with savings badge
- [x] Referral programme: unique referral link + 1 free month for both referrer and referee
- [x] Social feed: seed with AI-generated example posts (clearly labelled) until real users populate
- [x] Social feed: weekly challenges with leaderboard (log 5 workouts, hit protein goal 7 days)
- [x] Ramadan/halal mode: fasting-aware meal timing, prayer-time workout scheduling
- [ ] Stripe secret integration: STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET via secrets panel (pending — user to configure)

## Follow-Up Integrations (Round 7)

- [ ] Stripe: add STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET via secrets panel
- [ ] Stripe: server-side checkout session creation for Basic and Advanced plans
- [ ] Stripe: webhook handler for subscription activation/cancellation
- [ ] Stripe: subscription status stored in DB and surfaced in Profile
- [x] Notification preferences screen: custom workout reminder time picker
- [x] Notification preferences screen: custom meal log nudge time picker
- [x] Notification preferences: persist to AsyncStorage and reschedule notifications on change
- [x] Profile: link to Notification Preferences screen
- [ ] App Store submission guide added to README

## UI Rebrand — Platinum Pulse (Round 8)

- [x] Generate 5 premium UI concept mockups (Obsidian Forge, Aurora Titan, Crimson Apex, Platinum Pulse, Solar Storm)
- [x] User selected Concept 4 — Platinum Pulse
- [x] Install Syne and Inter Google Fonts via @expo-google-fonts
- [x] Load Syne + Inter fonts in _layout.tsx with SplashScreen.preventAutoHideAsync
- [x] Update theme.config.js to Platinum Pulse silver/monochrome palette
- [x] Redesign tab bar: silver icon highlights, glass border, Inter_500Medium labels
- [x] Rebuild Dashboard screen with Platinum Pulse hero, Syne headings, silver rings
- [x] Apply Platinum Pulse colour substitutions to all 17 screens (Python script)
- [x] Upload and wire Platinum Pulse hero backgrounds for all 5 tabs (CDN)
- [x] Update splash screen background to #080B0F (Platinum Pulse dark)
- [x] Zero TypeScript errors after full rebrand

## UI Rebrand — Aurora Titan (Round 9)

- [ ] Generate Aurora Titan hero backgrounds for all 5 tabs
- [ ] Install DM Sans + Outfit Google Fonts
- [ ] Update theme.config.js to Aurora Titan emerald/teal palette
- [ ] Rebuild tab bar with Aurora Titan design
- [ ] Rebuild Dashboard screen with Aurora Titan UI
- [ ] Apply Aurora Titan colour + font substitutions to all 17 screens
- [ ] Upload and wire Aurora Titan hero backgrounds (CDN)
- [ ] Update splash screen background to Aurora Titan dark colour

## UI Rebrand — Aurora Titan (Round 9) — COMPLETED

- [x] Generate Aurora Titan hero backgrounds for all 5 tabs (aurora borealis aesthetic)
- [x] Install DM Sans + Outfit Google Fonts
- [x] Update theme.config.js to Aurora Titan emerald/teal palette (#10B981 / #0D9488)
- [x] Rebuild tab bar with Aurora Titan design (emerald glow dot, teal border)
- [x] Rebuild Dashboard screen with Aurora Titan UI (Outfit headings, DM Sans body)
- [x] Apply Aurora Titan colour + font substitutions to all 17 screens
- [x] Wire Aurora Titan hero backgrounds to all tab screens
- [x] Update splash screen background to #060F0A (Aurora Titan forest black)
- [x] Zero TypeScript errors after full rebrand

## Solar Forge Theme + Onboarding Overhaul + Meal Swap

- [x] Generate Solar Forge hero backgrounds for all 5 tabs (gold/orange/red/black)
- [x] Generate 4 unique onboarding athlete backgrounds (halo/dramatic lighting, different exercise per slide)
- [x] Apply Solar Forge theme across all 17 screens (gold #F59E0B, orange #EA580C, red #DC2626, black #0A0500)
- [x] Rebuild onboarding: 4 slides each with unique athlete background
- [x] Add photo capture step to onboarding (AI body scan preview)
- [x] Post-onboarding redirect: trigger AI plan generation and take user to Dashboard with plans ready
- [x] Add Meal Swap feature to Meals tab with calorie-equivalent alternatives list
- [x] Meal Swap: calorie-equivalent swap suggestions with matching macros and dietary tags

## Fixes & Features (Round 10)

- [x] Onboarding body scan: after photo capture, generate AI transformation images at different BF% (10/12/15/20/25%)
- [x] Onboarding: skip transformation images if goal is "maintain"
- [x] Onboarding: user picks preferred body target from transformation images
- [x] Onboarding: after target selection, generate AI workout + meal plan and display as first screen
- [x] Meals tab: each meal card shows its own unique food photo (not the same image for all)
- [x] Meal Swap: selecting an alternative shows full meal prep instructions for that swap
- [x] User Guide screen: accessible from top-corner help button (?) on all tab screens
- [x] Dashboard: rotating Tips & Tricks tile that changes every 5 minutes

## AI Meal Swap Enhancement (Round 11)

- [x] Server: add mealSwap.generate tRPC mutation (LLM generates 6 calorie-equivalent alternatives)
- [x] Server: mutation accepts meal name, calories, macros, dietary preference, and fitness goal
- [x] Server: each alternative includes name, calories, protein, carbs, fat, dietary tags, prep time, and step-by-step instructions
- [x] meals.tsx: replace static SWAP_ALTERNATIVES with AI-generated results from the mutation
- [x] meals.tsx: show loading state while AI generates alternatives
- [x] meals.tsx: show error/fallback if AI call fails
- [x] meals.tsx: tap alternative to see full prep detail before confirming swap

## Subscription Plans & Feature Gating (Round 12)

- [x] Update annual pricing: Basic £3.49/mo (billed £41.88/yr, save 30%), Advanced £6.99/mo (billed £83.88/yr, save 30%)
- [x] Subscription screen: show annual savings badge, monthly equivalent price, and total billed per year
- [x] Define feature tier matrix: Free / Basic / Advanced
- [x] Feature gate: Form Checker — Advanced only
- [x] Feature gate: Social Feed & Challenges — Advanced only
- [x] Feature gate: Progress Photos — Basic and above
- [x] Feature gate: Wearable Sync — Basic and above
- [x] Feature gate: 7-Day Challenge — Advanced only
- [x] Add PaywallModal component (reusable) shown when free/guest user taps locked feature
- [x] Add useSubscription hook reading plan tier from AsyncStorage
- [x] Dashboard: paywall gates on Progress, Wearables, Form Check, Community, 7-Day Challenge quick actions
- [x] Profile: paywall gates on all locked feature links
- [x] Zero TypeScript errors after paywall implementation

## 7-Day Free Trial — Advanced Plan (Round 13)

- [x] useSubscription hook: add trialStartDate, trialEndDate, isTrialActive, daysLeftInTrial, hasUsedTrial, isPaid, hasAdvancedAccess fields
- [x] useSubscription hook: startTrial() function that writes trial start to AsyncStorage
- [x] useSubscription hook: canAccess() treats active trial as Advanced tier
- [x] Subscription screen: "Start 7-Day Free Trial" CTA for Advanced plan (shown when no trial used)
- [x] Subscription screen: trial countdown badge when trial is active ("X days left")
- [x] Subscription screen: "Trial Expired — Upgrade to Keep Access" state after trial ends
- [x] Dashboard: trial status banner (days remaining, Subscribe CTA)
- [x] Dashboard: expired trial banner (Upgrade CTA)
- [x] PaywallModal: offer "Start Free Trial" as primary CTA for Advanced features (trial not yet used)
- [x] PaywallModal: startTrial() on tap, dismiss modal with success alert
- [x] PaywallModal: fall back to Upgrade CTA when trial already used or for Basic features
- [x] Zero TypeScript errors after full trial implementation

## Day 5 Trial Reminder Push Notification (Round 14)

- [x] Read Expo notifications docs and audit existing notification setup
- [x] Add scheduleTrialReminders(trialStartDate) and cancelTrialReminders() to lib/notifications.ts
- [x] Day 5 notification: fires at 10:00 AM on day 5 of trial, deep links to /subscription
- [x] Day 7 notification: fires at 09:00 AM on last day of trial as final warning
- [x] Wire scheduleTrialReminders() into useSubscription startTrial() — fire-and-forget
- [x] Wire cancelTrialReminders() into useSubscription setSubscription() — cancels on paid upgrade
- [x] Request notification permissions before scheduling (graceful fallback if denied)
- [x] useNotificationDeepLink hook in _layout.tsx: handles cold-start and foreground notification taps
- [x] Notification tap navigates to /subscription screen via router.push
- [x] Zero TypeScript errors

## Referral Program (Round 15)

- [ ] Referral service: generate unique 8-char alphanumeric code per user, persist to AsyncStorage
- [ ] Referral service: build shareable deep-link URL (peakpulse://referral?code=XXXX)
- [ ] Referral service: share via native share sheet (expo-sharing)
- [ ] Referral service: detect referral code on app launch via deep link
- [ ] useSubscription: support 14-day referral trial (trialDays param in startTrial)
- [ ] Onboarding: detect referral code from launch URL, apply 14-day trial on completion
- [ ] Referral screen: display unique code, copy-to-clipboard, share button
- [ ] Referral screen: referral stats (how many friends joined, rewards earned)
- [ ] Referral screen: reward tiers info (1 referral = 1 month free, etc.)
- [ ] Profile: link to Referral screen (already gated to Advanced)
- [ ] Zero TypeScript errors

## Referral Program (Round 15) — COMPLETED

- [x] lib/referral.ts: loadOrCreateReferralData, shareReferralCode, buildReferralUrl, applyPendingReferral
- [x] useSubscription hook: startTrial(durationDays) supports custom duration (7 default, 14 for referral)
- [x] _layout.tsx: useReferralDeepLink hook detects incoming referral code on app launch
- [x] onboarding.tsx: applyPendingReferral() called on finish — grants 14-day trial if referral code present
- [x] referral.tsx: rebuilt with referral service, 14-day trial messaging, REWARD_TIERS, progress bar
- [x] Referral screen: "How It Works" step 3 updated to mention 14-day trial for friends
- [x] Referral screen: hero subtitle updated to highlight 14-day friend benefit
- [x] Zero TypeScript errors

## Round 16 — Bug Fixes & New Features

- [ ] BF% model tap shows full-body AI-generated image (fullscreen preview)
- [ ] Meal plan calorie targets personalised: weight, height, age, gender, activity level, goal BF%
- [ ] Dashboard BF% estimate card from recent progress photo logs (AI analysis)
- [ ] Post-onboarding visual reminder screen: initial photo vs AI target body image side-by-side
- [ ] AI Form Check in workout section (camera-based rep analysis with AI feedback)
- [ ] AI Coach feature: routine form analysis, progress insights, personalised tips based on track record

## Round 16 — Bug Fixes & New Features
- [x] BF% model tap opens fullscreen AI-generated body image
- [x] Meal plan calorie targets use personalised TDEE (Mifflin-St Jeor) based on user profile
- [x] Dashboard shows BF% estimate card from latest body scan with target comparison
- [x] Post-onboarding transformation-reminder screen shows initial photo vs AI target body
- [x] AI Form Check button added directly inside workout section (plans tab)
- [x] AI Coach screen built: insights tab (form analysis, progress, tips, weekly plan, milestone) + chat tab
- [x] AI Coach server routes: getInsights + chat with full context awareness
- [x] Meal plan generation in plans.tsx now passes user profile metrics to server

## Round 17 — Progress Photo Comparison
- [x] Progress tab: swipe/drag-to-reveal comparison slider between first and latest photo

## Round 18 — Progress Collage Export
- [x] Progress tab: export branded side-by-side collage (first + latest) to camera roll and share sheet

## Round 19 — Collage Caption
- [x] Pre-filled editable caption sheet before collage share: auto-generated from profile, copy to clipboard + share

## Round 20 — Collage Enhancements
- [x] Weight & BF% delta overlays on live comparison card and exported collage
- [x] Timeline scrubber: select any two months to compare, drives comparison slider
- [x] Collage export reflects scrubber-selected photos + stats overlay

## Round 21 — Onboarding Fixes & New Screens
- [ ] Fix BF% estimation: body scan AI route must use photo + body metrics (weight, height, age, gender) to compute accurate BF%
- [ ] Fix calorie sync: dashboard calorie target must read TDEE saved during onboarding, not hardcoded 2000 kcal
- [x] Post-onboarding summary screen: show AI workout plan, meal recommendations, and before/after target photo
- [x] Subscription plan selection screen: Free Trial (14 days) / Basic / Advanced shown once after summary
- [x] First-time dashboard tutorial overlay: walkthrough of tabs and feature highlights per plan

## Round 21
- [ ] Fix BF% estimation from photo + body metrics
- [ ] Fix calorie sync dashboard vs onboarding TDEE
- [x] Post-onboarding summary screen
- [x] Subscription plan selection screen
- [x] First-time dashboard tutorial overlay

## Round 22
- [x] BF% commentary in onboarding photo analysis
- [x] Exercise demo videos in workout day view
- [ ] Fullscreen active exercise timer screen with demo video
- [ ] Per-session AI Coach & Form Check (Advanced-only, 3-day trial) in workout sessions

## Round 22
- [x] BF% commentary in onboarding photo analysis
- [x] Exercise demo videos in workout day view
- [ ] Fullscreen active exercise timer screen with demo video
- [ ] Per-session AI Coach & Form Check (Advanced-only, 3-day trial)

## Round 23 — Body Scan Photo Fix + Auto Plan Generation

- [x] Bug fix: onboarding body scan shows stale/old photo in transformation previews instead of the newly captured photo
- [x] Bug fix: AI transformation image generation hides the user's face — prompt must preserve full face and body likeness
- [x] Feature: persistent AI target body image reference visible on dashboard or body scan screen (goal visualization)
- [x] Feature: auto-generate workout and meal plans during onboarding completion (no manual "Generate" button needed)
- [x] Feature: display auto-generated plans in workout and meal tabs immediately after onboarding

## Round 24 — Regenerate Plans, 7-Day Meal Selector, Social Share Target Image

- [x] Feature: Add "Regenerate Plans" button to the plans tab for refreshing AI workout plans after goal changes
- [x] Feature: Add "Regenerate Plans" button to the meals tab for refreshing AI meal plans after goal changes
- [x] Feature: 7-day meal plan day selector in the meals tab — browse all days of the AI-generated meal plan
- [x] Feature: Social sharing for AI target body image on the dashboard (share to social media)

## Round 25 — Shopping List, Save to Photo Library, Regenerate Workout on Meals Tab

- [x] Feature: Weekly meal prep shopping list aggregating ingredients across all 7 days of the AI meal plan into a checklist
- [x] Feature: Save target body image to device photo library using expo-media-library (alongside share option on dashboard)
- [x] Feature: Add "Regenerate Workout Plan" button on the meals tab so users can refresh both plans from one place

## Round 26 — Shopping List Persistence, Copy to Clipboard, Exercise Video Previews

- [x] Feature: Persist shopping list checked items to AsyncStorage so they survive app restarts
- [x] Feature: Add "Copy to Clipboard" button on the weekly shopping list for pasting into other apps
- [x] Feature: Add exercise video/GIF previews to workout plan cards for correct form guidance

## Round 27 — Workout Completion Tracking, Water Intake Tracker, Push Notification Reminders

- [x] Feature: Workout completion tracking — mark workout days as completed with AsyncStorage persistence
- [x] Feature: Weekly progress ring on the plans tab showing completed vs total workout days
- [x] Feature: Water intake tracker on the meals tab with daily goal, quick-add buttons, and progress display
- [x] Feature: Push notification reminders for upcoming workouts and meal times based on user's plan schedule

## Round 28 — Barcode Scanner for Meal Log

- [x] Feature: Barcode scanner screen using expo-camera with barcode detection
- [x] Feature: Open Food Facts API integration to look up nutrition data from barcodes
- [x] Feature: Barcode scan result card showing product name, calories, protein, carbs, fat
- [x] Feature: Quick-add scanned food item to meal log with one tap
- [x] Feature: Scan button accessible from the meals tab for easy access

## Round 29 — Barcode Scan History + Favourites/Frequent Foods

- [x] Feature: Barcode scan history persisted in AsyncStorage — stores last 50 scanned products
- [x] Feature: Scan history UI in barcode scanner screen with quick re-log button per item
- [x] Feature: Favourites/frequent foods list on the meals tab Log section
- [x] Feature: Add to favourites button on logged meals and scanned products
- [x] Feature: One-tap logging from favourites list with correct macros
- [x] Feature: Remove from favourites functionality

## Round 30 — Custom Food Entry

- [x] Feature: Custom food entry form with name, calories, protein, carbs, fat, and serving size fields
- [x] Feature: Meal type selector (breakfast/lunch/dinner/snack) for custom entries
- [x] Feature: Save custom food entry to meal log with full macro data
- [x] Feature: Option to save custom food to favourites for quick re-logging
- [x] Feature: Input validation for nutritional fields (numeric, non-negative)

## Round 31 — Nutrition Charts + Meal Photo Gallery

- [x] Feature: Daily nutrition summary chart showing calorie intake vs goal with bar chart
- [x] Feature: Weekly nutrition trend chart showing 7-day calorie and macro history
- [x] Feature: Toggle between daily and weekly chart views
- [x] Feature: Macro breakdown pie/donut chart (protein, carbs, fat percentages)
- [x] Feature: Meal photo gallery screen collecting all AI-estimated meal photos
- [x] Feature: Food diary timeline with date grouping and meal type labels
- [x] Feature: Tap photo to view fullscreen with meal details and macros
- [x] Feature: Navigation to photo gallery from meals tab

## Round 32 — Hooks Bug Fix + Comprehensive Bug Check

- [x] BUG: "Rendered more hooks than during the previous render" error in onboarding.tsx:543 — useEffect inside conditional step rendering
- [x] Task: Run comprehensive bug check across all app files for similar hook violations and other issues
- [x] BUG: Notifications.getLastNotificationResponse() used as sync but is async — crashes on native cold-start (_layout.tsx)
- [x] BUG: useRouter() called before navigator is mounted in deep-link hooks (_layout.tsx)
- [x] BUG: JSON.parse(params.dayData) in active-workout.tsx lacks try/catch — crashes on malformed params
- [x] AUDIT: Verified all router.push route paths match existing route files (16 routes checked)

## Round 33 — Four Critical Fixes

- [x] FIX: AI Form Check — video uploads to Gemini File API via resumable upload instead of raw base64 in-body
- [x] FIX: Meal Log Calories — macro formula (p×4 + c×4 + f×9) + server-side recalculation validates every food item
- [x] FIX: Exercise Demo Videos — replace broken Pixabay CDN URLs with YouTube search links (70+ exercises mapped)
- [x] FIX: Body Transformation Images — sequential generation with retries + backoff prevents rate limit failures

## Round 34 — Workout Calendar + Saved Foods

- [x] Workout History Calendar: new screen with monthly calendar view showing completed workout days
- [x] Workout History Calendar: streak tracking (current streak, longest streak, total workouts)
- [x] Workout History Calendar: day detail view showing exercises completed on tapped date
- [x] Workout History Calendar: month navigation (prev/next)
- [x] Workout History Calendar: visual indicators (dots/fills) for workout days
- [x] Saved Foods: save frequently logged foods to favorites list (AsyncStorage)
- [x] Saved Foods: one-tap logging from saved foods list
- [x] Saved Foods: add/remove favorites from meal log screen
- [x] Saved Foods: display saved foods section in meal log with quick-add buttons (horizontal scroll chips)
- [x] Navigation: wire both features into existing screens (dashboard + meals tab)
- [x] Active Workout: guest users now save sessions locally via AsyncStorage
- [x] Server: added getAllSessions route for calendar to fetch full workout history

## Round 35 — Weekly Recap + Smart Meal Plans + Calendar Export

- [x] Sunday evening weekly workout recap push notification (workouts completed, calories burned, streak status)
- [x] Schedule recap notification for Sunday 7pm local time
- [x] Recap notification content: total workouts, total duration, calories burned estimate, current streak
- [x] Personalized AI meal plans from user's most-logged saved foods
- [x] Meal plan generation includes user's favourite foods as preferred ingredients
- [x] UI: "Generate from My Foods" button on meals tab
- [x] Share/export workout calendar as shareable image
- [x] Monthly workout summary card rendered as image for sharing
- [x] Share via system share sheet (expo-sharing)
- [x] Weekly recap toggle added to notification preferences screen
- [x] Server: mealPlan.generate now accepts favouriteFoods array parameter

## Round 36 — Custom Rest Timers + Progress Photos + Social Sharing

- [x] Custom rest intervals: settings screen to configure rest time per exercise type (compound, isolation, cardio, stretching)
- [x] Custom rest intervals: persist settings via AsyncStorage
- [x] Custom rest intervals: active-workout uses exercise-type-specific rest timer instead of fixed timer
- [x] Custom rest intervals: default 90s compound, 60s isolation, 30s cardio, 45s stretching
- [x] Body scan progress comparison: new screen showing side-by-side photos from different dates
- [x] Body scan progress comparison: date picker to select two scan dates for comparison
- [x] Body scan progress comparison: slider/swipe to compare before/after photos
- [x] Body scan progress comparison: display stats diff (weight, body fat, measurements) between dates
- [x] Social sharing: branded template card for workout streaks and completed sessions
- [x] Social sharing: share to Instagram Stories, TikTok, Facebook, WhatsApp via system share sheet
- [x] Social sharing: template includes PeakPulse branding, streak count, workout stats
- [x] Social sharing: capture branded card as image using ViewShot
- [x] Rest Timer Settings link added to Profile screen
- [x] Progress Comparison link added to Body Scan tab
- [x] Share prompt added to workout completion alert
- [x] Share Your Streak button added to Workout Calendar
- [x] Server: added bodyScan.getHistory route and db.getAllBodyScans function
- [x] Exercise type classifier with keyword matching (compound/isolation/cardio/stretching)
- [x] 3 branded social templates: Streak, Session Complete, Milestone

## Round 37 — Dark/Light Theme Toggle

- [x] Theme toggle: add manual dark/light/system selector to profile/settings screen
- [x] Theme toggle: persist user preference via AsyncStorage
- [x] Theme toggle: update ThemeProvider to respect manual override
- [x] Theme toggle: useColorScheme hook returns resolved scheme from ThemeProvider context
- [x] Theme toggle: UI shows current selection with gold checkmark indicator
- [x] Theme toggle: haptic feedback on selection change
- [x] Theme toggle: Appearance section added to Profile screen between Features and Subscription

## Round 38 — In-App Exercise Demo Video Player

- [x] Replace YouTube search links with specific curated YouTube video IDs for 74 exercises
- [x] Build in-app YouTubePlayer component using WebView with embedded YouTube iframe API
- [x] Embed video player inline in active-workout exercise cards (ExerciseDemoVideo)
- [x] Embed video player inline in plans tab exercise detail
- [x] Fullscreen mode via Modal with landscape support and close button
- [x] Remove external browser/YouTube app linking — all videos play in-app
- [x] YouTubePlayerButton component for compact modal-based playback
- [x] Form cue text displayed below each video player
- [x] Loading indicator overlay while video loads
- [x] Installed react-native-webview dependency
- [x] Updated all tests to use videoId instead of youtubeUrl

## Round 39 — Floating AI Assistant + Premium AI Coach Integration

- [x] FloatingAssistant UI: persistent FAB (gold sparkle) in bottom-right corner on all screens (hidden on onboarding/subscription/ai-coach)
- [x] FloatingAssistant UI: expandable chat dialog (85% screen height) with messages, input, quick actions, and premium upgrade banner
- [x] FloatingAssistant UI: greeting bubble that appears 1.5s after app launch, auto-hides after 5s
- [x] FloatingAssistant UI: smooth animated expand/collapse with spring FAB scale and fade greeting
- [x] Greeting Engine: 20+ template greetings based on local data (streak, workouts, time of day, scans, meals, goal)
- [x] Greeting Engine: premium users get full-context AI coaching; free users get template greetings
- [x] Navigation Intent Classifier: keyword matching routes users to 12+ screens from chat
- [x] Navigation Intent Classifier: covers meals, plans, scan, form check, calendar, settings, profile, coach, compare, share, subscription, notifications
- [x] Voice Output: text-to-speech button using expo-speech to read assistant responses aloud
- [x] Proactive Nudges: welcome-back nudge when user returns after 4+ hours of inactivity (AppState listener)
- [x] Proactive Nudges: personalized nudge messages referencing streak, workout count, and user name
- [x] Proactive Nudges: 3 randomized nudge templates for variety
- [x] Premium AI Coach: form memory — loads last 5 form check scores and sends to AI context
- [x] Premium AI Coach: body progress tracking — sends body fat %, total scans to AI context
- [x] Premium AI Coach: meal log awareness — loads last 3 meals with calories into AI context
- [x] Premium AI Coach: deep insights integrated into floating assistant via "Deep Insights" button (links to full AI Coach screen)
- [x] Premium AI Coach: free users get template greetings + basic chat; premium gets full context-aware coaching with form/body/meal data
- [x] Integration: FloatingAssistant added to app/_layout.tsx root layout inside TRPCProvider
- [x] Integration: AI Coach screen remains as dedicated deep-analysis page (accessible from assistant header)
- [x] Subscription gating: premium context (form history, body scans, meal logs) only sent for hasAdvancedAccess subscribers
- [x] Server: aiCoach.chat upgraded to accept premiumContext with formHistory, bodyProgress, mealSummary, streakDays
- [x] Installed expo-speech dependency for text-to-speech
- [x] 6 quick action chips in empty state: meals, workouts, body scan, form check, workout history, AI coach
