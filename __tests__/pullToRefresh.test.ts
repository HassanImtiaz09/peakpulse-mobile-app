/**
 * Pull-to-Refresh Tests
 * Verifies that RefreshControl is properly wired up in all three tabs.
 */
import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const HOME_TAB = fs.readFileSync(path.join(__dirname, "../app/(tabs)/index.tsx"), "utf-8");
const TRAIN_TAB = fs.readFileSync(path.join(__dirname, "../app/(tabs)/plans.tsx"), "utf-8");
const MEALS_TAB = fs.readFileSync(path.join(__dirname, "../app/(tabs)/meals.tsx"), "utf-8");

describe("Pull-to-Refresh: Home Tab", () => {
  it("imports RefreshControl from react-native", () => {
    expect(HOME_TAB).toContain("RefreshControl");
  });

  it("declares refreshing state", () => {
    expect(HOME_TAB).toMatch(/useState.*false.*\)/);
    expect(HOME_TAB).toContain("setRefreshing");
  });

  it("has an onRefresh callback", () => {
    expect(HOME_TAB).toContain("const onRefresh = useCallback");
  });

  it("attaches RefreshControl to the Animated.ScrollView", () => {
    expect(HOME_TAB).toContain("refreshControl=");
    expect(HOME_TAB).toMatch(/RefreshControl[\s\S]*?refreshing=\{refreshing\}/);
    expect(HOME_TAB).toMatch(/RefreshControl[\s\S]*?onRefresh=\{onRefresh\}/);
  });

  it("reloads TDEE, workout plan, analytics, and discovery prompt on refresh", () => {
    expect(HOME_TAB).toContain("@user_tdee");
    expect(HOME_TAB).toContain("@peakpulse_calorie_goal");
    expect(HOME_TAB).toContain("@cached_workout_plan");
    expect(HOME_TAB).toContain("getStreakData");
    expect(HOME_TAB).toContain("getPRSummary");
    expect(HOME_TAB).toContain("analyzeMuscleBalance");
    expect(HOME_TAB).toContain("getNextPrompt");
  });
});

describe("Pull-to-Refresh: Train Tab", () => {
  it("imports RefreshControl from react-native", () => {
    expect(TRAIN_TAB).toContain("RefreshControl");
  });

  it("declares refreshing state", () => {
    expect(TRAIN_TAB).toContain("setRefreshing");
  });

  it("has an onRefresh callback", () => {
    expect(TRAIN_TAB).toContain("const onRefresh = useCallback");
  });

  it("attaches RefreshControl to the Animated.ScrollView", () => {
    expect(TRAIN_TAB).toContain("refreshControl=");
    expect(TRAIN_TAB).toMatch(/RefreshControl[\s\S]*?refreshing=\{refreshing\}/);
    expect(TRAIN_TAB).toMatch(/RefreshControl[\s\S]*?onRefresh=\{onRefresh\}/);
  });

  it("reloads profile, workout plan, and completed days on refresh", () => {
    // The onRefresh should reload profile, workout plan, and completed days
    const onRefreshBlock = TRAIN_TAB.slice(TRAIN_TAB.indexOf("const onRefresh = useCallback"));
    expect(onRefreshBlock).toContain("@guest_profile");
    expect(onRefreshBlock).toContain("@guest_workout_plan");
    expect(onRefreshBlock).toContain("@workout_completed_days");
  });
});

describe("Pull-to-Refresh: Meals Tab", () => {
  it("imports RefreshControl from react-native", () => {
    expect(MEALS_TAB).toContain("RefreshControl");
  });

  it("declares refreshing state", () => {
    expect(MEALS_TAB).toContain("setRefreshing");
  });

  it("has an onRefresh callback", () => {
    expect(MEALS_TAB).toContain("const onRefresh = useCallback");
  });

  it("attaches RefreshControl to all three sub-tab ScrollViews", () => {
    // Count RefreshControl occurrences — should be at least 3 (Tracker, Meal Plan, Pantry)
    const matches = MEALS_TAB.match(/RefreshControl/g) || [];
    expect(matches.length).toBeGreaterThanOrEqual(4); // import + 3 usages
  });

  it("reloads profile, meal plan, favourites, water, chart data, and preferences on refresh", () => {
    const onRefreshBlock = MEALS_TAB.slice(MEALS_TAB.indexOf("const onRefresh = useCallback"));
    expect(onRefreshBlock).toContain("@guest_profile");
    expect(onRefreshBlock).toContain("@guest_meal_plan");
    expect(onRefreshBlock).toContain("@favourite_foods");
    expect(onRefreshBlock).toContain("@water_intake_");
    expect(onRefreshBlock).toContain("getHistoricalMeals");
    expect(onRefreshBlock).toContain("refreshFromStorage");
    expect(onRefreshBlock).toContain("loadMealPreferences");
  });

  it("uses gold accent color for the refresh spinner", () => {
    expect(MEALS_TAB).toContain("tintColor={MGOLD}");
  });
});
