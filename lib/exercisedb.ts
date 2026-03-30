/**
 * ExerciseDB Service — Full API Integration
 *
 * Fetches exercise data from ExerciseDB via RapidAPI.
 * Free tier: 500 requests/month with aggressive in-memory caching.
 *
 * Endpoints used:
 *   - GET /exercises/name/{name}      → search by exercise name
 *   - GET /exercises/bodyPart/{part}   → list by body part
 *   - GET /exercises/target/{target}   → list by target muscle
 *   - GET /exercises/equipment/{equip} → list by equipment
 *   - GET /exercises/{id}              → single exercise detail
 *   - GET /exercises                   → paginated list of all exercises
 *   - GET /exercises/bodyPartList      → list of valid body parts
 *   - GET /exercises/targetList        → list of valid target muscles
 *   - GET /exercises/equipmentList     → list of valid equipment types
 *
 * All responses are cached in memory for the app session lifetime.
 * Without a key the functions return empty results gracefully.
 */

const RAPIDAPI_KEY = process.env.EXPO_PUBLIC_RAPIDAPI_KEY ?? "";
const BASE_URL = "https://exercisedb.p.rapidapi.com";

const API_HEADERS: Record<string, string> = {
  "X-RapidAPI-Key": RAPIDAPI_KEY,
  "X-RapidAPI-Host": "exercisedb.p.rapidapi.com",
};

// ── Types ────────────────────────────────────────────────────────────────────

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

/** Body parts recognised by ExerciseDB */
export type ExerciseDBBodyPart =
  | "back"
  | "cardio"
  | "chest"
  | "lower arms"
  | "lower legs"
  | "neck"
  | "shoulders"
  | "upper arms"
  | "upper legs"
  | "waist";

// ── Cache ────────────────────────────────────────────────────────────────────

const _cache = new Map<string, { data: any; ts: number }>();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

function cacheGet<T>(key: string): T | null {
  const entry = _cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL) {
    _cache.delete(key);
    return null;
  }
  return entry.data as T;
}

function cacheSet(key: string, data: any): void {
  _cache.set(key, { data, ts: Date.now() });
}

/** Clear all cached data */
export function clearExerciseDBCache(): void {
  _cache.clear();
}

// ── Helpers ──────────────────────────────────────────────────────────────────

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

