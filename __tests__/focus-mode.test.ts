/**
 * Unit tests for Focus Mode — distraction-free workout view.
 * Tests the pure logic functions exported from the component.
 */
import { describe, it, expect } from "vitest";
import {
  getProgressPercentage,
  shouldAutoAdvance,
  getMotivationalMessage,
} from "../lib/focus-mode-logic";

// ── getProgressPercentage ────────────────────────────────────
describe("getProgressPercentage", () => {
  it("returns 0 when no exercises", () => {
    expect(getProgressPercentage(0, 0, 0, 0)).toBe(0);
  });

  it("returns 0 at the start of a workout", () => {
    expect(getProgressPercentage(0, 6, 0, 4)).toBe(0);
  });

  it("returns ~50% at exercise 3 of 6 with no sets done", () => {
    const result = getProgressPercentage(3, 6, 0, 4);
    expect(result).toBeCloseTo(50, 0);
  });

  it("includes partial set progress within the current exercise", () => {
    // Exercise 2 of 4, 2 of 4 sets done
    const result = getProgressPercentage(2, 4, 2, 4);
    // Base: 2/4 = 50%, plus 2/4/4 = 12.5% → 62.5%
    expect(result).toBeGreaterThan(50);
    expect(result).toBeLessThan(75);
  });

  it("caps at 100%", () => {
    const result = getProgressPercentage(5, 5, 4, 4);
    expect(result).toBe(100);
  });

  it("handles single exercise workout", () => {
    expect(getProgressPercentage(0, 1, 0, 3)).toBe(0);
    expect(getProgressPercentage(0, 1, 3, 3)).toBeCloseTo(100, 0);
  });

  it("handles 0 total sets for current exercise", () => {
    const result = getProgressPercentage(2, 4, 0, 0);
    expect(result).toBeCloseTo(50, 0);
  });
});

// ── shouldAutoAdvance ────────────────────────────────────────
describe("shouldAutoAdvance", () => {
  it("returns false for empty logs", () => {
    expect(shouldAutoAdvance([], 0, 5)).toBe(false);
  });

  it("returns false when not all sets are completed", () => {
    const logs = [
      { weight: "50", reps: "10", completed: true },
      { weight: "50", reps: "10", completed: false },
      { weight: "", reps: "", completed: false },
    ];
    expect(shouldAutoAdvance(logs, 0, 5)).toBe(false);
  });

  it("returns true when all sets are completed and not last exercise", () => {
    const logs = [
      { weight: "50", reps: "10", completed: true },
      { weight: "50", reps: "10", completed: true },
      { weight: "50", reps: "10", completed: true },
    ];
    expect(shouldAutoAdvance(logs, 0, 5)).toBe(true);
  });

  it("returns false when all sets are completed but is last exercise", () => {
    const logs = [
      { weight: "50", reps: "10", completed: true },
      { weight: "50", reps: "10", completed: true },
    ];
    expect(shouldAutoAdvance(logs, 4, 5)).toBe(false);
  });

  it("returns true for middle exercise with all sets done", () => {
    const logs = [
      { weight: "60", reps: "8", completed: true },
      { weight: "60", reps: "8", completed: true },
      { weight: "60", reps: "8", completed: true },
      { weight: "60", reps: "8", completed: true },
    ];
    expect(shouldAutoAdvance(logs, 2, 5)).toBe(true);
  });
});

// ── getMotivationalMessage ───────────────────────────────────
describe("getMotivationalMessage", () => {
  it("shows 'Let's get started' for first exercise", () => {
    const msg = getMotivationalMessage(0, 6, false);
    expect(msg).toContain("get started");
  });

  it("shows remaining count for middle exercises", () => {
    const msg = getMotivationalMessage(2, 6, false);
    expect(msg).toContain("2 down");
    expect(msg).toContain("4 to go");
  });

  it("shows 'Almost there' when 2 or fewer remaining", () => {
    const msg = getMotivationalMessage(4, 6, false);
    expect(msg).toContain("Almost there");
    expect(msg).toContain("2 to go");
  });

  it("shows 'All sets done — moving on' when sets complete mid-workout", () => {
    const msg = getMotivationalMessage(2, 6, true);
    expect(msg).toContain("moving on");
  });

  it("shows 'finish strong' on last exercise when all sets done", () => {
    const msg = getMotivationalMessage(5, 6, true);
    expect(msg).toContain("finish strong");
  });

  it("handles single exercise workout", () => {
    const msg = getMotivationalMessage(0, 1, false);
    expect(msg).toContain("get started");
  });

  it("handles single exercise workout completion", () => {
    const msg = getMotivationalMessage(0, 1, true);
    expect(msg).toContain("finish strong");
  });
});

// ── Integration: Focus Mode state contract ───────────────────
describe("Focus Mode state contract", () => {
  it("progress increases monotonically as exercises advance", () => {
    const total = 5;
    const setsPerExercise = 4;
    let prevProgress = -1;
    for (let i = 0; i < total; i++) {
      const progress = getProgressPercentage(i, total, 0, setsPerExercise);
      expect(progress).toBeGreaterThanOrEqual(prevProgress);
      prevProgress = progress;
    }
  });

  it("progress increases as sets are completed within an exercise", () => {
    const total = 4;
    const totalSets = 4;
    let prevProgress = -1;
    for (let s = 0; s <= totalSets; s++) {
      const progress = getProgressPercentage(1, total, s, totalSets);
      expect(progress).toBeGreaterThanOrEqual(prevProgress);
      prevProgress = progress;
    }
  });

  it("auto-advance is only triggered for non-last exercises", () => {
    const allDone = [
      { weight: "50", reps: "10", completed: true },
      { weight: "50", reps: "10", completed: true },
    ];
    // Should advance for exercises 0-3 of 5
    for (let i = 0; i < 4; i++) {
      expect(shouldAutoAdvance(allDone, i, 5)).toBe(true);
    }
    // Should NOT advance for last exercise
    expect(shouldAutoAdvance(allDone, 4, 5)).toBe(false);
  });

  it("motivational messages are non-empty for all states", () => {
    for (let i = 0; i < 6; i++) {
      for (const done of [true, false]) {
        const msg = getMotivationalMessage(i, 6, done);
        expect(msg.length).toBeGreaterThan(0);
      }
    }
  });
});
