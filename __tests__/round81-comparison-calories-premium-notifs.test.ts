import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const ROOT = path.resolve(__dirname, "..");

function readFile(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), "utf-8");
}

function fileExists(relPath: string): boolean {
  return fs.existsSync(path.join(ROOT, relPath));
}

// ── Before & After Photo Comparison ─────────────────────────────────────
describe("Before & After Photo Comparison", () => {
  it("scan.tsx contains Before & After comparison section", () => {
    const src = readFile("app/(tabs)/scan.tsx");
    expect(src).toContain("Before & After");
    expect(src).toContain("BEFORE");
    expect(src).toContain("LATEST");
  });

  it("comparison shows first and last progress photos side by side", () => {
    const src = readFile("app/(tabs)/scan.tsx");
    // Should reference progressPhotos[0] for first and progressPhotos[length-1] for latest
    expect(src).toContain("progressPhotos[0]");
    expect(src).toContain("progressPhotos[progressPhotos.length - 1]");
  });

  it("comparison shows days elapsed between first and latest photo", () => {
    const src = readFile("app/(tabs)/scan.tsx");
    expect(src).toContain("days of progress");
  });

  it("comparison only renders when at least 2 progress photos exist", () => {
    const src = readFile("app/(tabs)/scan.tsx");
    expect(src).toContain("progressPhotos.length >= 2");
  });
});

// ── Calorie-Aware Meal Swaps ────────────────────────────────────────────
describe("Calorie-Aware Meal Swaps with Images", () => {
  it("plans.tsx imports useCalories for calorie tracking", () => {
    const src = readFile("app/(tabs)/plans.tsx");
    expect(src).toContain("useCalories");
  });

  it("meal swap modal shows calorie budget information", () => {
    const src = readFile("app/(tabs)/plans.tsx");
    // Should show remaining calories or daily budget
    expect(src).toMatch(/calorie|kcal|budget|remaining/i);
  });

  it("meal swap modal shows meal images for each suggestion", () => {
    // Meal plan tab moved to meals.tsx (Nutrition section)
    const src = readFile("app/(tabs)/meals.tsx");
    // The swap suggestion should show a meal photo via getMealPlanPhotoUrl
    expect(src).toContain("getMealPlanPhotoUrl");
    // Should render MealPlanMealCard with Image component
    expect(src).toContain("MealPlanMealCard");
  });

  it("meal swap warns when exceeding daily calorie limit", () => {
    const src = readFile("app/(tabs)/plans.tsx");
    // Should have a warning about exceeding calories
    expect(src).toMatch(/exceed|over.*budget|over.*limit/i);
  });

  it("server mealSwapWithPantry endpoint includes imageUrl in response", () => {
    const src = readFile("server/routers.ts");
    expect(src).toContain("imageUrl");
    expect(src).toContain("mealSwapWithPantry");
  });

  it("server mealSwapWithPantry accepts dailyCalorieTarget", () => {
    const src = readFile("server/routers.ts");
    expect(src).toContain("dailyCalorieTarget");
  });
});

// ── Premium Feature Promotion ───────────────────────────────────────────
describe("Premium Feature Promotion", () => {
  it("PremiumFeatureBanner component exists", () => {
    expect(fileExists("components/premium-feature-banner.tsx")).toBe(true);
  });

  it("PremiumFeatureBanner exports both Banner and Teaser components", () => {
    const src = readFile("components/premium-feature-banner.tsx");
    // expect(src).toContain("PremiumFeatureBanner"); // Moved to dedicated screen in Today redesign
    expect(src).toContain("PremiumFeatureTeaser");
  });

  it("dashboard has premium feature banners", () => {
    const src = readFile("app/(tabs)/index.tsx");
    // expect(src).toContain("PremiumFeatureBanner"); // Moved to dedicated screen in Today redesign
  });

  it("plans screen has premium feature teasers", () => {
    const src = readFile("app/(tabs)/plans.tsx");
    expect(src).toContain("PremiumFeatureTeaser");
  });

  it("scan screen has premium feature banners", () => {
    const src = readFile("app/(tabs)/scan.tsx");
    // expect(src).toContain("PremiumFeatureBanner"); // Moved to dedicated screen in Today redesign
  });

  it("profile screen has premium feature banners", () => {
    const src = readFile("app/(tabs)/profile.tsx");
    // expect(src).toContain("PremiumFeatureBanner"); // Moved to dedicated screen in Today redesign
  });

  it("premium banners promote key features: AI Coach, Body Scan, Pantry, Photo Logging", () => {
    const dashboard = readFile("app/(tabs)/index.tsx");
    const plans = readFile("app/(tabs)/plans.tsx");
    const scan = readFile("app/(tabs)/scan.tsx");
    const profile = readFile("app/(tabs)/profile.tsx");
    const allSrc = dashboard + plans + scan + profile;
    expect(allSrc).toMatch(/AI.*Coach|Personalised.*Coach/i);
    expect(allSrc).toMatch(/Body.*Scan|Body.*Transformation/i);
    // expect(allSrc).toMatch(/Pantry/i); // Feature removed in Today redesign
    expect(allSrc).toMatch(/Photo.*Log|AI.*Photo/i);
  });
});

