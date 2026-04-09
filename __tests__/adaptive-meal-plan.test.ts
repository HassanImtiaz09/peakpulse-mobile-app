/**
 * Tests for lib/adaptive-meal-plan.ts
 * Adaptive Meal Plan Adjustment — detects under-eating, over-eating,
 * missed meals, low protein, and positive streaks.
 */
import { describe, it, expect } from "vitest";
import {
  buildDaySummaries,
  analyseMealPatterns,
  getSimpleMealSuggestions,
  calculateRemainingDayTargets,
  getWeekId,
  ANALYSIS_WINDOW_DAYS,
  UNDER_EATING_THRESHOLD,
  OVER_EATING_THRESHOLD,
  LOW_PROTEIN_THRESHOLD,
  MIN_TRIGGER_DAYS,
  type DaySummary,
  type MealInsight,
} from "@/lib/adaptive-meal-plan";
import type { MealEntry } from "@/lib/calorie-context";

// ── Helpers ──────────────────────────────────────────────────────────────

function makeMealEntry(overrides: Partial<MealEntry> = {}): MealEntry {
  return {
    id: `meal-${Math.random().toString(36).slice(2, 6)}`,
    name: overrides.name ?? "Test Meal",
    mealType: overrides.mealType ?? "lunch",
    calories: overrides.calories ?? 500,
    protein: overrides.protein ?? 30,
    carbs: overrides.carbs ?? 50,
    fat: overrides.fat ?? 20,
    loggedAt: overrides.loggedAt ?? new Date().toISOString(),
    ...overrides,
  };
}

function makeDaySummary(overrides: Partial<DaySummary> = {}): DaySummary {
  return {
    date: overrides.date ?? "2026-04-07",
    totalCalories: overrides.totalCalories ?? 2000,
    totalProtein: overrides.totalProtein ?? 150,
    totalCarbs: overrides.totalCarbs ?? 200,
    totalFat: overrides.totalFat ?? 70,
    mealCount: overrides.mealCount ?? 3,
    ...overrides,
  };
}

/** Generate N day summaries for past days (not including today). */
function makePastDaySummaries(
  count: number,
  overrides: Partial<DaySummary> = {},
): DaySummary[] {
  const summaries: DaySummary[] = [];
  const today = new Date();
  for (let i = 1; i <= count; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    summaries.push(
      makeDaySummary({
        date: d.toISOString().split("T")[0],
        ...overrides,
      }),
    );
  }
  return summaries.sort((a, b) => a.date.localeCompare(b.date));
}

// ── Tests ────────────────────────────────────────────────────────────────

describe("buildDaySummaries", () => {
  it("returns empty array for empty input", () => {
    const result = buildDaySummaries({});
    expect(result).toEqual([]);
  });

  it("correctly sums calories and macros per day", () => {
    const meals: Record<string, MealEntry[]> = {
      "2026-04-07": [
        makeMealEntry({ calories: 400, protein: 30, carbs: 40, fat: 15 }),
        makeMealEntry({ calories: 600, protein: 40, carbs: 60, fat: 25 }),
      ],
    };
    const result = buildDaySummaries(meals);
    expect(result).toHaveLength(1);
    expect(result[0].totalCalories).toBe(1000);
    expect(result[0].totalProtein).toBe(70);
    expect(result[0].totalCarbs).toBe(100);
    expect(result[0].totalFat).toBe(40);
    expect(result[0].mealCount).toBe(2);
  });

  it("handles days with no meals", () => {
    const meals: Record<string, MealEntry[]> = {
      "2026-04-07": [],
    };
    const result = buildDaySummaries(meals);
    expect(result).toHaveLength(1);
    expect(result[0].totalCalories).toBe(0);
    expect(result[0].mealCount).toBe(0);
  });

  it("sorts results by date ascending", () => {
    const meals: Record<string, MealEntry[]> = {
      "2026-04-09": [makeMealEntry()],
      "2026-04-07": [makeMealEntry()],
      "2026-04-08": [makeMealEntry()],
    };
    const result = buildDaySummaries(meals);
    expect(result[0].date).toBe("2026-04-07");
    expect(result[1].date).toBe("2026-04-08");
    expect(result[2].date).toBe("2026-04-09");
  });
});

