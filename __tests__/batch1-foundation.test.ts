/**
 * Batch 1 Foundation Layer Tests
 *
 * Tests for:
 *   - lib/daily-state.ts — Daily state aggregator pure functions
 *   - lib/notification-manager.ts — Notification manager pure functions
 */
import { describe, it, expect, vi } from "vitest";

// Mock react-native (Flow syntax in index.js breaks rollup parser)
vi.mock("react-native", () => ({
  Platform: { OS: "ios" },
}));

// Mock AsyncStorage
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async () => null),
    setItem: vi.fn(async () => {}),
    removeItem: vi.fn(async () => {}),
  },
}));

// Mock expo-notifications
vi.mock("expo-notifications", () => ({
  scheduleNotificationAsync: vi.fn(async () => "mock-id"),
  cancelScheduledNotificationAsync: vi.fn(async () => {}),
  cancelAllScheduledNotificationsAsync: vi.fn(async () => {}),
  SchedulableTriggerInputTypes: { DAILY: "daily", TIME_INTERVAL: "timeInterval" },
}));

// ── Daily State Tests ────────────────────────────────────────────────────────

import {
  getTimeOfDay,
  getTodayDate,
  getDayName,
  isWeekend,
  computeCalorieProgress,
  computeAdherence,
  countPlannedMeals,
  determineWorkoutStatus,
  extractTodayWorkout,
  countTodaySessions,
  buildDailyState,
  createEmptyDailyState,
} from "@/lib/daily-state";

describe("Daily State — getTimeOfDay", () => {
  it("returns 'morning' for hours 5–11", () => {
    expect(getTimeOfDay(5)).toBe("morning");
    expect(getTimeOfDay(8)).toBe("morning");
    expect(getTimeOfDay(11)).toBe("morning");
  });

  it("returns 'midday' for hours 12–16", () => {
    expect(getTimeOfDay(12)).toBe("midday");
    expect(getTimeOfDay(14)).toBe("midday");
    expect(getTimeOfDay(16)).toBe("midday");
  });

  it("returns 'evening' for hours 17–20", () => {
    expect(getTimeOfDay(17)).toBe("evening");
    expect(getTimeOfDay(19)).toBe("evening");
    expect(getTimeOfDay(20)).toBe("evening");
  });

  it("returns 'night' for hours 21–4", () => {
    expect(getTimeOfDay(21)).toBe("night");
    expect(getTimeOfDay(0)).toBe("night");
    expect(getTimeOfDay(3)).toBe("night");
    expect(getTimeOfDay(4)).toBe("night");
  });
});

describe("Daily State — getTodayDate", () => {
  it("returns YYYY-MM-DD format", () => {
    const date = new Date(2026, 4, 2, 10, 30); // May 2, 2026
    expect(getTodayDate(date)).toBe("2026-05-02");
  });

  it("pads single-digit months and days", () => {
    const date = new Date(2026, 0, 5); // Jan 5, 2026
    expect(getTodayDate(date)).toBe("2026-01-05");
  });
});

describe("Daily State — getDayName", () => {
  it("returns correct day names", () => {
    // May 2, 2026 is a Saturday
    const sat = new Date(2026, 4, 2);
    expect(getDayName(sat)).toBe("Saturday");

    // May 4, 2026 is a Monday
    const mon = new Date(2026, 4, 4);
    expect(getDayName(mon)).toBe("Monday");
  });
});

describe("Daily State — isWeekend", () => {
  it("returns true for Saturday and Sunday", () => {
    const sat = new Date(2026, 4, 2); // Saturday
    const sun = new Date(2026, 4, 3); // Sunday
    expect(isWeekend(sat)).toBe(true);
    expect(isWeekend(sun)).toBe(true);
  });

  it("returns false for weekdays", () => {
    const mon = new Date(2026, 4, 4); // Monday
    const fri = new Date(2026, 4, 8); // Friday
    expect(isWeekend(mon)).toBe(false);
    expect(isWeekend(fri)).toBe(false);
  });
});

