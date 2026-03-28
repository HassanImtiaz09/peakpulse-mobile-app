import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const APP_DIR = path.join(__dirname, "..");
const healthServiceSrc = fs.readFileSync(path.join(APP_DIR, "lib/health-service.ts"), "utf-8");
const wearableContextSrc = fs.readFileSync(path.join(APP_DIR, "lib/wearable-context.tsx"), "utf-8");
const wearableSyncSrc = fs.readFileSync(path.join(APP_DIR, "app/wearable-sync.tsx"), "utf-8");
const appConfigSrc = fs.readFileSync(path.join(APP_DIR, "app.config.ts"), "utf-8");

// ── Health Service Layer ──────────────────────────────────────────

describe("Round 56: Health Service — Platform Detection", () => {
  it("exports getAvailableHealthSource function", () => {
    expect(healthServiceSrc).toContain("export function getAvailableHealthSource(): HealthDataSource");
  });

  it("detects iOS as healthkit", () => {
    expect(healthServiceSrc).toContain('if (Platform.OS === "ios") return "healthkit"');
  });

  it("detects Android as healthconnect", () => {
    expect(healthServiceSrc).toContain('if (Platform.OS === "android") return "healthconnect"');
  });

  it("returns none for web", () => {
    expect(healthServiceSrc).toContain('return "none"');
  });

  it("exports isHealthPlatformAvailable function", () => {
    expect(healthServiceSrc).toContain("export function isHealthPlatformAvailable(): boolean");
  });
});

describe("Round 56: Health Service — Type Definitions", () => {
  it("defines HealthDataSource type with all sources", () => {
    expect(healthServiceSrc).toContain('export type HealthDataSource = "healthkit" | "healthconnect" | "simulated" | "none"');
  });

  it("defines PermissionStatus type", () => {
    expect(healthServiceSrc).toContain('export type PermissionStatus = "granted" | "denied" | "not_determined" | "unavailable"');
  });

  it("defines HealthData interface with all required fields", () => {
    expect(healthServiceSrc).toContain("export interface HealthData");
    expect(healthServiceSrc).toContain("steps: number");
    expect(healthServiceSrc).toContain("heartRate: number");
    expect(healthServiceSrc).toContain("activeCalories: number");
    expect(healthServiceSrc).toContain("restingCalories: number");
    expect(healthServiceSrc).toContain("totalCaloriesBurnt: number");
    expect(healthServiceSrc).toContain("sleepHours: number");
    expect(healthServiceSrc).toContain("vo2Max: number | null");
    expect(healthServiceSrc).toContain("hrv: number | null");
    expect(healthServiceSrc).toContain("distance: number");
    expect(healthServiceSrc).toContain("bloodOxygen: number | null");
    expect(healthServiceSrc).toContain("restingHeartRate: number | null");
    expect(healthServiceSrc).toContain("dataSource: HealthDataSource");
  });

  it("defines HealthPermissionState interface", () => {
    expect(healthServiceSrc).toContain("export interface HealthPermissionState");
    expect(healthServiceSrc).toContain("source: HealthDataSource");
    expect(healthServiceSrc).toContain("status: PermissionStatus");
    expect(healthServiceSrc).toContain("availableDataTypes: string[]");
  });
});

