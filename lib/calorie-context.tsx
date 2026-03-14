/**
 * CalorieContext — real-time calorie tracking shared across Meal Log and Dashboard.
 * Persists today's meals in AsyncStorage and resets at midnight.
 */
import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

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

interface CalorieState {
  meals: MealEntry[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  calorieGoal: number;
  caloriesRemaining: number;
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
  addMeal: async () => {},
  removeMeal: async () => {},
  setCalorieGoal: async () => {},
  refreshFromStorage: async () => {},
});

const MEALS_KEY = "@peakpulse_today_meals";
const GOAL_KEY = "@peakpulse_calorie_goal";

function getTodayKey() {
  return new Date().toISOString().split("T")[0]; // YYYY-MM-DD
}

export function CalorieProvider({ children }: { children: React.ReactNode }) {
  const [meals, setMeals] = useState<MealEntry[]>([]);
  const [calorieGoal, setCalorieGoalState] = useState(2000);

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
 */
export async function getMealPhotos(days: number): Promise<(MealEntry & { date: string })[]> {
  const history = await getHistoricalMeals(days);
  const photos: (MealEntry & { date: string })[] = [];
  for (const [date, meals] of Object.entries(history)) {
    for (const m of meals) {
      if (m.photoUri) {
        photos.push({ ...m, date });
      }
    }
  }
  photos.sort((a, b) => new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime());
  return photos;
}
