/**
 * Notification Service — handles push notification registration,
 * permission management, and local notification scheduling.
 *
 * Uses expo-notifications for local notifications (workout reminders,
 * meal alerts, progress updates). Works in Expo Go.
 */
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const PUSH_TOKEN_KEY = "@peakpulse_push_token";
const PUSH_ENABLED_KEY = "@peakpulse_push_notifications";
const SCHEDULED_IDS_KEY = "@peakpulse_scheduled_notif_ids";

// Configure foreground notification display
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Request notification permissions and set up Android channel.
 * Returns true if permissions were granted.
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === "web") return false;

  // Set up Android notification channel
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("peakpulse-default", {
      name: "PeakPulse Reminders",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#F59E0B",
      sound: "default",
    });

    await Notifications.setNotificationChannelAsync("peakpulse-workout", {
      name: "Workout Reminders",
      importance: Notifications.AndroidImportance.HIGH,
      sound: "default",
    });

    await Notifications.setNotificationChannelAsync("peakpulse-meals", {
      name: "Meal Reminders",
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: "default",
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  return finalStatus === "granted";
}

/**
 * Register for push notifications.
 * Requests permissions, gets token, and stores it.
 */
export async function registerForNotifications(): Promise<string | null> {
  const granted = await requestNotificationPermissions();
  if (!granted) return null;

  try {
    // Get Expo push token (works in Expo Go for local notifications)
    const tokenData = await Notifications.getExpoPushTokenAsync();
    const token = tokenData.data;
    await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);
    return token;
  } catch (err) {
    console.warn("[Notifications] Failed to get push token:", err);
    return null;
  }
}

/**
 * Unregister notifications — cancel all scheduled notifications
 * and clear the stored token.
 */
export async function unregisterNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
  await AsyncStorage.removeItem(SCHEDULED_IDS_KEY);
}

/**
 * Check if notifications are currently enabled in app settings.
 */
export async function isNotificationsEnabled(): Promise<boolean> {
  const val = await AsyncStorage.getItem(PUSH_ENABLED_KEY);
  return val !== "false"; // Default to true
}

/**
 * Enable or disable notifications.
 * When enabling: requests permissions and schedules default reminders.
 * When disabling: cancels all scheduled notifications.
 */
export async function setNotificationsEnabled(enabled: boolean): Promise<boolean> {
  await AsyncStorage.setItem(PUSH_ENABLED_KEY, String(enabled));

  if (enabled) {
    const granted = await requestNotificationPermissions();
    if (!granted) return false;
    await scheduleDefaultReminders();
    return true;
  } else {
    await Notifications.cancelAllScheduledNotificationsAsync();
    await AsyncStorage.removeItem(SCHEDULED_IDS_KEY);
    return true;
  }
}

/**
 * Schedule default daily reminders:
 * - Morning workout reminder at 8:00 AM
 * - Lunch meal log reminder at 12:30 PM
 * - Evening progress check at 8:00 PM
 */
export async function scheduleDefaultReminders(): Promise<void> {
  // Cancel existing scheduled notifications first
  await Notifications.cancelAllScheduledNotificationsAsync();

  const ids: string[] = [];

  try {
    // Morning workout reminder
    const morningId = await Notifications.scheduleNotificationAsync({
      content: {
        title: "Time to Train",
        body: "Your workout plan is ready. Let's crush today's session!",
        data: { type: "workout_reminder" },
        sound: "default",
        ...(Platform.OS === "android" && { channelId: "peakpulse-workout" }),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 8,
        minute: 0,
      },
    });
    ids.push(morningId);

    // Lunch meal log reminder
    const lunchId = await Notifications.scheduleNotificationAsync({
      content: {
        title: "Log Your Lunch",
        body: "Don't forget to track your midday meal. Stay on top of your nutrition!",
        data: { type: "meal_reminder" },
        sound: "default",
        ...(Platform.OS === "android" && { channelId: "peakpulse-meals" }),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 12,
        minute: 30,
      },
    });
    ids.push(lunchId);

    // Evening progress check
    const eveningId = await Notifications.scheduleNotificationAsync({
      content: {
        title: "Daily Check-In",
        body: "How was your day? Review your progress and plan tomorrow's meals.",
        data: { type: "progress_reminder" },
        sound: "default",
        ...(Platform.OS === "android" && { channelId: "peakpulse-default" }),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 20,
        minute: 0,
      },
    });
    ids.push(eveningId);

    await AsyncStorage.setItem(SCHEDULED_IDS_KEY, JSON.stringify(ids));
  } catch (err) {
    console.warn("[Notifications] Failed to schedule reminders:", err);
  }
}

/**
 * Schedule a one-time notification after a delay.
 */
export async function scheduleOneTimeNotification(
  title: string,
  body: string,
  delaySeconds: number,
  data?: Record<string, unknown>,
): Promise<string | null> {
  try {
    const enabled = await isNotificationsEnabled();
    if (!enabled) return null;

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data ?? {},
        sound: "default",
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: delaySeconds,
      },
    });
    return id;
  } catch (err) {
    console.warn("[Notifications] Failed to schedule notification:", err);
    return null;
  }
}

/**
 * Get count of currently scheduled notifications.
 */
export async function getScheduledNotificationCount(): Promise<number> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  return scheduled.length;
}
