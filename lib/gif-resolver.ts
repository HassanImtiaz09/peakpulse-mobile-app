/**
 * Exercise Image Asset Resolver
 *
 * Maps exercise keys and legacy MuscleWiki URLs to CDN-hosted AI-generated images.
 * Supports distinct side-view images for 15 key compound exercises.
 */

import { EXERCISE_GIFS, SIDE_VIEW_GIFS } from "@/lib/exercise-gif-registry";

// Build a reverse lookup: key â CDN URL string
const KEY_TO_URL: Record<string, string> = {};

// Pre-build the lookup from the EXERCISE_GIFS keys
for (const [key, url] of Object.entries(EXERCISE_GIFS)) {
  KEY_TO_URL[key] = url;
}

// Build side-view lookup
const SIDE_KEY_TO_URL: Record<string, string> = {};
for (const [key, url] of Object.entries(SIDE_VIEW_GIFS)) {
  SIDE_KEY_TO_URL[key] = url;
}

// Default fallback asset
const FALLBACK_ASSET = EXERCISE_GIFS["male-bodyweight-push-up-front"] || "";

/**
 * Extract the filename stem from a MuscleWiki/ExerciseDB URL.
 * e.g., "https://api.musclewiki.com/stream/videos/branded/male-barbell-bench-press-front.mp4"
 *       â "male-barbell-bench-press-front"
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
 * Extract a normalised side-view key from a URL.
 * e.g., "https://d2xsxph8kpxj0f.cloudfront.net/.../side-barbell-bench-press-7VJGMpqMVBNhKxPbTUMnM5.png"
 *       â "side-barbell-bench-press"
 */
function extractSideKey(url: string): string | null {
  const stem = extractStem(url);
  if (!stem) return null;
  // Match "side-<exercise-name>" pattern, strip the trailing random ID
  const match = stem.match(/^(side-[a-z-]+?)(?:-[A-Za-z0-9]{10,})?$/);
  if (match) return match[1];
  // Fallback: if stem starts with "side-", use as-is
  if (stem.startsWith("side-")) return stem;
  return null;
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
  if (urlOrKey.startsWith("https://d2xsxph8kpxj0f.cloudfront.net/")) return urlOrKey;
  if (urlOrKey.startsWith("https://media.musclewiki.com/")) return urlOrKey;

  // Direct key match in front-view registry
  if (KEY_TO_URL[urlOrKey]) return KEY_TO_URL[urlOrKey];

  // Direct key match in side-view registry
  if (SIDE_KEY_TO_URL[urlOrKey]) return SIDE_KEY_TO_URL[urlOrKey];

  // Extract stem from URL (handles MuscleWiki .mp4 URLs)
  const stem = extractStem(urlOrKey);
  if (stem && KEY_TO_URL[stem]) return KEY_TO_URL[stem];
  if (stem && SIDE_KEY_TO_URL[stem]) return SIDE_KEY_TO_URL[stem];

  // Try case-insensitive match
  const stemLower = stem.toLowerCase();
  for (const [key, url] of Object.entries(KEY_TO_URL)) {
    if (key.toLowerCase() === stemLower) return url;
  }
  for (const [key, url] of Object.entries(SIDE_KEY_TO_URL)) {
    if (key.toLowerCase() === stemLower) return url;
  }

  // For side-view URLs, try to find a distinct side-view image first
  if (stem.includes("side") || stem.includes("Side")) {
    const sideKey = extractSideKey(urlOrKey);
    if (sideKey && SIDE_KEY_TO_URL[sideKey]) return SIDE_KEY_TO_URL[sideKey];

    // Try case-insensitive side-view match
    if (sideKey) {
      const sideLower = sideKey.toLowerCase();
      for (const [key, url] of Object.entries(SIDE_KEY_TO_URL)) {
        if (key.toLowerCase() === sideLower) return url;
      }
    }

    // Fall back to the corresponding front-view
    const frontStem = stem
      .replace(/-side_[A-Za-z0-9]+$/, "-front")
      .replace(/-side$/, "-front");
    if (KEY_TO_URL[frontStem]) return KEY_TO_URL[frontStem];
    const frontLower = frontStem.toLowerCase();
    for (const [key, url] of Object.entries(KEY_TO_URL)) {
      if (key.toLowerCase() === frontLower) return url;
    }
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
 * Check if a distinct side-view image exists for a given side-view URL.
 * Returns true only if a unique side-view image exists (not just the front view).
 */
export function hasSideViewGif(url: string): boolean {
  if (!url) return false;
  const stem = extractStem(url);
  if (!stem.includes("side") && !stem.includes("Side")) return false;

  // Check if we have a distinct side-view image (not just falling back to front)
  const sideKey = extractSideKey(url);
  if (sideKey && SIDE_KEY_TO_URL[sideKey]) return true;

  // Also check if the URL itself is already a CDN side-view URL
  if (url.startsWith("https://d2xsxph8kpxj0f.cloudfront.net/")) return true;

  return false;
}

/**
 * Check if an exercise has a distinct side-view image available.
 * Takes the exercise name and checks the side-view registry.
 */
export function hasDistinctSideView(exerciseName: string): boolean {
  const normalised = exerciseName.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, "-");
  const sideKey = `side-${normalised}`;
  if (SIDE_KEY_TO_URL[sideKey]) return true;
  // Case-insensitive check
  const sideLower = sideKey.toLowerCase();
  for (const key of Object.keys(SIDE_KEY_TO_URL)) {
    if (key.toLowerCase() === sideLower) return true;
  }
  return false;
}
