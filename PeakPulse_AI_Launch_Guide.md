# FytNova — Pre-Launch Checklist & Marketing Strategy

*Prepared by Manus AI — March 2026*

---

## Executive Summary

FytNova is an AI-powered fitness and nutrition companion that combines meal planning, calorie tracking, pantry management, wearable integration, and personalised coaching into a single mobile experience. This document provides a comprehensive roadmap for taking the app from its current development state to a successful launch on the Apple App Store and Google Play Store, followed by a data-driven marketing strategy to acquire and retain users.

The global fitness app market is projected to grow from USD 12.1 billion in 2025 to USD 45.45 billion by 2035, reflecting a compound annual growth rate of approximately 14% [1]. This represents a significant opportunity for a well-positioned, AI-differentiated product like FytNova.

---

## Part 1: Pre-Launch Checklist

The steps below are organised into categories. Each item should be completed before submitting to either store.

### 1.1 Developer Accounts

Both Apple and Google require active developer accounts before you can submit an app. The costs and setup processes differ significantly between the two platforms [2] [3].

| Platform | Fee | Type | Setup Time | Notes |
|----------|-----|------|------------|-------|
| Apple Developer Program | $99/year | Annual renewal | 1-3 days | Required for App Store distribution |
| Google Play Console | $25 | One-time | 1-2 days | Identity verification required for new accounts |

**Action items:**

