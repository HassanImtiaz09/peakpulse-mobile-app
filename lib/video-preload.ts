/**
 * Video Preload Service
 *
 * Prefetches the next exercise's video URLs during rest periods
 * so transitions between exercises are seamless.
 *
 * Uses expo-video's caching capability (useCaching: true on VideoSource)
 * and a simple fetch-based warm-up for web platform.
 *
 * Strategy:
 * 1. When a rest timer starts, preload the next exercise's videos
 * 2. Uses native video caching on iOS/Android
 * 3. Falls back to fetch() warm-up on web
 */
import { Platform } from "react-native";
import { getExerciseDemo } from "./exercise-demos";
import { getExerciseInfo, type ExerciseInfo } from "./exercise-data";

export interface PreloadStatus {
  /** Exercise name being preloaded */
  exerciseName: string;
  /** Whether preloading has started */
  started: boolean;
  /** Whether preloading is complete */
  complete: boolean;
  /** URLs that were preloaded */
  urls: string[];
}

/** Track preloaded URLs to avoid duplicate work */
const preloadedUrls = new Set<string>();

/** Current preload status */
let currentPreload: PreloadStatus | null = null;

/**
 * Build a VideoSource object with caching enabled.
 * This format is used by expo-video's useVideoPlayer.
 */
export function buildCachedVideoSource(url: string): { uri: string; useCaching: boolean } | string {
  if (Platform.OS === "web") {
    // Web doesn't support useCaching, just return the URL string
    return url;
  }
  // Native: enable persistent caching
  return {
    uri: url,
    useCaching: true,
  };
}

/**
 * Check if a URL is a video (MP4) vs GIF
 */
function isVideoUrl(url: string): boolean {
  return url.endsWith(".mp4") || url.endsWith(".webm") || url.endsWith(".mov");
}

/**
 * Warm up a URL by initiating a fetch request.
 * This populates the HTTP cache and CDN edge cache.
 * For videos, we only fetch the first chunk (range request).
 */
async function warmUpUrl(url: string): Promise<void> {
  if (preloadedUrls.has(url)) return;

  try {
    if (Platform.OS === "web") {
      // On web, fetch with range to warm up the connection
      await fetch(url, {
        method: "GET",
        headers: isVideoUrl(url) ? { Range: "bytes=0-65535" } : {},
      });
    } else {
      // On native, fetch the first 64KB to warm up the CDN connection
      // The actual caching is handled by expo-video's useCaching
      await fetch(url, {
        method: "HEAD",
      });
    }
    preloadedUrls.add(url);
  } catch {
    // Silently fail — preloading is best-effort
  }
}

/**
 * Collect all video URLs for a given exercise name.
 * Includes the main demo URL and all angle view URLs.
 */
export function getExerciseVideoUrls(exerciseName: string): string[] {
  const urls: string[] = [];
  const seen = new Set<string>();

  // Main demo URL
  const demo = getExerciseDemo(exerciseName);
  if (demo.gifUrl && !seen.has(demo.gifUrl)) {
    urls.push(demo.gifUrl);
    seen.add(demo.gifUrl);
  }

  // Angle view URLs from exercise data
  const normalised = exerciseName.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
  const exerciseInfo = getExerciseInfo(exerciseName);
  if (exerciseInfo) {
    for (const view of exerciseInfo.angleViews) {
      if (view.gifUrl && !seen.has(view.gifUrl)) {
        urls.push(view.gifUrl);
        seen.add(view.gifUrl);
      }
    }
  }

  return urls;
}

/**
 * Preload videos for the next exercise.
 * Call this when a rest timer starts or when transitioning exercises.
 *
 * @param exerciseName - The name of the next exercise to preload
 * @returns PreloadStatus with the current state
 */
export async function preloadExerciseVideos(exerciseName: string): Promise<PreloadStatus> {
  const urls = getExerciseVideoUrls(exerciseName);

  const status: PreloadStatus = {
    exerciseName,
    started: true,
    complete: false,
    urls,
  };
  currentPreload = status;

  // Warm up all URLs in parallel
  await Promise.allSettled(urls.map(warmUpUrl));

  status.complete = true;
  return status;
}

/**
 * Get the current preload status.
 */
export function getPreloadStatus(): PreloadStatus | null {
  return currentPreload;
}

/**
 * Check if a specific URL has been preloaded.
 */
export function isUrlPreloaded(url: string): boolean {
  return preloadedUrls.has(url);
}

/**
 * Clear all preload tracking (e.g., when leaving workout screen).
 */
export function clearPreloadCache(): void {
  preloadedUrls.clear();
  currentPreload = null;
}

/**
 * Get the count of preloaded URLs.
 */
export function getPreloadedCount(): number {
  return preloadedUrls.size;
}
