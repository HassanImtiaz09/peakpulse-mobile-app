/**
 * Smart Reminders Service
 *
 * Intelligent push notification system that adapts to user behaviour:
 *
 * 1. **Streak Protection** — Detects when a user's streak is at risk (no workout today
 *    and it's past their usual workout time) and sends a nudge.
 * 2. **Comeback Nudge** — If the user hasn't worked out in 2+ days, sends an
 *    encouraging "we miss you" message.
 * 3. **Milestone Celebration** — Celebrates streak milestones (3, 7, 14, 30, 50, 100 days).
 * 4. **Rest Day Reminder** — On scheduled rest days, sends a recovery-focused message.
 * 5. **Weekly Schedule Awareness** — Knows which days the user typically works out and
 *    adjusts reminder intensity accordingly.
 * 6. **Progressive Urgency** — Reminders get more urgent as the day progresses if the
 *    user hasn't worked out yet.
 *
 * All settings are persisted in AsyncStorage and can be toggled individually.
 */

import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ── Storage Keys ──
const PREFIX = "@smart_remind_";
const SETTINGS_KEY = `${PREFIX}settings`;
const STREAK_PROTECT_KEY = `${PREFIX}streak_protect`;
const COMEBACK_KEY = `${PREFIX}comeback`;
const MILESTONE_KEY = `${PREFIX}milestone`;
const REST_DAY_KEY = `${PREFIX}rest_day`;
const MORNING_BOOST_KEY = `${PREFIX}morning_boost`;
const EVENING_PUSH_KEY = `${PREFIX}evening_push`;
const LAST_EVALUATED_KEY = `${PREFIX}last_evaluated`;

// ── Types ──

export interface SmartReminderSettings {
  enabled: boolean;
  streakProtection: boolean;
  comebackNudges: boolean;
  milestoneCelebrations: boolean;
  restDayReminders: boolean;
  morningBoost: boolean;
  eveningPush: boolean;
  /** Preferred workout hour (24h format, used for scheduling) */
  preferredWorkoutHour: number;
  /** Days the user typically works out (0=Sun, 1=Mon, ..., 6=Sat) */
  workoutDays: number[];
  /** Quiet hours — no notifications between these times */
  quietStart: number; // hour
  quietEnd: number;   // hour
}

export const DEFAULT_SETTINGS: SmartReminderSettings = {
  enabled: true,
  streakProtection: true,
  comebackNudges: true,
  milestoneCelebrations: true,
  restDayReminders: true,
  morningBoost: true,
  eveningPush: true,
  preferredWorkoutHour: 8,
  workoutDays: [1, 2, 3, 4, 5], // Mon-Fri by default
  quietStart: 22,
  quietEnd: 7,
};

// ── Settings Persistence ──

export async function getSmartReminderSettings(): Promise<SmartReminderSettings> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {}
  return { ...DEFAULT_SETTINGS };
}

export async function saveSmartReminderSettings(
  updates: Partial<SmartReminderSettings>,
): Promise<SmartReminderSettings> {
  const current = await getSmartReminderSettings();
  const updated = { ...current, ...updates };
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
  return updated;
}

// ── User Context ──

interface WorkoutContext {
  streakDays: number;
  daysSinceLastWorkout: number;
  workoutsThisWeek: number;
  workedOutToday: boolean;
  userName: string;
  todayDayOfWeek: number; // 0=Sun, 1=Mon, ..., 6=Sat
  currentHour: number;
}

export async function getWorkoutContext(): Promise<WorkoutContext> {
  try {
    const [profileRaw, settingsRaw, sessionsRaw] = await Promise.all([
      AsyncStorage.getItem("@user_profile"),
      AsyncStorage.getItem("@user_settings"),
      AsyncStorage.getItem("@workout_sessions_local"),
    ]);

    const profile = profileRaw ? JSON.parse(profileRaw) : {};
    const settings = settingsRaw ? JSON.parse(settingsRaw) : {};
    const sessions: Array<{ completedAt: string }> = sessionsRaw ? JSON.parse(sessionsRaw) : [];

    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];

    // Calculate streak
    const allDates = new Set(
      sessions.map(s => (s.completedAt || "").split("T")[0]).filter(Boolean),
    );
    let streak = 0;
    const checkDate = new Date(now);
    // If no workout today, start checking from yesterday
    if (!allDates.has(todayStr)) {
      checkDate.setDate(checkDate.getDate() - 1);
    }
    while (allDates.has(checkDate.toISOString().split("T")[0])) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }

    // Days since last workout
    let daysSinceLastWorkout = 999;
    if (sessions.length > 0) {
      const sorted = [...sessions].sort(
        (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime(),
      );
      const lastDate = new Date(sorted[0].completedAt);
      daysSinceLastWorkout = Math.floor(
        (now.getTime() - lastDate.getTime()) / (24 * 60 * 60 * 1000),
      );
    }

    // Workouts this week
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const workoutsThisWeek = sessions.filter(
      s => new Date(s.completedAt) >= weekAgo,
    ).length;

    const workedOutToday = allDates.has(todayStr);

    return {
      streakDays: streak,
      daysSinceLastWorkout,
      workoutsThisWeek,
      workedOutToday,
      userName: profile.name || settings.name || "there",
      todayDayOfWeek: now.getDay(),
      currentHour: now.getHours(),
    };
  } catch {
    return {
      streakDays: 0,
      daysSinceLastWorkout: 999,
      workoutsThisWeek: 0,
      workedOutToday: false,
      userName: "there",
      todayDayOfWeek: new Date().getDay(),
      currentHour: new Date().getHours(),
    };
  }
}

