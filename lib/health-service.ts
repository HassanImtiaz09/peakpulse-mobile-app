/**
 * Unified Health Data Service
 *
 * Provides a single API for reading health data from:
 * - Apple HealthKit (iOS)
 * - Google Health Connect (Android)
 * - Simulated data (web / unsupported platforms)
 *
 * This service abstracts platform differences so the rest of the app
 * works with a consistent HealthData shape regardless of the data source.
 *
 * IMPORTANT: HealthKit and Health Connect require a custom dev client
 * built with `expo-dev-client`. They will NOT work in Expo Go or web.
 */

import { Platform } from "react-native";

// ── Types ──────────────────────────────────────────────────────────

export type HealthDataSource = "healthkit" | "healthconnect" | "simulated" | "none";

export type PermissionStatus = "granted" | "denied" | "not_determined" | "unavailable";

export interface HealthPermissionState {
  source: HealthDataSource;
  status: PermissionStatus;
  availableDataTypes: string[];
}

export interface HealthData {
  steps: number;
  heartRate: number; // bpm (most recent resting)
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
  bloodOxygen: number | null; // SpO2 percentage
  restingHeartRate: number | null;
  lastSyncedAt: string;
  dataSource: HealthDataSource;
}

export interface HealthSleepSample {
  startDate: string;
  endDate: string;
  value: string; // "ASLEEP", "INBED", "AWAKE", "DEEP", "REM", "LIGHT", "CORE"
}

// ── Constants ──────────────────────────────────────────────────────

const HEALTHKIT_DATA_TYPES = [
  "Steps",
  "HeartRate",
  "ActiveEnergyBurned",
  "BasalEnergyBurned",
  "SleepAnalysis",
  "HeartRateVariabilitySDNN",
  "VO2Max",
  "DistanceWalkingRunning",
  "AppleExerciseTime",
  "AppleStandHour",
  "OxygenSaturation",
  "RestingHeartRate",
];

const HEALTH_CONNECT_DATA_TYPES = [
  "Steps",
  "HeartRate",
  "ActiveCaloriesBurned",
  "BasalMetabolicRate",
  "SleepSession",
  "Distance",
  "ExerciseSession",
  "OxygenSaturation",
  "RestingHeartRate",
  "HeartRateVariabilityRmssd",
];

// ── Platform Detection ─────────────────────────────────────────────

/**
 * Determines which health data source is available on the current platform.
 * Returns "healthkit" on iOS, "healthconnect" on Android, "none" on web.
 */
export function getAvailableHealthSource(): HealthDataSource {
  if (Platform.OS === "ios") return "healthkit";
  if (Platform.OS === "android") return "healthconnect";
  return "none";
}

/**
 * Checks if native health APIs are available (i.e., not running on web).
 */
export function isHealthPlatformAvailable(): boolean {
  return Platform.OS === "ios" || Platform.OS === "android";
}

// ── HealthKit Integration (iOS) ────────────────────────────────────

let AppleHealthKit: any = null;

function getAppleHealthKit() {
  if (Platform.OS !== "ios") return null;
  if (AppleHealthKit) return AppleHealthKit;
  try {
    // Dynamic import to avoid crash on non-iOS platforms
    AppleHealthKit = require("react-native-health").default;
    return AppleHealthKit;
  } catch (e) {
    console.warn("[HealthService] react-native-health not available:", e);
    return null;
  }
}

/**
 * Request HealthKit permissions on iOS.
 * Returns the permission status after the request.
 */
export async function requestHealthKitPermissions(): Promise<PermissionStatus> {
  const hk = getAppleHealthKit();
  if (!hk) return "unavailable";

  const permissions = {
    permissions: {
      read: [
        hk.Constants.Permissions.Steps,
        hk.Constants.Permissions.HeartRate,
        hk.Constants.Permissions.ActiveEnergyBurned,
        hk.Constants.Permissions.BasalEnergyBurned,
        hk.Constants.Permissions.SleepAnalysis,
        hk.Constants.Permissions.HeartRateVariabilitySDNN,
        hk.Constants.Permissions.Vo2Max,
        hk.Constants.Permissions.DistanceWalkingRunning,
        hk.Constants.Permissions.AppleExerciseTime,
        hk.Constants.Permissions.AppleStandTime,
        hk.Constants.Permissions.OxygenSaturation,
        hk.Constants.Permissions.RestingHeartRate,
      ],
      write: [],
    },
  };

  return new Promise<PermissionStatus>((resolve) => {
    hk.initHealthKit(permissions, (error: any) => {
      if (error) {
        console.warn("[HealthService] HealthKit init error:", error);
        resolve("denied");
      } else {
        resolve("granted");
      }
    });
  });
}

