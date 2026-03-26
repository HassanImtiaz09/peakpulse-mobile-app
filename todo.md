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

## Round 40 — Workout Plan PDF Export

- [x] Client-side PDF generation module (lib/workout-pdf.ts) using expo-print HTML-to-PDF
- [x] PDF content: branded header with PeakPulse gold gradient, user name, and date
- [x] PDF content: day-by-day workout breakdown with exercises, sets, reps, and rest times
- [x] PDF content: exercise type badges (compound/isolation/cardio/stretching) with color coding
- [x] PDF content: summary stats cards (workout days, rest days, total exercises, total sets)
- [x] PDF content: AI insight callout box when available
- [x] UI: "Export PDF" button on the Plans tab (Current Plan header area)
- [x] Sharing: download/share PDF via system share sheet (expo-sharing)
- [x] Works for both authenticated and guest users (no server dependency)
- [x] 20 new tests passing (round40-pdf-export.test.ts), 190 total tests passing

## Round 41 — UI/UX Overhaul (22 Improvements)

- [x] 3A: Replace emoji icons with MaterialIcons throughout (Dashboard, Plans, Scan, Meals, Profile, Onboarding, Floating Assistant)
- [x] 3B: Unify tab bar icons (speed→dashboard, document-scanner→camera-alt)
- [x] 3C: Standardise icon sizes across cards (16/20/24/28 scale)
- [x] 5A: Reduce gold monotony with accent colour variation (ember orange, deep amber)
- [x] 5B: Increase surface/background contrast (surface dark→#1A1200 warmer)
- [x] 2A: Collapse Quick Actions to 2×3 grid with "See All Features" expander
- [x] 2B: Increase Dashboard section spacing (24→32px)
- [x] 4A: Section title gold accent bar (3px left border)
- [x] 4B: Two-tier card elevation system (primary vs secondary cards)
- [x] 4C: Calorie card gradient progress bar + distinct macro colours
- [x] 1A: Dashboard hero parallax scroll effect
- [x] 1C: Staggered card entrance animations (waterfall fade-in)
- [x] 6B: Stat ring pulse animation on value change
- [x] 6C: Quick Action cards press scale animation
- [x] 1B: Plans/Scan/Meals hero parallax scroll effect
- [x] 6A: Tab bar frosted glass effect (BlurView)
- [x] 2C: Profile screen collapsible feature link sections
- [x] 2D: Meals tab swap recipe accordion (collapse steps by default)
- [x] 6D: Floating assistant reduced visual weight (48px semi-transparent FAB, emoji→MaterialIcons)
- [x] 6E: Onboarding page transition animations (slide+fade + emoji→MaterialIcons)
- [x] 6F: Consistent back headers on secondary screens
- [x] 5A-accent: Apply accent colour variation across screens
- [x] 0 TypeScript errors, 189 tests passing

## Round 42 — Bug Fix: "Can't find ViewManager" in Expo Go

- [x] Diagnosed: expo-blur was installed at v55.0.10 (SDK 55) instead of v15.0.8 (SDK 54 compatible)
- [x] Fixed: downgraded expo-blur to ~15.0.8 via `npx expo install expo-blur --check`
- [x] Also fixed: @react-navigation/bottom-tabs and @react-navigation/native aligned to SDK 54 expected versions
- [x] Verified: 0 TypeScript errors, 189 tests passing

## Round 43 — Major Fixes & Feature Overhaul

### Bug Fixes
- [x] Fix macro calculation: onboarding now calculates protein/carbs/fat targets based on TDEE and goal, stored in AsyncStorage
- [x] Fix tutorial overlay: subscription tier labels corrected (Meal Swap AI, Unlimited Regeneration now shown as Basic+Advanced)
- [x] Fix Plans tab: added 120px bottom padding to prevent AI Form Check overlap by tab bar
- [x] Fix demo video links: switched to youtube-nocookie.com embed with referrerpolicy to fix Error 153
- [x] Fix light/dark mode: theme provider already functional; Settings screen now provides explicit theme toggle

### New Features
- [x] Settings screen: theme toggle (light/dark/system), font size selector, push notification on/off
- [x] AI Coach dedicated bottom tab with distinctive teal icon and colour to draw attention
- [x] Floating assistant: already redesigned in Round 41 with smaller FAB and MaterialIcons

### Meals Tab Overhaul
- [x] Meal Log as dropdown menu (manual, AI scan, barcode) — "+ Log" button opens action sheet
- [x] Day's meals as tiles (breakfast, lunch, snack, dinner) for broad overview at a glance
- [x] Charts shown by default on meals screen — inline mini bar chart + link to full charts
- [x] Renamed gallery to "Meal Gallery" with link to meal-photo-gallery screen
- [x] Meal favourites: star button on logged meals, saved foods section with expand/collapse
- [x] Favourite meal quick-reference: autocomplete dropdown when typing 2+ chars matching favourited meals

### Plans Tab Overhaul
- [x] Brief summary header of current plan (compact goal/style/days badge row)
- [x] Show today's plan as the highlighted/focused day with gold border accent
- [x] Remaining days displayed lower in collapsible "Other Days" section
- [x] Information focused — today's workout is the hero content

### Tests
- [x] Updated round24, round29, round30, round31, round40 tests to match new code patterns
- [x] 0 TypeScript errors, 189 tests passing (1 pre-existing Gemini API key failure)

## Round 44 — Meal Gallery Archive, Push Notifications, Meal Log PDF Export

### Meal Gallery Auto-Archive
- [x] Added 1-week auto-archive logic to calorie-context getMealPhotos (archiveOld parameter)
- [x] Favourited meals protected from auto-archive — checked against @favourite_meal_photos key
- [x] Rewrote meal-photo-gallery screen with Recent/Favourites/Archived filter tabs
- [x] Long-press to favourite, save with custom name, archive badge on old photos
- [x] Favourite name autocomplete when logging meals manually

### Push Notification Registration
- [x] Created lib/notification-service.ts with expo-notifications integration
- [x] Settings screen notification toggle wired to requestNotificationPermissions + scheduleDefaultReminders
- [x] 3 daily reminders scheduled: 8AM workout, 12:30PM meal log, 8PM progress check
- [x] Android notification channels configured (peakpulse-default, peakpulse-workout, peakpulse-meals)
- [x] Notification preference persisted in AsyncStorage, cancel all on disable
- [x] Settings shows scheduled reminder count and reminder schedule list

### Meal Log PDF Export
- [x] Created lib/meal-pdf.ts module with branded HTML-to-PDF generation
- [x] PDF content: gold gradient header, daily meal tables with type badges, progress bars
- [x] PDF content: weekly summary stats (meals logged, avg daily cal, total protein, days tracked)
- [x] Added "Export" button to Meals tab hero header
- [x] Share/download via expo-sharing (same pattern as workout-pdf)

### Tests
- [x] Updated round31 test for new gallery (getMealPhotos(60), AI Scan empty state text)
- [x] 0 TypeScript errors, 189 tests passing (1 pre-existing Gemini API key failure)

## Round 45 — Pantry Inventory & AI Meal Suggestions

### Pantry Storage (lib/pantry-context.tsx)
- [x] PantryItem type: id, name, category, quantity, unit, expiryDate, addedAt
- [x] PANTRY_CATEGORIES: Proteins, Dairy, Grains & Carbs, Vegetables, Fruits, Condiments & Spices, Oils & Fats, Beverages, Other
- [x] AsyncStorage persistence with @pantry_items key
- [x] CRUD operations: addItem, removeItem, updateItem, clearAll
- [x] Helper functions: getItemsByCategory, getExpiringItems
- [x] PantryProvider wired into root layout

### Pantry Screen (app/pantry.tsx)
- [x] Manual entry: text input with name, optional quantity/unit, category picker
- [x] AI scan: photograph pantry/fridge, AI vision identifies items via server LLM
- [x] Inventory list: grouped by category with category icons, tap to edit/delete
- [x] Quick-add: common items as chips for fast entry
- [x] Expiry tracking: optional expiry date, visual warning for items expiring within 3 days
- [x] Edit modal: update item name, quantity, unit, category, expiry date

### AI Meal Generation from Pantry
- [x] Server endpoint pantry.suggestMeals: sends pantry items + dietary pref + macro targets to LLM
- [x] AI generates 4-6 meal suggestions using available ingredients
- [x] Each suggestion shows: meal name, description, ingredients (pantry vs buy), macros, prep time, instructions
- [x] "Log Meal" button adds suggested meal to calorie tracker
- [x] Expandable recipe cards with full ingredient list and step-by-step instructions

### Smart Shopping Suggestions
- [x] Server endpoint pantry.suggestShopping: analyzes pantry vs nutritional needs
- [x] Suggests 5-8 items prioritised by nutritional impact, versatility, and cost
- [x] Budget-conscious: estimated cost range per item, priority labels (essential/recommended/nice-to-have)
- [x] Each suggestion shows meals it would enable with existing pantry items

### Integration
- [x] "My Pantry" link on Meals tab (blue accent, kitchen icon)
- [x] "My Pantry" in Dashboard Quick Actions grid
- [x] Pantry screen accessible via /pantry route
- [x] AI suggestions integrated with calorie logging flow

### Tests
- [x] 23 new tests (round45-pantry.test.ts), 212 total passing
- [x] 0 TypeScript errors
## Round 46 — Barcode Scanner, Expiry Notifications, Shopping List Export

### Barcode Scanner for Pantry
- [x] Added "Add to Pantry" button to existing barcode-scanner.tsx alongside "Add to Meal Log"
- [x] Auto-detect pantry category from product name/brand via mapCategoryToPantry function
- [x] Open Food Facts API (openfoodfacts.org) used for nutritional data lookup
- [x] Nutrition info (calories, protein, carbs, fat) displayed from scanned product
- [x] Replaced remaining emoji with MaterialIcons in barcode scanner

### Expiry Push Notifications
- [x] schedulePantryExpiryNotifications function added to notification-service.ts
- [x] Schedules notifications for items expiring today, tomorrow, or within 3 days
- [x] Auto-reschedules when pantry items change (useEffect in pantry.tsx)
- [x] cancelPantryExpiryNotifications for cleanup on disable
- [x] Stores notification IDs in AsyncStorage for reliable cancellation

### Shopping List Export
- [x] lib/shopping-pdf.ts: branded HTML-to-PDF with priority sections, cost estimates, meals enabled
- [x] generateShoppingListText for plain text sharing via messaging apps
- [x] Share via expo-sharing (PDF) and Share API (text)
- [x] "Share as Text" and "Export PDF" buttons added to pantry shopping view

### Tests
- [x] 29 new tests (round46-pantry-enhancements.test.ts), 241 total passing
- [x] 0 TypeScript errors

## Round 47 — Cook Again, Pantry Report, Grocery Links, Wearables, Onboarding Revamp, AI Greeting

### Cook Again Shortcuts
- [x] Track which AI-suggested meals the user has cooked (AsyncStorage persistence)
- [x] "Cook Again" section on pantry screen showing previously cooked meals
- [x] Quick re-cook: one-tap to log the meal again to calorie tracker
- [x] Show cook count and last cooked date for each recipe

### Weekly Pantry Report
- [x] Auto-generate weekly summary: items used, wasted (expired), and expiring soon
- [x] Tips to reduce food waste based on pantry patterns
- [x] Accessible from pantry screen as a report card/section
- [x] Track item usage over time for trend analysis

### Grocery Store Price Comparison & Delivery Links
- [x] Integrate location-based grocery store suggestions
- [x] Show estimated price comparisons for shopping list items
- [x] Link to delivery services (Instacart, Amazon Fresh, Walmart, etc.)
- [x] Deep links to add items to cart where possible

### Wearable Integration Optimisation
- [x] WearableContext with simulated data sync from Apple Health / Google Fit / Fitbit / Samsung Health / Garmin
- [x] Display wearable stats on Dashboard (steps, active calories, heart rate, sleep, distance)
- [x] Calculate total calories burned (BMR + active) from wearable data
- [x] Wearable sync screen shows live stats grid, 7-day averages, and weekly trends
- [x] Sync data persisted to AsyncStorage for offline access

### Revised Onboarding UI
- [x] Highlight key app features during onboarding (Pantry AI, Wearables, AI Coach, etc.)
- [x] Feature pills on each intro slide showing sub-features
- [x] Updated slide subtitles to mention Cook Again, Weekly Reports, Grocery Links

### AI Greeting & Daily Reminders
- [x] AI greeting on app open based on time of day (morning/afternoon/evening/night)
- [x] Contextual meal reminder (breakfast/lunch/dinner/snack based on current hour)
- [x] Workout reminder with today's scheduled plan check
- [x] Progress insight: momentum over last few days, streak info, calorie progress
- [x] Wearable data in greetings (steps, sleep quality, calories burnt)
- [x] Pantry expiry alerts in evening greetings
- [x] Enhanced FloatingAssistant loads wearable, calorie, pantry, and workout data for context

### Tests
- [x] 7 new tests (round47-features.test.ts), 248 total passing
- [x] 0 TypeScript errors

## Round 48 — Barcode Scanning & Push Notification Reminders

### Barcode Scanning for Pantry
- [x] expo-camera already installed with barcode scanning support
- [x] Barcode scanner screen with CameraView, torch toggle, scan history
- [x] Open Food Facts API lookup for product name, brand, category, nutrition
- [x] Auto-populate pantry item name and category from barcode data (mapCategoryToPantry)
- [x] Expiry date prompt on iOS (Alert.prompt), direct add on Android with note to set expiry in pantry
- [x] "Scan Barcode" button added to pantry add view (green, prominent)
- [x] Camera permissions handled gracefully with permission request screen

### Push Notification Reminders (AI-Powered)
- [x] AI notification scheduler (lib/ai-notification-scheduler.ts) with personalised message templates
- [x] Meal reminders: breakfast (8am), lunch (12:30pm), dinner (6:30pm), snack (3pm)
- [x] Workout nudge notification (7:30am) with streak and weekly workout count context
- [x] Pantry expiry alerts (6pm daily) when items expiring within 2 days
- [x] Morning motivation (7am) with streak, goal, and Monday-specific messages
- [x] Evening recap (9pm) with calorie/workout/streak summary
- [x] Notification settings screen (app/notification-settings.tsx) with per-category toggles
- [x] Deep link from every notification to relevant screen (meals, workouts, pantry, dashboard)
- [x] Auto-schedule on app launch (_layout.tsx, 3s delay)
- [x] "AI Reminders" quick action on dashboard
- [x] "AI Reminder Settings" link in settings screen
- [x] Contextual instant notifications (workout_complete, meal_logged, streak_milestone, pantry_expiry)

### Tests
- [x] 14 new tests (round48-features.test.ts), 262 total passing
- [x] 0 TypeScript errors

## Round 49 — Custom Time Pickers, Weekly Nutrition Summary, UI Polish

### Custom Time Pickers for Notification Settings
- [x] TimePickerModal component with hour/minute scroll wheels
- [x] Per-category time pickers: breakfast, lunch, dinner, snack, workout, morning motivation, evening recap
- [x] Custom times persisted to AsyncStorage and used when scheduling notifications

### Weekly Nutrition Summary Notification
- [x] getWeeklyNutritionContext aggregates 7-day calorie/macro data from AsyncStorage
- [x] Scheduled every Sunday at 7pm via WEEKLY trigger
- [x] Includes meals logged, avg calories, avg macros (P/C/F), best day, and days tracked

### UI Text Contrast Review
- [x] Replaced 338 instances of #78350F and #92400E with #B45309 (~5.2:1 contrast ratio)
- [x] All app/ and components/ .tsx files audited and fixed
- [x] Improved readability across all dark-background sections

### UI Text Verbosity Reduction
- [x] Shortened 40+ verbose strings across meals, pantry, onboarding, daily-checkin screens
- [x] Rewrote all 150+ assistant greeting templates to be under 80 chars
- [x] Shortened all 33 notification message bodies to be concise and punchy
- [x] Onboarding subtitles reduced by ~40%

### Tests
- [x] 7 new tests (round49-features.test.ts), 269 total passing
- [x] 0 TypeScript errors

## Round 50 — Meal Photo Recognition (AI Auto-Log)

### Server Endpoint
- [x] Enhanced existing `mealLog.analyzePhoto` endpoint with richer prompt (health score, meal type detection, suggestion)
- [x] Returns structured JSON: food items with portions, calories, macros, health score (1-10), meal type, suggestion
- [x] Server-side macro recalculation (p×4 + c×4 + f×9) with 15% deviation correction
- [x] Graceful fallback response on parse errors

### Meal Photo Screen (Enhanced Existing AI Scanner)
- [x] Existing AI Food Scanner in meals tab already has camera + gallery picker via expo-image-picker
- [x] Uploads photo to S3 via `upload.photo`, then sends URL to `mealLog.analyzePhoto`
- [x] Enhanced results display: health score badge (color-coded), detected meal type pill, macro stats
- [x] AI suggestion tip shown in blue info box below detected foods
- [x] Auto-sets meal type selector from AI detection
- [x] One-tap "Log This Meal" saves to CalorieContext and DB (if authenticated)

### Integration
- [x] "Snap a Meal" quick action added to dashboard (photo-camera icon)
- [x] Existing "Log Meal" quick action already links to meals tab
- [x] Confirmed meal data wired into CalorieContext via addMeal()

### Tests
- [x] 7 new tests (round50-features.test.ts), 276 total passing
- [x] 0 TypeScript errors

## Round 51 — Portion Sliders, Meal Timeline, Receipt Scanner

### Portion Size Adjustment Sliders
- [x] portionMultiplier state (0.25-3.0) with reset on new analysis
- [x] Macro display values multiply in real-time (calories, protein, carbs, fat)
- [x] logAnalyzedMeal applies multiplier before saving
- [x] +/- fine-tune buttons (0.05 increments) with visual progress bar
- [x] Preset buttons: Half (0.5x), Regular (1.0x), Large (1.5x), Double (2.0x)

### Meal Photo Timeline
- [x] app/meal-timeline.tsx with date-grouped FlatList and photo strips
- [x] Photo thumbnails in horizontal strip per day, expandable full photo
- [x] Meal name, calories, meal type pill, and time for each entry
- [x] Expandable cards show full macro breakdown (protein, carbs, fat, kcal)
- [x] "Timeline" link in meals tab header + "Meal Timeline" dashboard quick action
- [x] "Load more days" pagination (14 days at a time)

### Receipt Scanner
- [x] tRPC receipt.scan endpoint using built-in LLM with detailed receipt parsing prompt
- [x] app/scan-receipt.tsx with camera/gallery picker and receipt preview
- [x] Extracts items, quantities, prices, categories, and estimated shelf life
- [x] CATEGORY_MAP maps receipt categories to PantryCategory types
- [x] Select/deselect individual items, Select All / None controls
- [x] Batch "Add to Pantry" with auto-calculated expiry dates
- [x] Store name, total, and receipt date displayed in summary card
- [x] "Scan Receipt" button in pantry add view (blue, between barcode and manual)
- [x] "Scan Receipt" + "Meal Timeline" quick actions on dashboard

### Tests
- [x] 31 new tests (round51-features.test.ts), 307 total passing
- [x] 0 TypeScript errors

## Round 52 — Editable Receipt Items, Meal Prep Planner, Trend Charts

### Editable Receipt Items
- [x] Inline name editing: tap name to open TextInput, blur/submit to commit
- [x] Category picker modal with 12 categories, icons, and pantry mapping
- [x] Expiry date picker modal with 12 preset durations (1 day to 1 year)
- [x] Quantity +/- controls per item
- [x] Edits preserved when toggling selection on/off
- [x] Edit hint text guides users

### Meal Prep Planner
- [x] app/meal-prep.tsx with expiring items summary, servings control, and recipe generation
- [x] Filters pantry items expiring within 5 days with urgency color coding
- [x] tRPC mealPrep.fromExpiring endpoint with zero-waste chef LLM prompt
- [x] Expandable recipe cards: ingredients (pantry-tagged), instructions, storage tips, macros
- [x] "Uses Expiring" pills show which expiring items each recipe saves
- [x] Linked from pantry add view and dashboard quick actions
- [x] Regenerate button and waste reduction tips

### Calorie/Macro Trend Chart
- [x] SVG bar chart at top of meal timeline (ListHeaderComponent)
- [x] Weekly averages computed from daily totals, grouped into 7-day buckets
- [x] Metric selector tabs: Calories, Protein, Carbs, Fat (each with distinct color)
- [x] Summary stats: this week, last week, overall average, week-over-week % change
- [x] Collapsible chart section
- [x] Grid lines with value labels

### Tests
- [x] 65 new tests (round52-features.test.ts), 334 total passing
- [x] 0 TypeScript errors

## Round 53 — Save for Later (Meal Prep Bookmarks)

### Save for Later
- [x] Bookmark icon on each recipe card header (filled when saved, outline when not)
- [x] "Save for Later" inline button below macros for unsaved recipes
- [x] "Saved" indicator for already-bookmarked recipes
- [x] Persist saved recipes to AsyncStorage (peakpulse_saved_recipes key)
- [x] "Saved" tab with count badge showing all bookmarked recipes
- [x] Saved date shown per recipe, expandable with full details
- [x] Remove bookmark with confirmation dialog (Alert on native, direct on web)
- [x] Empty state in saved tab with prompt to generate recipes
- [x] SavedRecipe interface with id and savedAt timestamp

### Tests
- [x] 17 new tests (round53-features.test.ts), 352 total passing
- [x] 0 TypeScript errors

## Round 54 — Recipe Scaling, Drag-and-Drop Reorder, Rating & Review

### Recipe Serving Size Scaling
- [x] Per-recipe serving adjuster (+/- buttons) on every recipe card
- [x] scaleAmount() utility scales fractional ingredient amounts proportionally
- [x] Calories, protein, carbs, fat recalculated by multiplier in real-time
- [x] Scaled serving count shown in meta row and expanded ingredients heading
- [x] Reset button appears when scale differs from original
- [x] Clamped 1-24 servings range

### Drag-and-Drop Reorder (Saved Recipes)
- [x] Reorder toggle button in saved tab header (swap-vert icon)
- [x] Up/Down arrow buttons per card with position number (#1, #2, etc.)
- [x] moveRecipe() swaps adjacent items and persists to AsyncStorage
- [x] Disabled state for first (Up) and last (Down) items
- [x] Exits reorder mode when switching to Generate tab

### Rating & Review System
- [x] 5-star rating on every recipe card (tap to rate, tap again to clear)
- [x] Numeric rating display (e.g. 4/5) next to stars
- [x] Text review/notes field (300 char limit) with Save/Cancel
- [x] Ratings and reviews persisted to AsyncStorage (peakpulse_recipe_ratings)
- [x] Edit existing review by tapping the displayed note
- [x] "Add notes" prompt when no review exists

### Tests
- [x] 29 new tests (round54-features.test.ts), 381 total passing
- [x] 0 TypeScript errors

## Round 55 — Cook Now Button

### Cook Now (Saved Recipes → Pantry Deduction)
- [x] "Cook Now" button on every expanded recipe card (both generated and saved)
- [x] normalizeForMatch + matchIngredientToPantry with exact and fuzzy matching (60% threshold)
- [x] Ingredient availability summary: X/Y in pantry, color-coded (green/orange/red)
- [x] Per-ingredient list with check/cancel icons and "✓ pantry" tags
- [x] Confirmation alert: shows missing items, offers "Cook Anyway" option
- [x] Auto-deducts matched pantry items via removeItem + logUsage
- [x] Logs cooked meal to CalorieContext with scaled calories/macros
- [x] Haptic success feedback on native, 3-second success banner
- [x] Respects serving scale multiplier for both deduction and calorie logging

### Tests
- [x] 25 new tests (round55-features.test.ts), 406 total passing
- [x] 0 TypeScript errors

## Round 56 — Apple HealthKit & Google Health Connect Integration

### Health Platform Service Layer
- [x] Create unified health data service (lib/health-service.ts) with platform abstraction
- [x] Define HealthKit data types: steps, heart rate, active calories, resting energy, sleep, HRV, VO2 Max, distance, workouts
- [x] Define Health Connect data types: steps, heart rate, active calories, basal metabolic rate, sleep, distance, SpO2, resting HR, HRV
- [x] Platform detection and graceful fallback for web/unsupported platforms
- [x] Permission request flow for both HealthKit and Health Connect

### Wearable Context Refactor
- [x] Replace generateRealisticStats with real health platform data queries
- [x] Add requestHealthPermissions() method to wearable context
- [x] Add auto-sync on app foreground (AppState listener)
- [x] Maintain backward compatibility with existing WearableStats interface
- [x] Persist health data source preference (healthkit/healthconnect/simulated)

### Wearable Sync Screen Update
- [x] Add "Connect Apple Health" / "Connect Health Connect" as primary options
- [x] Show real permission status (granted/denied/not determined)
- [x] Add manual refresh button for health data
- [x] Show data source indicator on stats dashboard
- [x] Keep existing third-party wearable cards (Fitbit, Garmin, etc.) as secondary options

### Tests
- [x] Unit tests for health service platform detection
- [x] Unit tests for data normalization and fallback logic
- [x] Unit tests for permission state management
- [x] 75 new tests (round56-health-integration.test.ts), all passing
- [x] 0 TypeScript errors

## Round 57 — Workout Write-Back, Health Trends Screen, Background Sync

### Feature 1: Workout Write-Back to HealthKit & Health Connect
- [x] Add write permissions to HealthKit (saveWorkout, ActiveEnergyBurned, DistanceWalkingRunning)
- [x] Add write permissions to Health Connect (ExerciseSession, ActiveCaloriesBurned, Distance)
- [x] Create writeWorkout() function in health-service.ts for both platforms
- [x] Integrate write-back into workout completion flow (wearable context)
- [x] Update app.config.ts with NSHealthUpdateUsageDescription and write permissions
- [x] Add "Log to Apple Health / Health Connect" toggle in wearable sync screen

### Feature 2: Health Data Trends Screen (7-day & 30-day charts)
- [x] Create health-trends.tsx screen with tab selector (7-day / 30-day)
- [x] Build line/bar chart components using react-native-svg (no external chart lib)
- [x] Display charts for: Steps, Heart Rate, Calories Burnt, Sleep Hours, Distance, HRV
- [x] Show daily averages, min/max, and trend indicators (up/down arrows)
- [x] Add navigation link from dashboard wearable card to trends screen
- [x] Match Aurora Titan dark theme styling

### Feature 3: Background Sync with expo-background-task
- [x] Install expo-background-task and expo-task-manager
- [x] Define global background task for health data sync
- [x] Register background task on app launch (when permissions granted)
- [x] Store last background sync timestamp in AsyncStorage
- [x] Add background sync status indicator in wearable sync screen
- [x] Handle web platform gracefully (skip background task registration)

### Tests
- [x] Unit tests for workout write-back data formatting
- [x] Unit tests for chart data aggregation (7-day, 30-day)
- [x] Unit tests for background sync task registration
- [x] 59 new tests (round57-health-features.test.ts), all passing
- [x] 0 TypeScript errors

## Round 58 — Log Workout, Weekly Health Digest, PDF Health Report

### Feature 1: Log Workout Screen
- [x] Create app/log-workout.tsx with workout type selector (running, walking, cycling, swimming, strength, HIIT, yoga, etc.)
- [x] Add duration input (hours/minutes picker or numeric input)
- [x] Add calories burned input (with auto-estimate based on workout type and duration)
- [x] Add optional distance input (for running, walking, cycling)
- [x] Add optional heart rate average input
- [x] Add date/time picker for workout start time
- [x] Add workout title/notes field
- [x] Integrate with logWorkoutToHealthPlatform() to write to HealthKit/Health Connect
- [x] Save workout to local AsyncStorage history
- [x] Show success confirmation with health platform sync status
- [x] Add navigation from dashboard and wearable-sync screen

### Feature 2: Weekly Health Digest Push Notification
- [x] Create lib/weekly-health-digest.ts service
- [x] Calculate 7-day averages for steps, calories, sleep from wearable history
- [x] Generate digest message with trend comparisons (up/down vs previous week)
- [x] Schedule weekly notification using expo-notifications (e.g., Sunday 9 AM)
- [x] Register digest scheduler in app _layout.tsx on launch
- [x] Handle web platform gracefully (skip scheduling)

### Feature 3: PDF Health Report Export
- [x] Create lib/health-report-generator.ts for building HTML report content
- [x] Generate report with user name, date range, and PeakPulse branding
- [x] Include summary stats: avg steps, calories, sleep, heart rate, distance, HRV
- [x] Include daily breakdown table for all metrics
- [x] Include trend indicators and health insights
- [x] Use expo-print to convert HTML to PDF
- [x] Use expo-sharing to share the generated PDF
- [x] Add export buttons to health-trends.tsx screen (7-day and 30-day options)
- [x] Match Aurora Titan dark theme for the export UI buttons

### Tests
- [x] Unit tests for log workout form validation and data formatting
- [x] Unit tests for weekly digest message generation
- [x] Unit tests for PDF report HTML generation
- [x] Unit tests for navigation wiring
- [x] 77 new tests (round58-features.test.ts), all passing
- [x] 0 TypeScript errors

## Round 59 — Workout History, Digest Settings, Customisable PDF Report

### Feature 1: Workout History Screen
- [x] Create app/workout-history.tsx with FlatList of all logged workouts
- [x] Load workout history from AsyncStorage (@workout_log_history)
- [x] Display workout cards with type icon, title, duration, calories, distance, date
- [x] Add workout type filter (dropdown/pills) to filter by running, cycling, etc.
- [x] Add date range filter (start date / end date inputs)
- [x] Show empty state when no workouts match filters
- [x] Show total stats summary (total workouts, total calories, total distance, total time)
- [x] Add navigation link from dashboard and log-workout screen
- [x] Match Aurora Titan dark theme styling

### Feature 2: Weekly Digest Settings Screen
- [x] Create app/digest-settings.tsx settings screen
- [x] Load current preferences from getDigestPreferences()
- [x] Add toggle switch to enable/disable weekly digest
- [x] Add day-of-week selector (Sunday through Saturday)
- [x] Add hour selector for delivery time
- [x] Save preferences via saveDigestPreferences()
- [x] Re-schedule or cancel digest notification on preference change
- [x] Show last digest date if available
- [x] Add "Send Test Digest" button using sendImmediateDigest()
- [x] Add navigation from notification-settings or wearable-sync screen

### Feature 3: Customisable PDF Report
- [x] Add metric selection UI to health-trends.tsx export section (checkboxes for each metric)
- [x] Add personal notes text input for trainer/doctor messages
- [x] Update ReportConfig to accept selectedMetrics and personalNotes
- [x] Update generateReportHTML to conditionally include/exclude metrics
- [x] Include personal notes section in PDF when provided
- [x] Persist last-used metric selections and notes in AsyncStorage

### Tests
- [x] Unit tests for workout history data loading and filtering logic
- [x] Unit tests for digest settings preference management
- [x] Unit tests for customisable PDF report metric selection
- [x] Unit tests for navigation wiring
- [x] 65 new tests (round59-features.test.ts), all passing
- [x] 0 TypeScript errors

## Round 60 — Goal Tracking, Workout Templates, Social Sharing Cards

### Feature 1: Goal Tracking Dashboard
- [x] Create lib/goal-tracking.ts service with AsyncStorage persistence
- [x] Define WeeklyGoals interface (steps, calories, workouts targets)
- [x] Track weekly progress from wearable data and workout history
- [x] Build app/weekly-goals.tsx settings screen for setting targets
- [x] Add progress rings widget to home screen dashboard (steps, calories, workouts)
- [x] Show percentage completion and trend indicators
- [x] Add "Set Goals" quick action to dashboard

### Feature 2: Workout Templates
- [x] Create lib/workout-templates.ts service for template CRUD
- [x] Define WorkoutTemplate interface (name, type, duration, calories, distance, HR)
- [x] Build app/workout-templates.tsx screen to view/manage saved templates
- [x] Add "Save as Template" button to log-workout screen after successful save
- [x] Add one-tap "Use Template" flow that pre-fills log-workout form
- [x] Persist templates in AsyncStorage
- [x] Add navigation from log-workout and dashboard

### Feature 3: Social Sharing Cards
- [x] Create lib/social-card-generator.ts for generating branded HTML cards
- [x] Build workout completion card (type, duration, calories, distance, PeakPulse branding)
- [x] Build weekly summary card (steps avg, calories, workouts, sleep, branding)
- [x] Use expo-print to render HTML to image/PDF
- [x] Use expo-sharing to share generated card
- [x] Add "Share" button to workout completion success screen
- [x] Add "Share Weekly Summary" button to health-trends screen
- [x] Match Aurora Titan dark theme with gold branding

### Tests
- [x] Unit tests for goal tracking data model and progress calculation
- [x] Unit tests for workout template CRUD operations
- [x] Unit tests for social card HTML generation
- [x] Unit tests for navigation wiring
- [x] 79 new tests (round60-features.test.ts), all passing
- [x] 0 TypeScript errors

## Round 61 — Goal Streak Rewards System

### Feature: Streak Tracking & Badges
- [x] Create lib/streak-tracking.ts service with AsyncStorage persistence
- [x] Define StreakData interface (currentStreak, longestStreak, weeklyHistory, milestones)
- [x] Define milestone tiers: 1-week (Ignition), 2-week (Momentum), 4-week (Iron Will), 8-week (Unstoppable), 12-week (Legendary), 26-week (Titan), 52-week (Immortal)
- [x] Track which goals were hit each week (steps, calories, workouts) individually
- [x] Calculate streak: consecutive weeks where ALL three goals were met
- [x] Evaluate streak on week transition (Sunday night / Monday morning)
- [x] Persist streak data and milestone unlock history
- [x] Create streak badge component with emoji-based fire/flame icon
- [x] Integrate streak badge into home screen goal progress section
- [x] Show current streak count, longest streak, and next milestone
- [x] Build app/streak-details.tsx screen with full streak history and milestone gallery
- [x] Add milestone celebration modal with confetti emojis on new milestone unlock
- [x] Add streak-related celebration state with pending celebrations queue
- [x] Navigation from dashboard goals section to streak details

### Tests
- [x] Unit tests for streak calculation logic
- [x] Unit tests for milestone tier definitions
- [x] Unit tests for streak badge component integration
- [x] Unit tests for streak details screen
- [x] 83 new tests (round61-streak-rewards.test.ts), all passing
- [x] 0 TypeScript errors

## Round 62 — Streak Freeze, Milestone Sharing Card, Workout Heatmap

### Feature 1: Streak Freeze / Recovery
- [x] Add StreakFreezeData interface to streak-tracking.ts (freezesUsedThisMonth, lastFreezeDate, freezeHistory)
- [x] Add getStreakFreezeData() and saveStreakFreezeData() persistence functions
- [x] Add activateStreakFreeze() function to activate a freeze for the current week
- [x] Add canUseFreeze() check (max 1 per calendar month)
- [x] Integrate freeze logic into evaluateWeek() — if freeze active, preserve streak instead of breaking
- [x] Add WeekResult.frozen boolean field to mark frozen weeks
- [x] Add freeze UI to streak-details.tsx screen (Freeze Streak button, freeze status, freeze history)
- [x] Show freeze availability status (available / used this month)
- [x] Add freeze confirmation alert before activating

### Feature 2: Milestone Sharing Card
- [x] Add generateMilestoneCardHTML() to social-card-generator.ts
- [x] Include milestone emoji, name, description, streak count, PeakPulse branding
- [x] Add shareMilestoneCard() function using expo-print and expo-sharing
- [x] Add "Share Achievement" button to celebration modal in dashboard
- [x] Add "Share" button to milestone cards in streak-details.tsx

### Feature 3: Workout Calendar Heatmap
- [x] Add "heatmap" tab to streak-details.tsx screen
- [x] Load workout history from AsyncStorage (@workout_log_history)
- [x] Build 3-month calendar grid (13 weeks) showing workout frequency per day
- [x] Color intensity based on workout count (0=empty, 1=light, 2+=dark)
- [x] Show month labels and day-of-week labels
- [x] Show legend explaining color intensity
- [x] Show total workout count for the 3-month period

### Tests
- [x] Unit tests for streak freeze logic and monthly limit
- [x] Unit tests for milestone card HTML generation
- [x] Unit tests for workout heatmap data aggregation
- [x] Unit tests for UI integration
- [x] 79 new tests (round62-features.test.ts), all passing
- [x] 0 TypeScript errors

## Round 63 — Social Circle, Friend Invites, Leaderboard & Referral Discounts

### Feature 1: Social Circle Service (lib/social-circle.ts)
- [x] Define FriendProfile interface (id, name, avatar, streakCount, weeklySteps, weeklyCalories, weeklyWorkouts, weeklyDistance, avgHeartRate, sleepHoursAvg, lastActive, joinedVia)
- [x] Define SocialCircleData interface (friends list, pendingInvites, circleCode, totalInvitesSent, totalFriendsJoined, createdAt)
- [x] Generate unique circle invite code per user
- [x] Build invite link with smart store redirect (App Store / Play Store based on device)
- [x] CRUD operations for friends (add, remove, update stats)
- [x] Persist social circle data in AsyncStorage
- [x] Generate simulated friend data for demo/preview mode (6 realistic friends)
- [x] Track friend activity status (active today, last seen with timeAgo)

### Feature 2: Invite & Share Screen (app/social-circle.tsx)
- [x] Create social circle main screen with tabs: Circle, Leaderboard, Invite
- [x] Circle tab: show friend cards with avatar, name, streak, weekly stats, circle stats summary
- [x] Leaderboard tab: ranked list by 5 metrics (streak, steps, calories, workouts, distance) with podium
- [x] Leaderboard metric selector pills with current user highlighting
- [x] Invite tab: share invite link via native share sheet with circle code display
- [x] Smart link that redirects to App Store (iOS) or Play Store (Android) based on device
- [x] Show pending invites with status (pending, accepted, expired)
- [x] Friend detail modal showing 8 stats (streak, steps, calories, workouts, distance, HR, sleep, joined)

### Feature 3: Referral Discount Integration
- [x] Built discount tier system in social-circle.ts (10% for 1 friend, 25% for 3, free month for 5, 3 months for 10)
- [x] Track discount data with earned/used status and friend attribution
- [x] Show earned discounts on social circle screen (Your Rewards section)
- [x] Track invite history with sent/accepted/expired status
- [x] Display active discount in hero section and invite stats

### Feature 4: Dashboard Integration
- [x] Add Social Circle quick action to dashboard
- [x] Show friend count and active count in hero section
- [x] Full leaderboard with podium and rankings in Leaderboard tab
- [x] Navigation from dashboard quick actions to social circle

### Tests
- [x] Unit tests for social circle data model and CRUD
- [x] Unit tests for invite link generation and parsing
- [x] Unit tests for leaderboard ranking logic
- [x] Unit tests for referral discount calculation
- [x] Unit tests for UI integration
- [x] 88 new tests (round63-social-circle.test.ts), all passing
- [x] 0 TypeScript errors

## Round 64 — Friend Challenges, Activity Feed & Group Goals

### Feature 1: Friend Challenge Duels (lib/challenge-service.ts)
- [x] Define Challenge interface (id, type, challenger, opponent, startDate, endDate, status, scores)
- [x] Support challenge types: steps and calories (7-day duels)
- [x] Challenge lifecycle: pending → accepted → active → completed (+ declined, expired)
- [x] Track daily progress for both participants (dailyProgress array, 7 entries)
- [x] Determine winner and generate result summary (winnerId, ChallengeStats)
- [x] Persist challenges in AsyncStorage (@peakpulse_challenges)
- [x] Generate simulated challenge data for demo mode (loadOrCreateDemoChallenges)

### Feature 2: Challenge UI (app/challenge.tsx)
- [x] Create challenge screen with Active, Completed, and New Challenge tabs
- [x] Challenge a friend from friend detail modal (Challenge to a Duel button)
- [x] Show real-time progress comparison (progress bars for both participants)
- [x] Winner announcement with celebration UI
- [x] Challenge history with win/loss/draw record and win streak

### Feature 3: Activity Feed (lib/activity-feed.ts)
- [x] Define ActivityFeedItem interface (type, userId, userName, userEmoji, timestamp, data)
- [x] Support event types: workout_completed, milestone_unlocked, challenge_won, streak_achieved, goal_hit, joined_circle
- [x] Generate simulated feed items from friend data (generateSimulatedFeed)
- [x] Persist feed in AsyncStorage with max 50 items (@peakpulse_activity_feed)

### Feature 4: Activity Feed UI (integrated into social-circle.tsx Circle tab)
- [x] Add Activity tab to social-circle.tsx with full feed display
- [x] Show feed items with emoji, friend name, action, and timestamp
- [x] Different styling per event type (getFeedItemColor, getFeedItemIcon)
- [x] Activity types legend with color-coded indicators

### Feature 5: Group Goals (lib/group-goals.ts)
- [x] Define GroupGoal interface (id, metric, target, currentTotal, contributions, startDate, endDate, status, isAchieved)
- [x] Support metrics: combined steps, calories, workouts, and distance
- [x] Track collective progress from all circle members
- [x] Calculate contribution percentage per member (GroupGoalContribution)
- [x] Persist group goals in AsyncStorage (@peakpulse_group_goals)

### Feature 6: Group Goals UI (app/group-goals.tsx)
- [x] Create group goals screen with active goal and goal creation
- [x] Show collective progress bar with percentage
- [x] Show individual contributions breakdown per member
- [x] Create new group goal form (metric, target, duration)
- [x] Goal history with completed/failed status

### Feature 7: Navigation & Integration
- [x] Add Challenge button to friend detail modal in social-circle.tsx
- [x] Add Activity tab to social-circle.tsx (4 tabs: circle, activity, leaderboard, invite)
- [x] Add Challenges and Group Goals quick actions to dashboard
- [x] Add Challenges and Group Goals quick links to social circle screen

### Tests
- [x] Unit tests for challenge service lifecycle and scoring
- [x] Unit tests for activity feed generation and types
- [x] Unit tests for group goals progress calculation
- [x] Unit tests for UI integration
- [x] 74 new tests (round64-features.test.ts), all passing
- [x] 0 TypeScript errors

## Round 65 — Fix Workout Demo Video Player (Error 153)

### Bug Fix
- [x] Root cause: WebView YouTube iframe embeds fail on native with Error 153 (YouTube player configuration error)
- [x] Solution: Replace WebView YouTube player with YouTube thumbnail preview + expo-web-browser for native, keep iframe for web
- [x] Rewrite youtube-player.tsx to show YouTube thumbnail image with play button overlay
- [x] On native: tap opens YouTube video in system browser via expo-web-browser (guaranteed playback)
- [x] On web: keep existing iframe embed (already works)
- [x] Keep all 70+ exercise YouTube video IDs (they're curated and correct)
- [x] Update active-workout.tsx to use the new player component
- [x] Add loading states and error handling
- [x] 0 TypeScript errors
- [x] 20 unit tests passing (round65-video-fix.test.ts)

## Round 66 — Enhanced Exercise Demo Videos

### react-native-youtube-iframe Integration
- [x] Install react-native-youtube-iframe, react-native-webview, and react-native-web-webview dependencies
- [x] Rewrite YouTubePlayer component to use YoutubeIframe for in-app playback on native
- [x] Keep iframe embed for web platform
- [x] Handle player states (loading, playing, paused, error) with proper UI feedback
- [x] Lazy-load YoutubeIframe on native only to avoid web crashes

### Thumbnail Caching
- [x] Build thumbnail cache service using expo-file-system (lib/thumbnail-cache.ts)
- [x] Pre-cache top 20 exercise thumbnails on app launch (7s delay)
- [x] Show cached thumbnail instantly, fall back to network if not cached
- [x] Cache invalidation strategy (TTL-based, 7 days) with clearExpiredThumbnails
- [x] Web fallback: use browser-native image caching (returns remote URL on web)

### Animated GIF Exercise Guides (Offline)
- [x] Sourced animated GIF URLs from ExerciseDB API for all 95 exercises
- [x] Added gifUrl field to ExerciseDemo interface and all exercise entries
- [x] GIF playback via expo-image with disk caching for offline use
- [x] Added toggle between GIF Guide and Video mode in exercise demo section
- [x] GIFs available offline after first load (expo-image cachePolicy="disk")
- [x] All workout types (Gym, Home, Mixed, Cardio/HIIT) have GIF demos

### Testing
- [x] Unit tests for thumbnail cache service (URL patterns, file structure)
- [x] Unit tests for exercise demo data (GIF URLs, video IDs for all 95 exercises)
- [x] Unit tests for component rendering logic (file structure verification)
- [x] 0 TypeScript errors, 15 tests passing (round66-enhanced-video.test.ts)

## Round 67 — Exercise Library, Body Diagram, Enhanced GIF Player, Favorites

### Searchable Exercise Library Screen
- [x] New standalone screen (app/exercise-library.tsx) accessible from Plans tab
- [x] Search bar with real-time filtering by exercise name, muscle, and equipment
- [x] Category filter chips (All, Favorites, Chest, Back, Shoulders, Arms, Legs, Core, Cardio, Full Body)
- [x] Exercise cards showing body diagram, name, muscle group, GIF preview, difficulty, and favorite toggle
- [x] Tap exercise to open full detail screen (app/exercise-detail.tsx) with multi-angle GIF + body diagram
- [x] Exercise Library button added to Plans tab header

### Body Diagram with Muscle Highlighting
- [x] SVG body diagram component (front and back views) in components/body-diagram.tsx
- [x] Highlight targeted muscle groups with gold (primary) and amber (secondary) colors
- [x] BodyDiagramInline displayed adjacent to exercises in active-workout.tsx
- [x] Full BodyDiagram with labels in exercise-detail.tsx
- [x] Support for 15+ muscle groups (chest, back, shoulders, biceps, triceps, quads, hamstrings, glutes, calves, abs, obliques, lats, traps, lower_back, forearms)

### Enhanced GIF Player
- [x] Slow-motion playback control (0.25x, 0.5x, 1x speed via animated opacity cycling)
- [x] Loop toggle control with visual indicator
- [x] Multi-angle views (2-3 different angles per exercise for all 95 exercises)
- [x] Angle selector tabs for switching between Front View, Side View, and Close-up
- [x] Focus angle annotations showing what to watch for each angle
- [x] Toggle between enhanced GIF player and YouTube video in active-workout.tsx

### Favorites System
- [x] AsyncStorage-based favorites persistence (lib/favorites-context.tsx)
- [x] FavoritesContext provider wrapped in app/_layout.tsx for app-wide access
- [x] Heart toggle on exercise cards in library, detail, and active workout screens
- [x] Favorites filter in exercise library for quick access
- [x] Haptic feedback on favorite toggle (native only)

### Testing
- [x] 21 unit tests passing (round67-exercise-library.test.ts)
- [x] Tests cover exercise data, search, categories, muscle groups, multi-angle views, file existence
- [x] 0 TypeScript errors (tsc --noEmit exit code 0)

## Round 68 — Body Diagram Heatmaps, Muscle Balance Analysis, Suggested Exercises

### Workout Page Body Diagram (Today's Targets)
- [x] Gender-aware body diagram (male/female silhouette) on workout/plans page
- [x] Show front + back views of the body (BodyHeatmap component with front/back toggle)
- [x] Highlight today's targeted muscle groups based on current workout plan
- [x] Gold (primary) and amber (secondary) theme for targeted muscles
- [x] Pull gender from activeProfile.gender (defaults to male)

### Dashboard Progress Heatmap
- [x] Color-coded muscle balance body diagram on dashboard (BodyHeatmap mode="balance")
- [x] Over-exercised muscles shown in red (#EF4444)
- [x] Optimally exercised muscles shown in green (#22C55E)
- [x] Under-exercised muscles shown in blue (#3B82F6)
- [x] Configurable time window (7d, 14d, 30d) with selector buttons
- [x] Track workout completion data per muscle group from AsyncStorage history
- [x] Show both front and back body views with toggle
- [x] Summary stats (Over/Optimal/Under/Workouts counts)
- [x] Muscle detail bars with percentage breakdown

### Muscle Balance Analysis Engine (lib/muscle-balance.ts)
- [x] Track workout history per muscle group from completed workouts
- [x] Calculate frequency/volume per muscle group over configurable time window
- [x] Classify each muscle group as over-exercised, optimal, or under-exercised
- [x] Consider recommended weekly frequency per muscle group (MUSCLE_WEEKLY_TARGETS)
- [x] Persist analysis data with AsyncStorage (@workout_sessions)
- [x] getTodayTargetMuscles extracts muscles from today's workout schedule

### Suggested Exercises Section
- [x] generateSuggestions recommends exercises based on muscle balance analysis
- [x] Prioritize under-exercised muscle groups (high priority)
- [x] Suggest rest for over-exercised muscle groups (medium priority)
- [x] generatePlanChanges shows suggested changes to current workout plan
- [x] One-tap "Apply to My Plan" with confirmation dialog
- [x] applyPlanChanges updates plan in AsyncStorage (@guest_workout_plan)

### Testing
- [x] 31 unit tests passing (round68-muscle-balance.test.ts)
- [x] Tests cover: analysis engine, suggestions, plan changes, body heatmap, dashboard/plans integration
- [x] 0 TypeScript errors (tsc --noEmit exit code 0)

## Round 69 — Custom Workout Builder, Trend Charts, Personal Records

### Create Custom Workout Feature
- [x] New screen: app/create-workout.tsx with exercise category browsing
- [x] Exercise categories: Upper Body, Chest, Back, Shoulders, Biceps, Triceps, Lower Body, Quads, Hamstrings, Glutes, Calves, Core, Cardio, Full Body (via EXERCISE_CATEGORIES)
- [x] Exercise selection with search and category filter
- [x] AI rep suggestions based on exercise type, user fitness level, and goals (getRepSuggestion)
- [x] AI balance analysis showing if workout is too heavy on certain muscle groups (analyzeWorkoutBalance)
- [x] AI calorie expenditure estimate based on selected exercises and reps (estimateCalories)
- [x] AI muscle gain / fat loss estimates over time (estimateBodyComposition with daysToGoal)
- [x] AI coaching suggestions for workout improvement (getCoachingInsights with priority levels)
- [x] Save custom workout to plans system (@guest_workout_plan in AsyncStorage)
- [x] Navigation from Plans tab "Create" button to Create Custom Workout

### Weekly/Monthly Muscle Balance Trend Charts
- [x] TrendChart component (components/trend-chart.tsx) with SVG line charts
- [x] Weekly trend chart showing muscle balance evolution from workout sessions
- [x] Up to 12 weeks of trend data displayed
- [x] Visual chart using react-native-svg with smooth Catmull-Rom curves
- [x] Muscle-specific tracking (tap to overlay individual muscle trend)
- [x] Integrated into dashboard after Suggested Changes section

### Personal Records (PR) Tracking
- [x] lib/personal-records.ts: PR storage with AsyncStorage (@personal_records)
- [x] Track weight, reps, and sets per exercise with timestamps
- [x] PR history with getProgressChartData for chart visualization
- [x] PRProgressChart component with trend direction indicators
- [x] PR summary section on dashboard (Recent PRs, Top Lifts, Stats)
- [x] Auto-logging PRs during active workout completion (logWorkoutPRs)
- [x] New PR notification in workout completion alert

### Testing
- [x] 28 unit tests passing (round69-custom-workout.test.ts)
- [x] Tests cover: PR system, AI insights engine, custom workout screen, trend charts, integration
- [x] 0 TypeScript errors (tsc --noEmit exit code 0)

## Round 70 — UI/UX Fixes and Redesigns

### Bug Fixes
- [x] Fix multi-angle GIF views — all angle views now use the same correct GIF URL per exercise (Python script updated all 95 exercises)
- [x] Fix bottom tab bar overlapping "Using as Guest" bar — added marginBottom: 90 to guest/trial banners

### Quick Actions Redesign
- [x] Grouped 28 Quick Action options into 5 meaningful categories (Workout, Nutrition, Progress, Body, Settings)
- [x] Each category is tappable to expand/collapse its options (expandedGroups state)
- [x] PRO badges on premium features to drive upgrades

### Body Diagram Redesign
- [x] Redesigned body-diagram.tsx with SVG gradients, shadows, and detailed muscle paths for 3D appearance
- [x] Accurately highlights targeted muscle groups with gold (primary) and amber (secondary) colors
- [x] Used in exercise library, exercise detail, and workout exercise selection

### Workout Exercise Selection Enhancement
- [x] Body diagram with highlighted muscles shown in exercise header card during workout
- [x] Demo link button (play-circle-outline icon) added next to exercise info

### AI Assistant Icon Redesign
- [x] Generated vibrant gold/amber AI fitness trainer icon (assets/images/ai-coach-icon.png)
- [x] Used in tab bar (replaces MaterialIcons smart-toy) and AI Coach screen header
- [x] Glowing gold aura with circuit-board patterns on athletic figure

### Testing
- [x] 0 TypeScript errors (tsc --noEmit)
- [x] 25 unit tests passing (round70-ui-fixes.test.ts)

## Round 71 — Remove YouTube, Fix GIF Accuracy, Add Fullscreen

### Remove YouTube Videos
- [x] Remove react-native-youtube-iframe and react-native-webview dependencies
- [x] Remove react-native-web-webview dependency
- [x] Delete youtube-player.tsx component entirely
- [x] Remove all YouTube videoId references from exercise-demos.ts
- [x] Remove all YouTube-related imports and code from active-workout.tsx
- [x] Remove all YouTube-related imports and code from plans.tsx
- [x] Remove all YouTube-related imports and code from exercise-detail.tsx
- [x] Remove GIF/Video toggle (no more video option)

### Audit and Fix GIF Accuracy
- [x] Audit all 95+ exercise GIF URLs for duplicates (same URL used for different exercises)
- [x] Audit for mismatches (GIF shows wrong exercise for the name)
- [x] Fetch correct unique GIF URLs from ExerciseDB API for each exercise
- [x] Update exercise-demos.ts with correct unique GIF URLs
- [x] Update exercise-data.ts angleViews to use correct GIF URLs
- [x] Ensure accurate descriptions match the actual exercise shown in GIF

### Add Fullscreen GIF Enlarge
- [x] Add tap-to-enlarge functionality to GIF player
- [x] Fullscreen modal overlay with pinch-to-zoom
- [x] Close button and swipe-to-dismiss
- [x] Works in exercise library, exercise detail, and active workout screens

### Testing
- [x] 0 TypeScript errors
- [x] All tests pass (39 test files, 1219 tests passing)

## Round 72 — Exercise Alternatives & Favorites

### Exercise Alternative Suggestions
- [x] Create muscle group mapping for all exercises (chest, back, shoulders, arms, legs, core, cardio)
- [x] Build getAlternativeExercises() function that returns 3-5 alternatives for the same muscle group
- [x] Add "Try Instead" / alternatives section to exercise detail and active workout screens
- [x] Each alternative shows name, GIF thumbnail, and cue text
- [x] Tapping an alternative navigates to exercise detail screen

### Favorites System
- [x] Favorites context already existed with AsyncStorage persistence (reused)
- [x] Add heart/favorite toggle button to fullscreen GIF player (both ExerciseDemoPlayer and EnhancedGifPlayer)
- [x] Favorite state persists across app restarts
- [x] Visual feedback (filled vs outline heart icon, haptic on toggle)

### Testing
- [x] Unit tests for muscle group mapping and alternative suggestions (35 tests)
- [x] Unit tests for favorites persistence logic
- [x] 0 TypeScript errors
- [x] All tests pass (1253 passing, 40 test files)

## Round 73 — MuscleWiki API Integration (Accurate Exercise Videos)

### API Setup
- [x] Store MuscleWiki API key securely
- [x] Verify API key works with test request

### Exercise Mapping
- [x] Query MuscleWiki API to find all exercises matching our ~70 app exercises (80/82 mapped)
- [x] Map each app exercise to its correct MuscleWiki exercise ID
- [x] Extract video URLs (front/side views, male model) for each exercise

### Update Exercise Demos
- [x] Replace all inaccurate GIF URLs in exercise-demos.ts with MuscleWiki video URLs
- [x] Update angleViews in exercise-data.ts to use MuscleWiki front/side video angles (146/150 URLs updated)
- [x] Verify each exercise name maps to the correct MuscleWiki video

### Player Updates
- [x] Update ExerciseDemoPlayer and EnhancedGifPlayer to handle MP4 video via expo-video VideoView
- [x] Ensure fullscreen, favorites, and alternatives still work with new video format

### Testing
- [x] 0 TypeScript errors
- [x] All tests pass (1255 passing, 40 test files)

## Round 74 — Video Caching, Angle Toggle, Favorites Filter

### Video Caching / Preloading
- [x] Create video-preload service that prefetches next exercise's video during rest periods
- [x] Integrate preloading into active-workout.tsx (trigger on exercise transition / rest timer)
- [x] Enable useCaching: true on all VideoSource objects in both player components

### Front/Side Angle Toggle Button
- [x] Add a compact Front/Side toggle button to ExerciseDemoPlayer
- [x] Add a compact Front/Side toggle button to EnhancedGifPlayer (improve existing angle selector)
- [x] Ensure toggle works in both inline and fullscreen modes

### Favorites Filter in Exercise Library
- [x] Favorites filter chip already existed — enhanced with count badge
- [x] When active, shows only favorited exercises
- [x] Shows empty state when no favorites exist
- [x] Updated card preview to handle MP4 URLs with play icon placeholder

### Testing
- [x] 0 TypeScript errors
- [x] All tests pass (1286 passing, 41 test files)

## Round 75 — Fix Demo Videos + Detailed Muscle Diagram

### Fix Demo Videos Not Playing
- [x] Diagnosed CORS issue — MuscleWiki videos lack CORS headers for web playback
- [x] Added HTML5 <video> tag fallback for web (bypasses CORS restriction)
- [x] Native uses expo-video VideoView with caching enabled
- [x] Added error state UI with retry button when videos fail to load
- [x] Both ExerciseDemoPlayer and EnhancedGifPlayer updated with dual-platform support

### Detailed Anatomical Muscle Diagram
- [x] Installed react-native-body-highlighter for professional anatomical SVG body diagrams
- [x] Rewrote body-diagram.tsx with 3 components: BodyDiagramInteractive (detail), BodyDiagramInline (cards), BodyDiagram (full)
- [x] Mapped all 17 MuscleGroup types to body-highlighter Slug types (front + back)
- [x] Primary muscles highlighted in gold (#F59E0B), secondary in amber (#B45309)
- [x] Interactive front/back toggle on exercise detail screen
- [x] Inline compact diagrams on exercise library cards and active workout
- [x] Muscle label chips with color-coded dots

### Testing
- [x] 0 TypeScript errors
- [x] All tests pass (1303+ passing, 44 test files)

## Round 76 — Local GIF Assets + App Overview Document

### Convert MuscleWiki Videos to Local GIFs
- [x] Download MuscleWiki MP4 videos for all ~80 exercises
- [x] Convert MP4 videos to compact GIF files (small size, good quality)
- [x] Save GIFs as local assets in assets/exercise-gifs/
- [x] Update exercise-demos.ts to use require() for local GIF assets
- [x] Update player components to render local GIFs via expo-image (no video player needed)
- [x] Remove expo-video dependency from player components

### App Overview Document
- [x] Generate UI screenshots of key app screens
- [x] Create detailed app overview markdown with all features documented
- [x] Include screen descriptions, user flows, and feature explanations

### Testing
- [x] 0 TypeScript errors
- [x] All tests pass (35 new tests + all existing)

## Round 77 — NanoBanana UI Redesign (Typography + Per-Screen Accents)

### Typography & Theme System
- [x] Install Bebas Neue, DM Sans, Space Mono fonts
- [x] Configure font loading in _layout.tsx
- [x] Update theme.config.js with per-screen accent colors (gold, ice-blue, mint, rose)
- [x] Create typography utility for consistent font usage across screens

### Screen 1 — Onboarding Welcome
- [x] Atmospheric radial glow background (replace cinematic gym photo)
- [x] Glassmorphism feature badges (AI Workout Plans, AI Body Scan)
- [x] Progress dots at top, golden Next CTA at bottom
- [x] Bebas Neue heading, DM Sans body text

### Screen 2 — Auth / Login
- [x] Dominant Google button, email as ghost button, guest as text link
- [x] Social proof stats at bottom (4.9 stars, 77 exercises, 7 wearables)
- [x] PeakPulse logo with radial golden glow
- [x] Clean minimal centered layout

### Screen 3 — Dashboard
- [x] Today's workout as hero card (first full-width element)
- [x] 4 compact progress rings in horizontal row (gold, blue, teal, rose)
- [x] Clean 3x2 quick action grid
- [x] Single focused AI insight card
- [x] Streak badge with fire icon
- [x] Personalized greeting with Bebas Neue

### Screen 4 — AI Body Scan
- [x] CSS scanline animation on camera zone
- [x] Ice-blue accent color throughout
- [x] Neon border frame around scan area
- [x] Transformation target cards before CTA
- [x] Body Fat % and Weight stats with Space Mono numbers

### Screen 5 — Workout Plans
- [x] Week day selector with gold-highlighted current day
- [x] Exercise cards with GIF thumbnails in horizontal scroll
- [x] Muscle balance heatmap as inline SVG body silhouette
- [x] Color-coded zones: red (over-exercised), teal (optimal), dark (under)

### Screen 6 — Meals & Nutrition
- [x] Halal Mode badge at top of screen (not buried in settings)
- [x] Calorie tracker with mint/teal progress bar
- [x] Meal photo cards in 2-column grid
- [x] Snap/Barcode/Receipt as three equal quick-action buttons
- [x] Prayer schedule as dedicated Halal card

### Screen 7 — AI Coach
- [x] Opens on Insights tab (not blank chat)
- [x] Three contextual insight cards (Progress, Form Alert, Nutrition Tip)
- [x] Chat conversation below insights
- [x] Teal/mint accent color

### Screen 8 — Profile
- [x] Three plan tiers with color coding (white Free, ice-blue Basic, gold Advanced)
- [x] Condensed layout: stats, plans, settings in one view
- [x] Halal toggle as settings row item
- [x] User avatar and name prominent at top

### Testing
- [x] 0 TypeScript errors
- [x] All tests pass

## Round 78 — Side-View GIFs, Profile Enhancement, Feedback Mechanism

### Side-View GIF Fix
- [x] Investigate current side-view GIF mapping (duplicates front view)
- [x] Download actual side-view exercise videos from MuscleWiki API
- [x] Convert side-view videos to GIFs and save as local assets
- [x] Update exercise-data.ts angleViews to reference correct side-view GIF assets
- [x] Update gif-resolver.ts to map side-view URLs to correct local GIFs
- [x] Verify side tab shows different angle from front tab

### User Profile Enhancement
- [x] Add subscription status card (Free/Basic/Advanced with expiry date)
- [x] Add personal information section (name, email, age, height, weight, gender)
- [x] Add editable personal info fields with save functionality
- [x] Display membership since date and account type

### In-App Feedback Mechanism
- [x] Create feedback screen with issue type selector (Bug Report, Feature Request, General Feedback)
- [x] Add text input for description with character counter
- [x] Add optional screenshot attachment capability
- [x] Add satisfaction rating (1-5 stars)
- [x] Store feedback locally and send to server when available
- [x] Add feedback link in Profile screen settings section

### Testing
- [x] 0 TypeScript errors
- [x] All tests pass
- [x] New tests for side-view GIF resolution
- [x] New tests for feedback screen
- [x] New tests for profile subscription display

## Round 79 — Subscription Feature Gating + Profile Photo & Username

### Subscription-Based Feature Gating
- [x] Create FeatureGate context/provider with subscription tier awareness
- [x] Define feature-to-tier mapping (Free/Basic/Advanced features)
- [x] Create useFeatureGate hook for checking feature access
- [x] Create FeatureGate wrapper component with upgrade prompt overlay
- [x] Gate AI Body Scan behind Basic+ tier
- [x] Gate AI Coach Chat behind Advanced tier
- [x] Gate progress photos behind Basic+ tier
- [x] Gate wearable sync behind Basic+ tier
- [x] Gate exercise form check behind Advanced tier
- [x] Gate social feed behind Advanced tier
- [x] Gate challenges behind Advanced tier
- [x] Gate referral behind Basic+ tier
- [x] Gate notification preferences behind Basic+ tier
- [x] Show upgrade prompts with tier-specific pricing when gated features are tapped
- [x] Free tier: basic workout plans, exercise library, basic meal logging
- [x] Basic tier: AI body scan, progress photos, wearable sync, referral, notification prefs
- [x] Advanced tier: all features including form check, AI coaching, social feed, challenges

### Profile Photo Upload & Username
- [x] Add profile photo upload using expo-image-picker
- [x] Create UserProfileContext with AsyncStorage persistence
- [x] Display profile photo in profile header (replace default avatar)
- [x] Add PhotoOptionsModal (library, camera, remove options)
- [x] Add inline username editing with save/cancel
- [x] Persist username to AsyncStorage via UserProfileContext
- [x] Show username in profile header and greeting on dashboard
- [x] Show profile photo in dashboard hero section
- [x] Camera permission handling with user-friendly alert

### Testing
- [x] 0 TypeScript errors
- [x] All 32 new tests pass (round79-profile-gates.test.ts)
- [x] Tests for UserProfileContext (existence, exports, storage)
- [x] Tests for profile photo upload (image picker, modal, permissions)
- [x] Tests for username editing (inline edit, save, maxLength)
- [x] Tests for dashboard profile integration
- [x] Tests for feature gates on all premium screens
- [x] Tests for feature tiers configuration
- [x] Tests for root layout UserProfileProvider integration

## Round 80 — Workout Demos, Day-Specific Meals, Today-Focused Workouts, Body Scan Progress, Dashboard Ring

### Workout Demo Video Fix
- [x] Fix Demo button in workout plan to show correct exercise (not same one for all)
- [x] Pass exerciseName and gifAsset to ExerciseDemoPlayer so correct GIF loads
- [x] Front and side view tabs already supported in ExerciseDemoPlayer
- [x] Side view tab auto-hidden when exercise has only one angle view (hasMultipleAngles check)

### Meal Plan Day-Specific Fix
- [x] Meals show different content for each day of the week (todayMeals + otherMealDays)
- [x] Users can see meal plans for remaining days of the week (REST OF THE WEEK section)
- [x] Added meal swap with pantry integration (usePantry + mealSwapWithPantry endpoint)
- [x] AI offers alternative meal suggestions including outside pantry choices (includeBeyondPantry toggle)
- [x] Fixed breakfast image URL (replaced broken source.unsplash.com with direct images.unsplash.com)

### Workout Section Redesign (Today-Focused)
- [x] Workout tab primarily shows today's exercises (todayWorkout section at top)
- [x] Remaining weekday exercises shown further down (otherWorkoutDays + REST OF THE WEEK)
- [x] Added exercise swap functionality (handleExerciseSwap + swapExModal)
- [x] AI Coach guides exercise selection via exerciseSwap server endpoint (targets specific muscle groups)

### Body Scan Progress Tracking
- [x] Shows user's chosen transformation (target BF% + AI image) in YOUR PROGRESS section
- [x] Progress photos stored locally via AsyncStorage (@progress_photos)
- [x] Take Progress Photo (camera) and Pick Progress Photo (library) buttons
- [x] Progress photo timeline with date labels in Body Scan section
- [x] Progress bar showing current vs target BF%

### Dashboard Transformation Progress Ring
- [x] Added SVG progress ring on dashboard showing transformation progress percentage
- [x] Ring shows current BF% → target BF% with visual fill
- [x] Shows target image thumbnail, body fat to go text, and navigates to scan tab
- [x] Fallback BF% card shown when no target is set

### Testing
- [x] 0 TypeScript errors
- [x] All 36 new tests pass (round80-workout-meals-progress.test.ts)
- [x] Tests for workout demo fix (exerciseName passing, angle views)
- [x] Tests for day-specific meals (todayMeals, otherMealDays, pantry, swap)
- [x] Tests for today-focused workout section (todayWorkout, otherWorkoutDays)
- [x] Tests for body scan progress tracking (photos, timeline, goal card)
- [x] Tests for dashboard progress ring (SVG circle, percentage, navigation)

## Round 81 — Before/After Comparison, Calorie-Aware Meal Swaps, Premium Promotion, Push Notifications

### B### Before & After Photo Comparison
- [x] Add before-and-after comparison view in Body Scan progress section
- [x] Place first and latest progress photos side-by-side with BEFORE/LATEST labels
- [x] Show date labels and days elapsed between first and latest photo
- [x] Only renders when at least 2 progress photos exist

### Calorie/Macro-Aware Meal Swap
- [x] Integrate calorie tracking via useCalories into meal swap flow
- [x] Daily nutritional totals update automatically when a meal is swapped
- [x] Enforce daily caloric intake limit — Alert.alert warns before applying swap
- [x] Show EXCEEDS LIMIT badge on swap suggestions that go over budget
- [x] Meal swap suggestions show meal images via getMealPhotoUrl
- [x] Server endpoint returns imageUrl and dailyCalorieTarget support
- [x] Calorie budget bar shows remaining kcal in swap modal header

### Premium Feature Promotion
- [x] PremiumFeatureBanner + PremiumFeatureTeaser reusable components created
- [x] Dashboard: AI Coach, Body Scan, Pantry, AI Photo Logging banners
- [x] Plans: AI Coach teaser in workout section, Pantry + AI Photo Logging in meals
- [x] Scan: AI Body Transformation Tracking banner + progress photo teaser
- [x] Profile: AI Coach banner + Body Scan + Wearable Sync teasers
- [x] Banners auto-hide when user has required subscription tier
- [x] Upgrade CTAs route to subscription screen

### Push Notification Reminders
- [x] scheduleProgressPhotoReminder function in notifications.ts
- [x] Daily reminder option with configurable time
- [x] Weekly reminder option with configurable day-of-week and time
- [x] Off/Daily/Weekly frequency selector in notification-preferences
- [x] Day-of-week selector for weekly frequency
- [x] Time picker for reminder time
- [x] Progress photo summary in schedule card
- [x] Notification routes to /(tabs)/scan when tapped
- [x] Preferences saved to AsyncStorage and survive app restarts

### Testing
- [x] 0 TypeScript errors
- [x] All 30 new tests pass (round81-comparison-calories-premium-notifs.test.ts)
- [x] Tests for before/after comparison (4 tests)
- [x] Tests for calorie-aware meal swap (6 tests)
- [x] Tests for premium feature promotion (7 tests)
- [x] Tests for push notification reminders (10 tests)
- [x] Integration checks (3 tests)

## Round 82 — Dashboard Redesign, Before/After Slider, IAP, Streak, AI Coach Animation, Meal Fixes

### Dashboard Redesign
- [x] Fix greeting to say "HI, [Username]" instead of "YOUR [Name]"
- [x] Move today's workout plan and meal plan to the top of dashboard
- [x] Show upcoming meal prominently in the nutrition section
- [x] Calorie progress section follows workout/meal
- [x] Weekly goals, workouts, streak, meals section present
- [x] Created separate "Progress Photos" tile with streak counter and camera CTA
- [x] Reordered: Hero → Workout → Nutrition → Stats → Calories → Ring → Goals → Photos → AI Coach

### Before/After Slider Comparison
- [x] Built full-screen before/after slider with PanResponder drag gesture
- [x] Interactive transformation view with draggable handle and vertical divider line
- [x] Shows first and latest progress photos with BEFORE/AFTER labels and days elapsed
- [x] Slider clips the before image to reveal the after image underneath

### Streak Tracker
- [x] Streak counter computed from consecutive days of progress photo submissions
- [x] Displayed on dashboard in the Progress Photos tile with flame icon
- [x] Loaded from AsyncStorage @progress_photos with date-based streak calculation

### Animated AI Coach Icon
- [x] Generated AI gym trainer/coach character icon (ai-coach-icon.png)
- [x] Added pulsing glow animation with withRepeat + withTiming
- [x] Prominent card placement on dashboard with gradient background and animated shadow

### In-App Purchase Flow
- [x] Paywall modal now has billing cycle toggle (monthly/annual) with -30% badge
- [x] Direct "Subscribe" button with price that opens Stripe checkout via Linking.openURL
- [x] Authentication check before purchase with sign-in prompt
- [x] "Compare all plans" secondary CTA to full subscription page
- [x] Secure payment via Stripe badge for trust

### Meal UI Fixes
- [x] sanitizeMealName function removes unicode bullets (\u00b7, \u2022, etc.)
- [x] Applied to MealCard meal.name and swap modal alt.name
- [x] Swap suggestions use unique Unsplash food photos (10 curated IDs rotated per suggestion)
- [x] Server returns imageUrl per alternative; client falls back to getMealPhotoUrl

### Testing
- [x] 0 TypeScript errors
- [x] All 29 new tests pass (round82-dashboard-slider-streak-iap.test.ts)
- [x] Tests for dashboard redesign (6 tests)
- [x] Tests for before/after slider (4 tests)
- [x] Tests for streak tracker (3 tests)
- [x] Tests for AI coach animation (3 tests)
- [x] Tests for in-app purchase flow (6 tests)
- [x] Tests for meal UI fixes (4 tests + 3 swap image tests)

## Round 83 — Weekly Summary, Exercise Tracking, Social Sharing, Invite/Circles, Golden Backgrounds

### Exercise Completion Tracking
- [x] Track which exercises are completed for today's workout
- [x] Dashboard workout card shows done vs remaining exercises
- [x] Persist completion state in AsyncStorage
- [x] Checkbox/tap to mark exercises as done

### Weekly Progress Summary
- [x] Create weekly-summary screen aggregating workout completion, calorie adherence, body composition
- [x] Shareable infographic layout with stats overlay
- [x] Include workout days completed, calories tracked, BF% change
- [x] Share via system share sheet

### Social Sharing (Before/After)
- [x] Share before/after comparison photos
- [x] Customisable watermark on shared images
- [x] Progress statistics overlay (BF% change, days, streak)
- [x] Use expo-sharing for native share sheet

### Invite & Social Circles
- [x] Generate invite link for users to invite friends
- [x] Social circle creation and management
- [x] Monitor friends' progress within the circle
- [x] Challenge friends (fitness challenges)
- [x] Social feed within the circle
- [x] Activity feed within the circle

### Golden-Themed HD Backgrounds
- [x] Generate golden-themed HD backgrounds matching AI coach aesthetic
- [x] Apply backgrounds to all main screens (dashboard, plans, scan, profile)
- [x] Make dashboard tiles translucent to show background
- [x] Consistent golden/warm colour theme throughout
- [x] Replaced all Unsplash hero backgrounds with golden-themed CDN images

### Testing
- [x] 0 TypeScript errors
- [x] All 59 tests pass (round83-features.test.ts)
- [x] New tests for exercise completion tracking (3 tests)
- [x] New tests for weekly summary (7 tests)
- [x] New tests for social sharing (5 tests)
- [x] New tests for invite/social circles (15 tests)
- [x] New tests for golden backgrounds (7 tests)
- [x] New tests for social card generator (7 tests)
- [x] New tests for dashboard navigation (2 tests)
- [x] New tests for social circle screen (9 tests)

## Round 84 — Social Notifications, Challenge Templates, Dashboard Wearable Tab

### Push Notifications for Social Circle Events
- [x] Notify user when a friend joins their circle
- [x] Notify user when a friend completes a challenge
- [x] Notification service for social circle events (social-notifications.ts)
- [x] Notification preferences for social alerts (enable/disable) in notification-settings.tsx
- [x] Social notification types: friend joined, challenge completed, challenge invitation, circle milestone, friend streak, leaderboard change

### Pre-Built Challenge Templates
- [x] Create challenge template data (7-Day Step, Protein Goal Week, etc.) — 12 templates across 6 categories
- [x] Challenge template picker UI in challenge.tsx Templates tab
- [x] Launch challenge from template within a circle
- [x] Challenge progress tracking per participant
- [x] Challenge completion detection and notification

### Dashboard Wearable Metrics Tab
- [x] Add WearableMetricsPanel component with 4 tabs (Overview, Heart, Activity, Sleep)
- [x] Display steps, calories, heart rate, sleep, distance, VO2 Max, HRV, Blood O2
- [x] Apple Health / Google Fit connect buttons when not connected
- [x] Connect to wearable-sync flow from dashboard tab
- [x] Real-time metric cards with progress indicators, activity rings, weekly sparklines
- [x] 7-day averages row and weekly bar charts

### Testing
- [x] 0 TypeScript errors
- [x] All 51 tests pass (round84-features.test.ts)
- [x] 8 tests for social notifications
- [x] 9 tests for challenge templates
- [x] 4 tests for challenge screen templates tab
- [x] 3 tests for notification settings social section
- [x] 1 test for AI notification scheduler preferences
- [x] 22 tests for wearable metrics panel
- [x] 4 tests for dashboard integration

## Round 85 — Backgrounds, Chat, Wearable Sync, Achievement Gallery

### Golden HD Backgrounds on All Screens
- [x] Audited all 47 screens for golden-themed backgrounds
- [x] Applied ImageBackground with golden theme to all 25+ screens that were missing them
- [x] Created shared constants/golden-backgrounds.ts with CDN URLs and overlay styles
- [x] Translucent tiles over backgrounds for visual depth on all screens

### Real-Time Chat for Challenges & Circles
- [x] Chat service (lib/chat-service.ts) with AsyncStorage persistence
- [x] Full chat screen (app/chat.tsx) with golden-themed UI
- [x] Chat tab added to Social Circle screen with Open Chat button
- [x] Challenge Chat button on each active challenge card
- [x] Polling-based real-time updates (3-second interval)
- [x] Message reactions, reply-to, deletion, system messages
- [x] Seed demo messages for new chat rooms

### Wearable Integration (renamed from Wearable Metrics)
- [x] Renamed dashboard section to "Wearable Integration"
- [x] Added dropdown with 7 platforms: Apple Health, Google Fit/Health Connect, Fitbit, Garmin, Samsung Health, WHOOP, Oura Ring
- [x] Each platform shows device descriptions (e.g., "Forerunner, Venu, Fenix, Vivoactive")
- [x] Implemented 15-minute background auto-sync interval in wearable-context
- [x] Auto-sync cleans up on unmount, only runs when permission granted
- [x] Info text mentions all platforms sync via HealthKit/Health Connect

### Achievement Badges Gallery
- [x] Created achievements.tsx with full gallery UI
- [x] 29 badges across 4 categories (fitness, nutrition, social, challenges)
- [x] 5 rarity tiers (common, uncommon, rare, epic, legendary) with distinct colors
- [x] 5 challenge trophies in trophy case section
- [x] Locked/unlocked states with progress bars and lock overlays
- [x] Badge detail modal with rarity, description, progress
- [x] Overall progress card with rarity breakdown
- [x] Share achievements via system share sheet
- [x] Navigation from dashboard quick actions

### Testing
- [x] 0 TypeScript errors
- [x] All 59 tests pass (round85-features.test.ts)
- [x] 13 tests for golden backgrounds across screens
- [x] 8 tests for chat service
- [x] 8 tests for chat screen
- [x] 3 tests for chat in social circle
- [x] 3 tests for chat in challenges
- [x] 6 tests for wearable integration dropdown
- [x] 4 tests for background auto-sync
- [x] 12 tests for achievements gallery
- [x] 2 tests for dashboard integration

## Round 86 — Read Receipts & Typing Indicators

### Read Receipts
- [x] Track which users have read each message (ReadReceipt interface with userId, userName, readAt)
- [x] Show read receipt indicators (double checkmarks gold=read, grey=delivered, single=sent)
- [x] Display "Seen by X, Y" tooltip on tap of read receipt with names list
- [x] Update read status when messages come into view (markMessagesAsRead on init + poll)
- [x] Persist read state in AsyncStorage (readBy array on each ChatMessage)
- [x] Simulated read receipts from circle members for demo

### Typing Indicators
- [x] Track typing state per user per room (TypingEntry with expiresAt)
- [x] Show animated typing indicator bar with 3 dots when others are typing
- [x] Display names of who is typing ("Alex is typing...", "Alex and Sarah are typing...", "Alex and 2 others are typing...")
- [x] Auto-expire typing state after 4-second timeout (TYPING_TIMEOUT_MS)
- [x] Broadcast typing state on text input changes (handleTextChange)
- [x] Simulated typing from circle members for demo

### Testing
- [x] 0 TypeScript errors
- [x] All 54 tests pass (round86-features.test.ts)
- [x] 3 tests for read receipt types
- [x] 5 tests for markMessagesAsRead
- [x] 3 tests for getReadReceiptSummary
- [x] 3 tests for simulateReadReceipts
- [x] 9 tests for typing indicators
- [x] 14 tests for chat screen read receipt UI
- [x] 13 tests for chat screen typing indicator UI
- [x] 3 tests for seed data read receipts
- [x] 2 tests for exports

## Round 87 — Chat Search, Media Sharing, Notification Badges

### Message Search
- [x] Add search bar in chat header with toggle icon (search icon in header)
- [x] Filter messages by keyword in real-time (useMemo searchMatches)
- [x] Highlight matching text with gold background, active match brighter
- [x] Scroll to matched messages with prev/next arrow navigation
- [x] Show match count indicator (e.g., "2/5") and "No results" state
- [x] Graceful onScrollToIndexFailed handling

### Media Sharing in Chat
- [x] Camera button in input bar with handleSendImage
- [x] Alert picker: Progress Photo, Workout Screenshot, Meal Photo
- [x] Image thumbnails rendered in chat bubbles with fullscreen icon overlay
- [x] Full-screen image viewer modal on tap
- [x] Image messages stored with type "image" and imageUrl field
- [x] Photo icon in message metadata for image messages

### Chat Notification Badges
- [x] getTotalUnreadCount sums unreadCount from all rooms
- [x] Red badge on Social Circle Chat tab with count (capped at 99+)
- [x] Red badge on Challenge Active tab with count (capped at 99+)
- [x] 5-second polling interval for real-time badge updates
- [x] Clear badge when Chat tab is selected in Social Circle

### Testing
- [x] 0 TypeScript errors
- [x] All 47 tests pass (round87-features.test.ts)
- [x] 6 tests for chat service image support
- [x] 12 tests for message search UI
- [x] 9 tests for media sharing UI
- [x] 7 tests for Social Circle unread badge
- [x] 6 tests for Challenge unread badge
- [x] 7 tests for existing features preserved

## Round 88 — Replace MuscleWiki Videos with AI-Generated GIFs

### Exercise Demo Replacement
- [x] Audited all MuscleWiki video URLs — 146 URLs in exercise-data.ts, 126 GIF assets in exercise-gif-registry.ts
- [x] Identified 76 unique exercises needing AI-generated images
- [x] Generated 76 AI exercise images in parallel (proper form, gym setting)
- [x] Uploaded all images to CDN (manuscdn.com)
- [x] Replaced all 146 MuscleWiki URLs in exercise-data.ts with CDN URLs
- [x] Replaced all 126 require() GIF assets in exercise-gif-registry.ts with CDN URL strings
- [x] Also replaced 4 exercisedb.dev URLs (battle rope, high knees)
- [x] Updated gif-resolver.ts to handle CDN string URLs
- [x] Updated ExerciseDemo.gifAsset type to accept string | number
- [x] Updated ExerciseDemoPlayer gifAsset prop to accept string | number
- [x] Removed 126 old .gif files (37MB) from assets/exercise-gifs
- [x] Verified exercise-demo matches: bench press, squat, deadlift, pull up, lateral raise, bicep curl all correct

### Testing
- [x] 0 TypeScript errors, 0 LSP errors
- [x] All 32 tests pass (round88-exercise-images.test.ts)
- [x] 6 tests for CDN migration in exercise-gif-registry
- [x] 8 tests for gif-resolver CDN URL handling
- [x] 3 tests for exercise-demos updated types
- [x] 4 tests for exercise-data no MuscleWiki URLs
- [x] 2 tests for exercise-demo-player string URL support
- [x] 1 test for enhanced-gif-player string URL support
- [x] 2 tests for old GIF assets removed
- [x] 6 tests for exercise-demo mismatch verification

## Round 89 — Form Annotations, Audio Cues, Photo Comparison

### Exercise Form Annotations
- [x] Created form-annotations.ts with 20 exercises: joint angles, alignment lines, checkpoints
- [x] Built FormAnnotationOverlay SVG component with arc rendering, line drawing, checkpoint markers
- [x] Toggle button in ExerciseDemoPlayer to show/hide annotations
- [x] Color-coded: correct (green lines), warning checkpoints (amber), joint angles (blue/gold)
- [x] AnnotationLegend component explains color coding
- [x] Simplified mode for smaller views

### AI-Narrated Audio Form Cues
- [x] Created audio-form-cues.ts with 13 exercises, 5 phases per exercise (setup, execution, peak, return, breathing)
- [x] Text-to-speech via expo-speech with speakCue(), stopSpeaking(), isSpeaking()
- [x] Play/pause audio button in ExerciseDemoPlayer with phase-colored indicator
- [x] Sequential cue playback with auto-advance between phases
- [x] Phase color coding and icons (setup=blue, execution=gold, peak=green, return=purple, breathing=amber)

### Custom Exercise Photo Upload
- [x] Full form-compare.tsx screen with camera and gallery photo picker (expo-image-picker)
- [x] Side-by-side view mode: reference image + user photo with form annotations
- [x] Overlay mode: both images at 50% opacity superimposed for form comparison
- [x] Save photos to AsyncStorage for progress tracking with date history
- [x] Form history horizontal scroll showing past photos
- [x] Form comparison tips section
- [x] Navigation from ExerciseDemoPlayer in plans.tsx and active-workout.tsx

### Testing
- [x] 0 TypeScript errors, 0 LSP errors
- [x] All 54 tests pass (round89-features.test.ts)
- [x] 9 tests for form annotations data
- [x] 8 tests for FormAnnotationOverlay component
- [x] 8 tests for audio form cues
- [x] 8 tests for ExerciseDemoPlayer integration
- [x] 16 tests for form compare screen
- [x] 2 tests for navigation integration
- [x] 3 tests for annotation legend

## Round 90 — Workout Timer with Voice Coaching

### Workout Timer
- [x] Countdown timer component with start/pause/reset controls
- [x] Rest timer between sets with configurable duration
- [x] Set tracking (current set / total sets) with auto-advance
- [x] Visual progress ring/bar showing time remaining
- [x] Keep screen awake during active timer (expo-keep-awake)
- [x] Haptic feedback on timer events (set complete, rest over)

### Voice Coaching Integration
- [x] Auto-play audio form cues at the start of each exercise set
- [x] Voice countdown for rest periods (10, 5, 4, 3, 2, 1, Go!)
- [x] Voice announcements for set completion and exercise transitions
- [x] 4-mode voice toggle (Full Coach, Cues Only, Countdown Only, Muted)
- [x] Phase-aware cue playback (setup on first set, execution on subsequent)

### Integration
- [x] Wire timer into active-workout screen (Voice Coach Timer button)
- [x] Timer accessible from exercise cards during workout
- [x] Voice Coach Settings screen with persistence (AsyncStorage)

### Testing
- [x] 0 TypeScript errors
- [x] 90 new tests all passing (round90-workout-timer-voice-coach.test.ts)
- [x] New tests for workout timer component, settings, and logic
- [x] New tests for voice coaching integration and audio cues

## Round 91 — Analytics, Sounds, Offline Mode, Timer Enhancements

### Workout History Analytics
- [x] Workout analytics data service (lib/workout-analytics.ts) — aggregate volume, frequency, strength from history
- [x] Analytics chart components (volume over time, frequency by week, strength progression, muscle distribution)
- [x] Workout Analytics screen (app/workout-analytics.tsx) with tab-based chart views
- [x] Navigation links from profile screen and home screen quick actions
- [x] 1w/1m/3m/6m/all time period selectors

### Custom Rest Timer Sounds
- [x] Rest timer sound service (lib/rest-timer-sounds.ts) with 7 sound types (none/beep/double_beep/chime/triple_chime/bell/voice)
- [x] Timer Sounds settings screen (app/rest-timer-sounds.tsx) with preview and selection UI
- [x] Completion sound, countdown sound, and halfway warning support
- [x] Integrated sound playback into WorkoutTimerCoach rest countdown
- [x] Persist sound preferences to AsyncStorage

### Offline Workout Mode
- [x] Offline cache service (lib/offline-workout-cache.ts) for workout plans with audio cues and demos
- [x] Auto-cache current workout plan to AsyncStorage on workout start
- [x] Load cached workout plan and audio cues when offline
- [x] Offline Cache settings screen (app/offline-cache.tsx) with status, pre-cache, and clear actions
- [x] Network status detection using expo-network

### Enhanced Timer Exercise Indicators
- [x] Current exercise highlight card with "NOW" badge, set progress, and gold border
- [x] Next exercise preview card with "NEXT" badge, name, sets, reps
- [x] "Finish!" indicator with trophy icon when on last exercise
- [x] Enhanced exercise chips with done (green check), current (gold), and next (subtle gold) states
- [x] Arrow connector between current and next exercise cards

### Testing
- [x] 0 TypeScript errors
- [x] 51 new tests all passing (round91-features.test.ts)
- [x] Tests for analytics data aggregation (volume, frequency, strength, summary)
- [x] Tests for rest timer sound service (all 7 types, settings persistence, playback)
- [x] Tests for offline cache service (cache/load/clear, auto-cache, status, multi-day)
- [x] Tests for exercise indicator logic (current/next/done states, boundaries, metadata)

## Round 92 — UX Overhaul (All 8 Recommendations from Analysis Report)

### R4: Simplify Tab Navigation (6 tabs → 4 tabs)
- [x] Reduced tabs to 4: Home, Train, Nutrition, Profile
- [x] Moved Body Scan to Home "Explore" grid + Profile
- [x] Moved AI Coach to Home "Explore" grid + accessible from Train
- [x] Renamed Plans tab to "Train", Meals tab to "Nutrition"
- [x] Updated icon-symbol.tsx with new tab icons

### R5: Floating "Start Workout" Button
- [x] Created FloatingStartWorkout component with persistent FAB
- [x] Shows today's workout focus (e.g., "Start: Upper Body")
- [x] Navigates to active workout with today's plan pre-loaded
- [x] Positioned above tab bar with proper safe area handling

### R1: Restructure Dashboard (20+ sections → 6 focused sections)
- [x] Hero greeting + today's date (section 1)
- [x] Today's Workout card with prominent Start CTA (section 2)
- [x] Daily Progress compact row (calories + macros + workout completion) (section 3)
- [x] Weekly Goals rings compact (section 4)
- [x] Quick Insights carousel (section 5)
- [x] "Explore More" grid with 6 tiles (section 6)
- [x] Removed/relocated: detailed nutrition, wearable metrics, muscle balance, PRs, tips, premium banners

### R6: Quick Insights Carousel
- [x] Horizontally swipeable carousel component (QuickInsightsCarousel)
- [x] Streak card, PR Alert card, Muscle Tip card, AI Coach card, Analytics card, Voice Coach card
- [x] Each card links to relevant detail screen
- [x] Contextual cards based on user data

### R3: Restructure Subscription Tiers
- [x] Renamed Advanced to "Pro" across entire codebase (hooks, components, server, screens)
- [x] Gated AI workout plans to Basic tier
- [x] Gated AI meal plans to Basic tier
- [x] Moved Voice Coaching, Analytics, Offline Mode, PR tracking to Basic tier
- [x] Updated pricing: Basic £5.99/mo (£3.99 annual), Pro £11.99/mo (£7.99 annual)
- [x] Updated feature lists in subscription screen with 3-tier comparison

### R7: Redesign Paywall Experience
- [x] Made annual plan default selection with "Best Value" badge
- [x] Show monthly price as anchor, annual as per-month equivalent
- [x] Added explicit savings messaging ("Save 33%")
- [x] Added "Cancel anytime" assurance text
- [x] Updated paywall modal with 3-tier design (Free/Basic/Pro)

### R2: Progressive Feature Disclosure
- [x] Feature discovery service (lib/feature-discovery.ts) with 6 milestone triggers
- [x] Contextual prompt after first workout → Analytics
- [x] Contextual prompt on first timer use → Voice Coaching
- [x] Contextual prompt after 3 workouts → Personal Records
- [x] Contextual prompt after first progress photo → Body Scan
- [x] Contextual prompt after 5 meals → Meal Prep
- [x] Contextual prompt after first week → Weekly Summary
- [x] Dismissible DiscoveryBanner component integrated in dashboard
- [x] Wired recording hooks into active-workout, calorie-context, scan screens
- [x] Track shown prompts in AsyncStorage (show each only once)

### R8: Consolidate Profile Settings
- [x] Reorganized into 4 categories: Training, Nutrition & Body, Social & Community, Settings & Preferences
- [x] Each category as clearly labelled section with icons
- [x] Kept collapsible sections for clean organization
- [x] Grouped Analytics, PR, Calendar, Workout History under Training
- [x] Grouped Rest Timer, Voice Coach, Timer Sounds, Offline Cache under Settings & Preferences

### Testing
- [x] 0 TypeScript errors
- [x] 35 new tests all passing (round92-ux-overhaul.test.ts)
- [x] Tests for feature discovery service (prompts, milestones, dismissal, priority)
- [x] Tests for subscription tier changes (Free/Basic/Pro, feature gating)
- [x] Tests for analytics, sounds, offline cache, voice coach settings
- [x] Tests for component file existence verification
