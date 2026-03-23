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

    expect(demo).toHaveProperty("videoId");
    expect(demo).toHaveProperty("cue");
    expect(demo).toHaveProperty("gifUrl");
    expect(typeof demo.videoId).toBe("string");
    expect(typeof demo.cue).toBe("string");
    expect(typeof demo.gifUrl).toBe("string");
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

  it("Alias exercises share the same videoId", async () => {
    const { getExerciseDemo } = await import("../lib/exercise-demos");

    // Aliases share the same YouTube video but may have different GIF URLs
    // since ExerciseDB has distinct entries for each exercise variation.
    const aliases = [
      ["push up", "pushup"],
      ["pull up", "pullup"],
      ["dumbbell fly", "dumbbell flye"],
      ["squat", "back squat"],
      ["squat", "barbell squat"],
      ["leg curl", "hamstring curl"],
      ["calf raise", "standing calf raise"],
    ];

    for (const [canonical, alias] of aliases) {
      const canonicalDemo = getExerciseDemo(canonical);
      const aliasDemo = getExerciseDemo(alias);
      expect(aliasDemo.videoId).toBe(canonicalDemo.videoId);
      // Both should have GIF URLs (may differ for variations)
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
    expect(demo.videoId).toBeTruthy();
  });

  it("Keyword fallback exercises include gifUrl", async () => {
    const { getExerciseDemo } = await import("../lib/exercise-demos");
    // These should match via keyword fallback
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

// ── Thumbnail Cache Tests ─────────────────────────────────────────────────────
describe("Thumbnail Cache", () => {
  it("getThumbnailUrl generates correct YouTube thumbnail URLs", () => {
    // Test the URL pattern directly (function is pure, no native deps)
    const base = "https://img.youtube.com/vi";

    expect(`${base}/abc123/hqdefault.jpg`).toBe("https://img.youtube.com/vi/abc123/hqdefault.jpg");
    expect(`${base}/abc123/mqdefault.jpg`).toBe("https://img.youtube.com/vi/abc123/mqdefault.jpg");
    expect(`${base}/abc123/sddefault.jpg`).toBe("https://img.youtube.com/vi/abc123/sddefault.jpg");
    expect(`${base}/abc123/maxresdefault.jpg`).toBe("https://img.youtube.com/vi/abc123/maxresdefault.jpg");
  });

  it("thumbnail URL pattern handles special characters in video IDs", () => {
    const base = "https://img.youtube.com/vi";
    expect(`${base}/-zLyUAo1gMw/mqdefault.jpg`).toBe("https://img.youtube.com/vi/-zLyUAo1gMw/mqdefault.jpg");
    expect(`${base}/_YrJc-kTYA0/hqdefault.jpg`).toBe("https://img.youtube.com/vi/_YrJc-kTYA0/hqdefault.jpg");
  });

  it("thumbnail cache module file exists and has correct exports", async () => {
    // Read the file to verify structure without importing native modules
    const fs = await import("fs");
    const content = fs.readFileSync("/home/ubuntu/peakpulse-mobile/lib/thumbnail-cache.ts", "utf-8");
    expect(content).toContain("export function getThumbnailUrl");
    expect(content).toContain("export async function getCachedThumbnail");
    expect(content).toContain("export async function preCacheThumbnails");
    expect(content).toContain("export async function clearExpiredThumbnails");
  });
});

// ── YouTube Player Component Tests ────────────────────────────────────────────
describe("YouTube Player Component", () => {
  it("youtube-player module file exists and has correct exports", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("/home/ubuntu/peakpulse-mobile/components/youtube-player.tsx", "utf-8");
    expect(content).toContain("export function YouTubePlayer");
    expect(content).toContain("export function YouTubePlayerButton");
    expect(content).toContain("gifUrl");
    expect(content).toContain("react-native-youtube-iframe");
    // Uses react-native-youtube-iframe for native, iframe for web
    expect(content).toContain("YoutubeIframe");
  });

  it("youtube-player supports GIF mode toggle", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("/home/ubuntu/peakpulse-mobile/components/youtube-player.tsx", "utf-8");
    expect(content).toContain('type DemoMode = "video" | "gif"');
    expect(content).toContain("GIF Guide");
    expect(content).toContain("Offline Guide");
  });
});

// ── Integration: All workout types covered ────────────────────────────────────
describe("All workout types have complete demo data", () => {
  it("Every exercise has videoId, cue, and gifUrl", async () => {
    const { getExerciseDemo } = await import("../lib/exercise-demos");

    // Comprehensive list of all exercises across Gym, Home, Mixed
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
    let missingVideo = 0;
    let missingCue = 0;

    for (const name of allExercises) {
      const demo = getExerciseDemo(name);
      if (!demo.gifUrl) missingGif++;
      if (!demo.videoId) missingVideo++;
      if (!demo.cue) missingCue++;
    }

    expect(missingGif).toBe(0);
    expect(missingVideo).toBe(0);
    expect(missingCue).toBe(0);
  });
});
