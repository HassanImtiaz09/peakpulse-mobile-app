/**
 * GIF Asset Resolver
 *
 * Maps remote video/GIF URLs to locally bundled GIF assets.
 * This enables offline playback and eliminates "video unavailable" errors.
 */

import { EXERCISE_GIFS } from "@/lib/exercise-gif-registry";

// Build a reverse lookup: URL filename stem → local asset
const URL_TO_ASSET: Record<string, number> = {};

// Pre-build the lookup from the EXERCISE_GIFS keys
// Keys in EXERCISE_GIFS match the filename stems used in URLs
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
 * Resolve a remote URL or asset key to a local GIF asset number.
 * Falls back to push-up GIF if no match found.
 */
export function resolveGifAsset(urlOrKey: string): number {
  if (!urlOrKey) return FALLBACK_ASSET;

  // Direct key match (already a key like "male-barbell-bench-press-front")
  if (URL_TO_ASSET[urlOrKey]) return URL_TO_ASSET[urlOrKey];

  // Extract stem from URL
  const stem = extractStem(urlOrKey);
  if (stem && URL_TO_ASSET[stem]) return URL_TO_ASSET[stem];

  // Try case-insensitive match
  const stemLower = stem.toLowerCase();
  for (const [key, asset] of Object.entries(URL_TO_ASSET)) {
    if (key.toLowerCase() === stemLower) return asset;
  }

  // For side-view URLs, try to find the corresponding front-view
  if (stem.includes("-side")) {
    const frontStem = stem.replace(/-side[^.]*$/, "-front");
    if (URL_TO_ASSET[frontStem]) return URL_TO_ASSET[frontStem];
    // Also try without the suffix
    const frontStemClean = stem.replace(/-side.*$/, "-front");
    for (const [key, asset] of Object.entries(URL_TO_ASSET)) {
      if (key.toLowerCase().startsWith(frontStemClean.toLowerCase().slice(0, -6))) {
        return asset;
      }
    }
  }

  // Fallback
  return FALLBACK_ASSET;
}

/**
 * Check if a local GIF asset exists for a given URL.
 */
export function hasLocalGif(url: string): boolean {
  if (!url) return false;
  const stem = extractStem(url);
  return !!URL_TO_ASSET[stem];
}
