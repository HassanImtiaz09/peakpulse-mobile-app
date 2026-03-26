/**
 * Exercise Image Asset Resolver
 *
 * Maps exercise keys and legacy MuscleWiki URLs to CDN-hosted AI-generated images.
 * All exercise demonstrations are now AI-generated and served from CDN.
 */

import { EXERCISE_GIFS, CDN_GIFS } from "@/lib/exercise-gif-registry";

// Build a reverse lookup: key → CDN URL string
const KEY_TO_URL: Record<string, string> = {};

// Pre-build the lookup from the EXERCISE_GIFS keys
for (const [key, url] of Object.entries(EXERCISE_GIFS)) {
  KEY_TO_URL[key] = url;
}

// Default fallback asset
const FALLBACK_ASSET = EXERCISE_GIFS["male-bodyweight-push-up-front"] || "";

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
  return filename.replace(/\.(mp4|gif|webm|mov|png|jpg|jpeg)$/, "");
}

/**
 * Resolve a remote URL or asset key to a local GIF asset number or CDN URI.
 * Returns null if no matching GIF exists (used to show "not available" state).
 * Use resolveGifAsset() for guaranteed non-null result with fallback.
 */
export function resolveGifAssetOrNull(urlOrKey: string): number | string | null {
  if (!urlOrKey) return null;

  // If it's already a CDN URL we serve, return as-is
  if (urlOrKey.startsWith("https://files.manuscdn.com/")) return urlOrKey;

  // Direct key match
  if (KEY_TO_URL[urlOrKey]) return KEY_TO_URL[urlOrKey];

  // Extract stem from URL (handles MuscleWiki .mp4 URLs)
  const stem = extractStem(urlOrKey);
  if (stem && KEY_TO_URL[stem]) return KEY_TO_URL[stem];

  // Try case-insensitive match
  const stemLower = stem.toLowerCase();
  for (const [key, url] of Object.entries(KEY_TO_URL)) {
    if (key.toLowerCase() === stemLower) return url;
  }

  // For side-view URLs, try to find the corresponding front-view
  if (stem.includes("side") || stem.includes("Side")) {
    const frontStem = stem
      .replace(/-side_[A-Za-z0-9]+$/, "-front")
      .replace(/-side$/, "-front");
    if (KEY_TO_URL[frontStem]) return KEY_TO_URL[frontStem];
    const frontLower = frontStem.toLowerCase();
    for (const [key, url] of Object.entries(KEY_TO_URL)) {
      if (key.toLowerCase() === frontLower) return url;
    }
  }

  // Check CDN_GIFS map
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
  if (!stem.includes("side") && !stem.includes("Side")) return false;
  // Side views now resolve to front views, so they're always "available"
  return resolveGifAssetOrNull(url) !== null;
}