describe("Daily State — computeCalorieProgress", () => {
  it("returns 0 when goal is 0", () => {
    expect(computeCalorieProgress(500, 0)).toBe(0);
  });

  it("returns correct ratio", () => {
    expect(computeCalorieProgress(1000, 2000)).toBe(0.5);
    expect(computeCalorieProgress(2000, 2000)).toBe(1);
  });

  it("caps at 1.5 for overconsumption", () => {
    expect(computeCalorieProgress(4000, 2000)).toBe(1.5);
  });
});

describe("Daily State — computeAdherence", () => {
  it("returns 0 when target is 0", () => {
    expect(computeAdherence(50, 0)).toBe(0);
  });

  it("returns correct ratio", () => {
    expect(computeAdherence(75, 150)).toBe(0.5);
  });

  it("caps at 1.5", () => {
    expect(computeAdherence(300, 150)).toBe(1.5);
  });
});

describe("Daily State — countPlannedMeals", () => {
  it("returns 3 when no meal plan exists", () => {
    expect(countPlannedMeals(null, "Monday")).toBe(3);
  });

  it("counts meals from a plan with days array", () => {
    const plan = {
      days: [
        { day: "Monday", meals: [{ name: "Breakfast" }, { name: "Lunch" }, { name: "Dinner" }, { name: "Snack" }] },
        { day: "Tuesday", meals: [{ name: "Breakfast" }, { name: "Lunch" }] },
      ],
    };
    expect(countPlannedMeals(plan, "Monday")).toBe(4);
    expect(countPlannedMeals(plan, "Tuesday")).toBe(2);
  });

  it("matches partial day names (e.g., 'Mon')", () => {
    const plan = {
      days: [{ day: "Mon", meals: [{ name: "B" }, { name: "L" }] }],
    };
    expect(countPlannedMeals(plan, "Monday")).toBe(2);
  });

  it("returns 3 when day not found in plan", () => {
    const plan = {
      days: [{ day: "Monday", meals: [{ name: "B" }] }],
    };
    expect(countPlannedMeals(plan, "Saturday")).toBe(3);
  });
});

describe("Daily State — determineWorkoutStatus", () => {
  it("returns 'completed' when sessions > 0", () => {
    expect(determineWorkoutStatus({ focus: "Chest" }, 1, 10)).toBe("completed");
  });

  it("returns 'rest_day' when no workout planned", () => {
    expect(determineWorkoutStatus(null, 0, 10)).toBe("rest_day");
  });

  it("returns 'rest_day' for rest/recovery focus", () => {
    expect(determineWorkoutStatus({ focus: "Rest Day" }, 0, 10)).toBe("rest_day");
    expect(determineWorkoutStatus({ focus: "Active Recovery" }, 0, 10)).toBe("rest_day");
    expect(determineWorkoutStatus({ focus: "Off" }, 0, 10)).toBe("rest_day");
  });

  it("returns 'rest_day' when exercises array is empty", () => {
    expect(determineWorkoutStatus({ focus: "Legs", exercises: [] }, 0, 10)).toBe("rest_day");
  });

  it("returns 'scheduled' during the day", () => {
    expect(determineWorkoutStatus({ focus: "Chest", exercises: [{}] }, 0, 14)).toBe("scheduled");
  });

  it("returns 'skipped' late at night", () => {
    expect(determineWorkoutStatus({ focus: "Chest", exercises: [{}] }, 0, 22)).toBe("skipped");
    expect(determineWorkoutStatus({ focus: "Chest", exercises: [{}] }, 0, 23)).toBe("skipped");
  });
});

describe("Daily State — extractTodayWorkout", () => {
  const plan = {
    schedule: [
      { day: "Monday", focus: "Chest & Triceps" },
      { day: "Tuesday", focus: "Back & Biceps" },
      { day: "Wednesday", focus: "Rest Day" },
    ],
  };

  it("finds the matching day", () => {
    expect(extractTodayWorkout(plan, "Monday")?.focus).toBe("Chest & Triceps");
    expect(extractTodayWorkout(plan, "Tuesday")?.focus).toBe("Back & Biceps");
  });

  it("returns null when no plan exists", () => {
    expect(extractTodayWorkout(null, "Monday")).toBeNull();
  });

  it("returns null when day not found", () => {
    expect(extractTodayWorkout(plan, "Saturday")).toBeNull();
  });

  it("matches partial day names", () => {
    const shortPlan = {
      schedule: [{ day: "Mon", focus: "Chest" }],
    };
    expect(extractTodayWorkout(shortPlan, "Monday")?.focus).toBe("Chest");
  });
});

