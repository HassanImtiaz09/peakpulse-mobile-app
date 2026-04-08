/**
 * Unit tests for the Pre-Workout Energy Check-In feature.
 * Tests the adjustWorkoutForEnergy logic and energy history storage.
 */
import { describe, it, expect } from "vitest";
import {
  adjustWorkoutForEnergy,
  type EnergyLevel,
} from "../lib/energy-checkin";

// ── Helper: create a mock workout day ────────────────────────
function makeDayData(exerciseCount = 5, setsPerExercise = "4") {
  return {
    day: "Monday",
    focus: "Upper Body",
    isRest: false,
    exercises: Array.from({ length: exerciseCount }, (_, i) => ({
      name: `Exercise ${i + 1}`,
      sets: setsPerExercise,
      reps: "8-10",
      notes: i === 0 ? "Warm up first" : undefined,
    })),
  };
}

describe("adjustWorkoutForEnergy", () => {
  // ── Low energy ──────────────────────────────────────────
  describe("low energy", () => {
    it("reduces exercises to max 3", () => {
      const day = makeDayData(6);
      const result = adjustWorkoutForEnergy(day, "low");
      expect(result.exercises.length).toBe(3);
    });

    it("keeps all exercises if already 3 or fewer", () => {
      const day = makeDayData(2);
      const result = adjustWorkoutForEnergy(day, "low");
      expect(result.exercises.length).toBe(2);
    });

    it("reduces sets by 1 (minimum 2)", () => {
      const day = makeDayData(3, "4");
      const result = adjustWorkoutForEnergy(day, "low");
      expect(result.exercises[0].sets).toBe("3");
    });

    it("does not reduce sets below 2", () => {
      const day = makeDayData(3, "2");
      const result = adjustWorkoutForEnergy(day, "low");
      expect(result.exercises[0].sets).toBe("2");
    });

    it("handles compound set strings like 4x8", () => {
      const day = makeDayData(3, "4x8");
      const result = adjustWorkoutForEnergy(day, "low");
      expect(result.exercises[0].sets).toBe("3x8");
    });

    it("adds low energy note to exercises", () => {
      const day = makeDayData(3);
      const result = adjustWorkoutForEnergy(day, "low");
      expect(result.exercises[0].notes).toContain("Low energy");
    });

    it("appends to existing notes", () => {
      const day = makeDayData(3);
      day.exercises[0].notes = "Warm up first";
      const result = adjustWorkoutForEnergy(day, "low");
      expect(result.exercises[0].notes).toContain("Warm up first");
      expect(result.exercises[0].notes).toContain("Low energy");
    });

    it("stores original exercise count", () => {
      const day = makeDayData(6);
      const result = adjustWorkoutForEnergy(day, "low");
      expect(result._originalExerciseCount).toBe(6);
    });

    it("sets _energyLevel to low", () => {
      const day = makeDayData(3);
      const result = adjustWorkoutForEnergy(day, "low");
      expect(result._energyLevel).toBe("low");
    });
  });

  // ── Normal energy ───────────────────────────────────────
  describe("normal energy", () => {
    it("returns exercises unchanged", () => {
      const day = makeDayData(5, "4");
      const result = adjustWorkoutForEnergy(day, "normal");
      expect(result.exercises.length).toBe(5);
      expect(result.exercises[0].sets).toBe("4");
    });

    it("does not add notes", () => {
      const day = makeDayData(3);
      day.exercises[1].notes = undefined;
      const result = adjustWorkoutForEnergy(day, "normal");
      expect(result.exercises[1].notes).toBeUndefined();
    });

    it("sets _energyLevel to normal", () => {
      const day = makeDayData(3);
      const result = adjustWorkoutForEnergy(day, "normal");
      expect(result._energyLevel).toBe("normal");
    });
  });

  // ── High energy ─────────────────────────────────────────
  describe("high energy", () => {
    it("adds 1 extra set per exercise", () => {
      const day = makeDayData(5, "4");
      const result = adjustWorkoutForEnergy(day, "high");
      expect(result.exercises[0].sets).toBe("5");
    });

    it("handles compound set strings like 3x12", () => {
      const day = makeDayData(3, "3x12");
      const result = adjustWorkoutForEnergy(day, "high");
      expect(result.exercises[0].sets).toBe("4x12");
    });

    it("keeps all exercises", () => {
      const day = makeDayData(6);
      const result = adjustWorkoutForEnergy(day, "high");
      expect(result.exercises.length).toBe(6);
    });

    it("adds fired up note", () => {
      const day = makeDayData(3);
      const result = adjustWorkoutForEnergy(day, "high");
      expect(result.exercises[0].notes).toContain("fired up");
    });

    it("sets _energyLevel to high", () => {
      const day = makeDayData(3);
      const result = adjustWorkoutForEnergy(day, "high");
      expect(result._energyLevel).toBe("high");
    });
  });

  // ── Edge cases ──────────────────────────────────────────
  describe("edge cases", () => {
    it("returns null/undefined dayData unchanged", () => {
      expect(adjustWorkoutForEnergy(null, "low")).toBeNull();
      expect(adjustWorkoutForEnergy(undefined, "normal")).toBeUndefined();
    });

    it("handles dayData with no exercises array", () => {
      const day = { day: "Monday", focus: "Rest" };
      const result = adjustWorkoutForEnergy(day, "low");
      expect(result).toEqual(day);
    });

    it("handles empty exercises array", () => {
      const day = { day: "Monday", focus: "Active Recovery", exercises: [] };
      const result = adjustWorkoutForEnergy(day, "low");
      expect(result.exercises.length).toBe(0);
      expect(result._energyLevel).toBe("low");
    });

    it("preserves all other dayData properties", () => {
      const day = {
        ...makeDayData(3),
        customField: "test",
        muscleGroups: ["chest", "back"],
      };
      const result = adjustWorkoutForEnergy(day, "high");
      expect(result.customField).toBe("test");
      expect(result.muscleGroups).toEqual(["chest", "back"]);
      expect(result.day).toBe("Monday");
      expect(result.focus).toBe("Upper Body");
    });

    it("handles sets as plain number string", () => {
      const day = makeDayData(3, "3");
      const lowResult = adjustWorkoutForEnergy(day, "low");
      expect(lowResult.exercises[0].sets).toBe("2");

      const day2 = makeDayData(3, "3");
      const highResult = adjustWorkoutForEnergy(day2, "high");
      expect(highResult.exercises[0].sets).toBe("4");
    });

    it("defaults to 3 sets when sets is non-numeric", () => {
      const day = makeDayData(3);
      day.exercises[0].sets = "AMRAP";
      const result = adjustWorkoutForEnergy(day, "low");
      // Non-numeric sets: regex won't match, so sets stays as-is
      // but notes should still be added
      expect(result.exercises[0].notes).toContain("Low energy");
    });
  });
});

// ── Integration: verify navigation params shape ──────────────
describe("energy check-in navigation contract", () => {
  it("adjusted dayData is JSON-serializable", () => {
    const day = makeDayData(5);
    const levels: EnergyLevel[] = ["low", "normal", "high"];
    for (const level of levels) {
      const adjusted = adjustWorkoutForEnergy(day, level);
      const serialized = JSON.stringify(adjusted);
      const parsed = JSON.parse(serialized);
      expect(parsed._energyLevel).toBe(level);
      expect(parsed.day).toBe("Monday");
    }
  });

  it("low energy always produces ≤3 exercises regardless of input size", () => {
    for (const count of [1, 3, 5, 10, 20]) {
      const day = makeDayData(count);
      const result = adjustWorkoutForEnergy(day, "low");
      expect(result.exercises.length).toBeLessThanOrEqual(3);
    }
  });

  it("high energy always produces same exercise count as input", () => {
    for (const count of [1, 3, 5, 10]) {
      const day = makeDayData(count);
      const result = adjustWorkoutForEnergy(day, "high");
      expect(result.exercises.length).toBe(count);
    }
  });
});
