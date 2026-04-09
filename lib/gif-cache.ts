/**
 * gif-cache.ts — MP4 Offline Cache
 *
 * WHAT CHANGED vs the previous version:
 *  - Handles .mp4 files instead of .gif files.
 *  - Cache directory renamed from "exercise-gifs" to "exercise-videos" to avoid
 *    confusion; existing cached GIF files are left untouched in their directory.
 *  - Exported helper resolveVideoUri() returns either a local file:// URI (if
 *    the file was previously cached) or the original https:// URL as fallback.
 *    This means the app works even if caching hasn't run yet or storage is full.
 *  - prefetchExerciseVideos() downloads a prioritised set of videos in the
 *    background so the most common exercises play without buffering.
 *
 * Integration
 * ───────────
 * In ExerciseVideoPlayer, call resolveVideoUri() before passing the URI:
 *
 *   import { resolveVideoUri } from "@/lib/gif-cache";
 *
 *   const [resolvedUri, setResolvedUri] = useState(uri);
 *   useEffect(() => {
 *     resolveVideoUri(uri).then(setResolvedUri);
 *   }, [uri]);
 *
 *   const player = useVideoPlayer({ uri: resolvedUri }, ...);
 *
 * Or call prefetchExerciseVideos() once on app launch (e.g. in _layout.tsx):
 *
 *   import { prefetchExerciseVideos } from "@/lib/gif-cache";
 *   useEffect(() => { prefetchExerciseVideos(); }, []);
 */

import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";
import { EXERCISE_GIFS } from "@/lib/exercise-gif-registry";

// ─── Constants ───────────────────────────────────────────────────────────────

const CACHE_DIR = `${FileSystem.cacheDirectory}exercise-videos/`;
const MAX_CACHE_BYTES = 150 * 1024 * 1024; // 150 MB safety cap

// ─── Internal helpers ────────────────────────────────────────────────────────

/** Convert a remote URL to a stable local filename */
function urlToFilename(url: string): string {
  // Extract the last path segment (the video filename) and sanitise it
  const segment = url.split("/").pop() ?? "unknown.mp4";
  return segment.replace(/[^a-zA-Z0-9._-]/g, "_");
}

const isWeb = Platform.OS === "web";

/** Ensure the cache directory exists */
async function ensureCacheDir(): Promise<void> {
  if (isWeb) return;
  const info = await FileSystem.getInfoAsync(CACHE_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Returns a local file:// URI for the given remote video URL.
 * If the file is already cached, returns the cached path immediately.
 * If not cached, starts downloading in the background and returns the
 * original URL so playback can begin from the network while caching.
 *
 * @param remoteUrl  https:// MP4 URL from exercise-gif-registry.ts
 * @returns          file:// URI (cached) or the original https:// URL (fallback)
 */
export async function resolveVideoUri(remoteUrl: string): Promise<string> {
  if (!remoteUrl || isWeb) return remoteUrl;

  try {
    await ensureCacheDir();
    const localPath = `${CACHE_DIR}${urlToFilename(remoteUrl)}`;
    const info = await FileSystem.getInfoAsync(localPath);

    if (info.exists) {
      return localPath; // Serve from cache
    }

    // Download in background; return remote URL immediately so video plays now
    FileSystem.downloadAsync(remoteUrl, localPath).catch(() => {
      // Silent failure — network may be unavailable, video still plays remotely
    });
  } catch {
    // Caching is optional; fall through to remote URL
  }

  return remoteUrl;
}

/**
 * Pre-download a prioritised list of exercise videos so they are
 * available offline. Safe to call on every app launch — already-cached
 * files are skipped.
 *
 * Call this once from your root layout:
 *   useEffect(() => { prefetchExerciseVideos(); }, []);
 */
export async function prefetchExerciseVideos(): Promise<void> {
  if (isWeb) return;
  try {
    await ensureCacheDir();

    // Check total cache size before downloading more
    const cacheInfo = await FileSystem.getInfoAsync(CACHE_DIR);
    if (cacheInfo.exists && "size" in cacheInfo && (cacheInfo.size ?? 0) > MAX_CACHE_BYTES) {
      console.log("[gif-cache] Cache size limit reached — skipping prefetch");
      return;
    }

    // Prioritised exercises — most commonly accessed in workout plans
    const PRIORITY_KEYS = [
      "male-Barbell-barbell-squat-front",
      "male-Barbell-barbell-squat-side",
      "male-Barbell-barbell-deadlift-front",
      "male-Barbell-barbell-deadlift-side",
      "male-barbell-bench-press-front",
      "male-barbell-bench-press-side",
      "male-Barbell-barbell-overhead-press-front",
      "male-Barbell-barbell-overhead-press-side",
      "male-bodyweight-push-up-front",
      "male-bodyweight-push-up-side",
      "male-Barbell-barbell-bent-over-row-front",
      "male-Barbell-barbell-bent-over-row-side",
      "male-Barbell-barbell-romanian-deadlift-front",
      "male-Barbell-barbell-romanian-deadlift-side",
      "male-Dumbbells-dumbbell-curl-front",
      "male-Dumbbells-dumbbell-curl-side",
      "male-Barbell-barbell-curl-front",
      "male-Barbell-barbell-curl-side",
      "male-Dumbbells-dumbbell-lateral-raise-front",
      "male-Dumbbells-dumbbell-lateral-raise-side",
    ];

    for (const key of PRIORITY_KEYS) {
      const url = EXERCISE_GIFS[key];
      if (!url) continue;

      const localPath = `${CACHE_DIR}${urlToFilename(url)}`;
      const info = await FileSystem.getInfoAsync(localPath);
      if (info.exists) continue; // Already cached

      try {
        await FileSystem.downloadAsync(url, localPath);
      } catch {
        // Continue if one download fails
      }
    }
  } catch (err) {
    console.warn("[gif-cache] Prefetch failed:", err);
  }
}

/**
 * Delete all cached video files.
 * Useful for a "Clear cache" button in Settings.
 */
export async function clearVideoCache(): Promise<void> {
  if (isWeb) return;
  try {
    const info = await FileSystem.getInfoAsync(CACHE_DIR);
    if (info.exists) {
      await FileSystem.deleteAsync(CACHE_DIR, { idempotent: true });
    }
  } catch (err) {
    console.warn("[gif-cache] Clear cache failed:", err);
  }
}

/**
 * Returns the total size of the video cache in bytes.
 * Returns 0 if the cache directory doesn't exist.
 */
export async function getVideoCacheSize(): Promise<number> {
  if (isWeb) return 0;
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
