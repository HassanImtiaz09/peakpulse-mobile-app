/**
 * Offline GIF Cache Service
 *
 * Pre-downloads animated exercise GIFs for the user's active workout plan
 * so they display instantly without network delay. Uses expo-file-system
 * cacheDirectory for storage (auto-managed by OS, no iCloud backup).
 *
 * Features:
 * - Pre-download all GIFs for a workout plan's exercises
 * - Serve cached GIF URIs instead of remote URLs
 * - Track cache status (total, cached, in-progress)
 * - Clear cache on demand
 * - Web fallback (no-op, uses browser cache)
 *
 * Usage:
 *   import { preCacheWorkoutGifs, getCachedGifUri } from "@/lib/gif-cache";
 *   await preCacheWorkoutGifs(exercises);
 *   const localUri = await getCachedGifUri("bench press");
 */

import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getExerciseDbGifUrl } from "@/lib/exercisedb-api";
import { getExerciseDemo } from "@/lib/exercise-demos";
import { EXERCISE_GIFS } from "@/lib/exercise-gif-registry";

// ── Types ────────────────────────────────────────────────────────────────────

export interface GifCacheStatus {
  /** Total number of exercises in the plan */
  totalExercises: number;
  /** Number of GIFs with remote URLs available */
  totalGifs: number;
  /** Number of GIFs successfully cached locally */
  cachedGifs: number;
  /** Whether caching is currently in progress */
  isCaching: boolean;
  /** Last cache timestamp */
  lastCachedAt: string | null;
  /** Approximate cache size in human-readable format */
  cacheSize: string;
}

export interface GifCacheEntry {
  /** Remote URL */
  remoteUrl: string;
  /** Local file URI (null if not cached) */
  localUri: string | null;
  /** Whether the file was successfully downloaded */
  cached: boolean;
  /** Timestamp of download */
  cachedAt: string | null;
}

type CacheManifest = Record<string, GifCacheEntry>;

// ── Constants ────────────────────────────────────────────────────────────────

const MANIFEST_KEY = "@gif_cache_manifest";
const CACHE_DIR = "exercise-gifs/";
let _isCaching = false;
let _listeners: Array<(status: GifCacheStatus) => void> = [];

// ── FileSystem lazy import ──────────────────────────────────────────────────

// expo-file-system legacy API types
interface LegacyFileSystem {
  cacheDirectory: string | null;
  documentDirectory: string | null;
  getInfoAsync(uri: string): Promise<{ exists: boolean; size?: number }>;
  downloadAsync(uri: string, fileUri: string): Promise<{ uri: string }>;
  makeDirectoryAsync(uri: string, options?: { intermediates?: boolean }): Promise<void>;
  deleteAsync(uri: string, options?: { idempotent?: boolean }): Promise<void>;
  readDirectoryAsync(uri: string): Promise<string[]>;
}

let _FileSystem: LegacyFileSystem | null = null;

async function getFileSystem(): Promise<LegacyFileSystem | null> {
  if (_FileSystem) return _FileSystem;
  if (Platform.OS === "web") return null;
  try {
    const mod = await import("expo-file-system/legacy" as any);
    _FileSystem = mod as unknown as LegacyFileSystem;
    return _FileSystem;
  } catch {
    try {
      const mod = await import("expo-file-system" as any);
      _FileSystem = mod as unknown as LegacyFileSystem;
      return _FileSystem;
    } catch {
      return null;
    }
  }
}

async function getCacheDir(): Promise<string | null> {
  const fs = await getFileSystem();
  if (!fs?.cacheDirectory) return null;
  return fs.cacheDirectory + CACHE_DIR;
}

// ── Manifest Operations ─────────────────────────────────────────────────────

