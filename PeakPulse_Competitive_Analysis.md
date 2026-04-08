# PeakPulse AI: Competitive Analysis and Strategic Improvement Report

**Author:** Manus AI
**Date:** April 8, 2026
**Scope:** Personalization, adaptive intelligence, engagement mechanics, and neurodivergent-friendly UX

---

## Executive Summary

PeakPulse AI has grown into a feature-rich fitness application with 63 screens, 200 source files, and over 23,000 lines of code. It offers AI-generated workout and meal plans, body scanning, form analysis, streak tracking, challenges, and a comprehensive exercise library. However, a critical audit against leading competitors — Fitbod, MyFitnessPal, Strong, JEFIT, and Noom — reveals three systemic gaps that limit user retention and differentiation: **static plan intelligence** (plans do not adapt to real-life disruptions), **passive personalization** (the app collects user data during onboarding but rarely acts on it dynamically), and **cognitive overload in the workout UX** (the Plans tab and active workout screen present dense, list-heavy interfaces that can overwhelm users, particularly those who are neurodivergent).

This report provides a structured analysis of each gap, benchmarks PeakPulse against competitors, and proposes 24 actionable improvements organized into three strategic pillars: Adaptive Plan Intelligence, Deep Personalization, and Neurodivergent-Friendly UX.

---

## 1. Competitive Landscape

### 1.1 Feature Comparison Matrix

The following table compares PeakPulse's current capabilities against five leading fitness applications across the features most relevant to personalization, adaptiveness, and user experience.

| Feature | PeakPulse AI | Fitbod | MyFitnessPal | Strong | JEFIT | Noom |
|---|---|---|---|---|---|---|
| AI-generated workout plans | Yes | Yes (algorithm) | No | No | Yes (PO system) | No |
| AI-generated meal plans | Yes | No | No (manual logging) | No | No | Partial (lessons) |
| Body scan / photo analysis | Yes | No | No | No | No | No |
| Form analysis (video) | Yes | No | No | No | No | No |
| **Adaptive plan rescheduling** | **No** | **Yes** | N/A | No | **Yes** | **Yes** |
| **Missed workout adjustment** | **No** | **Yes** (auto-deload) | N/A | No | **Yes** | **Yes** |
| **Energy/readiness check-in** | **No** | No | No | No | No | **Yes** (mood) |
| Progressive overload tracking | No | Yes (core feature) | No | Partial | Yes (AI-powered) | No |
| Muscle recovery tracking | Partial (balance) | Yes (48h model) | No | No | Yes | No |
| Exercise substitution | Yes (AI swap) | Yes (automatic) | No | No | Yes | No |
| Streak tracking | Yes | No | Yes | No | No | Yes |
| Challenges / gamification | Yes (challenges) | No | Yes (badges) | No | Yes (social) | Yes (lessons) |
| Social features | Yes (feed, groups) | No | Yes (friends) | No | Yes (community) | Yes (groups) |
| Calm/focus mode | **No** | No | No | No | No | No |
| Progressive disclosure in workouts | **No** | Partial | N/A | **Yes** (minimal) | No | N/A |
| Behavioral psychology integration | **No** | No | No | No | No | **Yes** (core) |

### 1.2 Key Competitive Insights

**Fitbod** differentiates itself through its training algorithm, which tracks muscle group fatigue across a rolling window and automatically adjusts weight suggestions, exercise selection, and volume based on recovery status. When a user misses workouts for an extended period, Fitbod automatically reduces weight suggestions to lower injury risk and ease the user back in [1]. Its algorithm uses nonlinear periodization, meaning it does not follow rigid weekly schedules but instead adapts each session to the user's current state [2].

**JEFIT** recently launched an AI-powered Progressive Overload System that analyzes actual workout performance and provides "clearer, more reliable" weight and rep suggestions. Rather than simply adding weight each session, it evaluates movement balance, stimulus volume, and strength trends to make intelligent adjustments [3]. This represents the direction the industry is moving — from static plan generation to continuous performance-based adaptation.

**Noom** takes an entirely different approach by grounding its product in behavioral psychology. Its "4 C's" framework (Clinical, Coaching, Community, Content) focuses on sustainable behavior change rather than workout optimization [4]. The key insight from Noom's approach is that **understanding why a user missed a workout matters more than rescheduling it**. Was it fatigue? Motivation? Schedule conflict? Each reason demands a different response.

