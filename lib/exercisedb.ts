/**
 * ExerciseDB Service — Full API Integration
 *
 * Fetches exercise data from ExerciseDB.
 *
 * Two API sources (tried in order):
 *   1. Vercel endpoint (free, no key needed, returns gifUrl):
 *      https://exercisedb-api.vercel.app/api/v1/exercises
 *   2. RapidAPI endpoint (requires key, no gifUrl in response):
 *      https://exercisedb.p.rapidapi.com/exercises
 *
 * The Vercel endpoint is preferred because it returns `gifUrl` with working
 * GIF URLs hosted at static.exercisedb.dev. The RapidAPI endpoint is kept
 * as a fallback for edge cases.
 *
 * All responses are cached in memory for the app session lifetime.
 * Without connectivity the functions return empty results gracefully.
 */

const RAPIDAPI_KEY = process.env.EXPO_PUBLIC_RAPIDAPI_KEY ?? "";

// ── Vercel API (primary — free, returns gifUrl) ─────────────────────────────

const VERCEL_BASE = "https://exercisedb-api.vercel.app/api/v1";

// ── RapidAPI (fallback — requires key, no gifUrl) ───────────────────────────

const RAPID_BASE = "https://exercisedb.p.rapidapi.com";
const RAPID_HEADERS: Record<string, string> = {
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

// ── Vercel response types ───────────────────────────────────────────────────

interface VercelExercise {
  exerciseId: string;
  name: string;
  gifUrl: string;
  targetMuscles: string[];
  bodyParts: string[];
  equipments: string[];
  secondaryMuscles: string[];
  instructions: string[];
}

interface VercelResponse {
  success: boolean;
  data: VercelExercise[];
  metadata?: {
    totalExercises: number;
    totalPages: number;
    currentPage: number;
  };
}

/** Convert Vercel response format to our internal format */
function normaliseVercel(v: VercelExercise): ExerciseDBExercise {
  return {
    id: v.exerciseId,
    name: v.name,
    bodyPart: v.bodyParts?.[0] ?? "",
    equipment: v.equipments?.[0] ?? "",
    gifUrl: v.gifUrl ?? "",
    target: v.targetMuscles?.[0] ?? "",
    secondaryMuscles: v.secondaryMuscles ?? [],
    instructions: (v.instructions ?? []).map((s) =>
      s.replace(/^Step:\d+\s*/i, "")
    ),
  };
}

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

/** Fetch from Vercel API (primary — free, has gifUrl) */
async function vercelFetch<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${VERCEL_BASE}${path}`);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/** Fetch from RapidAPI (fallback — requires key) */
async function rapidFetch<T>(path: string): Promise<T | null> {
  if (!RAPIDAPI_KEY) return null;
  try {
    const res = await fetch(`${RAPID_BASE}${path}`, {
      headers: RAPID_HEADERS,
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

// ── GIF URL Lookup (backward compat) ────────────────────────────────────────

/** In-memory cache: normalised exercise name → gifUrl */
const _gifCache = new Map<string, string>();

/**
 * Fetch the animated GIF URL for a given exercise name.
 * Tries Vercel first (has gifUrl), then RapidAPI fallback.
 * Results are cached in memory for the lifetime of the app session.
 */
export async function getExerciseGifUrl(
  exerciseName: string
): Promise<string | null> {
  const key = normaliseQuery(exerciseName);
  if (_gifCache.has(key)) return _gifCache.get(key)!;

  try {
    // Try Vercel first
    const encoded = encodeURIComponent(key);
    const vercelData = await vercelFetch<VercelResponse>(
      `/exercises?search=${encoded}&limit=1`
    );
    if (vercelData?.data?.length) {
      const gifUrl = vercelData.data[0].gifUrl;
      if (gifUrl) {
        _gifCache.set(key, gifUrl);
        return gifUrl;
      }
    }

    // Fallback to RapidAPI (no gifUrl, but we can construct one from ID)
    if (RAPIDAPI_KEY) {
      const rapidUrl = `${RAPID_BASE}/exercises/name/${encoded}?limit=1&offset=0`;
      const res = await fetch(rapidUrl, { headers: RAPID_HEADERS });
      if (res.ok) {
        const data = await res.json();
        if (data?.[0]?.id) {
          // Construct GIF URL from exercise ID
          const gifUrl = `https://static.exercisedb.dev/media/${data[0].id}.gif`;
          _gifCache.set(key, gifUrl);
          return gifUrl;
        }
      }
    }

    return null;
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
  await Promise.allSettled(exerciseNames.map(getExerciseGifUrl));
}

// ── Search by Name ──────────────────────────────────────────────────────────

/**
 * Score how well an API result name matches the query.
 * Higher = better match. Exact match = 1000, contains query = 500 + length bonus.
 */
