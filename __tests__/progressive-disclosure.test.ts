/**
 * Unit tests for Progressive Disclosure in Plans Tab.
 * Tests the logic for identifying today's workout, splitting days,
 * and the compact summary row data derivation.
 */
import { describe, it, expect } from "vitest";

// ── Replicate the pure logic from plans.tsx ──

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function getTodayDayName(): string {
  return DAY_NAMES[new Date().getDay()];
}

function findTodayWorkout(schedule: any[], todayName: string): any | null {
  return schedule.find((d: any) =>
    d.day?.toLowerCase().includes(todayName.toLowerCase())
  ) ?? null;
}

function getOtherWorkoutDays(schedule: any[], todayName: string): any[] {
  return schedule.filter((d: any) =>
    !d.day?.toLowerCase().includes(todayName.toLowerCase())
  );
}

function getCompactSummary(day: any, completedDays: Record<string, boolean>) {
  const isDayCompleted = !!completedDays[day.day];
  return {
    dayName: day.day,
    focus: isDayCompleted ? "Completed" : day.focus ?? (day.isRest ? "Rest" : "Workout"),
    exerciseCount: day.exercises?.length ?? 0,
    isRest: !!day.isRest,
    isCompleted: isDayCompleted,
  };
}

// ── Test Data ──

const MOCK_SCHEDULE = [
  { day: "Monday", focus: "Chest & Triceps", exercises: [{ name: "Bench Press" }, { name: "Dips" }, { name: "Flyes" }], isRest: false },
  { day: "Tuesday", focus: "Back & Biceps", exercises: [{ name: "Pull-ups" }, { name: "Rows" }], isRest: false },
  { day: "Wednesday", focus: "Rest Day", exercises: [], isRest: true },
  { day: "Thursday", focus: "Legs", exercises: [{ name: "Squats" }, { name: "Lunges" }, { name: "Leg Press" }, { name: "Calf Raises" }], isRest: false },
  { day: "Friday", focus: "Shoulders & Arms", exercises: [{ name: "OHP" }, { name: "Lateral Raises" }], isRest: false },
  { day: "Saturday", focus: "Rest Day", exercises: [], isRest: true },
  { day: "Sunday", focus: "Full Body", exercises: [{ name: "Deadlift" }, { name: "Bench" }, { name: "Squat" }], isRest: false },
];

// ── Tests ──

describe("getTodayDayName", () => {
  it("returns a valid day name", () => {
    const name = getTodayDayName();
    expect(DAY_NAMES).toContain(name);
  });

  it("matches the current day of the week", () => {
    const expected = DAY_NAMES[new Date().getDay()];
    expect(getTodayDayName()).toBe(expected);
  });
});

describe("findTodayWorkout", () => {
  it("finds the correct day by name", () => {
    const result = findTodayWorkout(MOCK_SCHEDULE, "Monday");
    expect(result).not.toBeNull();
    expect(result.day).toBe("Monday");
    expect(result.focus).toBe("Chest & Triceps");
  });

  it("is case-insensitive", () => {
    const result = findTodayWorkout(MOCK_SCHEDULE, "monday");
    expect(result).not.toBeNull();
    expect(result.day).toBe("Monday");
  });

  it("returns null if day not found", () => {
    const result = findTodayWorkout(MOCK_SCHEDULE, "Funday");
    expect(result).toBeNull();
  });

  it("finds rest days too", () => {
    const result = findTodayWorkout(MOCK_SCHEDULE, "Wednesday");
    expect(result).not.toBeNull();
    expect(result.isRest).toBe(true);
  });
});

describe("getOtherWorkoutDays", () => {
  it("excludes today from the list", () => {
    const others = getOtherWorkoutDays(MOCK_SCHEDULE, "Monday");
    expect(others).toHaveLength(6);
    expect(others.find((d: any) => d.day === "Monday")).toBeUndefined();
  });

  it("returns all days if today is not in schedule", () => {
    const others = getOtherWorkoutDays(MOCK_SCHEDULE, "Funday");
    expect(others).toHaveLength(7);
  });

  it("preserves order of remaining days", () => {
    const others = getOtherWorkoutDays(MOCK_SCHEDULE, "Monday");
    expect(others[0].day).toBe("Tuesday");
    expect(others[1].day).toBe("Wednesday");
  });
});

