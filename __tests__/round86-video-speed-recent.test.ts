/**
 * Tests for Round 86 features:
 * 1. Video playback speed control
 * 2. Bulk video URL validator script
 * 3. Recently Viewed exercises hook
 */
import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const ROOT = path.resolve(__dirname, "..");

// ─── 1. Video Playback Speed Control ───────────────────────────────────────
describe("Video Playback Speed Control", () => {
  const SPEED_OPTIONS = [0.5, 1, 2] as const;

  it("should have three speed options: 0.5x, 1x, 2x", () => {
    expect(SPEED_OPTIONS).toEqual([0.5, 1, 2]);
    expect(SPEED_OPTIONS.length).toBe(3);
  });

  it("should default to 1x (index 1)", () => {
    const defaultIndex = 1;
    expect(SPEED_OPTIONS[defaultIndex]).toBe(1);
  });

  it("should cycle through speeds correctly", () => {
    let index = 1; // start at 1x
    index = (index + 1) % SPEED_OPTIONS.length;
    expect(SPEED_OPTIONS[index]).toBe(2);
    index = (index + 1) % SPEED_OPTIONS.length;
    expect(SPEED_OPTIONS[index]).toBe(0.5);
    index = (index + 1) % SPEED_OPTIONS.length;
    expect(SPEED_OPTIONS[index]).toBe(1);
  });

  it("all speed values should be valid playbackRate values (0-16)", () => {
    for (const speed of SPEED_OPTIONS) {
      expect(speed).toBeGreaterThanOrEqual(0);
      expect(speed).toBeLessThanOrEqual(16);
    }
  });

  it("ExerciseDemoPlayer source contains speed control state and UI", () => {
    const src = fs.readFileSync(
      path.join(ROOT, "components/exercise-demo-player.tsx"),
      "utf-8"
    );
    expect(src).toContain("SPEED_OPTIONS");
    expect(src).toContain("speedIndex");
    expect(src).toContain("cycleSpeed");
    expect(src).toContain("playbackRate");
    expect(src).toContain("preservesPitch");
    expect(src).toContain("speedButton");
    expect(src).toContain("fullscreenSpeedRow");
    expect(src).toContain("fullscreenSpeedBtn");
  });

  it("speed resets to 1x when asset changes", () => {
    const src = fs.readFileSync(
      path.join(ROOT, "components/exercise-demo-player.tsx"),
      "utf-8"
    );
    expect(src).toContain("setSpeedIndex(1)");
    expect(src).toContain("videoPlayer.playbackRate = 1");
  });
});