Enrol in the Apple Developer Program at [developer.apple.com](https://developer.apple.com/programs/) using either an individual or organisation account. Organisation accounts require a D-U-N-S number, which can take up to 14 business days to obtain, so start this process early. For Google Play, register at [play.google.com/console](https://play.google.com/console) and complete the identity verification, which Google now requires for all new developer accounts.

### 1.2 Legal & Compliance

Health and fitness apps face heightened scrutiny from both app stores and regulators. Apple requires that apps using health data disclose this clearly, and the FTC mandates transparent data collection practices for mobile health applications [4].

| Document | Required By | Purpose |
|----------|-------------|---------|
| Privacy Policy | Both stores | Disclose all data collection, storage, and sharing practices |
| Terms of Service | Both stores | Define user rights, limitations, and dispute resolution |
| Health Data Disclaimer | Apple (recommended for Google) | Clarify that the app does not provide medical advice |
| AI Disclosure | Apple (2025 policy) | Disclose use of AI/ML features and obtain user consent |
| EULA | Apple (optional for Google) | End-user licence agreement for subscription apps |

**Key considerations for FytNova specifically:**

Since the app collects calorie data, workout logs, and integrates with wearable health platforms, the privacy policy must explicitly describe what health-related data is collected, how it is processed (including AI analysis of food photos), whether it is stored on-device or server-side, and under what circumstances it might be shared. Apple's 2025 policy update requires that apps using external AI services disclose this to users and obtain consent [2]. The app should include a clear disclaimer that it is not a medical device and does not provide medical advice.

### 1.3 App Store Assets

Both stores require specific visual assets and metadata. Preparing these in advance prevents delays during submission [2] [3].

| Asset | Apple App Store | Google Play Store |
|-------|----------------|-------------------|
| App Icon | 1024×1024 px (no transparency, no rounded corners) | 512×512 px (32-bit PNG) |
| Screenshots | 6.7" iPhone (1290×2796), 6.1" iPhone (1179×2556) | Phone, 7" tablet, 10" tablet |
| Feature Graphic | Not required | 1024×500 px (required) |
| App Preview Video | Up to 30 seconds (optional, highly recommended) | Up to 30 seconds (optional) |
| Short Description | Subtitle field, max 30 characters | Max 80 characters |
| Full Description | Max 4000 characters | Max 4000 characters |
| Keywords | 100-character keyword field | Extracted from description |
| Category | Health & Fitness | Health & Fitness |
| Content Rating | Self-rated via questionnaire | IARC questionnaire |

**Recommendation:** Invest in professional-quality screenshots that showcase the app's key differentiators — the AI meal photo scanner, the Meal Prep Planner, the wearable stats dashboard, and the pantry management system. Screenshots with device frames and brief captions convert significantly better than raw screen captures.

### 1.4 Technical Readiness

Nearly 88% of App Store rejections stem from a handful of common technical issues [2]. The following checklist addresses each of these.

**Stability and Performance:**

Test the app on physical devices across multiple iOS and Android versions, not just simulators. Apple reviewers test on real hardware and will reject apps that crash during review. Integrate a crash reporting service such as Sentry or Firebase Crashlytics before submission, and ensure zero critical crashes in the build you submit.

**Backend Infrastructure:**

The server must be live, stable, and accessible during the review period. Apple and Google reviewers will test all server-dependent features. Ensure the API endpoints are deployed to a production environment with proper SSL certificates, and that the database can handle concurrent connections. Set up monitoring and alerting so you are notified immediately if the server goes down during review.

**Demo Account for Reviewers:**

Since FytNova supports user authentication, you must provide demo credentials in the App Store Connect review notes. Pre-populate this demo account with sample data (meals logged, pantry items, workout history) so reviewers can experience the full app without spending time setting it up.

**Account Deletion:**

Apple requires that any app offering account creation must also provide a way to delete the account and associated data. Implement this in the Settings screen if not already present.

**Permissions:**

Request only the permissions the app actually needs, and only at the point of use (not on first launch). For FytNova, this includes camera (barcode/receipt scanning, food photos), notifications, and potentially HealthKit/Google Fit access. Each permission request must include a clear, human-readable explanation of why it is needed.

### 1.5 Stripe Payment Integration

Since FytNova will offer a subscription model, Stripe integration is essential for handling payments. However, there are important platform-specific rules to understand.

| Scenario | Payment Method | Commission |
|----------|---------------|------------|
| Digital content/features (premium AI, advanced analytics) | Apple IAP / Google Play Billing **required** | 15-30% |
| Physical goods or services | Stripe or any payment processor | 0% to stores |
| Web-based subscription (outside the app) | Stripe | 0% to stores |

**Important:** For digital subscriptions accessed within the app (such as premium AI coaching, advanced meal plans, or unlimited food photo scans), Apple and Google require the use of their native in-app purchase systems. You cannot use Stripe directly for these within the app. However, Stripe can power your web-based subscription flow (on the FytNova website), and users who subscribe via the web can access premium features in the app without the 30% store commission.

**Recommended approach:** Implement both Apple IAP and Google Play Billing for in-app subscriptions (using a library like `react-native-purchases` from RevenueCat, which abstracts both platforms), and also offer Stripe-powered subscriptions on the FytNova website as an alternative channel with better margins.

### 1.6 Analytics and Monitoring

Before launch, instrument the app with analytics to understand user behaviour and catch issues early.

| Tool | Purpose | Priority |
|------|---------|----------|
| Firebase Analytics / Mixpanel | User behaviour, feature usage, funnel analysis | High |
| Sentry / Firebase Crashlytics | Crash reporting and error tracking | High |
| RevenueCat | Subscription analytics, paywall A/B testing | High |
| App Store Connect Analytics | Download trends, conversion rates | Built-in |
| Google Play Console Analytics | Install metrics, ratings, crashes | Built-in |

### 1.7 App Store Optimisation (ASO)

ASO is the equivalent of SEO for app stores. Optimising your listing before launch significantly impacts organic discovery.

**Title and subtitle** should include high-value keywords. For example: "FytNova — Meal Planner & Fitness Coach" (Apple) or "FytNova: Meal Planner, Calorie Tracker & Workout Coach" (Google, which allows longer titles).

**Keywords** to target include: AI meal planner, calorie tracker, food photo scanner, pantry manager, workout planner, fitness coach, macro tracker, meal prep, recipe generator, wearable fitness, nutrition tracker, and health companion.

**Localisation** of the store listing into the top 5-10 languages for your target markets can increase downloads by 30-40% with relatively low effort.

---

## Part 2: Marketing Strategy

### 2.1 Positioning and Target Audience

FytNova differentiates itself through its AI-first approach to the full nutrition-fitness lifecycle. Unlike apps that focus on just calorie counting or just workouts, FytNova connects pantry management, meal planning, recipe generation, food photo recognition, and fitness tracking into a single intelligent system.

| Segment | Description | Key Value Proposition |
|---------|-------------|----------------------|
| Health-conscious millennials (25-40) | Busy professionals who want to eat better without spending hours planning | AI meal suggestions from pantry items, receipt scanning, food photo logging |
| Fitness enthusiasts (18-35) | Active individuals tracking macros and workouts | Wearable integration, calorie/macro trends, AI workout coaching |
| Meal preppers and home cooks | People who batch-cook and want to reduce food waste | Meal Prep Planner, Cook Now with pantry deduction, weekly waste reports |
| Weight management seekers (30-55) | People on a structured diet or weight loss journey | AI calorie tracking, portion adjustment, progress insights |

### 2.2 Pre-Launch Phase (4-6 Weeks Before Launch)

**Landing page and email waitlist** are the foundation of pre-launch marketing. The FytNova website (which I will build next) should capture email addresses from interested users and build anticipation. A well-designed landing page with a clear value proposition, feature highlights, and a waitlist signup can generate thousands of leads before launch.

**Social media presence** should be established on Instagram, TikTok, and Twitter/X at minimum. Content should focus on short-form videos demonstrating the app's AI features — scanning a receipt and watching items populate the pantry, photographing a meal and seeing instant calorie estimates, or the Meal Prep Planner generating zero-waste recipes. These "magic moment" demonstrations perform exceptionally well on social media.

**Beta testing program** using TestFlight (iOS) and Google Play's internal/closed testing tracks allows you to gather feedback from real users before the public launch. Aim for 50-200 beta testers who represent your target audience. Their feedback will help you identify and fix issues that testing alone cannot catch, and their positive reviews can seed your app store ratings on launch day.

### 2.3 Launch Phase (Launch Week)

**Coordinated launch day** on both stores simultaneously, ideally on a Tuesday or Wednesday (historically the best days for app launches in terms of editorial visibility). Prepare a press kit with screenshots, app description, founder story, and key differentiators.

**Influencer partnerships** with fitness and nutrition content creators on Instagram and TikTok can drive significant initial downloads. Micro-influencers (10K-100K followers) in the health and fitness niche typically offer better ROI than larger accounts, with engagement rates 3-5x higher. Provide them with free premium access and a unique referral code.

**Product Hunt and Hacker News launches** can generate substantial traffic from tech-savvy early adopters. Prepare a compelling Product Hunt listing with a clear tagline, GIF demonstrations, and a launch-day discount or extended trial.

### 2.4 Post-Launch Growth (Ongoing)

**Content marketing** through a blog on the FytNova website covering topics like "How to Reduce Food Waste with AI," "The Science of Macro Tracking," and "Meal Prep for Beginners" will drive organic search traffic and establish authority. Each article should include a clear call-to-action to download the app.

**Referral program** where existing users can invite friends and earn premium time or features is one of the most cost-effective growth channels for consumer apps. Implement a simple "Share with friends, get 1 week free" mechanic.

**Paid acquisition** through Apple Search Ads and Google App Campaigns should be tested with a small budget ($500-1000/month initially) once organic acquisition establishes baseline metrics. Target keywords like "meal planner app," "calorie tracker AI," and "pantry manager" where intent is high.

**Retention strategy** is critical because the average fitness app loses 75% of users within the first week. FytNova's push notification system (meal reminders, workout nudges, streak alerts) is already a strong retention mechanism. Consider adding a weekly email digest summarising the user's nutrition and fitness progress, and gamification elements like achievement badges.

### 2.5 Monetisation Model

Based on industry benchmarks for fitness apps, the following tiered subscription model is recommended [5] [6]:

| Tier | Price | Features |
|------|-------|----------|
| **Free** | $0 | Basic calorie tracking, manual meal logging, 3 AI food scans/day, pantry management |
| **Premium** | $9.99/month or $59.99/year | Unlimited AI food scans, Meal Prep Planner, receipt scanning, wearable sync, advanced analytics, push reminders |
| **Family** | $14.99/month or $89.99/year | Premium for up to 5 family members, shared pantry, shared shopping lists |

Offer a 7-day free trial for Premium to reduce friction. The annual plan should be prominently featured as it provides better LTV and lower churn.

---

## Part 3: Domain and Website

### 3.1 Domain Acquisition

For the FytNova brand, the following domain options should be considered:

| Domain | Estimated Cost | Recommendation |
|--------|---------------|----------------|
| peakpulse.ai | $50-80/year | Best option — matches the brand and AI positioning |
| peakpulseai.com | $10-15/year | Good fallback if .ai is taken |
| getpeakpulse.com | $10-15/year | Action-oriented alternative |
| peakpulse.app | $15-20/year | Modern, app-focused TLD |
| peakpulse.health | $30-50/year | Health-focused TLD |

**Recommended registrars** based on 2026 reviews: **Porkbun** (best ease of use, transparent pricing), **Namecheap** (affordable, reliable), or **Cloudflare Registrar** (at-cost pricing, excellent DNS) [7].

**Action:** Search for and register your preferred domain. I will build the landing page website next, which you can then deploy to your chosen domain.

### 3.2 Website Requirements

The FytNova website should serve as both a marketing landing page and a hub for legal documents. At minimum, it needs:

- Hero section with app value proposition and download links
- Feature showcase highlighting key differentiators
- Screenshot carousel or device mockups
- Pricing/subscription information
- Email waitlist signup (pre-launch) or download CTAs (post-launch)
- Privacy Policy and Terms of Service pages
- Support/contact information
- Blog section (can be added later)

I will build this website as the next step.

---

## Summary: Priority Action Items

The following table summarises all required steps in recommended order of execution:

| Priority | Action | Timeline | Status |
|----------|--------|----------|--------|
| 1 | Register Apple Developer Account ($99/year) | Now | To do |
| 2 | Register Google Play Console ($25 one-time) | Now | To do |
| 3 | Acquire domain (peakpulse.ai or alternative) | Now | To do |
| 4 | Draft Privacy Policy and Terms of Service | Week 1 | To do |
| 5 | Build landing page website | Week 1 | Building next |
| 6 | Implement Stripe web subscriptions | Week 2 | To do |
| 7 | Integrate RevenueCat for in-app subscriptions | Week 2 | To do |
| 8 | Add crash reporting (Sentry/Crashlytics) | Week 2 | To do |
| 9 | Add analytics (Firebase/Mixpanel) | Week 2 | To do |
| 10 | Implement account deletion feature | Week 2 | To do |
| 11 | Create App Store screenshots and preview video | Week 3 | To do |
| 12 | Prepare demo account with sample data | Week 3 | To do |
| 13 | Beta test via TestFlight and Play Console | Week 3-4 | To do |
| 14 | Set up social media accounts | Week 3 | To do |
| 15 | Submit to App Store and Google Play | Week 4-5 | To do |
| 16 | Launch marketing campaign | Week 5-6 | To do |

---

## References

[1]: https://www.towardshealthcare.com/insights/fitness-app-market-sizing "Fitness App Market to Increase USD 45.45 Billion by 2035 — Towards Healthcare"
[2]: https://developer.apple.com/app-store/review/guidelines/ "App Store Review Guidelines — Apple Developer"
[3]: https://natively.dev/articles/app-store-requirements "App Store Requirements: iOS & Android Guide 2026 — Natively"
[4]: https://www.ftc.gov/business-guidance/resources/mobile-health-app-developers-ftc-best-practices "Mobile Health App Developers: FTC Best Practices"
[5]: https://www.zfort.com/blog/How-to-choose-the-best-monetization-strategy-for-your-fitness-app "How to Choose the Best Monetization Strategy for Your Fitness App — Zfort"
[6]: https://svitla.com/blog/fitness-app-development-guide/ "Fitness App Development: Business Models and Monetization — Svitla"
[7]: https://www.forbes.com/advisor/business/software/best-domain-registrar/ "10 Best Domain Registrars of 2026 — Forbes Advisor"
