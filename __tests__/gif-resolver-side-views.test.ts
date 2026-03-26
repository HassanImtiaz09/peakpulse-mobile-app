import { describe, it, expect } from "vitest";
import { resolveGifAssetOrNull, hasSideViewGif, hasDistinctSideView } from "../lib/gif-resolver";
import { SIDE_VIEW_GIFS, EXERCISE_GIFS } from "../lib/exercise-gif-registry";

describe("SIDE_VIEW_GIFS registry", () => {
  it("contains 15 distinct side-view entries", () => {
    expect(Object.keys(SIDE_VIEW_GIFS).length).toBe(15);
  });

  it("all side-view URLs point to cloudfront CDN", () => {
    for (const url of Object.values(SIDE_VIEW_GIFS)) {
      expect(url).toContain("d2xsxph8kpxj0f.cloudfront.net");
    }
  });

  it("all side-view keys start with 'side-'", () => {
    for (const key of Object.keys(SIDE_VIEW_GIFS)) {
      expect(key.startsWith("side-")).toBe(true);
    }
  });
});

describe("resolveGifAssetOrNull - side view handling", () => {
  it("resolves a cloudfront side-view URL as-is", () => {
    const url = "https://d2xsxph8kpxj0f.cloudfront.net/310519663430072618/TCxddYfhYS3he4wae2YPUE/side-barbell-bench-press-7VJGMpqMVBNhKxPbTUMnM5.png";
    const result = resolveGifAssetOrNull(url);
    expect(result).toBe(url);
  });

  it("resolves a manuscdn front-view URL as-is", () => {
    const url = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/IciLPTXbNLzyYQDz.png";
    const result = resolveGifAssetOrNull(url);
    expect(result).toBe(url);
  });

  it("resolves a side-view key to the correct CDN URL", () => {
    const result = resolveGifAssetOrNull("side-barbell-bench-press");
    expect(result).toContain("side-barbell-bench-press");
    expect(result).toContain("d2xsxph8kpxj0f.cloudfront.net");
  });

  it("resolves a front-view key to a valid asset", () => {
    const result = resolveGifAssetOrNull("male-barbell-bench-press-front");
    // In mock, front-view keys resolve to numeric asset IDs
    expect(result).not.toBeNull();
    expect(typeof result).toBe("number");
  });

  it("returns null for unknown keys", () => {
    const result = resolveGifAssetOrNull("nonexistent-exercise-key");
    expect(result).toBeNull();
  });
});

describe("hasSideViewGif", () => {
  it("returns true for a cloudfront side-view URL", () => {
    const url = "https://d2xsxph8kpxj0f.cloudfront.net/310519663430072618/TCxddYfhYS3he4wae2YPUE/side-barbell-squat-7VJGMpqMVBNhKxPbTUMnM5.png";
    expect(hasSideViewGif(url)).toBe(true);
  });

  it("returns false for a front-view URL", () => {
    const url = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/IciLPTXbNLzyYQDz.png";
    expect(hasSideViewGif(url)).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(hasSideViewGif("")).toBe(false);
  });

  it("returns true for side-barbell-deadlift key URL", () => {
    const url = "https://d2xsxph8kpxj0f.cloudfront.net/310519663430072618/TCxddYfhYS3he4wae2YPUE/side-barbell-deadlift-7VJGMpqMVBNhKxPbTUMnM5.png";
    expect(hasSideViewGif(url)).toBe(true);
  });
});

describe("hasDistinctSideView", () => {
  it("returns true for exercises with distinct side views", () => {
    // These exercises have side-view images in the registry
    expect(hasDistinctSideView("barbell bench press")).toBe(true);
    expect(hasDistinctSideView("barbell squat")).toBe(true);
    expect(hasDistinctSideView("barbell deadlift")).toBe(true);
    expect(hasDistinctSideView("dumbbell curl")).toBe(true);
  });

  it("returns false for exercises without distinct side views", () => {
    // These exercises only have front views
    expect(hasDistinctSideView("russian twist")).toBe(false);
    expect(hasDistinctSideView("bicycle crunch")).toBe(false);
  });
});

describe("EXERCISE_GIFS front-view registry", () => {
  it("has entries for all major muscle groups", () => {
    const keys = Object.keys(EXERCISE_GIFS);
    // Check chest
    expect(keys.some(k => k.includes("bench-press"))).toBe(true);
    // Check back
    expect(keys.some(k => k.includes("pull-ups") || k.includes("pulldown"))).toBe(true);
    // Check legs
    expect(keys.some(k => k.includes("squat"))).toBe(true);
    // Check core
    expect(keys.some(k => k.includes("plank") || k.includes("crunch"))).toBe(true);
  });
});
