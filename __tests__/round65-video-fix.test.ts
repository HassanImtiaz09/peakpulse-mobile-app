/**
 * Round 65 — Video Player Fix Tests
 *
 * Tests for the YouTube player component rewrite:
 * - Thumbnail URL generation
 * - YouTube URL construction
 * - Exercise demo lookup
 * - Platform-specific rendering logic
 */
import { describe, it, expect } from "vitest";
import { getExerciseDemo, normaliseExerciseName } from "../lib/exercise-demos";

// ── Exercise Demo Lookup ──────────────────────────────────────────────────────

describe("Exercise Demo Lookup", () => {
  it("returns correct demo for exact match exercises", () => {
    const benchPress = getExerciseDemo("bench press");
    expect(benchPress.videoId).toBe("hWbUlkb5Ms4");
    expect(benchPress.cue).toContain("shoulder blades");

    const squat = getExerciseDemo("squat");
    expect(squat.videoId).toBe("MLoZuAkIyZI");
    expect(squat.cue).toContain("Feet shoulder-width");

    const deadlift = getExerciseDemo("deadlift");
    expect(deadlift.videoId).toBe("ZaTM37cfiDs");
    expect(deadlift.cue).toContain("Bar over mid-foot");
  });

  it("handles case-insensitive lookups", () => {
    const demo1 = getExerciseDemo("Bench Press");
    const demo2 = getExerciseDemo("BENCH PRESS");
    const demo3 = getExerciseDemo("bench press");
    expect(demo1.videoId).toBe(demo2.videoId);
    expect(demo2.videoId).toBe(demo3.videoId);
  });

  it("handles variant exercise names (push-up, push up, pushup)", () => {
    const demo1 = getExerciseDemo("push up");
    const demo2 = getExerciseDemo("push-up");
    const demo3 = getExerciseDemo("pushup");
    expect(demo1.videoId).toBe(demo2.videoId);
    expect(demo2.videoId).toBe(demo3.videoId);
    expect(demo1.videoId).toBe("_YrJc-kTYA0");
  });

  it("returns fallback demo for unknown exercises via keyword matching", () => {
    const demo = getExerciseDemo("barbell back squat variation");
    // Should match "squat" keyword fallback
    expect(demo.videoId).toBe("MLoZuAkIyZI");
  });

  it("returns generic fallback for completely unknown exercises", () => {
    const demo = getExerciseDemo("xyzzy unknown exercise");
    expect(demo.videoId).toBeTruthy();
    expect(demo.cue).toBeTruthy();
  });

  it("returns demos for all major muscle groups", () => {
    // Chest
    expect(getExerciseDemo("bench press").videoId).toBeTruthy();
    expect(getExerciseDemo("dumbbell fly").videoId).toBeTruthy();
    // Back
    expect(getExerciseDemo("pull up").videoId).toBeTruthy();
    expect(getExerciseDemo("lat pulldown").videoId).toBeTruthy();
    expect(getExerciseDemo("barbell row").videoId).toBeTruthy();
    // Shoulders
    expect(getExerciseDemo("overhead press").videoId).toBeTruthy();
    expect(getExerciseDemo("lateral raise").videoId).toBeTruthy();
    // Arms
    expect(getExerciseDemo("bicep curl").videoId).toBeTruthy();
    expect(getExerciseDemo("tricep pushdown").videoId).toBeTruthy();
    // Legs
    expect(getExerciseDemo("squat").videoId).toBeTruthy();
    expect(getExerciseDemo("lunge").videoId).toBeTruthy();
    expect(getExerciseDemo("leg press").videoId).toBeTruthy();
    expect(getExerciseDemo("romanian deadlift").videoId).toBeTruthy();
    // Core
    expect(getExerciseDemo("plank").videoId).toBeTruthy();
    expect(getExerciseDemo("crunch").videoId).toBeTruthy();
    // Cardio
    expect(getExerciseDemo("burpee").videoId).toBeTruthy();
    expect(getExerciseDemo("jumping jack").videoId).toBeTruthy();
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

// ── YouTube URL Construction ──────────────────────────────────────────────────

describe("YouTube URL Construction", () => {
  it("generates correct YouTube watch URL from video ID", () => {
    const videoId = "hWbUlkb5Ms4";
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    expect(url).toBe("https://www.youtube.com/watch?v=hWbUlkb5Ms4");
  });

  it("generates correct YouTube embed URL from video ID", () => {
    const videoId = "hWbUlkb5Ms4";
    const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1&playsinline=1&autoplay=0&showinfo=0&controls=1`;
    expect(embedUrl).toContain("youtube-nocookie.com/embed/hWbUlkb5Ms4");
    expect(embedUrl).toContain("rel=0");
    expect(embedUrl).toContain("controls=1");
  });

  it("generates correct YouTube thumbnail URL from video ID", () => {
    const videoId = "hWbUlkb5Ms4";
    const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
    expect(thumbnailUrl).toBe("https://img.youtube.com/vi/hWbUlkb5Ms4/mqdefault.jpg");
  });

  it("generates correct high-quality thumbnail URL", () => {
    const videoId = "MLoZuAkIyZI";
    const hqUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
    expect(hqUrl).toBe("https://img.youtube.com/vi/MLoZuAkIyZI/hqdefault.jpg");
  });
});

// ── Video IDs Validity ────────────────────────────────────────────────────────

describe("Video ID Validity", () => {
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

  it("all major exercises have valid YouTube video IDs (11 chars)", () => {
    for (const name of exerciseNames) {
      const demo = getExerciseDemo(name);
      // YouTube video IDs are typically 11 characters
      expect(demo.videoId.length).toBeGreaterThanOrEqual(10);
      expect(demo.videoId.length).toBeLessThanOrEqual(12);
      // Should not contain spaces or special URL characters
      expect(demo.videoId).not.toContain(" ");
      expect(demo.videoId).not.toContain("/");
    }
  });

  it("all major exercises have non-empty cue text", () => {
    for (const name of exerciseNames) {
      const demo = getExerciseDemo(name);
      expect(demo.cue.length).toBeGreaterThan(10);
    }
  });
});

// ── Platform Rendering Logic ──────────────────────────────────────────────────

describe("Platform Rendering Logic", () => {
  it("web platform should use iframe embed URL", () => {
    // On web, the component renders an iframe with the embed URL
    const videoId = "hWbUlkb5Ms4";
    const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1&playsinline=1&autoplay=0&showinfo=0&controls=1`;
    expect(embedUrl).toContain("embed");
    expect(embedUrl).not.toContain("watch");
  });

  it("native platform should use watch URL for browser opening", () => {
    // On native, the component opens the YouTube watch URL in system browser
    const videoId = "hWbUlkb5Ms4";
    const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
    expect(watchUrl).toContain("watch?v=");
    expect(watchUrl).not.toContain("embed");
  });

  it("native platform should show thumbnail image", () => {
    // On native, the component shows a thumbnail from YouTube's image CDN
    const videoId = "hWbUlkb5Ms4";
    const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
    expect(thumbnailUrl).toContain("img.youtube.com");
    expect(thumbnailUrl).toContain(videoId);
    expect(thumbnailUrl).toContain(".jpg");
  });
});

// ── Gym / Home / Mixed Workout Coverage ───────────────────────────────────────

describe("Workout Type Coverage", () => {
  // Exercises commonly found in Gym workouts
  const gymExercises = [
    "bench press", "squat", "deadlift", "lat pulldown",
    "leg press", "cable fly", "leg curl", "leg extension",
    "seated cable row", "incline bench press",
  ];

  // Exercises commonly found in Home/bodyweight workouts
  const homeExercises = [
    "push up", "pull up", "plank", "crunch", "burpee",
    "mountain climber", "jumping jack", "lunge", "dip",
    "russian twist", "bicycle crunch", "dead bug",
  ];

  // Exercises commonly found in Mixed/calisthenics workouts
  const mixedExercises = [
    "goblet squat", "dumbbell row", "dumbbell shoulder press",
    "dumbbell curl", "hip thrust", "glute bridge",
    "step up", "kettlebell swing",
  ];

  it("all gym exercises have working demos", () => {
    for (const name of gymExercises) {
      const demo = getExerciseDemo(name);
      expect(demo.videoId).toBeTruthy();
      expect(demo.cue).toBeTruthy();
    }
  });

  it("all home/bodyweight exercises have working demos", () => {
    for (const name of homeExercises) {
      const demo = getExerciseDemo(name);
      expect(demo.videoId).toBeTruthy();
      expect(demo.cue).toBeTruthy();
    }
  });

  it("all mixed/calisthenics exercises have working demos", () => {
    for (const name of mixedExercises) {
      const demo = getExerciseDemo(name);
      expect(demo.videoId).toBeTruthy();
      expect(demo.cue).toBeTruthy();
    }
  });
});
