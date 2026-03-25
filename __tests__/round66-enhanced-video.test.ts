import { describe, it, expect } from "vitest";

// ── Exercise Demos Tests ──────────────────────────────────────────────────────
describe("Exercise Demos with GIF URLs", () => {
  it("getExerciseDemo returns gifUrl for all exercises", async () => {
    const { getExerciseDemo } = await import("../lib/exercise-demos");

    const exercises = [
      "bench press", "push up", "dumbbell fly", "incline bench press",
      "pull up", "lat pulldown", "deadlift", "bent over row",
      "overhead press", "lateral raise", "face pull", "arnold press",
      "bicep curl", "hammer curl", "tricep pushdown", "skull crusher",
      "squat", "front squat", "lunge", "leg press", "hip thrust",
      "plank", "crunch", "russian twist", "mountain climber",
      "burpee", "kettlebell swing", "box jump", "jumping jack",
    ];

    for (const name of exercises) {
      const demo = getExerciseDemo(name);
      expect(demo.gifUrl).toBeTruthy();
      expect(demo.gifUrl).toMatch(/^https?:\/\//);
      expect(demo.gifUrl).toContain(".gif");
    }
  });

  it("ExerciseDemo interface has all required fields", async () => {
    const { getExerciseDemo } = await import("../lib/exercise-demos");
    const demo = getExerciseDemo("bench press");

    expect(demo).toHaveProperty("gifUrl");
    expect(demo).toHaveProperty("cue");
    expect(typeof demo.gifUrl).toBe("string");
    expect(typeof demo.cue).toBe("string");
  });

  it("GIF URLs are from ExerciseDB CDN", async () => {
    const { getExerciseDemo } = await import("../lib/exercise-demos");
    const demo = getExerciseDemo("squat");
    expect(demo.gifUrl).toContain("exercisedb.dev");
  });

  it("Gym exercises have GIF URLs", async () => {
    const { getExerciseDemo } = await import("../lib/exercise-demos");
    const gymExercises = [
      "bench press", "lat pulldown", "leg press", "cable fly",
      "seated cable row", "leg extension", "leg curl", "hack squat",
    ];
    for (const name of gymExercises) {
      const demo = getExerciseDemo(name);
      expect(demo.gifUrl).toBeTruthy();
      expect(demo.gifUrl).toContain(".gif");
    }
  });

  it("Home exercises have GIF URLs", async () => {
    const { getExerciseDemo } = await import("../lib/exercise-demos");
    const homeExercises = [
      "push up", "plank", "burpee", "mountain climber",
      "jumping jack", "high knees", "glute bridge", "bicycle crunch",
    ];
    for (const name of homeExercises) {
      const demo = getExerciseDemo(name);
      expect(demo.gifUrl).toBeTruthy();
      expect(demo.gifUrl).toContain(".gif");
    }
  });

  it("Mixed exercises have GIF URLs", async () => {
    const { getExerciseDemo } = await import("../lib/exercise-demos");
    const mixedExercises = [
      "dumbbell row", "goblet squat", "dumbbell shoulder press",
      "dumbbell curl", "romanian deadlift", "step up",
    ];
    for (const name of mixedExercises) {
      const demo = getExerciseDemo(name);
      expect(demo.gifUrl).toBeTruthy();
      expect(demo.gifUrl).toContain(".gif");
    }
  });

  it("Alias exercises share the same gifUrl", async () => {
    const { getExerciseDemo } = await import("../lib/exercise-demos");

    const aliases = [
      ["push up", "pushup"],
      ["pull up", "pullup"],
      ["dumbbell fly", "dumbbell flye"],
      ["leg curl", "hamstring curl"],
    ];

    for (const [canonical, alias] of aliases) {
      const canonicalDemo = getExerciseDemo(canonical);
      const aliasDemo = getExerciseDemo(alias);
      expect(aliasDemo.gifUrl).toBe(canonicalDemo.gifUrl);
      expect(aliasDemo.gifUrl).toBeTruthy();
      expect(aliasDemo.gifUrl).toContain(".gif");
    }
  });

  it("Generic fallback includes gifUrl", async () => {
    const { getExerciseDemo } = await import("../lib/exercise-demos");
    const demo = getExerciseDemo("some unknown exercise xyz");
    expect(demo.gifUrl).toBeTruthy();
    expect(demo.gifUrl).toContain(".gif");
    expect(demo.cue).toBeTruthy();
  });

  it("Keyword fallback exercises include gifUrl", async () => {
    const { getExerciseDemo } = await import("../lib/exercise-demos");
    const keywordExercises = [
      "barbell back squat variation",
      "incline dumbbell curl",
      "cable tricep overhead extension",
    ];
    for (const name of keywordExercises) {
      const demo = getExerciseDemo(name);
      expect(demo.gifUrl).toBeTruthy();
    }
  });
});

// ── GIF Player Components ───────────────────────────────────────────────────
describe("GIF Player Components", () => {
  it("exercise-demo-player has fullscreen capability", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("/home/ubuntu/peakpulse-mobile/components/exercise-demo-player.tsx", "utf-8");
    expect(content).toContain("ExerciseDemoPlayer");
    expect(content).toContain("fullscreen");
    expect(content).toContain("Modal");
    expect(content).toContain("fullscreenOverlay");
    expect(content).toContain("expandButton");
  });

  it("enhanced-gif-player has fullscreen and multi-angle support", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("/home/ubuntu/peakpulse-mobile/components/enhanced-gif-player.tsx", "utf-8");
    expect(content).toContain("EnhancedGifPlayer");
    expect(content).toContain("fullscreen");
    expect(content).toContain("Modal");
    expect(content).toContain("angleViews");
    expect(content).toContain("expandBtn");
    expect(content).toContain("slow-motion");
    expect(content).toContain("loop");
  });

  it("no YouTube player component exists", async () => {
    const fs = await import("fs");
    expect(() => {
      fs.readFileSync("/home/ubuntu/peakpulse-mobile/components/youtube-player.tsx", "utf-8");
    }).toThrow();
  });
});