**Strong** succeeds through radical simplicity. Its interface is "stripped down to essentials — log your sets, track your progress, move on" [5]. This minimalist approach is particularly effective for experienced lifters who find feature-rich apps distracting, and it offers a useful lesson for PeakPulse: not every screen needs to show everything at once.

**MyFitnessPal** drives engagement primarily through streaks and social accountability. Its gamification is subtle — no points or levels, just streak badges (7-day, 30-day, 90-day) and community challenges that create intrinsic motivation through tangible progress visualization [6].

---

## 2. Critical Gap Analysis: PeakPulse AI

### 2.1 Gap 1: Static Plan Intelligence

PeakPulse generates workout plans through a single LLM call that produces a fixed 7-day schedule. The generation prompt is:

> "Generate a complete 7-day workout plan as JSON for: Goal: [goal], Style: [style], Days/week: [days], Level: [level]."

Once generated, this plan never changes. There is no mechanism to detect that a user missed Monday's push day and should either reschedule it or redistribute its volume across the remaining week. There is no deload logic — if a user takes two weeks off, the app presents the same weights and volume as before the break. There is no progressive overload — the plan suggests the same sets, reps, and (implicitly) weights indefinitely.

The `streak-tracking.ts` library detects missed weeks for streak calculation purposes (line 389: "There's a gap — the previous week was missed"), but this information is never fed back into plan adjustment. The `muscle-balance.ts` module calculates which muscle groups are over- or under-exercised, but this analysis is purely informational — it does not influence the next generated workout.

**Impact:** Users who miss workouts (which is most users, most weeks) receive no acknowledgment or adaptation. The plan feels robotic rather than personal. This is the single largest gap between PeakPulse and Fitbod.

### 2.2 Gap 2: Passive Personalization

The onboarding flow collects substantial user data: name, goal (lose fat / build muscle / maintain), workout style (gym / home / calisthenics), dietary preference, days per week, body metrics (weight, height, age, gender), activity level, region, and cuisine preferences. This data is used once — during the initial plan generation — and then largely ignored.

The app does not track how the user's behavior diverges from the plan over time. It does not learn which exercises the user skips, swaps, or spends extra time on. It does not notice that the user consistently works out in the evening rather than the morning, or that they always skip Friday workouts. The AI coach exists as a chat interface but does not proactively surface insights like "You've been skipping leg exercises for 3 weeks — want me to adjust your plan?"

The daily check-in (`daily-checkin.tsx`) captures photos, weight, and body fat estimates, but this data does not flow back into workout or meal plan generation. The calorie context tracks daily intake, but there is no feedback loop where consistently under-eating triggers a meal plan adjustment or a notification.

**Impact:** The app feels like a content generator rather than a personal trainer. After the initial onboarding "wow" moment, the experience becomes static.

### 2.3 Gap 3: Cognitive Overload in Workout UX

The Plans tab (`plans.tsx`, 1,114 lines) presents the full 7-day schedule as a vertical list of expandable cards. When expanded, each day shows all exercises simultaneously with sets, reps, rest times, muscle diagrams, video thumbnails, swap buttons, and completion checkboxes. For a typical 6-exercise day, the expanded card contains approximately 30 interactive elements.

The active workout screen (`active-workout.tsx`, 1,826 lines) uses a horizontal scroll navigator showing all exercise names as chips at the top, with the current exercise's full detail card below. While this is better than showing all exercises vertically, the exercise detail card itself is dense: it includes a video player, muscle diagram, sets/reps tracker, rest timer, notes field, form tips, and alternative exercise suggestions — all visible simultaneously.

The home screen (`index.tsx`, 1,583 lines) contains at least 7 distinct sections: greeting, streak badge, today's workout preview, muscle balance diagram, weekly progress, recent activity, and quick actions. The meals tab (`meals.tsx`, 4,606 lines) is the largest single file in the application.

**Impact for neurodivergent users:** Research on designing for neurodivergence identifies "too many elements competing for attention" as the primary cause of overwhelm [7]. Executive function challenges make large tasks harder to manage, and the recommended solution is to "use progress indicators, micro-flows, and immediate feedback" [7]. The current PeakPulse workout UX violates these principles by presenting the full scope of a workout upfront rather than revealing it progressively.

