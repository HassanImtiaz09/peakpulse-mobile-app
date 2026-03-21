import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

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
}

export interface DailyWearableEntry {
  date: string; // ISO date
  stats: WearableStats;
}

const WEARABLE_STATS_KEY = "@wearable_stats";
const WEARABLE_HISTORY_KEY = "@wearable_history";

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
};

// ── Context ────────────────────────────────────────────────────────
interface WearableContextValue {
  stats: WearableStats;
  history: DailyWearableEntry[];
  loading: boolean;
  syncFromDevice: (deviceName: string) => Promise<void>;
  updateStats: (partial: Partial<WearableStats>) => Promise<void>;
  getWeeklyAverage: () => { avgSteps: number; avgCalories: number; avgSleep: number; avgHR: number };
  isConnected: boolean;
}

const WearableContext = createContext<WearableContextValue | null>(null);

/**
 * Simulates wearable data sync. In a real app, this would use HealthKit/Google Fit APIs.
 * For demo purposes, it generates realistic data based on user activity patterns.
 */
function generateRealisticStats(deviceName: string): WearableStats {
  const hour = new Date().getHours();
  // Steps scale with time of day
  const baseSteps = Math.floor(Math.random() * 3000) + 2000;
  const timeMultiplier = hour < 8 ? 0.3 : hour < 12 ? 0.6 : hour < 18 ? 0.85 : 1.0;
  const steps = Math.round(baseSteps * timeMultiplier + Math.random() * 2000);

  const heartRate = Math.floor(Math.random() * 20) + 65; // 65-85 resting
  const activeCalories = Math.round(steps * 0.04 + Math.random() * 100);
  const restingCalories = Math.round(1400 + Math.random() * 400);
  const sleepHours = parseFloat((6 + Math.random() * 2.5).toFixed(1));
  const sleepQuality: WearableStats["sleepQuality"] =
    sleepHours >= 8 ? "excellent" : sleepHours >= 7 ? "good" : sleepHours >= 6 ? "fair" : "poor";

  return {
    steps,
    heartRate,
    activeCalories,
    restingCalories,
    totalCaloriesBurnt: activeCalories + restingCalories,
    sleepHours,
    sleepQuality,
    vo2Max: Math.round(35 + Math.random() * 15),
    hrv: Math.round(30 + Math.random() * 40),
    distance: parseFloat((steps * 0.0008).toFixed(1)),
    activeMinutes: Math.round(steps / 100 + Math.random() * 20),
    standHours: Math.min(12, Math.floor(hour * 0.7)),
    lastSyncedAt: new Date().toISOString(),
    connectedDevice: deviceName,
  };
}

export function WearableProvider({ children }: { children: React.ReactNode }) {
  const [stats, setStats] = useState<WearableStats>(DEFAULT_STATS);
  const [history, setHistory] = useState<DailyWearableEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [statsRaw, historyRaw] = await Promise.all([
        AsyncStorage.getItem(WEARABLE_STATS_KEY),
        AsyncStorage.getItem(WEARABLE_HISTORY_KEY),
      ]);
      if (statsRaw) setStats(JSON.parse(statsRaw));
      if (historyRaw) setHistory(JSON.parse(historyRaw));
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

  const syncFromDevice = useCallback(async (deviceName: string) => {
    const newStats = generateRealisticStats(deviceName);
    setStats(newStats);
    await saveStats(newStats);

    // Add to history
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
  }, []);

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

  const isConnected = stats.connectedDevice !== null && stats.lastSyncedAt !== null;

  return (
    <WearableContext.Provider value={{ stats, history, loading, syncFromDevice, updateStats, getWeeklyAverage, isConnected }}>
      {children}
    </WearableContext.Provider>
  );
}

export function useWearable() {
  const ctx = useContext(WearableContext);
  if (!ctx) throw new Error("useWearable must be used within WearableProvider");
  return ctx;
}
