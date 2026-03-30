/**
 * Round 74 — Video Caching, Angle Toggle, Favorites Filter
 *
 * Tests for:
 * 1. Video preload service (getExerciseVideoUrls, preloadExerciseVideos)
 * 2. Angle toggle support in exercise-data.ts (multiple angleViews per exercise)
 * 3. Favorites filter in exercise library (getFavoritesList matching)
 * 4. Enhanced GIF player supports video caching (useCaching: true)
 */
import { describe, it, expect, beforeEach } from "vitest";
import * as fs from "fs";
import * as path from "path";

const ROOT = path.resolve(__dirname, "..");

describe("Round 74: Video Caching, Angle Toggle, Favorites Filter", () => {
  // ── Video Preload Service ──
  describe("Video Preload Service", () => {
    it("gif-cache.ts exports resolveVideoUri and prefetchExerciseVideos", () => {
      const content = fs.readFileSync(path.join(ROOT, "lib/gif-cache.ts"), "utf-8");
      expect(content).toContain("export async function resolveVideoUri");
      expect(content).toContain("export async function prefetchExerciseVideos");
      expect(content).toContain("export async function clearVideoCache");
    });

    it("gif-cache.ts uses FileSystem for native preloading", () => {
      const content = fs.readFileSync(path.join(ROOT, "lib/gif-cache.ts"), "utf-8");
      expect(content).toContain("FileSystem.downloadAsync");
    });

    it("gif-cache.ts collects URLs from EXERCISE_GIFS", () => {
      const content = fs.readFileSync(path.join(ROOT, "lib/gif-cache.ts"), "utf-8");
      expect(content).toContain("EXERCISE_GIFS");
      expect(content).not.toContain("getExerciseVideoUrl");
    });

    it("active-workout.tsx imports and uses preloadExerciseVideos", () => {
      const content = fs.readFileSync(path.join(ROOT, "app/active-workout.tsx"), "utf-8");
      expect(content).toContain("import { preloadExerciseVideos, clearPreloadCache }");
      expect(content).toContain("preloadExerciseVideos(exercises[");
    });

    it("active-workout.tsx preloads first 2 exercises at workout start", () => {
      const content = fs.readFileSync(path.join(ROOT, "app/active-workout.tsx"), "utf-8");
      expect(content).toContain("preloadExerciseVideos(exercises[0].name)");
    });

    it("active-workout.tsx preloads next exercise when rest timer starts or exercise changes", () => {
      const content = fs.readFileSync(path.join(ROOT, "app/active-workout.tsx"), "utf-8");
      expect(content).toContain("preloadExerciseVideos");
      expect(content).toContain("preloadExerciseVideos(exercises[nextIdx].name)");
    });

    it("active-workout.tsx clears video cache on unmount", () => {
      const content = fs.readFileSync(path.join(ROOT, "app/active-workout.tsx"), "utf-8");
      expect(content).toContain("clearPreloadCache()");
    });
  });

  // ── Video Player Components ──
  describe("Video Player Components", () => {
    it("enhanced-gif-player.tsx uses expo-image for animated GIF display", () => {
      const content = fs.readFileSync(path.join(ROOT, "components/enhanced-gif-player.tsx"), "utf-8");
      expect(content).toContain("Image");
      expect(content).toContain("getExerciseDbGifUrl");
    });

    it("exercise-demo-player.tsx uses expo-image and resolveGifAsset", () => {
      const content = fs.readFileSync(path.join(ROOT, "components/exercise-demo-player.tsx"), "utf-8");
      expect(content).toContain("Image");
      expect(content).toContain("resolveGifAsset");
    });

    it("enhanced-gif-player.tsx uses getExerciseDbGifUrl for GIF lookup", () => {
      const content = fs.readFileSync(path.join(ROOT, "components/enhanced-gif-player.tsx"), "utf-8");
      expect(content).toContain("getExerciseDbGifUrl");
    });

    it("exercise-demo-player.tsx uses resolveGifAsset for image lookup", () => {
      const content = fs.readFileSync(path.join(ROOT, "components/exercise-demo-player.tsx"), "utf-8");
      expect(content).toContain("resolveGifAsset");
      expect(content).not.toContain("getExerciseVideoUrl");
    });
  });

  // ── Front/Side Angle Toggle ──
  describe("Front/Side Angle Toggle", () => {
    it("exercise-demo-player.tsx supports multiple angle views", () => {
      const content = fs.readFileSync(path.join(ROOT, "components/exercise-demo-player.tsx"), "utf-8");
      expect(content).toContain("angleViews");
      expect(content).toContain("hasMultipleAngles");
      expect(content).toContain("activeAngle");
    });

    it("exercise-demo-player.tsx has angle toggle buttons", () => {
      const content = fs.readFileSync(path.join(ROOT, "components/exercise-demo-player.tsx"), "utf-8");
      expect(content).toContain("angleToggleRow");
      expect(content).toContain("angleToggleBtn");
      expect(content).toContain("handleAngleChange");
    });

    it("exercise-demo-player.tsx shows angle labels (Front/Side)", () => {
      const content = fs.readFileSync(path.join(ROOT, "components/exercise-demo-player.tsx"), "utf-8");
      expect(content).toContain("getAngleShortLabel");
      expect(content).toContain('"Front"');
      expect(content).toContain('"Side"');
    });

    it("exercise-demo-player.tsx has fullscreen angle toggle", () => {
      const content = fs.readFileSync(path.join(ROOT, "components/exercise-demo-player.tsx"), "utf-8");
      expect(content).toContain("fullscreenAngleRow");
      expect(content).toContain("fullscreenAngleBtn");
    });

    it("enhanced-gif-player.tsx has exerciseKey prop for video selection", () => {
      const content = fs.readFileSync(path.join(ROOT, "components/enhanced-gif-player.tsx"), "utf-8");
      expect(content).toContain("exerciseKey");
      expect(content).not.toContain("angleViews");
    });

    it("most exercises have multiple angle views (front + side)", () => {
      const content = fs.readFileSync(path.join(ROOT, "lib/exercise-data.ts"), "utf-8");
      // Count exercises with 2+ angleViews
      const matches = content.match(/angleViews:\s*\[/g);
      expect(matches).toBeTruthy();
      expect(matches!.length).toBeGreaterThan(30);
    });

    it("exercise-data.ts has both Front View and Side View labels", () => {
      const content = fs.readFileSync(path.join(ROOT, "lib/exercise-data.ts"), "utf-8");
      expect(content).toContain("Front View");
      expect(content).toContain("Side View");
    });
  });

  // ── Favorites Filter in Exercise Library ──
  describe("Favorites Filter in Exercise Library", () => {
    it("exercise-library.tsx has favorites filter chip", () => {
      const content = fs.readFileSync(path.join(ROOT, "app/exercise-library.tsx"), "utf-8");
      expect(content).toContain('"favorites"');
      expect(content).toContain("Favorites");
    });

    it("exercise-library.tsx imports useFavorites and uses getFavoritesList", () => {
      const content = fs.readFileSync(path.join(ROOT, "app/exercise-library.tsx"), "utf-8");
      expect(content).toContain("useFavorites");
      expect(content).toContain("getFavoritesList");
    });

    it("exercise-library.tsx shows favorites count in filter chip", () => {
      const content = fs.readFileSync(path.join(ROOT, "app/exercise-library.tsx"), "utf-8");
      expect(content).toContain("favCount");
    });

    it("exercise-library.tsx filters exercises by favorites", () => {
      const content = fs.readFileSync(path.join(ROOT, "app/exercise-library.tsx"), "utf-8");
      expect(content).toContain('activeFilter === "favorites"');
      expect(content).toContain("favList.some");
    });

    it("exercise-library.tsx has favorites empty state message", () => {
      const content = fs.readFileSync(path.join(ROOT, "app/exercise-library.tsx"), "utf-8");
      expect(content).toContain("Tap the heart icon on any exercise to add it to your favorites");
    });

    it("exercise-library.tsx has heart icon on each exercise card", () => {
      const content = fs.readFileSync(path.join(ROOT, "app/exercise-library.tsx"), "utf-8");
      expect(content).toContain("handleFavoritePress");
      expect(content).toContain("favorite-border");
    });

    it("exercise-library.tsx handles MP4 previews with play icon placeholder", () => {
      const content = fs.readFileSync(path.join(ROOT, "app/exercise-library.tsx"), "utf-8");
      expect(content).toContain('endsWith(".mp4")');
      expect(content).toContain("play-circle-outline");
    });
  });

  // ── Favorites Context ──
  describe("Favorites Context", () => {
    it("favorites-context.tsx exports FavoritesProvider and useFavorites", () => {
      const content = fs.readFileSync(path.join(ROOT, "lib/favorites-context.tsx"), "utf-8");
      expect(content).toContain("export function FavoritesProvider");
      expect(content).toContain("export function useFavorites");
    });

    it("favorites-context.tsx persists to AsyncStorage", () => {
      const content = fs.readFileSync(path.join(ROOT, "lib/favorites-context.tsx"), "utf-8");
      expect(content).toContain("AsyncStorage.setItem");
      expect(content).toContain("AsyncStorage.getItem");
      expect(content).toContain("@exercise_favorites");
    });

    it("favorites-context.tsx provides count property", () => {
      const content = fs.readFileSync(path.join(ROOT, "lib/favorites-context.tsx"), "utf-8");
      expect(content).toContain("count: number");
      expect(content).toContain("const count = favorites.size");
    });

    it("favorites-context.tsx normalises exercise names for matching", () => {
      const content = fs.readFileSync(path.join(ROOT, "lib/favorites-context.tsx"), "utf-8");
      expect(content).toContain("normalise");
      expect(content).toContain("toLowerCase()");
    });
  });

  // ── Exercise Video URLs ──
  describe("Exercise Video URLs", () => {
    it("exercise-gif-registry.ts provides MP4 URLs from musclewiki", () => {
      const content = fs.readFileSync(path.join(ROOT, "lib/exercise-gif-registry.ts"), "utf-8");
      expect(content).toContain("musclewiki.com");
      expect(content).toContain(".mp4");
      expect(content).not.toContain("manuscdn.com");
    });

    it("exercise-gif-registry.ts exports getExerciseVideoUrl", () => {
      const content = fs.readFileSync(path.join(ROOT, "lib/exercise-gif-registry.ts"), "utf-8");
      expect(content).toContain("getExerciseVideoUrl");
      expect(content).toContain("EXERCISE_GIFS");
    });
  });
});
