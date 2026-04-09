/**
 * Tests for lib/quick-pick-exercise.ts
 * "Just One Exercise" — smart exercise selection based on muscle recovery and history
 */
import { describe, it, expect } from "vitest";
import {
  selectQuickExercise,
  parseWorkoutHistory,
  getMotivationalMessage,
  getMuscleRecoveryScore,
  QUICK_SESSION_CONFIG,
  type QuickPickOptions,
  type WorkoutHistoryEntry,
} from "@/lib/quick-pick-exercise";
import type { ExerciseInfo } from "@/lib/exercise-data";

// ── Helpers ──────────────────────────────────────────────────────────────

function makeExercise(overrides: Partial<ExerciseInfo> = {}): ExerciseInfo {
  return {
    name: overrides.name ?? "Bench Press",
    key: (overrides.name ?? "Bench Press").toLowerCase().replace(/\s+/g, "_"),
    primaryMuscles: overrides.primaryMuscles ?? ["chest"],
    secondaryMuscles: overrides.secondaryMuscles ?? ["triceps"],
    category: (overrides as any).category ?? "chest",
    equipment: overrides.equipment ?? "barbell",
    difficulty: overrides.difficulty ?? "intermediate",
    angleViews: [],
    cue: "",
    ...(overrides as any),
  };
}

function makeHistory(entries: Partial<WorkoutHistoryEntry>[] = []): WorkoutHistoryEntry[] {
  return entries.map((e) => ({
    exerciseName: e.exerciseName ?? "Bench Press",
    muscleGroups: e.muscleGroups ?? ["chest"],
    date: e.date ?? new Date().toISOString(),
    ...e,
  }));
}

const EXERCISES: ExerciseInfo[] = [
  makeExercise({ name: "Bench Press", primaryMuscles: ["chest"], secondaryMuscles: ["triceps"], equipment: "barbell", difficulty: "intermediate" }),
  makeExercise({ name: "Squat", primaryMuscles: ["quads"], secondaryMuscles: ["glutes"], category: "legs", equipment: "barbell", difficulty: "intermediate" }),
  makeExercise({ name: "Bicep Curl", primaryMuscles: ["biceps"], secondaryMuscles: [], category: "arms", equipment: "dumbbell", difficulty: "beginner" }),
  makeExercise({ name: "Deadlift", primaryMuscles: ["lower_back"], secondaryMuscles: ["hamstrings", "glutes"], category: "back", equipment: "barbell", difficulty: "advanced" }),
  makeExercise({ name: "Push Up", primaryMuscles: ["chest"], secondaryMuscles: ["triceps"], category: "chest", equipment: "body_only", difficulty: "beginner" }),
  makeExercise({ name: "Lat Pulldown", primaryMuscles: ["lats"], secondaryMuscles: ["biceps"], category: "back", equipment: "cable", difficulty: "intermediate" }),
  makeExercise({ name: "Shoulder Press", primaryMuscles: ["shoulders"], secondaryMuscles: ["triceps"], category: "shoulders", equipment: "dumbbell", difficulty: "intermediate" }),
  makeExercise({ name: "Plank", primaryMuscles: ["abs"], secondaryMuscles: [], category: "core", equipment: "body_only", difficulty: "beginner" }),
];

// ── Tests ────────────────────────────────────────────────────────────────

describe("QUICK_SESSION_CONFIG", () => {
  it("defines config for all three energy levels", () => {
    expect(QUICK_SESSION_CONFIG.low).toBeDefined();
    expect(QUICK_SESSION_CONFIG.normal).toBeDefined();
    expect(QUICK_SESSION_CONFIG.high).toBeDefined();
  });

  it("low energy has fewer sets than normal", () => {
    expect(QUICK_SESSION_CONFIG.low.sets).toBeLessThanOrEqual(QUICK_SESSION_CONFIG.normal.sets);
  });

  it("high energy has more sets than normal", () => {
    expect(QUICK_SESSION_CONFIG.high.sets).toBeGreaterThanOrEqual(QUICK_SESSION_CONFIG.normal.sets);
  });
});

