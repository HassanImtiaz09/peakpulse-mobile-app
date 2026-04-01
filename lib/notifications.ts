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
const TRIAL_DAY5_NOTIF_ID_KEY = "@trial_day5_notif_id";
const TRIAL_DAY7_NOTIF_ID_KEY = "@trial_day7_notif_id";
const AI_COACH_NOTIF_ID_KEY = "@ai_coach_weekly_notif_id";
export const AI_COACH_NOTIF_ENABLED_KEY = "@ai_coach_notif_enabled";

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
  await scheduleWeeklyAICoachReminder(19, 0);
  await scheduleMealTimeReminders(8, 0, 12, 30, 18, 30);
  await scheduleWaterReminder(2);
  await scheduleWeeklyRecapNotification(19, 0);
  await scheduleMealPlanRenewalReminder(18, 0);
}

export async function sendImmediateNotification(title: string, body: string): Promise<void> {
  if (Platform.OS === "web") return;
  await Notifications.scheduleNotificationAsync({
    content: { title, body },
    trigger: null,
  });
}

/**
 * Schedule Day 5 and Day 7 trial reminder notifications.
 * Call this immediately after the user starts their free trial.
 * @param trialStartDate ISO date string of when the trial started
 */
export async function scheduleTrialReminders(trialStartDate: string): Promise<void> {
  if (Platform.OS === "web") return;

  const granted = await requestNotificationPermissions();
  if (!granted) return;

  // Cancel any existing trial notifications first
  await cancelTrialReminders();

  const startDate = new Date(trialStartDate);

  // Day 5 reminder: fires at 10:00 AM on day 5 of the trial
  const day5Date = new Date(startDate);
  day5Date.setDate(day5Date.getDate() + 4); // 0-indexed: day 5 = +4 days
  day5Date.setHours(10, 0, 0, 0);

  // Only schedule if the trigger date is in the future
  if (day5Date > new Date()) {
    const day5Id = await Notifications.scheduleNotificationAsync({
      content: {
        title: "⚡ 2 Days Left on Your Free Trial!",
        body: "You've unlocked all Pro features. Don't lose access — subscribe now and keep your momentum going.",
        data: { url: "/subscription", type: "trial_day5_reminder" },
        categoryIdentifier: "peakpulse",
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: day5Date,
      },
    });
    await AsyncStorage.setItem(TRIAL_DAY5_NOTIF_ID_KEY, day5Id);
  }

  // Day 7 reminder: fires at 09:00 AM on the last day of the trial
  const day7Date = new Date(startDate);
  day7Date.setDate(day7Date.getDate() + 6); // day 7 = +6 days
  day7Date.setHours(9, 0, 0, 0);

  if (day7Date > new Date()) {
    const day7Id = await Notifications.scheduleNotificationAsync({
      content: {
        title: "🔥 Last Day of Your Free Trial!",
        body: "Your Pro access expires today. Subscribe now to keep your AI workout plans, Form Checker, and more.",
        data: { url: "/subscription", type: "trial_day7_reminder" },
        categoryIdentifier: "peakpulse",
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: day7Date,
      },
    });
    await AsyncStorage.setItem(TRIAL_DAY7_NOTIF_ID_KEY, day7Id);
  }
}

/**
 * Schedule a weekly AI Coach progress update reminder.
 * Fires every Sunday at 19:00 (7 PM) by default.
 * Respects the user's opt-in preference stored in AsyncStorage.
 * @param hour  Hour of day to fire (0-23, default 19)
 * @param minute Minute of hour (default 0)
 */