function nameMatchScore(resultName: string, query: string): number {
  const rn = resultName.toLowerCase().trim();
  const qn = query.toLowerCase().trim();
  if (rn === qn) return 1000;
  // Exact substring at word boundary
  if (rn.startsWith(qn + " ") || rn.endsWith(" " + qn) || rn.includes(" " + qn + " ")) return 800;
  if (rn.includes(qn)) return 600;
  // Query contains result (e.g. query="barbell bench press", result="bench press")
  if (qn.includes(rn)) return 500;
  // Word overlap scoring
  const qWords = qn.split(/\s+/);
  const rWords = new Set(rn.split(/\s+/));
  const overlap = qWords.filter((w) => rWords.has(w)).length;
  return overlap * 100;
}

/**
 * Search exercises by name. Returns up to `limit` results.
 * Tries Vercel first (has gifUrl), then RapidAPI fallback.
 *
 * Results are re-ranked by name-match accuracy so the closest match
 * to the query always comes first (fixes the "wrong exercise" bug
 * where e.g. "Bench Press" returned "smith close-grip bench press").
 */
export async function searchExercisesByName(
  name: string,
  limit: number = 20,
  offset: number = 0
): Promise<ExerciseDBExercise[]> {
  const key = normaliseQuery(name);
  const cacheKey = `search:${key}:${limit}:${offset}`;

  const cached = cacheGet<ExerciseDBExercise[]>(cacheKey);
  if (cached) return cached;

  const encoded = encodeURIComponent(key);

  // Fetch more results than needed so we can re-rank and pick the best matches
  const fetchLimit = Math.max(limit * 3, 30);

  // Try Vercel first
  const vercelData = await vercelFetch<VercelResponse>(
    `/exercises?search=${encoded}&limit=${fetchLimit}&offset=${offset}`
  );
  if (vercelData?.data?.length) {
    const all = vercelData.data.map(normaliseVercel);
    // Re-rank by name match accuracy
    all.sort((a, b) => nameMatchScore(b.name, key) - nameMatchScore(a.name, key));
    const result = all.slice(0, limit);
    cacheSet(cacheKey, result);
    return result;
  }

  // Fallback to RapidAPI
  if (RAPIDAPI_KEY) {
    const data = await rapidFetch<any[]>(
      `/exercises/name/${encoded}?limit=${fetchLimit}&offset=${offset}`
    );
    if (data?.length) {
      const all: ExerciseDBExercise[] = data.map((d) => ({
        id: d.id ?? "",
        name: d.name ?? "",
        bodyPart: d.bodyPart ?? "",
        equipment: d.equipment ?? "",
        gifUrl: d.gifUrl ?? `https://static.exercisedb.dev/media/${d.id}.gif`,
        target: d.target ?? "",
        secondaryMuscles: d.secondaryMuscles ?? [],
        instructions: d.instructions ?? [],
      }));
      // Re-rank by name match accuracy
      all.sort((a, b) => nameMatchScore(b.name, key) - nameMatchScore(a.name, key));
      const result = all.slice(0, limit);
      cacheSet(cacheKey, result);
      return result;
    }
  }

  return [];
}

// ── Fetch by Body Part ──────────────────────────────────────────────────────

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
  const normalised = bodyPart.toLowerCase().trim();
  const cacheKey = `bodyPart:${normalised}:${limit}:${offset}`;

  const cached = cacheGet<ExerciseDBExercise[]>(cacheKey);
  if (cached) return cached;

  const encoded = encodeURIComponent(normalised);

  // Try Vercel first
  const vercelData = await vercelFetch<VercelResponse>(
    `/exercises?bodyPart=${encoded}&limit=${limit}&offset=${offset}`
  );
  if (vercelData?.data?.length) {
    const result = vercelData.data.map(normaliseVercel);
    cacheSet(cacheKey, result);
    return result;
  }

  // Fallback to RapidAPI
  if (RAPIDAPI_KEY) {
    const data = await rapidFetch<any[]>(
      `/exercises/bodyPart/${encoded}?limit=${limit}&offset=${offset}`
    );
    if (data?.length) {
      const result: ExerciseDBExercise[] = data.map((d) => ({
        id: d.id ?? "",
        name: d.name ?? "",
        bodyPart: d.bodyPart ?? "",
        equipment: d.equipment ?? "",
        gifUrl: d.gifUrl ?? `https://static.exercisedb.dev/media/${d.id}.gif`,
        target: d.target ?? "",
        secondaryMuscles: d.secondaryMuscles ?? [],
        instructions: d.instructions ?? [],
      }));
      cacheSet(cacheKey, result);
      return result;
    }
  }

  return [];
}