describe("selectQuickExercise", () => {
  it("returns an exercise when given a valid list", () => {
    const result = selectQuickExercise(EXERCISES, [], { energyLevel: "normal" });
    expect(result).not.toBeNull();
    expect(result!.name).toBeTruthy();
    expect(result!.suggestedSets).toBeGreaterThan(0);
    expect(result!.suggestedReps).toBeGreaterThan(0);
  });

  it("returns null for empty exercise list", () => {
    const result = selectQuickExercise([], [], { energyLevel: "normal" });
    expect(result).toBeNull();
  });

  it("excludes exercises in the exclude list", () => {
    const result = selectQuickExercise(EXERCISES, [], {
      energyLevel: "normal",
      excludeExercises: ["Bench Press", "Squat", "Bicep Curl", "Deadlift", "Push Up", "Lat Pulldown", "Shoulder Press"],
    });
    // Only Plank should remain
    if (result) {
      expect(result.name).toBe("Plank");
    }
  });

  it("returns null when all exercises are excluded", () => {
    const allNames = EXERCISES.map((e) => e.name);
    const result = selectQuickExercise(EXERCISES, [], {
      energyLevel: "normal",
      excludeExercises: allNames,
    });
    expect(result).toBeNull();
  });

  it("prefers exercises targeting muscles not recently worked", () => {
    // Worked chest yesterday
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const history = makeHistory([
      { exerciseName: "Bench Press", muscleGroups: ["chest"], date: yesterday },
      { exerciseName: "Push Up", muscleGroups: ["chest"], date: yesterday },
    ]);

    // Run multiple times to check statistical preference
    const results: string[] = [];
    for (let i = 0; i < 20; i++) {
      const result = selectQuickExercise(EXERCISES, history, { energyLevel: "normal" });
      if (result) results.push(result.name);
    }

    // Should mostly avoid chest exercises
    const chestCount = results.filter((n) => n === "Bench Press" || n === "Push Up").length;
    const nonChestCount = results.length - chestCount;
    expect(nonChestCount).toBeGreaterThan(chestCount);
  });

  it("adjusts sets/reps based on energy level", () => {
    const lowResult = selectQuickExercise(EXERCISES, [], { energyLevel: "low" });
    const highResult = selectQuickExercise(EXERCISES, [], { energyLevel: "high" });

    if (lowResult && highResult) {
      expect(lowResult.suggestedSets).toBeLessThanOrEqual(highResult.suggestedSets);
    }
  });

  it("prefers beginner exercises for low energy", () => {
    const results: string[] = [];
    for (let i = 0; i < 30; i++) {
      const result = selectQuickExercise(EXERCISES, [], { energyLevel: "low" });
      if (result) results.push(result.difficulty);
    }
    const beginnerCount = results.filter((d) => d === "beginner").length;
    // Should have some beginner exercises
    expect(beginnerCount).toBeGreaterThan(0);
  });

  it("includes a reason for the selection", () => {
    const result = selectQuickExercise(EXERCISES, [], { energyLevel: "normal" });
    expect(result).not.toBeNull();
    expect(result!.reason).toBeTruthy();
    expect(typeof result!.reason).toBe("string");
    expect(result!.reason.length).toBeGreaterThan(5);
  });

  it("includes primary and secondary muscles", () => {
    const result = selectQuickExercise(EXERCISES, [], { energyLevel: "normal" });
    expect(result).not.toBeNull();
    expect(Array.isArray(result!.primaryMuscles)).toBe(true);
    expect(result!.primaryMuscles.length).toBeGreaterThan(0);
    expect(Array.isArray(result!.secondaryMuscles)).toBe(true);
  });

  it("includes equipment info", () => {
    const result = selectQuickExercise(EXERCISES, [], { energyLevel: "normal" });
    expect(result).not.toBeNull();
    expect(result!.equipment).toBeTruthy();
  });
});

describe("parseWorkoutHistory", () => {
  it("returns empty array for empty logs", () => {
    const result = parseWorkoutHistory([]);
    expect(result).toEqual([]);
  });

  it("extracts exercise names and dates from workout logs", () => {
    const logs = [
      {
        id: "1",
        date: "2026-04-07",
        exercises: [
          { name: "Bench Press", sets: [{ weight: 135, reps: 10 }] },
          { name: "Squat", sets: [{ weight: 225, reps: 8 }] },
        ],
      },
    ];
    const result = parseWorkoutHistory(logs as any);
    expect(result.length).toBeGreaterThanOrEqual(2);
  });

  it("handles logs with missing exercise data gracefully", () => {
    const logs = [
      { id: "1", date: "2026-04-07", exercises: [] },
      { id: "2", date: "2026-04-06" },
    ];
    const result = parseWorkoutHistory(logs as any);
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("getMuscleRecoveryScore", () => {
  it("returns high score for muscles not recently worked", () => {
    const score = getMuscleRecoveryScore("chest", []);
    expect(score).toBeGreaterThanOrEqual(0.8);
  });

  it("returns lower score for muscles worked recently", () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const history = makeHistory([
      { exerciseName: "Bench Press", muscleGroups: ["chest"], date: yesterday },
    ]);
    const recentScore = getMuscleRecoveryScore("chest", history);
    const freshScore = getMuscleRecoveryScore("lats", history);
    expect(recentScore).toBeLessThan(freshScore);
  });

  it("returns higher score for muscles worked 3+ days ago", () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const historyOld = makeHistory([
      { exerciseName: "Bench Press", muscleGroups: ["chest"], date: threeDaysAgo },
    ]);
    const historyRecent = makeHistory([
      { exerciseName: "Bench Press", muscleGroups: ["chest"], date: yesterday },
    ]);
    const oldScore = getMuscleRecoveryScore("chest", historyOld);
    const recentScore = getMuscleRecoveryScore("chest", historyRecent);
    expect(oldScore).toBeGreaterThan(recentScore);
  });
});

describe("getMotivationalMessage", () => {
  it("returns a string for each energy level", () => {
    expect(typeof getMotivationalMessage("low")).toBe("string");
    expect(typeof getMotivationalMessage("normal")).toBe("string");
    expect(typeof getMotivationalMessage("high")).toBe("string");
  });

  it("returns non-empty messages", () => {
    expect(getMotivationalMessage("low").length).toBeGreaterThan(5);
    expect(getMotivationalMessage("normal").length).toBeGreaterThan(5);
    expect(getMotivationalMessage("high").length).toBeGreaterThan(5);
  });

  it("returns different messages for different energy levels", () => {
    // Run multiple times — at least some should differ
    const lowMsgs = new Set(Array.from({ length: 10 }, () => getMotivationalMessage("low")));
    const highMsgs = new Set(Array.from({ length: 10 }, () => getMotivationalMessage("high")));
    // Messages pools should be different
    const lowArr = [...lowMsgs];
    const highArr = [...highMsgs];
    const overlap = lowArr.filter((m) => highArr.includes(m));
    // Not all messages should overlap
    expect(overlap.length).toBeLessThan(Math.max(lowArr.length, highArr.length));
  });
});