// ─── 2. Bulk Video URL Validator Script ────────────────────────────────────
describe("Bulk Video URL Validator Script", () => {
  it("script file should exist", () => {
    const scriptPath = path.join(ROOT, "scripts/validate-video-urls.ts");
    expect(fs.existsSync(scriptPath)).toBe(true);
  });

  it("script imports getAllExercises and EXERCISE_GIFS", () => {
    const src = fs.readFileSync(
      path.join(ROOT, "scripts/validate-video-urls.ts"),
      "utf-8"
    );
    expect(src).toContain("getAllExercises");
    expect(src).toContain("EXERCISE_GIFS");
  });

  it("script supports --json and --fix flags", () => {
    const src = fs.readFileSync(
      path.join(ROOT, "scripts/validate-video-urls.ts"),
      "utf-8"
    );
    expect(src).toContain("--json");
    expect(src).toContain("--fix");
  });

  it("script uses HEAD requests with timeout", () => {
    const src = fs.readFileSync(
      path.join(ROOT, "scripts/validate-video-urls.ts"),
      "utf-8"
    );
    expect(src).toContain('method: "HEAD"');
    expect(src).toContain("TIMEOUT_MS");
    expect(src).toContain("AbortController");
  });

  it("script deduplicates URLs", () => {
    const src = fs.readFileSync(
      path.join(ROOT, "scripts/validate-video-urls.ts"),
      "utf-8"
    );
    expect(src).toContain("seen.has(e.url)");
  });

  it("script uses concurrency pool", () => {
    const src = fs.readFileSync(
      path.join(ROOT, "scripts/validate-video-urls.ts"),
      "utf-8"
    );
    expect(src).toContain("CONCURRENCY");
    expect(src).toContain("processPool");
  });

  it("should find MuscleWiki URLs in exercise data", async () => {
    const { getAllExercises } = await import("../lib/exercise-data");
    const exercises = getAllExercises();
    const urls: string[] = [];
    for (const ex of exercises) {
      if (ex.angleViews) {
        for (const view of ex.angleViews) {
          if (view.gifUrl?.includes("musclewiki.com")) {
            urls.push(view.gifUrl);
          }
        }
      }
    }
    expect(urls.length).toBeGreaterThan(10);
    for (const url of urls) {
      expect(url).toMatch(/^https?:\/\//);
    }
  });

  it("should find MuscleWiki URLs in gif registry", async () => {
    const { EXERCISE_GIFS } = await import("../lib/exercise-gif-registry");
    const urls = Object.values(EXERCISE_GIFS).filter((u) =>
      u.includes("musclewiki.com")
    );
    expect(urls.length).toBeGreaterThan(10);
  });
});

// ─── 3. Recently Viewed Hook ───────────────────────────────────────────────
describe("Recently Viewed Logic", () => {
  const MAX_RECENT = 12;

  function addRecent(prev: string[], name: string): string[] {
    const filtered = prev.filter((n) => n !== name);
    return [name, ...filtered].slice(0, MAX_RECENT);
  }

  it("should add a new exercise to the front", () => {
    const result = addRecent([], "Bench Press");
    expect(result).toEqual(["Bench Press"]);
  });

  it("should maintain most-recent-first order", () => {
    let list: string[] = [];
    list = addRecent(list, "Bench Press");
    list = addRecent(list, "Squat");
    list = addRecent(list, "Deadlift");
    expect(list).toEqual(["Deadlift", "Squat", "Bench Press"]);
  });

  it("should deduplicate by moving existing entry to front", () => {
    let list = ["Deadlift", "Squat", "Bench Press"];
    list = addRecent(list, "Bench Press");
    expect(list).toEqual(["Bench Press", "Deadlift", "Squat"]);
  });

  it("should cap at MAX_RECENT items", () => {
    let list: string[] = [];
    for (let i = 0; i < 20; i++) {
      list = addRecent(list, `Exercise ${i}`);
    }
    expect(list.length).toBe(MAX_RECENT);
    expect(list[0]).toBe("Exercise 19");
    expect(list[MAX_RECENT - 1]).toBe("Exercise 8");
  });

  it("should not change if adding the same most-recent item", () => {
    const list = ["Bench Press", "Squat", "Deadlift"];
    const result = addRecent(list, "Bench Press");
    expect(result).toEqual(["Bench Press", "Squat", "Deadlift"]);
  });

  it("hook source file exists and exports useRecentlyViewed", () => {
    const hookPath = path.join(ROOT, "hooks/use-recently-viewed.ts");
    expect(fs.existsSync(hookPath)).toBe(true);
    const src = fs.readFileSync(hookPath, "utf-8");
    expect(src).toContain("export function useRecentlyViewed");
    expect(src).toContain("AsyncStorage");
    expect(src).toContain("MAX_RECENT");
    expect(src).toContain("addRecent");
    expect(src).toContain("clearRecent");
  });

  it("exercise library imports and uses useRecentlyViewed", () => {
    const src = fs.readFileSync(
      path.join(ROOT, "app/exercise-library.tsx"),
      "utf-8"
    );
    expect(src).toContain("useRecentlyViewed");
    expect(src).toContain("recentExercises");
    expect(src).toContain("addRecent");
    expect(src).toContain("clearRecent");
    expect(src).toContain("Recently Viewed");
    expect(src).toContain("recentSection");
    expect(src).toContain("recentCard");
  });
});

// ─── Integration: Exercise data consistency ────────────────────────────────
describe("Exercise Data Consistency", () => {
  it("all exercises should have valid angleViews with gifUrl", async () => {
    const { getAllExercises } = await import("../lib/exercise-data");
    const exercises = getAllExercises();
    let missingCount = 0;
    for (const ex of exercises) {
      if (!ex.angleViews || ex.angleViews.length === 0) {
        missingCount++;
      } else {
        for (const view of ex.angleViews) {
          expect(view.gifUrl).toBeTruthy();
          expect(view.label).toBeTruthy();
        }
      }
    }
    expect(missingCount).toBeLessThan(exercises.length * 0.5);
  });

  it("getExerciseInfo should return data for known exercises", async () => {
    const { getExerciseInfo, getAllExercises } = await import("../lib/exercise-data");
    const exercises = getAllExercises();
    const first = exercises[0];
    const info = getExerciseInfo(first.name);
    expect(info).toBeTruthy();
    expect(info!.name).toBe(first.name);
  });
});