// ── Fetch by Target Muscle ──────────────────────────────────────────────────

/**
 * Fetch exercises that target a specific muscle.
 * Examples: biceps, triceps, quads, glutes, lats, delts, abs, etc.
 */
export async function getExercisesByTarget(
  target: string,
  limit: number = 50,
  offset: number = 0
): Promise<ExerciseDBExercise[]> {
  const normalised = target.toLowerCase().trim();
  const cacheKey = `target:${normalised}:${limit}:${offset}`;

  const cached = cacheGet<ExerciseDBExercise[]>(cacheKey);
  if (cached) return cached;

  const encoded = encodeURIComponent(normalised);

  // Try Vercel first
  const vercelData = await vercelFetch<VercelResponse>(
    `/exercises?targetMuscle=${encoded}&limit=${limit}&offset=${offset}`
  );
  if (vercelData?.data?.length) {
    const result = vercelData.data.map(normaliseVercel);
    cacheSet(cacheKey, result);
    return result;
  }

  // Fallback to RapidAPI
  if (RAPIDAPI_KEY) {
    const data = await rapidFetch<any[]>(
      `/exercises/target/${encoded}?limit=${limit}&offset=${offset}`
    );
    if (data?.length) {
      const result: ExerciseDBExercise[] = data.map((d) => ({
        id: d.id ?? "",
        name: d.name ?? "",
        bodyPart: d.bodyPart ?? "",
        equipment: d.equipment ?? "",
        gifUrl: d.gifUrl ?? `https://static.exercisedb.dev/media/${d.id}.gif`,
        target: d.target ?? "",
        secondaryMuscles: d.secondaryMuscles ?? [],
        instructions: d.instructions ?? [],
      }));
      cacheSet(cacheKey, result);
      return result;
    }
  }

  return [];
}

// ── Fetch by Equipment ──────────────────────────────────────────────────────

/**
 * Fetch exercises that use specific equipment.
 * Examples: barbell, dumbbell, cable, body weight, band, kettlebell, etc.
 */
export async function getExercisesByEquipment(
  equipment: string,
  limit: number = 50,
  offset: number = 0
): Promise<ExerciseDBExercise[]> {
  const normalised = equipment.toLowerCase().trim();
  const cacheKey = `equipment:${normalised}:${limit}:${offset}`;

  const cached = cacheGet<ExerciseDBExercise[]>(cacheKey);
  if (cached) return cached;

  const encoded = encodeURIComponent(normalised);

  // Try Vercel first
  const vercelData = await vercelFetch<VercelResponse>(
    `/exercises?equipment=${encoded}&limit=${limit}&offset=${offset}`
  );
  if (vercelData?.data?.length) {
    const result = vercelData.data.map(normaliseVercel);
    cacheSet(cacheKey, result);
    return result;
  }

  // Fallback to RapidAPI
  if (RAPIDAPI_KEY) {
    const data = await rapidFetch<any[]>(
      `/exercises/equipment/${encoded}?limit=${limit}&offset=${offset}`
    );
    if (data?.length) {
      const result: ExerciseDBExercise[] = data.map((d) => ({
        id: d.id ?? "",
        name: d.name ?? "",
        bodyPart: d.bodyPart ?? "",
        equipment: d.equipment ?? "",
        gifUrl: d.gifUrl ?? `https://static.exercisedb.dev/media/${d.id}.gif`,
        target: d.target ?? "",
        secondaryMuscles: d.secondaryMuscles ?? [],
        instructions: d.instructions ?? [],
      }));
      cacheSet(cacheKey, result);
      return result;
    }
  }

  return [];
}

// ── Fetch Single Exercise by ID ─────────────────────────────────────────────

/**
 * Fetch a single exercise by its ExerciseDB ID.
 * Returns full details including instructions and secondary muscles.
 */
export async function getExerciseById(
  id: string
): Promise<ExerciseDBExercise | null> {
  const cacheKey = `exercise:${id}`;

  const cached = cacheGet<ExerciseDBExercise>(cacheKey);
  if (cached) return cached;

  // Try Vercel first
  const vercelData = await vercelFetch<{ success: boolean; data: VercelExercise }>(
    `/exercises/${id}`
  );
  if (vercelData?.data) {
    const result = normaliseVercel(vercelData.data);
    cacheSet(cacheKey, result);
    return result;
  }

  // Fallback to RapidAPI
  if (RAPIDAPI_KEY) {
    const data = await rapidFetch<any>(`/exercises/exercise/${id}`);
    if (data) {
      const result: ExerciseDBExercise = {
        id: data.id ?? id,
        name: data.name ?? "",
        bodyPart: data.bodyPart ?? "",
        equipment: data.equipment ?? "",
        gifUrl: data.gifUrl ?? `https://static.exercisedb.dev/media/${id}.gif`,
        target: data.target ?? "",
        secondaryMuscles: data.secondaryMuscles ?? [],
        instructions: data.instructions ?? [],
      };
      cacheSet(cacheKey, result);
      return result;
    }
  }

  return null;
}