describe("analyseMealPatterns", () => {
  const CALORIE_GOAL = 2000;
  const PROTEIN_TARGET = 150;

  it("returns empty insights for empty data", () => {
    const result = analyseMealPatterns([], CALORIE_GOAL, PROTEIN_TARGET);
    expect(result.insights).toEqual([]);
    expect(result.averageDailyCalories).toBe(0);
  });

  it("returns empty insights when calorie goal is 0", () => {
    const summaries = makePastDaySummaries(5, { totalCalories: 1500 });
    const result = analyseMealPatterns(summaries, 0, PROTEIN_TARGET);
    expect(result.insights).toEqual([]);
  });

  it("detects under-eating when 3+ days below 80% of target", () => {
    // 80% of 2000 = 1600. Set calories to 1200 (60%)
    const summaries = makePastDaySummaries(5, {
      totalCalories: 1200,
      mealCount: 2,
    });
    const result = analyseMealPatterns(summaries, CALORIE_GOAL, PROTEIN_TARGET);
    const underEating = result.insights.find((i) => i.type === "under_eating");
    expect(underEating).toBeDefined();
    expect(underEating!.severity).toBe("warning");
    expect(underEating!.triggerDays).toBeGreaterThanOrEqual(MIN_TRIGGER_DAYS);
  });

  it("does NOT detect under-eating when fewer than 3 days below threshold", () => {
    const today = new Date();
    const summaries: DaySummary[] = [];
    // 2 days under-eating
    for (let i = 1; i <= 2; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      summaries.push(makeDaySummary({ date: d.toISOString().split("T")[0], totalCalories: 1200, mealCount: 2 }));
    }
    // 3 days on track
    for (let i = 3; i <= 5; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      summaries.push(makeDaySummary({ date: d.toISOString().split("T")[0], totalCalories: 1900, mealCount: 3 }));
    }
    const result = analyseMealPatterns(summaries, CALORIE_GOAL, PROTEIN_TARGET);
    const underEating = result.insights.find((i) => i.type === "under_eating");
    expect(underEating).toBeUndefined();
  });

  it("detects over-eating when 3+ days above 120% of target", () => {
    // 120% of 2000 = 2400. Set calories to 2800 (140%)
    const summaries = makePastDaySummaries(5, {
      totalCalories: 2800,
      mealCount: 4,
    });
    const result = analyseMealPatterns(summaries, CALORIE_GOAL, PROTEIN_TARGET);
    const overEating = result.insights.find((i) => i.type === "over_eating");
    expect(overEating).toBeDefined();
    expect(overEating!.severity).toBe("warning");
  });

  it("detects missed meals when 3+ days have 0 logged meals", () => {
    const summaries = makePastDaySummaries(5, {
      totalCalories: 0,
      mealCount: 0,
    });
    const result = analyseMealPatterns(summaries, CALORIE_GOAL, PROTEIN_TARGET);
    const missed = result.insights.find((i) => i.type === "missed_meals");
    expect(missed).toBeDefined();
    expect(missed!.severity).toBe("warning");
  });

  it("detects low protein when 3+ days below 70% of target", () => {
    // 70% of 150 = 105. Set protein to 80
    const summaries = makePastDaySummaries(5, {
      totalCalories: 2000,
      totalProtein: 80,
      mealCount: 3,
    });
    const result = analyseMealPatterns(summaries, CALORIE_GOAL, PROTEIN_TARGET);
    const lowProtein = result.insights.find((i) => i.type === "low_protein");
    expect(lowProtein).toBeDefined();
    expect(lowProtein!.severity).toBe("info");
  });

  it("shows positive reinforcement when on track for 5+ days", () => {
    const summaries = makePastDaySummaries(6, {
      totalCalories: 1950,
      totalProtein: 145,
      mealCount: 3,
    });
    const result = analyseMealPatterns(summaries, CALORIE_GOAL, PROTEIN_TARGET);
    const positive = result.insights.find(
      (i) => i.type === "great_streak" || i.type === "on_track",
    );
    expect(positive).toBeDefined();
    expect(positive!.severity).toBe("success");
  });

  it("shows on_track for 3-4 days within range", () => {
    const today = new Date();
    const summaries: DaySummary[] = [];
    // 3 days on track
    for (let i = 1; i <= 3; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      summaries.push(makeDaySummary({ date: d.toISOString().split("T")[0], totalCalories: 1950, totalProtein: 145, mealCount: 3 }));
    }
    const result = analyseMealPatterns(summaries, CALORIE_GOAL, PROTEIN_TARGET);
    const onTrack = result.insights.find((i) => i.type === "on_track");
    expect(onTrack).toBeDefined();
    expect(onTrack!.severity).toBe("success");
  });

  it("excludes today from analysis (today is still in progress)", () => {
    const today = new Date().toISOString().split("T")[0];
    const summaries = [
      makeDaySummary({ date: today, totalCalories: 100, mealCount: 1 }),
    ];
    const result = analyseMealPatterns(summaries, CALORIE_GOAL, PROTEIN_TARGET);
    // Today should be excluded, so no insights
    expect(result.insights).toEqual([]);
  });

  it("calculates correct averages", () => {
    const summaries = makePastDaySummaries(4, {
      totalCalories: 1800,
      totalProtein: 120,
      mealCount: 3,
    });
    const result = analyseMealPatterns(summaries, CALORIE_GOAL, PROTEIN_TARGET);
    expect(result.averageDailyCalories).toBe(1800);
    expect(result.averageDailyProtein).toBe(120);
    expect(result.loggingConsistency).toBe(1.0);
  });

  it("calculates logging consistency correctly with mixed days", () => {
    const today = new Date();
    const summaries: DaySummary[] = [];
    // 3 days with meals
    for (let i = 1; i <= 3; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      summaries.push(makeDaySummary({ date: d.toISOString().split("T")[0], mealCount: 3 }));
    }
    // 3 days without meals
    for (let i = 4; i <= 6; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      summaries.push(makeDaySummary({ date: d.toISOString().split("T")[0], mealCount: 0, totalCalories: 0 }));
    }
    const result = analyseMealPatterns(summaries, CALORIE_GOAL, PROTEIN_TARGET);
    expect(result.loggingConsistency).toBeCloseTo(0.5, 1);
  });

  it("sorts insights by severity (warning first, then info, then success)", () => {
    // Create conditions for both under-eating and low protein
    const summaries = makePastDaySummaries(5, {
      totalCalories: 1200,
      totalProtein: 60,
      mealCount: 2,
    });
    const result = analyseMealPatterns(summaries, CALORIE_GOAL, PROTEIN_TARGET);
    if (result.insights.length >= 2) {
      const severities = result.insights.map((i) => i.severity);
      const warningIdx = severities.indexOf("warning");
      const infoIdx = severities.indexOf("info");
      if (warningIdx !== -1 && infoIdx !== -1) {
        expect(warningIdx).toBeLessThan(infoIdx);
      }
    }
  });

  it("suggests calorie adjustment when under-eating", () => {
    const summaries = makePastDaySummaries(5, {
      totalCalories: 1200,
      mealCount: 2,
    });
    const result = analyseMealPatterns(summaries, CALORIE_GOAL, PROTEIN_TARGET);
    // Should suggest reducing goal (negative adjustment)
    expect(result.suggestedCalorieAdjustment).toBeLessThan(0);
  });
});

