/**
 * Round 67 — Exercise Library, Body Diagram, Enhanced GIF Player, Favorites
 */
import { describe, it, expect } from "vitest";

// ── Exercise Data Module Tests ──────────────────────────────────────────────

describe("Exercise Data Module", () => {
  it("exports all required functions", async () => {
    const mod = await import("../lib/exercise-data");
    expect(typeof mod.getExerciseInfo).toBe("function");
    expect(typeof mod.getAllExercises).toBe("function");
    expect(typeof mod.getCategories).toBe("function");
    expect(typeof mod.searchExercises).toBe("function");
    expect(typeof mod.getExercisesByMuscle).toBe("function");
  });

  it("getAllExercises returns 60+ exercises", async () => {
    const { getAllExercises } = await import("../lib/exercise-data");
    const all = getAllExercises();
    expect(all.length).toBeGreaterThanOrEqual(60);
  });

  it("each exercise has required fields", async () => {
    const { getAllExercises } = await import("../lib/exercise-data");
    const all = getAllExercises();
    for (const ex of all) {
      expect(ex.name).toBeTruthy();
      expect(ex.key).toBeTruthy();
      expect(ex.primaryMuscles.length).toBeGreaterThan(0);
      expect(ex.category).toBeTruthy();
      expect(ex.equipment).toBeTruthy();
      expect(ex.difficulty).toBeTruthy();
      expect(ex.angleViews.length).toBeGreaterThanOrEqual(2);
      expect(ex.cue).toBeTruthy();
    }
  });

  it("each exercise has 2-3 angle views with labels and focus", async () => {
    const { getAllExercises } = await import("../lib/exercise-data");
    const all = getAllExercises();
    for (const ex of all) {
      expect(ex.angleViews.length).toBeGreaterThanOrEqual(2);
      expect(ex.angleViews.length).toBeLessThanOrEqual(3);
      for (const view of ex.angleViews) {
        expect(view.gifUrl).toMatch(/^https:\/\//);
        expect(view.label).toBeTruthy();
        expect(view.focus.length).toBeGreaterThan(10); // Meaningful focus text
      }
    }
  });

  it("getExerciseInfo finds exercises by name", async () => {
    const { getExerciseInfo } = await import("../lib/exercise-data");
    const bench = getExerciseInfo("Bench Press");
    expect(bench).toBeDefined();
    expect(bench!.name).toBe("Bench Press");
    expect(bench!.primaryMuscles).toContain("chest");
  });

  it("getExerciseInfo handles aliases", async () => {
    const { getExerciseInfo } = await import("../lib/exercise-data");
    const pushup = getExerciseInfo("pushup");
    expect(pushup).toBeDefined();
    expect(pushup!.name).toBe("Push Up");

    const pullup = getExerciseInfo("pull-up");
    expect(pullup).toBeDefined();
    expect(pullup!.name).toBe("Pull Up");
  });

  it("getCategories returns all categories", async () => {
    const { getCategories } = await import("../lib/exercise-data");
    const cats = getCategories();
    expect(cats).toContain("chest");
    expect(cats).toContain("back");
    expect(cats).toContain("shoulders");
    expect(cats).toContain("arms");
    expect(cats).toContain("legs");
    expect(cats).toContain("core");
    expect(cats).toContain("cardio");
  });

  it("getAllExercises filters by category", async () => {
    const { getAllExercises } = await import("../lib/exercise-data");
    const chest = getAllExercises("chest");
    expect(chest.length).toBeGreaterThan(0);
    for (const ex of chest) {
      expect(ex.category).toBe("chest");
    }
  });

  it("searchExercises finds by name", async () => {
    const { searchExercises } = await import("../lib/exercise-data");
    const results = searchExercises("bench");
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((r) => r.name.toLowerCase().includes("bench"))).toBe(true);
  });

  it("searchExercises finds by muscle", async () => {
    const { searchExercises } = await import("../lib/exercise-data");
    const results = searchExercises("chest");
    expect(results.length).toBeGreaterThan(0);
  });

  it("searchExercises finds by equipment", async () => {
    const { searchExercises } = await import("../lib/exercise-data");
    const results = searchExercises("barbell");
    expect(results.length).toBeGreaterThan(0);
  });

  it("getExercisesByMuscle returns exercises for each muscle", async () => {
    const { getExercisesByMuscle } = await import("../lib/exercise-data");
    const chestExercises = getExercisesByMuscle("chest");
    expect(chestExercises.length).toBeGreaterThan(0);
    for (const ex of chestExercises) {
      const hasMuscle = ex.primaryMuscles.includes("chest") || ex.secondaryMuscles.includes("chest");
      expect(hasMuscle).toBe(true);
    }
  });

  it("difficulty levels are valid", async () => {
    const { getAllExercises } = await import("../lib/exercise-data");
    const all = getAllExercises();
    const validDifficulties = ["beginner", "intermediate", "advanced"];
    for (const ex of all) {
      expect(validDifficulties).toContain(ex.difficulty);
    }
  });

  it("all categories have at least 3 exercises", async () => {
    const { getAllExercises, getCategories } = await import("../lib/exercise-data");
    for (const cat of getCategories()) {
      const exercises = getAllExercises(cat);
      expect(exercises.length).toBeGreaterThanOrEqual(3);
    }
  });
});

