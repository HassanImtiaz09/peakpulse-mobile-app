/**
 * Round 65 — Exercise Demo Tests (Updated: Local GIF asset integration)
 *
 * Tests for the exercise demo system:
 * - Local GIF asset resolution
 * - Exercise demo lookup
 * - Workout type coverage
 */
import { describe, it, expect } from "vitest";
import { getExerciseDemo, normaliseExerciseName } from "../lib/exercise-demos";

// ── Exercise Demo Lookup ──────────────────────────────────────────────────────

describe("Exercise Demo Lookup", () => {
  it("returns correct demo for exact match exercises with local GIF assets", () => {
    const benchPress = getExerciseDemo("bench press");
    expect(benchPress.gifAsset).toBeDefined();
    expect(typeof benchPress.gifAsset).toBe("number");
    expect(benchPress.cue).toContain("shoulder blades");

    const squat = getExerciseDemo("squat");
    expect(squat.gifAsset).toBeDefined();
    expect(squat.cue).toContain("Feet shoulder-width");

    const deadlift = getExerciseDemo("deadlift");
    expect(deadlift.gifAsset).toBeDefined();
    expect(deadlift.cue).toContain("Bar over mid-foot");
  });

  it("handles case-insensitive lookups", () => {
    const demo1 = getExerciseDemo("Bench Press");
    const demo2 = getExerciseDemo("BENCH PRESS");
    const demo3 = getExerciseDemo("bench press");
    expect(demo1.gifAsset).toBe(demo2.gifAsset);
    expect(demo2.gifAsset).toBe(demo3.gifAsset);
  });

  it("handles variant exercise names (push-up, push up, pushup)", () => {
    const demo1 = getExerciseDemo("push up");
    const demo2 = getExerciseDemo("push-up");
    const demo3 = getExerciseDemo("pushup");
    expect(demo1.gifAsset).toBe(demo2.gifAsset);
    expect(demo2.gifAsset).toBe(demo3.gifAsset);
    expect(typeof demo1.gifAsset).toBe("number");
  });

  it("returns fallback demo for unknown exercises via keyword matching", () => {
    const demo = getExerciseDemo("barbell back squat variation");
    expect(demo.gifAsset).toBeDefined();
    expect(typeof demo.gifAsset).toBe("number");
  });

  it("returns generic fallback for completely unknown exercises", () => {
    const demo = getExerciseDemo("xyzzy unknown exercise");
    expect(demo.gifAsset).toBeDefined();
    expect(demo.cue).toBeTruthy();
  });

  it("returns demos for all major muscle groups", () => {
    // Chest
    expect(getExerciseDemo("bench press").gifAsset).toBeDefined();
    expect(getExerciseDemo("dumbbell fly").gifAsset).toBeDefined();
    // Back
    expect(getExerciseDemo("pull up").gifAsset).toBeDefined();
    expect(getExerciseDemo("lat pulldown").gifAsset).toBeDefined();
    expect(getExerciseDemo("barbell row").gifAsset).toBeDefined();
    // Shoulders
    expect(getExerciseDemo("overhead press").gifAsset).toBeDefined();
    expect(getExerciseDemo("lateral raise").gifAsset).toBeDefined();
    // Arms
    expect(getExerciseDemo("bicep curl").gifAsset).toBeDefined();
    expect(getExerciseDemo("tricep pushdown").gifAsset).toBeDefined();
    // Legs
    expect(getExerciseDemo("squat").gifAsset).toBeDefined();
    expect(getExerciseDemo("lunge").gifAsset).toBeDefined();
    expect(getExerciseDemo("leg press").gifAsset).toBeDefined();
    expect(getExerciseDemo("romanian deadlift").gifAsset).toBeDefined();
    // Core
    expect(getExerciseDemo("plank").gifAsset).toBeDefined();
    expect(getExerciseDemo("crunch").gifAsset).toBeDefined();
    // Cardio
    expect(getExerciseDemo("burpee").gifAsset).toBeDefined();
    expect(getExerciseDemo("jumping jack").gifAsset).toBeDefined();
  });
});

// ── Exercise Name Normalisation ───────────────────────────────────────────────