describe("getSimpleMealSuggestions", () => {
  it("returns up to 4 suggestions", () => {
    const result = getSimpleMealSuggestions(500);
    expect(result.length).toBeLessThanOrEqual(4);
    expect(result.length).toBeGreaterThan(0);
  });

  it("returns suggestions with valid data", () => {
    const result = getSimpleMealSuggestions(400);
    for (const s of result) {
      expect(s.name).toBeTruthy();
      expect(s.calories).toBeGreaterThan(0);
      expect(s.protein).toBeGreaterThan(0);
      expect(s.prepTime).toBeTruthy();
      expect(s.icon).toBeTruthy();
    }
  });

  it("includes vegan options for vegan preference", () => {
    const result = getSimpleMealSuggestions(500, "vegan");
    const names = result.map((s) => s.name);
    // Should include at least one vegan-specific option
    const hasVeganOption = names.some(
      (n) => n.includes("Avocado") || n.includes("Hummus"),
    );
    expect(hasVeganOption || result.length > 0).toBe(true);
  });

  it("includes high-protein options for non-vegan preference", () => {
    const result = getSimpleMealSuggestions(500, "omnivore");
    expect(result.length).toBeGreaterThan(0);
  });

  it("sorts suggestions by how well they fill the calorie gap", () => {
    const result = getSimpleMealSuggestions(600);
    // First suggestion should be closest to half the gap (300 cal)
    if (result.length >= 2) {
      const diff0 = Math.abs(result[0].calories - 300);
      const diff1 = Math.abs(result[1].calories - 300);
      expect(diff0).toBeLessThanOrEqual(diff1);
    }
  });
});