// ── Component/Screen File Existence Tests ───────────────────────────────────
// JSX/TSX components can't be imported in vitest without full RN mock setup,
// so we verify file existence and key exports via filesystem checks.

import { existsSync } from "fs";
import { resolve } from "path";

describe("Component and Screen Files", () => {
  const projectRoot = resolve(__dirname, "..");

  it("favorites-context.tsx exists", () => {
    expect(existsSync(resolve(projectRoot, "lib/favorites-context.tsx"))).toBe(true);
  });

  it("body-diagram.tsx exists", () => {
    expect(existsSync(resolve(projectRoot, "components/body-diagram.tsx"))).toBe(true);
  });

  it("enhanced-gif-player.tsx exists", () => {
    expect(existsSync(resolve(projectRoot, "components/enhanced-gif-player.tsx"))).toBe(true);
  });

  it("exercise-library.tsx screen exists", () => {
    expect(existsSync(resolve(projectRoot, "app/exercise-library.tsx"))).toBe(true);
  });

  it("exercise-detail.tsx screen exists", () => {
    expect(existsSync(resolve(projectRoot, "app/exercise-detail.tsx"))).toBe(true);
  });
});

// ── Cross-Module Integration Tests ──────────────────────────────────────────

describe("Integration: Exercise Data + Demos", () => {
  it("exercise-data covers all exercises from exercise-demos", async () => {
    const { getExerciseInfo } = await import("../lib/exercise-data");
    // Test key exercises from each category
    const keyExercises = [
      "bench press", "push up", "squat", "deadlift",
      "pull up", "overhead press", "bicep curl", "tricep pushdown",
      "plank", "burpee", "lunge", "lat pulldown",
    ];
    for (const name of keyExercises) {
      const info = getExerciseInfo(name);
      expect(info).toBeDefined();
      expect(info!.primaryMuscles.length).toBeGreaterThan(0);
      expect(info!.angleViews.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("all muscle groups are covered by at least one exercise", async () => {
    const { getAllExercises } = await import("../lib/exercise-data");
    const all = getAllExercises();
    const allMuscles = new Set<string>();
    for (const ex of all) {
      for (const m of ex.primaryMuscles) allMuscles.add(m);
      for (const m of ex.secondaryMuscles) allMuscles.add(m);
    }
    const expectedMuscles = [
      "chest", "back", "shoulders", "biceps", "triceps",
      "quads", "hamstrings", "glutes", "calves", "abs",
      "obliques", "lats", "traps", "lower_back", "forearms",
    ];
    for (const m of expectedMuscles) {
      expect(allMuscles.has(m)).toBe(true);
    }
  });
});
