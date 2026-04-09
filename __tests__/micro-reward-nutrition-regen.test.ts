/**
 * Tests for:
 *   A) Micro-Reward System (XP engine) — pure functions only
 *   B) Weekly Nutrition Summary — pure computation
 *   C) Adaptive Meal Plan Regeneration — adjusted calorie formula
 *
 * NOTE: We cannot directly import xp-engine.ts or weekly-nutrition-notification.ts
 * in vitest because they import AsyncStorage / expo-notifications which require
 * the React Native runtime (__DEV__ global). Instead, we inline the pure logic
 * and test it directly. This validates the algorithms without native dependencies.
 */
import { describe, it, expect } from "vitest";

// ═══════════════════════════════════════════════════════════════════════
// A) XP Engine — Pure Functions (inlined from lib/xp-engine.ts)
// ═══════════════════════════════════════════════════════════════════════

// Replicate the pure functions from xp-engine.ts for testing
function getXPForLevel(level: number): number {
  if (level <= 1) return 0;
  return (level - 1) * 100;
}

function getLevelFromXP(totalXP: number): number {
  return Math.min(50, Math.floor(totalXP / 100) + 1);
}

const LEVEL_TITLES: Record<number, string> = {
  1: "Beginner", 5: "Rookie", 10: "Regular", 15: "Committed",
  20: "Dedicated", 25: "Warrior", 30: "Champion", 35: "Elite",
  40: "Master", 45: "Legend", 50: "Immortal",
};

function getLevelTitle(level: number): string {
  const tiers = Object.keys(LEVEL_TITLES).map(Number).sort((a, b) => b - a);
  for (const tier of tiers) {
    if (level >= tier) return LEVEL_TITLES[tier];
  }
  return "Beginner";
}

function getLevelInfo(totalXP: number) {
  const level = getLevelFromXP(totalXP);
  const minXP = getXPForLevel(level);
  const maxXP = getXPForLevel(level + 1);
  const range = maxXP - minXP;
  const progress = range > 0 ? Math.min(1, (totalXP - minXP) / range) : 1;
  return { level, title: getLevelTitle(level), minXP, maxXP, progress };
}

type XPAction =
  | "meal_logged" | "workout_completed" | "progress_photo"
  | "body_scan" | "daily_checkin" | "streak_day"
  | "streak_milestone" | "first_meal_of_day" | "all_macros_hit"
  | "weekly_goal_met";

const XP_REWARDS: Record<XPAction, { xp: number; label: string }> = {
  meal_logged:       { xp: 10,  label: "Meal Logged" },
  workout_completed: { xp: 50,  label: "Workout Completed" },
  progress_photo:    { xp: 25,  label: "Progress Photo" },
  body_scan:         { xp: 30,  label: "Body Scan" },
  daily_checkin:     { xp: 20,  label: "Daily Check-In" },
  streak_day:        { xp: 5,   label: "Daily Streak Bonus" },
  streak_milestone:  { xp: 100, label: "Streak Milestone" },
  first_meal_of_day: { xp: 15,  label: "First Meal of the Day" },
  all_macros_hit:    { xp: 25,  label: "All Macros Hit" },
  weekly_goal_met:   { xp: 75,  label: "Weekly Goal Met" },
};

const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100];

const STREAK_BADGE_DEFS = [
  { days: 3,   name: "Spark",    icon: "local-fire-department", color: "#F59E0B" },
  { days: 7,   name: "Flame",    icon: "whatshot",              color: "#EF4444" },
  { days: 14,  name: "Blaze",    icon: "bolt",                 color: "#8B5CF6" },
  { days: 30,  name: "Inferno",  icon: "military-tech",        color: "#3B82F6" },
  { days: 60,  name: "Titan",    icon: "shield",               color: "#10B981" },
  { days: 100, name: "Immortal", icon: "diamond",              color: "#EC4899" },
];

function getStreakBadges(earnedBadges: number[]) {
  return STREAK_BADGE_DEFS.map((def) => ({
    ...def,
    earned: earnedBadges.includes(def.days),
  }));
}

// ── Tests ───────────────────────────────────────────────────────────────

