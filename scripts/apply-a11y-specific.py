#!/usr/bin/env python3
"""
Apply specific a11y props to key interactive elements across PeakPulse screens.
Targets: generate plan buttons, log meal buttons, scan buttons, settings links, etc.
"""
import re, os

BASE = "/home/ubuntu/peakpulse-mobile"

def add_a11y_to_file(rel_path, patterns):
    """
    patterns: list of (find_str, replace_str) tuples
    """
    path = os.path.join(BASE, rel_path)
    if not os.path.exists(path):
        print(f"  SKIP: {rel_path} (not found)")
        return 0
    
    with open(path, "r") as f:
        content = f.read()
    
    count = 0
    for find, replace in patterns:
        if find in content and replace not in content:
            content = content.replace(find, replace, 1)
            count += 1
    
    if count > 0:
        with open(path, "w") as f:
            f.write(content)
        print(f"  OK: {rel_path} ({count} props added)")
    return count

total = 0

# ── Plans tab: Generate Plan, day cards ──
total += add_a11y_to_file("app/(tabs)/plans.tsx", [
    # Generate plan button
    ('onPress={handleGeneratePlan}', 'onPress={handleGeneratePlan} {...a11yButton("Generate workout plan", "Create an AI-powered workout plan")}'),
    # User guide button
    ('onPress={() => router.push("/user-guide" as any)} style={{ padding: 4 }}>', 
     'onPress={() => router.push("/user-guide" as any)} style={{ padding: 4 }} {...a11yButton("User guide")}>'),
])

# ── Meals tab: Log meal, scan food ──
total += add_a11y_to_file("app/(tabs)/meals.tsx", [
    ('onPress={handleLogMeal}', 'onPress={handleLogMeal} {...a11yButton(A11Y_LABELS.logMeal, "Add a meal to your food diary")}'),
    ('onPress={handleScanFood}', 'onPress={handleScanFood} {...a11yButton(A11Y_LABELS.scanFood, "Use camera to identify food")}'),
    ('onPress={() => router.push("/meal-timeline" as any)}', 'onPress={() => router.push("/meal-timeline" as any)} {...a11yButton("View meal timeline")}'),
])

# ── Profile tab: Settings, sign in/out ──
total += add_a11y_to_file("app/(tabs)/profile.tsx", [
    ('onPress={() => router.push("/settings" as any)}', 'onPress={() => router.push("/settings" as any)} {...a11yButton(A11Y_LABELS.settingsButton)}'),
    ('onPress={handleSignOut}', 'onPress={handleSignOut} {...a11yButton("Sign out")}'),
    ('onPress={() => router.push("/login" as any)}', 'onPress={() => router.push("/login" as any)} {...a11yButton("Sign in", "Sign in to sync data across devices")}'),
])

# ── Scan tab: Upload photo, take photo ──
total += add_a11y_to_file("app/(tabs)/scan.tsx", [
    ('onPress={handleTakePhoto}', 'onPress={handleTakePhoto} {...a11yButton("Take photo", "Open camera for body scan")}'),
    ('onPress={handlePickImage}', 'onPress={handlePickImage} {...a11yButton("Upload photo", "Choose a photo from your library")}'),
    ('onPress={handleGeneratePlan}', 'onPress={handleGeneratePlan} {...a11yButton("Generate plan from scan", "Create workout plan based on body analysis")}'),
])

# ── AI Coach tab ──
total += add_a11y_to_file("app/(tabs)/ai-coach.tsx", [
    ('onPress={handleSend}', 'onPress={handleSend} {...a11yButton("Send message")}'),
])

# ── Active Workout ──
total += add_a11y_to_file("app/active-workout.tsx", [
    ('onPress={handleCompleteSet}', 'onPress={handleCompleteSet} {...a11yButton("Complete set")}'),
    ('onPress={handleFinishWorkout}', 'onPress={handleFinishWorkout} {...a11yButton("Finish workout")}'),
    ('onPress={handleStartRest}', 'onPress={handleStartRest} {...a11yButton("Start rest timer")}'),
    ('onPress={handleSkipRest}', 'onPress={handleSkipRest} {...a11yButton("Skip rest")}'),
])

# ── Create Workout ──
total += add_a11y_to_file("app/create-workout.tsx", [
    ('onPress={handleSave}', 'onPress={handleSave} {...a11yButton("Save workout")}'),
    ('onPress={handleAddExercise}', 'onPress={handleAddExercise} {...a11yButton("Add exercise")}'),
])

