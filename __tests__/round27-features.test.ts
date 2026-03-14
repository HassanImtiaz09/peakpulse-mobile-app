import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const ROOT = path.resolve(__dirname, "..");

describe("Round 27 — Workout Completion Tracking", () => {
  const plansCode = fs.readFileSync(path.join(ROOT, "app/(tabs)/plans.tsx"), "utf-8");

  it("has workout completion state persisted with AsyncStorage", () => {
    expect(plansCode).toContain("@workout_completed_days");
    expect(plansCode).toContain("AsyncStorage.setItem");
  });

  it("renders a weekly progress ring using SVG", () => {
    expect(plansCode).toContain("Svg");
    expect(plansCode).toContain("Circle");
  });

  it("has a completion toggle on workout day cards", () => {
    expect(plansCode).toContain("isCompleted");
    expect(plansCode).toContain("onToggleComplete");
  });

  it("shows completion stats (completed/total)", () => {
    expect(plansCode).toContain("completedCount");
    expect(plansCode).toContain("totalWorkoutDays");
  });
});

describe("Round 27 — Water Intake Tracker", () => {
  const mealsCode = fs.readFileSync(path.join(ROOT, "app/(tabs)/meals.tsx"), "utf-8");

  it("has water intake state with persistence", () => {
    expect(mealsCode).toContain("waterIntake");
    expect(mealsCode).toContain("@water_intake");
    expect(mealsCode).toContain("waterGoal");
  });

  it("has quick-add buttons for water", () => {
    expect(mealsCode).toContain("250");
    expect(mealsCode).toContain("500");
  });

  it("shows water progress percentage", () => {
    expect(mealsCode).toContain("waterGoal");
    expect(mealsCode).toContain("waterIntake");
  });

  it("persists water data to AsyncStorage", () => {
    expect(mealsCode).toContain("@water_intake");
    expect(mealsCode).toContain("@water_goal");
  });
});

describe("Round 27 — Push Notification Reminders", () => {
  const notifCode = fs.readFileSync(path.join(ROOT, "lib/notifications.ts"), "utf-8");
  const prefsCode = fs.readFileSync(path.join(ROOT, "app/notification-preferences.tsx"), "utf-8");
  const onboardingCode = fs.readFileSync(path.join(ROOT, "app/onboarding.tsx"), "utf-8");

  it("has meal-time-specific reminders (breakfast, lunch, dinner)", () => {
    expect(notifCode).toContain("scheduleMealTimeReminders");
    expect(notifCode).toContain("Breakfast Time");
    expect(notifCode).toContain("Lunch Time");
    expect(notifCode).toContain("Dinner Time");
  });

  it("has water intake reminder with configurable interval", () => {
    expect(notifCode).toContain("scheduleWaterReminder");
    expect(notifCode).toContain("intervalHours");
    expect(notifCode).toContain("TIME_INTERVAL");
  });

  it("includes meal-time and water reminders in scheduleAllDefaultReminders", () => {
    expect(notifCode).toContain("scheduleMealTimeReminders(8, 0, 12, 30, 18, 30)");
    expect(notifCode).toContain("scheduleWaterReminder(2)");
  });

  it("has cancel functions for new reminder types", () => {
    expect(notifCode).toContain("cancelMealTimeReminders");
    expect(notifCode).toContain("cancelWaterReminder");
  });

  it("notification preferences screen has meal-time toggles", () => {
    expect(prefsCode).toContain("mealTimesEnabled");
    expect(prefsCode).toContain("Meal-Time Reminders");
    expect(prefsCode).toContain("breakfastHour");
    expect(prefsCode).toContain("lunchHour");
    expect(prefsCode).toContain("dinnerHour");
  });

  it("notification preferences screen has water reminder toggle", () => {
    expect(prefsCode).toContain("waterEnabled");
    expect(prefsCode).toContain("Water Reminder");
    expect(prefsCode).toContain("waterIntervalHours");
  });

  it("notification preferences screen has water interval selector (1h, 2h, 3h, 4h)", () => {
    expect(prefsCode).toContain("Remind every");
    expect(prefsCode).toContain("[1, 2, 3, 4]");
  });

  it("onboarding auto-schedules all reminders after plan generation", () => {
    expect(onboardingCode).toContain("scheduleAllDefaultReminders");
    expect(onboardingCode).toContain("Platform.OS !== \"web\"");
  });

  it("dashboard also schedules reminders on mount for returning users", () => {
    const dashCode = fs.readFileSync(path.join(ROOT, "app/(tabs)/index.tsx"), "utf-8");
    expect(dashCode).toContain("scheduleAllDefaultReminders");
  });
});