export async function scheduleWeeklyAICoachReminder(hour: number = 19, minute: number = 0): Promise<void> {
  if (Platform.OS === "web") return;

  // Check opt-in preference (default enabled)
  const prefRaw = await AsyncStorage.getItem(AI_COACH_NOTIF_ENABLED_KEY);
  const enabled = prefRaw === null ? true : prefRaw === "true";
  if (!enabled) return;

  const granted = await requestNotificationPermissions();
  if (!granted) return;

  // Cancel any existing weekly AI Coach notification
  await cancelWeeklyAICoachReminder();

  const messages = [
    { title: "🤖 Your Weekly AI Coach Report is Ready", body: "See how your form, progress, and consistency have improved this week. Open AI Coach now." },
    { title: "⚡ Weekly Progress Check-In", body: "Your AI Coach has analysed your week. Tap to see personalised insights and your next focus area." },
    { title: "💪 Time for Your Weekly Review", body: "How did this week go? Your AI Coach has tips and a plan to make next week even better." },
    { title: "📊 AI Coach: Weekly Insights Available", body: "Your form scores, calorie trends, and progress photos have been analysed. Check your report." },
  ];
  const msg = messages[Math.floor(Math.random() * messages.length)];

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: msg.title,
      body: msg.body,
      data: { url: "/ai-coach", type: "ai_coach_weekly" },
      categoryIdentifier: "peakpulse",
    },
    trigger: {
      weekday: 1, // 1 = Sunday in Expo (1=Sun, 2=Mon, ... 7=Sat)
      hour,
      minute,
      repeats: true,
    } as any,
  });

  await AsyncStorage.setItem(AI_COACH_NOTIF_ID_KEY, id);
}

/**
 * Cancel the weekly AI Coach reminder notification.
 */
export async function cancelWeeklyAICoachReminder(): Promise<void> {
  if (Platform.OS === "web") return;
  const existingId = await AsyncStorage.getItem(AI_COACH_NOTIF_ID_KEY);
  if (existingId) {
    await Notifications.cancelScheduledNotificationAsync(existingId).catch(() => {});
    await AsyncStorage.removeItem(AI_COACH_NOTIF_ID_KEY);
  }
}

/**
 * Toggle the weekly AI Coach reminder on or off.
 * Schedules or cancels the notification based on the new enabled state.
 */
export async function setAICoachReminderEnabled(enabled: boolean, hour: number = 19, minute: number = 0): Promise<void> {
  await AsyncStorage.setItem(AI_COACH_NOTIF_ENABLED_KEY, String(enabled));
  if (enabled) {
    await scheduleWeeklyAICoachReminder(hour, minute);
  } else {
    await cancelWeeklyAICoachReminder();
  }
}

/**
 * Cancel all scheduled trial reminder notifications.
 * Call this when the user subscribes to a paid plan.
 */
const BREAKFAST_NOTIF_ID_KEY = "@breakfast_notif_id";
const LUNCH_NOTIF_ID_KEY = "@lunch_notif_id";
const DINNER_NOTIF_ID_KEY = "@dinner_notif_id";
const WATER_NOTIF_ID_KEY = "@water_notif_id";

/**
 * Schedule breakfast, lunch, and dinner meal-time reminders.
 * These are separate from the general meal log reminder — they fire at each meal time.
 */
export async function scheduleMealTimeReminders(
  breakfastHour = 8, breakfastMinute = 0,
  lunchHour = 12, lunchMinute = 30,
  dinnerHour = 18, dinnerMinute = 30,
): Promise<void> {
  if (Platform.OS === "web") return;

  // Cancel existing
  for (const key of [BREAKFAST_NOTIF_ID_KEY, LUNCH_NOTIF_ID_KEY, DINNER_NOTIF_ID_KEY]) {
    const existingId = await AsyncStorage.getItem(key);
    if (existingId) await Notifications.cancelScheduledNotificationAsync(existingId).catch(() => {});
  }

  const bId = await Notifications.scheduleNotificationAsync({
    content: {
      title: "🍳 Breakfast Time!",
      body: "Start your day right — check your AI meal plan for today's breakfast.",
      data: { type: "meal_breakfast", url: "/(tabs)/meals" },
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: breakfastHour, minute: breakfastMinute },
  });
  await AsyncStorage.setItem(BREAKFAST_NOTIF_ID_KEY, bId);

  const lId = await Notifications.scheduleNotificationAsync({
    content: {
      title: "🥗 Lunch Time!",
      body: "Midday fuel-up — your planned lunch is waiting in PeakPulse.",
      data: { type: "meal_lunch", url: "/(tabs)/meals" },
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: lunchHour, minute: lunchMinute },
  });
  await AsyncStorage.setItem(LUNCH_NOTIF_ID_KEY, lId);

  const dId = await Notifications.scheduleNotificationAsync({
    content: {
      title: "🍽️ Dinner Time!",
      body: "End the day strong — check your AI meal plan for tonight's dinner.",
      data: { type: "meal_dinner", url: "/(tabs)/meals" },
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: dinnerHour, minute: dinnerMinute },
  });
  await AsyncStorage.setItem(DINNER_NOTIF_ID_KEY, dId);
}

