import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Test 1: Enhanced Assistant Greetings ──
describe("assistant-greetings (enhanced)", () => {
  let getGreeting: typeof import("../lib/assistant-greetings").getGreeting;

  beforeEach(async () => {
    vi.restoreAllMocks();
    const mod = await import("../lib/assistant-greetings");
    getGreeting = mod.getGreeting;
  });

  it("returns a greeting string for basic data", () => {
    const result = getGreeting({
      name: "Alex",
      streakDays: 3,
      workoutsCompleted: 10,
      totalScans: 2,
      totalMeals: 20,
      lastScanBF: 18.5,
      goal: "build_muscle",
    });
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(5);
  });

  it("returns new user welcome when no workouts or scans", () => {
    const result = getGreeting({
      name: "New User",
      streakDays: 0,
      workoutsCompleted: 0,
      totalScans: 0,
      totalMeals: 0,
      lastScanBF: null,
      goal: "general fitness",
    });
    expect(result).toMatch(/Welcome|Hey|Good/i);
    expect(result).toContain("New");
  });

  it("returns streak milestone for 100-day streak", () => {
    const result = getGreeting({
      name: "Streak King",
      streakDays: 100,
      workoutsCompleted: 80,
      totalScans: 5,
      totalMeals: 200,
      lastScanBF: 12,
      goal: "build_muscle",
    });
    expect(result).toContain("100-day streak");
    expect(result).toContain("Streak");
  });

  it("accepts enhanced data fields without crashing", () => {
    const result = getGreeting({
      name: "Enhanced User",
      streakDays: 5,
      workoutsCompleted: 15,
      totalScans: 3,
      totalMeals: 40,
      lastScanBF: 20,
      goal: "lose_fat",
      todayCalories: 1200,
      calorieGoal: 2000,
      todayMealsLogged: 2,
      hasWorkoutToday: true,
      wearableSteps: 6500,
      wearableCaloriesBurnt: 1800,
      wearableSleepHours: 7.5,
      pantryExpiringCount: 3,
    });
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(5);
  });

  it("returns inactivity encouragement when streak is 0 but has workouts", () => {
    const result = getGreeting({
      name: "Comeback",
      streakDays: 0,
      workoutsCompleted: 20,
      totalScans: 1,
      totalMeals: 10,
      lastScanBF: null,
      goal: "maintain",
    });
    expect(result).toMatch(/restart|streak|one workout/i);
  });
});

// ── Test 2: Wearable Context ──
describe("wearable-context", () => {
  it("exports WearableProvider and useWearable", async () => {
    const mod = await import("../lib/wearable-context");
    expect(mod.WearableProvider).toBeDefined();
    expect(mod.useWearable).toBeDefined();
  });
});

// ── Test 3: Pantry Context types ──
describe("pantry-context exports", () => {
  it("exports PantryProvider and usePantry", async () => {
    const mod = await import("../lib/pantry-context");
    expect(mod.PantryProvider).toBeDefined();
    expect(mod.usePantry).toBeDefined();
  });
});