describe("Daily State — countTodaySessions", () => {
  it("counts sessions matching today's date", () => {
    const sessions = [
      { date: "2026-05-02", exercises: [] },
      { date: "2026-05-02", exercises: [] },
      { date: "2026-05-01", exercises: [] },
    ];
    expect(countTodaySessions(sessions, "2026-05-02")).toBe(2);
  });

  it("handles completedAt field", () => {
    const sessions = [
      { completedAt: "2026-05-02T10:30:00Z", exercises: [] },
    ];
    expect(countTodaySessions(sessions, "2026-05-02")).toBe(1);
  });

  it("returns 0 for no matching sessions", () => {
    expect(countTodaySessions([], "2026-05-02")).toBe(0);
  });
});

describe("Daily State — buildDailyState", () => {
  const baseInputs = {
    now: new Date(2026, 4, 2, 14, 30), // May 2, 2026 2:30 PM (Saturday)
    meals: [
      { calories: 400, protein: 30, carbs: 40, fat: 15, mealType: "breakfast" },
      { calories: 600, protein: 45, carbs: 60, fat: 20, mealType: "lunch" },
    ],
    calorieGoal: 2000,
    macroTargets: { protein: 150, carbs: 200, fat: 70 },
    workoutPlan: {
      schedule: [
        { day: "Saturday", focus: "Legs", exercises: [{ name: "Squat" }] },
      ],
    },
    sessions: [],
    xpData: { totalXP: 1500, level: 5, dailyStreak: 7 },
    streakData: { currentStreak: 3 },
    mealPlan: {
      days: [
        { day: "Saturday", meals: [{ name: "B" }, { name: "L" }, { name: "D" }] },
      ],
    },
  };

  it("builds a complete daily state", () => {
    const state = buildDailyState(baseInputs);

    expect(state.date).toBe("2026-05-02");
    expect(state.mealsLogged).toBe(2);
    expect(state.mealsPlanned).toBe(3);
    expect(state.caloriesConsumed).toBe(1000);
    expect(state.calorieGoal).toBe(2000);
    expect(state.caloriesRemaining).toBe(1000);
    expect(state.calorieProgress).toBe(0.5);
    expect(state.macros.protein).toBe(75);
    expect(state.macros.carbs).toBe(100);
    expect(state.macros.fat).toBe(35);
    expect(state.macros.proteinAdherence).toBe(0.5);
    expect(state.workoutStatus).toBe("scheduled");
    expect(state.todayWorkoutName).toBe("Legs");
    expect(state.dailyXPStreak).toBe(7);
    expect(state.weeklyGoalStreak).toBe(3);
    expect(state.totalXP).toBe(1500);
    expect(state.currentLevel).toBe(5);
    expect(state.timeOfDay).toBe("midday");
    expect(state.dayOfWeek).toBe("Saturday");
    expect(state.isWeekend).toBe(true);
  });

  it("handles completed workout", () => {
    const state = buildDailyState({
      ...baseInputs,
      sessions: [{ date: "2026-05-02", exercises: [] }],
    });
    expect(state.workoutStatus).toBe("completed");
    expect(state.workoutsCompletedToday).toBe(1);
  });

  it("handles no meals logged", () => {
    const state = buildDailyState({ ...baseInputs, meals: [] });
    expect(state.mealsLogged).toBe(0);
    expect(state.caloriesConsumed).toBe(0);
    expect(state.caloriesRemaining).toBe(2000);
    expect(state.calorieProgress).toBe(0);
  });

  it("handles null xpData and streakData", () => {
    const state = buildDailyState({
      ...baseInputs,
      xpData: null,
      streakData: null,
    });
    expect(state.dailyXPStreak).toBe(0);
    expect(state.weeklyGoalStreak).toBe(0);
    expect(state.totalXP).toBe(0);
    expect(state.currentLevel).toBe(1);
  });

  it("collects unique meal types", () => {
    const state = buildDailyState(baseInputs);
    expect(state.mealTypes).toContain("breakfast");
    expect(state.mealTypes).toContain("lunch");
    expect(state.mealTypes.length).toBe(2);
  });
});

