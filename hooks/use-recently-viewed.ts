/**
 * useRecentlyViewed — tracks and persists the last N exercises the user viewed.
 *
 * Stores exercise names in AsyncStorage, most-recent first.
 * Automatically deduplicates and caps at MAX_RECENT items.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "@peakpulse/recently_viewed_exercises";
const MAX_RECENT = 12;

export interface UseRecentlyViewedReturn {
  /** Most-recently-viewed exercise names (newest first) */
  recentNames: string[];
  /** Record that the user viewed an exercise */
  addRecent: (exerciseName: string) => void;
  /** Clear all recently viewed */
  clearRecent: () => void;
  /** Whether the initial load from storage is done */
  loaded: boolean;
}

export function useRecentlyViewed(): UseRecentlyViewedReturn {
  const [recentNames, setRecentNames] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const pendingSave = useRef(false);

  // Load from AsyncStorage on mount
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            setRecentNames(parsed.slice(0, MAX_RECENT));
          }
        }
      } catch {
        // Silently ignore storage errors
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  // Persist whenever recentNames changes (after initial load)
  useEffect(() => {
    if (!loaded) return;
    if (!pendingSave.current) return;
    pendingSave.current = false;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(recentNames)).catch(() => {});
  }, [recentNames, loaded]);

  const addRecent = useCallback((exerciseName: string) => {
    setRecentNames((prev) => {
      const filtered = prev.filter((n) => n !== exerciseName);
      const next = [exerciseName, ...filtered].slice(0, MAX_RECENT);
      // Only persist if actually changed
      if (next.length === prev.length && next.every((n, i) => n === prev[i])) {
        return prev;
      }
      pendingSave.current = true;
      return next;
    });
  }, []);

  const clearRecent = useCallback(() => {
    pendingSave.current = true;
    setRecentNames([]);
  }, []);

  return { recentNames, addRecent, clearRecent, loaded };
}