A user with ADHD on the r/ADHDFitness subreddit articulated this precisely: "The main problem for ADHD is building consistent habits and as soon as one workout requires more energy or executive function than you have for the day, the downward spiral starts and it will be months before you pick it up again" [8]. The proposed solution was an energy-level-based workout selection system: "Is it zero? Here's one exercise. Is it low? Here's 2-3 exercises in a circuit for 10 minutes. Is it medium? Here's 4-6 exercises" [8].

---

## 3. Strategic Recommendations

### 3.1 Pillar 1: Adaptive Plan Intelligence

These recommendations transform PeakPulse from a static plan generator into a dynamic training system that responds to real-life disruptions.

| Priority | Feature | Description | Complexity |
|---|---|---|---|
| P0 | **Missed Workout Detection and Rescheduling** | When a scheduled workout day passes without a logged session, prompt the user the next day with three options: (a) do the missed workout today, (b) merge key exercises into the next scheduled day, or (c) skip it and let the AI redistribute volume across the remaining week. Store the decision to learn the user's preference over time. | Medium |
| P0 | **Return-from-Break Deload** | When the app detects a gap of 7+ days since the last workout, automatically reduce suggested weights by 20-30% and volume by 1-2 sets per exercise for the first week back. Show a "Welcome Back" card explaining the adjustment. Fitbod does this automatically [1]; PeakPulse should too. | Medium |
| P1 | **Progressive Overload Engine** | After each completed workout, compare performance (weight x reps x sets) against the previous session for each exercise. If the user completed all prescribed reps, suggest a small increase (2.5 kg / 5 lbs for compounds, 1 kg / 2 lbs for isolation) for the next session. Store a performance history per exercise. JEFIT's new PO system is the benchmark here [3]. | High |
| P1 | **Muscle Recovery Awareness** | Use the existing `muscle-balance.ts` data to prevent scheduling exercises for muscle groups that were trained less than 48 hours ago. When the user opens the Plans tab, visually indicate which muscle groups are "fresh" vs "recovering" vs "recovered" using the body diagram. | Medium |
| P2 | **Weekly Plan Regeneration** | At the start of each week, offer to regenerate the plan based on the previous week's actual performance, missed days, and updated goals. The LLM prompt should include: "Last week the user completed 3 of 5 planned workouts, skipping Tuesday (legs) and Friday (shoulders). They increased bench press by 5 lbs. Adjust this week's plan accordingly." | Medium |
| P2 | **Contextual Meal Plan Adjustment** | When the calorie tracker shows consistent under-eating (3+ days below 80% of target) or over-eating, trigger a notification offering to adjust the meal plan. When a user misses meals, suggest simpler alternatives (smoothies, meal prep batches) rather than the same complex recipes. | Medium |

### 3.2 Pillar 2: Deep Personalization

These recommendations make the app feel like it knows the user personally, not just their initial profile data.

| Priority | Feature | Description | Complexity |
|---|---|---|---|
| P0 | **Pre-Workout Energy Check-In** | Before each workout, show a simple 3-option screen: "How are you feeling?" with options like "Low energy" (simplified workout, fewer exercises, lighter weights), "Normal" (standard plan), and "Fired up" (add an extra set or superset challenge). This is the single most impactful feature for neurodivergent users and was the top recommendation from ADHD fitness communities [8]. | Low |
| P0 | **Exercise Preference Learning** | Track which exercises users swap away from, skip, or mark as favorites. After 2-3 swaps of the same exercise, automatically replace it in future plans. After consistent skipping of a movement pattern (e.g., always skipping lunges), ask once: "I noticed you often skip lunges. Want me to replace them with an alternative?" | Medium |
| P1 | **Time-of-Day Optimization** | Track when users actually complete workouts (morning, afternoon, evening) and use this to optimize notification timing, plan ordering (harder exercises when the user typically has more energy), and rest day suggestions. | Low |
| P1 | **Proactive AI Coach Insights** | Instead of waiting for the user to open the AI coach chat, push contextual insights to the home screen: "You've increased your bench press by 15% this month," "Your leg day consistency dropped — want to try shorter leg workouts?", "You've been logging meals consistently for 14 days — that's in the top 10% of users." | Medium |
| P2 | **Adaptive Difficulty Curve** | For new users, start with 3-4 exercises per session and gradually increase to 5-6 over the first month. For returning users after a break, temporarily reduce session complexity. This mirrors Noom's behavioral psychology approach of building habits through small, achievable steps [4]. | Medium |
| P2 | **Workout Style Evolution** | After 4-6 weeks on the same plan style, suggest a variation: "You've been doing Push/Pull/Legs for 6 weeks. Want to try Upper/Lower for variety?" or "Your strength has plateaued — want to try a deload week followed by a hypertrophy block?" | Low |

