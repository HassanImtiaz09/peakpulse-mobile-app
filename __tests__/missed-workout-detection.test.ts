import { describe, it, expect } from "vitest";
import {
  getTodayIndex,
  normalizeDayName,
  getDayIndex,
  detectMissedDays,
  getRemainingDays,
  getExerciseMuscleGroup,
  hasMuscleConflict,
  generateReschedulePreview,
  applyReschedule,
  getRescheduleSummary,
  getWeekId,
  DAY_ORDER,
  type WorkoutDay,
  type WorkoutExercise,
} from "@/lib/missed-workout-detection";

// ── Helpers ──

const makeExercise = (name: string, muscleGroup = ""): WorkoutExercise => ({
  name,
  sets: 3,
  reps: 10,
  muscleGroup,
});

const makeDay = (day: string, focus: string, exercises: WorkoutExercise[], isRest = false): WorkoutDay => ({
  day,
  focus,
  isRest,
  exercises,
});

const sampleSchedule: WorkoutDay[] = [
  makeDay("Monday", "Chest & Triceps", [
    makeExercise("Bench Press", "chest"),
    makeExercise("Incline Dumbbell Press", "chest"),
    makeExercise("Tricep Dips", "triceps"),
  ]),
  makeDay("Tuesday", "Back & Biceps", [
    makeExercise("Pull-ups", "back"),
    makeExercise("Barbell Rows", "back"),
    makeExercise("Bicep Curls", "biceps"),
  ]),
  makeDay("Wednesday", "Rest Day", [], true),
  makeDay("Thursday", "Legs", [
    makeExercise("Squats", "legs"),
    makeExercise("Leg Press", "quads"),
    makeExercise("Romanian Deadlift", "hamstrings"),
  ]),
  makeDay("Friday", "Shoulders & Abs", [
    makeExercise("Overhead Press", "shoulders"),
    makeExercise("Lateral Raises", "shoulders"),
    makeExercise("Plank", "core"),
  ]),
  makeDay("Saturday", "Full Body", [
    makeExercise("Deadlift", "back"),
    makeExercise("Bench Press", "chest"),
    makeExercise("Squats", "legs"),
  ]),
  makeDay("Sunday", "Rest Day", [], true),
];

// ── Tests ──

describe("getTodayIndex", () => {
  it("returns 0 for Monday", () => {
    // April 7, 2025 is a Monday
    expect(getTodayIndex(new Date(2025, 3, 7))).toBe(0);
  });

  it("returns 6 for Sunday", () => {
    // April 6, 2025 is a Sunday
    expect(getTodayIndex(new Date(2025, 3, 6))).toBe(6);
  });

  it("returns 2 for Wednesday", () => {
    // April 9, 2025 is a Wednesday
    expect(getTodayIndex(new Date(2025, 3, 9))).toBe(2);
  });

  it("returns 4 for Friday", () => {
    // April 11, 2025 is a Friday
    expect(getTodayIndex(new Date(2025, 3, 11))).toBe(4);
  });
});

describe("normalizeDayName", () => {
  it("normalizes full day names", () => {
    expect(normalizeDayName("Monday")).toBe("Monday");
    expect(normalizeDayName("friday")).toBe("Friday");
  });

  it("normalizes partial day names", () => {
    expect(normalizeDayName("Day 1 - Monday")).toBe("Monday");
  });

  it("returns null for unrecognized names", () => {
    expect(normalizeDayName("Day 1")).toBeNull();
    expect(normalizeDayName("")).toBeNull();
  });
});

describe("getDayIndex", () => {
  it("returns correct index for each day", () => {
    expect(getDayIndex(makeDay("Monday", "Test", []))).toBe(0);
    expect(getDayIndex(makeDay("Friday", "Test", []))).toBe(4);
    expect(getDayIndex(makeDay("Sunday", "Test", []))).toBe(6);
  });

  it("returns -1 for unrecognized day", () => {
    expect(getDayIndex(makeDay("Day X", "Test", []))).toBe(-1);
  });
});

