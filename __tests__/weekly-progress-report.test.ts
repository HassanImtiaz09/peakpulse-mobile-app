/**
 * Unit tests for lib/weekly-progress-report.ts
 *
 * Tests all pure aggregation functions without AsyncStorage dependencies.
 */
import { describe, it, expect } from "vitest";
import {
  getWeekStart,
  getWeekEnd,
  isInWeek,
  getPreviousWeekStart,
  percentChange,
  aggregateWorkoutStats,
  aggregateNutritionStats,
  aggregateBodyStats,
  aggregateStreakStats,
  generateHighlights,
  type WorkoutLogForReport,
  type MealForReport,
  type CheckInForReport,
  type BodyScanForReport,
  type XPHistoryForReport,
  type WeeklyProgressReport,
} from "../lib/weekly-progress-report";

// ── Date Helpers ─────────────────────────────────────────────────────────────

describe("getWeekStart", () => {
  it("returns Monday for a Wednesday", () => {
    // 2026-04-08 is a Wednesday
    const result = getWeekStart(new Date("2026-04-08"));
    expect(result).toBe("2026-04-06");
  });

  it("returns Monday for a Monday", () => {
    const result = getWeekStart(new Date("2026-04-06"));
    expect(result).toBe("2026-04-06");
  });

  it("returns Monday for a Sunday", () => {
    // 2026-04-12 is a Sunday
    const result = getWeekStart(new Date("2026-04-12"));
    expect(result).toBe("2026-04-06");
  });

  it("returns Monday for a Saturday", () => {
    const result = getWeekStart(new Date("2026-04-11"));
    expect(result).toBe("2026-04-06");
  });
});

describe("getWeekEnd", () => {
  it("returns Sunday for a Wednesday", () => {
    const result = getWeekEnd(new Date("2026-04-08"));
    expect(result).toBe("2026-04-12");
  });

  it("returns Sunday for a Sunday", () => {
    const result = getWeekEnd(new Date("2026-04-12"));
    expect(result).toBe("2026-04-12");
  });

  it("returns Sunday for a Monday", () => {
    const result = getWeekEnd(new Date("2026-04-06"));
    expect(result).toBe("2026-04-12");
  });
});

describe("isInWeek", () => {
  const weekStart = "2026-04-06"; // Monday

  it("returns true for Monday of the week", () => {
    expect(isInWeek("2026-04-06", weekStart)).toBe(true);
  });

  it("returns true for Sunday of the week", () => {
    expect(isInWeek("2026-04-12", weekStart)).toBe(true);
  });

  it("returns true for mid-week date", () => {
    expect(isInWeek("2026-04-09", weekStart)).toBe(true);
  });

  it("returns false for previous week", () => {
    expect(isInWeek("2026-04-05", weekStart)).toBe(false);
  });

  it("returns false for next week", () => {
    expect(isInWeek("2026-04-13", weekStart)).toBe(false);
  });
});

describe("getPreviousWeekStart", () => {
  it("returns the Monday 7 days before", () => {
    expect(getPreviousWeekStart("2026-04-06")).toBe("2026-03-30");
  });
});

describe("percentChange", () => {
  it("calculates positive change", () => {
    expect(percentChange(120, 100)).toBe(20);
  });

  it("calculates negative change", () => {
    expect(percentChange(80, 100)).toBe(-20);
  });

  it("returns null when previous is 0 and current is 0", () => {
    expect(percentChange(0, 0)).toBeNull();
  });

  it("returns 100 when previous is 0 and current is positive", () => {
    expect(percentChange(50, 0)).toBe(100);
  });

  it("handles equal values", () => {
    expect(percentChange(100, 100)).toBe(0);
  });
});

// ── Workout Stats ────────────────────────────────────────────────────────────

