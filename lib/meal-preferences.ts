import AsyncStorage from "@react-native-async-storage/async-storage";

const PREFS_KEY = "@meal_preferences";

export interface MealRating {
  mealName: string;
  rating: number; // 1-5 stars
  isFavourite: boolean;
  tags: string[]; // e.g. ["high-protein", "quick", "comfort"]
  ratedAt: number; // timestamp
}

export interface MealPreferences {
  ratings: Record<string, MealRating>; // keyed by normalised meal name
  favourites: string[]; // ordered list of favourite meal names
  disliked: string[]; // meals the user explicitly disliked (1 star)
}

function normKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export async function loadMealPreferences(): Promise<MealPreferences> {
  try {
    const raw = await AsyncStorage.getItem(PREFS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { ratings: {}, favourites: [], disliked: [] };
}

export async function saveMealPreferences(prefs: MealPreferences): Promise<void> {
  await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}

export async function rateMeal(
  mealName: string,
  rating: number,
  tags?: string[]
): Promise<MealPreferences> {
  const prefs = await loadMealPreferences();
  const key = normKey(mealName);
  const existing = prefs.ratings[key];
  prefs.ratings[key] = {
    mealName,
    rating,
    isFavourite: rating >= 4,
    tags: tags ?? existing?.tags ?? [],
    ratedAt: Date.now(),
  };
  // Update favourites list
  if (rating >= 4) {
    if (!prefs.favourites.includes(mealName)) {
      prefs.favourites.unshift(mealName);
      if (prefs.favourites.length > 50) prefs.favourites.pop();
    }
    prefs.disliked = prefs.disliked.filter(n => normKey(n) !== key);
  } else if (rating <= 2) {
    prefs.favourites = prefs.favourites.filter(n => normKey(n) !== key);
    if (!prefs.disliked.includes(mealName)) {
      prefs.disliked.unshift(mealName);
      if (prefs.disliked.length > 50) prefs.disliked.pop();
    }
  } else {
    // Neutral (3 stars) — remove from both lists
    prefs.favourites = prefs.favourites.filter(n => normKey(n) !== key);
    prefs.disliked = prefs.disliked.filter(n => normKey(n) !== key);
  }
  await saveMealPreferences(prefs);
  return prefs;
}

export async function toggleFavourite(mealName: string): Promise<MealPreferences> {
  const prefs = await loadMealPreferences();
  const key = normKey(mealName);
  const existing = prefs.ratings[key];
  if (existing?.isFavourite) {
    // Unfavourite
    existing.isFavourite = false;
    existing.rating = 3;
    prefs.favourites = prefs.favourites.filter(n => normKey(n) !== key);
  } else {
    // Favourite
    if (existing) {
      existing.isFavourite = true;
      existing.rating = 5;
    } else {
      prefs.ratings[key] = {
        mealName,
        rating: 5,
        isFavourite: true,
        tags: [],
        ratedAt: Date.now(),
      };
    }
    if (!prefs.favourites.includes(mealName)) {
      prefs.favourites.unshift(mealName);
      if (prefs.favourites.length > 50) prefs.favourites.pop();
    }
    prefs.disliked = prefs.disliked.filter(n => normKey(n) !== key);
  }
  await saveMealPreferences(prefs);
  return prefs;
}

export function isFavourite(prefs: MealPreferences, mealName: string): boolean {
  const key = normKey(mealName);
  return prefs.ratings[key]?.isFavourite ?? false;
}

export function getMealRating(prefs: MealPreferences, mealName: string): number {
  const key = normKey(mealName);
  return prefs.ratings[key]?.rating ?? 0;
}

/** Build a preference summary string to include in AI prompts */
export function buildPreferenceSummary(prefs: MealPreferences): string {
  const parts: string[] = [];
  if (prefs.favourites.length > 0) {
    parts.push(`User's favourite meals (include similar dishes): ${prefs.favourites.slice(0, 10).join(", ")}`);
  }
  if (prefs.disliked.length > 0) {
    parts.push(`User dislikes these meals (AVOID similar dishes): ${prefs.disliked.slice(0, 10).join(", ")}`);
  }
  // Extract common tags from favourites
  const tagCounts: Record<string, number> = {};
  Object.values(prefs.ratings)
    .filter(r => r.isFavourite)
    .forEach(r => r.tags.forEach(t => { tagCounts[t] = (tagCounts[t] ?? 0) + 1; }));
  const topTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([t]) => t);
  if (topTags.length > 0) {
    parts.push(`User prefers these meal styles: ${topTags.join(", ")}`);
  }
  return parts.join(". ");
}
