/**
 * Meal History & Photo Cache
 *
 * Tracks past meal plan names across generations so the AI can avoid
 * repeating the same dishes. Also caches AI-generated photo URLs
 * so they persist across app restarts without re-generation.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

// ── Storage Keys ──
const MEAL_HISTORY_KEY = "@meal_history_v1";
const PHOTO_CACHE_KEY = "@meal_photo_cache_v1";

// ── Types ──
export interface MealHistoryEntry {
  /** ISO date when this plan was generated */
  generatedAt: string;
  /** Flat list of unique meal names from that plan */
  mealNames: string[];
}

export interface MealPhotoCache {
  /** Maps "mealName|mealType" → photoUrl */
  [key: string]: string;
}

// ── Meal History ──

/** Maximum number of past plan generations to keep (rolling window) */
const MAX_HISTORY_ENTRIES = 4; // ~4 weeks of history

/**
 * Load meal history from AsyncStorage.
 */
export async function loadMealHistory(): Promise<MealHistoryEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(MEAL_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Save the current meal plan's meal names to history.
 * Called whenever a new plan is generated (before overwriting the old one).
 */
export async function saveMealPlanToHistory(plan: any): Promise<void> {
  if (!plan?.days || !Array.isArray(plan.days)) return;

  // Extract all unique meal names from the plan
  const mealNames: string[] = [];
  for (const day of plan.days) {
    if (!day.meals || !Array.isArray(day.meals)) continue;
    for (const meal of day.meals) {
      const name = (meal.name ?? "").trim();
      if (name && !mealNames.includes(name.toLowerCase())) {
        mealNames.push(name.toLowerCase());
      }
    }
  }

  if (mealNames.length === 0) return;

  const entry: MealHistoryEntry = {
    generatedAt: new Date().toISOString(),
    mealNames,
  };

  try {
    const history = await loadMealHistory();
    // Add new entry and trim to max size
    history.push(entry);
    while (history.length > MAX_HISTORY_ENTRIES) {
      history.shift(); // Remove oldest
    }
    await AsyncStorage.setItem(MEAL_HISTORY_KEY, JSON.stringify(history));
  } catch {
    // Silently fail — history is a nice-to-have, not critical
  }
}

/**
 * Get a flat list of all past meal names (deduplicated) for the AI prompt.
 * Returns up to 50 names to keep the prompt manageable.
 */
export async function getPastMealNames(): Promise<string[]> {
  const history = await loadMealHistory();
  const allNames = new Set<string>();
  for (const entry of history) {
    for (const name of entry.mealNames) {
      allNames.add(name);
    }
  }
  return Array.from(allNames).slice(0, 50);
}

// ── Photo Cache ──

/**
 * Load the photo cache from AsyncStorage.
 */
export async function loadPhotoCache(): Promise<MealPhotoCache> {
  try {
    const raw = await AsyncStorage.getItem(PHOTO_CACHE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

/**
 * Save the photo cache to AsyncStorage.
 */
async function savePhotoCache(cache: MealPhotoCache): Promise<void> {
  try {
    await AsyncStorage.setItem(PHOTO_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Silently fail
  }
}

/**
 * Build a cache key from meal name and type.
 */
function photoCacheKey(name: string, type?: string): string {
  return `${(name ?? "").toLowerCase().trim()}|${(type ?? "").toLowerCase().trim()}`;
}

/**
 * Look up a cached photo URL for a meal.
 */
export function getCachedPhotoUrl(cache: MealPhotoCache, name: string, type?: string): string | null {
  const key = photoCacheKey(name, type);
  return cache[key] ?? null;
}

/**
 * Update the photo cache with new photo URLs from a meal plan.
 * Call this after AI image generation completes.
 */
export async function updatePhotoCacheFromPlan(plan: any): Promise<MealPhotoCache> {
  if (!plan?.days || !Array.isArray(plan.days)) return {};

  const cache = await loadPhotoCache();
  let updated = false;

  for (const day of plan.days) {
    if (!day.meals || !Array.isArray(day.meals)) continue;
    for (const meal of day.meals) {
      if (meal.photoUrl) {
        const key = photoCacheKey(meal.name, meal.type);
        if (cache[key] !== meal.photoUrl) {
          cache[key] = meal.photoUrl;
          updated = true;
        }
      }
    }
  }

  // Trim cache to max 200 entries to prevent unbounded growth
  const keys = Object.keys(cache);
  if (keys.length > 200) {
    const toRemove = keys.slice(0, keys.length - 200);
    for (const k of toRemove) delete cache[k];
    updated = true;
  }

  if (updated) {
    await savePhotoCache(cache);
  }

  return cache;
}

/**
 * Apply cached photos to a meal plan (fills in missing photoUrl from cache).
 * Call this when loading a plan from storage to restore previously generated images.
 */
export async function applyCachedPhotos(plan: any): Promise<any> {
  if (!plan?.days || !Array.isArray(plan.days)) return plan;

  const cache = await loadPhotoCache();
  if (Object.keys(cache).length === 0) return plan;

  let anyApplied = false;
  const updatedDays = plan.days.map((day: any) => ({
    ...day,
    meals: day.meals?.map((meal: any) => {
      if (meal.photoUrl) return meal; // Already has a photo
      const cached = getCachedPhotoUrl(cache, meal.name, meal.type);
      if (cached) {
        anyApplied = true;
        return { ...meal, photoUrl: cached };
      }
      return meal;
    }),
  }));

  return anyApplied ? { ...plan, days: updatedDays } : plan;
}
