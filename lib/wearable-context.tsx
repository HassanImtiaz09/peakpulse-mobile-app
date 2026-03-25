import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { AppState, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  fetchHealthData,
  requestHealthPermissions,
  generateSimulatedHealthData,
  getAvailableHealthSource,
  getHealthSourceDisplayName,
  isHealthPlatformAvailable,
  writeWorkout,
  type HealthData,
  type HealthDataSource,
  type PermissionStatus,
  type HealthPermissionState,
  type WorkoutData,
  type WorkoutWriteResult,
} from "@/lib/health-service";

// ── Types ──────────────────────────────────────────────────────────
export interface WearableStats {
  steps: number;
  heartRate: number; // bpm
  activeCalories: number;
  restingCalories: number;
  totalCaloriesBurnt: number;
  sleepHours: number;
  sleepQuality: "poor" | "fair" | "good" | "excellent";
  vo2Max: number | null;
  hrv: number | null; // ms
  distance: number; // km
  activeMinutes: number;
  standHours: number;
  lastSyncedAt: string | null;
  connectedDevice: string | null;
  // New fields from health platform integration
  bloodOxygen: number | null;
  restingHeartRate: number | null;
  dataSource: HealthDataSource;
}

export interface DailyWearableEntry {
  date: string; // ISO date
  stats: WearableStats;
}

const WEARABLE_STATS_KEY = "@wearable_stats";
const WEARABLE_HISTORY_KEY = "@wearable_history";
const HEALTH_PERMISSION_KEY = "@health_permission_status";
const HEALTH_SOURCE_PREF_KEY = "@health_source_preference";

const DEFAULT_STATS: WearableStats = {
  steps: 0,
  heartRate: 0,
  activeCalories: 0,
  restingCalories: 0,
  totalCaloriesBurnt: 0,
  sleepHours: 0,
  sleepQuality: "fair",
  vo2Max: null,
  hrv: null,
  distance: 0,
  activeMinutes: 0,
  standHours: 0,
  lastSyncedAt: null,
  connectedDevice: null,
  bloodOxygen: null,
  restingHeartRate: null,
  dataSource: "none",
};

// ── Context ────────────────────────────────────────────────────────
interface WearableContextValue {
  stats: WearableStats;
  history: DailyWearableEntry[];
  loading: boolean;
  syncing: boolean;
  /** Request health platform permissions (HealthKit / Health Connect) */
  requestPermissions: () => Promise<HealthPermissionState>;
  /** Sync data from the health platform or simulate for web */
  syncFromDevice: (deviceName: string) => Promise<void>;
  /** Sync from the native health platform (HealthKit / Health Connect) */
  syncFromHealthPlatform: () => Promise<boolean>;
  /** Update stats manually */
  updateStats: (partial: Partial<WearableStats>) => Promise<void>;
  /** Get 7-day averages */
  getWeeklyAverage: () => { avgSteps: number; avgCalories: number; avgSleep: number; avgHR: number };
  /** Write a workout to the health platform */
  logWorkoutToHealthPlatform: (workout: WorkoutData) => Promise<WorkoutWriteResult>;
  /** Whether any wearable data is available */
  isConnected: boolean;
  /** Current health data source */
  healthSource: HealthDataSource;
  /** Permission status for the health platform */
  permissionStatus: PermissionStatus;
  /** Display name of the health data source */
  healthSourceName: string;
  /** Whether native health platform is available (not web) */
  isHealthPlatformAvailable: boolean;
}

const WearableContext = createContext<WearableContextValue | null>(null);

/**
 * Convert HealthData from the health service into WearableStats format.
 */
function healthDataToWearableStats(data: HealthData, deviceName: string): WearableStats {
  return {
    steps: data.steps,
    heartRate: data.heartRate,
    activeCalories: data.activeCalories,
    restingCalories: data.restingCalories,
    totalCaloriesBurnt: data.totalCaloriesBurnt,
    sleepHours: data.sleepHours,
    sleepQuality: data.sleepQuality,
    vo2Max: data.vo2Max,
    hrv: data.hrv,
    distance: data.distance,
    activeMinutes: data.activeMinutes,
    standHours: data.standHours,
    lastSyncedAt: data.lastSyncedAt,
    connectedDevice: deviceName,
    bloodOxygen: data.bloodOxygen ?? null,
    restingHeartRate: data.restingHeartRate ?? null,
    dataSource: data.dataSource,
  };
}

