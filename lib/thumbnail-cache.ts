/**
 * Thumbnail Cache Service
 *
 * Caches YouTube video thumbnails locally for instant loading.
 * Uses expo-file-system cacheDirectory on native, browser cache on web.
 *
 * Cache strategy:
 * - On native: downloads thumbnails to cacheDirectory with TTL tracking in AsyncStorage
 * - On web: returns the remote URL directly (browser handles caching)
 * - TTL: 7 days before re-downloading
 * - Pre-caches all thumbnails for a workout's exercises on plan load
 */
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Lazy-import FileSystem only on native to avoid web crashes
let FileSystem: typeof import("expo-file-system/legacy") | null = null;
if (Platform.OS !== "web") {
  FileSystem = require("expo-file-system/legacy");
}

const CACHE_PREFIX = "thumb_cache_";
const CACHE_META_KEY = "@thumbnail_cache_meta";
const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface CacheMeta {
  [videoId: string]: {
    localUri: string;
    cachedAt: number;
  };
}

let metaCache: CacheMeta | null = null;

/** Load cache metadata from AsyncStorage */
async function loadMeta(): Promise<CacheMeta> {
  if (metaCache) return metaCache;
  try {
    const raw = await AsyncStorage.getItem(CACHE_META_KEY);
    metaCache = raw ? JSON.parse(raw) : {};
  } catch {
    metaCache = {};
  }
  return metaCache!;
}

/** Save cache metadata to AsyncStorage */
async function saveMeta(meta: CacheMeta): Promise<void> {
  metaCache = meta;
  try {
    await AsyncStorage.setItem(CACHE_META_KEY, JSON.stringify(meta));
  } catch {
    // Silent fail — cache is non-critical
  }
}

/** Get the YouTube thumbnail URL for a video ID */
export function getThumbnailUrl(videoId: string, quality: "mq" | "hq" | "sd" | "maxres" = "mq"): string {
  return `https://img.youtube.com/vi/${videoId}/${quality}default.jpg`;
}

/**
 * Get a cached thumbnail URI for a video ID.
 * Returns local file URI if cached and valid, otherwise returns the remote URL.
 * On web, always returns the remote URL.
 */
export async function getCachedThumbnail(videoId: string): Promise<string> {
  const remoteUrl = getThumbnailUrl(videoId, "mq");

  // Web: rely on browser caching
  if (Platform.OS === "web" || !FileSystem) {
    return remoteUrl;
  }

  try {
    const meta = await loadMeta();
    const entry = meta[videoId];

    // Check if cached and not expired
    if (entry) {
      const age = Date.now() - entry.cachedAt;
      if (age < TTL_MS) {
        // Verify file still exists
        const info = await FileSystem!.getInfoAsync(entry.localUri);
        if (info.exists) {
          return entry.localUri;
        }
      }
    }

    // Download and cache
    const localUri = `${FileSystem!.cacheDirectory}${CACHE_PREFIX}${videoId}.jpg`;
    await FileSystem!.downloadAsync(remoteUrl, localUri);

    // Update meta
    meta[videoId] = { localUri, cachedAt: Date.now() };
    await saveMeta(meta);

    return localUri;
  } catch {
    // Fallback to remote URL on any error
    return remoteUrl;
  }
}

/**
 * Pre-cache thumbnails for a list of video IDs.
 * Runs in the background, does not block.
 * Skips already-cached thumbnails.
 */
export async function preCacheThumbnails(videoIds: string[]): Promise<void> {
  if (Platform.OS === "web" || !FileSystem) return;

  const meta = await loadMeta();
  const now = Date.now();

  const toCache = videoIds.filter((id) => {
    const entry = meta[id];
    if (!entry) return true;
    return now - entry.cachedAt >= TTL_MS;
  });

  // Download in parallel with concurrency limit
  const CONCURRENCY = 3;
  for (let i = 0; i < toCache.length; i += CONCURRENCY) {
    const batch = toCache.slice(i, i + CONCURRENCY);
    await Promise.allSettled(
      batch.map(async (videoId) => {
        try {
          const remoteUrl = getThumbnailUrl(videoId, "mq");
          const localUri = `${FileSystem!.cacheDirectory}${CACHE_PREFIX}${videoId}.jpg`;
          await FileSystem!.downloadAsync(remoteUrl, localUri);
          meta[videoId] = { localUri, cachedAt: Date.now() };
        } catch {
          // Skip failed downloads
        }
      })
    );
  }

  await saveMeta(meta);
}

/**
 * Clear expired thumbnails from cache.
 * Call periodically (e.g., on app start) to free disk space.
 */
export async function clearExpiredThumbnails(): Promise<number> {
  if (Platform.OS === "web" || !FileSystem) return 0;

  const meta = await loadMeta();
  const now = Date.now();
  let cleared = 0;

  for (const [videoId, entry] of Object.entries(meta)) {
    if (now - entry.cachedAt >= TTL_MS) {
      try {
        await FileSystem!.deleteAsync(entry.localUri, { idempotent: true });
      } catch {
        // Ignore delete errors
      }
      delete meta[videoId];
      cleared++;
    }
  }

  await saveMeta(meta);
  return cleared;
}

/**
 * Get cache statistics for debugging/display.
 */
export async function getCacheStats(): Promise<{
  totalCached: number;
  expiredCount: number;
}> {
  if (Platform.OS === "web") return { totalCached: 0, expiredCount: 0 };

  const meta = await loadMeta();
  const now = Date.now();
  let expiredCount = 0;

  for (const entry of Object.values(meta)) {
    if (now - entry.cachedAt >= TTL_MS) expiredCount++;
  }

  return {
    totalCached: Object.keys(meta).length,
    expiredCount,
  };
}