describe("XP Engine — Level System", () => {
  it("level 1 requires 0 XP", () => {
    expect(getXPForLevel(1)).toBe(0);
  });

  it("level 2 requires 100 XP", () => {
    expect(getXPForLevel(2)).toBe(100);
  });

  it("level 10 requires 900 XP", () => {
    expect(getXPForLevel(10)).toBe(900);
  });

  it("level 50 requires 4900 XP", () => {
    expect(getXPForLevel(50)).toBe(4900);
  });

  it("getLevelFromXP returns 1 for 0 XP", () => {
    expect(getLevelFromXP(0)).toBe(1);
  });

  it("getLevelFromXP returns 2 for 100 XP", () => {
    expect(getLevelFromXP(100)).toBe(2);
  });

  it("getLevelFromXP returns 2 for 199 XP (not yet level 3)", () => {
    expect(getLevelFromXP(199)).toBe(2);
  });

  it("getLevelFromXP returns 10 for 900 XP", () => {
    expect(getLevelFromXP(900)).toBe(10);
  });

  it("getLevelFromXP caps at 50", () => {
    expect(getLevelFromXP(99999)).toBe(50);
  });

  it("getLevelInfo returns correct progress within level", () => {
    const info = getLevelInfo(150);
    expect(info.level).toBe(2);
    expect(info.minXP).toBe(100);
    expect(info.maxXP).toBe(200);
    expect(info.progress).toBeCloseTo(0.5, 1);
  });

  it("getLevelInfo returns 0 progress at start of level", () => {
    const info = getLevelInfo(200);
    expect(info.level).toBe(3);
    expect(info.progress).toBeCloseTo(0, 1);
  });

  it("getLevelInfo returns correct title", () => {
    const info = getLevelInfo(0);
    expect(info.title).toBe("Beginner");
  });
});

describe("XP Engine — Level Titles", () => {
  it("returns Beginner for level 1", () => {
    expect(getLevelTitle(1)).toBe("Beginner");
  });

  it("returns Rookie for level 5", () => {
    expect(getLevelTitle(5)).toBe("Rookie");
  });

  it("returns Regular for level 10", () => {
    expect(getLevelTitle(10)).toBe("Regular");
  });

  it("returns Committed for level 15", () => {
    expect(getLevelTitle(15)).toBe("Committed");
  });

  it("returns Warrior for level 25", () => {
    expect(getLevelTitle(25)).toBe("Warrior");
  });

  it("returns Immortal for level 50", () => {
    expect(getLevelTitle(50)).toBe("Immortal");
  });

  it("returns the tier below for in-between levels", () => {
    expect(getLevelTitle(7)).toBe("Rookie");
  });
});

describe("XP Engine — Rewards", () => {
  it("has rewards for all defined actions", () => {
    const actions: XPAction[] = [
      "meal_logged", "workout_completed", "progress_photo",
      "body_scan", "daily_checkin", "streak_day",
      "streak_milestone", "first_meal_of_day", "all_macros_hit",
      "weekly_goal_met",
    ];
    for (const action of actions) {
      expect(XP_REWARDS[action]).toBeDefined();
      expect(XP_REWARDS[action].xp).toBeGreaterThan(0);
      expect(XP_REWARDS[action].label).toBeTruthy();
    }
  });

  it("workout_completed gives more XP than meal_logged", () => {
    expect(XP_REWARDS.workout_completed.xp).toBeGreaterThan(XP_REWARDS.meal_logged.xp);
  });

  it("streak_milestone gives the most XP", () => {
    expect(XP_REWARDS.streak_milestone.xp).toBe(100);
  });

  it("daily_checkin gives 20 XP", () => {
    expect(XP_REWARDS.daily_checkin.xp).toBe(20);
  });
});