/**
 * Cancel all meal-time reminders.
 */
export async function cancelMealTimeReminders(): Promise<void> {
  if (Platform.OS === "web") return;
  for (const key of [BREAKFAST_NOTIF_ID_KEY, LUNCH_NOTIF_ID_KEY, DINNER_NOTIF_ID_KEY]) {
    const existingId = await AsyncStorage.getItem(key);
    if (existingId) await Notifications.cancelScheduledNotificationAsync(existingId).catch(() => {});
  }
  await AsyncStorage.multiRemove([BREAKFAST_NOTIF_ID_KEY, LUNCH_NOTIF_ID_KEY, DINNER_NOTIF_ID_KEY]);
}

/**
 * Schedule a repeating water intake reminder.
 * @param intervalHours Hours between each reminder (default 2)
 */
export async function scheduleWaterReminder(intervalHours: number = 2): Promise<void> {
  if (Platform.OS === "web") return;

  const existingId = await AsyncStorage.getItem(WATER_NOTIF_ID_KEY);
  if (existingId) await Notifications.cancelScheduledNotificationAsync(existingId).catch(() => {});

  const messages = [
    { title: "💧 Stay Hydrated!", body: "Time for a glass of water. Your body needs it!" },
    { title: "💧 Water Break!", body: "Don't forget to drink water — staying hydrated boosts performance." },
    { title: "💧 Hydration Reminder", body: "Grab some water! Proper hydration helps recovery and focus." },
  ];
  const msg = messages[Math.floor(Math.random() * messages.length)];

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: msg.title,
      body: msg.body,
      data: { type: "water_reminder", url: "/(tabs)/meals" },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: intervalHours * 3600,
      repeats: true,
    },
  });
  await AsyncStorage.setItem(WATER_NOTIF_ID_KEY, id);
}

/**
 * Cancel the water intake reminder.
 */
export async function cancelWaterReminder(): Promise<void> {
  if (Platform.OS === "web") return;
  const existingId = await AsyncStorage.getItem(WATER_NOTIF_ID_KEY);
  if (existingId) await Notifications.cancelScheduledNotificationAsync(existingId).catch(() => {});
  await AsyncStorage.removeItem(WATER_NOTIF_ID_KEY);
}

const WEEKLY_RECAP_NOTIF_ID_KEY = "@weekly_recap_notif_id";
export const WEEKLY_RECAP_ENABLED_KEY = "@weekly_recap_enabled";

/**
 * Build the weekly workout recap content from local + server session data.
 * Reads from AsyncStorage and returns a formatted notification body.
 */
