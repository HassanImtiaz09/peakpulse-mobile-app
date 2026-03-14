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