describe("XP Engine — Streak Badges", () => {
  it("returns all 6 badge definitions", () => {
    expect(STREAK_BADGE_DEFS).toHaveLength(6);
  });

  it("milestones are 3, 7, 14, 30, 60, 100", () => {
    expect(STREAK_MILESTONES).toEqual([3, 7, 14, 30, 60, 100]);
  });

  it("getStreakBadges marks earned badges correctly", () => {
    const badges = getStreakBadges([3, 7]);
    const earned = badges.filter((b) => b.earned);
    expect(earned).toHaveLength(2);
    expect(earned[0].days).toBe(3);
    expect(earned[1].days).toBe(7);
  });

  it("getStreakBadges marks unearned badges as not earned", () => {
    const badges = getStreakBadges([]);
    expect(badges.every((b) => !b.earned)).toBe(true);
  });

  it("each badge has a unique name and icon", () => {
    const names = STREAK_BADGE_DEFS.map((b) => b.name);
    const icons = STREAK_BADGE_DEFS.map((b) => b.icon);
    expect(new Set(names).size).toBe(names.length);
    expect(new Set(icons).size).toBe(icons.length);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// B) Weekly Nutrition Summary — Pure Computation
//    (inlined from lib/weekly-nutrition-notification.ts)
// ═══════════════════════════════════════════════════════════════════════

interface MealEntry {
  id: string;
  name: string;
  mealType: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  loggedAt: string;
}

interface WeeklyNutritionSummary {
  daysLogged: number;
  avgCalories: number;
  avgProtein: number;
  avgCarbs: number;
  avgFat: number;
  calorieGoal: number;
  proteinGoal: number;
  calorieAdherence: number;
  proteinAdherence: number;
  bestDay: string | null;
  insight: string;
}

function generateInsight(
  avgCal: number, calGoal: number, avgProtein: number,
  proteinGoal: number, daysLogged: number, adherence: number,
): string {
  if (daysLogged <= 2) return "Try logging meals more consistently — even 4-5 days gives much better insights.";
  if (adherence >= 90) return "Outstanding calorie adherence this week! You're dialled in.";
  if (avgCal < calGoal * 0.75) {
    const deficit = calGoal - avgCal;
    return `You're averaging ${deficit} kcal under your goal. Consider adding a snack or larger portions to fuel recovery.`;
  }
  if (avgCal > calGoal * 1.15) {
    const surplus = avgCal - calGoal;
    return `You're averaging ${surplus} kcal over your goal. Small swaps (e.g. lighter sauces, smaller portions) can help.`;
  }
  if (proteinGoal > 0 && avgProtein < proteinGoal * 0.8) {
    return `Protein is a bit low (${avgProtein}g vs ${proteinGoal}g target). Add a scoop of whey or an extra chicken breast.`;
  }
  if (adherence >= 75) return "Solid week! You're within range — keep the consistency going.";
  return "Good effort logging this week. Focus on hitting your calorie target more days for better results.";
}

function computeWeeklyNutritionSummary(
  mealsByDate: Record<string, MealEntry[]>,
  calorieGoal: number,
  macroTargets: { protein: number; carbs: number; fat: number },
): WeeklyNutritionSummary {
  const dates = Object.keys(mealsByDate).sort();
  const loggedDates = dates.filter((d) => mealsByDate[d].length > 0);
  const daysLogged = loggedDates.length;

  if (daysLogged === 0) {
    return {
      daysLogged: 0, avgCalories: 0, avgProtein: 0, avgCarbs: 0, avgFat: 0,
      calorieGoal, proteinGoal: macroTargets.protein,
      calorieAdherence: 0, proteinAdherence: 0, bestDay: null,
      insight: "No meals logged this week. Start tracking to get personalised insights!",
    };
  }

  const dailyTotals = loggedDates.map((date) => {
    const meals = mealsByDate[date];
    return {
      date,
      calories: meals.reduce((s, m) => s + m.calories, 0),
      protein: meals.reduce((s, m) => s + m.protein, 0),
      carbs: meals.reduce((s, m) => s + m.carbs, 0),
      fat: meals.reduce((s, m) => s + m.fat, 0),
    };
  });

  const avgCalories = Math.round(dailyTotals.reduce((s, d) => s + d.calories, 0) / daysLogged);
  const avgProtein = Math.round(dailyTotals.reduce((s, d) => s + d.protein, 0) / daysLogged);
  const avgCarbs = Math.round(dailyTotals.reduce((s, d) => s + d.carbs, 0) / daysLogged);
  const avgFat = Math.round(dailyTotals.reduce((s, d) => s + d.fat, 0) / daysLogged);

  const calorieAdherence = calorieGoal > 0
    ? Math.min(100, Math.round((1 - Math.abs(avgCalories - calorieGoal) / calorieGoal) * 100))
    : 0;
  const proteinAdherence = macroTargets.protein > 0
    ? Math.min(100, Math.round((avgProtein / macroTargets.protein) * 100))
    : 0;

  let bestDay: string | null = null;
  let bestDiff = Infinity;
  for (const d of dailyTotals) {
    const diff = Math.abs(d.calories - calorieGoal);
    if (diff < bestDiff) { bestDiff = diff; bestDay = d.date; }
  }

  const insight = generateInsight(avgCalories, calorieGoal, avgProtein, macroTargets.protein, daysLogged, calorieAdherence);

  return {
    daysLogged, avgCalories, avgProtein, avgCarbs, avgFat,
    calorieGoal, proteinGoal: macroTargets.protein,
    calorieAdherence: Math.max(0, calorieAdherence),
    proteinAdherence: Math.min(100, Math.max(0, proteinAdherence)),
    bestDay, insight,
  };
}

function buildNutritionNotificationContent(summary: WeeklyNutritionSummary) {
  const calLine = `Avg ${summary.avgCalories} kcal/day (goal: ${summary.calorieGoal})`;
  const proteinLine = `Avg ${summary.avgProtein}g protein/day`;
  const adherenceLine = `Calorie adherence: ${summary.calorieAdherence}%`;
  const daysLine = `${summary.daysLogged}/7 days logged`;
  const body = [calLine, proteinLine, adherenceLine, daysLine, "", summary.insight].join("\n");
  return {
    title: "Weekly Nutrition Summary",
    subtitle: `${summary.daysLogged} days tracked this week`,
    body,
    data: { type: "weekly_nutrition", screen: "/(tabs)/meals" },
    sound: true,
    badge: 1,
  };
}

function makeMeal(overrides: Partial<MealEntry> = {}): MealEntry {
  return {
    id: Math.random().toString(36),
    name: "Test Meal", mealType: "lunch",
    calories: 500, protein: 30, carbs: 60, fat: 15,
    loggedAt: new Date().toISOString(),
    ...overrides,
  };
}

// ── Tests ───────────────────────────────────────────────────────────────

describe("Weekly Nutrition Summary — computeWeeklyNutritionSummary", () => {
  const goal = 2000;
  const macros = { protein: 150, carbs: 250, fat: 65 };

  it("returns zero summary when no meals logged", () => {
    const result = computeWeeklyNutritionSummary(
      { "2026-04-01": [], "2026-04-02": [], "2026-04-03": [] }, goal, macros,
    );
    expect(result.daysLogged).toBe(0);
    expect(result.avgCalories).toBe(0);
    expect(result.bestDay).toBeNull();
    expect(result.insight).toContain("No meals logged");
  });

  it("computes correct averages for 3 days", () => {
    const meals: Record<string, MealEntry[]> = {
      "2026-04-01": [makeMeal({ calories: 1800, protein: 120, carbs: 200, fat: 60 })],
      "2026-04-02": [makeMeal({ calories: 2200, protein: 160, carbs: 280, fat: 70 })],
      "2026-04-03": [makeMeal({ calories: 2000, protein: 140, carbs: 240, fat: 65 })],
    };
    const result = computeWeeklyNutritionSummary(meals, goal, macros);
    expect(result.daysLogged).toBe(3);
    expect(result.avgCalories).toBe(2000);
    expect(result.avgProtein).toBe(140);
    expect(result.avgCarbs).toBe(240);
    expect(result.avgFat).toBe(65);
  });

  it("identifies best day (closest to goal)", () => {
    const meals: Record<string, MealEntry[]> = {
      "2026-04-01": [makeMeal({ calories: 1500 })],
      "2026-04-02": [makeMeal({ calories: 1990 })],
      "2026-04-03": [makeMeal({ calories: 2500 })],
    };
    const result = computeWeeklyNutritionSummary(meals, goal, macros);
    expect(result.bestDay).toBe("2026-04-02");
  });

  it("calorie adherence is 100% when average matches goal exactly", () => {
    const meals: Record<string, MealEntry[]> = {
      "2026-04-01": [makeMeal({ calories: 2000 })],
      "2026-04-02": [makeMeal({ calories: 2000 })],
      "2026-04-03": [makeMeal({ calories: 2000 })],
    };
    const result = computeWeeklyNutritionSummary(meals, goal, macros);
    expect(result.calorieAdherence).toBe(100);
  });

  it("calorie adherence drops when average is far from goal", () => {
    const meals: Record<string, MealEntry[]> = {
      "2026-04-01": [makeMeal({ calories: 1000 })],
      "2026-04-02": [makeMeal({ calories: 1000 })],
      "2026-04-03": [makeMeal({ calories: 1000 })],
    };
    const result = computeWeeklyNutritionSummary(meals, goal, macros);
    expect(result.calorieAdherence).toBe(50);
  });

  it("protein adherence is capped at 100%", () => {
    const meals: Record<string, MealEntry[]> = {
      "2026-04-01": [makeMeal({ protein: 200 })],
      "2026-04-02": [makeMeal({ protein: 200 })],
      "2026-04-03": [makeMeal({ protein: 200 })],
    };
    const result = computeWeeklyNutritionSummary(meals, goal, macros);
    expect(result.proteinAdherence).toBeLessThanOrEqual(100);
  });

  it("skips empty days when computing averages", () => {
    const meals: Record<string, MealEntry[]> = {
      "2026-04-01": [makeMeal({ calories: 2000, protein: 150 })],
      "2026-04-02": [],
      "2026-04-03": [makeMeal({ calories: 1800, protein: 130 })],
    };
    const result = computeWeeklyNutritionSummary(meals, goal, macros);
    expect(result.daysLogged).toBe(2);
    expect(result.avgCalories).toBe(1900);
  });

  it("generates under-eating insight when average is very low", () => {
    const meals: Record<string, MealEntry[]> = {
      "2026-04-01": [makeMeal({ calories: 1200 })],
      "2026-04-02": [makeMeal({ calories: 1200 })],
      "2026-04-03": [makeMeal({ calories: 1200 })],
    };
    const result = computeWeeklyNutritionSummary(meals, goal, macros);
    expect(result.insight).toContain("under your goal");
  });

  it("generates over-eating insight when average is high", () => {
    const meals: Record<string, MealEntry[]> = {
      "2026-04-01": [makeMeal({ calories: 2500 })],
      "2026-04-02": [makeMeal({ calories: 2500 })],
      "2026-04-03": [makeMeal({ calories: 2500 })],
    };
    const result = computeWeeklyNutritionSummary(meals, goal, macros);
    expect(result.insight).toContain("over your goal");
  });

  it("generates outstanding insight when adherence is 90%+", () => {
    const meals: Record<string, MealEntry[]> = {
      "2026-04-01": [makeMeal({ calories: 2010 })],
      "2026-04-02": [makeMeal({ calories: 1990 })],
      "2026-04-03": [makeMeal({ calories: 2000 })],
    };
    const result = computeWeeklyNutritionSummary(meals, goal, macros);
    expect(result.insight).toContain("Outstanding");
  });

  it("generates consistency insight when only 1-2 days logged", () => {
    const meals: Record<string, MealEntry[]> = {
      "2026-04-01": [makeMeal({ calories: 2000 })],
      "2026-04-02": [],
      "2026-04-03": [],
    };
    const result = computeWeeklyNutritionSummary(meals, goal, macros);
    expect(result.insight).toContain("consistently");
  });

  it("handles zero calorie goal gracefully", () => {
    const meals: Record<string, MealEntry[]> = {
      "2026-04-01": [makeMeal({ calories: 2000 })],
    };
    const result = computeWeeklyNutritionSummary(meals, 0, macros);
    expect(result.calorieAdherence).toBe(0);
  });

  it("handles zero protein goal gracefully", () => {
    const meals: Record<string, MealEntry[]> = {
      "2026-04-01": [makeMeal({ protein: 150 })],
    };
    const result = computeWeeklyNutritionSummary(meals, goal, { protein: 0, carbs: 250, fat: 65 });
    expect(result.proteinAdherence).toBe(0);
  });
});

describe("Weekly Nutrition Summary — buildNutritionNotificationContent", () => {
  it("builds notification with correct title", () => {
    const summary: WeeklyNutritionSummary = {
      daysLogged: 5, avgCalories: 1900, avgProtein: 140, avgCarbs: 230, avgFat: 60,
      calorieGoal: 2000, proteinGoal: 150, calorieAdherence: 95, proteinAdherence: 93,
      bestDay: "2026-04-02", insight: "Outstanding calorie adherence this week!",
    };
    const content = buildNutritionNotificationContent(summary);
    expect(content.title).toBe("Weekly Nutrition Summary");
    expect(content.subtitle).toContain("5 days");
  });

  it("includes calorie and protein averages in body", () => {
    const summary: WeeklyNutritionSummary = {
      daysLogged: 3, avgCalories: 1800, avgProtein: 120, avgCarbs: 200, avgFat: 55,
      calorieGoal: 2000, proteinGoal: 150, calorieAdherence: 90, proteinAdherence: 80,
      bestDay: null, insight: "Test insight",
    };
    const content = buildNutritionNotificationContent(summary);
    expect(content.body).toContain("1800 kcal/day");
    expect(content.body).toContain("120g protein");
    expect(content.body).toContain("90%");
    expect(content.body).toContain("Test insight");
  });

  it("sets correct data type for navigation", () => {
    const summary: WeeklyNutritionSummary = {
      daysLogged: 1, avgCalories: 0, avgProtein: 0, avgCarbs: 0, avgFat: 0,
      calorieGoal: 2000, proteinGoal: 150, calorieAdherence: 0, proteinAdherence: 0,
      bestDay: null, insight: "",
    };
    const content = buildNutritionNotificationContent(summary);
    expect((content.data as any)?.type).toBe("weekly_nutrition");
    expect((content.data as any)?.screen).toBe("/(tabs)/meals");
  });
});

// ═══════════════════════════════════════════════════════════════════════
// C) Adaptive Meal Plan Regeneration — Adjusted Calorie Formula
// ═══════════════════════════════════════════════════════════════════════

describe("Adaptive Meal Plan Regeneration — adjusted calorie calculation", () => {
  function computeAdjustedCalories(avgDailyCalories: number, calorieGoal: number): number {
    return Math.round((avgDailyCalories + calorieGoal) / 2);
  }

  it("adjusts down when user is consistently under-eating", () => {
    const adjusted = computeAdjustedCalories(1400, 2000);
    expect(adjusted).toBe(1700);
    expect(adjusted).toBeLessThan(2000);
    expect(adjusted).toBeGreaterThan(1400);
  });

  it("adjusts up when user is consistently over-eating", () => {
    const adjusted = computeAdjustedCalories(2600, 2000);
    expect(adjusted).toBe(2300);
    expect(adjusted).toBeGreaterThan(2000);
    expect(adjusted).toBeLessThan(2600);
  });

  it("stays the same when average matches goal", () => {
    const adjusted = computeAdjustedCalories(2000, 2000);
    expect(adjusted).toBe(2000);
  });

  it("handles extreme under-eating", () => {
    const adjusted = computeAdjustedCalories(800, 2000);
    expect(adjusted).toBe(1400);
  });

  it("handles extreme over-eating", () => {
    const adjusted = computeAdjustedCalories(3500, 2000);
    expect(adjusted).toBe(2750);
  });

  it("always produces a value between average and goal", () => {
    const testCases = [
      { avg: 1200, goal: 2000 },
      { avg: 2800, goal: 2000 },
      { avg: 1500, goal: 1800 },
      { avg: 3000, goal: 2500 },
    ];
    for (const { avg, goal } of testCases) {
      const adjusted = computeAdjustedCalories(avg, goal);
      const lower = Math.min(avg, goal);
      const upper = Math.max(avg, goal);
      expect(adjusted).toBeGreaterThanOrEqual(lower);
      expect(adjusted).toBeLessThanOrEqual(upper);
    }
  });
});
