/**
 * AI-Powered Notification Scheduler
 *
 * Schedules contextual push notifications for:
 * - Meal reminders (breakfast, lunch, dinner) with personalised messages
 * - Workout nudges based on user's schedule
 * - Pantry expiry alerts
 * - Morning motivation with streak/progress data
 * - Evening recap with day's calorie/workout summary
 * - Progress milestone celebrations
 *
 * All notifications deep-link to relevant screens.
 */

import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ── Storage Keys ──
const PREFIX = "@ai_notif_";
const BREAKFAST_KEY = `${PREFIX}breakfast`;
const LUNCH_KEY = `${PREFIX}lunch`;
const DINNER_KEY = `${PREFIX}dinner`;
const MORNING_MOTIVATION_KEY = `${PREFIX}morning_motivation`;
const EVENING_RECAP_KEY = `${PREFIX}evening_recap`;
const WORKOUT_NUDGE_KEY = `${PREFIX}workout_nudge`;
const PANTRY_EXPIRY_KEY = `${PREFIX}pantry_expiry`;
const SNACK_KEY = `${PREFIX}snack`;
const PREFS_KEY = `${PREFIX}preferences`;

export interface NotificationPreferences {
  mealReminders: boolean;
  workoutNudges: boolean;
  morningMotivation: boolean;
  eveningRecap: boolean;
  pantryAlerts: boolean;
  snackReminder: boolean;
  // Custom times (24h format)
  breakfastHour: number;
  breakfastMinute: number;
  lunchHour: number;
  lunchMinute: number;
  dinnerHour: number;
  dinnerMinute: number;
  workoutHour: number;
  workoutMinute: number;
  morningHour: number;
  morningMinute: number;
  eveningHour: number;
  eveningMinute: number;
}

const DEFAULT_PREFS: NotificationPreferences = {
  mealReminders: true,
  workoutNudges: true,
  morningMotivation: true,
  eveningRecap: true,
  pantryAlerts: true,
  snackReminder: true,
  breakfastHour: 8,
  breakfastMinute: 0,
  lunchHour: 12,
  lunchMinute: 30,
  dinnerHour: 18,
  dinnerMinute: 30,
  workoutHour: 7,
  workoutMinute: 30,
  morningHour: 7,
  morningMinute: 0,
  eveningHour: 21,
  eveningMinute: 0,
};

// ── Preference Management ──

export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  try {
    const raw = await AsyncStorage.getItem(PREFS_KEY);
    if (raw) return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {}
  return { ...DEFAULT_PREFS };
}

export async function saveNotificationPreferences(prefs: Partial<NotificationPreferences>): Promise<NotificationPreferences> {
  const current = await getNotificationPreferences();
  const updated = { ...current, ...prefs };
  await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(updated));
  return updated;
}

// ── Helper: Cancel a stored notification ──

async function cancelStored(key: string): Promise<void> {
  const id = await AsyncStorage.getItem(key);
  if (id) {
    await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
    await AsyncStorage.removeItem(key);
  }
}

// ── Helper: Schedule and store ──

async function scheduleAndStore(
  key: string,
  content: Notifications.NotificationContentInput,
  trigger: any,
): Promise<string | null> {
  if (Platform.OS === "web") return null;
  await cancelStored(key);
  try {
    const id = await Notifications.scheduleNotificationAsync({ content, trigger });
    await AsyncStorage.setItem(key, id);
    return id;
  } catch (err) {
    console.warn(`Failed to schedule notification [${key}]:`, err);
    return null;
  }
}

// ── Helper: Get user context for personalised messages ──

interface UserContext {
  name: string;
  streakDays: number;
  todayCalories: number;
  calorieGoal: number;
  workoutsThisWeek: number;
  pantryExpiringCount: number;
  goal: string;
}

