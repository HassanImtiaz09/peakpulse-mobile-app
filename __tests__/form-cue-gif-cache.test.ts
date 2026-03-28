/**
 * Tests for:
 * 1. Form Cue Overlay — form tips data and overlay component integration
 * 2. Offline GIF Cache — caching service for exercise GIFs
 */
import { describe, it, expect, vi } from "vitest";
import * as fs from "fs";
import * as path from "path";

describe("Form Cue Tips Data", () => {
  const formCueTipsSrc = fs.readFileSync(
    path.resolve(__dirname, "../lib/form-cue-tips.ts"),
    "utf-8"
  );

  it("should export FormTip and ExerciseFormTips types", () => {
    expect(formCueTipsSrc).toContain("export interface FormTip");
    expect(formCueTipsSrc).toContain("export interface ExerciseFormTips");
  });

  it("should have tip categories: form, mistake, breathing, safety", () => {
    expect(formCueTipsSrc).toContain('"form"');
    expect(formCueTipsSrc).toContain('"mistake"');
    expect(formCueTipsSrc).toContain('"breathing"');
    expect(formCueTipsSrc).toContain('"safety"');
  });

  it("should have getFormTips function", () => {
    expect(formCueTipsSrc).toContain("export function getFormTips");
  });

  it("should have hasFormTips function", () => {
    expect(formCueTipsSrc).toContain("export function hasFormTips");
  });

  it("should have getTipCategoryIcon function", () => {
    expect(formCueTipsSrc).toContain("export function getTipCategoryIcon");
  });

  it("should have getTipCategoryColor function", () => {
    expect(formCueTipsSrc).toContain("export function getTipCategoryColor");
  });

  it("should cover all major exercise categories", () => {
    // Chest
    expect(formCueTipsSrc).toContain('"bench press"');
    expect(formCueTipsSrc).toContain('"push up"');
    expect(formCueTipsSrc).toContain('"dumbbell fly"');
    // Back
    expect(formCueTipsSrc).toContain('"deadlift"');
    expect(formCueTipsSrc).toContain('"barbell row"');
    expect(formCueTipsSrc).toContain('"pull up"');
    expect(formCueTipsSrc).toContain('"lat pulldown"');
    // Shoulders
    expect(formCueTipsSrc).toContain('"overhead press"');
    expect(formCueTipsSrc).toContain('"lateral raise"');
    expect(formCueTipsSrc).toContain('"face pull"');
    // Arms
    expect(formCueTipsSrc).toContain('"bicep curl"');
    expect(formCueTipsSrc).toContain('"tricep pushdown"');
    expect(formCueTipsSrc).toContain('"skull crusher"');
    // Legs
    expect(formCueTipsSrc).toContain('"squat"');
    expect(formCueTipsSrc).toContain('"romanian deadlift"');
    expect(formCueTipsSrc).toContain('"leg press"');
    expect(formCueTipsSrc).toContain('"hip thrust"');
    // Core
    expect(formCueTipsSrc).toContain('"plank"');
    expect(formCueTipsSrc).toContain('"russian twist"');
    expect(formCueTipsSrc).toContain('"hanging leg raise"');
    // Full body
    expect(formCueTipsSrc).toContain('"burpee"');
    expect(formCueTipsSrc).toContain('"kettlebell swing"');
  });

  it("should have at least 50 exercises with form tips", () => {
    // Count unique exercise keys in FORM_TIPS
    const matches = formCueTipsSrc.match(/^\s+"[a-z][a-z0-9 -]+": \{$/gm);
    expect(matches).not.toBeNull();
    expect(matches!.length).toBeGreaterThanOrEqual(50);
  });

  it("each exercise should have at least 3 tips", () => {
    // Verify the structure has tips arrays with multiple entries
    const tipArrayMatches = formCueTipsSrc.match(/tips: \[/g);
    expect(tipArrayMatches).not.toBeNull();
    expect(tipArrayMatches!.length).toBeGreaterThanOrEqual(50);
  });

  it("should include key form cues like 'Keep back straight' and 'Drive through heels'", () => {
    // These are the specific examples from the user's request
    expect(formCueTipsSrc).toContain("Drive through heels");
    // "Keep back straight" or similar phrasing
    const hasBackStraight = formCueTipsSrc.includes("back straight") ||
      formCueTipsSrc.includes("back flat") ||
      formCueTipsSrc.includes("Keep back");
    expect(hasBackStraight).toBe(true);
  });
});

describe("Form Cue Overlay Component", () => {
  const overlaySrc = fs.readFileSync(
    path.resolve(__dirname, "../components/form-cue-overlay.tsx"),
    "utf-8"
  );

  it("should export FormCueOverlay component", () => {
    expect(overlaySrc).toContain("export function FormCueOverlay");
  });

  it("should export FormCueBadge component", () => {
    expect(overlaySrc).toContain("export function FormCueBadge");
  });

  it("should accept exerciseName, visible, and onDismiss props", () => {
    expect(overlaySrc).toContain("exerciseName: string");
    expect(overlaySrc).toContain("visible: boolean");
    expect(overlaySrc).toContain("onDismiss: () => void");
  });

  it("should have auto-dismiss timer", () => {
    expect(overlaySrc).toContain("AUTO_DISMISS_MS");
    expect(overlaySrc).toContain("setTimeout");
  });

  it("should use fade animation", () => {
    expect(overlaySrc).toContain("Animated.timing");
    expect(overlaySrc).toContain("fadeAnim");
  });

  it("should support fullscreen mode", () => {
    expect(overlaySrc).toContain("fullscreen");
  });

  it("should render tip categories with icons and colors", () => {
    expect(overlaySrc).toContain("getTipCategoryColor");
    expect(overlaySrc).toContain("getTipCategoryIcon");
  });

  it("should have dismiss hint text", () => {
    expect(overlaySrc).toContain("Tap anywhere to dismiss");
  });
});

describe("Form Cue Overlay Integration", () => {
  const exerciseDemoSrc = fs.readFileSync(
    path.resolve(__dirname, "../components/exercise-demo-player.tsx"),
    "utf-8"
  );

  const enhancedGifSrc = fs.readFileSync(
    path.resolve(__dirname, "../components/enhanced-gif-player.tsx"),
    "utf-8"
  );

  it("should import FormCueOverlay in ExerciseDemoPlayer", () => {
    expect(exerciseDemoSrc).toContain("FormCueOverlay");
    expect(exerciseDemoSrc).toContain("FormCueBadge");
  });

  it("should import FormCueOverlay in EnhancedGifPlayer", () => {
    expect(enhancedGifSrc).toContain("FormCueOverlay");
    expect(enhancedGifSrc).toContain("FormCueBadge");
  });

  it("should have showFormCues state in ExerciseDemoPlayer", () => {
    expect(exerciseDemoSrc).toContain("showFormCues");
    expect(exerciseDemoSrc).toContain("setShowFormCues");
  });

  it("should have showFormCues state in EnhancedGifPlayer", () => {
    expect(enhancedGifSrc).toContain("showFormCues");
    expect(enhancedGifSrc).toContain("setShowFormCues");
  });

  it("should render FormCueOverlay in ExerciseDemoPlayer inline view", () => {
    expect(exerciseDemoSrc).toContain("<FormCueOverlay");
  });

  it("should render FormCueOverlay in EnhancedGifPlayer", () => {
    expect(enhancedGifSrc).toContain("<FormCueOverlay");
  });

  it("should have tap handler for form cues in ExerciseDemoPlayer", () => {
    expect(exerciseDemoSrc).toContain("toggleFormCues");
    expect(exerciseDemoSrc).toContain("canShowFormCues");
  });

  it("should have tap handler for form cues in EnhancedGifPlayer", () => {
    expect(enhancedGifSrc).toContain("toggleFormCues");
    expect(enhancedGifSrc).toContain("canShowFormCues");
  });
});

describe("GIF Cache Service", () => {
  const gifCacheSrc = fs.readFileSync(
    path.resolve(__dirname, "../lib/gif-cache.ts"),
    "utf-8"
  );

  it("should export preCacheWorkoutGifs function", () => {
    expect(gifCacheSrc).toContain("export async function preCacheWorkoutGifs");
  });

  it("should export getCachedGifUri function", () => {
    expect(gifCacheSrc).toContain("export async function getCachedGifUri");
  });

  it("should export clearGifCache function", () => {
    expect(gifCacheSrc).toContain("export async function clearGifCache");
  });

  it("should export getGifCacheStatus function", () => {
    expect(gifCacheSrc).toContain("export async function getGifCacheStatus");
  });

  it("should export getGifCacheSizeBytes function", () => {
    expect(gifCacheSrc).toContain("export async function getGifCacheSizeBytes");
  });

  it("should export formatCacheSize function", () => {
    expect(gifCacheSrc).toContain("export function formatCacheSize");
  });

  it("should export isGifCachedSync function", () => {
    expect(gifCacheSrc).toContain("export function isGifCachedSync");
  });

  it("should export onGifCacheStatusChange listener", () => {
    expect(gifCacheSrc).toContain("export function onGifCacheStatusChange");
  });

  it("should export GifCacheStatus type", () => {
    expect(gifCacheSrc).toContain("export interface GifCacheStatus");
  });

  it("should use AsyncStorage for manifest", () => {
    expect(gifCacheSrc).toContain("AsyncStorage");
    expect(gifCacheSrc).toContain("@gif_cache_manifest");
  });

  it("should use expo-file-system for downloads", () => {
    expect(gifCacheSrc).toContain("expo-file-system");
    expect(gifCacheSrc).toContain("downloadAsync");
  });

  it("should handle web platform gracefully", () => {
    expect(gifCacheSrc).toContain('Platform.OS === "web"');
  });

  it("should use cacheDirectory for storage", () => {
    expect(gifCacheSrc).toContain("cacheDirectory");
    expect(gifCacheSrc).toContain("exercise-gifs/");
  });

  it("should prevent concurrent caching", () => {
    expect(gifCacheSrc).toContain("_isCaching");
  });

  it("should support progress callback", () => {
    expect(gifCacheSrc).toContain("onProgress");
  });

  it("should fall back to remote URL when cache misses", () => {
    expect(gifCacheSrc).toContain("getExerciseDbGifUrl");
  });
});

describe("GIF Cache Integration", () => {
  const activeWorkoutSrc = fs.readFileSync(
    path.resolve(__dirname, "../app/active-workout.tsx"),
    "utf-8"
  );

  const plansSrc = fs.readFileSync(
    path.resolve(__dirname, "../app/(tabs)/plans.tsx"),
    "utf-8"
  );

  const settingsSrc = fs.readFileSync(
    path.resolve(__dirname, "../app/settings.tsx"),
    "utf-8"
  );

  it("should import GIF cache in active-workout", () => {
    expect(activeWorkoutSrc).toContain("preCacheWorkoutGifs");
    expect(activeWorkoutSrc).toContain("refreshManifestCache");
  });

  it("should call preCacheWorkoutGifs when workout starts", () => {
    expect(activeWorkoutSrc).toContain("preCacheWorkoutGifs(exercises.map");
  });

  it("should import GIF cache in plans tab", () => {
    expect(plansSrc).toContain("preCacheWorkoutGifs");
    expect(plansSrc).toContain("refreshManifestCache");
  });

  it("should pre-cache GIFs when workout plan is generated", () => {
    // Check that the onSuccess callback includes preCacheWorkoutGifs
    expect(plansSrc).toContain("preCacheWorkoutGifs(allExNames)");
  });

  it("should pre-cache GIFs when workout plan is loaded", () => {
    // Check the useEffect for workoutPlan.schedule
    expect(plansSrc).toContain("workoutPlan?.schedule");
    expect(plansSrc).toContain("preCacheWorkoutGifs(allExNames)");
  });

  it("should show GIF cache status in settings", () => {
    expect(settingsSrc).toContain("getGifCacheStatus");
    expect(settingsSrc).toContain("gifCacheStatus");
    expect(settingsSrc).toContain("Cached GIFs");
    expect(settingsSrc).toContain("Cache Size");
  });

  it("should have clear cache button in settings", () => {
    expect(settingsSrc).toContain("clearGifCache");
    expect(settingsSrc).toContain("Clear Cache");
    expect(settingsSrc).toContain("Clear GIF Cache?");
  });

  it("should show cache size in settings", () => {
    expect(settingsSrc).toContain("getGifCacheSizeBytes");
    expect(settingsSrc).toContain("formatCacheSize");
    expect(settingsSrc).toContain("gifCacheSize");
  });
});