describe("Exercise Name Normalisation", () => {
  it("lowercases and strips special characters", () => {
    expect(normaliseExerciseName("Bench Press")).toBe("bench press");
    expect(normaliseExerciseName("Push-Up")).toBe("pushup");
    expect(normaliseExerciseName("T-Bar Row")).toBe("tbar row");
  });

  it("trims whitespace", () => {
    expect(normaliseExerciseName("  squat  ")).toBe("squat");
  });
});

// ── Local GIF Asset Validity ────────────────────────────────────────────────────

describe("Local GIF Asset Validity", () => {
  const exerciseNames = [
    "bench press", "push up", "dumbbell fly", "incline bench press",
    "pull up", "lat pulldown", "barbell row", "dumbbell row", "deadlift",
    "overhead press", "lateral raise", "face pull",
    "bicep curl", "tricep pushdown", "hammer curl",
    "squat", "lunge", "leg press", "leg curl", "leg extension",
    "romanian deadlift", "hip thrust", "calf raise",
    "plank", "crunch", "russian twist", "mountain climber",
    "burpee", "jumping jack", "kettlebell swing", "jump rope",
  ];

  it("all major exercises have local GIF assets", () => {
    for (const name of exerciseNames) {
      const demo = getExerciseDemo(name);
      expect(demo.gifAsset).toBeDefined();
      expect(typeof demo.gifAsset).toBe("number");
    }
  });

  it("all major exercises have non-empty cue text", () => {
    for (const name of exerciseNames) {
      const demo = getExerciseDemo(name);
      expect(demo.cue.length).toBeGreaterThan(10);
    }
  });
});

// ── GIF-based Demo System ────────────────────────────────────────────────────

describe("GIF-based Demo System", () => {
  it("exercise-demo-player component uses local GIF assets via expo-image", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("/home/ubuntu/peakpulse-mobile/components/exercise-demo-player.tsx", "utf-8");
    expect(content).toContain("ExerciseDemoPlayer");
    expect(content).toContain("fullscreen");
    expect(content).toContain("Modal");
    expect(content).toContain("resolveGifAsset");
    expect(content).toContain("expo-image");
    expect(content).not.toContain("VideoView");
  });

  it("enhanced-gif-player component uses local GIF assets via expo-image", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("/home/ubuntu/peakpulse-mobile/components/enhanced-gif-player.tsx", "utf-8");
    expect(content).toContain("EnhancedGifPlayer");
    expect(content).toContain("angleViews");
    expect(content).toContain("fullscreen");
    expect(content).toContain("Modal");
    expect(content).toContain("resolveGifAsset");
    expect(content).toContain("expo-image");
    expect(content).not.toContain("VideoView");
  });

  it("no YouTube player component exists", async () => {
    const fs = await import("fs");
    expect(() => {
      fs.readFileSync("/home/ubuntu/peakpulse-mobile/components/youtube-player.tsx", "utf-8");
    }).toThrow();
  });
});

// ── Gym / Home / Mixed Workout Coverage ───────────────────────────────────────

describe("Workout Type Coverage", () => {
  const gymExercises = [
    "bench press", "squat", "deadlift", "lat pulldown",
    "leg press", "cable fly", "leg curl", "leg extension",
    "seated cable row", "incline bench press",
  ];

  const homeExercises = [
    "push up", "pull up", "plank", "crunch", "burpee",
    "mountain climber", "jumping jack", "lunge", "dip",
    "russian twist", "bicycle crunch", "dead bug",
  ];

  const mixedExercises = [
    "goblet squat", "dumbbell row", "dumbbell shoulder press",
    "dumbbell curl", "hip thrust", "glute bridge",
    "step up", "kettlebell swing",
  ];

  it("all gym exercises have working demos with local GIF assets", () => {
    for (const name of gymExercises) {
      const demo = getExerciseDemo(name);
      expect(demo.gifAsset).toBeDefined();
      expect(demo.cue).toBeTruthy();
    }
  });

  it("all home/bodyweight exercises have working demos with local GIF assets", () => {
    for (const name of homeExercises) {
      const demo = getExerciseDemo(name);
      expect(demo.gifAsset).toBeDefined();
      expect(demo.cue).toBeTruthy();
    }
  });

  it("all mixed/calisthenics exercises have working demos with local GIF assets", () => {
    for (const name of mixedExercises) {
      const demo = getExerciseDemo(name);
      expect(demo.gifAsset).toBeDefined();
      expect(demo.cue).toBeTruthy();
    }
  });
});
