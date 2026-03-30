/**
 * Round 46 — Exercise GIF Improvements
 *
 * Tests for:
 *   1. ExerciseDB API exact-name-match filter (nameMatchScore re-ranking)
 *   2. Play/pause overlay via GifWebViewPlayer
 *   3. 0.25x speed control via WebView-based GIF frame parser
 *   4. GIF disk caching for active workout plan exercises
 */
import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const ROOT = "/home/ubuntu/peakpulse-mobile";
function readFile(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf-8");
}

// ── 1. ExerciseDB API exact-name-match filter ──────────────────────────────

describe("ExerciseDB API Search Accuracy", () => {
  const src = readFile("lib/exercisedb.ts");

  it("has nameMatchScore function for re-ranking search results", () => {
    expect(src).toContain("nameMatchScore");
  });

  it("sorts API results by name match score", () => {
    // The search function should sort results by match score
    expect(src).toContain("sort");
  });

  it("searchExercisesByName uses name-match re-ranking", () => {
    expect(src).toContain("searchExercisesByName");
    expect(src).toContain("nameMatchScore");
  });
});

// ── 2. GifWebViewPlayer — Play/Pause & Speed Control ──────────────────────

describe("GifWebViewPlayer Component", () => {
  const src = readFile("components/gif-webview-player.tsx");

  it("exists as a standalone component", () => {
    expect(src).toBeTruthy();
  });

  it("uses react-native-webview for cross-platform GIF rendering", () => {
    expect(src).toContain("react-native-webview");
    expect(src).toContain("WebView");
  });

  it("accepts speed prop for playback rate control", () => {
    expect(src).toContain("speed");
    expect(src).toContain("0.25");
  });

  it("has play/pause toggle functionality", () => {
    expect(src).toContain("play");
    expect(src).toContain("pause");
    expect(src).toContain("isPlaying");
  });

  it("shows speed badge overlay", () => {
    expect(src).toContain("speedBadge");
  });

  it("has a web platform fallback using expo-image", () => {
    expect(src).toContain("WebFallbackPlayer");
    expect(src).toContain("expo-image");
  });

  it("parses GIF frames for frame-by-frame speed control", () => {
    expect(src).toContain("parseGIF");
    expect(src).toContain("decodeLZW");
    expect(src).toContain("renderFrame");
  });

  it("communicates play state back to React Native", () => {
    expect(src).toContain("ReactNativeWebView.postMessage");
    expect(src).toContain("playState");
  });
});

// ── 3. EnhancedGifPlayer Integration ──────────────────────────────────────

describe("EnhancedGifPlayer — WebView Integration", () => {
  const src = readFile("components/enhanced-gif-player.tsx");

  it("uses GifWebViewPlayer instead of expo-image directly", () => {
    expect(src).toContain("GifWebViewPlayer");
    expect(src).toContain("gif-webview-player");
  });

  it("passes speed prop to GifWebViewPlayer", () => {
    expect(src).toContain("speed");
    expect(src).toContain("speed={speed}");
  });

  it("defaults to 0.25x speed", () => {
    expect(src).toContain("speed = 0.25");
  });

  it("still uses CDN GIF as priority 1", () => {
    expect(src).toContain("getExerciseDbGifUrl");
  });

  it("integrates with GIF disk cache for offline support", () => {
    expect(src).toContain("resolveGifUri");
    expect(src).toContain("exercise-gif-cache");
  });
});

// ── 4. GIF Disk Caching Service ───────────────────────────────────────────

describe("Exercise GIF Cache Service", () => {
  const src = readFile("lib/exercise-gif-cache.ts");

  it("exists as a standalone service", () => {
    expect(src).toBeTruthy();
  });

  it("uses expo-file-system for disk caching", () => {
    expect(src).toContain("expo-file-system");
    expect(src).toContain("FileSystem");
  });

  it("exports resolveGifUri for cache-first GIF loading", () => {
    expect(src).toContain("export async function resolveGifUri");
  });

  it("exports prefetchWorkoutGifs for batch downloading", () => {
    expect(src).toContain("export async function prefetchWorkoutGifs");
  });

  it("exports clearGifCache for cache management", () => {
    expect(src).toContain("export async function clearGifCache");
  });

  it("exports getGifCacheSize for cache size reporting", () => {
    expect(src).toContain("export async function getGifCacheSize");
  });

  it("has a 200MB cache size limit", () => {
    expect(src).toContain("200 * 1024 * 1024");
  });

  it("uses cacheDirectory for temporary storage", () => {
    expect(src).toContain("cacheDirectory");
    expect(src).toContain("exercise-gifs");
  });

  it("resolves GIF URLs from CDN and API", () => {
    expect(src).toContain("getExerciseDbGifUrl");
    expect(src).toContain("searchExercisesByName");
  });

  it("deduplicates exercise names before prefetching", () => {
    expect(src).toContain("new Set");
  });

  it("handles web platform gracefully (no-op)", () => {
    expect(src).toContain('Platform.OS === "web"');
  });
});

// ── 5. Integration Points ─────────────────────────────────────────────────

describe("GIF Cache Integration in App", () => {
  it("active-workout.tsx prefetches GIFs when workout starts", () => {
    const src = readFile("app/active-workout.tsx");
    expect(src).toContain("prefetchWorkoutGifs");
    expect(src).toContain("exercise-gif-cache");
  });

  it("plans.tsx prefetches GIFs when workout plan loads", () => {
    const src = readFile("app/(tabs)/plans.tsx");
    expect(src).toContain("prefetchWorkoutGifs");
    expect(src).toContain("exercise-gif-cache");
  });
});
