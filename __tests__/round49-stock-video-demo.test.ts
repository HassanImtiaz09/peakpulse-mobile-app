/**
 * Round 49 — Stock Video Demo Tests
 *
 * Validates the stock video player integration:
 * 1. ExerciseStockVideoPlayer component exists with expo-video
 * 2. exercise-stock-videos.ts maps 3 demo exercises
 * 3. exercise-detail.tsx integrates stock video with GIF fallback
 */
import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const ROOT = path.resolve(__dirname, "..");

function readFile(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf-8");
}

describe("ExerciseStockVideoPlayer component", () => {
  const src = readFile("components/exercise-stock-video-player.tsx");

  it("uses expo-video VideoView and useVideoPlayer", () => {
    expect(src).toContain("VideoView");
    expect(src).toContain("useVideoPlayer");
  });

  it("imports useEvent from expo", () => {
    expect(src).toContain('import { useEvent } from "expo"');
  });

  it("supports speed control with 0.25x, 0.5x, 1x options", () => {
    expect(src).toContain("0.25");
    expect(src).toContain("0.5");
    expect(src).toContain("SPEED_OPTIONS");
    expect(src).toContain("playbackRate");
  });

  it("supports play/pause toggle", () => {
    expect(src).toContain("togglePlayPause");
    expect(src).toContain("player.pause()");
    expect(src).toContain("player.play()");
  });

  it("supports seek forward/backward", () => {
    expect(src).toContain("seekBy(-3)");
    expect(src).toContain("seekBy(3)");
  });

  it("enables fullscreen", () => {
    expect(src).toContain("allowsFullscreen");
  });

  it("enables video caching on native", () => {
    expect(src).toContain("useCaching");
  });

  it("shows slow motion label when speed < 1", () => {
    expect(src).toContain("slow-motion-video");
    expect(src).toContain("Slow Motion");
  });
});

describe("exercise-stock-videos.ts mapping", () => {
  const src = readFile("lib/exercise-stock-videos.ts");

  it("maps barbell squat to a Pexels video", () => {
    expect(src).toContain('"barbell squat"');
    expect(src).toContain("videos.pexels.com");
  });

  it("maps barbell bench press to a Pexels video", () => {
    expect(src).toContain('"barbell bench press"');
  });

  it("maps barbell deadlift to a Pexels video", () => {
    expect(src).toContain('"barbell deadlift"');
  });

  it("exports getStockVideoUrl and hasStockVideo helpers", () => {
    expect(src).toContain("export function getStockVideoUrl");
    expect(src).toContain("export function hasStockVideo");
  });
});

describe("exercise-detail.tsx stock video integration", () => {
  const src = readFile("app/exercise-detail.tsx");

  it("imports ExerciseStockVideoPlayer", () => {
    expect(src).toContain("ExerciseStockVideoPlayer");
  });

  it("imports getStockVideoUrl", () => {
    expect(src).toContain("getStockVideoUrl");
  });

  it("conditionally renders stock video or GIF fallback", () => {
    expect(src).toContain("getStockVideoUrl(exercise.name)");
    expect(src).toContain("EnhancedGifPlayer");
  });

  it("shows video credit attribution", () => {
    expect(src).toContain("videoCredit");
    expect(src).toContain("getStockVideoEntry");
  });
});
