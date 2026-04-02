/**
 * Tests for weekly auto-refresh and pinned meals features.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock AsyncStorage
const mockStorage: Record<string, string> = {};
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn((key: string) => Promise.resolve(mockStorage[key] ?? null)),
    setItem: vi.fn((key: string, value: string) => {
      mockStorage[key] = value;
      return Promise.resolve();
    }),
    removeItem: vi.fn((key: string) => {
      delete mockStorage[key];
      return Promise.resolve();
    }),
  },
}));

import {
  isWeeklyRefreshNeeded,
  markWeeklyRefreshDone,
  loadPinnedMeals,
  savePinnedMeals,
  togglePinnedMeal,
  applyPinnedMeals,
  cleanupPinnedMeals,
} from "../lib/meal-history";

describe("Weekly Auto-Refresh", () => {
  beforeEach(() => {
    Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
  });

  it("should need refresh when no previous refresh recorded", async () => {
    const needed = await isWeeklyRefreshNeeded();
    expect(needed).toBe(true);
  });

  it("should not need refresh after marking current week as done", async () => {
    await markWeeklyRefreshDone();
    const needed = await isWeeklyRefreshNeeded();
    expect(needed).toBe(false);
  });

  it("should need refresh when stored week differs from current", async () => {
    mockStorage["@meal_plan_last_refresh_week"] = "2020-W01";
    const needed = await isWeeklyRefreshNeeded();
    expect(needed).toBe(true);
  });
});

describe("Pinned Meals", () => {
  beforeEach(() => {
    Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
  });

  it("should return empty object when no pinned meals", async () => {
    const pinned = await loadPinnedMeals();
    expect(pinned).toEqual({});
  });

  it("should save and load pinned meals", async () => {
    const data = { "0-1": { name: "Oatmeal", type: "breakfast" } };
    await savePinnedMeals(data);
    const loaded = await loadPinnedMeals();
    expect(loaded).toEqual(data);
  });

  it("should toggle a meal pin on", async () => {
    const meal = { name: "Grilled Chicken", type: "lunch", calories: 400 };
    const result = await togglePinnedMeal("1-0", meal);
    expect(result["1-0"]).toEqual(meal);
  });

  it("should toggle a meal pin off", async () => {
    const meal = { name: "Grilled Chicken", type: "lunch", calories: 400 };
    await togglePinnedMeal("1-0", meal); // pin
    const result = await togglePinnedMeal("1-0", meal); // unpin
    expect(result["1-0"]).toBeUndefined();
  });

  it("should apply pinned meals to a regenerated plan", () => {
    const plan = {
      days: [
        { day: "Monday", meals: [{ name: "New Breakfast", type: "breakfast" }, { name: "New Lunch", type: "lunch" }] },
        { day: "Tuesday", meals: [{ name: "New Dinner", type: "dinner" }] },
      ],
    };
    const pinned = {
      "0-1": { name: "Pinned Lunch", type: "lunch", calories: 500, photoUrl: "https://example.com/lunch.jpg" },
    };

    const result = applyPinnedMeals(plan, pinned);
    // Pinned meal should replace the meal at position 0-1
    expect(result.days[0].meals[1].name).toBe("Pinned Lunch");
    expect(result.days[0].meals[1]._pinned).toBe(true);
    // Non-pinned meals should remain unchanged
    expect(result.days[0].meals[0].name).toBe("New Breakfast");
    expect(result.days[1].meals[0].name).toBe("New Dinner");
  });

  it("should not modify plan when no pinned meals", () => {
    const plan = {
      days: [
        { day: "Monday", meals: [{ name: "Breakfast", type: "breakfast" }] },
      ],
    };
    const result = applyPinnedMeals(plan, {});
    expect(result).toBe(plan); // Same reference, not modified
  });

  it("should cleanup pinned meals for positions that no longer exist", async () => {
    const data = {
      "0-0": { name: "Oatmeal" },
      "0-1": { name: "Salad" },
      "5-0": { name: "Ghost Meal" }, // Day 5 doesn't exist
    };
    await savePinnedMeals(data);

    const plan = {
      days: [
        { day: "Monday", meals: [{ name: "A" }, { name: "B" }] },
      ],
    };

    const cleaned = await cleanupPinnedMeals(plan);
    expect(cleaned["0-0"]).toBeDefined();
    expect(cleaned["0-1"]).toBeDefined();
    expect(cleaned["5-0"]).toBeUndefined(); // Cleaned up
  });
});
