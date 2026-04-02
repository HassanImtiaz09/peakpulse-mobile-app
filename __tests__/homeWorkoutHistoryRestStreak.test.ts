import { describe, it, expect } from "vitest";

// ── Smart day matching tests ──
describe("Smart day matching for Today's Workout", () => {
  const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  function findTodayWorkout(schedule: { day: string }[]) {
    const todayName = DAYS[new Date().getDay()];
    return schedule.find(d => d.day.toLowerCase() === todayName.toLowerCase()) ?? schedule[0] ?? null;
  }

  it("returns the matching day from schedule", () => {
    const todayName = DAYS[new Date().getDay()];
    const schedule = DAYS.map(d => ({ day: d, focus: `${d} Focus` }));
    const result = findTodayWorkout(schedule);
    expect(result?.day).toBe(todayName);
  });

  it("falls back to schedule[0] when no match", () => {
    const schedule = [{ day: "Xday", focus: "Fallback" }];
    const result = findTodayWorkout(schedule);
    expect(result?.day).toBe("Xday");
  });

  it("returns null for empty schedule", () => {
    const result = findTodayWorkout([]);
    expect(result).toBeNull();
  });
});

// ── Rest day detection tests ──
describe("Rest day detection", () => {
  function isRestDay(focus: string, exercises: unknown[]): boolean {
    const f = focus.toLowerCase();
    const restKeywords = ["rest", "recovery", "off", "active recovery"];
    return restKeywords.some(k => f.includes(k)) || exercises.length === 0;
  }

  it("detects 'Rest Day' focus as rest day", () => {
    expect(isRestDay("Rest Day", [])).toBe(true);
  });

  it("detects 'Active Recovery' focus as rest day", () => {
    expect(isRestDay("Active Recovery", [{ name: "stretch" }])).toBe(true);
  });

  it("detects 'Off' focus as rest day", () => {
    expect(isRestDay("Off", [])).toBe(true);
  });

  it("does not flag 'Push Day' as rest day", () => {
    expect(isRestDay("Push Day", [{ name: "bench press" }])).toBe(false);
  });

  it("flags empty exercises as rest day", () => {
    expect(isRestDay("Legs", [])).toBe(true);
  });
});

// ── Streak celebration trigger tests ──
describe("Streak celebration trigger", () => {
  function shouldCelebrate(currentStreak: number): boolean {
    return currentStreak > 0 && currentStreak % 7 === 0;
  }

  it("triggers at 7-day streak", () => {
    expect(shouldCelebrate(7)).toBe(true);
  });

  it("triggers at 14-day streak", () => {
    expect(shouldCelebrate(14)).toBe(true);
  });

  it("triggers at 21-day streak", () => {
    expect(shouldCelebrate(21)).toBe(true);
  });

  it("does not trigger at 1-day streak", () => {
    expect(shouldCelebrate(1)).toBe(false);
  });

  it("does not trigger at 5-day streak", () => {
    expect(shouldCelebrate(5)).toBe(false);
  });

  it("does not trigger at 0-day streak", () => {
    expect(shouldCelebrate(0)).toBe(false);
  });

  it("does not trigger at 10-day streak", () => {
    expect(shouldCelebrate(10)).toBe(false);
  });
});

// ── Recent sessions sorting tests ──
describe("Recent sessions sorting", () => {
  it("sorts sessions by startDate descending and takes top 3", () => {
    const logs = [
      { workout: { startDate: "2026-03-28T10:00:00Z", dayName: "A" } },
      { workout: { startDate: "2026-04-01T10:00:00Z", dayName: "B" } },
      { workout: { startDate: "2026-03-30T10:00:00Z", dayName: "C" } },
      { workout: { startDate: "2026-03-25T10:00:00Z", dayName: "D" } },
      { workout: { startDate: "2026-04-02T10:00:00Z", dayName: "E" } },
    ];

    const sorted = logs
      .filter(l => l.workout?.startDate)
      .sort((a, b) => new Date(b.workout.startDate).getTime() - new Date(a.workout.startDate).getTime())
      .slice(0, 3);

    expect(sorted.map(s => s.workout.dayName)).toEqual(["E", "B", "C"]);
  });

  it("returns empty for no logs", () => {
    const sorted = ([] as any[])
      .filter(l => l.workout?.startDate)
      .sort((a: any, b: any) => new Date(b.workout.startDate).getTime() - new Date(a.workout.startDate).getTime())
      .slice(0, 3);

    expect(sorted).toEqual([]);
  });
});

// ── Stretching routines data tests ──
describe("Stretching routines data", () => {
  const STRETCHING_ROUTINES = [
    { name: "Full Body Stretch", duration: "15 min", icon: "self-improvement", description: "Gentle stretches for all major muscle groups" },
    { name: "Foam Rolling", duration: "10 min", icon: "sports-gymnastics", description: "Myofascial release for tight muscles" },
    { name: "Yoga Flow", duration: "20 min", icon: "spa", description: "Sun salutations and restorative poses" },
  ];

  it("has 3 stretching routines", () => {
    expect(STRETCHING_ROUTINES).toHaveLength(3);
  });

  it("each routine has name, duration, icon, and description", () => {
    for (const r of STRETCHING_ROUTINES) {
      expect(r.name).toBeTruthy();
      expect(r.duration).toBeTruthy();
      expect(r.icon).toBeTruthy();
      expect(r.description).toBeTruthy();
    }
  });
});