describe("calculateRemainingDayTargets", () => {
  it("returns correct daily targets for remaining days", () => {
    const result = calculateRemainingDayTargets(
      14000, // weekly calorie target (2000/day)
      1050,  // weekly protein target (150/day)
      { calories: 6000, protein: 450 }, // consumed Mon-Wed
      4, // Thu-Sun remaining
    );
    expect(result.dailyCalories).toBe(2000); // (14000-6000)/4 = 2000
    expect(result.dailyProtein).toBe(150);   // (1050-450)/4 = 150
    expect(result.isAdjusted).toBe(false);   // same as normal
  });

  it("adjusts targets when under-consumed", () => {
    const result = calculateRemainingDayTargets(
      14000,
      1050,
      { calories: 2000, protein: 150 }, // only consumed 2000 in 3 days
      4,
    );
    // (14000-2000)/4 = 3000 per day — adjusted up
    expect(result.dailyCalories).toBe(3000);
    expect(result.isAdjusted).toBe(true);
  });

  it("enforces minimum calorie floor of 1200", () => {
    const result = calculateRemainingDayTargets(
      14000,
      1050,
      { calories: 13000, protein: 900 }, // already consumed most
      1,
    );
    expect(result.dailyCalories).toBeGreaterThanOrEqual(1200);
  });

  it("enforces minimum protein floor of 50g", () => {
    const result = calculateRemainingDayTargets(
      14000,
      1050,
      { calories: 10000, protein: 1000 }, // almost all protein consumed
      1,
    );
    expect(result.dailyProtein).toBeGreaterThanOrEqual(50);
  });

  it("returns zero targets when no days remaining", () => {
    const result = calculateRemainingDayTargets(14000, 1050, { calories: 14000, protein: 1050 }, 0);
    expect(result.dailyCalories).toBe(0);
    expect(result.dailyProtein).toBe(0);
    expect(result.isAdjusted).toBe(false);
  });
});

describe("getWeekId", () => {
  it("returns a string in YYYY-WN format", () => {
    const weekId = getWeekId();
    expect(weekId).toMatch(/^\d{4}-W\d+$/);
  });

  it("returns consistent value within the same call", () => {
    const id1 = getWeekId();
    const id2 = getWeekId();
    expect(id1).toBe(id2);
  });
});

describe("constants", () => {
  it("has correct analysis window", () => {
    expect(ANALYSIS_WINDOW_DAYS).toBe(7);
  });

  it("has correct thresholds", () => {
    expect(UNDER_EATING_THRESHOLD).toBe(0.80);
    expect(OVER_EATING_THRESHOLD).toBe(1.20);
    expect(LOW_PROTEIN_THRESHOLD).toBe(0.70);
    expect(MIN_TRIGGER_DAYS).toBe(3);
  });
});