describe("Daily State — createEmptyDailyState", () => {
  it("creates a valid empty state", () => {
    const now = new Date(2026, 4, 2, 8, 0);
    const state = createEmptyDailyState(now);

    expect(state.date).toBe("2026-05-02");
    expect(state.mealsLogged).toBe(0);
    expect(state.caloriesConsumed).toBe(0);
    expect(state.calorieGoal).toBe(2000);
    expect(state.caloriesRemaining).toBe(2000);
    expect(state.workoutStatus).toBe("rest_day");
    expect(state.dailyXPStreak).toBe(0);
    expect(state.timeOfDay).toBe("morning");
  });
});

// ── Notification Manager Tests ───────────────────────────────────────────────

import {
  isInQuietHours,
  getNextAvailableHour,
  deferIfQuietHours,
  isThrottled,
  incrementDailyCount,
  getTodayDateStr,
  MAX_PER_CATEGORY_PER_DAY,
  DEFAULT_QUIET_HOURS,
} from "@/lib/notification-manager";
import type { QuietHours, DailyCounts } from "@/lib/notification-manager";

describe("Notification Manager — isInQuietHours", () => {
  const defaultQH: QuietHours = { enabled: true, startHour: 22, endHour: 7 };

  it("returns false when quiet hours are disabled", () => {
    expect(isInQuietHours(23, { enabled: false, startHour: 22, endHour: 7 })).toBe(false);
  });

  it("detects hours within wrap-around quiet hours (22–7)", () => {
    expect(isInQuietHours(22, defaultQH)).toBe(true);
    expect(isInQuietHours(23, defaultQH)).toBe(true);
    expect(isInQuietHours(0, defaultQH)).toBe(true);
    expect(isInQuietHours(3, defaultQH)).toBe(true);
    expect(isInQuietHours(6, defaultQH)).toBe(true);
  });

  it("detects hours outside wrap-around quiet hours", () => {
    expect(isInQuietHours(7, defaultQH)).toBe(false);
    expect(isInQuietHours(12, defaultQH)).toBe(false);
    expect(isInQuietHours(21, defaultQH)).toBe(false);
  });

  it("handles non-wrapping quiet hours (e.g., 1–6)", () => {
    const qh: QuietHours = { enabled: true, startHour: 1, endHour: 6 };
    expect(isInQuietHours(0, qh)).toBe(false);
    expect(isInQuietHours(1, qh)).toBe(true);
    expect(isInQuietHours(3, qh)).toBe(true);
    expect(isInQuietHours(5, qh)).toBe(true);
    expect(isInQuietHours(6, qh)).toBe(false);
    expect(isInQuietHours(12, qh)).toBe(false);
  });
});

describe("Notification Manager — getNextAvailableHour", () => {
  it("returns the end hour of quiet hours", () => {
    expect(getNextAvailableHour(DEFAULT_QUIET_HOURS)).toBe(7);
    expect(getNextAvailableHour({ enabled: true, startHour: 23, endHour: 8 })).toBe(8);
  });
});

describe("Notification Manager — deferIfQuietHours", () => {
  const qh: QuietHours = { enabled: true, startHour: 22, endHour: 7 };

  it("does not defer when outside quiet hours", () => {
    const result = deferIfQuietHours(12, 30, qh);
    expect(result).toEqual({ hour: 12, minute: 30, deferred: false });
  });

  it("defers to end of quiet hours when inside", () => {
    const result = deferIfQuietHours(23, 0, qh);
    expect(result).toEqual({ hour: 7, minute: 0, deferred: true });
  });

  it("defers early morning hours", () => {
    const result = deferIfQuietHours(3, 15, qh);
    expect(result).toEqual({ hour: 7, minute: 0, deferred: true });
  });

  it("does not defer when quiet hours are disabled", () => {
    const disabledQH: QuietHours = { enabled: false, startHour: 22, endHour: 7 };
    const result = deferIfQuietHours(23, 0, disabledQH);
    expect(result).toEqual({ hour: 23, minute: 0, deferred: false });
  });
});