async function getUserContext(): Promise<UserContext> {
  try {
    const [profileRaw, settingsRaw, sessionsRaw, pantryRaw] = await Promise.all([
      AsyncStorage.getItem("@user_profile"),
      AsyncStorage.getItem("@user_settings"),
      AsyncStorage.getItem("@workout_sessions_local"),
      AsyncStorage.getItem("@pantry_items"),
    ]);

    const profile = profileRaw ? JSON.parse(profileRaw) : {};
    const settings = settingsRaw ? JSON.parse(settingsRaw) : {};
    const sessions: any[] = sessionsRaw ? JSON.parse(sessionsRaw) : [];
    const pantryItems: any[] = pantryRaw ? JSON.parse(pantryRaw) : [];

    // Calculate streak
    const allDates = new Set(sessions.map((s: any) => (s.completedAt || "").split("T")[0]).filter(Boolean));
    let streak = 0;
    const checkDate = new Date();
    if (!allDates.has(checkDate.toISOString().split("T")[0])) {
      checkDate.setDate(checkDate.getDate() - 1);
    }
    while (allDates.has(checkDate.toISOString().split("T")[0])) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }

    // Workouts this week
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const workoutsThisWeek = sessions.filter((s: any) => new Date(s.completedAt) >= weekAgo).length;

    // Pantry expiring items (within 2 days)
    const twoDaysFromNow = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    const expiringCount = pantryItems.filter((item: any) =>
      item.expiresAt && new Date(item.expiresAt) <= twoDaysFromNow && new Date(item.expiresAt) > new Date()
    ).length;

    return {
      name: profile.name || settings.name || "there",
      streakDays: streak,
      todayCalories: 0, // Will be populated from calorie tracker
      calorieGoal: settings.calorieGoal || profile.calorieGoal || 2000,
      workoutsThisWeek,
      pantryExpiringCount: expiringCount,
      goal: settings.goal || profile.goal || "general fitness",
    };
  } catch {
    return {
      name: "there",
      streakDays: 0,
      todayCalories: 0,
      calorieGoal: 2000,
      workoutsThisWeek: 0,
      pantryExpiringCount: 0,
      goal: "general fitness",
    };
  }
}

// ── Meal Reminder Messages ──

function getBreakfastMessages(name: string, goal: string): { title: string; body: string }[] {
  const firstName = name.split(" ")[0];
  return [
    { title: "🍳 Breakfast Time!", body: `Good morning, ${firstName}! Start your day right — fuel up with a healthy breakfast and log it.` },
    { title: "🌅 Rise & Fuel", body: `Morning, ${firstName}! Breakfast is the foundation of a great day. Check your AI meal plan.` },
    { title: "☀️ Good Morning!", body: `Time for breakfast! Eating within an hour of waking boosts metabolism. Don't skip it, ${firstName}.` },
    { title: "🥑 Breakfast Reminder", body: `Hey ${firstName}! Your body needs fuel after fasting overnight. Log your breakfast to stay on track.` },
  ];
}

function getLunchMessages(name: string, goal: string): { title: string; body: string }[] {
  const firstName = name.split(" ")[0];
  return [
    { title: "🥗 Lunch Time!", body: `Midday fuel-up, ${firstName}! Check your AI-suggested lunch and log your meal.` },
    { title: "🍽️ Lunch Reminder", body: `Hey ${firstName}! Consistent lunch timing helps maintain energy levels. What are you having?` },
    { title: "🥙 Time to Eat", body: `Lunch break, ${firstName}! A balanced meal now keeps afternoon cravings at bay. Log it in PeakPulse.` },
    { title: "🍱 Midday Fuel", body: `Don't forget lunch! Your ${goal.replace(/_/g, " ")} goal needs consistent nutrition, ${firstName}.` },
  ];
}