// ── Message Templates ──

function getStreakProtectionMessages(name: string, streak: number): Array<{ title: string; body: string }> {
  const firstName = name.split(" ")[0];
  if (streak >= 30) {
    return [
      { title: "Your ${streak}-day streak is on the line!", body: `${firstName}, you've built something incredible. Don't let it slip — even a quick 15-minute session counts.` },
      { title: `${streak} days strong, ${firstName}!`, body: "One workout away from keeping your streak alive. You've come too far to stop now." },
    ];
  }
  if (streak >= 7) {
    return [
      { title: `${streak}-day streak at risk!`, body: `${firstName}, you've been crushing it all week. A quick workout keeps the momentum going.` },
      { title: `Don't break the chain, ${firstName}!`, body: `Your ${streak}-day streak is waiting. Even 10 minutes counts.` },
    ];
  }
  return [
    { title: "Keep your streak alive!", body: `${firstName}, you haven't worked out today yet. A quick session is all it takes.` },
    { title: `${firstName}, your streak needs you!`, body: `Day ${streak + 1} is waiting. Open PeakPulse and get moving.` },
  ];
}

function getComebackMessages(name: string, daysSince: number): Array<{ title: string; body: string }> {
  const firstName = name.split(" ")[0];
  if (daysSince >= 7) {
    return [
      { title: `We miss you, ${firstName}!`, body: "It's been a week since your last workout. No pressure — start with just one exercise today." },
      { title: "Ready for a fresh start?", body: `${firstName}, your workout plan is still waiting. Jump back in whenever you're ready.` },
    ];
  }
  if (daysSince >= 3) {
    return [
      { title: `${firstName}, time to get back on track!`, body: "A 2-day break is fine, but let's not make it a habit. Your body is ready." },
      { title: "Your muscles are rested!", body: `${firstName}, ${daysSince} rest days means you're fully recovered. Time to train.` },
    ];
  }
  return [
    { title: "Rest day over!", body: `${firstName}, you've had a good break. Ready to hit it today?` },
  ];
}

function getMilestoneMessages(name: string, streak: number): Array<{ title: string; body: string }> {
  const firstName = name.split(" ")[0];
  const milestoneMap: Record<number, { title: string; body: string }> = {
    3:   { title: `3-day streak! Nice start, ${firstName}!`, body: "You're building a habit. Keep it going — the first week is the hardest." },
    7:   { title: `7 days straight! Week 1 complete!`, body: `${firstName}, you've completed a full week. This is where real progress begins.` },
    14:  { title: `2 weeks strong!`, body: `${firstName}, 14 consecutive days of training. You're officially in the habit zone.` },
    30:  { title: `30-day streak! Legendary!`, body: `${firstName}, one full month of consistency. You're in the top 5% of PeakPulse users.` },
    50:  { title: `50 days! Unstoppable!`, body: `${firstName}, 50 days of dedication. Your discipline is inspiring.` },
    100: { title: `100-DAY STREAK!`, body: `${firstName}, you've reached the century mark. This is elite-level consistency.` },
  };
  const msg = milestoneMap[streak];
  return msg ? [msg] : [];
}

function getRestDayMessages(name: string): Array<{ title: string; body: string }> {
  const firstName = name.split(" ")[0];
  return [
    { title: "Rest day — recover well!", body: `${firstName}, today is for recovery. Stay hydrated, stretch, and fuel up for tomorrow.` },
    { title: "Active recovery day", body: `${firstName}, no workout scheduled today. A light walk or stretch will help your muscles recover.` },
    { title: "Rest is part of the plan", body: `${firstName}, your body grows during rest. Enjoy the day off and come back stronger.` },
  ];
}