async function loadManifest(): Promise<CacheManifest> {
  try {
    const raw = await AsyncStorage.getItem(MANIFEST_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as CacheManifest;
  } catch {
    return {};
  }
}

async function saveManifest(manifest: CacheManifest): Promise<void> {
  try {
    await AsyncStorage.setItem(MANIFEST_KEY, JSON.stringify(manifest));
  } catch {}
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Get all remote GIF URLs for a list of exercise names.
 * Checks both ExerciseDB animated GIFs and static demo images.
 */
function getGifUrlsForExercises(exerciseNames: string[]): Record<string, string> {
  const urls: Record<string, string> = {};
  const seen = new Set<string>();

  for (const name of exerciseNames) {
    const norm = name.toLowerCase().replace(/[^a-z0-9 -]/g, "").trim();
    if (seen.has(norm)) continue;
    seen.add(norm);

    // Prefer animated ExerciseDB GIF
    const animatedUrl = getExerciseDbGifUrl(name);
    if (animatedUrl) {
      urls[norm] = animatedUrl;
      continue;
    }

    // Fall back to static demo image
    const demo = getExerciseDemo(name);
    if (demo && typeof demo.gifAsset === "string" && demo.gifAsset.startsWith("http")) {
      urls[norm] = demo.gifAsset;
    }
  }

  return urls;
}

/**
 * Generate a safe filename from a URL.
 */
function urlToFilename(url: string): string {
  // Use last path segment + hash of full URL for uniqueness
  const parts = url.split("/");
  const lastPart = parts[parts.length - 1] || "gif";
  // Simple hash
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    hash = ((hash << 5) - hash + url.charCodeAt(i)) | 0;
  }
  const ext = lastPart.includes(".gif") ? ".gif" : ".png";
  return `${Math.abs(hash).toString(36)}_${lastPart.replace(/[^a-zA-Z0-9._-]/g, "")}${lastPart.includes(".") ? "" : ext}`;
}

// ── Notify listeners ────────────────────────────────────────────────────────

function notifyListeners(status: GifCacheStatus) {
  for (const listener of _listeners) {
    try { listener(status); } catch {}
  }
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Subscribe to cache status updates.
 * Returns an unsubscribe function.
 */
export function onGifCacheStatusChange(listener: (status: GifCacheStatus) => void): () => void {
  _listeners.push(listener);
  return () => {
    _listeners = _listeners.filter((l) => l !== listener);
  };
}

/**
 * Pre-cache all GIFs for a list of exercise names.
 * Downloads animated GIFs (and static fallbacks) to local filesystem.
 *
 * @param exerciseNames - Array of exercise names from the workout plan
 * @param onProgress - Optional callback for progress updates
 * @returns Summary of caching results
 */
export async function preCacheWorkoutGifs(
  exerciseNames: string[],
  onProgress?: (cached: number, total: number) => void
): Promise<{ cached: number; failed: number; skipped: number; total: number }> {
  // Web: no-op (browser handles caching)
  if (Platform.OS === "web") {
    return { cached: 0, failed: 0, skipped: 0, total: 0 };
  }

  if (_isCaching) {
    return { cached: 0, failed: 0, skipped: 0, total: 0 };
  }

  _isCaching = true;

  const fs = await getFileSystem();
  const cacheDir = await getCacheDir();
  if (!fs || !cacheDir) {
    _isCaching = false;
    return { cached: 0, failed: 0, skipped: 0, total: 0 };
  }

  // Ensure cache directory exists
  try {
    const dirInfo = await fs.getInfoAsync(cacheDir);
    if (!dirInfo.exists) {
      await fs.makeDirectoryAsync(cacheDir, { intermediates: true });
    }
  } catch {
    _isCaching = false;
    return { cached: 0, failed: 0, skipped: 0, total: 0 };
  }

  const gifUrls = getGifUrlsForExercises(exerciseNames);
  const manifest = await loadManifest();
  const total = Object.keys(gifUrls).length;
  let cached = 0;
  let failed = 0;
  let skipped = 0;

  for (const [exerciseKey, remoteUrl] of Object.entries(gifUrls)) {
    // Check if already cached and file still exists
    const existing = manifest[exerciseKey];
    if (existing?.cached && existing.localUri) {
      try {
        const info = await fs.getInfoAsync(existing.localUri);
        if (info.exists) {
          skipped++;
          cached++;
          onProgress?.(cached, total);
          continue;
        }
      } catch {}
    }

    // Download the file
    const filename = urlToFilename(remoteUrl);
    const localPath = cacheDir + filename;

    try {
      const result = await fs.downloadAsync(remoteUrl, localPath);
      if (result && result.uri) {
        manifest[exerciseKey] = {
          remoteUrl,
          localUri: result.uri,
          cached: true,
          cachedAt: new Date().toISOString(),
        };
        cached++;
      } else {
        failed++;
        manifest[exerciseKey] = {
          remoteUrl,
          localUri: null,
          cached: false,
          cachedAt: null,
        };
      }
    } catch (err) {
      failed++;
      manifest[exerciseKey] = {
        remoteUrl,
        localUri: null,
        cached: false,
        cachedAt: null,
      };
      console.warn(`[GifCache] Failed to download GIF for "${exerciseKey}":`, err);
    }

    onProgress?.(cached, total);

    // Notify listeners
    notifyListeners({
      totalExercises: exerciseNames.length,
      totalGifs: total,
      cachedGifs: cached,
      isCaching: true,
      lastCachedAt: new Date().toISOString(),
      cacheSize: `${cached} files`,
    });
  }

  await saveManifest(manifest);
  _isCaching = false;

  const finalStatus: GifCacheStatus = {
    totalExercises: exerciseNames.length,
    totalGifs: total,
    cachedGifs: cached,
    isCaching: false,
    lastCachedAt: new Date().toISOString(),
    cacheSize: `${cached} files`,
  };
  notifyListeners(finalStatus);

  return { cached, failed, skipped, total };
}

/**
 * Get the cached local URI for an exercise's GIF.
 * Returns the local file URI if cached, otherwise the remote URL.
 * This allows seamless fallback to remote when cache misses.
 */
export async function getCachedGifUri(exerciseName: string): Promise<string | null> {
  if (Platform.OS === "web") {
    // On web, just return the remote URL
    return getExerciseDbGifUrl(exerciseName);
  }

  const norm = exerciseName.toLowerCase().replace(/[^a-z0-9 -]/g, "").trim();
  const manifest = await loadManifest();
  const entry = manifest[norm];

  if (entry?.cached && entry.localUri) {
    // Verify file still exists
    try {
      const fs = await getFileSystem();
      if (fs) {
        const info = await fs.getInfoAsync(entry.localUri);
        if (info.exists) {
          return entry.localUri;
        }
      }
    } catch {}
  }

  // Fall back to remote URL
  return getExerciseDbGifUrl(exerciseName);
}

/**
 * Synchronous check if a GIF is likely cached (based on manifest, no file check).
 * Useful for UI indicators without async overhead.
 */
let _manifestCache: CacheManifest | null = null;

export function refreshManifestCache(): void {
  AsyncStorage.getItem(MANIFEST_KEY).then((raw) => {
    _manifestCache = raw ? JSON.parse(raw) : {};
  }).catch(() => {});
}

export function isGifCachedSync(exerciseName: string): boolean {
  if (Platform.OS === "web") return false;
  if (!_manifestCache) return false;
  const norm = exerciseName.toLowerCase().replace(/[^a-z0-9 -]/g, "").trim();
  return _manifestCache[norm]?.cached === true;
}

/**
 * Get the current cache status.
 */
export async function getGifCacheStatus(): Promise<GifCacheStatus> {
  const manifest = await loadManifest();
  const entries = Object.values(manifest);
  const cachedCount = entries.filter((e) => e.cached).length;
  const lastEntry = entries
    .filter((e) => e.cachedAt)
    .sort((a, b) => (b.cachedAt! > a.cachedAt! ? 1 : -1))[0];

  return {
    totalExercises: entries.length,
    totalGifs: entries.length,
    cachedGifs: cachedCount,
    isCaching: _isCaching,
    lastCachedAt: lastEntry?.cachedAt ?? null,
    cacheSize: `${cachedCount} files`,
  };
}

/**
 * Clear all cached GIFs and manifest.
 */
export async function clearGifCache(): Promise<void> {
  try {
    const fs = await getFileSystem();
    const cacheDir = await getCacheDir();
    if (fs && cacheDir) {
      const dirInfo = await fs.getInfoAsync(cacheDir);
      if (dirInfo.exists) {
        await fs.deleteAsync(cacheDir, { idempotent: true });
      }
    }
    await AsyncStorage.removeItem(MANIFEST_KEY);
    _manifestCache = null;
  } catch {}
}

/**
 * Get the approximate size of the GIF cache in bytes.
 */
export async function getGifCacheSizeBytes(): Promise<number> {
  if (Platform.OS === "web") return 0;
  try {
    const fs = await getFileSystem();
    const cacheDir = await getCacheDir();
    if (!fs || !cacheDir) return 0;

    const dirInfo = await fs.getInfoAsync(cacheDir);
    if (!dirInfo.exists) return 0;

    // Read directory and sum file sizes
    const files = await fs.readDirectoryAsync(cacheDir);
    let totalSize = 0;
    for (const file of files) {
      try {
        const fileInfo = await fs.getInfoAsync(cacheDir + file);
        if (fileInfo.exists && "size" in fileInfo) {
          totalSize += (fileInfo as any).size ?? 0;
        }
      } catch {}
    }
    return totalSize;
  } catch {
    return 0;
  }
}

/**
 * Format bytes to human-readable string.
 */
export function formatCacheSize(bytes: number): string {
  if (bytes === 0) return "0 KB";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Initialize manifest cache on module load
refreshManifestCache();
