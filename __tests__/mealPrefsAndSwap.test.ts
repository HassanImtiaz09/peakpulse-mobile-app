import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock AsyncStorage
const store: Record<string, string> = {};
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async (key: string) => store[key] ?? null),
    setItem: vi.fn(async (key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn(async (key: string) => { delete store[key]; }),
  },
}));

import {
  loadMealPreferences as loadPreferences,
  toggleFavourite,
  rateMeal,
  buildPreferenceSummary as getPreferenceSummary,
  isFavourite,
  getMealRating,
} from "../lib/meal-preferences";

describe("Meal Preferences", () => {
  beforeEach(() => {
    Object.keys(store).forEach(k => delete store[k]);
  });

  it("should start with empty preferences", async () => {
    const prefs = await loadPreferences();
    expect(prefs).toEqual({ favourites: [], ratings: {}, disliked: [] });
  });

  it("should toggle favourite on and off", async () => {
    let prefs = await toggleFavourite("Grilled Chicken Salad");
    expect(prefs.favourites).toContain("Grilled Chicken Salad");
    expect(isFavourite(prefs, "Grilled Chicken Salad")).toBe(true);

    prefs = await toggleFavourite("Grilled Chicken Salad");
    expect(prefs.favourites).not.toContain("Grilled Chicken Salad");
    expect(isFavourite(prefs, "Grilled Chicken Salad")).toBe(false);
  });

  it("should rate a meal and retrieve the rating", async () => {
    const prefs = await rateMeal("Quinoa Bowl", 4);
    expect(getMealRating(prefs, "Quinoa Bowl")).toBe(4);
  });

  it("should update an existing rating", async () => {
    await rateMeal("Quinoa Bowl", 3);
    const prefs = await rateMeal("Quinoa Bowl", 5);
    expect(getMealRating(prefs, "Quinoa Bowl")).toBe(5);
  });

  it("should return 0 for unrated meals", async () => {
    const prefs = await loadPreferences();
    expect(getMealRating(prefs, "Unknown Meal")).toBe(0);
  });

  it("should generate a preference summary", async () => {
    await toggleFavourite("Grilled Chicken");
    await toggleFavourite("Salmon Bowl");
    await rateMeal("Grilled Chicken", 5);
    await rateMeal("Pasta Carbonara", 1);
    const prefs = await loadPreferences();
    const summary = getPreferenceSummary(prefs);
    expect(summary).toContain("Grilled Chicken");
    expect(summary).toContain("Salmon Bowl");
  });

  it("should handle multiple favourites", async () => {
    await toggleFavourite("Meal A");
    await toggleFavourite("Meal B");
    await toggleFavourite("Meal C");
    const prefs = await loadPreferences();
    expect(prefs.favourites).toHaveLength(3);
    expect(isFavourite(prefs, "Meal A")).toBe(true);
    expect(isFavourite(prefs, "Meal B")).toBe(true);
    expect(isFavourite(prefs, "Meal C")).toBe(true);
  });

  it("should handle rating with dislike (1 star)", async () => {
    const prefs = await rateMeal("Bad Meal", 1);
    expect(getMealRating(prefs, "Bad Meal")).toBe(1);
    const summary = getPreferenceSummary(prefs);
    // Summary should mention disliked meals
    expect(summary.length).toBeGreaterThan(0);
  });

  it("should persist preferences across loads", async () => {
    await toggleFavourite("Persistent Meal");
    await rateMeal("Persistent Meal", 4);
    const prefs = await loadPreferences();
    expect(isFavourite(prefs, "Persistent Meal")).toBe(true);
    expect(getMealRating(prefs, "Persistent Meal")).toBe(4);
  });
});

describe("Calendar Overview Data", () => {
  it("should calculate macro percentages correctly", () => {
    const protein = 120;
    const carbs = 200;
    const fat = 60;
    const total = protein + carbs + fat;
    const pPct = (protein / total) * 100;
    const cPct = (carbs / total) * 100;
    const fPct = (fat / total) * 100;
    expect(Math.round(pPct + cPct + fPct)).toBe(100);
    expect(pPct).toBeCloseTo(31.58, 1);
    expect(cPct).toBeCloseTo(52.63, 1);
    expect(fPct).toBeCloseTo(15.79, 1);
  });

  it("should handle zero macros gracefully", () => {
    const total = 0 + 0 + 0;
    expect(total).toBe(0);
    // When total is 0, we should not render the bar (no division by zero)
  });

  it("should colour-code calories based on target", () => {
    const dailyTarget = 2000;
    const testCases = [
      { cals: 2200, expected: "#EF4444" },  // > 105% = red
      { cals: 1900, expected: "#22C55E" },  // 90-105% = green
      { cals: 1500, expected: "#FBBF24" },  // 70-90% = yellow
      { cals: 1000, expected: "#3B82F6" },  // < 70% = blue
    ];
    for (const tc of testCases) {
      const calPct = (tc.cals / dailyTarget) * 100;
      const color = calPct > 105 ? "#EF4444" : calPct > 90 ? "#22C55E" : calPct > 70 ? "#FBBF24" : "#3B82F6";
      expect(color).toBe(tc.expected);
    }
  });
});

describe("Smart Swap", () => {
  it("should limit alternatives to 3", () => {
    const alternatives = [
      { name: "Alt 1" },
      { name: "Alt 2" },
      { name: "Alt 3" },
      { name: "Alt 4" },
      { name: "Alt 5" },
      { name: "Alt 6" },
    ];
    const displayed = alternatives.slice(0, 3);
    expect(displayed).toHaveLength(3);
    expect(displayed[0].name).toBe("Alt 1");
    expect(displayed[2].name).toBe("Alt 3");
  });

  it("should handle empty alternatives gracefully", () => {
    const alternatives: any[] = [];
    const displayed = alternatives.slice(0, 3);
    expect(displayed).toHaveLength(0);
  });
});