async function apiFetch<T>(path: string): Promise<T | null> {
  if (!RAPIDAPI_KEY) return null;
  try {
    const res = await fetch(`${BASE_URL}${path}`, { headers: API_HEADERS });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

// ── GIF URL Lookup (original API — kept for backward compat) ─────────────

/** In-memory cache: normalised exercise name → gifUrl */
const _gifCache = new Map<string, string>();

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

// ── Search by Name ───────────────────────────────────────────────────────────

/**
 * Search exercises by name. Returns up to `limit` results.
 * Cached per normalised query string.
 */
export async function searchExercisesByName(
  name: string,
  limit: number = 20,
  offset: number = 0
): Promise<ExerciseDBExercise[]> {
  if (!RAPIDAPI_KEY) return [];
  const key = normaliseQuery(name);
  const cacheKey = `search:${key}:${limit}:${offset}`;

  const cached = cacheGet<ExerciseDBExercise[]>(cacheKey);
  if (cached) return cached;

  const encoded = encodeURIComponent(key);
  const data = await apiFetch<ExerciseDBExercise[]>(
    `/exercises/name/${encoded}?limit=${limit}&offset=${offset}`
  );
  const result = data ?? [];
  cacheSet(cacheKey, result);
  return result;
}

// ── Fetch by Body Part ───────────────────────────────────────────────────────

/**
 * Fetch exercises for a specific body part.
 * Body parts: back, cardio, chest, lower arms, lower legs, neck, shoulders,
 *             upper arms, upper legs, waist
 */
export async function getExercisesByBodyPart(
  bodyPart: string,
  limit: number = 50,
  offset: number = 0
): Promise<ExerciseDBExercise[]> {
  if (!RAPIDAPI_KEY) return [];
  const normalised = bodyPart.toLowerCase().trim();
  const cacheKey = `bodyPart:${normalised}:${limit}:${offset}`;

  const cached = cacheGet<ExerciseDBExercise[]>(cacheKey);
  if (cached) return cached;

  const encoded = encodeURIComponent(normalised);
  const data = await apiFetch<ExerciseDBExercise[]>(
    `/exercises/bodyPart/${encoded}?limit=${limit}&offset=${offset}`
  );
  const result = data ?? [];
  cacheSet(cacheKey, result);
  return result;
}

// ── Fetch by Target Muscle ───────────────────────────────────────────────────

/**
 * Fetch exercises that target a specific muscle.
 * Examples: biceps, triceps, quads, glutes, lats, delts, abs, etc.
 */
export async function getExercisesByTarget(
  target: string,
  limit: number = 50,
  offset: number = 0
): Promise<ExerciseDBExercise[]> {
  if (!RAPIDAPI_KEY) return [];
  const normalised = target.toLowerCase().trim();
  const cacheKey = `target:${normalised}:${limit}:${offset}`;

  const cached = cacheGet<ExerciseDBExercise[]>(cacheKey);
  if (cached) return cached;

  const encoded = encodeURIComponent(normalised);
  const data = await apiFetch<ExerciseDBExercise[]>(
    `/exercises/target/${encoded}?limit=${limit}&offset=${offset}`
  );
  const result = data ?? [];
  cacheSet(cacheKey, result);
  return result;
}

// ── Fetch by Equipment ───────────────────────────────────────────────────────

/**
 * Fetch exercises that use specific equipment.
 * Examples: barbell, dumbbell, cable, body weight, band, kettlebell, etc.
 */
export async function getExercisesByEquipment(
  equipment: string,
  limit: number = 50,
  offset: number = 0
): Promise<ExerciseDBExercise[]> {
  if (!RAPIDAPI_KEY) return [];
  const normalised = equipment.toLowerCase().trim();
  const cacheKey = `equipment:${normalised}:${limit}:${offset}`;

  const cached = cacheGet<ExerciseDBExercise[]>(cacheKey);
  if (cached) return cached;

  const encoded = encodeURIComponent(normalised);
  const data = await apiFetch<ExerciseDBExercise[]>(
    `/exercises/equipment/${encoded}?limit=${limit}&offset=${offset}`
  );
  const result = data ?? [];
  cacheSet(cacheKey, result);
  return result;
}

// ── Fetch Single Exercise by ID ──────────────────────────────────────────────

/**
 * Fetch a single exercise by its ExerciseDB ID.
 * Returns full details including instructions and secondary muscles.
 */
export async function getExerciseById(
  id: string
): Promise<ExerciseDBExercise | null> {
  if (!RAPIDAPI_KEY) return null;
  const cacheKey = `exercise:${id}`;

  const cached = cacheGet<ExerciseDBExercise>(cacheKey);
  if (cached) return cached;

  const data = await apiFetch<ExerciseDBExercise>(`/exercises/exercise/${id}`);
  if (data) cacheSet(cacheKey, data);
  return data;
}

// ── Fetch All Exercises (paginated) ──────────────────────────────────────────

/**
 * Fetch a paginated list of all exercises.
 */
export async function getAllExercisesFromAPI(
  limit: number = 50,
  offset: number = 0
): Promise<ExerciseDBExercise[]> {
  if (!RAPIDAPI_KEY) return [];
  const cacheKey = `all:${limit}:${offset}`;

  const cached = cacheGet<ExerciseDBExercise[]>(cacheKey);
  if (cached) return cached;

  const data = await apiFetch<ExerciseDBExercise[]>(
    `/exercises?limit=${limit}&offset=${offset}`
  );
  const result = data ?? [];
  cacheSet(cacheKey, result);
  return result;
}

// ── Metadata Lists ───────────────────────────────────────────────────────────

/** Fetch the list of valid body parts from ExerciseDB */
export async function getBodyPartList(): Promise<string[]> {
  if (!RAPIDAPI_KEY) return [];
  const cacheKey = "meta:bodyPartList";
  const cached = cacheGet<string[]>(cacheKey);
  if (cached) return cached;

  const data = await apiFetch<string[]>("/exercises/bodyPartList");
  const result = data ?? [];
  cacheSet(cacheKey, result);
  return result;
}

/** Fetch the list of valid target muscles from ExerciseDB */
export async function getTargetList(): Promise<string[]> {
  if (!RAPIDAPI_KEY) return [];
  const cacheKey = "meta:targetList";
  const cached = cacheGet<string[]>(cacheKey);
  if (cached) return cached;

  const data = await apiFetch<string[]>("/exercises/targetList");
  const result = data ?? [];
  cacheSet(cacheKey, result);
  return result;
}

/** Fetch the list of valid equipment types from ExerciseDB */
export async function getEquipmentList(): Promise<string[]> {
  if (!RAPIDAPI_KEY) return [];
  const cacheKey = "meta:equipmentList";
  const cached = cacheGet<string[]>(cacheKey);
  if (cached) return cached;

  const data = await apiFetch<string[]>("/exercises/equipmentList");
  const result = data ?? [];
  cacheSet(cacheKey, result);
  return result;
}

// ── Mapping Helpers ──────────────────────────────────────────────────────────

/**
 * Map our internal MuscleGroup names to ExerciseDB body parts.
 * Our app uses: chest, back, shoulders, abs, quads, hamstrings, glutes, biceps,
 *               triceps, forearms, calves, traps, lats, obliques, hip_flexors
 * ExerciseDB uses: back, cardio, chest, lower arms, lower legs, neck, shoulders,
 *                  upper arms, upper legs, waist
 */
export function muscleGroupToBodyPart(muscle: string): string {
  const map: Record<string, string> = {
    chest: "chest",
    back: "back",
    lats: "back",
    traps: "back",
    shoulders: "shoulders",
    biceps: "upper arms",
    triceps: "upper arms",
    forearms: "lower arms",
    abs: "waist",
    obliques: "waist",
    core: "waist",
    quads: "upper legs",
    hamstrings: "upper legs",
    glutes: "upper legs",
    hip_flexors: "upper legs",
    calves: "lower legs",
    cardio: "cardio",
  };
  return map[muscle.toLowerCase()] ?? "chest";
}

/**
 * Map our internal MuscleGroup names to ExerciseDB target muscles.
 */
export function muscleGroupToTarget(muscle: string): string {
  const map: Record<string, string> = {
    chest: "pectorals",
    back: "lats",
    lats: "lats",
    traps: "traps",
    shoulders: "delts",
    biceps: "biceps",
    triceps: "triceps",
    forearms: "forearms",
    abs: "abs",
    obliques: "abs",
    core: "abs",
    quads: "quads",
    hamstrings: "hamstrings",
    glutes: "glutes",
    hip_flexors: "glutes",
    calves: "calves",
    cardio: "cardiovascular system",
  };
  return map[muscle.toLowerCase()] ?? "pectorals";
}
