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

// ── Dashboard Greeting Fix ─────────────────────────────────────
describe("Dashboard Greeting Fix", () => {
  it("dashboard shows 'HI,' greeting instead of 'YOUR'", () => {
    const src = readFile("app/(tabs)/index.tsx");
    expect(src).toContain("HI, {");
    expect(src).not.toMatch(/YOUR\s+\{.*displayName/);
  });

  it("dashboard uses savedDisplayName from user profile context", () => {
    const src = readFile("app/(tabs)/index.tsx");
    expect(src).toContain("useUserProfile");
    expect(src).toContain("savedDisplayName");
  });
});

// ── Dashboard Layout Reorder ─────────────────────────────────────
describe("Dashboard Layout Reorder", () => {
  it("today's workout section exists on dashboard", () => {
    const src = readFile("app/(tabs)/index.tsx");
    expect(src).toMatch(/TODAY.*WORKOUT|todayWorkout/i);
  });

  it("today's nutrition section exists on dashboard", () => {
    const src = readFile("app/(tabs)/index.tsx");
    expect(src).toMatch(/TODAY.*NUTRITION|TODAY.*MEAL|todayNutrition/i);
  });

  it("workout and meal sections appear in the dashboard", () => {
    const src = readFile("app/(tabs)/index.tsx");
    // workoutPlan data is used in the dashboard
    expect(src).toContain("workoutPlan");
    expect(src).toContain("mealPlan");
  });

  it("progress photos tile exists on dashboard", () => {
    const src = readFile("app/(tabs)/index.tsx");
    expect(src).toMatch(/PROGRESS PHOTO|progressPhoto|Take.*Photo/i);
  });
});

// ── Full-Screen Before/After Slider ─────────────────────────────────────
describe("Full-Screen Before/After Slider", () => {
  it("scan.tsx has fullscreen comparison modal state", () => {
    const src = readFile("app/(tabs)/scan.tsx");
    expect(src).toContain("showSliderComparison");
    expect(src).toContain("setShowSliderComparison");
  });

  it("scan.tsx has a Full Screen slider button", () => {
    const src = readFile("app/(tabs)/scan.tsx");
    expect(src).toContain("Full-screen slider");
  });

  it("fullscreen modal uses a slider/drag gesture for comparison", () => {
    const src = readFile("app/(tabs)/scan.tsx");
    // Should have a slider position state and pan/drag handler
    expect(src).toContain("sliderPos");
    expect(src).toContain("panResponder");
  });

  it("fullscreen modal shows BEFORE and AFTER labels", () => {
    const src = readFile("app/(tabs)/scan.tsx");
    expect(src).toContain("BEFORE");
    expect(src).toContain("AFTER");
  });
});

// ── Progress Photo Streak Tracker ─────────────────────────────────────
describe("Progress Photo Streak Tracker", () => {
  it("dashboard has progressPhotoStreak state", () => {
    const src = readFile("app/(tabs)/index.tsx");
    expect(src).toContain("progressPhotoStreak");
  });

  it("streak is loaded from AsyncStorage progress photos", () => {
    const src = readFile("app/(tabs)/index.tsx");
    expect(src).toContain("@progress_photos");
  });

  it("streak count is displayed on the dashboard", () => {
    const src = readFile("app/(tabs)/index.tsx");
    expect(src).toContain("progressPhotoStreak");
    // Should show the streak number
    expect(src).toMatch(/streak|day/i);
  });
});

// ── Animated AI Coach Icon ─────────────────────────────────────
describe("Animated AI Coach Icon", () => {
  it("AI coach icon image exists in assets", () => {
    expect(fileExists("assets/images/ai-coach-icon.png")).toBe(true);
  });

  it("dashboard has an animated AI Coach card", () => {
    const src = readFile("app/(tabs)/index.tsx");
    expect(src).toContain("ai-coach-icon");
    expect(src).toContain("AI Coach");
  });

  it("AI coach card has a pulsing animation", () => {
    const src = readFile("app/(tabs)/index.tsx");
    expect(src).toContain("aiCoachPulse");
    expect(src).toContain("withRepeat");
  });
});

// ── In-App Purchase Flow ─────────────────────────────────────
describe("In-App Purchase Flow", () => {
  it("paywall modal has billing cycle toggle (monthly/annual)", () => {
    const src = readFile("components/paywall-modal.tsx");
    expect(src).toContain("billingCycle");
    expect(src).toContain("monthly");
    expect(src).toContain("annual");
  });

  it("paywall modal has direct Subscribe button with price", () => {
    const src = readFile("components/paywall-modal.tsx");
    expect(src).toContain("Subscribe to");
    expect(src).toContain("/mo");
  });

  it("paywall modal uses Linking.openURL for Stripe checkout", () => {
    const src = readFile("components/paywall-modal.tsx");
    expect(src).toContain("Linking.openURL");
    expect(src).toContain("STRIPE");
  });

  it("paywall modal has a Compare all plans link", () => {
    const src = readFile("components/paywall-modal.tsx");
    expect(src).toContain("Compare all plans");
  });

  it("paywall modal shows annual discount badge", () => {
    const src = readFile("components/paywall-modal.tsx");
    expect(src).toContain("-30%");
  });

  it("paywall modal checks authentication before purchase", () => {
    const src = readFile("components/paywall-modal.tsx");
    expect(src).toContain("isAuthenticated");
    expect(src).toContain("Sign In Required");
  });
});

// ── Meal Name Unicode Fix ─────────────────────────────────────
describe("Meal Name Unicode Fix", () => {
  it("plans.tsx has a sanitizeMealName function", () => {
    const src = readFile("app/(tabs)/plans.tsx");
    expect(src).toContain("sanitizeMealName");
  });

  it("sanitizeMealName removes unicode bullet characters", () => {
    const src = readFile("app/(tabs)/plans.tsx");
    expect(src).toContain("\\u00b7");
    expect(src).toContain("\\u2022");
  });

  it("MealCard uses sanitizeMealName for meal.name", () => {
    const src = readFile("app/(tabs)/plans.tsx");
    expect(src).toContain("sanitizeMealName(meal.name)");
  });

  it("meal swap modal uses sanitizeMealName for alt.name", () => {
    const src = readFile("app/(tabs)/plans.tsx");
    expect(src).toContain("sanitizeMealName(alt.name)");
  });
});

// ── Meal Swap Images ─────────────────────────────────────
describe("Meal Swap Suggestion Images", () => {
  it("server provides unique image URLs per swap suggestion", () => {
    const src = readFile("server/routers.ts");
    expect(src).toContain("FOOD_PHOTOS");
    expect(src).toContain("idx % FOOD_PHOTOS.length");
  });

  it("meal swap modal uses server imageUrl when available", () => {
    const src = readFile("app/(tabs)/plans.tsx");
    expect(src).toContain("alt.imageUrl || getMealPhotoUrl");
  });

  it("server has at least 6 unique food photo IDs", () => {
    const src = readFile("server/routers.ts");
    const matches = src.match(/photo-\d{10,}/g) || [];
    // Should have at least 6 unique photo IDs for variety
    const unique = new Set(matches);
    expect(unique.size).toBeGreaterThanOrEqual(6);
  });
});