describe("Notification Manager — isThrottled", () => {
  it("returns false for a new day", () => {
    const counts: DailyCounts = { date: "2026-05-01", counts: { workout_reminder: 5 } };
    expect(isThrottled("workout_reminder", counts, "2026-05-02")).toBe(false);
  });

  it("returns false when under the limit", () => {
    const counts: DailyCounts = { date: "2026-05-02", counts: { workout_reminder: 3 } };
    expect(isThrottled("workout_reminder", counts, "2026-05-02")).toBe(false);
  });

  it("returns true when at the limit", () => {
    const counts: DailyCounts = { date: "2026-05-02", counts: { workout_reminder: MAX_PER_CATEGORY_PER_DAY } };
    expect(isThrottled("workout_reminder", counts, "2026-05-02")).toBe(true);
  });

  it("returns true when over the limit", () => {
    const counts: DailyCounts = { date: "2026-05-02", counts: { workout_reminder: 10 } };
    expect(isThrottled("workout_reminder", counts, "2026-05-02")).toBe(true);
  });

  it("returns false for a category with no count", () => {
    const counts: DailyCounts = { date: "2026-05-02", counts: { workout_reminder: 5 } };
    expect(isThrottled("meal_reminder", counts, "2026-05-02")).toBe(false);
  });
});

describe("Notification Manager — incrementDailyCount", () => {
  it("creates a new entry for a new day", () => {
    const counts: DailyCounts = { date: "2026-05-01", counts: { workout_reminder: 3 } };
    const result = incrementDailyCount("meal_reminder", counts, "2026-05-02");
    expect(result.date).toBe("2026-05-02");
    expect(result.counts.meal_reminder).toBe(1);
    // Old counts should be gone (new day)
    expect(result.counts.workout_reminder).toBeUndefined();
  });

  it("increments existing count for same day", () => {
    const counts: DailyCounts = { date: "2026-05-02", counts: { meal_reminder: 2 } };
    const result = incrementDailyCount("meal_reminder", counts, "2026-05-02");
    expect(result.date).toBe("2026-05-02");
    expect(result.counts.meal_reminder).toBe(3);
  });

  it("starts at 1 for a new category on the same day", () => {
    const counts: DailyCounts = { date: "2026-05-02", counts: { workout_reminder: 2 } };
    const result = incrementDailyCount("meal_reminder", counts, "2026-05-02");
    expect(result.counts.meal_reminder).toBe(1);
    expect(result.counts.workout_reminder).toBe(2); // preserved
  });

  it("does not mutate the original object", () => {
    const counts: DailyCounts = { date: "2026-05-02", counts: { meal_reminder: 2 } };
    const result = incrementDailyCount("meal_reminder", counts, "2026-05-02");
    expect(counts.counts.meal_reminder).toBe(2); // unchanged
    expect(result.counts.meal_reminder).toBe(3);
  });
});

describe("Notification Manager — getTodayDateStr", () => {
  it("returns YYYY-MM-DD format", () => {
    const date = new Date(2026, 4, 2);
    expect(getTodayDateStr(date)).toBe("2026-05-02");
  });

  it("pads single digits", () => {
    const date = new Date(2026, 0, 5);
    expect(getTodayDateStr(date)).toBe("2026-01-05");
  });
});

describe("Notification Manager — Constants", () => {
  it("MAX_PER_CATEGORY_PER_DAY is 5", () => {
    expect(MAX_PER_CATEGORY_PER_DAY).toBe(5);
  });

  it("DEFAULT_QUIET_HOURS is 10 PM to 7 AM", () => {
    expect(DEFAULT_QUIET_HOURS.enabled).toBe(true);
    expect(DEFAULT_QUIET_HOURS.startHour).toBe(22);
    expect(DEFAULT_QUIET_HOURS.endHour).toBe(7);
  });
});
