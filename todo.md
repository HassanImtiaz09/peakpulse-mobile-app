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
