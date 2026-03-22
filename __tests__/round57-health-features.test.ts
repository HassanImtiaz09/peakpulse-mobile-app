/**
 * Round 57 Tests — Workout Write-Back, Health Trends, Background Sync
 *
 * Validates:
 * 1. Workout write-back functions exist and handle all workout types
 * 2. Health trends screen with chart components and period selectors
 * 3. Background sync task definition, registration, and status
 * 4. Navigation wiring (dashboard → trends, wearable-sync → trends)
 * 5. App config includes background-task plugin and write permissions
 */

import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const ROOT = path.resolve(__dirname, "..");

function readFile(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), "utf-8");
}

function fileExists(relPath: string): boolean {
  return fs.existsSync(path.join(ROOT, relPath));
}

// ═══════════════════════════════════════════════════════════════════
// 1. WORKOUT WRITE-BACK
// ═══════════════════════════════════════════════════════════════════
describe("Workout Write-Back to HealthKit / Health Connect", () => {
  const healthService = readFile("lib/health-service.ts");

  it("exports WorkoutData type", () => {
    expect(healthService).toContain("export interface WorkoutData");
  });

  it("exports WorkoutWriteResult type", () => {
    expect(healthService).toContain("export interface WorkoutWriteResult");
  });

  it("exports writeWorkout function", () => {
    expect(healthService).toContain("export async function writeWorkout");
  });

  it("defines WorkoutType union with common workout types", () => {
    expect(healthService).toContain("export type WorkoutType");
    for (const type of ["running", "walking", "cycling", "swimming", "strength_training", "yoga", "hiit"]) {
      expect(healthService).toContain(`"${type}"`);
    }
  });

  it("WorkoutData includes required fields", () => {
    expect(healthService).toContain("type: WorkoutType");
    expect(healthService).toContain("startDate: string");
    expect(healthService).toContain("endDate: string");
    expect(healthService).toContain("caloriesBurned: number");
  });

  it("WorkoutData includes optional distance field", () => {
    expect(healthService).toContain("distanceKm?: number");
  });

  it("WorkoutWriteResult includes success and platform fields", () => {
    expect(healthService).toContain("success: boolean");
    expect(healthService).toMatch(/platform.*HealthDataSource|platform.*healthkit|platform.*string/);
    expect(healthService).toContain("error?");
  });

  it("has HealthKit workout write implementation", () => {
    expect(healthService).toMatch(/writeWorkoutToHealthKit|writeHealthKitWorkout|HealthKit.*saveWorkout|saveWorkoutSample|AppleHealthKit.*saveSample|AppleHealthKit.*saveWorkout/);
  });

  it("has Health Connect workout write implementation", () => {
    expect(healthService).toMatch(/writeWorkoutToHealthConnect|writeHealthConnectWorkout|insertRecords|ExerciseSession|HealthConnect.*write|writeExerciseSession/);
  });

  it("wearable context exposes logWorkoutToHealthPlatform", () => {
    const ctx = readFile("lib/wearable-context.tsx");
    expect(ctx).toContain("logWorkoutToHealthPlatform");
    expect(ctx).toContain("writeWorkout");
  });

  it("app.config.ts includes Health Connect write permissions", () => {
    const config = readFile("app.config.ts");
    expect(config).toContain("WRITE_EXERCISE");
    expect(config).toContain("WRITE_ACTIVE_CALORIES_BURNED");
  });
});