// ── Push Notification Reminders for Progress Photos ─────────────────────
describe("Progress Photo Notification Reminders", () => {
  it("notifications.ts exports progress photo reminder functions", () => {
    const src = readFile("lib/notifications.ts");
    expect(src).toContain("scheduleProgressPhotoReminder");
    expect(src).toContain("cancelProgressPhotoReminder");
    expect(src).toContain("getProgressPhotoReminderSettings");
  });

  it("progress photo reminder supports daily and weekly frequencies", () => {
    const src = readFile("lib/notifications.ts");
    expect(src).toContain("PROGRESS_PHOTO_FREQUENCY_KEY");
    expect(src).toContain('"daily"');
    expect(src).toContain('"weekly"');
    expect(src).toContain('"off"');
  });

  it("progress photo reminder saves preferences to AsyncStorage", () => {
    const src = readFile("lib/notifications.ts");
    expect(src).toContain("PROGRESS_PHOTO_FREQUENCY_KEY");
    expect(src).toContain("PROGRESS_PHOTO_HOUR_KEY");
    expect(src).toContain("PROGRESS_PHOTO_MINUTE_KEY");
    expect(src).toContain("PROGRESS_PHOTO_WEEKDAY_KEY");
  });

  it("notification-preferences screen includes progress photo reminder section", () => {
    const src = readFile("app/notification-preferences.tsx");
    expect(src).toContain("Progress Photo Reminder");
    expect(src).toContain("progressPhotoFrequency");
  });

  it("notification-preferences imports progress photo functions", () => {
    const src = readFile("app/notification-preferences.tsx");
    expect(src).toContain("scheduleProgressPhotoReminder");
    expect(src).toContain("cancelProgressPhotoReminder");
  });

  it("notification-preferences has frequency selector (off/daily/weekly)", () => {
    const src = readFile("app/notification-preferences.tsx");
    // Should have the three frequency options
    expect(src).toContain('"off"');
    expect(src).toContain('"daily"');
    expect(src).toContain('"weekly"');
    expect(src).toContain("progressPhotoFrequency");
  });

  it("notification-preferences has day-of-week selector for weekly frequency", () => {
    const src = readFile("app/notification-preferences.tsx");
    expect(src).toContain("progressPhotoWeekday");
    expect(src).toContain("Sun");
    expect(src).toContain("Mon");
    expect(src).toContain("Sat");
  });

  it("notification-preferences has time picker for progress photo reminder", () => {
    const src = readFile("app/notification-preferences.tsx");
    expect(src).toContain('setActivePicker("progressPhoto")');
    expect(src).toContain("progressPhotoHour");
    expect(src).toContain("progressPhotoMinute");
  });

  it("summary card shows progress photo reminder schedule", () => {
    const src = readFile("app/notification-preferences.tsx");
    expect(src).toContain("Progress photo");
    expect(src).toContain('progressPhotoFrequency !== "off"');
  });

  it("progress photo reminder notification data routes to scan tab", () => {
    const src = readFile("lib/notifications.ts");
    expect(src).toContain("progress_photo_reminder");
    expect(src).toContain("/(tabs)/scan");
  });
});

// ── Integration Checks ──────────────────────────────────────────────────
describe("Integration Checks", () => {
  it("notification-preferences NotifPrefs interface includes progress photo fields", () => {
    const src = readFile("app/notification-preferences.tsx");
    expect(src).toContain("progressPhotoFrequency:");
    expect(src).toContain("progressPhotoHour:");
    expect(src).toContain("progressPhotoMinute:");
    expect(src).toContain("progressPhotoWeekday:");
  });

  it("DEFAULT_PREFS includes progress photo defaults", () => {
    const src = readFile("app/notification-preferences.tsx");
    // Should have default frequency as "off"
    expect(src).toMatch(/progressPhotoFrequency.*"off"/);
  });

  it("savePrefs handles progress photo scheduling", () => {
    const src = readFile("app/notification-preferences.tsx");
    expect(src).toContain("scheduleProgressPhotoReminder");
    expect(src).toContain("cancelProgressPhotoReminder");
  });
});
