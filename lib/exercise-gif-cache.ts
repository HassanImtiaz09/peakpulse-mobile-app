/**
 * exercise-gif-cache.ts — GIF Offline Cache for Active Workout Plans
 *
 * Downloads and caches exercise GIF files to disk so they load instantly
 * when the user is offline or has poor connectivity.
 *
 * Integration:
 *   1. When a workout plan is generated or started, call
 *      `prefetchWorkoutGifs(exerciseNames)` to download GIFs in background.
 *   2. In EnhancedGifPlayer / GifWebViewPlayer, call
 *      `resolveGifUri(remoteUrl)` to get a local file:// URI if cached,
 *      or the original https:// URL as fallback.
 *   3. Call `clearGifCache()` from Settings to free disk space.
 *
 * Uses expo-file-system/legacy for broad compatibility.
 */

import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";
import { getExerciseDbGifUrl } from "@/lib/exercisedb-api";
import { searchExercisesByName, hasExerciseDBKey } from "@/lib/exercisedb";

// ─── Constants ───────────────────────────────────────────────────────────────

const CACHE_DIR = `${FileSystem.cacheDirectory ?? ""}exercise-gifs/`;
const MAX_CACHE_BYTES = 200 * 1024 * 1024; // 200 MB safety cap
const DOWNLOAD_TIMEOUT_MS = 30_000; // 30 seconds per GIF

// ─── Internal helpers ────────────────────────────────────────────────────────

/** Convert a remote URL to a stable local filename */
function urlToFilename(url: string): string {
  // Use a hash-like approach: take the last path segment + sanitise
  const segment = url.split("/").pop() ?? "unknown.gif";
  return segment.replace(/[^a-zA-Z0-9._-]/g, "_");
}

/** Ensure the cache directory exists */
async function ensureCacheDir(): Promise<void> {
  if (Platform.OS === "web") return; // No file system on web
  const info = await FileSystem.getInfoAsync(CACHE_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
  }
}

/**
 * Resolve the GIF URL for an exercise name.
 * Priority: CDN → ExerciseDB API search
 */
async function resolveGifUrlForExercise(exerciseName: string): Promise<string | null> {
  // Priority 1: CDN GIF (synchronous, instant)
  const cdnUrl = getExerciseDbGifUrl(exerciseName);
  if (cdnUrl) return cdnUrl;

  // Priority 2: ExerciseDB API search
  if (hasExerciseDBKey()) {
    try {
      const results = await searchExercisesByName(exerciseName, 1);
      if (results.length > 0 && results[0].gifUrl) {
        return results[0].gifUrl;
      }
    } catch {
      // Ignore API errors
    }
  }

  return null;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Returns a local file:// URI for the given remote GIF URL if cached,
 * otherwise returns the original URL.
 *
 * @param remoteUrl  https:// GIF URL
 * @returns          file:// URI (cached) or the original https:// URL
 */
export async function resolveGifUri(remoteUrl: string): Promise<string> {
  if (!remoteUrl || Platform.OS === "web") return remoteUrl;

  try {
    await ensureCacheDir();
    const localPath = `${CACHE_DIR}${urlToFilename(remoteUrl)}`;
    const info = await FileSystem.getInfoAsync(localPath);

    if (info.exists && "size" in info && (info.size ?? 0) > 0) {
      return localPath; // Serve from cache
    }
  } catch {
    // Caching is optional; fall through to remote URL
  }

  return remoteUrl;
}

/**
 * Download a single GIF to the cache.
 * Returns true if successfully cached, false otherwise.
 */
async function downloadGif(remoteUrl: string): Promise<boolean> {
  if (!remoteUrl || Platform.OS === "web") return false;

  try {
    await ensureCacheDir();
    const localPath = `${CACHE_DIR}${urlToFilename(remoteUrl)}`;

    // Skip if already cached
    const info = await FileSystem.getInfoAsync(localPath);
    if (info.exists && "size" in info && (info.size ?? 0) > 0) {
      return true;
    }

    // Download with timeout
    const downloadResumable = FileSystem.createDownloadResumable(
      remoteUrl,
      localPath,
      {},
      undefined
    );

    const result = await Promise.race([
      downloadResumable.downloadAsync(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), DOWNLOAD_TIMEOUT_MS)),
    ]);

    if (result && "uri" in result) {
      return true;
    }

    // Timeout or failure — clean up partial download
    try {
      await FileSystem.deleteAsync(localPath, { idempotent: true });
    } catch {}
    return false;
  } catch {
    return false;
  }
}

