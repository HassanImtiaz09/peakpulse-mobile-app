/**
 * Tests for local GIF asset system
 * Verifies that all exercise demos use locally bundled GIF assets
 * instead of remote video URLs, eliminating "video unavailable" errors.
 */
import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const projectRoot = "/home/ubuntu/peakpulse-mobile";

function readFile(relativePath: string): string {
  return fs.readFileSync(path.resolve(projectRoot, relativePath), "utf-8");
}

function fileExists(relativePath: string): boolean {
  return fs.existsSync(path.resolve(projectRoot, relativePath));
}

describe("Local GIF Asset System", () => {
  describe("GIF files exist in assets/exercise-gifs/", () => {
    it("should have at least 70 GIF files", () => {
      const gifDir = path.resolve(projectRoot, "assets/exercise-gifs");
      const files = fs.readdirSync(gifDir).filter((f) => f.endsWith(".gif"));
      expect(files.length).toBeGreaterThanOrEqual(70);
    });

    it("should have GIFs for all major muscle groups", () => {
      const gifDir = path.resolve(projectRoot, "assets/exercise-gifs");
      const files = fs.readdirSync(gifDir).filter((f) => f.endsWith(".gif"));
      const fileNames = files.join(" ");

      // Check for representative exercises from each category
      expect(fileNames).toContain("bench-press"); // chest
      expect(fileNames).toContain("pull-ups"); // back
      expect(fileNames).toContain("overhead-press"); // shoulders
      expect(fileNames).toContain("curl"); // arms
      expect(fileNames).toContain("squat"); // legs
      expect(fileNames).toContain("plank"); // core
      expect(fileNames).toContain("burpee"); // cardio
    });
  });

  describe("GIF Registry (lib/exercise-gif-registry.ts)", () => {
    const registryContent = readFile("lib/exercise-gif-registry.ts");

    it("should exist", () => {
      expect(fileExists("lib/exercise-gif-registry.ts")).toBe(true);
    });

    it("should export EXERCISE_GIFS record", () => {
      expect(registryContent).toContain("export const EXERCISE_GIFS");
    });

    it("should use require() with @/assets/exercise-gifs/ paths", () => {
      expect(registryContent).toContain('require("@/assets/exercise-gifs/');
    });

    it("should NOT use relative ./ paths for GIF files", () => {
      // Ensure we don't have the old pattern that caused Metro errors
      expect(registryContent).not.toMatch(/require\("\.\/[^"]+\.gif"\)/);
    });

    it("should have entries for all major exercise categories", () => {
      expect(registryContent).toContain("// ── Chest");
      expect(registryContent).toContain("// ── Back");
      expect(registryContent).toContain("// ── Shoulders");
      expect(registryContent).toContain("// ── Arms");
      expect(registryContent).toContain("// ── Legs");
      expect(registryContent).toContain("// ── Core");
      expect(registryContent).toContain("// ── Cardio");
    });

    it("should have at least 70 require() entries", () => {
      const requireCount = (registryContent.match(/require\(/g) || []).length;
      expect(requireCount).toBeGreaterThanOrEqual(70);
    });
  });

  describe("GIF Resolver (lib/gif-resolver.ts)", () => {
    const resolverContent = readFile("lib/gif-resolver.ts");

    it("should exist", () => {
      expect(fileExists("lib/gif-resolver.ts")).toBe(true);
    });

    it("should export resolveGifAsset function", () => {
      expect(resolverContent).toContain("export function resolveGifAsset");
    });

    it("should import from exercise-gif-registry", () => {
      expect(resolverContent).toContain("from \"@/lib/exercise-gif-registry\"");
    });

    it("should handle URL-to-asset resolution", () => {
      expect(resolverContent).toContain("extractStem");
    });

    it("should have a fallback asset", () => {
      expect(resolverContent).toContain("FALLBACK_ASSET");
    });
  });

  describe("Exercise Demo Player (components/exercise-demo-player.tsx)", () => {
    const playerContent = readFile("components/exercise-demo-player.tsx");

    it("should NOT import expo-video", () => {
      expect(playerContent).not.toContain("expo-video");
      expect(playerContent).not.toContain("VideoView");
      expect(playerContent).not.toContain("useVideoPlayer");
    });

    it("should NOT use HTML video tag", () => {
      expect(playerContent).not.toContain("<video");
    });

    it("should import resolveGifAsset", () => {
      expect(playerContent).toContain("resolveGifAsset");
    });

    it("should use Image component from expo-image", () => {
      expect(playerContent).toContain('from "expo-image"');
      expect(playerContent).toContain("<Image");
    });

    it("should NOT show 'Video unavailable' error", () => {
      expect(playerContent).not.toContain("Video unavailable");
    });

    it("should have fullscreen modal support", () => {
      expect(playerContent).toContain("Modal");
      expect(playerContent).toContain("fullscreen");
    });

    it("should have favorites support", () => {
      expect(playerContent).toContain("useFavorites");
      expect(playerContent).toContain("toggleFavorite");
    });
  });

  describe("Enhanced GIF Player (components/enhanced-gif-player.tsx)", () => {
    const playerContent = readFile("components/enhanced-gif-player.tsx");

    it("should NOT import expo-video", () => {
      expect(playerContent).not.toContain("expo-video");
      expect(playerContent).not.toContain("VideoView");
      expect(playerContent).not.toContain("useVideoPlayer");
    });

    it("should NOT use HTML video tag", () => {
      expect(playerContent).not.toContain("<video");
    });

    it("should import resolveGifAsset", () => {
      expect(playerContent).toContain("resolveGifAsset");
    });

    it("should use Image component from expo-image", () => {
      expect(playerContent).toContain('from "expo-image"');
      expect(playerContent).toContain("<Image");
    });

    it("should NOT show 'Video unavailable' error", () => {
      expect(playerContent).not.toContain("Video unavailable");
    });

    it("should have multi-angle support", () => {
      expect(playerContent).toContain("angleViews");
      expect(playerContent).toContain("activeAngle");
    });

    it("should have fullscreen modal", () => {
      expect(playerContent).toContain("Modal");
      expect(playerContent).toContain("fullscreen");
    });

    it("should have slow-motion feature", () => {
      expect(playerContent).toContain("isSlowMotion");
      expect(playerContent).toContain("slow-motion-video");
    });

    it("should have focus annotations", () => {
      expect(playerContent).toContain("showFocus");
      expect(playerContent).toContain("focus");
    });
  });

  describe("Exercise Demos (lib/exercise-demos.ts)", () => {
    const demosContent = readFile("lib/exercise-demos.ts");

    it("should import from exercise-gif-registry", () => {
      expect(demosContent).toContain("from \"@/lib/exercise-gif-registry\"");
    });

    it("should have gifAsset property in ExerciseDemo interface", () => {
      expect(demosContent).toContain("gifAsset");
    });

    it("should use gif() helper to resolve assets", () => {
      expect(demosContent).toContain("gif(");
    });
  });

  describe("No remaining remote video dependencies", () => {
    it("exercise-demo-player should not reference remote URLs", () => {
      const content = readFile("components/exercise-demo-player.tsx");
      expect(content).not.toContain("api.musclewiki.com");
      expect(content).not.toContain("v2.exercisedb.io");
    });

    it("enhanced-gif-player should not reference remote URLs", () => {
      const content = readFile("components/enhanced-gif-player.tsx");
      expect(content).not.toContain("api.musclewiki.com");
      expect(content).not.toContain("v2.exercisedb.io");
    });
  });

  describe("Type declarations", () => {
    it("should have .gif type declaration", () => {
      const declContent = readFile("declarations.d.ts");
      expect(declContent).toContain("*.gif");
    });
  });
});