export function WearableProvider({ children }: { children: React.ReactNode }) {
  const [stats, setStats] = useState<WearableStats>(DEFAULT_STATS);
  const [history, setHistory] = useState<DailyWearableEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>("not_determined");
  const [healthSource, setHealthSource] = useState<HealthDataSource>(getAvailableHealthSource());
  const appStateRef = useRef(AppState.currentState);

  useEffect(() => {
    loadData();
  }, []);

  // Auto-sync when app comes to foreground (native only)
  useEffect(() => {
    if (Platform.OS === "web") return;

    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === "active" &&
        permissionStatus === "granted"
      ) {
        // App came to foreground — refresh health data
        syncFromHealthPlatform().catch(() => {});
      }
      appStateRef.current = nextAppState;
    });

    return () => subscription.remove();
  }, [permissionStatus]);

  // Auto-sync every 15 minutes when permission is granted
  useEffect(() => {
    if (permissionStatus !== "granted") return;
    const SYNC_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes
    const intervalId = setInterval(() => {
      syncFromHealthPlatformInternal().catch(() => {});
    }, SYNC_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [permissionStatus]);

  const loadData = async () => {
    try {
      const [statsRaw, historyRaw, permRaw] = await Promise.all([
        AsyncStorage.getItem(WEARABLE_STATS_KEY),
        AsyncStorage.getItem(WEARABLE_HISTORY_KEY),
        AsyncStorage.getItem(HEALTH_PERMISSION_KEY),
      ]);
      if (statsRaw) {
        const parsed = JSON.parse(statsRaw);
        // Ensure backward compatibility — add new fields if missing
        setStats({
          ...DEFAULT_STATS,
          ...parsed,
          bloodOxygen: parsed.bloodOxygen ?? null,
          restingHeartRate: parsed.restingHeartRate ?? null,
          dataSource: parsed.dataSource ?? "simulated",
        });
      }
      if (historyRaw) setHistory(JSON.parse(historyRaw));
      if (permRaw) setPermissionStatus(permRaw as PermissionStatus);

      // If permission was previously granted, auto-sync on load
      if (permRaw === "granted" && isHealthPlatformAvailable()) {
        // Delay to avoid blocking initial render
        setTimeout(() => {
          syncFromHealthPlatformInternal().catch(() => {});
        }, 2000);
      }
    } catch {} finally {
      setLoading(false);
    }
  };

  const saveStats = async (newStats: WearableStats) => {
    await AsyncStorage.setItem(WEARABLE_STATS_KEY, JSON.stringify(newStats)).catch(() => {});
  };

  const saveHistory = async (newHistory: DailyWearableEntry[]) => {
    await AsyncStorage.setItem(WEARABLE_HISTORY_KEY, JSON.stringify(newHistory)).catch(() => {});
  };

  const addToHistory = (newStats: WearableStats) => {
    const today = new Date().toISOString().split("T")[0];
    setHistory(prev => {
      const filtered = prev.filter(e => e.date !== today);
      const updated = [...filtered, { date: today, stats: newStats }];
      // Keep last 30 days
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 30);
      const trimmed = updated.filter(e => new Date(e.date) >= cutoff);
      saveHistory(trimmed);
      return trimmed;
    });
  };

  /**
   * Request permissions from the native health platform.
   */
  const requestPermissionsHandler = useCallback(async (): Promise<HealthPermissionState> => {
    const result = await requestHealthPermissions();
    setPermissionStatus(result.status);
    setHealthSource(result.source);
    await AsyncStorage.setItem(HEALTH_PERMISSION_KEY, result.status).catch(() => {});

    // If granted, immediately sync
    if (result.status === "granted") {
      await syncFromHealthPlatformInternal();
    }

    return result;
  }, []);

  /**
   * Internal sync from health platform (no syncing state management).
   */
  const syncFromHealthPlatformInternal = async (): Promise<boolean> => {
    try {
      const data = await fetchHealthData();
      if (data) {
        const sourceName = getHealthSourceDisplayName();
        const newStats = healthDataToWearableStats(data, sourceName);
        setStats(newStats);
        await saveStats(newStats);
        addToHistory(newStats);
        return true;
      }
      return false;
    } catch (e) {
      console.warn("[WearableContext] Health platform sync error:", e);
      return false;
    }
  };

  /**
   * Sync from the native health platform with loading state.
   */
  const syncFromHealthPlatform = useCallback(async (): Promise<boolean> => {
    setSyncing(true);
    try {
      return await syncFromHealthPlatformInternal();
    } finally {
      setSyncing(false);
    }
  }, []);

  /**
   * Legacy sync method — used by the wearable sync screen for third-party devices.
   * On native platforms with permission, tries real health data first.
   * Falls back to simulated data on web or when health data is unavailable.
   */
  const syncFromDevice = useCallback(async (deviceName: string) => {
    setSyncing(true);
    try {
      // Try real health data first if available
      if (isHealthPlatformAvailable() && permissionStatus === "granted") {
        const success = await syncFromHealthPlatformInternal();
        if (success) return;
      }

      // Fall back to simulated data (web or no permission)
      const simulated = generateSimulatedHealthData(deviceName);
      const newStats: WearableStats = {
        steps: simulated.steps,
        heartRate: simulated.heartRate,
        activeCalories: simulated.activeCalories,
        restingCalories: simulated.restingCalories,
        totalCaloriesBurnt: simulated.totalCaloriesBurnt,
        sleepHours: simulated.sleepHours,
        sleepQuality: simulated.sleepQuality,
        vo2Max: simulated.vo2Max,
        hrv: simulated.hrv,
        distance: simulated.distance,
        activeMinutes: simulated.activeMinutes,
        standHours: simulated.standHours,
        lastSyncedAt: simulated.lastSyncedAt,
        connectedDevice: deviceName,
        bloodOxygen: simulated.bloodOxygen ?? null,
        restingHeartRate: simulated.restingHeartRate ?? null,
        dataSource: simulated.dataSource,
      };
      setStats(newStats);
      await saveStats(newStats);
      addToHistory(newStats);
    } finally {
      setSyncing(false);
    }
  }, [permissionStatus]);

  const updateStats = useCallback(async (partial: Partial<WearableStats>) => {
    setStats(prev => {
      const updated = { ...prev, ...partial };
      saveStats(updated);
      return updated;
    });
  }, []);

  const getWeeklyAverage = useCallback(() => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekEntries = history.filter(e => new Date(e.date) >= weekAgo);
    if (weekEntries.length === 0) return { avgSteps: 0, avgCalories: 0, avgSleep: 0, avgHR: 0 };
    const n = weekEntries.length;
    return {
      avgSteps: Math.round(weekEntries.reduce((sum, e) => sum + e.stats.steps, 0) / n),
      avgCalories: Math.round(weekEntries.reduce((sum, e) => sum + e.stats.totalCaloriesBurnt, 0) / n),
      avgSleep: parseFloat((weekEntries.reduce((sum, e) => sum + e.stats.sleepHours, 0) / n).toFixed(1)),
      avgHR: Math.round(weekEntries.reduce((sum, e) => sum + e.stats.heartRate, 0) / n),
    };
  }, [history]);

  /**
   * Write a workout to the native health platform.
   */
  const logWorkoutToHealthPlatform = useCallback(async (workout: WorkoutData): Promise<WorkoutWriteResult> => {
    if (!isHealthPlatformAvailable() || permissionStatus !== "granted") {
      return { success: false, platform: "none", error: "Health platform not available or permission not granted" };
    }
    const result = await writeWorkout(workout);
    // After writing, refresh data to reflect the new workout
    if (result.success) {
      await syncFromHealthPlatformInternal();
    }
    return result;
  }, [permissionStatus]);

  const isConnected = stats.connectedDevice !== null && stats.lastSyncedAt !== null;
  const healthSourceName = getHealthSourceDisplayName();

  return (
    <WearableContext.Provider
      value={{
        stats,
        history,
        loading,
        syncing,
        requestPermissions: requestPermissionsHandler,
        syncFromDevice,
        syncFromHealthPlatform,
        logWorkoutToHealthPlatform,
        updateStats,
        getWeeklyAverage,
        isConnected,
        healthSource,
        permissionStatus,
        healthSourceName,
        isHealthPlatformAvailable: isHealthPlatformAvailable(),
      }}
    >
      {children}
    </WearableContext.Provider>
  );
}

export function useWearable() {
  const ctx = useContext(WearableContext);
  if (!ctx) throw new Error("useWearable must be used within WearableProvider");
  return ctx;
}