describe("Round 56: Health Service — HealthKit Integration (iOS)", () => {
  it("dynamically imports react-native-health", () => {
    expect(healthServiceSrc).toContain('require("react-native-health")');
  });

  it("only loads HealthKit on iOS", () => {
    expect(healthServiceSrc).toContain('if (Platform.OS !== "ios") return null');
  });

  it("requests HealthKit permissions with correct data types", () => {
    expect(healthServiceSrc).toContain("requestHealthKitPermissions");
    expect(healthServiceSrc).toContain("hk.Constants.Permissions.Steps");
    expect(healthServiceSrc).toContain("hk.Constants.Permissions.HeartRate");
    expect(healthServiceSrc).toContain("hk.Constants.Permissions.ActiveEnergyBurned");
    expect(healthServiceSrc).toContain("hk.Constants.Permissions.BasalEnergyBurned");
    expect(healthServiceSrc).toContain("hk.Constants.Permissions.SleepAnalysis");
    expect(healthServiceSrc).toContain("hk.Constants.Permissions.HeartRateVariabilitySDNN");
    expect(healthServiceSrc).toContain("hk.Constants.Permissions.Vo2Max");
    expect(healthServiceSrc).toContain("hk.Constants.Permissions.DistanceWalkingRunning");
    expect(healthServiceSrc).toContain("hk.Constants.Permissions.OxygenSaturation");
    expect(healthServiceSrc).toContain("hk.Constants.Permissions.RestingHeartRate");
  });

  it("initializes HealthKit with initHealthKit", () => {
    expect(healthServiceSrc).toContain("hk.initHealthKit(permissions");
  });

  it("fetches all required HealthKit data types", () => {
    expect(healthServiceSrc).toContain("getStepCount");
    expect(healthServiceSrc).toContain("getHeartRateSamples");
    expect(healthServiceSrc).toContain("getActiveEnergyBurned");
    expect(healthServiceSrc).toContain("getBasalEnergyBurned");
    expect(healthServiceSrc).toContain("getSleepSamples");
    expect(healthServiceSrc).toContain("getHeartRateVariabilitySamples");
    expect(healthServiceSrc).toContain("getVo2MaxSamples");
    expect(healthServiceSrc).toContain("getDistanceWalkingRunning");
    expect(healthServiceSrc).toContain("getAppleExerciseTime");
    expect(healthServiceSrc).toContain("getOxygenSaturationSamples");
    expect(healthServiceSrc).toContain("getRestingHeartRate");
  });

  it("sets dataSource to healthkit in returned data", () => {
    expect(healthServiceSrc).toContain('dataSource: "healthkit"');
  });
});

describe("Round 56: Health Service — Health Connect Integration (Android)", () => {
  it("dynamically imports react-native-health-connect", () => {
    expect(healthServiceSrc).toContain('require("react-native-health-connect")');
  });

  it("only loads Health Connect on Android", () => {
    expect(healthServiceSrc).toContain('if (Platform.OS !== "android") return null');
  });

  it("checks SDK availability before requesting permissions", () => {
    expect(healthServiceSrc).toContain("hc.getSdkStatus()");
    expect(healthServiceSrc).toContain("SDK_AVAILABLE");
  });

  it("initializes Health Connect", () => {
    expect(healthServiceSrc).toContain("hc.initialize()");
  });

  it("requests Health Connect permissions for all data types", () => {
    expect(healthServiceSrc).toContain('recordType: "Steps"');
    expect(healthServiceSrc).toContain('recordType: "HeartRate"');
    expect(healthServiceSrc).toContain('recordType: "ActiveCaloriesBurned"');
    expect(healthServiceSrc).toContain('recordType: "BasalMetabolicRate"');
    expect(healthServiceSrc).toContain('recordType: "SleepSession"');
    expect(healthServiceSrc).toContain('recordType: "Distance"');
    expect(healthServiceSrc).toContain('recordType: "ExerciseSession"');
    expect(healthServiceSrc).toContain('recordType: "OxygenSaturation"');
    expect(healthServiceSrc).toContain('recordType: "RestingHeartRate"');
    expect(healthServiceSrc).toContain('recordType: "HeartRateVariabilityRmssd"');
  });

  it("reads Health Connect records with time range filter", () => {
    expect(healthServiceSrc).toContain("hc.readRecords");
    expect(healthServiceSrc).toContain("timeRangeFilter");
  });

  it("sets dataSource to healthconnect in returned data", () => {
    expect(healthServiceSrc).toContain('dataSource: "healthconnect"');
  });
});