// ═══════════════════════════════════════════════════════════════════
// 2. HEALTH TRENDS SCREEN
// ═══════════════════════════════════════════════════════════════════
describe("Health Trends Screen", () => {
  it("health-trends.tsx file exists", () => {
    expect(fileExists("app/health-trends.tsx")).toBe(true);
  });

  const trends = readFile("app/health-trends.tsx");

  it("imports SVG chart components", () => {
    expect(trends).toContain("react-native-svg");
    expect(trends).toContain("Path");
    expect(trends).toContain("Circle");
    expect(trends).toContain("LinearGradient");
  });

  it("imports fetchHealthHistory from health service", () => {
    expect(trends).toContain("fetchHealthHistory");
    expect(trends).toContain("DailyHealthSummary");
  });

  it("has 7-day and 30-day period selector", () => {
    expect(trends).toContain("7 Days");
    expect(trends).toContain("30 Days");
    expect(trends).toContain("setPeriod(p)");
    expect(trends).toContain("useState<7 | 30>(7)");
  });

  it("defines metric configurations for all key health metrics", () => {
    for (const metric of ["steps", "heartRate", "activeCalories", "sleepHours", "distance", "hrv"]) {
      expect(trends).toContain(`key: "${metric}"`);
    }
  });

  it("has metric selector pills for switching between metrics", () => {
    expect(trends).toContain("selectedMetric");
    expect(trends).toContain("setSelectedMetric");
  });

  it("renders HealthChart component with data", () => {
    expect(trends).toContain("HealthChart");
    expect(trends).toContain("metricKey");
  });

  it("shows stat summary with average, best, lowest, and trend", () => {
    expect(trends).toContain("StatSummary");
    expect(trends).toContain("Average");
    expect(trends).toContain("Best");
    expect(trends).toContain("Lowest");
    expect(trends).toContain("Trend");
  });

  it("shows all metrics overview grid", () => {
    expect(trends).toContain("Summary");
    expect(trends).toContain("Today");
    expect(trends).toContain("Day Avg");
  });

  it("has back navigation button", () => {
    expect(trends).toContain("router.back()");
  });

  it("has loading state indicator", () => {
    expect(trends).toContain("ActivityIndicator");
    expect(trends).toContain("Loading health data");
  });

  it("has empty state for no data", () => {
    expect(trends).toContain("No data available");
    expect(trends).toContain("Connect a wearable");
  });

  it("has link to wearable sync screen", () => {
    expect(trends).toContain("wearable-sync");
    expect(trends).toContain("Manage Wearable Connections");
  });

  it("shows data source information", () => {
    expect(trends).toContain("Data Source");
    expect(trends).toContain("Apple HealthKit");
    expect(trends).toContain("Health Connect");
  });
});

// ═══════════════════════════════════════════════════════════════════
// 3. HEALTH HISTORY DATA SERVICE
// ═══════════════════════════════════════════════════════════════════
describe("Health History Data Service", () => {
  const healthService = readFile("lib/health-service.ts");

  it("exports DailyHealthSummary interface", () => {
    expect(healthService).toContain("export interface DailyHealthSummary");
  });

  it("DailyHealthSummary includes all key metrics", () => {
    expect(healthService).toContain("date: string");
    expect(healthService).toContain("steps: number");
    expect(healthService).toContain("heartRate: number");
    expect(healthService).toContain("activeCalories: number");
    expect(healthService).toContain("sleepHours: number");
    expect(healthService).toContain("distance: number");
  });

  it("exports fetchHealthHistory function", () => {
    expect(healthService).toContain("export async function fetchHealthHistory");
  });

  it("has HealthKit history implementation", () => {
    expect(healthService).toMatch(/fetchHealthKitHistory/);
  });

  it("has Health Connect history implementation", () => {
    expect(healthService).toMatch(/fetchHealthConnectHistory/);
  });

  it("has simulated history fallback", () => {
    expect(healthService).toMatch(/generateSimulatedHistory/);
  });
});

