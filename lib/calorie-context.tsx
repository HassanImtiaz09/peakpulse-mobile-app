/**
 * CalorieContext — real-time calorie tracking shared across Meal Log and Dashboard.
 * Persists today's meals in AsyncStorage and resets at midnight.
 */
import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { recordMealLogged } from "@/lib/feature-discovery";

export interface MealEntry {
  id: string;
  name: string;
  mealType: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  photoUri?: string;
  loggedAt: string; // ISO string
}

interface MacroTargets {
  protein: number;
  carbs: number;
  fat: number;
}

interface CalorieState {
  meals: MealEntry[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  calorieGoal: number;
  caloriesRemaining: number;
  macroTargets: MacroTargets;
  addMeal: (meal: Omit<MealEntry, "id" | "loggedAt">) => Promise<void>;
  removeMeal: (id: string) => Promise<void>;
  setCalorieGoal: (goal: number) => Promise<void>;
  refreshFromStorage: () => Promise<void>;
}

const CalorieContext = createContext<CalorieState>({
  meals: [],
  totalCalories: 0,
  totalProtein: 0,
  totalCarbs: 0,
  totalFat: 0,
  calorieGoal: 2000,
  caloriesRemaining: 2000,
  macroTargets: { protein: 0, carbs: 0, fat: 0 },
  addMeal: async () => {},
  removeMeal: async () => {},
  setCalorieGoal: async () => {},
  refreshFromStorage: async () => {},
});

const MEALS_KEY = "@peakpulse_today_meals";
const GOAL_KEY = "@peakpulse_calorie_goal";
const MACRO_TARGETS_KEY = "@user_macro_targets";
const FAVOURITES_KEY = "@peakpulse_meal_favourites";
const ARCHIVE_DAYS = 7; // Auto-archive non-favourited photos after 7 days

export interface FavouriteMeal {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  mealType: string;
  photoUri?: string;
  savedAt: string; // ISO string
}

/** Load all favourited meals from storage */
export async function getFavouriteMeals(): Promise<FavouriteMeal[]> {
  try {
    const raw = await AsyncStorage.getItem(FAVOURITES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

/** Add a meal to favourites */
export async function addFavouriteMeal(meal: Omit<FavouriteMeal, "id" | "savedAt">): Promise<FavouriteMeal> {
  const favs = await getFavouriteMeals();
  const entry: FavouriteMeal = {
    ...meal,
    id: `fav-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    savedAt: new Date().toISOString(),
  };
  favs.push(entry);
  await AsyncStorage.setItem(FAVOURITES_KEY, JSON.stringify(favs));
  return entry;
}

/** Remove a meal from favourites */
export async function removeFavouriteMeal(id: string): Promise<void> {
  const favs = await getFavouriteMeals();
  const updated = favs.filter(f => f.id !== id);
  await AsyncStorage.setItem(FAVOURITES_KEY, JSON.stringify(updated));
}

/** Check if a meal entry is favourited (by matching name + mealType) */
export async function isMealFavourited(name: string, mealType: string): Promise<boolean> {
  const favs = await getFavouriteMeals();
  return favs.some(f => f.name.toLowerCase() === name.toLowerCase() && f.mealType === mealType);
}

/** Search favourites by partial name match */
export async function searchFavouriteMeals(query: string): Promise<FavouriteMeal[]> {
  if (!query || query.length < 2) return [];
  const favs = await getFavouriteMeals();
  const q = query.toLowerCase();
  return favs.filter(f => f.name.toLowerCase().includes(q));
}

function getTodayKey() {
  return new Date().toISOString().split("T")[0]; // YYYY-MM-DD
}

export function CalorieProvider({ children }: { children: React.ReactNode }) {
  const [meals, setMeals] = useState<MealEntry[]>([]);
  const [calorieGoal, setCalorieGoalState] = useState(2000);
  const [macroTargets, setMacroTargets] = useState<MacroTargets>({ protein: 0, carbs: 0, fat: 0 });

  const refreshFromStorage = useCallback(async () => {
    try {
      const todayKey = getTodayKey();
      const raw = await AsyncStorage.getItem(`${MEALS_KEY}_${todayKey}`);
      if (raw) {
        setMeals(JSON.parse(raw));
      } else {
        setMeals([]);
      }
      const goalRaw = await AsyncStorage.getItem(GOAL_KEY);
      if (goalRaw) setCalorieGoalState(parseInt(goalRaw, 10));
      const macroRaw = await AsyncStorage.getItem(MACRO_TARGETS_KEY);
      if (macroRaw) {
        try { setMacroTargets(JSON.parse(macroRaw)); } catch {}
      }
    } catch {}
  }, []);

  useEffect(() => {
    refreshFromStorage();
  }, [refreshFromStorage]);

  async function saveMeals(updated: MealEntry[]) {
    const todayKey = getTodayKey();
    await AsyncStorage.setItem(`${MEALS_KEY}_${todayKey}`, JSON.stringify(updated));
    setMeals(updated);
  }

  async function addMeal(meal: Omit<MealEntry, "id" | "loggedAt">) {
    const entry: MealEntry = {
      ...meal,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      loggedAt: new Date().toISOString(),
    };
    const updated = [...meals, entry];
    await saveMeals(updated);
    // Track for progressive feature disclosure
    recordMealLogged().catch(() => {});
  }

  async function removeMeal(id: string) {
    const updated = meals.filter(m => m.id !== id);
    await saveMeals(updated);
  }

  async function setCalorieGoal(goal: number) {
    await AsyncStorage.setItem(GOAL_KEY, String(goal));
    setCalorieGoalState(goal);
  }

  const totalCalories = meals.reduce((s, m) => s + (m.calories || 0), 0);
  const totalProtein = meals.reduce((s, m) => s + (m.protein || 0), 0);
  const totalCarbs = meals.reduce((s, m) => s + (m.carbs || 0), 0);
  const totalFat = meals.reduce((s, m) => s + (m.fat || 0), 0);
  const caloriesRemaining = Math.max(0, calorieGoal - totalCalories);

  return (
    <CalorieContext.Provider value={{
      meals,
      totalCalories,
      totalProtein,
      totalCarbs,
      totalFat,
      calorieGoal,
      caloriesRemaining,
      macroTargets,
      addMeal,
      removeMeal,
      setCalorieGoal,
      refreshFromStorage,
    }}>
      {children}
    </CalorieContext.Provider>
  );
}

export function useCalories() {
  return useContext(CalorieContext);
}

/**
 * Load meal entries for a range of past days (including today).
 * Returns a map of date string (YYYY-MM-DD) to MealEntry[].
 */
export async function getHistoricalMeals(days: number): Promise<Record<string, MealEntry[]>> {
  const result: Record<string, MealEntry[]> = {};
  const today = new Date();
  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split("T")[0];
    try {
      const raw = await AsyncStorage.getItem(`${MEALS_KEY}_${key}`);
      result[key] = raw ? JSON.parse(raw) : [];
    } catch {
      result[key] = [];
    }
  }
  return result;
}

/**
 * Get all meal entries that have a photoUri, across the last N days.
 * Returns entries sorted by loggedAt descending (newest first).
 * If archiveOld is true, entries older than ARCHIVE_DAYS are excluded
 * unless they are in the favourites list.
 */
export async function getMealPhotos(
  days: number,
  options?: { archiveOld?: boolean },
): Promise<(MealEntry & { date: string; isArchived: boolean; isFavourited: boolean })[]> {
  const history = await getHistoricalMeals(days);
  const favs = await getFavouriteMeals();
  const favNameSet = new Set(favs.map(f => `${f.name.toLowerCase()}|${f.mealType}`));

  const archiveCutoff = new Date();
  archiveCutoff.setDate(archiveCutoff.getDate() - ARCHIVE_DAYS);

  const photos: (MealEntry & { date: string; isArchived: boolean; isFavourited: boolean })[] = [];
  for (const [date, meals] of Object.entries(history)) {
    for (const m of meals) {
      if (m.photoUri) {
        const logDate = new Date(m.loggedAt);
        const isFav = favNameSet.has(`${m.name.toLowerCase()}|${m.mealType}`);
        const isOld = logDate < archiveCutoff;
        const isArchived = isOld && !isFav;

        // If archiveOld is true, skip archived entries
        if (options?.archiveOld && isArchived) continue;

        photos.push({ ...m, date, isArchived, isFavourited: isFav });
      }
    }
  }
  photos.sort((a, b) => new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime());
  return photos;
}

/**
 * Purge archived meal photos from AsyncStorage.
 * Removes non-favourited photo entries older than ARCHIVE_DAYS.
 * Call periodically (e.g. on app launch) to keep storage clean.
 */
export async function purgeArchivedMealPhotos(): Promise<number> {
  const favs = await getFavouriteMeals();
  const favNameSet = new Set(favs.map(f => `${f.name.toLowerCase()}|${f.mealType}`));
  const archiveCutoff = new Date();
  archiveCutoff.setDate(archiveCutoff.getDate() - ARCHIVE_DAYS);

  let purgedCount = 0;
  const today = new Date();
  // Only check days older than ARCHIVE_DAYS
  for (let i = ARCHIVE_DAYS; i < 60; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split("T")[0];
    try {
      const raw = await AsyncStorage.getItem(`${MEALS_KEY}_${key}`);
      if (!raw) continue;
      const meals: MealEntry[] = JSON.parse(raw);
      const before = meals.length;
      // Remove photo URIs from non-favourited entries (keep the meal log, just clear the photo)
      const updated = meals.map(m => {
        if (m.photoUri && !favNameSet.has(`${m.name.toLowerCase()}|${m.mealType}`)) {
          purgedCount++;
          return { ...m, photoUri: undefined };
        }
        return m;
      });
      if (purgedCount > 0) {
        await AsyncStorage.setItem(`${MEALS_KEY}_${key}`, JSON.stringify(updated));
      }
    } catch {}
  }
  return purgedCount;
}
