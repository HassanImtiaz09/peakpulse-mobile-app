import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const NOTIF_PERM_KEY = "@notif_permission_requested";
const WORKOUT_NOTIF_ID_KEY = "@workout_notif_id";
const MEAL_NOTIF_ID_KEY = "@meal_notif_id";
const CHECKIN_NOTIF_ID_KEY = "@checkin_notif_id";

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === "web") return false;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("peakpulse", {
      name: "PeakPulse AI",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#7C3AED",
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  if (existingStatus === "granted") return true;

  const { status } = await Notifications.requestPermissionsAsync();
  await AsyncStorage.setItem(NOTIF_PERM_KEY, "true");
  return status === "granted";
}

export async function scheduleWorkoutReminder(hour: number = 8, minute: number = 0): Promise<void> {
  if (Platform.OS === "web") return;

  // Cancel existing
  const existingId = await AsyncStorage.getItem(WORKOUT_NOTIF_ID_KEY);
  if (existingId) {
    await Notifications.cancelScheduledNotificationAsync(existingId).catch(() => {});
  }

  const messages = [
    { title: "💪 Time to Train!", body: "Your workout is waiting. Let's crush today's session!" },
    { title: "🔥 Workout Time", body: "Consistency is key. Your future self will thank you." },
    { title: "⚡ PeakPulse Reminder", body: "Don't skip today — every rep counts toward your goal." },
    { title: "🏋️ Let's Go!", body: "Your personalized workout plan is ready. Time to move!" },
  ];
  const msg = messages[Math.floor(Math.random() * messages.length)];

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: msg.title,
      body: msg.body,
      data: { type: "workout_reminder" },
      categoryIdentifier: "peakpulse",
    },
    trigger: {
      hour,
      minute,
      repeats: true,
    } as any,
  });

  await AsyncStorage.setItem(WORKOUT_NOTIF_ID_KEY, id);
}

export async function scheduleMealLogReminder(hour: number = 12, minute: number = 30): Promise<void> {
  if (Platform.OS === "web") return;

  const existingId = await AsyncStorage.getItem(MEAL_NOTIF_ID_KEY);
  if (existingId) {
    await Notifications.cancelScheduledNotificationAsync(existingId).catch(() => {});
  }

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: "🥗 Meal Log Reminder",
      body: "Don't forget to log your meals! Track nutrition to hit your goals.",
      data: { type: "meal_reminder" },
    },
    trigger: {
      hour,
      minute,
      repeats: true,
    } as any,
  });

  await AsyncStorage.setItem(MEAL_NOTIF_ID_KEY, id);
}

export async function scheduleDailyCheckInReminder(hour: number = 7, minute: number = 0): Promise<void> {
  if (Platform.OS === "web") return;

  const existingId = await AsyncStorage.getItem(CHECKIN_NOTIF_ID_KEY);
  if (existingId) {
    await Notifications.cancelScheduledNotificationAsync(existingId).catch(() => {});
  }

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: "📸 Daily Check-In",
      body: "Take your daily progress photo and keep your streak alive! 🔥",
      data: { type: "checkin_reminder" },
    },
    trigger: {
      hour,
      minute,
      repeats: true,
    } as any,
  });

  await AsyncStorage.setItem(CHECKIN_NOTIF_ID_KEY, id);
}

export async function cancelAllReminders(): Promise<void> {
  if (Platform.OS === "web") return;
  await Notifications.cancelAllScheduledNotificationsAsync();
  await AsyncStorage.multiRemove([WORKOUT_NOTIF_ID_KEY, MEAL_NOTIF_ID_KEY, CHECKIN_NOTIF_ID_KEY]);
}

export async function scheduleAllDefaultReminders(): Promise<void> {
  const granted = await requestNotificationPermissions();
  if (!granted) return;
  await scheduleWorkoutReminder(8, 0);
  await scheduleMealLogReminder(12, 30);
  await scheduleDailyCheckInReminder(7, 0);
}

export async function sendImmediateNotification(title: string, body: string): Promise<void> {
  if (Platform.OS === "web") return;
  await Notifications.scheduleNotificationAsync({
    content: { title, body },
    trigger: null,
  });
}