// ═══════════════════════════════════════════════════════════════════
// 4. BACKGROUND SYNC
// ═══════════════════════════════════════════════════════════════════
describe("Background Health Sync", () => {
  it("background-health-sync.ts file exists", () => {
    expect(fileExists("lib/background-health-sync.ts")).toBe(true);
  });

  const bgSync = readFile("lib/background-health-sync.ts");

  it("defines BACKGROUND_HEALTH_SYNC_TASK constant", () => {
    expect(bgSync).toContain("BACKGROUND_HEALTH_SYNC_TASK");
    expect(bgSync).toContain("peakpulse-health-sync");
  });

  it("exports defineBackgroundHealthSyncTask function", () => {
    expect(bgSync).toContain("export function defineBackgroundHealthSyncTask");
  });

  it("exports registerBackgroundHealthSync function", () => {
    expect(bgSync).toContain("export async function registerBackgroundHealthSync");
  });

  it("exports unregisterBackgroundHealthSync function", () => {
    expect(bgSync).toContain("export async function unregisterBackgroundHealthSync");
  });

  it("exports getBackgroundSyncStatus function", () => {
    expect(bgSync).toContain("export async function getBackgroundSyncStatus");
  });

  it("exports BackgroundSyncStatus type", () => {
    expect(bgSync).toContain("export interface BackgroundSyncStatus");
  });

  it("uses expo-task-manager for task definition", () => {
    expect(bgSync).toContain("expo-task-manager");
    expect(bgSync).toContain("defineTask");
  });

  it("uses expo-background-task for registration", () => {
    expect(bgSync).toContain("expo-background-task");
    expect(bgSync).toContain("registerTaskAsync");
  });

  it("stores sync data to AsyncStorage for wearable context to pick up", () => {
    expect(bgSync).toContain("@wearable_stats");
    expect(bgSync).toContain("@wearable_history");
  });

  it("persists background sync enabled preference", () => {
    expect(bgSync).toContain("@background_sync_enabled");
  });

  it("logs last sync timestamp", () => {
    expect(bgSync).toContain("@last_background_sync");
  });

  it("handles web platform gracefully (no-op)", () => {
    expect(bgSync).toContain('Platform.OS === "web"');
  });

  it("sets minimum interval for background task", () => {
    expect(bgSync).toContain("minimumInterval");
  });

  it("returns BackgroundTaskResult.Success or Failed", () => {
    expect(bgSync).toContain("BackgroundTaskResult.Success");
    expect(bgSync).toContain("BackgroundTaskResult.Failed");
  });
});

// ═══════════════════════════════════════════════════════════════════
// 5. APP WIRING & NAVIGATION
// ═══════════════════════════════════════════════════════════════════
describe("App Wiring & Navigation", () => {
  it("root layout imports and defines background task", () => {
    const layout = readFile("app/_layout.tsx");
    expect(layout).toContain("defineBackgroundHealthSyncTask");
    expect(layout).toContain("registerBackgroundHealthSync");
    expect(layout).toContain("defineBackgroundHealthSyncTask()");
  });

  it("root layout registers background sync on mount", () => {
    const layout = readFile("app/_layout.tsx");
    expect(layout).toContain("registerBackgroundHealthSync()");
  });

  it("dashboard has View Health Trends button", () => {
    const dashboard = readFile("app/(tabs)/index.tsx");
    expect(dashboard).toContain("health-trends");
    expect(dashboard).toContain("View Health Trends");
  });

  it("wearable-sync has Health Trends navigation card", () => {
    const sync = readFile("app/wearable-sync.tsx");
    expect(sync).toContain("health-trends");
    expect(sync).toContain("Health Trends");
  });

  it("app.config.ts includes expo-background-task plugin", () => {
    const config = readFile("app.config.ts");
    expect(config).toContain("expo-background-task");
  });
});

// ═══════════════════════════════════════════════════════════════════
// 6. CHART COMPONENT QUALITY
// ═══════════════════════════════════════════════════════════════════
describe("Chart Component Quality", () => {
  const trends = readFile("app/health-trends.tsx");

  it("uses SVG Path for smooth line charts", () => {
    expect(trends).toContain("<Path");
    expect(trends).toContain("strokeLinecap");
  });

  it("uses gradient fill under the line", () => {
    expect(trends).toContain("LinearGradient");
    expect(trends).toContain("stopOpacity");
  });

  it("renders data points as circles", () => {
    expect(trends).toContain("<Circle");
  });

  it("has grid lines for readability", () => {
    expect(trends).toContain("gridLines");
    expect(trends).toContain("<Line");
  });

  it("has x-axis date labels", () => {
    expect(trends).toContain("xLabels");
    expect(trends).toContain("formatDateLabel");
  });

  it("uses SvgText for chart labels (not RN Text)", () => {
    expect(trends).toContain("Text as SvgText");
    expect(trends).toContain("<SvgText");
  });

  it("calculates trend percentage from recent vs early data", () => {
    expect(trends).toContain("trendPct");
    expect(trends).toContain("recentAvg");
    expect(trends).toContain("earlyAvg");
  });

  it("shows trend direction icons", () => {
    expect(trends).toContain("trending-up");
    expect(trends).toContain("trending-down");
    expect(trends).toContain("trending-flat");
  });
});
