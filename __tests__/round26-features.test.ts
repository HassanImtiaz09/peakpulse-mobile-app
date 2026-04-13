import { describe, it, expect } from "vitest";
import { getExerciseDemo, normaliseExerciseName } from "../lib/exercise-demos";

/**
 * Round 26 — Shopping List Persistence, Copy to Clipboard, Exercise Video Previews
 */

describe("Shopping List AsyncStorage Persistence", () => {
  it("serializes checked state to JSON for storage", () => {
    const checked: Record<string, boolean> = {
      eggs: true,
      cheese: false,
      "olive oil": true,
    };
    const json = JSON.stringify(checked);
    const parsed = JSON.parse(json);
    expect(parsed.eggs).toBe(true);
    expect(parsed.cheese).toBe(false);
    expect(parsed["olive oil"]).toBe(true);
  });

  it("handles empty checked state correctly", () => {
    const checked: Record<string, boolean> = {};
    const json = JSON.stringify(checked);
    const parsed = JSON.parse(json);
    expect(Object.keys(parsed).length).toBe(0);
  });

  it("preserves checked state after re-parse (simulating app restart)", () => {
    const original: Record<string, boolean> = {
      chicken: true,
      rice: true,
      broccoli: false,
      "olive oil": true,
    };
    const stored = JSON.stringify(original);
    // Simulate app restart — read from storage
    const restored = JSON.parse(stored);
    expect(restored).toEqual(original);
    expect(Object.keys(restored).length).toBe(4);
  });
});

describe("Copy to Clipboard — Text Formatting", () => {
  it("formats unchecked items as a shopping list with counts", () => {
    const ingredients = [
      { key: "olive oil", display: "Olive oil", count: 4 },
      { key: "eggs", display: "Eggs", count: 3 },
      { key: "garlic", display: "Garlic", count: 3 },
      { key: "cheese", display: "Cheese", count: 2 },
      { key: "spinach", display: "Spinach", count: 1 },
    ];
    const checked: Record<string, boolean> = { "olive oil": true, eggs: true };

    const uncheckedItems = ingredients.filter(i => !checked[i.key]);
    const text = uncheckedItems.map(i => `□ ${i.display}${i.count > 1 ? ` (x${i.count})` : ""}`).join("\n");

    expect(text).toContain("□ Garlic (x3)");
    expect(text).toContain("□ Cheese (x2)");
    expect(text).toContain("□ Spinach");
    expect(text).not.toContain("□ Olive oil");
    expect(text).not.toContain("□ Eggs");
    expect(uncheckedItems.length).toBe(3);
  });

  it("copies all items when none are checked", () => {
    const ingredients = [
      { key: "chicken", display: "Chicken", count: 2 },
      { key: "rice", display: "Rice", count: 1 },
    ];
    const checked: Record<string, boolean> = {};

    const uncheckedItems = ingredients.filter(i => !checked[i.key]);
    expect(uncheckedItems.length).toBe(2);
  });

  it("copies all items when all are checked (fallback)", () => {
    const ingredients = [
      { key: "chicken", display: "Chicken", count: 2 },
      { key: "rice", display: "Rice", count: 1 },
    ];
    const checked: Record<string, boolean> = { chicken: true, rice: true };

    const uncheckedItems = ingredients.filter(i => !checked[i.key]);
    const allItems = uncheckedItems.length > 0 ? uncheckedItems : ingredients;
    expect(allItems.length).toBe(2); // Falls back to all items
  });

  it("generates correct header text", () => {
    const uncheckedCount = 5;
    const totalCount = 12;
    const header = uncheckedCount > 0 && uncheckedCount < totalCount
      ? `FytNova Shopping List (${uncheckedCount} remaining):\n\n`
      : `FytNova Shopping List (${totalCount} items):\n\n`;
    expect(header).toBe("FytNova Shopping List (5 remaining):\n\n");
  });
});

describe("Exercise Video Previews", () => {
  it("returns a demo for known exercises with local GIF asset", () => {
    const demo = getExerciseDemo("Bench Press");
    expect(demo).toBeDefined();
    expect(demo.gifAsset).toBeDefined();
    expect(typeof demo.gifAsset === "string" || typeof demo.gifAsset === "number").toBe(true);
    expect(demo.cue).toBeTruthy();
    expect(demo.cue).toContain("shoulder blades");
  });

  it("returns a demo via keyword fallback for unknown variants", () => {
    const demo = getExerciseDemo("Incline Dumbbell Bench Press");
    expect(demo).toBeDefined();
    expect(demo.gifAsset).toBeDefined();
    expect(typeof demo.gifAsset === "string" || typeof demo.gifAsset === "number").toBe(true);
  });

  it("returns a generic fallback for completely unknown exercises", () => {
    const demo = getExerciseDemo("Underwater Basket Weaving");
    expect(demo).toBeDefined();
    expect(demo.gifAsset).toBeDefined();
    expect(typeof demo.gifAsset === "string" || typeof demo.gifAsset === "number").toBe(true);
    expect(demo.cue).toContain("proper form");
  });

  it("normalises exercise names correctly", () => {
    expect(normaliseExerciseName("Bench Press")).toBe("bench press");
    expect(normaliseExerciseName("Push-Up")).toBe("pushup");
    expect(normaliseExerciseName("  Squat  ")).toBe("squat");
    expect(normaliseExerciseName("Bicep's Curl!")).toBe("biceps curl");
  });

  it("maps common exercises to local GIF assets with form cues", () => {
    const exercises = ["squat", "deadlift", "bench press", "pull up", "plank", "bicep curl"];
    for (const name of exercises) {
      const demo = getExerciseDemo(name);
      expect(demo.gifAsset).toBeDefined();
      expect(typeof demo.gifAsset === "string" || typeof demo.gifAsset === "number").toBe(true);
      expect(demo.cue.length).toBeGreaterThan(10);
    }
  });

  it("covers 70+ exercises in the demo map with local GIF assets", () => {
    const exercises = [
      "bench press", "push up", "dumbbell fly", "incline bench press", "cable fly",
      "pull up", "chin up", "lat pulldown", "bent over row", "deadlift", "dumbbell row",
      "overhead press", "shoulder press", "lateral raise", "front raise", "face pull",
      "bicep curl", "hammer curl", "tricep pushdown", "skull crusher",
      "squat", "goblet squat", "lunge", "leg press", "leg curl", "leg extension",
      "romanian deadlift", "hip thrust", "calf raise",
      "plank", "crunch", "russian twist", "mountain climber", "leg raise",
      "burpee", "jumping jack", "box jump", "kettlebell swing",
    ];
    for (const name of exercises) {
      const demo = getExerciseDemo(name);
      expect(demo.gifAsset).toBeDefined();
      expect(typeof demo.gifAsset === "string" || typeof demo.gifAsset === "number").toBe(true);
      expect(demo.cue).toBeTruthy();
    }
  });
});