# ── Pantry ──
total += add_a11y_to_file("app/pantry.tsx", [
    ('onPress={handleAddItem}', 'onPress={handleAddItem} {...a11yButton("Add pantry item")}'),
    ('onPress={() => router.push("/barcode-scanner" as any)}', 'onPress={() => router.push("/barcode-scanner" as any)} {...a11yButton("Scan barcode")}'),
    ('onPress={() => router.push("/meal-prep" as any)}', 'onPress={() => router.push("/meal-prep" as any)} {...a11yButton("Get meal prep suggestions")}'),
])

# ── Form Checker ──
total += add_a11y_to_file("app/form-checker.tsx", [
    ('onPress={handleAnalyze}', 'onPress={handleAnalyze} {...a11yButton("Analyze form", "Check exercise form with AI")}'),
    ('onPress={handleCapture}', 'onPress={handleCapture} {...a11yButton("Capture video")}'),
])

# ── Daily Check-in ──
total += add_a11y_to_file("app/daily-checkin.tsx", [
    ('onPress={handleSubmit}', 'onPress={handleSubmit} {...a11yButton("Submit check-in")}'),
])

# ── Meal Prep ──
total += add_a11y_to_file("app/meal-prep.tsx", [
    ('onPress={handleGenerate}', 'onPress={handleGenerate} {...a11yButton("Generate meal prep plan")}'),
])

# ── Progress Photos ──
total += add_a11y_to_file("app/progress-photos.tsx", [
    ('onPress={handleTakePhoto}', 'onPress={handleTakePhoto} {...a11yButton("Take progress photo")}'),
    ('onPress={handlePickImage}', 'onPress={handlePickImage} {...a11yButton("Upload progress photo")}'),
])

# ── Weekly Goals ──
total += add_a11y_to_file("app/weekly-goals.tsx", [
    ('onPress={handleSave}', 'onPress={handleSave} {...a11yButton("Save weekly goals")}'),
])

# ── Feedback ──
total += add_a11y_to_file("app/feedback.tsx", [
    ('onPress={handleSubmit}', 'onPress={handleSubmit} {...a11yButton("Submit feedback")}'),
])

# ── Subscription ──
total += add_a11y_to_file("app/subscription.tsx", [
    ('onPress={handleSubscribe}', 'onPress={handleSubscribe} {...a11yButton("Subscribe")}'),
    ('onPress={handleRestore}', 'onPress={handleRestore} {...a11yButton("Restore purchases")}'),
])

# ── Referral ──
total += add_a11y_to_file("app/referral.tsx", [
    ('onPress={handleShare}', 'onPress={handleShare} {...a11yButton("Share referral link")}'),
    ('onPress={handleCopy}', 'onPress={handleCopy} {...a11yButton("Copy referral code")}'),
])

# ── Scan Receipt ──
total += add_a11y_to_file("app/scan-receipt.tsx", [
    ('onPress={handleScan}', 'onPress={handleScan} {...a11yButton("Scan receipt")}'),
    ('onPress={handlePickImage}', 'onPress={handlePickImage} {...a11yButton("Upload receipt photo")}'),
])

# ── Onboarding ──
total += add_a11y_to_file("app/onboarding.tsx", [
    ('onPress={handleNext}', 'onPress={handleNext} {...a11yButton("Next step")}'),
    ('onPress={handleSkip}', 'onPress={handleSkip} {...a11yButton("Skip onboarding")}'),
])

# ── Settings ──
total += add_a11y_to_file("app/settings.tsx", [
    ('onPress={handleDeleteAccount}', 'onPress={handleDeleteAccount} {...a11yButton("Delete account")}'),
    ('onPress={handleSignOut}', 'onPress={handleSignOut} {...a11yButton("Sign out")}'),
])

# ── Social Circle ──
total += add_a11y_to_file("app/social-circle.tsx", [
    ('onPress={handleInvite}', 'onPress={handleInvite} {...a11yButton("Invite friends")}'),
])

# ── Chat ──
total += add_a11y_to_file("app/chat.tsx", [
    ('onPress={handleSend}', 'onPress={handleSend} {...a11yButton("Send message")}'),
])

print(f"\n=== Done: {total} specific a11y props added ===")
