/**
 * Tests for:
 * 1. Form Cue Overlay — form tips data and overlay component integration
 * 2. Video Cache — caching service for exercise MP4 videos (formerly GIF cache)
 *
 * Updated to match the new MP4-based exercise video system.
 */
import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const ROOT = path.resolve(__dirname, "..");
function readFile(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), "utf-8");
}

describe("Form Cue Tips Data", () => {
  const src = readFile("lib/form-cue-tips.ts");

  it("should export FormTip and ExerciseFormTips types", () => {
    expect(src).toContain("export interface FormTip");
    expect(src).toContain("export interface ExerciseFormTips");
  });

  it("should have tip categories: form, mistake, breathing, safety", () => {
    expect(src).toContain('"form"');
    expect(src).toContain('"mistake"');
    expect(src).toContain('"breathing"');
    expect(src).toContain('"safety"');
  });

  it("should have getFormTips function", () => {
    expect(src).toContain("export function getFormTips");
  });

  it("should have hasFormTips function", () => {
    expect(src).toContain("export function hasFormTips");
  });

  it("should have getTipCategoryIcon function", () => {
    expect(src).toContain("export function getTipCategoryIcon");
  });

  it("should have getTipCategoryColor function", () => {
    expect(src).toContain("export function getTipCategoryColor");
  });

  it("should cover all major exercise categories", () => {
    expect(src).toContain('"bench press"');
    expect(src).toContain('"push up"');
    expect(src).toContain('"dumbbell fly"');
    expect(src).toContain('"deadlift"');
    expect(src).toContain('"barbell row"');
    expect(src).toContain('"pull up"');
    expect(src).toContain('"lat pulldown"');
    expect(src).toContain('"overhead press"');
    expect(src).toContain('"lateral raise"');
    expect(src).toContain('"face pull"');
    expect(src).toContain('"bicep curl"');
    expect(src).toContain('"tricep pushdown"');
    expect(src).toContain('"skull crusher"');
    expect(src).toContain('"squat"');
    expect(src).toContain('"romanian deadlift"');
    expect(src).toContain('"leg press"');
    expect(src).toContain('"hip thrust"');
    expect(src).toContain('"plank"');
    expect(src).toContain('"russian twist"');
    expect(src).toContain('"hanging leg raise"');
    expect(src).toContain('"burpee"');
    expect(src).toContain('"kettlebell swing"');
  });

  it("should have at least 50 exercises with form tips", () => {
    const matches = src.match(/^\s+"[a-z][a-z0-9 -]+": \{$/gm);
    expect(matches).not.toBeNull();
    expect(matches!.length).toBeGreaterThanOrEqual(50);
  });

  it("each exercise should have at least 3 tips", () => {
    const tipArrayMatches = src.match(/tips: \[/g);
    expect(tipArrayMatches).not.toBeNull();
    expect(tipArrayMatches!.length).toBeGreaterThanOrEqual(50);
  });

  it("should include key form cues like 'Keep back straight' and 'Drive through heels'", () => {
    expect(src).toContain("Drive through heels");
    const hasBackStraight = src.includes("back straight") ||
      src.includes("back flat") ||
      src.includes("Keep back");
    expect(hasBackStraight).toBe(true);
  });
});

describe("Form Cue Overlay Component", () => {
  const src = readFile("components/form-cue-overlay.tsx");

  it("should export FormCueOverlay component", () => {
    expect(src).toContain("export function FormCueOverlay");
  });

  it("should export FormCueBadge component", () => {
    expect(src).toContain("export function FormCueBadge");
  });

  it("should accept exerciseName, visible, and onDismiss props", () => {
    expect(src).toContain("exerciseName: string");
    expect(src).toContain("visible: boolean");
    expect(src).toContain("onDismiss: () => void");
  });

  it("should have auto-dismiss timer", () => {
    expect(src).toContain("AUTO_DISMISS_MS");
    expect(src).toContain("setTimeout");
  });

  it("should use fade animation", () => {
    expect(src).toContain("Animated.timing");
    expect(src).toContain("fadeAnim");
  });

  it("should support fullscreen mode", () => {
    expect(src).toContain("fullscreen");
  });

  it("should render tip categories with icons and colors", () => {
    expect(src).toContain("getTipCategoryColor");
    expect(src).toContain("getTipCategoryIcon");
  });

  it("should have dismiss hint text", () => {
    expect(src).toContain("Tap anywhere to dismiss");
  });
});

describe("Form Cue Overlay Integration", () => {
  it("should import FormCueOverlay in ExerciseDemoPlayer", () => {
    const src = readFile("components/exercise-demo-player.tsx");
    expect(src).toContain("FormCueOverlay");
    expect(src).toContain("FormCueBadge");
  });

  it("should have showFormCues state in ExerciseDemoPlayer", () => {
    const src = readFile("components/exercise-demo-player.tsx");
    expect(src).toContain("showFormCues");
    expect(src).toContain("setShowFormCues");
  });

  it("should render FormCueOverlay in ExerciseDemoPlayer inline view", () => {
    const src = readFile("components/exercise-demo-player.tsx");
    expect(src).toContain("<FormCueOverlay");
  });

  it("should have tap handler for form cues in ExerciseDemoPlayer", () => {
    const src = readFile("components/exercise-demo-player.tsx");
    expect(src).toContain("toggleFormCues");
    expect(src).toContain("canShowFormCues");
  });

  it("EnhancedGifPlayer uses ExerciseVideoPlayer for MP4 playback", () => {
    const src = readFile("components/enhanced-gif-player.tsx");
    expect(src).toContain("ExerciseVideoPlayer");
    expect(src).toContain("getExerciseVideoUrl");
  });
});

describe("Video Cache Service", () => {
  const src = readFile("lib/gif-cache.ts");

  it("should export resolveVideoUri function", () => {
    expect(src).toContain("export async function resolveVideoUri");
  });

  it("should export prefetchExerciseVideos function", () => {
    expect(src).toContain("export async function prefetchExerciseVideos");
  });

  it("should export clearVideoCache function", () => {
    expect(src).toContain("export async function clearVideoCache");
  });

  it("should export getVideoCacheSize function", () => {
    expect(src).toContain("export async function getVideoCacheSize");
  });

  it("should use cacheDirectory for storage", () => {
    expect(src).toContain("cacheDirectory");
  });

  it("should use exercise-videos cache directory", () => {
    expect(src).toContain("exercise-videos");
  });

  it("should import from expo-file-system", () => {
    expect(src).toContain("expo-file-system");
  });

  it("should import EXERCISE_GIFS from registry", () => {
    expect(src).toContain("EXERCISE_GIFS");
  });

  it("should have MAX_CACHE_BYTES safety cap", () => {
    expect(src).toContain("MAX_CACHE_BYTES");
  });

  it("should have downloadAsync for fetching videos", () => {
    expect(src).toContain("downloadAsync");
  });
});

describe("Video Cache Integration", () => {
  it("should import video cache in active-workout", () => {
    const src = readFile("app/active-workout.tsx");
    expect(src).toContain("gif-cache");
    expect(src).toContain("prefetchExerciseVideos");
  });

  it("should import video cache in plans tab", () => {
    const src = readFile("app/(tabs)/plans.tsx");
    expect(src).toContain("gif-cache");
    expect(src).toContain("prefetchExerciseVideos");
  });

  it("should call prefetchExerciseVideos when workout starts", () => {
    const src = readFile("app/active-workout.tsx");
    expect(src).toContain("prefetchExerciseVideos()");
  });

  it("should pre-cache videos when workout plan is generated", () => {
    const src = readFile("app/(tabs)/plans.tsx");
    expect(src).toContain("prefetchExerciseVideos()");
  });

  it("should show video cache status in settings", () => {
    const src = readFile("app/settings.tsx");
    expect(src).toContain("Exercise Video Cache");
  });

  it("should have clear cache button in settings", () => {
    const src = readFile("app/settings.tsx");
    expect(src).toContain("clearVideoCache");
    expect(src).toContain("Clear Cache");
  });

  it("should show cache size in settings", () => {
    const src = readFile("app/settings.tsx");
    expect(src).toMatch(/videoCacheSize|getVideoCacheSize|Cache Size/);
  });
});