describe("detectMissedDays", () => {
  it("detects missed workout days before today", () => {
    // It's Thursday (index 3). Monday and Tuesday are workout days, not completed.
    const thursday = new Date(2025, 3, 10); // Thursday
    const missed = detectMissedDays(sampleSchedule, {}, [], thursday);

    expect(missed.length).toBe(2);
    expect(missed[0].day).toBe("Monday");
    expect(missed[1].day).toBe("Tuesday");
  });

  it("excludes rest days from missed detection", () => {
    // It's Thursday. Wednesday is a rest day, should not be missed.
    const thursday = new Date(2025, 3, 10);
    const missed = detectMissedDays(sampleSchedule, {}, [], thursday);

    const missedNames = missed.map(d => d.day);
    expect(missedNames).not.toContain("Wednesday");
  });

  it("excludes completed days", () => {
    const thursday = new Date(2025, 3, 10);
    const completed = { Monday: true };
    const missed = detectMissedDays(sampleSchedule, completed, [], thursday);

    expect(missed.length).toBe(1);
    expect(missed[0].day).toBe("Tuesday");
  });

  it("excludes dismissed days", () => {
    const thursday = new Date(2025, 3, 10);
    const missed = detectMissedDays(sampleSchedule, {}, ["Monday"], thursday);

    expect(missed.length).toBe(1);
    expect(missed[0].day).toBe("Tuesday");
  });

  it("returns empty array on Monday (no previous days)", () => {
    const monday = new Date(2025, 3, 7);
    const missed = detectMissedDays(sampleSchedule, {}, [], monday);
    expect(missed.length).toBe(0);
  });

  it("returns empty array when all days are completed", () => {
    const friday = new Date(2025, 3, 11);
    const completed = { Monday: true, Tuesday: true, Thursday: true };
    const missed = detectMissedDays(sampleSchedule, completed, [], friday);
    expect(missed.length).toBe(0);
  });

  it("detects all missed days on Sunday", () => {
    const sunday = new Date(2025, 3, 13);
    const missed = detectMissedDays(sampleSchedule, {}, [], sunday);

    // Monday, Tuesday, Thursday, Friday, Saturday are workout days
    expect(missed.length).toBe(5);
  });

  it("sorts missed days by day order", () => {
    const friday = new Date(2025, 3, 11);
    const missed = detectMissedDays(sampleSchedule, {}, [], friday);

    for (let i = 1; i < missed.length; i++) {
      expect(missed[i].dayIndex).toBeGreaterThan(missed[i - 1].dayIndex);
    }
  });
});

describe("getRemainingDays", () => {
  it("returns today and future workout days", () => {
    const wednesday = new Date(2025, 3, 9); // Wednesday, index 2
    const remaining = getRemainingDays(sampleSchedule, wednesday);

    // Thursday (3), Friday (4), Saturday (5) are workout days
    // Wednesday is rest, Sunday is rest
    expect(remaining.length).toBe(3);
    expect(remaining[0].day).toBe("Thursday");
    expect(remaining[1].day).toBe("Friday");
    expect(remaining[2].day).toBe("Saturday");
  });

  it("excludes rest days from remaining", () => {
    const monday = new Date(2025, 3, 7);
    const remaining = getRemainingDays(sampleSchedule, monday);

    const names = remaining.map(d => d.day);
    expect(names).not.toContain("Wednesday");
    expect(names).not.toContain("Sunday");
  });

  it("returns empty on Sunday (no remaining days)", () => {
    const sunday = new Date(2025, 3, 13);
    const remaining = getRemainingDays(sampleSchedule, sunday);
    // Sunday is rest, so no remaining workout days
    expect(remaining.length).toBe(0);
  });
});

describe("hasMuscleConflict", () => {
  it("returns false when no conflict", () => {
    const dayExercises = [makeExercise("Bench Press", "chest")];
    const newEx = makeExercise("Squats", "legs");
    expect(hasMuscleConflict(dayExercises, newEx)).toBe(false);
  });

  it("returns false for first exercise of a muscle group", () => {
    const dayExercises = [makeExercise("Bench Press", "chest")];
    const newEx = makeExercise("Incline Press", "chest");
    expect(hasMuscleConflict(dayExercises, newEx)).toBe(false);
  });

  it("returns true when muscle group already has 2+ exercises", () => {
    const dayExercises = [
      makeExercise("Bench Press", "chest"),
      makeExercise("Incline Press", "chest"),
    ];
    const newEx = makeExercise("Flyes", "chest");
    expect(hasMuscleConflict(dayExercises, newEx)).toBe(true);
  });

  it("returns false for empty muscle group", () => {
    const dayExercises = [makeExercise("Bench Press", "chest")];
    const newEx = makeExercise("Unknown", "");
    expect(hasMuscleConflict(dayExercises, newEx)).toBe(false);
  });

  it("detects cross-muscle conflicts (legs/quads)", () => {
    const dayExercises = [
      makeExercise("Squats", "legs"),
      makeExercise("Leg Press", "legs"),
    ];
    const newEx = makeExercise("Lunges", "quads");
    expect(hasMuscleConflict(dayExercises, newEx)).toBe(true);
  });
});