function getMorningBoostMessages(name: string, streak: number, isWorkoutDay: boolean): Array<{ title: string; body: string }> {
  const firstName = name.split(" ")[0];
  if (isWorkoutDay) {
    if (streak > 0) {
      return [
        { title: `Good morning, ${firstName}!`, body: `Day ${streak + 1} of your streak. Your workout is ready — let's make it count.` },
        { title: `Rise and train, ${firstName}!`, body: `${streak}-day streak on the line. Open PeakPulse to see today's plan.` },
      ];
    }
    return [
      { title: `Good morning, ${firstName}!`, body: "Today is a training day. Your AI workout plan is ready and waiting." },
      { title: `New day, new gains!`, body: `${firstName}, your personalised workout is loaded. Time to get after it.` },
    ];
  }
  return [
    { title: `Good morning, ${firstName}!`, body: "Rest day today. Focus on nutrition and recovery — your body will thank you." },
  ];
}

function getEveningPushMessages(name: string, streak: number): Array<{ title: string; body: string }> {
  const firstName = name.split(" ")[0];
  if (streak > 0) {
    return [
      { title: `${firstName}, still time to train!`, body: `Your ${streak}-day streak expires at midnight. Even a quick 15-minute session counts.` },
      { title: "Last chance today!", body: `${firstName}, don't let your ${streak}-day streak slip. Open PeakPulse for a quick workout.` },
    ];
  }
  return [
    { title: `${firstName}, there's still time!`, body: "The day isn't over yet. A short evening workout can set the tone for tomorrow." },
    { title: "End the day strong!", body: `${firstName}, a quick workout before bed helps you sleep better and start tomorrow right.` },
  ];
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── Scheduling Helpers ──

async function cancelStored(key: string): Promise<void> {
  if (Platform.OS === "web") return;
  const id = await AsyncStorage.getItem(key);
  if (id) {
    await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
    await AsyncStorage.removeItem(key);
  }
}

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
    console.warn(`[SmartReminders] Failed to schedule [${key}]:`, err);
    return null;
  }
}

// ── Main Scheduling Logic ──

/**
 * Evaluate the user's current state and schedule appropriate smart reminders.
 * Should be called on app launch and after each workout completion.
 */