async function buildWeeklyRecapContent(): Promise<{ title: string; body: string }> {
  // Get sessions from the past 7 days
  const raw = await AsyncStorage.getItem("@workout_sessions_local");
  const localSessions: Array<{ durationMinutes?: number; completedAt: string; completedExercisesJson?: string }> = raw ? JSON.parse(raw) : [];

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const thisWeekSessions = localSessions.filter(s => new Date(s.completedAt) >= weekAgo);
  const totalWorkouts = thisWeekSessions.length;
  const totalMinutes = thisWeekSessions.reduce((sum, s) => sum + (s.durationMinutes ?? 0), 0);
  // Rough calorie estimate: ~7 kcal/min for moderate exercise
  const estimatedCalories = totalMinutes * 7;

  // Calculate current streak
  const allDates = new Set(localSessions.map(s => s.completedAt.split("T")[0]));
  let streak = 0;
  const checkDate = new Date(now);
  if (!allDates.has(checkDate.toISOString().split("T")[0])) {
    checkDate.setDate(checkDate.getDate() - 1);
  }
  while (allDates.has(checkDate.toISOString().split("T")[0])) {
    streak++;
    checkDate.setDate(checkDate.getDate() - 1);
  }

  if (totalWorkouts === 0) {
    return {
      title: "\ud83d\udcca Weekly Recap",
      body: "No workouts logged this week. Start fresh tomorrow \u2014 even one session builds momentum! \ud83d\udcaa",
    };
  }

  const streakText = streak > 0 ? ` \ud83d\udd25 ${streak}-day streak!` : "";
  return {
    title: `\ud83d\udcca Weekly Recap: ${totalWorkouts} Workout${totalWorkouts !== 1 ? "s" : ""}!`,
    body: `This week: ${totalWorkouts} workout${totalWorkouts !== 1 ? "s" : ""}, ${totalMinutes} min, ~${estimatedCalories} kcal burned.${streakText} Keep it up!`,
  };
}

/**
 * Schedule a weekly workout recap notification for Sunday at 7pm.
 * The notification content is built dynamically when it fires.
 * Since Expo local notifications need static content at schedule time,
 * we reschedule every Sunday with fresh data.
 */
export async function scheduleWeeklyRecapNotification(hour: number = 19, minute: number = 0): Promise<void> {
  if (Platform.OS === "web") return;

  const prefRaw = await AsyncStorage.getItem(WEEKLY_RECAP_ENABLED_KEY);
  const enabled = prefRaw === null ? true : prefRaw === "true";
  if (!enabled) return;

  const granted = await requestNotificationPermissions();
  if (!granted) return;

  await cancelWeeklyRecapNotification();

  const { title, body } = await buildWeeklyRecapContent();

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: { url: "/workout-calendar", type: "weekly_recap" },
      categoryIdentifier: "peakpulse",
    },
    trigger: {
      weekday: 1, // 1 = Sunday in Expo
      hour,
      minute,
      repeats: true,
    } as any,
  });

  await AsyncStorage.setItem(WEEKLY_RECAP_NOTIF_ID_KEY, id);
}

/**
 * Cancel the weekly recap notification.
 */
export async function cancelWeeklyRecapNotification(): Promise<void> {
  if (Platform.OS === "web") return;
  const existingId = await AsyncStorage.getItem(WEEKLY_RECAP_NOTIF_ID_KEY);
  if (existingId) {
    await Notifications.cancelScheduledNotificationAsync(existingId).catch(() => {});
    await AsyncStorage.removeItem(WEEKLY_RECAP_NOTIF_ID_KEY);
  }
}

/**
 * Toggle the weekly recap notification on or off.
 */
export async function setWeeklyRecapEnabled(enabled: boolean, hour: number = 19, minute: number = 0): Promise<void> {
  await AsyncStorage.setItem(WEEKLY_RECAP_ENABLED_KEY, String(enabled));
  if (enabled) {
    await scheduleWeeklyRecapNotification(hour, minute);
  } else {
    await cancelWeeklyRecapNotification();
  }
}

