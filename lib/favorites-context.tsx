/**
 * Favorites Context
 *
 * Provides app-wide access to exercise favorites with AsyncStorage persistence.
 * Supports toggling, checking, and listing favorite exercises with haptic feedback.
 */
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import * as Haptics from "expo-haptics";

const STORAGE_KEY = "@exercise_favorites";

interface FavoritesContextType {
  /** Set of favorited exercise names (normalised lowercase) */
  favorites: Set<string>;
  /** Toggle an exercise's favorite status */
  toggleFavorite: (exerciseName: string) => void;
  /** Check if an exercise is favorited */
  isFavorite: (exerciseName: string) => boolean;
  /** Get all favorite exercise names as an array */
  getFavoritesList: () => string[];
  /** Number of favorites */
  count: number;
  /** Whether favorites have been loaded from storage */
  loaded: boolean;
}

const FavoritesContext = createContext<FavoritesContextType>({
  favorites: new Set(),
  toggleFavorite: () => {},
  isFavorite: () => false,
  getFavoritesList: () => [],
  count: 0,
  loaded: false,
});

function normalise(name: string): string {
  return name.toLowerCase().trim();
}

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);

  // Load favorites from AsyncStorage on mount
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const arr: string[] = JSON.parse(raw);
          setFavorites(new Set(arr));
        }
      } catch {
        // Silent fail — start with empty favorites
      }
      setLoaded(true);
    })();
  }, []);

  // Persist favorites to AsyncStorage
  const persist = useCallback(async (newFavs: Set<string>) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(newFavs)));
    } catch {
      // Silent fail
    }
  }, []);

  const toggleFavorite = useCallback((exerciseName: string) => {
    const key = normalise(exerciseName);
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
        // Light haptic for unfavorite
        if (Platform.OS !== "web") {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        }
      } else {
        next.add(key);
        // Medium haptic for favorite
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        }
      }
      persist(next);
      return next;
    });
  }, [persist]);

  const isFavorite = useCallback((exerciseName: string): boolean => {
    return favorites.has(normalise(exerciseName));
  }, [favorites]);

  const getFavoritesList = useCallback((): string[] => {
    return Array.from(favorites);
  }, [favorites]);

  const count = favorites.size;

  const value = useMemo(() => ({
    favorites,
    toggleFavorite,
    isFavorite,
    getFavoritesList,
    count,
    loaded,
  }), [favorites, toggleFavorite, isFavorite, getFavoritesList, count, loaded]);

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  return useContext(FavoritesContext);
}