/**
 * Fetch today's health data from HealthKit.
 */
export async function fetchHealthKitData(): Promise<HealthData | null> {
  const hk = getAppleHealthKit();
  if (!hk) return null;

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const options = {
    startDate: startOfDay.toISOString(),
    endDate: now.toISOString(),
  };

  try {
    const [steps, heartRate, activeCal, basalCal, sleep, hrv, vo2, distance, exercise, standHours, spo2, restingHR] =
      await Promise.all([
        healthKitQuery(hk, "getStepCount", options),
        healthKitQuery(hk, "getHeartRateSamples", { ...options, ascending: false, limit: 1 }),
        healthKitQuery(hk, "getActiveEnergyBurned", options),
        healthKitQuery(hk, "getBasalEnergyBurned", options),
        healthKitQuery(hk, "getSleepSamples", { startDate: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(), endDate: now.toISOString() }),
        healthKitQuery(hk, "getHeartRateVariabilitySamples", { ...options, ascending: false, limit: 1 }),
        healthKitQuery(hk, "getVo2MaxSamples", { ...options, ascending: false, limit: 1 }),
        healthKitQuery(hk, "getDistanceWalkingRunning", options),
        healthKitQuery(hk, "getAppleExerciseTime", options),
        healthKitQuery(hk, "getAppleStandTime", options),
        healthKitQuery(hk, "getOxygenSaturationSamples", { ...options, ascending: false, limit: 1 }),
        healthKitQuery(hk, "getRestingHeartRate", options),
      ]);

    const stepsValue = extractNumber(steps, "value", 0);
    const hrValue = extractFromSamples(heartRate, "value", 0);
    const activeCalValue = extractNumber(activeCal, "value", 0);
    const basalCalValue = extractNumber(basalCal, "value", 0);
    const sleepHrs = calculateSleepHours(sleep);
    const hrvValue = extractFromSamples(hrv, "value", null);
    const vo2Value = extractFromSamples(vo2, "value", null);
    const distanceValue = extractNumber(distance, "value", 0);
    const exerciseMin = extractNumber(exercise, "value", 0);
    const standHoursValue = extractNumber(standHours, "value", 0);
    const spo2Value = extractFromSamples(spo2, "value", null);
    const restingHRValue: number | null = restingHR != null && typeof restingHR === "object" && "value" in restingHR && typeof restingHR.value === "number" ? restingHR.value : null;

    return {
      steps: Math.round(stepsValue),
      heartRate: Math.round(hrValue),
      activeCalories: Math.round(activeCalValue),
      restingCalories: Math.round(basalCalValue),
      totalCaloriesBurnt: Math.round(activeCalValue + basalCalValue),
      sleepHours: parseFloat(sleepHrs.toFixed(1)),
      sleepQuality: deriveSleepQuality(sleepHrs),
      vo2Max: vo2Value ? Math.round(vo2Value) : null,
      hrv: hrvValue ? Math.round(hrvValue) : null,
      distance: parseFloat((distanceValue / 1000).toFixed(1)), // meters to km
      activeMinutes: Math.round(exerciseMin),
      standHours: Math.round(standHoursValue),
      bloodOxygen: spo2Value ? Math.round(spo2Value * 100) : null, // 0-1 to percentage
      restingHeartRate: restingHRValue ? Math.round(restingHRValue) : null,
      lastSyncedAt: now.toISOString(),
      dataSource: "healthkit",
    };
  } catch (e) {
    console.warn("[HealthService] HealthKit fetch error:", e);
    return null;
  }
}

// ── Health Connect Integration (Android) ───────────────────────────

let HealthConnect: any = null;