export async function cancelTrialReminders(): Promise<void> {
  if (Platform.OS === "web") return;

  const [day5Id, day7Id] = await Promise.all([
    AsyncStorage.getItem(TRIAL_DAY5_NOTIF_ID_KEY),
    AsyncStorage.getItem(TRIAL_DAY7_NOTIF_ID_KEY),
  ]);

  await Promise.all([
    day5Id ? Notifications.cancelScheduledNotificationAsync(day5Id).catch(() => {}) : Promise.resolve(),
    day7Id ? Notifications.cancelScheduledNotificationAsync(day7Id).catch(() => {}) : Promise.resolve(),
  ]);

  await AsyncStorage.multiRemove([TRIAL_DAY5_NOTIF_ID_KEY, TRIAL_DAY7_NOTIF_ID_KEY]);
}

// ── Progress Photo Reminder Notifications ──────────────────────────────────

const PROGRESS_PHOTO_NOTIF_ID_KEY = "@progress_photo_notif_id";
export const PROGRESS_PHOTO_FREQUENCY_KEY = "@progress_photo_frequency"; // "daily" | "weekly" | "off"
export const PROGRESS_PHOTO_HOUR_KEY = "@progress_photo_hour";
export const PROGRESS_PHOTO_MINUTE_KEY = "@progress_photo_minute";
export const PROGRESS_PHOTO_WEEKDAY_KEY = "@progress_photo_weekday"; // 1-7 for weekly (1=Sun)

/**
 * Schedule a progress photo reminder notification.
 * @param frequency "daily" | "weekly" | "off"
 * @param hour Hour of day (0-23, default 9)
 * @param minute Minute (default 0)
 * @param weekday Day of week for weekly (1=Sun, 2=Mon, ..., 7=Sat; default 2=Monday)
 */
export async function scheduleProgressPhotoReminder(
  frequency: "daily" | "weekly" | "off" = "daily",
  hour: number = 9,
  minute: number = 0,
  weekday: number = 2,
): Promise<void> {
  if (Platform.OS === "web") return;

  // Cancel existing
  await cancelProgressPhotoReminder();

  if (frequency === "off") return;

  const granted = await requestNotificationPermissions();
  if (!granted) return;

  // Save preferences
  await AsyncStorage.setItem(PROGRESS_PHOTO_FREQUENCY_KEY, frequency);
  await AsyncStorage.setItem(PROGRESS_PHOTO_HOUR_KEY, String(hour));
  await AsyncStorage.setItem(PROGRESS_PHOTO_MINUTE_KEY, String(minute));
  await AsyncStorage.setItem(PROGRESS_PHOTO_WEEKDAY_KEY, String(weekday));

  const dailyMessages = [
    { title: "📸 Progress Photo Time!", body: "Take your daily progress photo to track your transformation journey." },
    { title: "📸 Capture Your Progress", body: "A quick photo today keeps your transformation on track. Open Body Scan now!" },
    { title: "📸 Daily Photo Reminder", body: "Consistency is key! Take your progress photo to see how far you've come." },
  ];

  const weeklyMessages = [
    { title: "📸 Weekly Progress Photo", body: "It's time for your weekly body transformation check-in. See your progress!" },
    { title: "📸 Weekly Check-In", body: "Take your weekly progress photo and compare with last week. You're doing great!" },
    { title: "📸 Transformation Update", body: "Your weekly progress photo is due! Track your body transformation journey." },
  ];

  const messages = frequency === "daily" ? dailyMessages : weeklyMessages;
  const msg = messages[Math.floor(Math.random() * messages.length)];

  let trigger: any;
  if (frequency === "daily") {
    trigger = {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    };
  } else {
    // Weekly
    trigger = {
      weekday,
      hour,
      minute,
      repeats: true,
    };
  }

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: msg.title,
      body: msg.body,
      data: { url: "/(tabs)/scan", type: "progress_photo_reminder" },
      categoryIdentifier: "peakpulse",
    },
    trigger,
  });

  await AsyncStorage.setItem(PROGRESS_PHOTO_NOTIF_ID_KEY, id);
}

/**
 * Cancel the progress photo reminder notification.
 */
