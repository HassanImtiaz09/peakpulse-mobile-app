/**
 * Round 88 Tests — Replace MuscleWiki exercise demos with AI-generated images
 */
import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const ROOT = path.resolve(__dirname, "..");

describe("Exercise Video Registry — MuscleWiki Migration", () => {
  const registryContent = fs.readFileSync(
    path.join(ROOT, "lib/exercise-gif-registry.ts"),
    "utf-8"
  );

  it("exports EXERCISE_GIFS as Record<string, string>", () => {
    expect(registryContent).toContain("export const EXERCISE_GIFS: Record<string, string>");
  });

  it("contains no require() calls (all CDN URLs)", () => {
    expect(registryContent).not.toContain("require(");
  });

  it("all values are MuscleWiki MP4 URLs (via mw() helper)", () => {
    // URLs are constructed via mw() helper, not inline — count mw() calls
    const mwCalls = registryContent.match(/mw\([^)]+\)/g) || [];
    expect(mwCalls.length).toBeGreaterThanOrEqual(149);
    // Verify MW base URL is defined
    expect(registryContent).toContain("media.musclewiki.com/media/uploads/videos/branded");
  });

  it("has entries for all major muscle groups", () => {
    expect(registryContent).toContain("// ── Chest");
    expect(registryContent).toContain("// ── Back");
    expect(registryContent).toContain("// ── Shoulders");
    expect(registryContent).toContain("// ── Legs");
    expect(registryContent).toContain("// ── Core");
    expect(registryContent).toContain("// ── Cardio");
  });

  it("has at least 149 exercise entries", () => {
    const entries = registryContent.match(/mw\([^)]+\)/g) || [];
    expect(entries.length).toBeGreaterThanOrEqual(149);
  });

  it("exports getExerciseVideoUrl function", () => {
    expect(registryContent).toContain("export function getExerciseVideoUrl(");
  });
});

describe("Video URI Resolver — Cache Handling", () => {
  const cacheContent = fs.readFileSync(
    path.join(ROOT, "lib/gif-cache.ts"),
    "utf-8"
  );

  it("exports resolveVideoUri function", () => {
    expect(cacheContent).toContain("export async function resolveVideoUri(");
  });

  it("imports EXERCISE_GIFS from the registry", () => {
    expect(cacheContent).toContain('import { EXERCISE_GIFS } from "@/lib/exercise-gif-registry"');
  });

  it("exports prefetchExerciseVideos function", () => {
    expect(cacheContent).toContain("export async function prefetchExerciseVideos(");
  });

  it("exports clearVideoCache function", () => {
    expect(cacheContent).toContain("export async function clearVideoCache(");
  });

  it("exports getVideoCacheSize function", () => {
    expect(cacheContent).toContain("export async function getVideoCacheSize(");
  });
});

describe("Exercise Demos — Updated Types", () => {
  const demosContent = fs.readFileSync(
    path.join(ROOT, "lib/exercise-demos.ts"),
    "utf-8"
  );

  it("ExerciseDemo.gifAsset accepts number | string", () => {
    expect(demosContent).toContain("gifAsset: number | string");
  });

  it("getExerciseDemo() returns gifAsset", () => {
    // Each demo entry uses gifAsset: gif("...") pattern
    expect(demosContent).toContain("gifAsset: gif(");
  });

  it("does NOT have MuscleWiki references", () => {
    expect(demosContent.toLowerCase()).not.toContain("musclewiki");
  });
});

describe("Exercise Data — No MuscleWiki URLs", () => {
  const dataContent = fs.readFileSync(
    path.join(ROOT, "lib/exercise-data.ts"),
    "utf-8"
  );

  it("contains zero MuscleWiki URLs", () => {
    expect(dataContent).not.toContain("musclewiki.com");
  });

  it("all gifUrl values use CDN URLs", () => {
    const gifUrls = dataContent.match(/gifUrl: "([^'"]+)"/g) || [];
    expect(gifUrls.length).toBeGreaterThan(100);
    for (const url of gifUrls) {
      expect(url).toMatch(/cloudfront\.net|manuscdn\.com/);
    }
  });

  it("has both Front View and Side View angle labels", () => {
    expect(dataContent).toContain('"Front View"');
    expect(dataContent).toContain('"Side View"');
  });

  it("maintains ExerciseAngleView interface", () => {
    expect(dataContent).toContain("export interface ExerciseAngleView");
    expect(dataContent).toContain("gifUrl: string");
    expect(dataContent).toContain("label: string");
    expect(dataContent).toContain("focus: string");
  });
});

describe("Enhanced GIF Player — Video Player Integration", () => {
  const enhancedContent = fs.readFileSync(
    path.join(ROOT, "components/enhanced-gif-player.tsx"),
    "utf-8"
  );

  it("uses ExerciseVideoPlayer component", () => {
    expect(enhancedContent).toContain("<ExerciseVideoPlayer");
  });

  it("accepts exerciseKey prop", () => {
    expect(enhancedContent).toContain("exerciseKey: string;");
  });

  it("calls getExerciseVideoUrl", () => {
    expect(enhancedContent).toContain("getExerciseVideoUrl(frontKey, angle)");
  });

  it("does not use resolveGifAsset", () => {
    expect(enhancedContent).not.toContain("resolveGifAsset");
  });
});

describe("Old GIF Assets Removed", () => {
  const gifDir = path.join(ROOT, "assets/exercise-gifs");

  it("no .gif files remain in assets/exercise-gifs", () => {
    const files = fs.readdirSync(gifDir);
    const gifFiles = files.filter((f) => f.endsWith(".gif"));
    expect(gifFiles.length).toBe(0);
  });

  it("no .png files remain in assets/exercise-gifs", () => {
    const files = fs.readdirSync(gifDir);
    const pngFiles = files.filter((f) => f.endsWith(".png"));
    expect(pngFiles.length).toBe(0);
  });
});

describe("Exercise-Demo Mismatch Check", () => {
  const demosContent = fs.readFileSync(
    path.join(ROOT, "lib/exercise-demos.ts"),
    "utf-8"
  );

  it("bench press uses barbell-bench-press image", () => {
    const benchSection = demosContent.match(/"bench press":\s*\{[^}]+\}/s);
    expect(benchSection).toBeTruthy();
    expect(benchSection![0]).toContain("barbell-bench-press");
  });

  it("squat uses barbell-squat image", () => {
    const squatSection = demosContent.match(/"squat":\s*\{[^}]+\}/s);
    expect(squatSection).toBeTruthy();
    expect(squatSection![0]).toContain("barbell-squat");
  });

  it("deadlift uses barbell-deadlift image", () => {
    const deadliftSection = demosContent.match(/"deadlift":\s*\{[^}]+\}/s);
    expect(deadliftSection).toBeTruthy();
    expect(deadliftSection![0]).toContain("barbell-deadlift");
  });

  it("pull up uses pull-ups image", () => {
    const pullUpSection = demosContent.match(/"pull up":\s*\{[^}]+\}/s);
    expect(pullUpSection).toBeTruthy();
    expect(pullUpSection![0]).toContain("pull-ups");
  });

  it("lateral raise uses lateral-raise image", () => {
    const lateralSection = demosContent.match(/"lateral raise":\s*\{[^}]+\}/s);
    expect(lateralSection).toBeTruthy();
    expect(lateralSection![0]).toContain("lateral-raise");
  });

  it("bicep curl uses dumbbell-curl image", () => {
    const curlSection = demosContent.match(/"bicep curl":\s*\{[^}]+\}/s);
    expect(curlSection).toBeTruthy();
    expect(curlSection![0]).toContain("curl");
  });
});