function getHealthConnect() {
  if (Platform.OS !== "android") return null;
  if (HealthConnect) return HealthConnect;
  try {
    HealthConnect = require("react-native-health-connect");
    return HealthConnect;
  } catch (e) {
    console.warn("[HealthService] react-native-health-connect not available:", e);
    return null;
  }
}

/**
 * Request Health Connect permissions on Android.
 */
export async function requestHealthConnectPermissions(): Promise<PermissionStatus> {
  const hc = getHealthConnect();
  if (!hc) return "unavailable";

  try {
    const isAvailable = await hc.getSdkStatus();
    if (isAvailable !== hc.SdkAvailabilityStatus?.SDK_AVAILABLE) {
      return "unavailable";
    }

    await hc.initialize();

    const granted = await hc.requestPermission([
      { accessType: "read", recordType: "Steps" },
      { accessType: "read", recordType: "HeartRate" },
      { accessType: "read", recordType: "ActiveCaloriesBurned" },
      { accessType: "read", recordType: "BasalMetabolicRate" },
      { accessType: "read", recordType: "SleepSession" },
      { accessType: "read", recordType: "Distance" },
      { accessType: "read", recordType: "ExerciseSession" },
      { accessType: "read", recordType: "OxygenSaturation" },
      { accessType: "read", recordType: "RestingHeartRate" },
      { accessType: "read", recordType: "HeartRateVariabilityRmssd" },
    ]);

    return granted && granted.length > 0 ? "granted" : "denied";
  } catch (e) {
    console.warn("[HealthService] Health Connect permission error:", e);
    return "denied";
  }
}

/**
 * Fetch today's health data from Health Connect.
 */
export async function fetchHealthConnectData(): Promise<HealthData | null> {
  const hc = getHealthConnect();
  if (!hc) return null;

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const timeRangeFilter = {
    operator: "between",
    startTime: startOfDay.toISOString(),
    endTime: now.toISOString(),
  };

  try {
    await hc.initialize();

    const [stepsResult, hrResult, activeCalResult, sleepResult, distanceResult, exerciseResult, spo2Result, restingHRResult, hrvResult] =
      await Promise.allSettled([
        hc.readRecords("Steps", { timeRangeFilter }),
        hc.readRecords("HeartRate", { timeRangeFilter }),
        hc.readRecords("ActiveCaloriesBurned", { timeRangeFilter }),
        hc.readRecords("SleepSession", {
          timeRangeFilter: {
            operator: "between",
            startTime: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
            endTime: now.toISOString(),
          },
        }),
        hc.readRecords("Distance", { timeRangeFilter }),
        hc.readRecords("ExerciseSession", { timeRangeFilter }),
        hc.readRecords("OxygenSaturation", { timeRangeFilter }),
        hc.readRecords("RestingHeartRate", { timeRangeFilter }),
        hc.readRecords("HeartRateVariabilityRmssd", { timeRangeFilter }),
      ]);

    // Aggregate steps
    const steps = sumRecordValues(stepsResult, "count");

    // Latest heart rate
    const hrSamples = getSettledRecords(hrResult);
    const latestHR = hrSamples.length > 0
      ? hrSamples[hrSamples.length - 1]?.samples?.[0]?.beatsPerMinute ?? 0
      : 0;

    // Active calories
    const activeCal = sumRecordValues(activeCalResult, "energy.inKilocalories");

    // Sleep duration
    const sleepRecords = getSettledRecords(sleepResult);
    const sleepHrs = sleepRecords.reduce((total: number, record: any) => {
      const start = new Date(record.startTime).getTime();
      const end = new Date(record.endTime).getTime();
      return total + (end - start) / (1000 * 60 * 60);
    }, 0);

    // Distance
    const distanceM = sumRecordValues(distanceResult, "distance.inMeters");

    // Exercise minutes
    const exerciseRecords = getSettledRecords(exerciseResult);
    const exerciseMin = exerciseRecords.reduce((total: number, record: any) => {
      const start = new Date(record.startTime).getTime();
      const end = new Date(record.endTime).getTime();
      return total + (end - start) / (1000 * 60);
    }, 0);

    // SpO2
    const spo2Records = getSettledRecords(spo2Result);
    const spo2Value = spo2Records.length > 0
      ? spo2Records[spo2Records.length - 1]?.percentage ?? null
      : null;

    // Resting HR
    const restingHRRecords = getSettledRecords(restingHRResult);
    const restingHRValue = restingHRRecords.length > 0
      ? restingHRRecords[restingHRRecords.length - 1]?.beatsPerMinute ?? null
      : null;

    // HRV
    const hrvRecords = getSettledRecords(hrvResult);
    const hrvValue = hrvRecords.length > 0
      ? hrvRecords[hrvRecords.length - 1]?.heartRateVariabilityMillis ?? null
      : null;

    // Estimate resting calories (BMR ~1500 scaled by time of day)
    const hoursElapsed = (now.getTime() - startOfDay.getTime()) / (1000 * 60 * 60);
    const estimatedRestingCal = Math.round((1500 / 24) * hoursElapsed);

    return {
      steps: Math.round(steps),
      heartRate: Math.round(latestHR),
      activeCalories: Math.round(activeCal),
      restingCalories: estimatedRestingCal,
      totalCaloriesBurnt: Math.round(activeCal) + estimatedRestingCal,
      sleepHours: parseFloat(sleepHrs.toFixed(1)),
      sleepQuality: deriveSleepQuality(sleepHrs),
      vo2Max: null, // Not available in Health Connect basic API
      hrv: hrvValue ? Math.round(hrvValue) : null,
      distance: parseFloat((distanceM / 1000).toFixed(1)),
      activeMinutes: Math.round(exerciseMin),
      standHours: 0, // Not tracked by Health Connect
      bloodOxygen: spo2Value ? Math.round(spo2Value) : null,
      restingHeartRate: restingHRValue ? Math.round(restingHRValue) : null,
      lastSyncedAt: now.toISOString(),
      dataSource: "healthconnect",
    };
  } catch (e) {
    console.warn("[HealthService] Health Connect fetch error:", e);
    return null;
  }
}