function getDinnerMessages(name: string, goal: string): { title: string; body: string }[] {
  const firstName = name.split(" ")[0];
  return [
    { title: "🍽️ Dinner Time!", body: `Evening, ${firstName}! Time for dinner. Check your pantry for tonight's AI-suggested meal.` },
    { title: "🌙 Dinner Reminder", body: `Last meal of the day, ${firstName}! Log your dinner to complete today's nutrition tracking.` },
    { title: "🥘 Time for Dinner", body: `Hey ${firstName}! A nutritious dinner supports overnight recovery. What's on the menu?` },
    { title: "🍲 Evening Meal", body: `Dinner time! Check your Cook Again favourites for a quick, healthy meal, ${firstName}.` },
  ];
}

// ── Workout Messages ──

function getWorkoutMessages(name: string, streak: number, workoutsThisWeek: number): { title: string; body: string }[] {
  const firstName = name.split(" ")[0];
  const msgs: { title: string; body: string }[] = [
    { title: "💪 Workout Time!", body: `Let's go, ${firstName}! Your personalised workout is ready. ${streak > 0 ? `Day ${streak + 1} of your streak!` : "Start a new streak today!"}` },
    { title: "🔥 Time to Train", body: `Hey ${firstName}! Consistency beats intensity. ${workoutsThisWeek} workout${workoutsThisWeek !== 1 ? "s" : ""} this week — let's add another.` },
    { title: "⚡ Workout Nudge", body: `Your body is ready, ${firstName}! A quick session now will boost your energy for the rest of the day.` },
  ];
  if (streak >= 3) {
    msgs.push({ title: "🔥 Don't Break the Streak!", body: `${streak} days strong, ${firstName}! Keep the momentum going with today's workout.` });
  }
  if (workoutsThisWeek === 0) {
    msgs.push({ title: "🏋️ Fresh Start", body: `New week, new you, ${firstName}! Kick off with a workout and set the tone for the week.` });
  }
  return msgs;
}

// ── Morning Motivation Messages ──

function getMorningMotivation(name: string, streak: number, goal: string): { title: string; body: string }[] {
  const firstName = name.split(" ")[0];
  const msgs = [
    { title: "🌅 Good Morning!", body: `Rise and shine, ${firstName}! Today is another chance to get closer to your ${goal.replace(/_/g, " ")} goal.` },
    { title: "☀️ New Day, New Gains", body: `Good morning! ${streak > 0 ? `You're on a ${streak}-day streak. Let's keep it going!` : "Today's a great day to start fresh."}` },
    { title: "💫 Morning Motivation", body: `Every day you show up is a win, ${firstName}. Your future self will thank you.` },
  ];
  if (new Date().getDay() === 1) {
    msgs.push({ title: "🚀 Monday Motivation", body: `Happy Monday, ${firstName}! Set your intentions for the week. What will you accomplish?` });
  }
  return msgs;
}

// ── Evening Recap Messages ──

function getEveningRecap(name: string, streak: number, workoutsThisWeek: number): { title: string; body: string }[] {
  const firstName = name.split(" ")[0];
  return [
    { title: "📊 Daily Recap", body: `Great day, ${firstName}! ${workoutsThisWeek} workout${workoutsThisWeek !== 1 ? "s" : ""} this week. ${streak > 0 ? `${streak}-day streak!` : "Start your streak tomorrow!"} Check your progress.` },
    { title: "🌙 End of Day Summary", body: `Winding down, ${firstName}? Review your meals and activity for today. Rest well — recovery is when gains happen.` },
    { title: "✨ Day Complete", body: `Another day in the books! ${streak > 0 ? `${streak} days of consistency.` : "Tomorrow is a fresh start."} Plan tomorrow's meals from your pantry.` },
  ];
}

// ── Pantry Expiry Messages ──

function getPantryExpiryMessages(name: string, count: number): { title: string; body: string }[] {
  const firstName = name.split(" ")[0];
  return [
    { title: "⚠️ Pantry Alert", body: `${firstName}, ${count} item${count > 1 ? "s" : ""} in your pantry ${count > 1 ? "are" : "is"} expiring soon! Check your pantry to use them before they go to waste.` },
    { title: "🥫 Use It or Lose It", body: `${count} pantry item${count > 1 ? "s" : ""} expiring soon. Open your Cook Again recipes for quick meal ideas, ${firstName}.` },
  ];
}

