#!/bin/bash
cd /home/ubuntu/peakpulse-mobile

# meals.tsx - shorten verbose descriptions
sed -i 's/Sign in or continue as guest to track your nutrition and use the AI calorie estimator\./Sign in or continue as guest to start tracking./g' "app/(tabs)/meals.tsx"
sed -i 's/No saved foods yet\. Log a meal and tap the star to save it here\./No saved foods yet. Star a meal to save it./g' "app/(tabs)/meals.tsx"
sed -i 's/No meals logged yet today\./No meals logged today./g' "app/(tabs)/meals.tsx"
sed -i "s/Tap \"Log a Meal\" above or use the quick-add tiles\./Tap above to log your first meal./g" "app/(tabs)/meals.tsx"

# plans.tsx - shorten verbose descriptions
sed -i 's/Sign in or continue as guest to generate AI-powered workout and meal plans\./Sign in or continue as guest to get started./g' "app/(tabs)/plans.tsx"
sed -i 's/AI-generated plans are for guidance only\. Consult a fitness professional before starting a new exercise programme\./AI plans are for guidance. Consult a professional before starting./g' "app/(tabs)/plans.tsx"
sed -i 's/AI-generated plans are for guidance only\. Consult a qualified nutritionist before making significant dietary changes\./AI plans are for guidance. Consult a nutritionist for major changes./g' "app/(tabs)/plans.tsx"
sed -i 's/Record a set — AI analyses your technique instantly/Record a set for AI form analysis/g' "app/(tabs)/plans.tsx"

# scan.tsx - shorten verbose descriptions
sed -i 's/Sign in or continue as guest to analyze your physique and visualize your transformation\./Sign in or continue as guest to get started./g' "app/(tabs)/scan.tsx"
sed -i 's/This is how you could look at .* body fat with consistent training and nutrition/Your potential look with consistent training/g' "app/(tabs)/scan.tsx"

# profile.tsx - shorten verbose descriptions
sed -i 's/Sign in to save your profile and sync across devices, or continue as guest\./Sign in to save your profile, or continue as guest./g' "app/(tabs)/profile.tsx"

# pantry.tsx - shorten verbose descriptions
sed -i 's/Add items to your pantry, then tap "AI Meals" to get personalised recipes\./Add items, then tap "AI Meals" for recipes./g' app/pantry.tsx
sed -i 's/Log a meal from AI Suggestions and it will appear here for quick re-cooking\./Cook a suggested meal to see it here./g' app/pantry.tsx
sed -i 's/Add items to your pantry first, then AI will suggest what else you need\./Add pantry items first for AI suggestions./g' app/pantry.tsx

# challenge-onboarding.tsx - shorten
sed -i 's/Complete all 7 days to unlock Advanced features free for 1 month/Complete 7 days to unlock Advanced free for 1 month/g' app/challenge-onboarding.tsx
sed -i 's/Get workout, meal log, and check-in reminders to stay on track/Daily reminders to keep you on track/g' app/challenge-onboarding.tsx

# progress-photos.tsx - shorten
sed -i 's/Edit below — caption is auto-copied to clipboard when you share\./Edit caption below. Auto-copied on share./g' app/progress-photos.tsx
sed -i 's/The before\/after comparison appears once you have 2+ progress photos\./Add 2+ photos to see before\/after comparison./g' app/progress-photos.tsx
sed -i 's/No progress photos yet\. Add your first photo to start tracking your journey!/No photos yet. Add your first to start tracking./g' app/progress-photos.tsx

# referral.tsx - shorten
sed -i 's/Your friends get a FREE 14-day Advanced trial — double the standard 7 days!/Friends get a FREE 14-day Advanced trial!/g' app/referral.tsx

# gym-finder.tsx - shorten
sed -i 's/Try increasing the search radius or check your location settings\./Try a larger radius or check location settings./g' app/gym-finder.tsx

# onboarding.tsx - shorten verbose text
sed -i 's/AI reminders are personalised based on your name, streak, goals, and pantry data\. Messages rotate daily to keep things fresh\. Notifications work even when the app is closed\./Messages rotate daily and personalise based on your streak, goals, and activity./g' app/notification-settings.tsx

# floating-assistant.tsx - shorten greeting text if too long
# (handled by assistant-greetings.ts which already has concise messages)

echo "Verbosity fixes applied."
