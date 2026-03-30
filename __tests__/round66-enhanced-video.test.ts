import { describe, it, expect } from "vitest";

// ── Exercise Demos Tests ──────────────────────────────────────────────────────
describe("Exercise Demos with Remote MP4 Videos", () => {
  it("getExerciseDemo returns gifAsset for all exercises", async () => {
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
      expect(demo.gifAsset).toBeDefined();
    }
  });

  it("ExerciseDemo interface has all required fields", async () => {
    const { getExerciseDemo } = await import("../lib/exercise-demos");
    const demo = getExerciseDemo("bench press");

    expect(demo).toHaveProperty("gifAsset");
    expect(demo).toHaveProperty("cue");
    expect(demo.gifAsset).toBeDefined();
    expect(typeof demo.cue).toBe("string");
  });

  it("All exercises use local or remote assets", async () => {
    const { getExerciseDemo } = await import("../lib/exercise-demos");
    const demo = getExerciseDemo("squat");
    expect(demo.gifAsset).toBeDefined();
  });

  it("Gym exercises have assets", async () => {
    const { getExerciseDemo } = await import("../lib/exercise-demos");
    const gymExercises = [
      "bench press", "lat pulldown", "leg press", "cable fly",
      "seated cable row", "leg extension", "leg curl", "hack squat",
    ];
    for (const name of gymExercises) {
      const demo = getExerciseDemo(name);
      expect(demo.gifAsset).toBeDefined();
    }
  });

  it("Home exercises have assets", async () => {
    const { getExerciseDemo } = await import("../lib/exercise-demos");
    const homeExercises = [
      "push up", "plank", "burpee", "mountain climber",
      "jumping jack", "high knees", "glute bridge", "bicycle crunch",
    ];
    for (const name of homeExercises) {
      const demo = getExerciseDemo(name);
      expect(demo.gifAsset).toBeDefined();
    }
  });

  it("Mixed exercises have assets", async () => {
    const { getExerciseDemo } = await import("../lib/exercise-demos");
    const mixedExercises = [
      "dumbbell row", "goblet squat", "dumbbell shoulder press",
      "dumbbell curl", "romanian deadlift", "step up",
    ];
    for (const name of mixedExercises) {
      const demo = getExerciseDemo(name);
      expect(demo.gifAsset).toBeDefined();
    }
  });

  it("Alias exercises share the same gifAsset", async () => {
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
      expect(aliasDemo.gifAsset).toBe(canonicalDemo.gifAsset);
      expect(aliasDemo.gifAsset).toBeDefined();
    }
  });

  it("Generic fallback includes gifAsset", async () => {
    const { getExerciseDemo } = await import("../lib/exercise-demos");
    const demo = getExerciseDemo("some unknown exercise xyz");
    expect(demo.gifAsset).toBeDefined();
    expect(demo.cue).toBeTruthy();
  });

  it("Keyword fallback exercises include gifAsset", async () => {
    const { getExerciseDemo } = await import("../lib/exercise-demos");
    const keywordExercises = [
      "barbell back squat variation",
      "incline dumbbell curl",
      "cable tricep overhead extension",
    ];
    for (const name of keywordExercises) {
      const demo = getExerciseDemo(name);
      expect(demo.gifAsset).toBeDefined();
    }
  });
});

// ── Video Player Components ───────────────────────────────────────────────────
describe("Video Player Components", () => {
  it("exercise-demo-player uses expo-image with resolveGifAsset", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("/home/ubuntu/peakpulse-mobile/components/exercise-demo-player.tsx", "utf-8");
    expect(content).toContain("expo-image");
    expect(content).toContain("Image");
    expect(content).toContain("resolveGifAsset");
    expect(content).toContain("useFavorites");
    expect(content).toContain("isFavorite");
    expect(content).toContain("toggleFavorite");
    expect(content).toContain("Modal");
    expect(content).toContain("fullscreen");
  });

  it("enhanced-gif-player uses expo-image for animated GIF display", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("/home/ubuntu/peakpulse-mobile/components/enhanced-gif-player.tsx", "utf-8");
    expect(content).toContain("Image");
    expect(content).toContain("getExerciseDbGifUrl");
    expect(content).toContain("exerciseName");
    expect(content).not.toContain("Modal");
    expect(content).not.toContain("angleViews");
    expect(content).not.toContain("resolveGifAsset");
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
  it("Every exercise has gifAsset and cue", async () => {
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

    let missingGifAsset = 0;
    let missingCue = 0;

    for (const name of allExercises) {
      const demo = getExerciseDemo(name);
      if (!demo.gifAsset) missingGifAsset++;
      if (!demo.cue) missingCue++;
    }

    expect(missingGifAsset).toBe(0);
    expect(missingCue).toBe(0);
  });
});
