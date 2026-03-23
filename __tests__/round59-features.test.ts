/**
 * Round 59 Tests — Workout History, Digest Settings, PDF Report Customisation
 *
 * Tests verify:
 * 1. Workout history screen structure, filtering, and delete functionality
 * 2. Digest settings screen with day/time picker and toggle
 * 3. PDF report metric selection and personal notes
 * 4. Navigation wiring between screens
 */

import { describe, it, expect, beforeAll } from "vitest";
import * as fs from "fs";
import * as path from "path";

const projectRoot = path.resolve(__dirname, "..");

function readFile(filePath: string): string {
  return fs.readFileSync(path.join(projectRoot, filePath), "utf-8");
}

function fileExists(filePath: string): boolean {
  return fs.existsSync(path.join(projectRoot, filePath));
}

// ── 1. Workout History Screen ──

describe("Workout History Screen", () => {
  let src: string;
  beforeAll(() => {
    src = readFile("app/workout-history.tsx");
  });

  it("exists as a screen file", () => {
    expect(fileExists("app/workout-history.tsx")).toBe(true);
  });

  it("imports WorkoutData and WorkoutType from health-service", () => {
    expect(src).toContain("WorkoutType");
    expect(src).toContain("WorkoutData");
    expect(src).toContain("@/lib/health-service");
  });

  it("defines all 13 workout type configs", () => {
    const types = ["running", "walking", "cycling", "swimming", "strength_training",
      "hiit", "yoga", "pilates", "dance", "elliptical", "rowing", "stair_climbing", "other"];
    types.forEach((t) => {
      expect(src).toContain(`"${t}"`);
    });
  });

  it("reads from AsyncStorage with correct key", () => {
    expect(src).toContain("@workout_log_history");
    expect(src).toContain("AsyncStorage.getItem");
  });

  it("has type filter state with 'all' default", () => {
    expect(src).toContain('useState<WorkoutType | "all">("all")');
  });

  it("has date range filter inputs (from/to)", () => {
    expect(src).toContain("dateFrom");
    expect(src).toContain("dateTo");
    expect(src).toContain("YYYY-MM-DD");
  });

  it("filters by workout type", () => {
    expect(src).toContain("e.workout.type === typeFilter");
  });

  it("filters by date range", () => {
    expect(src).toContain("new Date(dateFrom)");
    expect(src).toContain("new Date(dateTo)");
  });

  it("calculates summary stats for filtered entries", () => {
    expect(src).toContain("summaryStats");
    expect(src).toContain("totalCalories");
    expect(src).toContain("totalDistance");
    expect(src).toContain("totalMinutes");
  });

  it("has delete workout functionality with confirmation", () => {
    expect(src).toContain("deleteWorkout");
    expect(src).toContain("Delete Workout");
    expect(src).toContain("Alert.alert");
  });

  it("has clear filters button", () => {
    expect(src).toContain("clearFilters");
    expect(src).toContain("Clear Filters");
  });

  it("shows empty state with Log Workout CTA", () => {
    expect(src).toContain("No Workouts Logged Yet");
    expect(src).toContain("No Workouts Match Filters");
  });

  it("uses FlatList for workout list rendering", () => {
    expect(src).toContain("FlatList");
    expect(src).toContain("renderWorkoutCard");
  });

  it("displays workout card with type icon, title, date, stats", () => {
    expect(src).toContain("formatDuration");
    expect(src).toContain("formatDateDisplay");
    expect(src).toContain("formatTimeDisplay");
    expect(src).toContain("caloriesBurned");
    expect(src).toContain("distanceKm");
    expect(src).toContain("heartRateAvg");
  });

  it("shows health platform sync badge", () => {
    expect(src).toContain("savedToHealthPlatform");
    expect(src).toContain("Synced");
  });

  it("has navigation to log-workout screen", () => {
    expect(src).toContain("/log-workout");
  });

  it("has back navigation", () => {
    expect(src).toContain("router.back()");
    expect(src).toContain("arrow-back");
  });
});

// ── 2. Digest Settings Screen ──