// ── Pick random message ──

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── Main Scheduling Functions ──

/**
 * Schedule all AI-powered notifications based on user preferences.
 * Call this on app launch and whenever preferences change.
 */
export async function scheduleAllAINotifications(): Promise<void> {
  if (Platform.OS === "web") return;

  const prefs = await getNotificationPreferences();
  const ctx = await getUserContext();

  // Ensure notification channel exists on Android
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("peakpulse-ai", {
      name: "AI Reminders",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#F59E0B",
    });
  }

  // ── Meal Reminders ──
  if (prefs.mealReminders) {
    const bMsg = pickRandom(getBreakfastMessages(ctx.name, ctx.goal));
    await scheduleAndStore(BREAKFAST_KEY, {
      title: bMsg.title,
      body: bMsg.body,
      data: { type: "meal_breakfast", url: "/(tabs)/meals" },
    }, {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: prefs.breakfastHour,
      minute: prefs.breakfastMinute,
    });

    const lMsg = pickRandom(getLunchMessages(ctx.name, ctx.goal));
    await scheduleAndStore(LUNCH_KEY, {
      title: lMsg.title,
      body: lMsg.body,
      data: { type: "meal_lunch", url: "/(tabs)/meals" },
    }, {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: prefs.lunchHour,
      minute: prefs.lunchMinute,
    });

    const dMsg = pickRandom(getDinnerMessages(ctx.name, ctx.goal));
    await scheduleAndStore(DINNER_KEY, {
      title: dMsg.title,
      body: dMsg.body,
      data: { type: "meal_dinner", url: "/(tabs)/meals" },
    }, {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: prefs.dinnerHour,
      minute: prefs.dinnerMinute,
    });
  } else {
    await cancelStored(BREAKFAST_KEY);
    await cancelStored(LUNCH_KEY);
    await cancelStored(DINNER_KEY);
  }

  // ── Snack Reminder (3pm) ──
  if (prefs.snackReminder) {
    await scheduleAndStore(SNACK_KEY, {
      title: "🍎 Snack Time",
      body: `Afternoon snack, ${ctx.name.split(" ")[0]}! A healthy snack keeps energy up and prevents overeating at dinner.`,
      data: { type: "meal_snack", url: "/(tabs)/meals" },
    }, {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 15,
      minute: 0,
    });
  } else {
    await cancelStored(SNACK_KEY);
  }

  // ── Workout Nudge ──
  if (prefs.workoutNudges) {
    const wMsg = pickRandom(getWorkoutMessages(ctx.name, ctx.streakDays, ctx.workoutsThisWeek));
    await scheduleAndStore(WORKOUT_NUDGE_KEY, {
      title: wMsg.title,
      body: wMsg.body,
      data: { type: "workout_nudge", url: "/(tabs)/workouts" },
    }, {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: prefs.workoutHour,
      minute: prefs.workoutMinute,
    });
  } else {
    await cancelStored(WORKOUT_NUDGE_KEY);
  }

  // ── Morning Motivation ──
  if (prefs.morningMotivation) {
    const mMsg = pickRandom(getMorningMotivation(ctx.name, ctx.streakDays, ctx.goal));
    await scheduleAndStore(MORNING_MOTIVATION_KEY, {
      title: mMsg.title,
      body: mMsg.body,
      data: { type: "morning_motivation", url: "/(tabs)" },
    }, {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: prefs.morningHour,
      minute: prefs.morningMinute,
    });
  } else {
    await cancelStored(MORNING_MOTIVATION_KEY);
  }

  // ── Evening Recap ──
  if (prefs.eveningRecap) {
    const eMsg = pickRandom(getEveningRecap(ctx.name, ctx.streakDays, ctx.workoutsThisWeek));
    await scheduleAndStore(EVENING_RECAP_KEY, {
      title: eMsg.title,
      body: eMsg.body,
      data: { type: "evening_recap", url: "/(tabs)" },
    }, {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: prefs.eveningHour,
      minute: prefs.eveningMinute,
    });
  } else {
    await cancelStored(EVENING_RECAP_KEY);
  }

  // ── Pantry Expiry Alert (6pm daily) ──
  if (prefs.pantryAlerts && ctx.pantryExpiringCount > 0) {
    const pMsg = pickRandom(getPantryExpiryMessages(ctx.name, ctx.pantryExpiringCount));
    await scheduleAndStore(PANTRY_EXPIRY_KEY, {
      title: pMsg.title,
      body: pMsg.body,
      data: { type: "pantry_expiry", url: "/pantry" },
    }, {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 18,
      minute: 0,
    });
  } else {
    await cancelStored(PANTRY_EXPIRY_KEY);
  }
}