### 3.3 Pillar 3: Neurodivergent-Friendly UX

These recommendations reduce cognitive load, support executive function, and make the app accessible to users with ADHD, autism, and other neurodivergent conditions. Many of these improvements benefit all users, not just neurodivergent ones.

| Priority | Feature | Description | Complexity |
|---|---|---|---|
| P0 | **Focus Mode for Active Workouts** | Add a toggle in the active workout screen that hides the horizontal exercise navigator, muscle diagram, form tips, and alternative suggestions — showing only the current exercise name, a large set/rep counter, and a "Done / Next" button. This is the "calm mode" principle from neurodivergent UX research: "Provide optional calm versions with fewer visuals, simplified interactions, and muted color palettes" [7]. | Low |
| P0 | **Progressive Disclosure in Plans Tab** | Instead of showing all 7 days expanded or expandable, show only today's workout prominently with a large "Start" button. Other days appear as a compact horizontal scroll of day chips (Mon, Tue, Wed...) that expand on tap. The current design shows the full week as a vertical scroll of cards, which creates decision paralysis. | Medium |
| P0 | **"Just One Exercise" Quick Start** | Add a prominent button on the home screen: "Don't have time? Do just one exercise." This generates a single compound movement (squat, deadlift, bench press, or overhead press) with a 10-minute timer. For ADHD users, the hardest part is starting — once they begin, they often continue. This directly addresses the energy-level-based approach recommended by the ADHD community [8]. | Low |
| P1 | **Step-by-Step Workout Flow** | In the active workout, replace the horizontal exercise navigator with a full-screen, one-exercise-at-a-time flow. Show "Exercise 2 of 6" as a progress bar at the top. The user sees only the current exercise and taps "Complete" to advance to the next one. Completed exercises collapse into a small summary at the bottom. This mirrors how Duolingo presents lessons — one question at a time, not all questions on one page. | Medium |
| P1 | **Reduce Home Screen Density** | The home screen currently has 7+ sections. Reduce to 3 primary sections: (1) Today's workout card with a single "Start" button, (2) Daily nutrition summary (calories remaining), (3) Streak/progress badge. Move muscle balance, weekly analytics, and recent activity to dedicated screens accessible from the profile tab. | Medium |
| P1 | **Simplified Meal Logging** | The meals tab at 4,606 lines is the largest file in the app. For users who find detailed macro tracking overwhelming, offer a "Simple Mode" that shows only: meal photo, meal name, and a green/yellow/red indicator for whether it aligns with their goals. Hide macros, ingredients, and detailed breakdowns behind a "Details" toggle. | Medium |
| P2 | **Celebration Micro-Animations** | After completing each exercise (not just the full workout), show a brief, subtle celebration — a checkmark animation, a gentle haptic pulse, and a "3 of 6 done" progress update. This provides the "immediate feedback" that neurodivergent UX research identifies as critical for maintaining focus [7]. The current app only celebrates at workout completion, which is too delayed for ADHD users who need frequent dopamine hits. | Low |
| P2 | **Reduce Visual Noise in Exercise Cards** | The ExercisePreviewCard in the Plans tab shows: exercise name, sets, reps, rest time, muscle diagram, video thumbnail, swap button, and completion checkbox — all in a single card. Reduce the default view to: exercise name, sets x reps, and a completion checkbox. Show the rest timer, muscle diagram, and swap button only when the card is tapped/expanded. | Low |
| P2 | **Consistent, Predictable Navigation** | The app has 63 screens, many accessible from multiple entry points. Neurodivergent users benefit from "stable navigation and structure" [7]. Audit the navigation graph to ensure every screen has a clear back path, and that the same action always leads to the same destination. Consider adding a breadcrumb or "where am I" indicator on deep screens. | Medium |
| P2 | **Optional Reduced Motion Mode** | Add a setting to disable all animations, transitions, and auto-playing videos. Some neurodivergent users experience sensory overload from motion. This aligns with WCAG 2.2.2 (Pause, Stop, Hide) and the neurodivergent UX principle of controlling sensory input [7]. | Low |