// ── Fetch All Exercises (paginated) ─────────────────────────────────────────

/**
 * Fetch a paginated list of all exercises.
 */
export async function getAllExercisesFromAPI(
  limit: number = 50,
  offset: number = 0
): Promise<ExerciseDBExercise[]> {
  const cacheKey = `all:${limit}:${offset}`;

  const cached = cacheGet<ExerciseDBExercise[]>(cacheKey);
  if (cached) return cached;

  // Try Vercel first
  const vercelData = await vercelFetch<VercelResponse>(
    `/exercises?limit=${limit}&offset=${offset}`
  );
  if (vercelData?.data?.length) {
    const result = vercelData.data.map(normaliseVercel);
    cacheSet(cacheKey, result);
    return result;
  }

  // Fallback to RapidAPI
  if (RAPIDAPI_KEY) {
    const data = await rapidFetch<any[]>(
      `/exercises?limit=${limit}&offset=${offset}`
    );
    if (data?.length) {
      const result: ExerciseDBExercise[] = data.map((d) => ({
        id: d.id ?? "",
        name: d.name ?? "",
        bodyPart: d.bodyPart ?? "",
        equipment: d.equipment ?? "",
        gifUrl: d.gifUrl ?? `https://static.exercisedb.dev/media/${d.id}.gif`,
        target: d.target ?? "",
        secondaryMuscles: d.secondaryMuscles ?? [],
        instructions: d.instructions ?? [],
      }));
      cacheSet(cacheKey, result);
      return result;
    }
  }

  return [];
}

// ── Metadata Lists ──────────────────────────────────────────────────────────

/** Fetch the list of valid body parts from ExerciseDB */
export async function getBodyPartList(): Promise<string[]> {
  const cacheKey = "meta:bodyPartList";
  const cached = cacheGet<string[]>(cacheKey);
  if (cached) return cached;

  // Vercel doesn't have a dedicated list endpoint, use RapidAPI
  if (RAPIDAPI_KEY) {
    const data = await rapidFetch<string[]>("/exercises/bodyPartList");
    if (data?.length) {
      cacheSet(cacheKey, data);
      return data;
    }
  }

  // Fallback: hardcoded list
  const fallback = [
    "back", "cardio", "chest", "lower arms", "lower legs",
    "neck", "shoulders", "upper arms", "upper legs", "waist",
  ];
  cacheSet(cacheKey, fallback);
  return fallback;
}

/** Fetch the list of valid target muscles from ExerciseDB */
export async function getTargetList(): Promise<string[]> {
  const cacheKey = "meta:targetList";
  const cached = cacheGet<string[]>(cacheKey);
  if (cached) return cached;

  if (RAPIDAPI_KEY) {
    const data = await rapidFetch<string[]>("/exercises/targetList");
    if (data?.length) {
      cacheSet(cacheKey, data);
      return data;
    }
  }

  const fallback = [
    "abductors", "abs", "adductors", "biceps", "calves", "cardiovascular system",
    "delts", "forearms", "glutes", "hamstrings", "lats", "levator scapulae",
    "pectorals", "quads", "serratus anterior", "spine", "traps", "triceps",
    "upper back",
  ];
  cacheSet(cacheKey, fallback);
  return fallback;
}

/** Fetch the list of valid equipment types from ExerciseDB */
export async function getEquipmentList(): Promise<string[]> {
  const cacheKey = "meta:equipmentList";
  const cached = cacheGet<string[]>(cacheKey);
  if (cached) return cached;

  if (RAPIDAPI_KEY) {
    const data = await rapidFetch<string[]>("/exercises/equipmentList");
    if (data?.length) {
      cacheSet(cacheKey, data);
      return data;
    }
  }

  const fallback = [
    "assisted", "band", "barbell", "body weight", "bosu ball", "cable",
    "dumbbell", "elliptical machine", "ez barbell", "hammer", "kettlebell",
    "leverage machine", "medicine ball", "olympic barbell", "resistance band",
    "roller", "rope", "skierg machine", "sled machine", "smith machine",
    "stability ball", "stationary bike", "stepmill machine", "tire",
    "trap bar", "upper body ergometer", "weighted", "wheel roller",
  ];
  cacheSet(cacheKey, fallback);
  return fallback;
}

// ── Mapping Helpers ─────────────────────────────────────────────────────────

/**
 * Map our internal MuscleGroup names to ExerciseDB body parts.
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