/**
 * Cancel all AI-scheduled notifications.
 */
export async function cancelAllAINotifications(): Promise<void> {
  if (Platform.OS === "web") return;
  const keys = [
    BREAKFAST_KEY, LUNCH_KEY, DINNER_KEY, SNACK_KEY,
    WORKOUT_NUDGE_KEY, MORNING_MOTIVATION_KEY, EVENING_RECAP_KEY,
    PANTRY_EXPIRY_KEY,
  ];
  await Promise.all(keys.map(cancelStored));
}

/**
 * Send an immediate contextual notification (e.g. after completing a workout).
 */
export async function sendContextualNotification(
  type: "workout_complete" | "meal_logged" | "streak_milestone" | "pantry_expiry",
  data?: Record<string, any>,
): Promise<void> {
  if (Platform.OS === "web") return;

  const ctx = await getUserContext();
  const firstName = ctx.name.split(" ")[0];

  let content: Notifications.NotificationContentInput;

  switch (type) {
    case "workout_complete":
      content = {
        title: "🎉 Workout Complete!",
        body: `Great job, ${firstName}! ${ctx.streakDays > 0 ? `${ctx.streakDays + 1}-day streak!` : "You just started a new streak!"} Rest, recover, and fuel up.`,
        data: { type: "workout_complete", url: "/workout-calendar" },
      };
      break;
    case "meal_logged":
      content = {
        title: "✅ Meal Logged",
        body: `Nice, ${firstName}! Staying on top of your nutrition. ${data?.remaining ? `${data.remaining} kcal remaining today.` : ""}`,
        data: { type: "meal_logged", url: "/(tabs)/meals" },
      };
      break;
    case "streak_milestone": {
      const days = data?.days || ctx.streakDays;
      content = {
        title: `🔥 ${days}-Day Streak!`,
        body: `Incredible consistency, ${firstName}! ${days} days of showing up. You're building something amazing.`,
        data: { type: "streak_milestone", url: "/(tabs)" },
      };
      break;
    }
    case "pantry_expiry":
      content = {
        title: "⚠️ Pantry Items Expiring",
        body: `${data?.count || ctx.pantryExpiringCount} item${(data?.count || ctx.pantryExpiringCount) > 1 ? "s" : ""} expiring soon. Use them in a Cook Again recipe!`,
        data: { type: "pantry_expiry", url: "/pantry" },
      };
      break;
    default:
      return;
  }

  await Notifications.scheduleNotificationAsync({
    content,
    trigger: null, // Immediate
  });
}

/**
 * Get count of currently scheduled AI notifications.
 */
export async function getScheduledAINotificationCount(): Promise<number> {
  if (Platform.OS === "web") return 0;
  const all = await Notifications.getAllScheduledNotificationsAsync();
  return all.filter(n => {
    const type = (n.content.data as any)?.type || "";
    return type.startsWith("meal_") || type.startsWith("workout_") ||
      type === "morning_motivation" || type === "evening_recap" || type === "pantry_expiry";
  }).length;
}