export async function cancelProgressPhotoReminder(): Promise<void> {
  if (Platform.OS === "web") return;
  const existingId = await AsyncStorage.getItem(PROGRESS_PHOTO_NOTIF_ID_KEY);
  if (existingId) {
    await Notifications.cancelScheduledNotificationAsync(existingId).catch(() => {});
    await AsyncStorage.removeItem(PROGRESS_PHOTO_NOTIF_ID_KEY);
  }
}

/**
 * Get the current progress photo reminder settings.
 */
export async function getProgressPhotoReminderSettings(): Promise<{
  frequency: "daily" | "weekly" | "off";
  hour: number;
  minute: number;
  weekday: number;
}> {
  const frequency = (await AsyncStorage.getItem(PROGRESS_PHOTO_FREQUENCY_KEY)) as "daily" | "weekly" | "off" | null;
  const hour = parseInt(await AsyncStorage.getItem(PROGRESS_PHOTO_HOUR_KEY) ?? "9", 10);
  const minute = parseInt(await AsyncStorage.getItem(PROGRESS_PHOTO_MINUTE_KEY) ?? "0", 10);
  const weekday = parseInt(await AsyncStorage.getItem(PROGRESS_PHOTO_WEEKDAY_KEY) ?? "2", 10);
  return {
    frequency: frequency ?? "off",
    hour,
    minute,
    weekday,
  };
}

// ── Pantry Expiry Alerts ────────────────────────────────────────────
const PANTRY_EXPIRY_NOTIF_IDS_KEY = "@pantry_expiry_notif_ids";

export interface PantryExpiryItem {
  name: string;
  expiresAt: string; // ISO date
  daysLeft: number;
}

/**
 * Schedule push notifications for pantry items expiring within 1-3 days.
 * Call this whenever the pantry changes or on app launch.
 */
export async function schedulePantryExpiryAlerts(
  expiringItems: PantryExpiryItem[]
): Promise<void> {
  if (Platform.OS === "web") return;

  // Cancel previous pantry expiry notifications
  await cancelPantryExpiryAlerts();

  if (expiringItems.length === 0) return;

  const ids: string[] = [];

  // Group items by urgency
  const expiredOrToday = expiringItems.filter(i => i.daysLeft <= 0);
  const tomorrow = expiringItems.filter(i => i.daysLeft === 1);
  const soonItems = expiringItems.filter(i => i.daysLeft === 2 || i.daysLeft === 3);

  // Immediate alert for items expiring today or already expired
  if (expiredOrToday.length > 0) {
    const names = expiredOrToday.map(i => i.name).join(", ");
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: "⚠️ Pantry Items Expiring Today!",
        body: `${names} ${expiredOrToday.length === 1 ? "is" : "are"} expiring today. Use ${expiredOrToday.length === 1 ? "it" : "them"} up before ${expiredOrToday.length === 1 ? "it goes" : "they go"} to waste!`,
        data: { type: "pantry_expiry", screen: "meals", tab: 2 },
        sound: "default",
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 5 },
    });
    ids.push(id);
  }

  // Alert for items expiring tomorrow — schedule for 9 AM tomorrow
  if (tomorrow.length > 0) {
    const names = tomorrow.map(i => i.name).join(", ");
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: "🕐 Pantry Items Expire Tomorrow",
        body: `${names} will expire tomorrow. Tap to see meal suggestions using these items.`,
        data: { type: "pantry_expiry", screen: "meals", tab: 2 },
        sound: "default",
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 3600 },
    });
    ids.push(id);
  }

  // Alert for items expiring in 2-3 days — schedule as a gentle reminder
  if (soonItems.length > 0) {
    const names = soonItems.map(i => i.name).join(", ");
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: "📋 Pantry Items Expiring Soon",
        body: `${names} will expire in 2-3 days. Plan meals around these items to reduce waste.`,
        data: { type: "pantry_expiry", screen: "meals", tab: 2 },
        sound: "default",
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 7200 },
    });
    ids.push(id);
  }

  // Save notification IDs for later cancellation
  await AsyncStorage.setItem(PANTRY_EXPIRY_NOTIF_IDS_KEY, JSON.stringify(ids));
}