describe("getCompactSummary", () => {
  it("returns correct summary for a workout day", () => {
    const summary = getCompactSummary(MOCK_SCHEDULE[0], {});
    expect(summary.dayName).toBe("Monday");
    expect(summary.focus).toBe("Chest & Triceps");
    expect(summary.exerciseCount).toBe(3);
    expect(summary.isRest).toBe(false);
    expect(summary.isCompleted).toBe(false);
  });

  it("returns correct summary for a rest day", () => {
    const summary = getCompactSummary(MOCK_SCHEDULE[2], {});
    expect(summary.dayName).toBe("Wednesday");
    expect(summary.focus).toBe("Rest Day");
    expect(summary.exerciseCount).toBe(0);
    expect(summary.isRest).toBe(true);
    expect(summary.isCompleted).toBe(false);
  });

  it("marks completed days correctly", () => {
    const summary = getCompactSummary(MOCK_SCHEDULE[0], { Monday: true });
    expect(summary.isCompleted).toBe(true);
    expect(summary.focus).toBe("Completed");
  });

  it("handles day with no exercises array", () => {
    const dayNoEx = { day: "Saturday", focus: "Recovery", isRest: false };
    const summary = getCompactSummary(dayNoEx, {});
    expect(summary.exerciseCount).toBe(0);
  });

  it("handles day with no focus", () => {
    const dayNoFocus = { day: "Sunday", exercises: [{ name: "Run" }], isRest: false };
    const summary = getCompactSummary(dayNoFocus, {});
    expect(summary.focus).toBe("Workout");
  });
});

describe("Progressive Disclosure behavior", () => {
  it("today's workout is separated from the rest", () => {
    const todayName = "Thursday";
    const today = findTodayWorkout(MOCK_SCHEDULE, todayName);
    const others = getOtherWorkoutDays(MOCK_SCHEDULE, todayName);

    expect(today).not.toBeNull();
    expect(today.focus).toBe("Legs");
    expect(others).toHaveLength(6);
    expect(others.every((d: any) => d.day !== "Thursday")).toBe(true);
  });

  it("compact summaries have all required fields", () => {
    const others = getOtherWorkoutDays(MOCK_SCHEDULE, "Monday");
    const completedDays = { Tuesday: true, Thursday: true };

    const summaries = others.map(d => getCompactSummary(d, completedDays));

    // All summaries have required fields
    summaries.forEach(s => {
      expect(s).toHaveProperty("dayName");
      expect(s).toHaveProperty("focus");
      expect(s).toHaveProperty("exerciseCount");
      expect(s).toHaveProperty("isRest");
      expect(s).toHaveProperty("isCompleted");
    });

    // Check specific completions
    const tuesdaySummary = summaries.find(s => s.dayName === "Tuesday");
    expect(tuesdaySummary?.isCompleted).toBe(true);
    expect(tuesdaySummary?.focus).toBe("Completed");

    const wednesdaySummary = summaries.find(s => s.dayName === "Wednesday");
    expect(wednesdaySummary?.isCompleted).toBe(false);
    expect(wednesdaySummary?.isRest).toBe(true);
  });

  it("collapsed view shows correct exercise counts", () => {
    const others = getOtherWorkoutDays(MOCK_SCHEDULE, "Sunday");
    const summaries = others.map(d => getCompactSummary(d, {}));

    const mondaySummary = summaries.find(s => s.dayName === "Monday");
    expect(mondaySummary?.exerciseCount).toBe(3);

    const thursdaySummary = summaries.find(s => s.dayName === "Thursday");
    expect(thursdaySummary?.exerciseCount).toBe(4);

    const wednesdaySummary = summaries.find(s => s.dayName === "Wednesday");
    expect(wednesdaySummary?.exerciseCount).toBe(0);
  });
});