---

## 4. Implementation Roadmap

The following roadmap prioritizes features by impact and dependency, organized into three implementation phases.

### Phase 1: Quick Wins (1-2 weeks)

These features require minimal code changes and deliver immediate UX improvements.

1. **Pre-Workout Energy Check-In** — A single new screen with 3 buttons that modifies the workout before it starts. Estimated effort: 1 day.
2. **Focus Mode Toggle** — A boolean state in `active-workout.tsx` that conditionally hides secondary UI elements. Estimated effort: 0.5 days.
3. **"Just One Exercise" Quick Start** — A button on the home screen that picks a compound movement and starts a 10-minute timer. Estimated effort: 0.5 days.
4. **Reduce Exercise Card Density** — Collapse secondary information in `ExercisePreviewCard` behind a tap. Estimated effort: 0.5 days.
5. **Celebration Micro-Animations** — Add a checkmark animation and haptic after each exercise completion. Estimated effort: 0.5 days.

### Phase 2: Core Adaptive Features (2-4 weeks)

These features require new data models and LLM prompt engineering.

6. **Missed Workout Detection** — Monitor `@workout_completed_days` against the plan schedule and trigger a rescheduling prompt.
7. **Return-from-Break Deload** — Compare last workout date against today and adjust weights/volume.
8. **Progressive Disclosure in Plans Tab** — Redesign the Plans tab to show today's workout prominently.
9. **Step-by-Step Workout Flow** — Replace the horizontal navigator with a sequential flow.
10. **Exercise Preference Learning** — Track swap/skip patterns in AsyncStorage and feed them into plan generation.
11. **Home Screen Density Reduction** — Refactor `index.tsx` to show only 3 primary sections.

### Phase 3: Deep Intelligence (4-8 weeks)

These features require backend changes and sustained data collection.

12. **Progressive Overload Engine** — Per-exercise performance history with automatic weight suggestions.
13. **Weekly Plan Regeneration** — End-of-week LLM call that incorporates actual performance data.
14. **Proactive AI Coach Insights** — Scheduled analysis of user patterns with push notification delivery.
15. **Contextual Meal Plan Adjustment** — Calorie tracking feedback loop with automatic meal plan modification.
16. **Adaptive Difficulty Curve** — Gradual complexity increase for new users.

---

## 5. Neurodivergent UX Deep Dive

### 5.1 The Problem with the Current Workout Screen

The active workout screen (`active-workout.tsx`) presents users with a horizontal exercise navigator containing all exercise names, a full exercise detail card with video player, muscle diagram, form tips, sets/reps tracker, rest timer, notes field, and alternative exercise suggestions. For a 6-exercise workout, the user is confronted with approximately 40+ interactive elements on a single screen.

Research on cognitive load in UX design establishes that "too many elements compete for attention, leading to overwhelm" and recommends simplifying layouts, limiting stimulation, and prioritizing clear hierarchy [7]. The Nielsen Norman Group's progressive disclosure principle states that "the very fact that something appears on the initial screen tells users that it's important" — meaning that showing everything implies everything is equally important, which is cognitively exhausting [9].

### 5.2 The Strong App Model

Strong's workout tracker succeeds specifically because of what it removes. The interface shows only the current exercise, a weight/reps input, and a timer. There are no muscle diagrams, no form tips, no video players, no alternative suggestions. Users who want that information can find it elsewhere — but during the workout itself, the interface respects that the user's cognitive bandwidth is occupied by the physical effort of exercising [5].

### 5.3 Recommended Focus Mode Implementation

The proposed Focus Mode should reduce the active workout screen to five elements:

1. **Exercise name** (large, centered text)
2. **Set counter** ("Set 2 of 4")
3. **Rep target** ("8 reps at 60 kg")
4. **A large "Done" button** that logs the set and advances
5. **A progress bar** showing overall workout completion ("Exercise 3 of 6")

Everything else — video player, muscle diagram, form tips, rest timer, notes, alternatives — should be hidden behind a small "More" button in the corner. The rest timer should still function but as an audio/haptic notification rather than a visual countdown that demands attention.

### 5.4 The "Just Start" Principle

The most critical insight from ADHD fitness research is that **the barrier to starting is higher than the barrier to continuing** [8]. Once a person begins exercising, momentum often carries them through. The current PeakPulse UX requires the user to: open the app, navigate to the Plans tab, find today's workout, expand it, review the exercises, and tap "Start Workout." That is six decision points before any exercise begins.

