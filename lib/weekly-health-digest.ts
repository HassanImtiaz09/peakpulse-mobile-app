/**
 * Weekly Health Digest Push Notification
 *
 * Generates a weekly summary of health metrics (steps, calories, sleep)
 * and schedules a push notification every Sunday at 9:00 AM.
 *
 * Compares current week vs previous week to show trend direction.
 */

import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fetchHealthHistory, type DailyHealthSummary } from "./health-service";

// ── Storage Keys ──
const DIGEST_NOTIF_KEY = "@weekly_digest_notification_id";
const DIGEST_ENABLED_KEY = "@weekly_digest_enabled";
const LAST_DIGEST_KEY = "@last_weekly_digest";
const DIGEST_DAY_KEY = "@weekly_digest_day"; // 0=Sun, 1=Mon, ...
const DIGEST_HOUR_KEY = "@weekly_digest_hour";

// ── Types ──
export interface WeeklyDigestData {
  /** Current week averages */
  currentWeek: {
    avgSteps: number;
    avgCalories: number;
    avgSleepHours: number;
    avgHeartRate: number;
    totalDistance: number;
    daysTracked: number;
  };
  /** Previous week averages (for comparison) */
  previousWeek: {
    avgSteps: number;
    avgCalories: number;
    avgSleepHours: number;
    avgHeartRate: number;
    totalDistance: number;
    daysTracked: number;
  };
  /** Trend indicators */
  trends: {
    stepsDirection: "up" | "down" | "flat";
    stepsPct: number;
    caloriesDirection: "up" | "down" | "flat";
    caloriesPct: number;
    sleepDirection: "up" | "down" | "flat";
    sleepPct: number;
  };
  generatedAt: string;
}

export interface DigestPreferences {
  enabled: boolean;
  dayOfWeek: number; // 0=Sunday
  hour: number; // 24h format
}

const DEFAULT_DIGEST_PREFS: DigestPreferences = {
  enabled: true,
  dayOfWeek: 0, // Sunday
  hour: 9, // 9 AM
};

// ── Preference Management ──

export async function getDigestPreferences(): Promise<DigestPreferences> {
  try {
    const [enabledRaw, dayRaw, hourRaw] = await Promise.all([
      AsyncStorage.getItem(DIGEST_ENABLED_KEY),
      AsyncStorage.getItem(DIGEST_DAY_KEY),
      AsyncStorage.getItem(DIGEST_HOUR_KEY),
    ]);
    return {
      enabled: enabledRaw !== null ? enabledRaw === "true" : DEFAULT_DIGEST_PREFS.enabled,
      dayOfWeek: dayRaw !== null ? parseInt(dayRaw) : DEFAULT_DIGEST_PREFS.dayOfWeek,
      hour: hourRaw !== null ? parseInt(hourRaw) : DEFAULT_DIGEST_PREFS.hour,
    };
  } catch {
    return { ...DEFAULT_DIGEST_PREFS };
  }
}

export async function saveDigestPreferences(prefs: Partial<DigestPreferences>): Promise<DigestPreferences> {
  const current = await getDigestPreferences();
  const updated = { ...current, ...prefs };
  await Promise.all([
    AsyncStorage.setItem(DIGEST_ENABLED_KEY, String(updated.enabled)),
    AsyncStorage.setItem(DIGEST_DAY_KEY, String(updated.dayOfWeek)),
    AsyncStorage.setItem(DIGEST_HOUR_KEY, String(updated.hour)),
  ]);
  return updated;
}

// ── Digest Data Generation ──

function calcAvg(data: number[]): number {
  if (data.length === 0) return 0;
  return Math.round(data.reduce((a, b) => a + b, 0) / data.length);
}

function calcTrend(current: number, previous: number): { direction: "up" | "down" | "flat"; pct: number } {
  if (previous === 0) return { direction: current > 0 ? "up" : "flat", pct: 0 };
  const pct = Math.round(((current - previous) / previous) * 100);
  if (Math.abs(pct) < 3) return { direction: "flat", pct: 0 };
  return { direction: pct > 0 ? "up" : "down", pct: Math.abs(pct) };
}

export async function generateWeeklyDigest(): Promise<WeeklyDigestData> {
  // Fetch 14 days of history (current week + previous week)
  const history = await fetchHealthHistory(14);

  // Split into current week (last 7 days) and previous week (days 8-14)
  const currentWeekData = history.slice(0, 7);
  const previousWeekData = history.slice(7, 14);

  const calcWeekStats = (data: DailyHealthSummary[]) => ({
    avgSteps: calcAvg(data.map((d) => d.steps)),
    avgCalories: calcAvg(data.map((d) => d.activeCalories)),
    avgSleepHours: parseFloat((data.reduce((a, d) => a + d.sleepHours, 0) / Math.max(data.length, 1)).toFixed(1)),
    avgHeartRate: calcAvg(data.filter((d) => d.heartRate > 0).map((d) => d.heartRate)),
    totalDistance: parseFloat(data.reduce((a, d) => a + d.distance, 0).toFixed(1)),
    daysTracked: data.length,
  });

  const currentWeek = calcWeekStats(currentWeekData);
  const previousWeek = calcWeekStats(previousWeekData);

  const stepsTrend = calcTrend(currentWeek.avgSteps, previousWeek.avgSteps);
  const caloriesTrend = calcTrend(currentWeek.avgCalories, previousWeek.avgCalories);
  const sleepTrend = calcTrend(currentWeek.avgSleepHours, previousWeek.avgSleepHours);

  return {
    currentWeek,
    previousWeek,
    trends: {
      stepsDirection: stepsTrend.direction,
      stepsPct: stepsTrend.pct,
      caloriesDirection: caloriesTrend.direction,
      caloriesPct: caloriesTrend.pct,
      sleepDirection: sleepTrend.direction,
      sleepPct: sleepTrend.pct,
    },
    generatedAt: new Date().toISOString(),
  };
}

