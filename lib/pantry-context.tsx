import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ── Types ──────────────────────────────────────────────────────────
export type PantryCategory =
  | "Proteins"
  | "Dairy"
  | "Grains & Carbs"
  | "Vegetables"
  | "Fruits"
  | "Condiments & Spices"
  | "Oils & Fats"
  | "Beverages"
  | "Other";

export const PANTRY_CATEGORIES: PantryCategory[] = [
  "Proteins",
  "Dairy",
  "Grains & Carbs",
  "Vegetables",
  "Fruits",
  "Condiments & Spices",
  "Oils & Fats",
  "Beverages",
  "Other",
];

export interface PantryItem {
  id: string;
  name: string;
  category: PantryCategory;
  quantity?: number;
  unit?: string;
  expiresAt?: string; // ISO date string
  addedAt: string; // ISO date string
  source: "manual" | "ai-scan";
}

export interface AISuggestedMeal {
  name: string;
  description: string;
  ingredients: { name: string; fromPantry: boolean; quantity?: string }[];
  missingIngredients: string[];
  estimatedCalories: number;
  estimatedProtein: number;
  estimatedCarbs: number;
  estimatedFat: number;
  prepTime: string;
  instructions: string[];
}

export interface ShoppingSuggestion {
  name: string;
  category: string;
  reason: string;
  estimatedCost: string;
  mealsItEnables: string[];
  priority: "essential" | "recommended" | "nice-to-have";
}

// ── Storage Keys ───────────────────────────────────────────────────
const PANTRY_KEY = "@pantry_items";

// ── Context ────────────────────────────────────────────────────────
interface PantryContextValue {
  items: PantryItem[];
  loading: boolean;
  addItem: (item: Omit<PantryItem, "id" | "addedAt">) => Promise<void>;
  addItems: (items: Omit<PantryItem, "id" | "addedAt">[]) => Promise<void>;
  updateItem: (id: string, updates: Partial<PantryItem>) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
  refreshFromStorage: () => Promise<void>;
  getItemsByCategory: () => Record<PantryCategory, PantryItem[]>;
  getExpiringItems: (withinDays?: number) => PantryItem[];
}

const PantryContext = createContext<PantryContextValue | null>(null);

export function PantryProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<PantryItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Load from storage on mount
  useEffect(() => {
    loadFromStorage();
  }, []);

  const loadFromStorage = async () => {
    try {
      const raw = await AsyncStorage.getItem(PANTRY_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as PantryItem[];
        setItems(parsed);
      }
    } catch {
      // ignore parse errors
    } finally {
      setLoading(false);
    }
  };

  const saveToStorage = async (newItems: PantryItem[]) => {
    try {
      await AsyncStorage.setItem(PANTRY_KEY, JSON.stringify(newItems));
    } catch {
      // ignore storage errors
    }
  };

  const addItem = useCallback(async (item: Omit<PantryItem, "id" | "addedAt">) => {
    const newItem: PantryItem = {
      ...item,
      id: `pantry_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      addedAt: new Date().toISOString(),
    };
    setItems(prev => {
      const updated = [...prev, newItem];
      saveToStorage(updated);
      return updated;
    });
  }, []);

  const addItems = useCallback(async (newItems: Omit<PantryItem, "id" | "addedAt">[]) => {
    const itemsToAdd: PantryItem[] = newItems.map(item => ({
      ...item,
      id: `pantry_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      addedAt: new Date().toISOString(),
    }));
    setItems(prev => {
      const updated = [...prev, ...itemsToAdd];
      saveToStorage(updated);
      return updated;
    });
  }, []);

  const updateItem = useCallback(async (id: string, updates: Partial<PantryItem>) => {
    setItems(prev => {
      const updated = prev.map(item =>
        item.id === id ? { ...item, ...updates } : item
      );
      saveToStorage(updated);
      return updated;
    });
  }, []);

  const removeItem = useCallback(async (id: string) => {
    setItems(prev => {
      const updated = prev.filter(item => item.id !== id);
      saveToStorage(updated);
      return updated;
    });
  }, []);

  const clearAll = useCallback(async () => {
    setItems([]);
    await AsyncStorage.removeItem(PANTRY_KEY);
  }, []);

  const refreshFromStorage = useCallback(async () => {
    await loadFromStorage();
  }, []);

  const getItemsByCategory = useCallback((): Record<PantryCategory, PantryItem[]> => {
    const grouped = {} as Record<PantryCategory, PantryItem[]>;
    for (const cat of PANTRY_CATEGORIES) {
      grouped[cat] = [];
    }
    for (const item of items) {
      if (grouped[item.category]) {
        grouped[item.category].push(item);
      } else {
        grouped["Other"].push(item);
      }
    }
    return grouped;
  }, [items]);

  const getExpiringItems = useCallback((withinDays = 3): PantryItem[] => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + withinDays);
    return items.filter(item => {
      if (!item.expiresAt) return false;
      return new Date(item.expiresAt) <= cutoff;
    }).sort((a, b) => new Date(a.expiresAt!).getTime() - new Date(b.expiresAt!).getTime());
  }, [items]);

  return (
    <PantryContext.Provider value={{
      items,
      loading,
      addItem,
      addItems,
      updateItem,
      removeItem,
      clearAll,
      refreshFromStorage,
      getItemsByCategory,
      getExpiringItems,
    }}>
      {children}
    </PantryContext.Provider>
  );
}