The recommended flow: open the app, see "Today: Push Day — 6 exercises, ~45 min" with a single large "Start" button. One decision point. For low-energy days, a secondary "Quick 10 min" button that requires zero decisions — it picks the exercises automatically.

---

## 6. Engagement and Retention Mechanics

### 6.1 Current State

PeakPulse has streaks, challenges, and a social feed — but these are largely independent systems. The streak tracks consecutive workout days. Challenges are template-based (e.g., "30-day push-up challenge"). The social feed shows activity from connected users. None of these systems interact with each other or with the workout plan.

### 6.2 Recommendations for Deeper Engagement

**Adaptive streaks** should replace the current binary streak model. Instead of "you worked out today or you didn't," track a "consistency score" that accounts for rest days, reduced workouts, and partial completions. A user who does a 10-minute quick workout on a low-energy day should not break their streak — they should earn partial credit. This directly addresses the ADHD concern that "if the streak breaks, I'm unlikely to start it over" [8].

**Contextual challenges** should be generated based on user behavior. If the muscle balance analysis shows neglected legs, automatically suggest a "Leg Week Challenge." If the user has been consistent for 3 weeks, suggest a "Progressive Overload Challenge" that tracks weight increases. This makes challenges feel personal rather than generic.

**Milestone celebrations** should be more frequent and more specific. Instead of only celebrating streak milestones (7 days, 30 days), celebrate: first time completing all prescribed reps, personal records on specific exercises, first workout after a break ("Welcome back — that took courage"), and consistency improvements ("You worked out 4 days this week, up from 3 last week").

---

## 7. Summary of Priorities

The following table summarizes the top 10 highest-impact recommendations, ranked by their expected effect on user retention and differentiation from competitors.

| Rank | Recommendation | Impact Area | Effort |
|---|---|---|---|
| 1 | Pre-Workout Energy Check-In | Personalization + ND-friendly | Low |
| 2 | Focus Mode for Active Workouts | ND-friendly | Low |
| 3 | Missed Workout Detection and Rescheduling | Adaptive intelligence | Medium |
| 4 | Progressive Disclosure in Plans Tab | ND-friendly | Medium |
| 5 | "Just One Exercise" Quick Start | Engagement + ND-friendly | Low |
| 6 | Return-from-Break Deload | Adaptive intelligence | Medium |
| 7 | Step-by-Step Workout Flow | ND-friendly | Medium |
| 8 | Exercise Preference Learning | Personalization | Medium |
| 9 | Home Screen Density Reduction | ND-friendly | Medium |
| 10 | Progressive Overload Engine | Adaptive intelligence | High |

---

## References

[1]: https://fitbod.zendesk.com/hc/en-us/articles/16254175592215-Fitbod-s-Algorithm-Q-A "Fitbod's Algorithm - Q&A"
[2]: https://www.reddit.com/r/fitbod/comments/1fzsi94/deload_week_and_the_algorithm/ "Fitbod Deload Week and the Algorithm - Reddit"
[3]: https://www.jefit.com/wp/jefit-news-product-updates/the-new-era-of-jefit-the-progressive-overload-system/ "The New Era of Jefit: The Progressive Overload System"
[4]: https://www.noom.com/health/resources/blog/unlocking-lasting-change-how-nooms-4-cs-drive-better-engagement-and-outcomes/ "Unlocking Lasting Change with Noom's 4-C's"
[5]: https://www.strongermobileapp.com/blog/best-workout-tracker-apps "Best Workout Tracker Apps in 2026 - Stronger"
[6]: https://trophy.so/blog/myfitnesspal-gamification-case-study "MyFitnessPal Gamification Case Study - Trophy"
[7]: https://medium.com/design-bootcamp/beyond-compliance-16-ux-principles-to-truly-include-neurodivergent-users-e7d3ff779665 "16 UX Principles to Truly Include Neurodivergent Users - Medium"
[8]: https://www.reddit.com/r/ADHDFitness/comments/1ph07kq/trying_to_buil_a_fitness_app_with_adhd_brains_in/ "Building a fitness app with ADHD brains in mind - Reddit"
[9]: https://www.nngroup.com/articles/progressive-disclosure/ "Progressive Disclosure - Nielsen Norman Group"
