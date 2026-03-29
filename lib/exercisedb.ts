/**
 * ExerciseDB Service
 *
 * Fetches animated GIF URLs for exercises from ExerciseDB via RapidAPI.
 * Free tier: 500 requests/month with in-memory caching.
 *
 * Setup (one-time, no Manus needed):
 *   1. Sign up FREE at https://rapidapi.com
 *   2. Subscribe to "ExerciseDB" API (free tier — 500 req/month)
 *   3. Add to your .env file:  EXPO_PUBLIC_RAPIDAPI_KEY=your_key_here
 *
 * Without a key the components fall back to a static placeholder.
 *
 * WHY THIS APPROACH WORKS vs the previous MuscleWiki MP4 approach:
 *   - expo-video does NOT support custom HTTP headers (GitHub issue #29436)
 *   - MuscleWiki CDN requires a Referer header (hotlink protection)
 *   - expo-video + MuscleWiki CDN = always a black video in React Native
 *   - ExerciseDB GIF URLs are public CDN links — no hotlink protection
 *   - expo-image renders animated GIFs natively without needing auth headers
 */

const RAPIDAPI_KEY = process.env.EXPO_PUBLIC_RAPIDAPI_KEY ?? "";
const BASE_URL = "https://exercisedb.p.rapidapi.com";

const API_HEADERS: Record<string, string> = {
  "X-RapidAPI-Key": RAPIDAPI_KEY,
  "X-RapidAPI-Host": "exercisedb.p.rapidapi.com",
};

export interface ExerciseDBExercise {
  id: string;
  name: string;
  bodyPart: string;
  equipment: string;
  gifUrl: string;
  target: string;
  secondaryMuscles: string[];
  instructions: string[];
}

/** In-memory cache: normalised exercise name → gifUrl */
const _gifCache = new Map<string, string>();

/** Whether a RapidAPI key has been configured */
export function hasExerciseDBKey(): boolean {
  return Boolean(RAPIDAPI_KEY);
}

function normaliseQuery(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Fetch the animated GIF URL for a given exercise name from ExerciseDB.
 * Returns null if no API key is configured or the exercise is not found.
 * Results are cached in memory for the lifetime of the app session.
 */
export async function getExerciseGifUrl(
  exerciseName: string
): Promise<string | null> {
  if (!RAPIDAPI_KEY) return null;

  const key = normaliseQuery(exerciseName);
  if (_gifCache.has(key)) return _gifCache.get(key)!;

  try {
    const encoded = encodeURIComponent(key);
    const url = `${BASE_URL}/exercises/name/${encoded}?limit=1&offset=0`;
    const res = await fetch(url, { headers: API_HEADERS });
    if (!res.ok) return null;

    const data: ExerciseDBExercise[] = await res.json();
    if (!data || data.length === 0) return null;

    const gifUrl = data[0]?.gifUrl ?? null;
    if (gifUrl) _gifCache.set(key, gifUrl);
    return gifUrl;
  } catch {
    return null;
  }
}

/**
 * Pre-warm the cache for a list of exercise names.
 * Call on screen focus to avoid per-exercise waterfall loading.
 */
export async function prewarmExerciseCache(
  exerciseNames: string[]
): Promise<void> {
  if (!RAPIDAPI_KEY) return;
  await Promise.allSettled(exerciseNames.map(getExerciseGifUrl));
}
