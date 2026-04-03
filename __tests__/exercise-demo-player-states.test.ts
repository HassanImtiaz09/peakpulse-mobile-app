import { describe, it, expect } from "vitest";

/**
 * Unit tests for ExerciseDemoPlayer video loading/error state logic.
 *
 * These tests validate the pure logic that drives the skeleton overlay
 * and error fallback — they do not render React components.
 */

// ---- helpers that mirror the component logic ----

function isVideoUrl(url: string | number | undefined): url is string {
  if (typeof url !== "string") return false;
  return url.endsWith(".mp4") || url.endsWith(".webm") || url.endsWith(".mov");
}

type VideoPlayerStatus = "idle" | "loading" | "readyToPlay" | "error";

function computeVideoIsLoading(
  isCurrentVideo: boolean,
  status: VideoPlayerStatus
): boolean {
  return isCurrentVideo && (status === "loading" || status === "idle");
}

function computeVideoHasError(
  isCurrentVideo: boolean,
  status: VideoPlayerStatus
): boolean {
  return isCurrentVideo && status === "error";
}

function buildVideoSourceUri(
  currentAsset: string,
  retryKey: number
): string {
  return currentAsset + (retryKey > 0 ? `#retry=${retryKey}` : "");
}

// ---- isVideoUrl ----

describe("isVideoUrl", () => {
  it("returns true for .mp4 URLs", () => {
    expect(isVideoUrl("https://musclewiki.com/exercise.mp4")).toBe(true);
  });

  it("returns true for .webm URLs", () => {
    expect(isVideoUrl("https://example.com/video.webm")).toBe(true);
  });

  it("returns true for .mov URLs", () => {
    expect(isVideoUrl("https://example.com/video.mov")).toBe(true);
  });

  it("returns false for .gif URLs", () => {
    expect(isVideoUrl("https://example.com/exercise.gif")).toBe(false);
  });

  it("returns false for number assets", () => {
    expect(isVideoUrl(42)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isVideoUrl(undefined)).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isVideoUrl("")).toBe(false);
  });
});

// ---- computeVideoIsLoading ----

describe("computeVideoIsLoading", () => {
  it("returns true when video is loading", () => {
    expect(computeVideoIsLoading(true, "loading")).toBe(true);
  });

  it("returns true when video is idle", () => {
    expect(computeVideoIsLoading(true, "idle")).toBe(true);
  });

  it("returns false when video is readyToPlay", () => {
    expect(computeVideoIsLoading(true, "readyToPlay")).toBe(false);
  });

  it("returns false when video has error", () => {
    expect(computeVideoIsLoading(true, "error")).toBe(false);
  });

  it("returns false when asset is not a video (GIF)", () => {
    expect(computeVideoIsLoading(false, "loading")).toBe(false);
  });
});

// ---- computeVideoHasError ----

describe("computeVideoHasError", () => {
  it("returns true when video has error status", () => {
    expect(computeVideoHasError(true, "error")).toBe(true);
  });

  it("returns false when video is loading", () => {
    expect(computeVideoHasError(true, "loading")).toBe(false);
  });

  it("returns false when video is readyToPlay", () => {
    expect(computeVideoHasError(true, "readyToPlay")).toBe(false);
  });

  it("returns false when asset is not a video", () => {
    expect(computeVideoHasError(false, "error")).toBe(false);
  });
});

// ---- buildVideoSourceUri (retry cache-busting) ----

describe("buildVideoSourceUri", () => {
  it("returns plain URL when retryKey is 0", () => {
    const url = "https://musclewiki.com/exercise.mp4";
    expect(buildVideoSourceUri(url, 0)).toBe(url);
  });

  it("appends retry fragment when retryKey > 0", () => {
    const url = "https://musclewiki.com/exercise.mp4";
    expect(buildVideoSourceUri(url, 1)).toBe(url + "#retry=1");
  });

  it("increments retry fragment correctly", () => {
    const url = "https://musclewiki.com/exercise.mp4";
    expect(buildVideoSourceUri(url, 3)).toBe(url + "#retry=3");
  });
});

// ---- State transition scenarios ----

describe("Video state transitions", () => {
  it("loading → readyToPlay hides skeleton", () => {
    // Simulate transition
    expect(computeVideoIsLoading(true, "loading")).toBe(true);
    expect(computeVideoIsLoading(true, "readyToPlay")).toBe(false);
    expect(computeVideoHasError(true, "readyToPlay")).toBe(false);
  });

  it("loading → error shows error overlay", () => {
    expect(computeVideoIsLoading(true, "loading")).toBe(true);
    expect(computeVideoIsLoading(true, "error")).toBe(false);
    expect(computeVideoHasError(true, "error")).toBe(true);
  });

  it("error → retry → loading shows skeleton again", () => {
    expect(computeVideoHasError(true, "error")).toBe(true);
    // After retry, status resets to loading
    expect(computeVideoIsLoading(true, "loading")).toBe(true);
    expect(computeVideoHasError(true, "loading")).toBe(false);
  });

  it("switching from video to GIF hides both overlays", () => {
    // When asset changes to a non-video, both should be false
    expect(computeVideoIsLoading(false, "loading")).toBe(false);
    expect(computeVideoHasError(false, "error")).toBe(false);
  });
});