describe("aggregateWorkoutStats", () => {
  const weekStart = "2026-04-06";

  it("counts workouts in the current week", () => {
    const logs: WorkoutLogForReport[] = [
      { startDate: "2026-04-07", durationMinutes: 45, completedExercisesJson: "[]", focus: "Chest" },
      { startDate: "2026-04-09", durationMinutes: 50, completedExercisesJson: "[]", focus: "Back" },
      { startDate: "2026-03-31", durationMinutes: 40, completedExercisesJson: "[]", focus: "Legs" }, // prev week
    ];
    const { current } = aggregateWorkoutStats(logs, weekStart);
    expect(current.workoutsCompleted).toBe(2);
    expect(current.totalMinutes).toBe(95);
    expect(current.avgSessionMinutes).toBe(48);
    expect(current.muscleGroupsHit).toContain("Chest");
    expect(current.muscleGroupsHit).toContain("Back");
  });

  it("calculates volume from completed sets", () => {
    const logs: WorkoutLogForReport[] = [
      {
        startDate: "2026-04-07",
        durationMinutes: 30,
        completedExercisesJson: JSON.stringify([
          {
            name: "Bench Press",
            muscleGroup: "Chest",
            logs: [
              { weight: "80", reps: "10", completed: true },
              { weight: "80", reps: "8", completed: true },
              { weight: "80", reps: "6", completed: false }, // not completed
            ],
          },
        ]),
      },
    ];
    const { current } = aggregateWorkoutStats(logs, weekStart);
    // 80*10 + 80*8 = 800 + 640 = 1440
    expect(current.totalVolumeKg).toBe(1440);
  });

  it("calculates frequency change vs previous week", () => {
    const logs: WorkoutLogForReport[] = [
      { startDate: "2026-04-07", durationMinutes: 30, completedExercisesJson: "[]" },
      { startDate: "2026-04-08", durationMinutes: 30, completedExercisesJson: "[]" },
      { startDate: "2026-04-09", durationMinutes: 30, completedExercisesJson: "[]" },
      { startDate: "2026-03-31", durationMinutes: 30, completedExercisesJson: "[]" }, // prev week
    ];
    const { current } = aggregateWorkoutStats(logs, weekStart);
    expect(current.frequencyChange).toBe(2); // 3 this week - 1 last week
  });

  it("handles empty logs", () => {
    const { current } = aggregateWorkoutStats([], weekStart);
    expect(current.workoutsCompleted).toBe(0);
    expect(current.totalVolumeKg).toBe(0);
    expect(current.avgSessionMinutes).toBe(0);
    expect(current.muscleGroupsHit).toEqual([]);
  });

  it("handles malformed JSON gracefully", () => {
    const logs: WorkoutLogForReport[] = [
      { startDate: "2026-04-07", durationMinutes: 30, completedExercisesJson: "not json" },
    ];
    const { current } = aggregateWorkoutStats(logs, weekStart);
    expect(current.workoutsCompleted).toBe(1);
    expect(current.totalVolumeKg).toBe(0);
  });
});

// ── Nutrition Stats ──────────────────────────────────────────────────────────