describe("Digest Settings Screen", () => {
  let src: string;
  beforeAll(() => {
    src = readFile("app/digest-settings.tsx");
  });

  it("exists as a screen file", () => {
    expect(fileExists("app/digest-settings.tsx")).toBe(true);
  });

  it("imports digest preference functions from weekly-health-digest", () => {
    expect(src).toContain("getDigestPreferences");
    expect(src).toContain("saveDigestPreferences");
    expect(src).toContain("scheduleWeeklyDigest");
    expect(src).toContain("cancelWeeklyDigest");
  });

  it("has enabled toggle state", () => {
    expect(src).toContain("enabled");
    expect(src).toContain("prefs.enabled");
  });

  it("has day of week selector with all 7 days", () => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    days.forEach((d) => {
      expect(src).toContain(d);
    });
  });

  it("has hour/time selector", () => {
    expect(src).toContain("prefs.hour");
    expect(src).toContain("showHourPicker");
  });

  it("saves preferences to AsyncStorage via saveDigestPreferences", () => {
    expect(src).toContain("saveDigestPreferences");
  });

  it("schedules or cancels digest based on enabled state", () => {
    expect(src).toContain("scheduleWeeklyDigest");
    expect(src).toContain("cancelWeeklyDigest");
  });

  it("has send test notification button", () => {
    expect(src).toContain("sendImmediateDigest");
    expect(src).toContain("Send Test Digest");
  });

  it("loads existing preferences on mount", () => {
    expect(src).toContain("getDigestPreferences");
  });

  it("has back navigation", () => {
    expect(src).toContain("router.back()");
  });

  it("shows success feedback via haptics", () => {
    expect(src).toContain("Haptics");
  });
});

// ── 3. PDF Report Customisation ──

describe("PDF Report Generator - Metric Selection & Notes", () => {
  let src: string;
  beforeAll(() => {
    src = readFile("lib/health-report-generator.ts");
  });

  it("exports ReportMetricKey type", () => {
    expect(src).toContain("export type ReportMetricKey");
  });

  it("defines all 6 metric keys", () => {
    const keys = ["steps", "heartRate", "calories", "sleep", "distance", "hrv"];
    keys.forEach((k) => {
      expect(src).toContain(`"${k}"`);
    });
  });

  it("exports ALL_REPORT_METRICS with labels and icons", () => {
    expect(src).toContain("export const ALL_REPORT_METRICS");
    expect(src).toContain("label:");
    expect(src).toContain("icon:");
  });

  it("exports DEFAULT_SELECTED_METRICS", () => {
    expect(src).toContain("export const DEFAULT_SELECTED_METRICS");
  });

  it("has selectedMetrics field in ReportConfig", () => {
    expect(src).toContain("selectedMetrics?: ReportMetricKey[]");
  });

  it("has personalNotes field in ReportConfig", () => {
    expect(src).toContain("personalNotes?: string");
  });

  it("persists report preferences to AsyncStorage", () => {
    expect(src).toContain("@report_selected_metrics");
    expect(src).toContain("@report_personal_notes");
    expect(src).toContain("getReportPreferences");
    expect(src).toContain("saveReportPreferences");
  });

  it("conditionally renders stat cards based on selected metrics", () => {
    expect(src).toContain('has(metrics, "steps")');
    expect(src).toContain('has(metrics, "heartRate")');
    expect(src).toContain('has(metrics, "calories")');
    expect(src).toContain('has(metrics, "sleep")');
    expect(src).toContain('has(metrics, "distance")');
    expect(src).toContain('has(metrics, "hrv")');
  });

  it("conditionally renders table columns based on selected metrics", () => {
    expect(src).toContain("tableHeaders");
    expect(src).toContain("tableRows");
  });

  it("renders personal notes section in HTML when provided", () => {
    expect(src).toContain("Notes for Healthcare Provider");
    expect(src).toContain("personalNotesHTML");
    expect(src).toContain("notes-content");
  });

  it("shows metrics included label in report", () => {
    expect(src).toContain("Metrics included:");
    expect(src).toContain("metricsIncluded");
  });

  it("generates insights only for selected metrics", () => {
    expect(src).toContain("if (stepsStats)");
    expect(src).toContain("if (sleepStats)");
    expect(src).toContain("if (hrStats)");
    expect(src).toContain("if (hrvStats");
  });

  it("adjusts grid columns based on number of stat cards", () => {
    expect(src).toContain("gridCols");
    expect(src).toContain("statCards.length");
  });
});

// ── 4. Health Trends Export UI ──