/**
 * Cancel all previously scheduled pantry expiry notifications.
 */
export async function cancelPantryExpiryAlerts(): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    const raw = await AsyncStorage.getItem(PANTRY_EXPIRY_NOTIF_IDS_KEY);
    if (raw) {
      const ids: string[] = JSON.parse(raw);
      for (const id of ids) {
        await Notifications.cancelScheduledNotificationAsync(id);
      }
    }
    await AsyncStorage.removeItem(PANTRY_EXPIRY_NOTIF_IDS_KEY);
  } catch {
    // ignore
  }
}

// ── Weekly Meal Plan Renewal Reminder ──────────────────────────────
const MEAL_PLAN_RENEWAL_NOTIF_ID_KEY = "@meal_plan_renewal_notif_id";
export const MEAL_PLAN_RENEWAL_ENABLED_KEY = "@meal_plan_renewal_enabled";

/**
 * Schedule a weekly notification on Friday evening prompting the user
 * to generate next week's AI meal plan.
 * Fires every Friday at 18:00 (6 PM) by default.
 */
export async function scheduleMealPlanRenewalReminder(
  hour: number = 18,
  minute: number = 0,
): Promise<void> {
  if (Platform.OS === "web") return;

  // Check opt-in preference (default enabled)
  const prefRaw = await AsyncStorage.getItem(MEAL_PLAN_RENEWAL_ENABLED_KEY);
  const enabled = prefRaw === null ? true : prefRaw === "true";
  if (!enabled) return;

  const granted = await requestNotificationPermissions();
  if (!granted) return;

  // Cancel any existing renewal notification
  await cancelMealPlanRenewalReminder();

  const messages = [
    { title: "🗓️ Time for Next Week's Meal Plan!", body: "Your current meal plan ends soon. Tap to generate a fresh week of delicious, varied meals." },
    { title: "🍽️ Plan Next Week's Meals", body: "Stay on track — generate your AI meal plan for next week before the weekend starts!" },
    { title: "📋 New Week, New Meals!", body: "Ready for variety? Generate next week's meal plan now and keep your nutrition goals on point." },
    { title: "⚡ Meal Plan Refresh Available", body: "Your weekly meal plan is wrapping up. Tap to create a brand new plan with fresh recipes!" },
  ];
  const msg = messages[Math.floor(Math.random() * messages.length)];

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: msg.title,
      body: msg.body,
      data: { url: "/(tabs)/meals", type: "meal_plan_renewal" },
      categoryIdentifier: "peakpulse",
    },
    trigger: {
      weekday: 6, // 6 = Friday in Expo (1=Sun, 2=Mon, ... 6=Fri, 7=Sat)
      hour,
      minute,
      repeats: true,
    } as any,
  });

  await AsyncStorage.setItem(MEAL_PLAN_RENEWAL_NOTIF_ID_KEY, id);
}

/**
 * Cancel the weekly meal plan renewal reminder.
 */
export async function cancelMealPlanRenewalReminder(): Promise<void> {
  if (Platform.OS === "web") return;
  const existingId = await AsyncStorage.getItem(MEAL_PLAN_RENEWAL_NOTIF_ID_KEY);
  if (existingId) {
    await Notifications.cancelScheduledNotificationAsync(existingId).catch(() => {});
    await AsyncStorage.removeItem(MEAL_PLAN_RENEWAL_NOTIF_ID_KEY);
  }
}

/**
 * Toggle the weekly meal plan renewal reminder on or off.
 */
export async function setMealPlanRenewalEnabled(
  enabled: boolean,
  hour: number = 18,
  minute: number = 0,
): Promise<void> {
  await AsyncStorage.setItem(MEAL_PLAN_RENEWAL_ENABLED_KEY, String(enabled));
  if (enabled) {
    await scheduleMealPlanRenewalReminder(hour, minute);
  } else {
    await cancelMealPlanRenewalReminder();
  }
}