describe("aggregateNutritionStats", () => {
  const weekStart = "2026-04-06";

  it("calculates average calories and macros", () => {
    const meals: Record<string, MealForReport[]> = {
      "2026-04-07": [
        { calories: 500, protein: 30, carbs: 60, fat: 15 },
        { calories: 700, protein: 40, carbs: 80, fat: 25 },
      ],
      "2026-04-08": [
        { calories: 600, protein: 35, carbs: 70, fat: 20 },
      ],
    };
    const { current } = aggregateNutritionStats(meals, weekStart, 2000);
    expect(current.daysLogged).toBe(2);
    // Day 1: 1200 cal, Day 2: 600 cal → avg 900
    expect(current.avgCalories).toBe(900);
    expect(current.totalCalories).toBe(1800);
    expect(current.avgProtein).toBe(53); // (30+40+35)/2 = 52.5 → 53
    expect(current.calorieGoal).toBe(2000);
    expect(current.adherencePercent).toBe(45); // 900/2000 = 45%
  });

  it("calculates calorie change vs previous week", () => {
    const meals: Record<string, MealForReport[]> = {
      "2026-04-07": [{ calories: 2000, protein: 100, carbs: 200, fat: 80 }],
      "2026-03-31": [{ calories: 1500, protein: 80, carbs: 150, fat: 60 }],
    };
    const { current, previousAvgCalories } = aggregateNutritionStats(meals, weekStart, null);
    expect(current.avgCalories).toBe(2000);
    expect(previousAvgCalories).toBe(1500);
    expect(current.calorieChange).toBe(33); // (2000-1500)/1500 = 33%
  });

  it("handles no meals", () => {
    const { current } = aggregateNutritionStats({}, weekStart, 2000);
    expect(current.daysLogged).toBe(0);
    expect(current.avgCalories).toBe(0);
    expect(current.adherencePercent).toBeNull();
  });

  it("handles null calorie goal", () => {
    const meals: Record<string, MealForReport[]> = {
      "2026-04-07": [{ calories: 1000, protein: 50, carbs: 100, fat: 40 }],
    };
    const { current } = aggregateNutritionStats(meals, weekStart, null);
    expect(current.adherencePercent).toBeNull();
  });
});

// ── Body Stats ───────────────────────────────────────────────────────────────

describe("aggregateBodyStats", () => {
  const weekStart = "2026-04-06";

  it("finds latest weight in current and previous week", () => {
    const checkIns: CheckInForReport[] = [
      { date: "2026-04-07", weightKg: 82 },
      { date: "2026-04-09", weightKg: 81.5 },
      { date: "2026-03-31", weightKg: 83 },
    ];
    const result = aggregateBodyStats(checkIns, [], weekStart);
    expect(result.currentWeightKg).toBe(81.5); // latest in this week
    expect(result.previousWeightKg).toBe(83);
    expect(result.weightChangeKg).toBe(-1.5);
  });

  it("finds body fat changes", () => {
    const scans: BodyScanForReport[] = [
      { date: "2026-04-08", estimatedBodyFat: 18.5 },
      { date: "2026-03-31", estimatedBodyFat: 19.2 },
    ];
    const result = aggregateBodyStats([], scans, weekStart);
    expect(result.latestBodyFat).toBe(18.5);
    expect(result.previousBodyFat).toBe(19.2);
    expect(result.bodyFatChange).toBe(-0.7);
  });

  it("returns null when no data", () => {
    const result = aggregateBodyStats([], [], weekStart);
    expect(result.currentWeightKg).toBeNull();
    expect(result.previousWeightKg).toBeNull();
    expect(result.weightChangeKg).toBeNull();
    expect(result.latestBodyFat).toBeNull();
  });

  it("returns null weight change when only one week has data", () => {
    const checkIns: CheckInForReport[] = [
      { date: "2026-04-07", weightKg: 80 },
    ];
    const result = aggregateBodyStats(checkIns, [], weekStart);
    expect(result.currentWeightKg).toBe(80);
    expect(result.previousWeightKg).toBeNull();
    expect(result.weightChangeKg).toBeNull();
  });
});

// ── Streak & XP Stats ────────────────────────────────────────────────────────