// ── Notification Message Builder ──

function trendEmoji(dir: "up" | "down" | "flat"): string {
  if (dir === "up") return "↑";
  if (dir === "down") return "↓";
  return "→";
}

export function buildDigestNotificationContent(digest: WeeklyDigestData): Notifications.NotificationContentInput {
  const { currentWeek, trends } = digest;

  const stepsLine = `${currentWeek.avgSteps.toLocaleString()} avg steps/day ${trendEmoji(trends.stepsDirection)}${trends.stepsPct > 0 ? ` ${trends.stepsPct}%` : ""}`;
  const calLine = `${currentWeek.avgCalories} kcal burned/day ${trendEmoji(trends.caloriesDirection)}${trends.caloriesPct > 0 ? ` ${trends.caloriesPct}%` : ""}`;
  const sleepLine = `${currentWeek.avgSleepHours}h avg sleep ${trendEmoji(trends.sleepDirection)}${trends.sleepPct > 0 ? ` ${trends.sleepPct}%` : ""}`;

  const body = `${stepsLine}\n${calLine}\n${sleepLine}`;

  // Motivational suffix based on trends
  let suffix = "";
  const upCount = [trends.stepsDirection, trends.caloriesDirection, trends.sleepDirection].filter((d) => d === "up").length;
  if (upCount >= 2) suffix = "\n\nGreat progress this week! Keep it up.";
  else if (upCount === 1) suffix = "\n\nSteady week. Small improvements add up!";
  else suffix = "\n\nNew week, fresh start. You've got this!";

  return {
    title: "Your Weekly Health Digest",
    subtitle: "FytNova Weekly Summary",
    body: body + suffix,
    data: { type: "weekly_digest", screen: "/health-trends" },
    sound: true,
    badge: 1,
  };
}

// ── Schedule / Cancel ──

async function cancelExistingDigest(): Promise<void> {
  try {
    const id = await AsyncStorage.getItem(DIGEST_NOTIF_KEY);
    if (id) {
      await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
      await AsyncStorage.removeItem(DIGEST_NOTIF_KEY);
    }
  } catch {}
}

export async function scheduleWeeklyDigest(): Promise<string | null> {
  if (Platform.OS === "web") return null;

  const prefs = await getDigestPreferences();
  if (!prefs.enabled) {
    await cancelExistingDigest();
    return null;
  }

  await cancelExistingDigest();

  try {
    // Generate current digest data for the notification content
    const digest = await generateWeeklyDigest();
    const content = buildDigestNotificationContent(digest);

    // Schedule weekly repeating notification
    const id = await Notifications.scheduleNotificationAsync({
      content,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: prefs.dayOfWeek + 1, // expo-notifications uses 1=Sunday, 2=Monday, etc.
        hour: prefs.hour,
        minute: 0,
      },
    });

    await AsyncStorage.setItem(DIGEST_NOTIF_KEY, id);
    await AsyncStorage.setItem(LAST_DIGEST_KEY, new Date().toISOString());

    return id;
  } catch (err) {
    console.warn("[WeeklyDigest] Failed to schedule:", err);
    return null;
  }
}

export async function cancelWeeklyDigest(): Promise<void> {
  await cancelExistingDigest();
  await saveDigestPreferences({ enabled: false });
}

export async function getLastDigestDate(): Promise<string | null> {
  return AsyncStorage.getItem(LAST_DIGEST_KEY);
}

// ── Immediate Digest (for testing / manual trigger) ──

export async function sendImmediateDigest(): Promise<string | null> {
  if (Platform.OS === "web") return null;

  try {
    const digest = await generateWeeklyDigest();
    const content = buildDigestNotificationContent(digest);

    const id = await Notifications.scheduleNotificationAsync({
      content,
      trigger: null, // immediate
    });

    await AsyncStorage.setItem(LAST_DIGEST_KEY, new Date().toISOString());
    return id;
  } catch (err) {
    console.warn("[WeeklyDigest] Failed to send immediate digest:", err);
    return null;
  }
}

// ── Initialize on App Launch ──

export async function initWeeklyDigest(): Promise<void> {
  if (Platform.OS === "web") return;
  const prefs = await getDigestPreferences();
  if (prefs.enabled) {
    await scheduleWeeklyDigest();
  }
}