describe("Round 56: Health Service — Unified API", () => {
  it("exports requestHealthPermissions unified function", () => {
    expect(healthServiceSrc).toContain("export async function requestHealthPermissions(): Promise<HealthPermissionState>");
  });

  it("exports fetchHealthData unified function", () => {
    expect(healthServiceSrc).toContain("export async function fetchHealthData(): Promise<HealthData | null>");
  });

  it("routes to correct platform in requestHealthPermissions", () => {
    expect(healthServiceSrc).toContain("requestHealthKitPermissions()");
    expect(healthServiceSrc).toContain("requestHealthConnectPermissions()");
  });

  it("routes to correct platform in fetchHealthData", () => {
    expect(healthServiceSrc).toContain("fetchHealthKitData()");
    expect(healthServiceSrc).toContain("fetchHealthConnectData()");
  });
});

describe("Round 56: Health Service — Simulated Data Fallback", () => {
  it("exports generateSimulatedHealthData function", () => {
    expect(healthServiceSrc).toContain("export function generateSimulatedHealthData(deviceName: string): HealthData");
  });

  it("generates realistic step counts", () => {
    expect(healthServiceSrc).toContain("Math.floor(Math.random() * 3000) + 2000");
  });

  it("generates realistic heart rate", () => {
    expect(healthServiceSrc).toContain("Math.floor(Math.random() * 20) + 65");
  });

  it("sets dataSource to simulated", () => {
    expect(healthServiceSrc).toContain('dataSource: "simulated"');
  });

  it("includes bloodOxygen and restingHeartRate in simulated data", () => {
    expect(healthServiceSrc).toContain("bloodOxygen: Math.round(95 + Math.random() * 4)");
    expect(healthServiceSrc).toContain("restingHeartRate: Math.floor(Math.random() * 15) + 55");
  });
});

describe("Round 56: Health Service — Sleep Calculation", () => {
  it("calculates sleep hours from HealthKit sleep samples", () => {
    expect(healthServiceSrc).toContain("function calculateSleepHours(sleepSamples: any): number");
  });

  it("only counts actual sleep states (not INBED or AWAKE)", () => {
    expect(healthServiceSrc).toContain('"ASLEEP"');
    expect(healthServiceSrc).toContain('"DEEP"');
    expect(healthServiceSrc).toContain('"REM"');
    expect(healthServiceSrc).toContain('"LIGHT"');
    expect(healthServiceSrc).toContain('"CORE"');
  });

  it("derives sleep quality from hours", () => {
    expect(healthServiceSrc).toContain("function deriveSleepQuality(hours: number)");
    expect(healthServiceSrc).toContain('if (hours >= 8) return "excellent"');
    expect(healthServiceSrc).toContain('if (hours >= 7) return "good"');
    expect(healthServiceSrc).toContain('if (hours >= 6) return "fair"');
  });
});

// ── Wearable Context Refactor ─────────────────────────────────────

describe("Round 56: Wearable Context — New Fields", () => {
  it("WearableStats includes bloodOxygen field", () => {
    expect(wearableContextSrc).toContain("bloodOxygen: number | null");
  });

  it("WearableStats includes restingHeartRate field", () => {
    expect(wearableContextSrc).toContain("restingHeartRate: number | null");
  });

  it("WearableStats includes dataSource field", () => {
    expect(wearableContextSrc).toContain("dataSource: HealthDataSource");
  });

  it("DEFAULT_STATS initializes new fields", () => {
    expect(wearableContextSrc).toContain("bloodOxygen: null");
    expect(wearableContextSrc).toContain("restingHeartRate: null");
    expect(wearableContextSrc).toContain('dataSource: "none"');
  });
});

