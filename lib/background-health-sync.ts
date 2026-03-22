/**
 * Background Health Sync Service
 *
 * Registers a background task that periodically fetches health data
 * from HealthKit (iOS) or Health Connect (Android) even when the app
 * is not in the foreground.
 *
 * Uses expo-background-task + expo-task-manager.
 *
 * IMPORTANT: Background tasks only work on native devices with a
 * custom dev build. They will NOT work in Expo Go or on web.
 */

import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ── Constants ──────────────────────────────────────────────────────
export const BACKGROUND_HEALTH_SYNC_TASK = "peakpulse-health-sync";
const LAST_BG_SYNC_KEY = "@last_background_sync";
const BG_SYNC_ENABLED_KEY = "@background_sync_enabled";
const BG_SYNC_LOG_KEY = "@background_sync_log";

// ── Types ──────────────────────────────────────────────────────────
export interface BackgroundSyncStatus {
  isRegistered: boolean;
  isEnabled: boolean;
  lastSyncAt: string | null;
  lastSyncLog: string | null;
}

// ── Task Definition (must be called in global scope) ──────────────
let taskDefined = false;

/**
 * Define the background task. This MUST be called in the global scope
 * (outside any React component), typically in _layout.tsx or a top-level file.
 *
 * On web, this is a no-op.
 */
export function defineBackgroundHealthSyncTask(): void {
  if (Platform.OS === "web" || taskDefined) return;

  try {
    const TaskManager = require("expo-task-manager");
    const BackgroundTask = require("expo-background-task");

    TaskManager.defineTask(BACKGROUND_HEALTH_SYNC_TASK, async () => {
      try {
        const now = new Date().toISOString();
        console.log(`[BackgroundSync] Running at ${now}`);

        // Dynamically import health service to avoid circular deps
        const { fetchHealthData, isHealthPlatformAvailable } = require("@/lib/health-service");

        if (!isHealthPlatformAvailable()) {
          await logSync(now, "Skipped: not a native platform");
          return BackgroundTask.BackgroundTaskResult.Success;
        }

        const data = await fetchHealthData();

        if (data) {
          // Store the fetched data for the wearable context to pick up
          await AsyncStorage.setItem("@wearable_stats", JSON.stringify({
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
            bloodOxygen: data.bloodOxygen,
            restingHeartRate: data.restingHeartRate,
            lastSyncedAt: now,
            connectedDevice: data.dataSource === "healthkit" ? "Apple Health" : "Health Connect",
            dataSource: data.dataSource,
          }));

          // Also update history
          const today = now.split("T")[0];
          const historyRaw = await AsyncStorage.getItem("@wearable_history");
          const history = historyRaw ? JSON.parse(historyRaw) : [];
          const filtered = history.filter((e: any) => e.date !== today);
          const updated = [...filtered, { date: today, stats: { ...data, connectedDevice: data.dataSource === "healthkit" ? "Apple Health" : "Health Connect" } }];
          // Keep last 30 days
          const cutoff = new Date();
          cutoff.setDate(cutoff.getDate() - 30);
          const trimmed = updated.filter((e: any) => new Date(e.date) >= cutoff);
          await AsyncStorage.setItem("@wearable_history", JSON.stringify(trimmed));

          await logSync(now, `Success: ${data.steps} steps, ${data.heartRate} bpm`);
          console.log(`[BackgroundSync] Synced: ${data.steps} steps, ${data.heartRate} bpm`);
        } else {
          await logSync(now, "No data returned from health platform");
        }

        return BackgroundTask.BackgroundTaskResult.Success;
      } catch (error: any) {
        const now = new Date().toISOString();
        await logSync(now, `Error: ${error?.message ?? "Unknown"}`);
        console.warn("[BackgroundSync] Task error:", error);
        return BackgroundTask.BackgroundTaskResult.Failed;
      }
    });

    taskDefined = true;
    console.log("[BackgroundSync] Task defined");
  } catch (e) {
    console.warn("[BackgroundSync] Failed to define task:", e);
  }
}

async function logSync(timestamp: string, message: string): Promise<void> {
  try {
    await AsyncStorage.setItem(LAST_BG_SYNC_KEY, timestamp);
    await AsyncStorage.setItem(BG_SYNC_LOG_KEY, `${timestamp}: ${message}`);
  } catch {}
}

// ── Registration ──────────────────────────────────────────────────

/**
 * Register the background health sync task.
 * Should be called after health permissions are granted.
 *
 * The task runs approximately every 15 minutes (minimum interval
 * enforced by the OS). On iOS, the actual interval may be longer
 * depending on system conditions.
 */
export async function registerBackgroundHealthSync(): Promise<boolean> {
  if (Platform.OS === "web") return false;

  try {
    const BackgroundTask = require("expo-background-task");
    const TaskManager = require("expo-task-manager");

    // Check if already registered
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_HEALTH_SYNC_TASK);
    if (isRegistered) {
      console.log("[BackgroundSync] Task already registered");
      await AsyncStorage.setItem(BG_SYNC_ENABLED_KEY, "true");
      return true;
    }

    await BackgroundTask.registerTaskAsync(BACKGROUND_HEALTH_SYNC_TASK, {
      minimumInterval: 15, // 15 minutes (minimum allowed)
    });

    await AsyncStorage.setItem(BG_SYNC_ENABLED_KEY, "true");
    console.log("[BackgroundSync] Task registered");
    return true;
  } catch (e) {
    console.warn("[BackgroundSync] Registration failed:", e);
    return false;
  }
}

/**
 * Unregister the background health sync task.
 */
export async function unregisterBackgroundHealthSync(): Promise<boolean> {
  if (Platform.OS === "web") return false;

  try {
    const BackgroundTask = require("expo-background-task");
    const TaskManager = require("expo-task-manager");

    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_HEALTH_SYNC_TASK);
    if (isRegistered) {
      await BackgroundTask.unregisterTaskAsync(BACKGROUND_HEALTH_SYNC_TASK);
    }

    await AsyncStorage.setItem(BG_SYNC_ENABLED_KEY, "false");
    console.log("[BackgroundSync] Task unregistered");
    return true;
  } catch (e) {
    console.warn("[BackgroundSync] Unregistration failed:", e);
    return false;
  }
}

/**
 * Get the current status of background sync.
 */
export async function getBackgroundSyncStatus(): Promise<BackgroundSyncStatus> {
  if (Platform.OS === "web") {
    return {
      isRegistered: false,
      isEnabled: false,
      lastSyncAt: null,
      lastSyncLog: null,
    };
  }

  try {
    const TaskManager = require("expo-task-manager");

    const [isRegistered, enabledRaw, lastSync, lastLog] = await Promise.all([
      TaskManager.isTaskRegisteredAsync(BACKGROUND_HEALTH_SYNC_TASK).catch(() => false),
      AsyncStorage.getItem(BG_SYNC_ENABLED_KEY),
      AsyncStorage.getItem(LAST_BG_SYNC_KEY),
      AsyncStorage.getItem(BG_SYNC_LOG_KEY),
    ]);

    return {
      isRegistered,
      isEnabled: enabledRaw === "true",
      lastSyncAt: lastSync,
      lastSyncLog: lastLog,
    };
  } catch {
    return {
      isRegistered: false,
      isEnabled: false,
      lastSyncAt: null,
      lastSyncLog: null,
    };
  }
}
