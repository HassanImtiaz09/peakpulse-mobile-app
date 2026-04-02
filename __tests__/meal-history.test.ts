import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock AsyncStorage
const mockStorage: Record<string, string> = {};
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async (key: string) => mockStorage[key] ?? null),
    setItem: vi.fn(async (key: string, value: string) => { mockStorage[key] = value; }),
    removeItem: vi.fn(async (key: string) => { delete mockStorage[key]; }),
  },
}));

import {
  loadMealHistory,
  saveMealPlanToHistory,
  getPastMealNames,
  loadPhotoCache,
  updatePhotoCacheFromPlan,
  applyCachedPhotos,
  getCachedPhotoUrl,
} from "../lib/meal-history";

beforeEach(() => {
  // Clear mock storage before each test
  Object.keys(mockStorage).forEach(k => delete mockStorage[k]);
});

describe("Meal History", () => {
  it("should return empty array when no history exists", async () => {
    const history = await loadMealHistory();
    expect(history).toEqual([]);
  });

  it("should save meal plan names to history", async () => {
    const plan = {
      days: [
        { day: "Monday", meals: [{ name: "Scrambled Eggs" }, { name: "Grilled Chicken Salad" }] },
        { day: "Tuesday", meals: [{ name: "Overnight Oats" }, { name: "Salmon Bowl" }] },
      ],
    };

    await saveMealPlanToHistory(plan);
    const history = await loadMealHistory();
    expect(history).toHaveLength(1);
    expect(history[0].mealNames).toContain("scrambled eggs");
    expect(history[0].mealNames).toContain("grilled chicken salad");
    expect(history[0].mealNames).toContain("overnight oats");
    expect(history[0].mealNames).toContain("salmon bowl");
    expect(history[0].generatedAt).toBeTruthy();
  });

  it("should accumulate multiple history entries", async () => {
    const plan1 = { days: [{ day: "Monday", meals: [{ name: "Eggs" }] }] };
    const plan2 = { days: [{ day: "Monday", meals: [{ name: "Oatmeal" }] }] };

    await saveMealPlanToHistory(plan1);
    await saveMealPlanToHistory(plan2);
    const history = await loadMealHistory();
    expect(history).toHaveLength(2);
  });

  it("should limit history to 4 entries (rolling window)", async () => {
    for (let i = 0; i < 6; i++) {
      await saveMealPlanToHistory({
        days: [{ day: "Monday", meals: [{ name: `Meal ${i}` }] }],
      });
    }
    const history = await loadMealHistory();
    expect(history).toHaveLength(4);
    // Should keep the most recent 4
    expect(history[0].mealNames).toContain("meal 2");
    expect(history[3].mealNames).toContain("meal 5");
  });

  it("should return deduplicated past meal names", async () => {
    await saveMealPlanToHistory({
      days: [
        { day: "Monday", meals: [{ name: "Eggs" }, { name: "Chicken" }] },
        { day: "Tuesday", meals: [{ name: "Eggs" }, { name: "Salmon" }] },
      ],
    });
    const names = await getPastMealNames();
    // "eggs" should only appear once
    expect(names.filter(n => n === "eggs")).toHaveLength(1);
    expect(names).toContain("chicken");
    expect(names).toContain("salmon");
  });

  it("should not save empty plans to history", async () => {
    await saveMealPlanToHistory({ days: [] });
    await saveMealPlanToHistory(null);
    await saveMealPlanToHistory({ days: [{ day: "Monday", meals: [] }] });
    const history = await loadMealHistory();
    expect(history).toHaveLength(0);
  });
});

describe("Photo Cache", () => {
  it("should return empty cache when none exists", async () => {
    const cache = await loadPhotoCache();
    expect(cache).toEqual({});
  });

  it("should cache photo URLs from a meal plan", async () => {
    const plan = {
      days: [
        {
          day: "Monday",
          meals: [
            { name: "Scrambled Eggs", type: "breakfast", photoUrl: "https://example.com/eggs.jpg" },
            { name: "Grilled Chicken", type: "lunch", photoUrl: "https://example.com/chicken.jpg" },
          ],
        },
      ],
    };

    const cache = await updatePhotoCacheFromPlan(plan);
    expect(cache["scrambled eggs|breakfast"]).toBe("https://example.com/eggs.jpg");
    expect(cache["grilled chicken|lunch"]).toBe("https://example.com/chicken.jpg");
  });

  it("should look up cached photos correctly", async () => {
    const plan = {
      days: [{
        day: "Monday",
        meals: [{ name: "Scrambled Eggs", type: "breakfast", photoUrl: "https://example.com/eggs.jpg" }],
      }],
    };
    const cache = await updatePhotoCacheFromPlan(plan);
    expect(getCachedPhotoUrl(cache, "Scrambled Eggs", "breakfast")).toBe("https://example.com/eggs.jpg");
    expect(getCachedPhotoUrl(cache, "Unknown Meal", "lunch")).toBeNull();
  });

  it("should apply cached photos to a plan with missing photoUrls", async () => {
    // First, cache some photos
    await updatePhotoCacheFromPlan({
      days: [{
        day: "Monday",
        meals: [
          { name: "Scrambled Eggs", type: "breakfast", photoUrl: "https://example.com/eggs.jpg" },
          { name: "Grilled Chicken", type: "lunch", photoUrl: "https://example.com/chicken.jpg" },
        ],
      }],
    });

    // Now apply to a plan without photoUrls
    const newPlan = {
      days: [{
        day: "Monday",
        meals: [
          { name: "Scrambled Eggs", type: "breakfast" }, // No photoUrl
          { name: "Salmon Bowl", type: "lunch" }, // No photoUrl, not in cache
        ],
      }],
    };

    const result = await applyCachedPhotos(newPlan);
    expect(result.days[0].meals[0].photoUrl).toBe("https://example.com/eggs.jpg");
    expect(result.days[0].meals[1].photoUrl).toBeUndefined();
  });

  it("should not overwrite existing photoUrls when applying cache", async () => {
    await updatePhotoCacheFromPlan({
      days: [{
        day: "Monday",
        meals: [{ name: "Eggs", type: "breakfast", photoUrl: "https://example.com/old.jpg" }],
      }],
    });

    const plan = {
      days: [{
        day: "Monday",
        meals: [{ name: "Eggs", type: "breakfast", photoUrl: "https://example.com/new.jpg" }],
      }],
    };

    const result = await applyCachedPhotos(plan);
    expect(result.days[0].meals[0].photoUrl).toBe("https://example.com/new.jpg");
  });

  it("should skip meals without photoUrl when building cache", async () => {
    const plan = {
      days: [{
        day: "Monday",
        meals: [
          { name: "Eggs", type: "breakfast" }, // No photoUrl
          { name: "Chicken", type: "lunch", photoUrl: "https://example.com/chicken.jpg" },
        ],
      }],
    };

    const cache = await updatePhotoCacheFromPlan(plan);
    expect(cache["eggs|breakfast"]).toBeUndefined();
    expect(cache["chicken|lunch"]).toBe("https://example.com/chicken.jpg");
  });
});