describe("Round 56: Wearable Context — Health Platform Integration", () => {
  it("imports health service functions", () => {
    expect(wearableContextSrc).toContain('from "@/lib/health-service"');
    expect(wearableContextSrc).toContain("fetchHealthData");
    expect(wearableContextSrc).toContain("requestHealthPermissions");
    expect(wearableContextSrc).toContain("generateSimulatedHealthData");
  });

  it("exposes requestPermissions method", () => {
    expect(wearableContextSrc).toContain("requestPermissions: () => Promise<HealthPermissionState>");
  });

  it("exposes syncFromHealthPlatform method", () => {
    expect(wearableContextSrc).toContain("syncFromHealthPlatform: () => Promise<boolean>");
  });

  it("exposes healthSource state", () => {
    expect(wearableContextSrc).toContain("healthSource: HealthDataSource");
  });

  it("exposes permissionStatus state", () => {
    expect(wearableContextSrc).toContain("permissionStatus: PermissionStatus");
  });

  it("exposes healthSourceName for display", () => {
    expect(wearableContextSrc).toContain("healthSourceName: string");
  });

  it("exposes isHealthPlatformAvailable flag", () => {
    expect(wearableContextSrc).toContain("isHealthPlatformAvailable: boolean");
  });

  it("tracks syncing state", () => {
    expect(wearableContextSrc).toContain("syncing: boolean");
    expect(wearableContextSrc).toContain("const [syncing, setSyncing] = useState(false)");
  });
});

describe("Round 56: Wearable Context — Auto-Sync on Foreground", () => {
  it("listens to AppState changes", () => {
    expect(wearableContextSrc).toContain("AppState.addEventListener");
  });

  it("syncs when app comes to foreground", () => {
    expect(wearableContextSrc).toContain('nextAppState === "active"');
    expect(wearableContextSrc).toContain('permissionStatus === "granted"');
    expect(wearableContextSrc).toContain("syncFromHealthPlatform()");
  });

  it("skips auto-sync on web", () => {
    expect(wearableContextSrc).toContain('if (Platform.OS === "web") return');
  });
});

describe("Round 56: Wearable Context — Permission Persistence", () => {
  it("stores permission status in AsyncStorage", () => {
    expect(wearableContextSrc).toContain("HEALTH_PERMISSION_KEY");
    expect(wearableContextSrc).toContain("AsyncStorage.setItem(HEALTH_PERMISSION_KEY");
  });

  it("loads permission status on startup", () => {
    expect(wearableContextSrc).toContain("AsyncStorage.getItem(HEALTH_PERMISSION_KEY)");
  });

  it("auto-syncs if permission was previously granted", () => {
    expect(wearableContextSrc).toContain('if (permRaw === "granted" && isHealthPlatformAvailable())');
  });
});

describe("Round 56: Wearable Context — Backward Compatibility", () => {
  it("converts HealthData to WearableStats via healthDataToWearableStats", () => {
    expect(wearableContextSrc).toContain("function healthDataToWearableStats(data: HealthData, deviceName: string): WearableStats");
  });

  it("preserves legacy syncFromDevice method", () => {
    expect(wearableContextSrc).toContain("syncFromDevice: (deviceName: string) => Promise<void>");
  });

  it("falls back to simulated data when health platform unavailable", () => {
    expect(wearableContextSrc).toContain("generateSimulatedHealthData(deviceName)");
  });

  it("extends old stats with new fields on load", () => {
    expect(wearableContextSrc).toContain("bloodOxygen: parsed.bloodOxygen ?? null");
    expect(wearableContextSrc).toContain("restingHeartRate: parsed.restingHeartRate ?? null");
    expect(wearableContextSrc).toContain('dataSource: parsed.dataSource ?? "simulated"');
  });
});

// ── Wearable Sync Screen ──────────────────────────────────────────

describe("Round 56: Wearable Sync Screen — Health Platform Primary", () => {
  it("shows Apple Health on iOS and Health Connect on Android", () => {
    expect(wearableSyncSrc).toContain('"Apple Health"');
    expect(wearableSyncSrc).toContain('"Health Connect"');
    expect(wearableSyncSrc).toContain('Platform.OS === "ios"');
  });

  it("has Connect button for health platform", () => {
    expect(wearableSyncSrc).toContain("handleConnectHealthPlatform");
    expect(wearableSyncSrc).toContain("requestPermissions()");
  });

  it("shows CONNECTED badge when permissions granted", () => {
    expect(wearableSyncSrc).toContain("isHealthConnected");
    expect(wearableSyncSrc).toContain("CONNECTED");
  });

  it("has Refresh Data button when connected", () => {
    expect(wearableSyncSrc).toContain("handleRefreshHealthData");
    expect(wearableSyncSrc).toContain("Refresh Data");
  });

  it("shows data source label on stats dashboard", () => {
    expect(wearableSyncSrc).toContain("dataSourceLabel");
    expect(wearableSyncSrc).toContain("stats.dataSource");
  });

  it("shows permission denied alert with settings guidance", () => {
    expect(wearableSyncSrc).toContain("Permission Denied");
    expect(wearableSyncSrc).toContain("enable health data access in your device Settings");
  });
});

