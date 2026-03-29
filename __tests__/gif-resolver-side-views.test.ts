import { describe, it, expect } from "vitest";
import { resolveGifAssetOrNull, hasSideViewGif, hasDistinctSideView } from "../lib/gif-resolver";
import { SIDE_VIEW_GIFS, EXERCISE_GIFS } from "../lib/exercise-gif-registry";

describe("SIDE_VIEW_GIFS registry (deprecated — now empty)", () => {
  it("is an empty object (side views now live in EXERCISE_GIFS with -side keys)", () => {
    expect(Object.keys(SIDE_VIEW_GIFS).length).toBe(0);
  });
});

describe("resolveGifAssetOrNull — MP4 URL handling", () => {
  it("resolves a musclewiki MP4 URL as-is", () => {
    const url = "https://media.musclewiki.com/media/uploads/videos/branded/male-Barbell-barbell-squat-front.mp4";
    const result = resolveGifAssetOrNull(url);
    expect(result).toBe(url);
  });

  it("returns null for unknown keys", () => {
    const result = resolveGifAssetOrNull("nonexistent-exercise-key");
    expect(result).toBeNull();
  });
});

describe("hasSideViewGif", () => {
  it("returns false for empty string", () => {
    expect(hasSideViewGif("")).toBe(false);
  });
});

describe("hasDistinctSideView", () => {
  it("returns false for exercises without distinct side views", () => {
    expect(hasDistinctSideView("russian twist")).toBe(false);
    expect(hasDistinctSideView("bicycle crunch")).toBe(false);
  });
});

describe("EXERCISE_GIFS MP4 registry", () => {
  const keys = Object.keys(EXERCISE_GIFS);

  it("has at least 149 entries (front + side)", () => {
    expect(keys.length).toBeGreaterThanOrEqual(149);
  });

  it("has -front and -side key pairs", () => {
    const frontKeys = keys.filter(k => k.endsWith("-front"));
    const sideKeys = keys.filter(k => k.endsWith("-side"));
    expect(frontKeys.length).toBeGreaterThan(0);
    expect(sideKeys.length).toBeGreaterThan(0);
    expect(frontKeys.length).toBe(sideKeys.length);
  });

  it("all values are musclewiki MP4 URLs", () => {
    for (const url of Object.values(EXERCISE_GIFS)) {
      expect(url).toContain("musclewiki.com");
      expect(url).toContain(".mp4");
    }
  });

  it("has entries for all major muscle groups", () => {
    expect(keys.some(k => k.includes("bench-press"))).toBe(true);
    expect(keys.some(k => k.includes("pull-ups") || k.includes("pulldown"))).toBe(true);
    expect(keys.some(k => k.includes("squat"))).toBe(true);
    expect(keys.some(k => k.includes("plank") || k.includes("crunch"))).toBe(true);
  });
});
