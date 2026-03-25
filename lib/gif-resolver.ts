/**
 * GIF Asset Resolver
 *
 * Maps remote video/GIF URLs to locally bundled GIF assets.
 * This enables offline playback and eliminates "video unavailable" errors.
 * Now properly resolves side-view URLs to actual side-view GIF assets.
 */

import { EXERCISE_GIFS, CDN_GIFS } from "@/lib/exercise-gif-registry";

// Build a reverse lookup: URL filename stem → local asset
const URL_TO_ASSET: Record<string, number> = {};

// Pre-build the lookup from the EXERCISE_GIFS keys
for (const [key, asset] of Object.entries(EXERCISE_GIFS)) {
  URL_TO_ASSET[key] = asset as number;
}

// Default fallback asset
const FALLBACK_ASSET = EXERCISE_GIFS["male-bodyweight-push-up-front"];

/**
 * Extract the filename stem from a MuscleWiki/ExerciseDB URL.
 * e.g., "https://api.musclewiki.com/stream/videos/branded/male-barbell-bench-press-front.mp4"
 *       → "male-barbell-bench-press-front"
 */
function extractStem(url: string): string {
  if (!url) return "";
  // Remove query params
  const clean = url.split("?")[0];
  // Get last path segment
  const segments = clean.split("/");
  const filename = segments[segments.length - 1] || "";
  // Remove extension
  return filename.replace(/\.(mp4|gif|webm|mov)$/, "");
}

/**
 * Resolve a remote URL or asset key to a local GIF asset number or CDN URI.
 * Returns null if no matching GIF exists (used to show "not available" state).
 * Use resolveGifAsset() for guaranteed non-null result with fallback.
 */
export function resolveGifAssetOrNull(urlOrKey: string): number | string | null {
  if (!urlOrKey) return null;

  // Direct key match (local bundle)
  if (URL_TO_ASSET[urlOrKey]) return URL_TO_ASSET[urlOrKey];

  // Extract stem from URL
  const stem = extractStem(urlOrKey);
  if (stem && URL_TO_ASSET[stem]) return URL_TO_ASSET[stem];

  // Try case-insensitive match (local bundle)
  const stemLower = stem.toLowerCase();
  for (const [key, asset] of Object.entries(URL_TO_ASSET)) {
    if (key.toLowerCase() === stemLower) return asset;
  }

  // Check CDN-hosted GIFs (oversized files)
  if (CDN_GIFS[urlOrKey]) return CDN_GIFS[urlOrKey];
  if (stem && CDN_GIFS[stem]) return CDN_GIFS[stem];
  for (const [key, cdnUrl] of Object.entries(CDN_GIFS)) {
    if (key.toLowerCase() === stemLower) return cdnUrl;
  }

  return null;
}

/**
 * Resolve a remote URL or asset key to a local GIF asset number.
 * Falls back to push-up GIF if no match found.
 */
export function resolveGifAsset(urlOrKey: string): number | string {
  const result = resolveGifAssetOrNull(urlOrKey);
  if (result !== null) return result;

  // For side-view URLs without a local side GIF, DON'T fall back to front view.
  // Instead, return the fallback so the UI can detect this case.
  return FALLBACK_ASSET;
}

/**
 * Check if a local GIF asset exists for a given URL.
 * Returns true only if an exact match exists (not a fallback).
 */
export function hasLocalGif(url: string): boolean {
  return resolveGifAssetOrNull(url) !== null;
}

/**
 * Check if a side-view GIF exists for a given side-view URL.
 * This is used by the EnhancedGifPlayer to decide whether to show
 * the actual side-view GIF or a "side view not available" placeholder.
 */
export function hasSideViewGif(url: string): boolean {
  if (!url) return false;
  const stem = extractStem(url);
  // Must contain "side" in the stem and have a matching local asset
  if (!stem.includes("side") && !stem.includes("Side")) return false;
  return resolveGifAssetOrNull(url) !== null;
}
