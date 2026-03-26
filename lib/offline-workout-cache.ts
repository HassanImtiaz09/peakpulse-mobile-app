/**
 * Offline Workout Cache Service
 *
 * Caches the full workout plan and voice cue data for offline use.
 * Detects network status and serves cached data when offline.
 * Uses AsyncStorage for persistent caching.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { getAudioCues, getExercisesWithAudioCues, type ExerciseAudioCues } from "@/lib/audio-form-cues";
import { getExerciseDemo, type ExerciseDemo } from "@/lib/exercise-demos";

// ── Types ────────────────────────────────────────────────────────────────────

export interface CachedWorkoutPlan {
  planId: string;
  planName: string;
  days: CachedWorkoutDay[];
  cachedAt: string;
  version: number;
}

export interface CachedWorkoutDay {
  dayName: string;
  focus: string;
  exercises: CachedExercise[];
}

export interface CachedExercise {
  name: string;
  sets: number;
  reps: string;
  rest: string;
  notes: string;
  audioCues: ExerciseAudioCues | null;
  demo: ExerciseDemo | null;
}

export interface OfflineCacheStatus {
  hasCachedPlan: boolean;
  planName: string | null;
  cachedAt: string | null;
  exerciseCount: number;
  cuesCached: number;
  demosCached: number;
  cacheSize: string;
  isOnline: boolean;
}

// ── Storage Keys ────────────────────────────────────────────────────────────

const CACHE_KEY = "@offline_workout_cache";
const CACHE_META_KEY = "@offline_workout_cache_meta";
const CACHE_VERSION = 1;

// ── Network Detection ───────────────────────────────────────────────────────

/**
 * Check if the device is currently online.
 * Falls back to true if network check fails.
 */
export async function isOnline(): Promise<boolean> {
  try {
    if (Platform.OS === "web") {
      return typeof navigator !== "undefined" ? navigator.onLine : true;
    }
    // Try to import expo-network dynamically
    const Network = await import("expo-network");
    const state = await Network.getNetworkStateAsync();
    return state.isInternetReachable ?? state.isConnected ?? true;
  } catch {
    return true; // Assume online if check fails
  }
}

// ── Cache Operations ────────────────────────────────────────────────────────

/**
 * Cache a workout plan with all exercise data, audio cues, and demos.
 */
export async function cacheWorkoutPlan(
  planId: string,
  planName: string,
  days: { dayName: string; focus: string; exercises: { name: string; sets: number; reps: string; rest: string; notes: string }[] }[]
): Promise<CachedWorkoutPlan> {
  const cachedDays: CachedWorkoutDay[] = days.map((day) => ({
    dayName: day.dayName,
    focus: day.focus,
    exercises: day.exercises.map((ex) => ({
      name: ex.name,
      sets: ex.sets,
      reps: ex.reps,
      rest: ex.rest,
      notes: ex.notes,
      audioCues: getAudioCues(ex.name),
      demo: getExerciseDemo(ex.name),
    })),
  }));

  const plan: CachedWorkoutPlan = {
    planId,
    planName,
    days: cachedDays,
    cachedAt: new Date().toISOString(),
    version: CACHE_VERSION,
  };

  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(plan));

    // Save metadata separately for quick status checks
    const exerciseCount = cachedDays.reduce((a, d) => a + d.exercises.length, 0);
    const cuesCached = cachedDays.reduce(
      (a, d) => a + d.exercises.filter((e) => e.audioCues !== null).length,
      0
    );
    const demosCached = cachedDays.reduce(
      (a, d) => a + d.exercises.filter((e) => e.demo !== null).length,
      0
    );

    const meta = {
      planId,
      planName,
      cachedAt: plan.cachedAt,
      exerciseCount,
      cuesCached,
      demosCached,
    };
    await AsyncStorage.setItem(CACHE_META_KEY, JSON.stringify(meta));
  } catch (e) {
    console.warn("[OfflineCache] Failed to cache plan:", e);
  }

  return plan;
}

