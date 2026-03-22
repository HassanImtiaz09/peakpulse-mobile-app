/**
 * Round 58 Tests — Log Workout, Weekly Health Digest, PDF Health Report
 *
 * Validates:
 * 1. Log Workout screen: form fields, workout types, calorie estimation, HealthKit/HC write-back, history storage
 * 2. Weekly Health Digest: data generation, notification scheduling, trend comparison, preferences
 * 3. PDF Health Report: HTML generation, PDF creation, sharing, branded layout, daily breakdown
 * 4. Navigation wiring: dashboard quick actions, health trends export buttons, root layout init
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
// 1. LOG WORKOUT SCREEN
// ═══════════════════════════════════════════════════════════════════
describe("Log Workout Screen", () => {
  it("log-workout.tsx file exists", () => {
    expect(fileExists("app/log-workout.tsx")).toBe(true);
  });

  const logWorkout = readFile("app/log-workout.tsx");

  it("imports WorkoutType and WorkoutData from health-service", () => {
    expect(logWorkout).toContain("WorkoutType");
    expect(logWorkout).toContain("WorkoutData");
    expect(logWorkout).toContain("@/lib/health-service");
  });

  it("imports useWearable for health platform integration", () => {
    expect(logWorkout).toContain("useWearable");
    expect(logWorkout).toContain("logWorkoutToHealthPlatform");
  });

  it("defines all 13 workout types with icons and calorie estimates", () => {
    const types = ["running", "walking", "cycling", "swimming", "strength_training", "hiit", "yoga", "pilates", "dance", "elliptical", "rowing", "stair_climbing", "other"];
    for (const t of types) {
      expect(logWorkout).toContain(`type: "${t}"`);
    }
  });

  it("has workout type selector grid", () => {
    expect(logWorkout).toContain("Workout Type");
    expect(logWorkout).toContain("WORKOUT_TYPES.map");
    expect(logWorkout).toContain("setSelectedType");
  });

  it("has duration input with hours and minutes", () => {
    expect(logWorkout).toContain("Duration");
    expect(logWorkout).toContain("Hours");
    expect(logWorkout).toContain("Minutes");
    expect(logWorkout).toContain("setHours");
    expect(logWorkout).toContain("setMinutes");
  });

  it("has auto-estimate and manual calorie entry toggle", () => {
    expect(logWorkout).toContain("Auto-Estimate");
    expect(logWorkout).toContain("Manual Entry");
    expect(logWorkout).toContain("autoCalories");
    expect(logWorkout).toContain("estimatedCalories");
    expect(logWorkout).toContain("estimated kcal");
  });

  it("has calorie estimation function based on workout type and duration", () => {
    expect(logWorkout).toContain("estimateCalories");
    expect(logWorkout).toContain("caloriesPerMin");
  });

  it("has optional distance input for applicable workout types", () => {
    expect(logWorkout).toContain("Distance (km)");
    expect(logWorkout).toContain("hasDistance");
    expect(logWorkout).toContain("setDistance");
  });

  it("has optional heart rate input", () => {
    expect(logWorkout).toContain("Avg Heart Rate (bpm)");
    expect(logWorkout).toContain("setHeartRate");
  });

  it("has workout title/notes field", () => {
    expect(logWorkout).toContain("Workout Title");
    expect(logWorkout).toContain("setTitle");
  });

  it("has date and time inputs", () => {
    expect(logWorkout).toContain("Date");
    expect(logWorkout).toContain("Time");
    expect(logWorkout).toContain("dateStr");
    expect(logWorkout).toContain("timeStr");
    expect(logWorkout).toContain("YYYY-MM-DD");
    expect(logWorkout).toContain("HH:MM");
  });

  it("has health platform sync toggle", () => {
    expect(logWorkout).toContain("syncToHealth");
    expect(logWorkout).toContain("Save to");
    expect(logWorkout).toContain("healthSourceName");
  });

  it("builds WorkoutData and calls logWorkoutToHealthPlatform", () => {
    expect(logWorkout).toContain("const workoutData: WorkoutData");
    expect(logWorkout).toContain("logWorkoutToHealthPlatform(workoutData)");
  });

  it("saves workout to local AsyncStorage history", () => {
    expect(logWorkout).toContain("saveWorkoutToHistory");
    expect(logWorkout).toContain("@workout_log_history");
    expect(logWorkout).toContain("WorkoutLogEntry");
  });

  it("also updates workout sessions for streak tracking", () => {
    expect(logWorkout).toContain("@workout_sessions_local");
  });

  it("shows workout summary before saving", () => {
    expect(logWorkout).toContain("WORKOUT SUMMARY");
    expect(logWorkout).toContain("totalDurationMin");
    expect(logWorkout).toContain("effectiveCalories");
  });

  it("shows success alert with health platform status", () => {
    expect(logWorkout).toContain("Workout Logged");
    expect(logWorkout).toContain("Apple Health");
    expect(logWorkout).toContain("Health Connect");
  });

  it("has haptic feedback on success", () => {
    expect(logWorkout).toContain("Haptics.notificationAsync");
    expect(logWorkout).toContain("NotificationFeedbackType.Success");
  });

  it("has back navigation button", () => {
    expect(logWorkout).toContain("router.back()");
  });

  it("has loading state during save", () => {
    expect(logWorkout).toContain("saving");
    expect(logWorkout).toContain("setSaving");
    expect(logWorkout).toContain("Saving...");
  });

  it("validates form before allowing save", () => {
    expect(logWorkout).toContain("canSave");
    expect(logWorkout).toContain("selectedType !== null");
    expect(logWorkout).toContain("totalDurationMin > 0");
  });
});

// ═══════════════════════════════════════════════════════════════════
// 2. WEEKLY HEALTH DIGEST
// ═══════════════════════════════════════════════════════════════════
describe("Weekly Health Digest Notification", () => {
  it("weekly-health-digest.ts file exists", () => {
    expect(fileExists("lib/weekly-health-digest.ts")).toBe(true);
  });

  const digest = readFile("lib/weekly-health-digest.ts");

  it("exports WeeklyDigestData interface", () => {
    expect(digest).toContain("export interface WeeklyDigestData");
  });

  it("WeeklyDigestData includes current and previous week stats", () => {
    expect(digest).toContain("currentWeek:");
    expect(digest).toContain("previousWeek:");
    expect(digest).toContain("avgSteps");
    expect(digest).toContain("avgCalories");
    expect(digest).toContain("avgSleepHours");
    expect(digest).toContain("avgHeartRate");
  });

  it("WeeklyDigestData includes trend indicators", () => {
    expect(digest).toContain("trends:");
    expect(digest).toContain("stepsDirection");
    expect(digest).toContain("caloriesDirection");
    expect(digest).toContain("sleepDirection");
    expect(digest).toContain("stepsPct");
  });

  it("exports DigestPreferences interface", () => {
    expect(digest).toContain("export interface DigestPreferences");
    expect(digest).toContain("enabled: boolean");
    expect(digest).toContain("dayOfWeek: number");
    expect(digest).toContain("hour: number");
  });

  it("exports generateWeeklyDigest function", () => {
    expect(digest).toContain("export async function generateWeeklyDigest");
  });

  it("fetches 14 days of history for comparison", () => {
    expect(digest).toContain("fetchHealthHistory(14)");
  });

  it("splits data into current week and previous week", () => {
    expect(digest).toContain("currentWeekData");
    expect(digest).toContain("previousWeekData");
    expect(digest).toContain("slice(0, 7)");
    expect(digest).toContain("slice(7, 14)");
  });

  it("exports buildDigestNotificationContent function", () => {
    expect(digest).toContain("export function buildDigestNotificationContent");
  });

  it("notification content includes steps, calories, and sleep", () => {
    expect(digest).toContain("avg steps/day");
    expect(digest).toContain("kcal burned/day");
    expect(digest).toContain("avg sleep");
  });

  it("notification includes motivational suffix based on trends", () => {
    expect(digest).toContain("Great progress this week");
    expect(digest).toContain("Small improvements add up");
    expect(digest).toContain("New week, fresh start");
  });

  it("exports scheduleWeeklyDigest function", () => {
    expect(digest).toContain("export async function scheduleWeeklyDigest");
  });

  it("uses WEEKLY trigger type for recurring notification", () => {
    expect(digest).toContain("SchedulableTriggerInputTypes.WEEKLY");
    expect(digest).toContain("weekday:");
    expect(digest).toContain("hour:");
  });

  it("exports cancelWeeklyDigest function", () => {
    expect(digest).toContain("export async function cancelWeeklyDigest");
  });

  it("exports sendImmediateDigest for testing", () => {
    expect(digest).toContain("export async function sendImmediateDigest");
  });

  it("exports initWeeklyDigest for app launch", () => {
    expect(digest).toContain("export async function initWeeklyDigest");
  });

  it("handles web platform gracefully", () => {
    expect(digest).toContain('Platform.OS === "web"');
  });

  it("persists notification ID and preferences to AsyncStorage", () => {
    expect(digest).toContain("@weekly_digest_notification_id");
    expect(digest).toContain("@weekly_digest_enabled");
    expect(digest).toContain("@last_weekly_digest");
  });

  it("exports getDigestPreferences and saveDigestPreferences", () => {
    expect(digest).toContain("export async function getDigestPreferences");
    expect(digest).toContain("export async function saveDigestPreferences");
  });

  it("exports getLastDigestDate", () => {
    expect(digest).toContain("export async function getLastDigestDate");
  });
});

// ═══════════════════════════════════════════════════════════════════
// 3. PDF HEALTH REPORT
// ═══════════════════════════════════════════════════════════════════
describe("PDF Health Report Generator", () => {
  it("health-report-generator.ts file exists", () => {
    expect(fileExists("lib/health-report-generator.ts")).toBe(true);
  });

  const report = readFile("lib/health-report-generator.ts");

  it("imports expo-print for PDF generation", () => {
    expect(report).toContain("expo-print");
    expect(report).toContain("printToFileAsync");
  });

  it("imports expo-sharing for sharing", () => {
    expect(report).toContain("expo-sharing");
    expect(report).toContain("shareAsync");
  });

  it("exports ReportConfig interface with period option", () => {
    expect(report).toContain("export interface ReportConfig");
    expect(report).toContain("period: 7 | 30");
  });

  it("exports ReportResult interface", () => {
    expect(report).toContain("export interface ReportResult");
    expect(report).toContain("success: boolean");
    expect(report).toContain("uri?: string");
  });

  it("exports generateReportHTML function", () => {
    expect(report).toContain("export function generateReportHTML");
  });

  it("HTML includes PeakPulse branding", () => {
    expect(report).toContain("PEAKPULSE AI");
    expect(report).toContain("Health Report");
    expect(report).toContain("#F59E0B"); // brand amber color
  });

  it("HTML includes header with user name, date, and period", () => {
    expect(report).toContain("Prepared for");
    expect(report).toContain("Report Date");
    expect(report).toContain("Period");
    expect(report).toContain("Days Tracked");
  });

  it("HTML includes summary stats grid", () => {
    expect(report).toContain("Summary Overview");
    expect(report).toContain("Avg Daily Steps");
    expect(report).toContain("Avg Heart Rate");
    expect(report).toContain("Avg Calories Burned");
    expect(report).toContain("Avg Sleep");
    expect(report).toContain("Total Distance");
    expect(report).toContain("Avg HRV");
  });

  it("HTML includes trend indicators for each metric", () => {
    expect(report).toContain("trendDir");
    expect(report).toContain("trendPct");
    expect(report).toContain("trendArrow");
    expect(report).toContain("trendColor");
  });

  it("HTML includes health insights section", () => {
    expect(report).toContain("Health Insights");
    expect(report).toContain("insights");
    expect(report).toContain("10,000 steps");
    expect(report).toContain("7-9 hours");
  });

  it("HTML includes daily breakdown table", () => {
    expect(report).toContain("Daily Breakdown");
    expect(report).toContain("<table>");
    expect(report).toContain("<thead>");
    expect(report).toContain("<tbody>");
    expect(report).toContain("Steps");
    expect(report).toContain("Heart Rate");
    expect(report).toContain("Calories");
    expect(report).toContain("Sleep");
    expect(report).toContain("Distance");
    expect(report).toContain("HRV");
  });

  it("HTML includes medical disclaimer", () => {
    expect(report).toContain("Disclaimer");
    expect(report).toContain("not a substitute for professional medical advice");
    expect(report).toContain("qualified healthcare provider");
  });

  it("HTML includes footer with copyright", () => {
    expect(report).toContain("PeakPulse AI. All rights reserved");
  });

  it("exports generateHealthReport function", () => {
    expect(report).toContain("export async function generateHealthReport");
  });

  it("generateHealthReport fetches health history", () => {
    expect(report).toContain("fetchHealthHistory(config.period)");
  });

  it("generateHealthReport handles empty data", () => {
    expect(report).toContain("No health data available");
  });

  it("exports generateAndShareHealthReport function", () => {
    expect(report).toContain("export async function generateAndShareHealthReport");
  });

  it("sharing uses correct MIME type and dialog title", () => {
    expect(report).toContain("application/pdf");
    expect(report).toContain("dialogTitle");
    expect(report).toContain("Health Report");
  });

  it("exports printHealthReport function", () => {
    expect(report).toContain("export async function printHealthReport");
  });

  it("gets user name from AsyncStorage for personalization", () => {
    expect(report).toContain("@user_profile");
    expect(report).toContain("getUserName");
  });

  it("sets iOS page margins", () => {
    expect(report).toContain("margins");
    expect(report).toContain('Platform.OS === "ios"');
  });
});

// ═══════════════════════════════════════════════════════════════════
// 4. NAVIGATION & WIRING
// ═══════════════════════════════════════════════════════════════════
describe("Navigation & App Wiring", () => {
  it("dashboard has Log Workout quick action", () => {
    const dashboard = readFile("app/(tabs)/index.tsx");
    expect(dashboard).toContain('"Log Workout"');
    expect(dashboard).toContain('"/log-workout"');
  });

  it("dashboard has Health Trends quick action", () => {
    const dashboard = readFile("app/(tabs)/index.tsx");
    expect(dashboard).toContain('"Health Trends"');
    expect(dashboard).toContain('"/health-trends"');
  });

  it("health trends screen has export PDF buttons", () => {
    const trends = readFile("app/health-trends.tsx");
    expect(trends).toContain("Export Health Report");
    expect(trends).toContain("generateAndShareHealthReport");
    expect(trends).toContain("printHealthReport");
    expect(trends).toContain("picture-as-pdf");
    expect(trends).toContain("Share");
    expect(trends).toContain("print");
  });

  it("health trends screen imports report generator", () => {
    const trends = readFile("app/health-trends.tsx");
    expect(trends).toContain("@/lib/health-report-generator");
  });

  it("root layout imports and initializes weekly digest", () => {
    const layout = readFile("app/_layout.tsx");
    expect(layout).toContain("initWeeklyDigest");
    expect(layout).toContain("@/lib/weekly-health-digest");
    expect(layout).toContain("initWeeklyDigest()");
  });

  it("root layout delays weekly digest initialization", () => {
    const layout = readFile("app/_layout.tsx");
    expect(layout).toContain("setTimeout");
    expect(layout).toContain("6000");
  });
});

// ═══════════════════════════════════════════════════════════════════
// 5. REPORT HTML QUALITY
// ═══════════════════════════════════════════════════════════════════
describe("Report HTML Quality", () => {
  const report = readFile("lib/health-report-generator.ts");

  it("uses proper HTML5 doctype", () => {
    expect(report).toContain("<!DOCTYPE html>");
  });

  it("has responsive viewport meta tag", () => {
    expect(report).toContain("viewport");
    expect(report).toContain("width=device-width");
  });

  it("uses CSS grid for stats layout", () => {
    expect(report).toContain("grid-template-columns");
    expect(report).toContain("stats-grid");
  });

  it("has @page margin rules for print", () => {
    expect(report).toContain("@page");
    expect(report).toContain("margin:");
  });

  it("uses professional color scheme matching PeakPulse brand", () => {
    expect(report).toContain("#F59E0B"); // amber primary
    expect(report).toContain("#0A0500"); // dark background
    expect(report).toContain("#FFFBEB"); // amber light bg
    expect(report).toContain("#FDE68A"); // amber accent
  });

  it("has alternating row colors in table", () => {
    expect(report).toContain("nth-child(even)");
  });

  it("formats dates in UK format", () => {
    expect(report).toContain("en-GB");
  });
});