/**
 * Pre-download GIFs for all exercises in a workout plan.
 * Call this when a workout plan is generated or when starting a workout.
 *
 * @param exerciseNames  Array of exercise names from the workout plan
 * @returns              Number of GIFs successfully cached
 */
export async function prefetchWorkoutGifs(exerciseNames: string[]): Promise<number> {
  if (Platform.OS === "web" || !exerciseNames.length) return 0;

  let cached = 0;

  try {
    await ensureCacheDir();

    // Check total cache size before downloading more
    const cacheInfo = await FileSystem.getInfoAsync(CACHE_DIR);
    if (cacheInfo.exists && "size" in cacheInfo && (cacheInfo.size ?? 0) > MAX_CACHE_BYTES) {
      console.log("[exercise-gif-cache] Cache size limit reached — skipping prefetch");
      return 0;
    }

    // Deduplicate exercise names
    const uniqueNames = [...new Set(exerciseNames.map((n) => n.toLowerCase()))];

    for (const name of uniqueNames) {
      try {
        const gifUrl = await resolveGifUrlForExercise(name);
        if (!gifUrl) continue;

        const success = await downloadGif(gifUrl);
        if (success) cached++;
      } catch {
        // Continue with next exercise
      }
    }

    console.log(
      `[exercise-gif-cache] Prefetched ${cached}/${uniqueNames.length} exercise GIFs`
    );
  } catch (err) {
    console.warn("[exercise-gif-cache] Prefetch failed:", err);
  }

  return cached;
}

/**
 * Resolve a GIF for an exercise name, preferring the cached version.
 * This combines URL resolution + cache lookup in one call.
 *
 * @param exerciseName  Human-readable exercise name
 * @returns             Local file:// URI or remote https:// URL, or null if no GIF found
 */
export async function resolveExerciseGif(exerciseName: string): Promise<string | null> {
  const remoteUrl = await resolveGifUrlForExercise(exerciseName);
  if (!remoteUrl) return null;

  // Try to serve from cache
  const resolved = await resolveGifUri(remoteUrl);
  return resolved;
}

/**
 * Delete all cached GIF files.
 * Useful for a "Clear cache" button in Settings.
 */
export async function clearGifCache(): Promise<void> {
  if (Platform.OS === "web") return;

  try {
    const info = await FileSystem.getInfoAsync(CACHE_DIR);
    if (info.exists) {
      await FileSystem.deleteAsync(CACHE_DIR, { idempotent: true });
    }
  } catch (err) {
    console.warn("[exercise-gif-cache] Clear cache failed:", err);
  }
}

/**
 * Returns the total size of the GIF cache in bytes.
 * Returns 0 if the cache directory doesn't exist.
 */
export async function getGifCacheSize(): Promise<number> {
  if (Platform.OS === "web") return 0;

  try {
    const info = await FileSystem.getInfoAsync(CACHE_DIR);
    if (info.exists && "size" in info) {
      return info.size ?? 0;
    }
  } catch {
    // Ignore
  }
  return 0;
}

/**
 * Returns a human-readable cache size string.
 */
export async function getGifCacheSizeFormatted(): Promise<string> {
  const bytes = await getGifCacheSize();
  if (bytes === 0) return "0 KB";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