export function usePantry() {
  const ctx = useContext(PantryContext);
  if (!ctx) throw new Error("usePantry must be used within PantryProvider");
  return ctx;
}

// ── Quick-add common items ─────────────────────────────────────────
export const COMMON_PANTRY_ITEMS: { name: string; category: PantryCategory }[] = [
  { name: "Chicken Breast", category: "Proteins" },
  { name: "Eggs", category: "Proteins" },
  { name: "Salmon", category: "Proteins" },
  { name: "Ground Beef", category: "Proteins" },
  { name: "Tofu", category: "Proteins" },
  { name: "Greek Yogurt", category: "Dairy" },
  { name: "Milk", category: "Dairy" },
  { name: "Cheese", category: "Dairy" },
  { name: "Butter", category: "Dairy" },
  { name: "Rice", category: "Grains & Carbs" },
  { name: "Pasta", category: "Grains & Carbs" },
  { name: "Bread", category: "Grains & Carbs" },
  { name: "Oats", category: "Grains & Carbs" },
  { name: "Quinoa", category: "Grains & Carbs" },
  { name: "Potatoes", category: "Grains & Carbs" },
  { name: "Broccoli", category: "Vegetables" },
  { name: "Spinach", category: "Vegetables" },
  { name: "Tomatoes", category: "Vegetables" },
  { name: "Onions", category: "Vegetables" },
  { name: "Bell Peppers", category: "Vegetables" },
  { name: "Carrots", category: "Vegetables" },
  { name: "Avocado", category: "Fruits" },
  { name: "Bananas", category: "Fruits" },
  { name: "Berries", category: "Fruits" },
  { name: "Apples", category: "Fruits" },
  { name: "Olive Oil", category: "Oils & Fats" },
  { name: "Coconut Oil", category: "Oils & Fats" },
  { name: "Salt", category: "Condiments & Spices" },
  { name: "Pepper", category: "Condiments & Spices" },
  { name: "Garlic", category: "Condiments & Spices" },
  { name: "Soy Sauce", category: "Condiments & Spices" },
  { name: "Honey", category: "Condiments & Spices" },
  { name: "Peanut Butter", category: "Condiments & Spices" },
  { name: "Protein Powder", category: "Other" },
  { name: "Almonds", category: "Other" },
];

// ── Category icons ─────────────────────────────────────────────────
export const CATEGORY_ICONS: Record<PantryCategory, string> = {
  "Proteins": "set-meal",
  "Dairy": "local-drink",
  "Grains & Carbs": "bakery-dining",
  "Vegetables": "eco",
  "Fruits": "nutrition",
  "Condiments & Spices": "local-fire-department",
  "Oils & Fats": "water-drop",
  "Beverages": "local-cafe",
  "Other": "inventory-2",
};