describe("Round 56: Wearable Sync Screen — Third-Party Wearables", () => {
  it("lists Fitbit, Garmin, WHOOP, Samsung Health, Oura", () => {
    expect(wearableSyncSrc).toContain('"Fitbit"');
    expect(wearableSyncSrc).toContain('"Garmin Connect"');
    expect(wearableSyncSrc).toContain('"WHOOP"');
    expect(wearableSyncSrc).toContain('"Samsung Health"');
    expect(wearableSyncSrc).toContain('"Oura Ring"');
  });

  it("uses MaterialIcons instead of emoji for wearable icons", () => {
    expect(wearableSyncSrc).toContain('icon: "watch"');
    expect(wearableSyncSrc).toContain('icon: "explore"');
    expect(wearableSyncSrc).toContain('icon: "fitness-center"');
  });

  it("explains data flows through health platform", () => {
    expect(wearableSyncSrc).toContain("write data to");
    expect(wearableSyncSrc).toContain("data sharing");
  });
});

describe("Round 56: Wearable Sync Screen — New Health Data Display", () => {
  it("shows SpO2 when available", () => {
    expect(wearableSyncSrc).toContain("SpO2");
    expect(wearableSyncSrc).toContain("stats.bloodOxygen");
  });

  it("shows Resting HR when available", () => {
    expect(wearableSyncSrc).toContain("Resting HR");
    expect(wearableSyncSrc).toContain("stats.restingHeartRate");
  });

  it("shows syncing state", () => {
    expect(wearableSyncSrc).toContain("syncing");
    expect(wearableSyncSrc).toContain("Syncing...");
  });
});

// ── App Config ────────────────────────────────────────────────────

describe("Round 56: App Config — HealthKit Configuration", () => {
  it("includes NSHealthShareUsageDescription", () => {
    expect(appConfigSrc).toContain("NSHealthShareUsageDescription");
    expect(appConfigSrc).toContain("reads your health data");
  });

  it("includes NSHealthUpdateUsageDescription", () => {
    expect(appConfigSrc).toContain("NSHealthUpdateUsageDescription");
    expect(appConfigSrc).toContain("writes workout data");
  });

  it("includes react-native-health plugin", () => {
    expect(appConfigSrc).toContain('"react-native-health"');
  });
});

describe("Round 56: App Config — Health Connect Configuration", () => {
  it("includes Health Connect read permissions", () => {
    expect(appConfigSrc).toContain("android.permission.health.READ_STEPS");
    expect(appConfigSrc).toContain("android.permission.health.READ_HEART_RATE");
    expect(appConfigSrc).toContain("android.permission.health.READ_SLEEP");
    expect(appConfigSrc).toContain("android.permission.health.READ_ACTIVE_CALORIES_BURNED");
    expect(appConfigSrc).toContain("android.permission.health.READ_DISTANCE");
    expect(appConfigSrc).toContain("android.permission.health.READ_OXYGEN_SATURATION");
    expect(appConfigSrc).toContain("android.permission.health.READ_RESTING_HEART_RATE");
    expect(appConfigSrc).toContain("android.permission.health.READ_HEART_RATE_VARIABILITY");
  });

  it("includes expo-health-connect plugin", () => {
    expect(appConfigSrc).toContain('"expo-health-connect"');
  });

  it("sets minimum SDK version to 26 for Health Connect", () => {
    expect(appConfigSrc).toContain("minSdkVersion: 26");
  });

  it("sets compile and target SDK to 34", () => {
    expect(appConfigSrc).toContain("compileSdkVersion: 34");
    expect(appConfigSrc).toContain("targetSdkVersion: 34");
  });
});