describe("Health Trends - Export Customisation UI", () => {
  let src: string;
  beforeAll(() => {
    src = readFile("app/health-trends.tsx");
  });

  it("imports report preferences functions", () => {
    expect(src).toContain("getReportPreferences");
    expect(src).toContain("saveReportPreferences");
    expect(src).toContain("ALL_REPORT_METRICS");
    expect(src).toContain("ReportMetricKey");
  });

  it("has showReportConfig toggle state", () => {
    expect(src).toContain("showReportConfig");
    expect(src).toContain("setShowReportConfig");
  });

  it("has reportMetrics state for metric selection", () => {
    expect(src).toContain("reportMetrics");
    expect(src).toContain("setReportMetrics");
  });

  it("has personalNotes state for notes input", () => {
    expect(src).toContain("personalNotes");
    expect(src).toContain("setPersonalNotes");
  });

  it("loads saved report preferences on mount", () => {
    expect(src).toContain("getReportPreferences");
    expect(src).toContain("reportPrefsLoaded");
  });

  it("has toggleReportMetric function that prevents empty selection", () => {
    expect(src).toContain("toggleReportMetric");
    expect(src).toContain("next.length === 0 ? prev : next");
  });

  it("has handleExport function that saves preferences before generating", () => {
    expect(src).toContain("handleExport");
    expect(src).toContain("saveReportPreferences(reportMetrics, personalNotes)");
    expect(src).toContain("selectedMetrics: reportMetrics");
  });

  it("renders metric selection checkboxes", () => {
    expect(src).toContain("Select Metrics to Include");
    expect(src).toContain("check-box");
    expect(src).toContain("check-box-outline-blank");
  });

  it("renders personal notes TextInput", () => {
    expect(src).toContain("TextInput");
    expect(src).toContain("Notes for Healthcare Provider");
    expect(src).toContain("trainer, physio, or doctor");
  });

  it("has collapsible export config section", () => {
    expect(src).toContain("expand-less");
    expect(src).toContain("expand-more");
  });
});

// ── 5. Navigation Wiring ──

describe("Navigation Wiring", () => {
  it("dashboard has Workout Log quick action", () => {
    const src = readFile("app/(tabs)/index.tsx");
    expect(src).toContain("Workout Log");
    expect(src).toContain("/workout-history");
  });

  it("log-workout has View Workout History link", () => {
    const src = readFile("app/log-workout.tsx");
    expect(src).toContain("View Workout History");
    expect(src).toContain("/workout-history");
  });

  it("notification-settings has Weekly Health Digest link", () => {
    const src = readFile("app/notification-settings.tsx");
    expect(src).toContain("Weekly Health Digest");
    expect(src).toContain("/digest-settings");
  });

  it("workout-history has link to log-workout", () => {
    const src = readFile("app/workout-history.tsx");
    expect(src).toContain("/log-workout");
  });
});

// ── 6. Weekly Health Digest Service ──

describe("Weekly Health Digest Service", () => {
  let src: string;
  beforeAll(() => {
    src = readFile("lib/weekly-health-digest.ts");
  });

  it("exports getDigestPreferences", () => {
    expect(src).toContain("export async function getDigestPreferences");
  });

  it("exports saveDigestPreferences", () => {
    expect(src).toContain("export async function saveDigestPreferences");
  });

  it("exports scheduleWeeklyDigest", () => {
    expect(src).toContain("export async function scheduleWeeklyDigest");
  });

  it("exports cancelWeeklyDigest", () => {
    expect(src).toContain("export async function cancelWeeklyDigest");
  });

  it("exports sendImmediateDigest", () => {
    expect(src).toContain("export async function sendImmediateDigest");
  });

  it("exports getLastDigestDate", () => {
    expect(src).toContain("export async function getLastDigestDate");
  });

  it("has DigestPreferences interface with enabled, dayOfWeek, hour", () => {
    expect(src).toContain("enabled:");
    expect(src).toContain("dayOfWeek:");
    expect(src).toContain("hour:");
  });

  it("defaults to Sunday at 9 AM", () => {
    expect(src).toContain("dayOfWeek: 0");
    expect(src).toContain("hour: 9");
  });

  it("handles web platform gracefully", () => {
    expect(src).toContain('Platform.OS === "web"');
  });
});

// ── 7. TypeScript Compilation ──

describe("TypeScript Compilation", () => {
  it("has 0 TypeScript errors", () => {
    const { execSync } = require("child_process");
    const result = execSync("cd /home/ubuntu/peakpulse-mobile && npx tsc --noEmit 2>&1 | grep 'error TS' | wc -l", {
      encoding: "utf-8",
    }).trim();
    expect(parseInt(result)).toBe(0);
  });
});