// ── Unified API ────────────────────────────────────────────────────

/**
 * Request health data permissions for the current platform.
 */
export async function requestHealthPermissions(): Promise<HealthPermissionState> {
  const source = getAvailableHealthSource();

  if (source === "healthkit") {
    const status = await requestHealthKitPermissions();
    return {
      source,
      status,
      availableDataTypes: status === "granted" ? HEALTHKIT_DATA_TYPES : [],
    };
  }

  if (source === "healthconnect") {
    const status = await requestHealthConnectPermissions();
    return {
      source,
      status,
      availableDataTypes: status === "granted" ? HEALTH_CONNECT_DATA_TYPES : [],
    };
  }

  return {
    source: "none",
    status: "unavailable",
    availableDataTypes: [],
  };
}

/**
 * Fetch today's health data from the appropriate platform.
 * Returns null if no data is available or permissions are not granted.
 */
export async function fetchHealthData(): Promise<HealthData | null> {
  const source = getAvailableHealthSource();

  if (source === "healthkit") {
    return fetchHealthKitData();
  }

  if (source === "healthconnect") {
    return fetchHealthConnectData();
  }

  return null;
}

/**
 * Get the display name for the current health data source.
 */
export function getHealthSourceDisplayName(): string {
  const source = getAvailableHealthSource();
  switch (source) {
    case "healthkit":
      return "Apple Health";
    case "healthconnect":
      return "Health Connect";
    default:
      return "Not Available";
  }
}

/**
 * Get available data types for the current platform.
 */
export function getAvailableDataTypes(): string[] {
  const source = getAvailableHealthSource();
  if (source === "healthkit") return HEALTHKIT_DATA_TYPES;
  if (source === "healthconnect") return HEALTH_CONNECT_DATA_TYPES;
  return [];
}

// ── Helpers ────────────────────────────────────────────────────────

function healthKitQuery(hk: any, method: string, options: any): Promise<any> {
  return new Promise((resolve) => {
    try {
      if (typeof hk[method] === "function") {
        hk[method](options, (err: any, results: any) => {
          if (err) {
            console.warn(`[HealthKit] ${method} error:`, err);
            resolve(null);
          } else {
            resolve(results);
          }
        });
      } else {
        resolve(null);
      }
    } catch {
      resolve(null);
    }
  });
}

