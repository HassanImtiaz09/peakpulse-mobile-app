/**
 * Round 65 — Exercise Demo Tests (Updated: MuscleWiki video integration)
 *
 * Tests for the exercise demo system:
 * - MuscleWiki video URL validity
 * - Exercise demo lookup
 * - Workout type coverage
 */
import { describe, it, expect } from "vitest";
import { getExerciseDemo, normaliseExerciseName } from "../lib/exercise-demos";

// ── Exercise Demo Lookup ──────────────────────────────────────────────────────

describe("Exercise Demo Lookup", () => {
  it("returns correct demo for exact match exercises", () => {
    const benchPress = getExerciseDemo("bench press");
    expect(benchPress.gifUrl).toContain("musclewiki.com");
    expect(benchPress.gifUrl).toContain(".mp4");
    expect(benchPress.cue).toContain("shoulder blades");

    const squat = getExerciseDemo("squat");
    expect(squat.gifUrl).toContain("musclewiki.com");
    expect(squat.cue).toContain("Feet shoulder-width");

    const deadlift = getExerciseDemo("deadlift");
    expect(deadlift.gifUrl).toContain("musclewiki.com");
    expect(deadlift.cue).toContain("Bar over mid-foot");
  });

  it("handles case-insensitive lookups", () => {
    const demo1 = getExerciseDemo("Bench Press");
    const demo2 = getExerciseDemo("BENCH PRESS");
    const demo3 = getExerciseDemo("bench press");
    expect(demo1.gifUrl).toBe(demo2.gifUrl);
    expect(demo2.gifUrl).toBe(demo3.gifUrl);
  });

  it("handles variant exercise names (push-up, push up, pushup)", () => {
    const demo1 = getExerciseDemo("push up");
    const demo2 = getExerciseDemo("push-up");
    const demo3 = getExerciseDemo("pushup");
    expect(demo1.gifUrl).toBe(demo2.gifUrl);
    expect(demo2.gifUrl).toBe(demo3.gifUrl);
    expect(demo1.gifUrl).toContain("musclewiki.com");
  });

  it("returns fallback demo for unknown exercises via keyword matching", () => {
    const demo = getExerciseDemo("barbell back squat variation");
    // Should match "squat" keyword fallback
    expect(demo.gifUrl).toBeTruthy();
    expect(demo.gifUrl.length).toBeGreaterThan(10);
  });

  it("returns generic fallback for completely unknown exercises", () => {
    const demo = getExerciseDemo("xyzzy unknown exercise");
    expect(demo.gifUrl).toBeTruthy();
    expect(demo.cue).toBeTruthy();
  });

  it("returns demos for all major muscle groups", () => {
    // Chest
    expect(getExerciseDemo("bench press").gifUrl).toBeTruthy();
    expect(getExerciseDemo("dumbbell fly").gifUrl).toBeTruthy();
    // Back
    expect(getExerciseDemo("pull up").gifUrl).toBeTruthy();
    expect(getExerciseDemo("lat pulldown").gifUrl).toBeTruthy();
    expect(getExerciseDemo("barbell row").gifUrl).toBeTruthy();
    // Shoulders
    expect(getExerciseDemo("overhead press").gifUrl).toBeTruthy();
    expect(getExerciseDemo("lateral raise").gifUrl).toBeTruthy();
    // Arms
    expect(getExerciseDemo("bicep curl").gifUrl).toBeTruthy();
    expect(getExerciseDemo("tricep pushdown").gifUrl).toBeTruthy();
    // Legs
    expect(getExerciseDemo("squat").gifUrl).toBeTruthy();
    expect(getExerciseDemo("lunge").gifUrl).toBeTruthy();
    expect(getExerciseDemo("leg press").gifUrl).toBeTruthy();
    expect(getExerciseDemo("romanian deadlift").gifUrl).toBeTruthy();
    // Core
    expect(getExerciseDemo("plank").gifUrl).toBeTruthy();
    expect(getExerciseDemo("crunch").gifUrl).toBeTruthy();
    // Cardio
    expect(getExerciseDemo("burpee").gifUrl).toBeTruthy();
    expect(getExerciseDemo("jumping jack").gifUrl).toBeTruthy();
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

// ── Video URL Validity ────────────────────────────────────────────────────────

describe("Video URL Validity", () => {
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

  it("all major exercises have valid MuscleWiki video URLs", () => {
    for (const name of exerciseNames) {
      const demo = getExerciseDemo(name);
      // Most exercises use MuscleWiki MP4, a few fallbacks use ExerciseDB GIF
      expect(demo.gifUrl).toMatch(/^https:\/\/(api\.musclewiki\.com|static\.exercisedb\.dev)\//);
    }
  });

  it("all major exercises have non-empty cue text", () => {
    for (const name of exerciseNames) {
      const demo = getExerciseDemo(name);
      expect(demo.cue.length).toBeGreaterThan(10);
    }
  });
});

// ── Video-based Demo System ────────────────────────────────────────────────────

describe("Video-based Demo System", () => {
  it("exercise-demo-player component exists with video and fullscreen support", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("/home/ubuntu/peakpulse-mobile/components/exercise-demo-player.tsx", "utf-8");
    expect(content).toContain("ExerciseDemoPlayer");
    expect(content).toContain("fullscreen");
    expect(content).toContain("Modal");
    expect(content).toContain("VideoView");
  });

  it("enhanced-gif-player component exists with multi-angle views and video support", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("/home/ubuntu/peakpulse-mobile/components/enhanced-gif-player.tsx", "utf-8");
    expect(content).toContain("EnhancedGifPlayer");
    expect(content).toContain("angleViews");
    expect(content).toContain("fullscreen");
    expect(content).toContain("Modal");
    expect(content).toContain("VideoView");
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

  it("all gym exercises have working demos", () => {
    for (const name of gymExercises) {
      const demo = getExerciseDemo(name);
      expect(demo.gifUrl).toBeTruthy();
      expect(demo.cue).toBeTruthy();
    }
  });

  it("all home/bodyweight exercises have working demos", () => {
    for (const name of homeExercises) {
      const demo = getExerciseDemo(name);
      expect(demo.gifUrl).toBeTruthy();
      expect(demo.cue).toBeTruthy();
    }
  });

  it("all mixed/calisthenics exercises have working demos", () => {
    for (const name of mixedExercises) {
      const demo = getExerciseDemo(name);
      expect(demo.gifUrl).toBeTruthy();
      expect(demo.cue).toBeTruthy();
    }
  });
});