// ── Integration: All workout types covered ────────────────────────────────────
describe("All workout types have complete demo data", () => {
  it("Every exercise has gifUrl and cue", async () => {
    const { getExerciseDemo } = await import("../lib/exercise-demos");

    const allExercises = [
      // Chest
      "bench press", "push up", "dumbbell fly", "incline bench press",
      "incline dumbbell press", "decline bench press", "cable fly",
      "cable crossover", "dip", "chest dip",
      // Back
      "pull up", "chin up", "lat pulldown", "bent over row",
      "dumbbell row", "seated cable row", "deadlift", "t-bar row", "pendlay row",
      // Shoulders
      "overhead press", "dumbbell shoulder press", "lateral raise",
      "front raise", "face pull", "rear delt fly", "arnold press",
      "upright row", "shrug",
      // Arms
      "bicep curl", "barbell curl", "dumbbell curl", "hammer curl",
      "preacher curl", "concentration curl", "tricep pushdown",
      "tricep extension", "overhead tricep extension", "skull crusher",
      "close grip bench press",
      // Legs
      "squat", "front squat", "goblet squat", "bulgarian split squat",
      "lunge", "reverse lunge", "leg press", "leg curl", "leg extension",
      "romanian deadlift", "stiff leg deadlift", "sumo deadlift",
      "hip thrust", "glute bridge", "calf raise", "seated calf raise",
      "hack squat", "step up",
      // Core
      "plank", "side plank", "crunch", "sit up", "russian twist",
      "mountain climber", "leg raise", "hanging leg raise",
      "ab wheel rollout", "bicycle crunch", "dead bug", "cable woodchop",
      // Cardio
      "burpee", "jumping jack", "box jump", "kettlebell swing",
      "battle rope", "jump rope", "high knees", "sprint",
    ];

    let missingGif = 0;
    let missingCue = 0;

    for (const name of allExercises) {
      const demo = getExerciseDemo(name);
      if (!demo.gifUrl) missingGif++;
      if (!demo.cue) missingCue++;
    }

    expect(missingGif).toBe(0);
    expect(missingCue).toBe(0);
  });
});