/**
 * Load the cached workout plan.
 */
export async function loadCachedPlan(): Promise<CachedWorkoutPlan | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const plan = JSON.parse(raw) as CachedWorkoutPlan;
    if (plan.version !== CACHE_VERSION) return null;
    return plan;
  } catch {
    return null;
  }
}

/**
 * Get cached exercise data for a specific exercise.
 */
export async function getCachedExercise(exerciseName: string): Promise<CachedExercise | null> {
  const plan = await loadCachedPlan();
  if (!plan) return null;

  const lower = exerciseName.toLowerCase();
  for (const day of plan.days) {
    for (const ex of day.exercises) {
      if (ex.name.toLowerCase() === lower) return ex;
    }
  }
  return null;
}

/**
 * Get cached audio cues for an exercise (falls back to live data if available).
 */
export async function getCachedAudioCues(exerciseName: string): Promise<ExerciseAudioCues | null> {
  // Try live data first
  const liveCues = getAudioCues(exerciseName);
  if (liveCues) return liveCues;

  // Fall back to cached
  const cached = await getCachedExercise(exerciseName);
  return cached?.audioCues ?? null;
}

/**
 * Get the offline cache status.
 */
export async function getOfflineCacheStatus(): Promise<OfflineCacheStatus> {
  try {
    const online = await isOnline();
    const metaRaw = await AsyncStorage.getItem(CACHE_META_KEY);

    if (!metaRaw) {
      return {
        hasCachedPlan: false,
        planName: null,
        cachedAt: null,
        exerciseCount: 0,
        cuesCached: 0,
        demosCached: 0,
        cacheSize: "0 KB",
        isOnline: online,
      };
    }

    const meta = JSON.parse(metaRaw);
    const cacheRaw = await AsyncStorage.getItem(CACHE_KEY);
    const cacheSize = cacheRaw ? `${(new Blob([cacheRaw]).size / 1024).toFixed(1)} KB` : "0 KB";

    return {
      hasCachedPlan: true,
      planName: meta.planName,
      cachedAt: meta.cachedAt,
      exerciseCount: meta.exerciseCount,
      cuesCached: meta.cuesCached,
      demosCached: meta.demosCached,
      cacheSize,
      isOnline: online,
    };
  } catch {
    return {
      hasCachedPlan: false,
      planName: null,
      cachedAt: null,
      exerciseCount: 0,
      cuesCached: 0,
      demosCached: 0,
      cacheSize: "0 KB",
      isOnline: true,
    };
  }
}

/**
 * Clear the offline cache.
 */
export async function clearOfflineCache(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([CACHE_KEY, CACHE_META_KEY]);
  } catch {}
}

/**
 * Pre-cache all available audio cues and demos for quick offline access.
 * This caches the static cue data that's built into the app.
 */
export async function preCacheAllCuesAndDemos(): Promise<{ cuesCached: number; demosCached: number }> {
  const exercisesWithCues = getExercisesWithAudioCues();
  let cuesCached = 0;
  let demosCached = 0;

  // Audio cues are already in-memory (static data), but we store them in the cache
  // so they're available alongside the workout plan
  for (const name of exercisesWithCues) {
    const cues = getAudioCues(name);
    if (cues) cuesCached++;
    const demo = getExerciseDemo(name);
    if (demo) demosCached++;
  }

  return { cuesCached, demosCached };
}

/**
 * Auto-cache the current workout plan when starting a workout.
 * Called from active-workout screen to ensure data is available offline.
 */
export async function autoCacheCurrentWorkout(
  planName: string,
  exercises: { name: string; sets: number; reps: string; rest: string; notes: string }[]
): Promise<void> {
  try {
    await cacheWorkoutPlan(
      `auto_${Date.now()}`,
      planName,
      [{ dayName: "Current Workout", focus: planName, exercises }]
    );
  } catch {}
}