describe("aggregateStreakStats", () => {
  const weekStart = "2026-04-06";

  it("aggregates streak and XP data", () => {
    const streakData = { currentStreak: 5, longestStreak: 12 };
    const xpData = { totalXP: 3500, level: 8, dailyStreak: 14 };
    const xpHistory: XPHistoryForReport[] = [
      { xp: 25, timestamp: "2026-04-07T10:00:00Z" },
      { xp: 50, timestamp: "2026-04-08T10:00:00Z" },
      { xp: 30, timestamp: "2026-03-31T10:00:00Z" }, // prev week
    ];
    const getLevelTitle = (level: number) => `Level ${level} Title`;

    const result = aggregateStreakStats(streakData, xpData, xpHistory, weekStart, getLevelTitle);
    expect(result.currentStreak).toBe(5);
    expect(result.longestStreak).toBe(12);
    expect(result.xpEarnedThisWeek).toBe(75); // 25 + 50
    expect(result.currentLevel).toBe(8);
    expect(result.dailyStreak).toBe(14);
    expect(result.levelTitle).toBe("Level 8 Title");
  });

  it("handles empty XP history", () => {
    const result = aggregateStreakStats(
      { currentStreak: 0, longestStreak: 0 },
      { totalXP: 0, level: 1, dailyStreak: 0 },
      [],
      weekStart,
      () => "Beginner",
    );
    expect(result.xpEarnedThisWeek).toBe(0);
    expect(result.levelTitle).toBe("Beginner");
  });
});

// ── Highlights Generator ─────────────────────────────────────────────────────