function extractNumber(result: any, key: string, fallback: number): number;
function extractNumber(result: any, key: string, fallback: null): number | null;
function extractNumber(result: any, key: string, fallback: number | null): number | null {
  if (result == null) return fallback;
  if (typeof result === "number") return result;
  if (typeof result === "object" && key in result) {
    const val = result[key];
    return typeof val === "number" ? val : fallback;
  }
  return fallback;
}

function extractFromSamples(result: any, key: string, fallback: number): number;
function extractFromSamples(result: any, key: string, fallback: null): number | null;
function extractFromSamples(result: any, key: string, fallback: number | null): number | null {
  if (Array.isArray(result) && result.length > 0) {
    const val = result[0]?.[key];
    return typeof val === "number" ? val : fallback;
  }
  return fallback;
}

function calculateSleepHours(sleepSamples: any): number {
  if (!Array.isArray(sleepSamples) || sleepSamples.length === 0) return 0;

  let totalMs = 0;
  for (const sample of sleepSamples) {
    // Only count actual sleep (not "INBED" or "AWAKE")
    const value = sample?.value;
    if (value === "ASLEEP" || value === "DEEP" || value === "REM" || value === "LIGHT" || value === "CORE") {
      const start = new Date(sample.startDate).getTime();
      const end = new Date(sample.endDate).getTime();
      totalMs += end - start;
    }
  }
  return totalMs / (1000 * 60 * 60);
}

function deriveSleepQuality(hours: number): "poor" | "fair" | "good" | "excellent" {
  if (hours >= 8) return "excellent";
  if (hours >= 7) return "good";
  if (hours >= 6) return "fair";
  return "poor";
}

function getSettledRecords(result: PromiseSettledResult<any>): any[] {
  if (result.status === "fulfilled") {
    const records = result.value?.records ?? result.value;
    return Array.isArray(records) ? records : [];
  }
  return [];
}

function sumRecordValues(result: PromiseSettledResult<any>, path: string): number {
  const records = getSettledRecords(result);
  return records.reduce((sum: number, record: any) => {
    const value = getNestedValue(record, path);
    return sum + (typeof value === "number" ? value : 0);
  }, 0);
}

function getNestedValue(obj: any, path: string): any {
  return path.split(".").reduce((current, key) => current?.[key], obj);
}

// ── Simulated Data (for web preview and testing) ───────────────────

/**
 * Generate realistic simulated health data for web preview.
 * This is used when native health APIs are not available.
 */
export function generateSimulatedHealthData(deviceName: string): HealthData {
  const hour = new Date().getHours();
  const baseSteps = Math.floor(Math.random() * 3000) + 2000;
  const timeMultiplier = hour < 8 ? 0.3 : hour < 12 ? 0.6 : hour < 18 ? 0.85 : 1.0;
  const steps = Math.round(baseSteps * timeMultiplier + Math.random() * 2000);

  const heartRate = Math.floor(Math.random() * 20) + 65;
  const activeCalories = Math.round(steps * 0.04 + Math.random() * 100);
  const restingCalories = Math.round(1400 + Math.random() * 400);
  const sleepHours = parseFloat((6 + Math.random() * 2.5).toFixed(1));

  return {
    steps,
    heartRate,
    activeCalories,
    restingCalories,
    totalCaloriesBurnt: activeCalories + restingCalories,
    sleepHours,
    sleepQuality: deriveSleepQuality(sleepHours),
    vo2Max: Math.round(35 + Math.random() * 15),
    hrv: Math.round(30 + Math.random() * 40),
    distance: parseFloat((steps * 0.0008).toFixed(1)),
    activeMinutes: Math.round(steps / 100 + Math.random() * 20),
    standHours: Math.min(12, Math.floor(hour * 0.7)),
    bloodOxygen: Math.round(95 + Math.random() * 4),
    restingHeartRate: Math.floor(Math.random() * 15) + 55,
    lastSyncedAt: new Date().toISOString(),
    dataSource: "simulated",
  };
}