export async function evaluateAndScheduleSmartReminders(): Promise<void> {
  if (Platform.OS === "web") return;

  const settings = await getSmartReminderSettings();
  if (!settings.enabled) {
    await cancelAllSmartReminders();
    return;
  }

  const ctx = await getWorkoutContext();
  const isWorkoutDay = settings.workoutDays.includes(ctx.todayDayOfWeek);

  // Ensure notification channel exists on Android
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("peakpulse-smart", {
      name: "Smart Reminders",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#F59E0B",
    });
  }

  // ── 1. Milestone Celebration (immediate if applicable) ──
  if (settings.milestoneCelebrations && ctx.workedOutToday) {
    const milestones = [3, 7, 14, 30, 50, 100];
    if (milestones.includes(ctx.streakDays)) {
      const msgs = getMilestoneMessages(ctx.userName, ctx.streakDays);
      if (msgs.length > 0) {
        const milestoneShownKey = `${PREFIX}milestone_shown_${ctx.streakDays}`;
        const alreadyShown = await AsyncStorage.getItem(milestoneShownKey);
        if (!alreadyShown) {
          const msg = pickRandom(msgs);
          await Notifications.scheduleNotificationAsync({
            content: {
              title: msg.title,
              body: msg.body,
              data: { type: "smart_milestone", url: "/workout-calendar" },
            },
            trigger: null, // immediate
          });
          await AsyncStorage.setItem(milestoneShownKey, "true");
        }
      }
    }
  }

  // ── 2. Morning Boost (next morning at preferred time) ──
  if (settings.morningBoost) {
    const morningHour = Math.max(settings.quietEnd, 7);
    const tomorrowDay = (ctx.todayDayOfWeek + 1) % 7;
    const isTomorrowWorkoutDay = settings.workoutDays.includes(tomorrowDay);
    const msgs = getMorningBoostMessages(ctx.userName, ctx.streakDays, isTomorrowWorkoutDay);
    const msg = pickRandom(msgs);
    await scheduleAndStore(MORNING_BOOST_KEY, {
      title: msg.title,
      body: msg.body,
      data: { type: "smart_morning_boost", url: "/(tabs)" },
    }, {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: morningHour,
      minute: 0,
    });
  } else {
    await cancelStored(MORNING_BOOST_KEY);
  }

  // ── 3. Streak Protection (afternoon nudge if no workout yet on a workout day) ──
  if (settings.streakProtection && isWorkoutDay && !ctx.workedOutToday && ctx.streakDays > 0) {
    // Schedule for 2 hours after preferred workout time, or 14:00, whichever is later
    const streakHour = Math.max(settings.preferredWorkoutHour + 2, 14);
    if (streakHour < settings.quietStart) {
      const msgs = getStreakProtectionMessages(ctx.userName, ctx.streakDays);
      const msg = pickRandom(msgs);
      await scheduleAndStore(STREAK_PROTECT_KEY, {
        title: msg.title,
        body: msg.body,
        data: { type: "smart_streak_protect", url: "/(tabs)/plans" },
      }, {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: streakHour,
        minute: 0,
      });
    }
  } else {
    await cancelStored(STREAK_PROTECT_KEY);
  }

  // ── 4. Evening Push (last chance if no workout on a workout day) ──
  if (settings.eveningPush && isWorkoutDay && !ctx.workedOutToday) {
    const eveningHour = Math.min(settings.quietStart - 1, 20);
    if (eveningHour > ctx.currentHour) {
      const msgs = getEveningPushMessages(ctx.userName, ctx.streakDays);
      const msg = pickRandom(msgs);
      await scheduleAndStore(EVENING_PUSH_KEY, {
        title: msg.title,
        body: msg.body,
        data: { type: "smart_evening_push", url: "/(tabs)/plans" },
      }, {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: eveningHour,
        minute: 0,
      });
    }
  } else {
    await cancelStored(EVENING_PUSH_KEY);
  }

  // ── 5. Comeback Nudge (if 2+ days since last workout) ──
  if (settings.comebackNudges && ctx.daysSinceLastWorkout >= 2 && !ctx.workedOutToday) {
    const comebackHour = settings.preferredWorkoutHour;
    const msgs = getComebackMessages(ctx.userName, ctx.daysSinceLastWorkout);
    const msg = pickRandom(msgs);
    await scheduleAndStore(COMEBACK_KEY, {
      title: msg.title,
      body: msg.body,
      data: { type: "smart_comeback", url: "/(tabs)/plans" },
    }, {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: comebackHour,
      minute: 30,
    });
  } else {
    await cancelStored(COMEBACK_KEY);
  }

  // ── 6. Rest Day Reminder (if today is not a workout day) ──
  if (settings.restDayReminders && !isWorkoutDay) {
    const restHour = Math.max(settings.quietEnd + 1, 9);
    const msgs = getRestDayMessages(ctx.userName);
    const msg = pickRandom(msgs);
    await scheduleAndStore(REST_DAY_KEY, {
      title: msg.title,
      body: msg.body,
      data: { type: "smart_rest_day", url: "/(tabs)" },
    }, {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: restHour,
      minute: 0,
    });
  } else {
    await cancelStored(REST_DAY_KEY);
  }

  // Record evaluation time
  await AsyncStorage.setItem(LAST_EVALUATED_KEY, new Date().toISOString());
}

/**
 * Cancel all smart reminder notifications.
 */
export async function cancelAllSmartReminders(): Promise<void> {
  if (Platform.OS === "web") return;
  const keys = [
    STREAK_PROTECT_KEY, COMEBACK_KEY, MILESTONE_KEY,
    REST_DAY_KEY, MORNING_BOOST_KEY, EVENING_PUSH_KEY,
  ];
  await Promise.all(keys.map(cancelStored));
}

/**
 * Get the last time smart reminders were evaluated.
 */
export async function getLastEvaluationTime(): Promise<string | null> {
  return AsyncStorage.getItem(LAST_EVALUATED_KEY);
}

/**
 * Determine the reminder type that should fire next based on current context.
 * Useful for testing and debugging.
 */
export function determineNextReminder(
  ctx: WorkoutContext,
  settings: SmartReminderSettings,
): string | null {
  const isWorkoutDay = settings.workoutDays.includes(ctx.todayDayOfWeek);

  // Priority order: milestone > streak protection > comeback > evening push > rest day > morning boost
  if (settings.milestoneCelebrations && ctx.workedOutToday) {
    const milestones = [3, 7, 14, 30, 50, 100];
    if (milestones.includes(ctx.streakDays)) return "milestone";
  }

  if (settings.streakProtection && isWorkoutDay && !ctx.workedOutToday && ctx.streakDays > 0) {
    return "streak_protection";
  }

  if (settings.comebackNudges && ctx.daysSinceLastWorkout >= 2 && !ctx.workedOutToday) {
    return "comeback";
  }

  if (settings.eveningPush && isWorkoutDay && !ctx.workedOutToday && ctx.currentHour >= 17) {
    return "evening_push";
  }

  if (settings.restDayReminders && !isWorkoutDay) {
    return "rest_day";
  }

  if (settings.morningBoost) {
    return "morning_boost";
  }

  return null;
}