describe("generateHighlights", () => {
  const baseReport: Omit<WeeklyProgressReport, "highlights" | "generatedAt"> = {
    weekStart: "2026-04-06",
    weekEnd: "2026-04-12",
    workout: {
      workoutsCompleted: 4,
      totalVolumeKg: 5200,
      totalMinutes: 180,
      avgSessionMinutes: 45,
      muscleGroupsHit: ["Chest", "Back", "Legs"],
      volumeChange: 15,
      frequencyChange: 1,
    },
    nutrition: {
      daysLogged: 6,
      avgCalories: 2100,
      avgProtein: 150,
      avgCarbs: 250,
      avgFat: 70,
      totalCalories: 12600,
      calorieGoal: 2200,
      adherencePercent: 95,
      calorieChange: 5,
    },
    body: {
      currentWeightKg: 81,
      previousWeightKg: 82,
      weightChangeKg: -1,
      latestBodyFat: 18,
      previousBodyFat: 18.5,
      bodyFatChange: -0.5,
    },
    streak: {
      currentStreak: 5,
      longestStreak: 12,
      xpEarnedThisWeek: 250,
      currentLevel: 8,
      levelTitle: "Warrior",
      dailyStreak: 14,
    },
  };

  it("generates multiple highlights for an active week", () => {
    const highlights = generateHighlights(baseReport);
    expect(highlights.length).toBeGreaterThanOrEqual(4);
    expect(highlights.length).toBeLessThanOrEqual(6);
  });

  it("includes workout completion highlight", () => {
    const highlights = generateHighlights(baseReport);
    expect(highlights.some((h) => h.includes("4 workouts"))).toBe(true);
  });

  it("includes volume increase highlight", () => {
    const highlights = generateHighlights(baseReport);
    expect(highlights.some((h) => h.includes("Volume up 15%"))).toBe(true);
  });

  it("includes calorie adherence highlight", () => {
    const highlights = generateHighlights(baseReport);
    expect(highlights.some((h) => h.includes("calorie target"))).toBe(true);
  });

  it("includes weight change highlight when within cap", () => {
    // Weight highlight is 7th in order for baseReport, so use a slimmer report
    const slimReport: Omit<WeeklyProgressReport, "highlights" | "generatedAt"> = {
      ...baseReport,
      workout: { ...baseReport.workout, volumeChange: null, totalVolumeKg: 0 },
      nutrition: { ...baseReport.nutrition, daysLogged: 2, adherencePercent: null, avgProtein: 0 },
    };
    const highlights = generateHighlights(slimReport);
    expect(highlights.some((h) => h.includes("Weight down 1kg"))).toBe(true);
  });

  it("includes body fat decrease highlight when within cap", () => {
    const slimReport: Omit<WeeklyProgressReport, "highlights" | "generatedAt"> = {
      ...baseReport,
      workout: { ...baseReport.workout, volumeChange: null, totalVolumeKg: 0 },
      nutrition: { ...baseReport.nutrition, daysLogged: 2, adherencePercent: null, avgProtein: 0 },
    };
    const highlights = generateHighlights(slimReport);
    expect(highlights.some((h) => h.includes("Body fat decreased"))).toBe(true);
  });

  it("includes XP earned highlight when within cap", () => {
    const slimReport: Omit<WeeklyProgressReport, "highlights" | "generatedAt"> = {
      ...baseReport,
      workout: { ...baseReport.workout, volumeChange: null, totalVolumeKg: 0 },
      nutrition: { ...baseReport.nutrition, daysLogged: 2, adherencePercent: null, avgProtein: 0 },
      body: { ...baseReport.body, weightChangeKg: null, bodyFatChange: null },
    };
    const highlights = generateHighlights(slimReport);
    expect(highlights.some((h) => h.includes("250 XP"))).toBe(true);
  });

  it("includes streak highlight for 7+ days when within cap", () => {
    const slimReport: Omit<WeeklyProgressReport, "highlights" | "generatedAt"> = {
      ...baseReport,
      workout: { ...baseReport.workout, volumeChange: null, totalVolumeKg: 0 },
      nutrition: { ...baseReport.nutrition, daysLogged: 2, adherencePercent: null, avgProtein: 0 },
      body: { ...baseReport.body, weightChangeKg: null, bodyFatChange: null },
    };
    const highlights = generateHighlights(slimReport);
    expect(highlights.some((h) => h.includes("14-day activity streak"))).toBe(true);
  });

  it("returns fallback when no data", () => {
    const emptyReport: Omit<WeeklyProgressReport, "highlights" | "generatedAt"> = {
      weekStart: "2026-04-06",
      weekEnd: "2026-04-12",
      workout: { workoutsCompleted: 0, totalVolumeKg: 0, totalMinutes: 0, avgSessionMinutes: 0, muscleGroupsHit: [], volumeChange: null, frequencyChange: 0 },
      nutrition: { daysLogged: 0, avgCalories: 0, avgProtein: 0, avgCarbs: 0, avgFat: 0, totalCalories: 0, calorieGoal: null, adherencePercent: null, calorieChange: null },
      body: { currentWeightKg: null, previousWeightKg: null, weightChangeKg: null, latestBodyFat: null, previousBodyFat: null, bodyFatChange: null },
      streak: { currentStreak: 0, longestStreak: 0, xpEarnedThisWeek: 0, currentLevel: 1, levelTitle: "Beginner", dailyStreak: 0 },
    };
    const highlights = generateHighlights(emptyReport);
    expect(highlights.length).toBe(1);
    expect(highlights[0]).toContain("Start logging");
  });

  it("caps highlights at 6", () => {
    const highlights = generateHighlights(baseReport);
    expect(highlights.length).toBeLessThanOrEqual(6);
  });
});

// ── Total volume display ─────────────────────────────────────────────────────

describe("volume formatting", () => {
  it("displays tons for volume >= 1000kg", () => {
    const volume = 5200;
    const formatted = volume >= 1000 ? `${(volume / 1000).toFixed(1)}t` : `${volume}kg`;
    expect(formatted).toBe("5.2t");
  });

  it("displays kg for volume < 1000kg", () => {
    const volume = 800;
    const formatted = volume >= 1000 ? `${(volume / 1000).toFixed(1)}t` : `${volume}kg`;
    expect(formatted).toBe("800kg");
  });
});

// ── Meal logging days count ──────────────────────────────────────────────────

describe("nutrition days logged accuracy", () => {
  it("only counts days with at least one meal", () => {
    const meals: Record<string, MealForReport[]> = {
      "2026-04-07": [{ calories: 500, protein: 30, carbs: 60, fat: 15 }],
      "2026-04-08": [], // empty day
      "2026-04-09": [{ calories: 600, protein: 35, carbs: 70, fat: 20 }],
    };
    const { current } = aggregateNutritionStats(meals, "2026-04-06", null);
    expect(current.daysLogged).toBe(2);
  });
});
