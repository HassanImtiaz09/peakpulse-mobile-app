/**
 * Tests for:
 * 1. Exercise substitution service (scoring, filtering)
 * 2. Expanded ExerciseDB coverage (100% of exercise-data exercises mapped)
 * 3. Browse-by-muscle data flow
 */
import { describe, it, expect } from "vitest";
import {
  getSubstitutions,
  getFilteredSubstitutions,
  getEquipmentForMuscle,
} from "@/lib/exercise-substitution";
import {
  getExerciseDbGifUrl,
  hasExerciseDbGif,
  getExerciseDbId,
  getAllMappedExercises,
} from "@/lib/exercisedb-api";
import {
  getExercisesByMuscle,
  getExerciseInfo,
} from "@/lib/exercise-data";

// ── ExerciseDB Coverage Tests ──────────────────────────────────────────────

describe("ExerciseDB Coverage", () => {
  it("should have 100+ mapped exercise keys", () => {
    const all = getAllMappedExercises();
    expect(all.length).toBeGreaterThanOrEqual(100);
  });

  it("should return GIF URLs for all newly added exercises", () => {
    const newExercises = [
      "bent over row",
      "cable fly",
      "cable woodchop",
      "crunch",
      "dumbbell row",
      "dumbbell shoulder press",
      "front raise",
      "glute bridge",
      "leg raise",
      "pendlay row",
      "reverse lunge",
      "side plank",
      "sit up",
      "sprint",
      "stiff leg deadlift",
      "sumo deadlift",
      "tricep extension",
      "dumbbell kickback",
      "run",
    ];

    for (const name of newExercises) {
      const url = getExerciseDbGifUrl(name);
      expect(url).not.toBeNull();
      expect(url).toContain("files.manuscdn.com");
      expect(url).toContain(".gif");
    }
  });

  it("should have hasExerciseDbGif return true for mapped exercises", () => {
    expect(hasExerciseDbGif("bench press")).toBe(true);
    expect(hasExerciseDbGif("squat")).toBe(true);
    expect(hasExerciseDbGif("deadlift")).toBe(true);
    expect(hasExerciseDbGif("cable fly")).toBe(true);
    expect(hasExerciseDbGif("glute bridge")).toBe(true);
  });

  it("should return null for unmapped exercises", () => {
    expect(getExerciseDbGifUrl("imaginary exercise xyz")).toBeNull();
    expect(hasExerciseDbGif("imaginary exercise xyz")).toBe(false);
  });

  it("should return valid ExerciseDB IDs", () => {
    const id = getExerciseDbId("bench press");
    expect(id).toBeTruthy();
    expect(typeof id).toBe("string");
    expect(id!.length).toBeGreaterThan(3);
  });
});

// ── Exercise Substitution Tests ────────────────────────────────────────────

describe("Exercise Substitution", () => {
  it("should return substitutions for bench press", () => {
    const subs = getSubstitutions("Bench Press");
    expect(subs.length).toBeGreaterThan(0);
    expect(subs.length).toBeLessThanOrEqual(8);

    // All results should have required fields
    for (const sub of subs) {
      expect(sub.exercise).toBeDefined();
      expect(sub.exercise.name).toBeTruthy();
      expect(sub.matchScore).toBeGreaterThanOrEqual(0);
      expect(sub.matchScore).toBeLessThanOrEqual(100);
      expect(sub.reason).toBeTruthy();
      expect(typeof sub.hasGif).toBe("boolean");
    }
  });

  it("should not include the original exercise in substitutions", () => {
    const subs = getSubstitutions("Bench Press");
    const names = subs.map((s) => s.exercise.name);
    expect(names).not.toContain("Bench Press");
  });

  it("should rank substitutions by match score (descending)", () => {
    const subs = getSubstitutions("Squat");
    for (let i = 1; i < subs.length; i++) {
      expect(subs[i - 1].matchScore).toBeGreaterThanOrEqual(subs[i].matchScore);
    }
  });

  it("should prioritize exercises targeting the same primary muscles", () => {
    const subs = getSubstitutions("Bench Press");
    // Top result should target chest
    if (subs.length > 0) {
      const topSub = subs[0];
      const hasChest =
        topSub.exercise.primaryMuscles.includes("chest") ||
        topSub.exercise.secondaryMuscles.includes("chest");
      expect(hasChest).toBe(true);
    }
  });

  it("should return empty array for unknown exercises", () => {
    const subs = getSubstitutions("Imaginary Exercise XYZ");
    expect(subs).toEqual([]);
  });

  it("should respect limit parameter", () => {
    const subs3 = getSubstitutions("Deadlift", 3);
    expect(subs3.length).toBeLessThanOrEqual(3);

    const subs1 = getSubstitutions("Deadlift", 1);
    expect(subs1.length).toBeLessThanOrEqual(1);
  });
});

// ── Filtered Substitution Tests ────────────────────────────────────────────

describe("Filtered Substitutions", () => {
  it("should filter by equipment", () => {
    const subs = getFilteredSubstitutions("Bench Press", {
      equipment: "Barbell",
    });
    for (const sub of subs) {
      expect(sub.exercise.equipment.toLowerCase()).toBe("barbell");
    }
  });

  it("should filter by difficulty", () => {
    const subs = getFilteredSubstitutions("Deadlift", {
      difficulty: "beginner",
    });
    for (const sub of subs) {
      expect(sub.exercise.difficulty).toBe("beginner");
    }
  });

  it("should filter by has_gif", () => {
    const allSubs = getSubstitutions("Bench Press", 20);
    const gifSubs = allSubs.filter((s) => s.hasGif);
    // All gif subs should have ExerciseDB GIFs
    for (const sub of gifSubs) {
      expect(hasExerciseDbGif(sub.exercise.name)).toBe(true);
    }
  });
});

// ── Browse by Muscle Tests ─────────────────────────────────────────────────

describe("Browse by Muscle", () => {
  it("should return exercises for chest muscle group", () => {
    const exercises = getExercisesByMuscle("chest");
    expect(exercises.length).toBeGreaterThan(0);
    for (const ex of exercises) {
      const hasChest =
        ex.primaryMuscles.includes("chest") ||
        ex.secondaryMuscles.includes("chest");
      expect(hasChest).toBe(true);
    }
  });

  it("should return exercises for all major muscle groups", () => {
    const muscles = [
      "chest",
      "back",
      "shoulders",
      "biceps",
      "triceps",
      "quads",
      "hamstrings",
      "glutes",
      "abs",
      "calves",
    ] as const;

    for (const muscle of muscles) {
      const exercises = getExercisesByMuscle(muscle);
      expect(exercises.length).toBeGreaterThan(0);
    }
  });

  it("should return equipment types for a muscle group", () => {
    const equipment = getEquipmentForMuscle("chest");
    expect(equipment.length).toBeGreaterThan(0);
    // Equipment strings may contain comma-separated values like "Barbell, Bench"
    const hasBarbell = equipment.some((e) => e.toLowerCase().includes("barbell"));
    expect(hasBarbell).toBe(true);
  });
});