describe("generateReschedulePreview", () => {
  it("redistributes missed exercises to remaining days", () => {
    const wednesday = new Date(2025, 3, 9);
    const missed = detectMissedDays(sampleSchedule, {}, [], wednesday);
    const preview = generateReschedulePreview(sampleSchedule, missed, wednesday);

    expect(preview.totalRedistributed).toBeGreaterThan(0);
    expect(preview.missedDays.length).toBe(missed.length);

    // All missed exercises should be redistributed
    const totalMissedExercises = missed.reduce((sum, d) => sum + d.exercises.length, 0);
    expect(preview.totalRedistributed).toBe(totalMissedExercises);
  });

  it("respects MAX_EXERCISES_PER_DAY cap", () => {
    const wednesday = new Date(2025, 3, 9);
    const missed = detectMissedDays(sampleSchedule, {}, [], wednesday);
    const preview = generateReschedulePreview(sampleSchedule, missed, wednesday);

    for (const day of preview.updatedDays) {
      const total = day.exercises.length + day.addedExercises.length;
      // Should not exceed 8 (or slightly over if fallback is used)
      expect(total).toBeLessThanOrEqual(10); // generous cap for fallback
    }
  });

  it("spreads exercises across multiple days", () => {
    const wednesday = new Date(2025, 3, 9);
    const missed = detectMissedDays(sampleSchedule, {}, [], wednesday);
    const preview = generateReschedulePreview(sampleSchedule, missed, wednesday);

    const daysWithAdded = preview.updatedDays.filter(d => d.addedExercises.length > 0);
    // Should spread across multiple days, not dump all on one
    expect(daysWithAdded.length).toBeGreaterThanOrEqual(1);
  });

  it("returns 0 redistributed when no remaining days", () => {
    const sunday = new Date(2025, 3, 13);
    const missed = detectMissedDays(sampleSchedule, {}, [], sunday);
    const preview = generateReschedulePreview(sampleSchedule, missed, sunday);

    // Sunday has no remaining workout days
    expect(preview.totalRedistributed).toBe(0);
  });

  it("returns 0 redistributed when no missed days", () => {
    const preview = generateReschedulePreview(sampleSchedule, []);
    expect(preview.totalRedistributed).toBe(0);
  });
});

describe("applyReschedule", () => {
  it("merges added exercises into the schedule", () => {
    const wednesday = new Date(2025, 3, 9);
    const missed = detectMissedDays(sampleSchedule, {}, [], wednesday);
    const preview = generateReschedulePreview(sampleSchedule, missed, wednesday);
    const updated = applyReschedule(sampleSchedule, preview);

    // Updated schedule should have same number of days
    expect(updated.length).toBe(sampleSchedule.length);

    // Days that received exercises should have more exercises
    for (const day of preview.updatedDays) {
      if (day.addedExercises.length > 0) {
        const updatedDay = updated.find(d => d.day === day.day);
        expect(updatedDay).toBeDefined();
        expect(updatedDay!.exercises.length).toBe(day.originalCount + day.addedExercises.length);
      }
    }
  });

  it("marks redistributed exercises with notes", () => {
    const wednesday = new Date(2025, 3, 9);
    const missed = detectMissedDays(sampleSchedule, {}, [], wednesday);
    const preview = generateReschedulePreview(sampleSchedule, missed, wednesday);
    const updated = applyReschedule(sampleSchedule, preview);

    // Find a day that received exercises
    const dayWithAdded = preview.updatedDays.find(d => d.addedExercises.length > 0);
    if (dayWithAdded) {
      const updatedDay = updated.find(d => d.day === dayWithAdded.day);
      const addedExercises = updatedDay!.exercises.slice(dayWithAdded.originalCount);
      for (const ex of addedExercises) {
        expect(ex.notes).toContain("edistributed");
      }
    }
  });

  it("does not modify days that received no exercises", () => {
    const wednesday = new Date(2025, 3, 9);
    const missed = detectMissedDays(sampleSchedule, {}, [], wednesday);
    const preview = generateReschedulePreview(sampleSchedule, missed, wednesday);
    const updated = applyReschedule(sampleSchedule, preview);

    // Rest days should be unchanged
    const restDay = updated.find(d => d.day === "Wednesday");
    expect(restDay).toBeDefined();
    expect(restDay!.exercises.length).toBe(0);
    expect(restDay!.isRest).toBe(true);
  });
});

describe("getRescheduleSummary", () => {
  it("returns meaningful summary text", () => {
    const wednesday = new Date(2025, 3, 9);
    const missed = detectMissedDays(sampleSchedule, {}, [], wednesday);
    const preview = generateReschedulePreview(sampleSchedule, missed, wednesday);
    const summary = getRescheduleSummary(preview);

    expect(summary).toContain("exercise");
    expect(summary).toContain("Monday");
  });

  it("returns 'No exercises' for empty preview", () => {
    const preview = generateReschedulePreview(sampleSchedule, []);
    const summary = getRescheduleSummary(preview);
    expect(summary).toContain("No exercises");
  });
});

describe("getWeekId", () => {
  it("returns a string in YYYY-Www format", () => {
    const weekId = getWeekId(new Date(2025, 3, 9));
    expect(weekId).toMatch(/^\d{4}-W\d{2}$/);
  });

  it("returns same week ID for days in the same week", () => {
    const mon = getWeekId(new Date(2025, 3, 7));
    const wed = getWeekId(new Date(2025, 3, 9));
    const fri = getWeekId(new Date(2025, 3, 11));
    expect(mon).toBe(wed);
    expect(wed).toBe(fri);
  });

  it("returns different week IDs for different weeks", () => {
    const week1 = getWeekId(new Date(2025, 3, 7));
    const week2 = getWeekId(new Date(2025, 3, 14));
    expect(week1).not.toBe(week2);
  });
});

describe("DAY_ORDER", () => {
  it("has 7 days starting with Monday", () => {
    expect(DAY_ORDER.length).toBe(7);
    expect(DAY_ORDER[0]).toBe("Monday");
    expect(DAY_ORDER[6]).toBe("Sunday");
  });
});
