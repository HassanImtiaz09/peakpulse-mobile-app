/**
 * Notification Manager — Centralized notification scheduling with deduplication
 *
 * Replaces scattered notification calls across the app with a single
 * orchestrator that ensures:
 *
 *   1. **Category-based deduplication** — Only one active notification per
 *      category (workout, meal, streak, etc.). Scheduling a new notification
 *      in a category automatically cancels the previous one.
 *
 *   2. **Daily throttle** — Maximum 5 notifications per category per day.
 *      Prevents notification fatigue from rapid state changes.
 *
 *   3. **Quiet hours** — No notifications during configurable quiet hours
 *      (default 10 PM – 7 AM). Notifications that fall in quiet hours are
 *      deferred to the next available window.
 *
 *   4. **Cancel-all-before-reschedule** — When rescheduling all daily
 *      notifications, all existing scheduled notifications are cancelled
 *      first to prevent duplicates.
 *
 *   5. **Persistent tracking** — All scheduled notification IDs and daily
 *      counts are persisted to AsyncStorage for crash recovery.
 *
 * Usage:
 *   import { NotificationManager } from "@/lib/notification-manager";
 *   await NotificationManager.schedule({ category: "meal_reminder", ... });
 *   await NotificationManager.rescheduleAll();
 */
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ── Storage Keys ─────────────────────────────────────────────────────────────
const SCHEDULED_IDS_KEY = "@notif_mgr_scheduled_ids";
const DAILY_COUNTS_KEY = "@notif_mgr_daily_counts";
const QUIET_HOURS_KEY = "@notif_mgr_quiet_hours";
const MANAGER_STATE_KEY = "@notif_mgr_state";

// ── Types ────────────────────────────────────────────────────────────────────

/**
 * Notification categories — each category has independent deduplication
 * and throttle tracking.
 */
export type NotificationCategory =
  | "workout_reminder"
  | "meal_reminder"
  | "meal_nudge"
  | "streak_protection"
  | "morning_briefing"
  | "evening_recap"
  | "weekly_digest"
  | "progress_milestone"
  | "re_engagement"
  | "general";

export interface QuietHours {
  enabled: boolean;
  /** Start hour (0–23), default 22 */
  startHour: number;
  /** End hour (0–23), default 7 */
  endHour: number;
}

export interface ScheduleRequest {
  /** Category for deduplication and throttling */
  category: NotificationCategory;
  /** Notification title */
  title: string;
  /** Notification body text */
  body: string;
  /** Optional data payload for deep linking */
  data?: Record<string, any>;
  /** Android notification channel ID */
  channelId?: string;
  /** Trigger configuration — daily repeating or one-time delay */
  trigger:
    | { type: "daily"; hour: number; minute: number }
    | { type: "delay"; seconds: number }
    | { type: "immediate" };
  /** If true, skip quiet hours check (for urgent notifications) */
  bypassQuietHours?: boolean;
}

export interface ScheduledNotification {
  id: string;
  category: NotificationCategory;
  scheduledAt: string; // ISO timestamp
}

export interface DailyCounts {
  date: string; // YYYY-MM-DD
  counts: Partial<Record<NotificationCategory, number>>;
}

export interface ManagerState {
  scheduledByCategory: Partial<Record<NotificationCategory, ScheduledNotification>>;
  lastRescheduledAt: string | null;
}

// ── Constants ────────────────────────────────────────────────────────────────

/** Maximum notifications per category per day */
export const MAX_PER_CATEGORY_PER_DAY = 5;

/** Default quiet hours: 10 PM to 7 AM */
export const DEFAULT_QUIET_HOURS: QuietHours = {
  enabled: true,
  startHour: 22,
  endHour: 7,
};

// ── Pure Helpers (testable without side effects) ─────────────────────────────

/**
 * Check if a given hour falls within quiet hours.
 * Handles wrap-around (e.g., 22:00 to 07:00).
 */
export function isInQuietHours(hour: number, quietHours: QuietHours): boolean {
  if (!quietHours.enabled) return false;
  const { startHour, endHour } = quietHours;
  if (startHour < endHour) {
    // Simple range: e.g., 01:00 to 06:00
    return hour >= startHour && hour < endHour;
  }
  // Wrap-around range: e.g., 22:00 to 07:00
  return hour >= startHour || hour < endHour;
}

/**
 * Get the next available hour after quiet hours end.
 * Returns the endHour of quiet hours.
 */
export function getNextAvailableHour(quietHours: QuietHours): number {
  return quietHours.endHour;
}

/**
 * Defer a daily trigger to after quiet hours if it falls within them.
 * Returns the adjusted hour and minute.
 */
export function deferIfQuietHours(
  hour: number,
  minute: number,
  quietHours: QuietHours
): { hour: number; minute: number; deferred: boolean } {
  if (!isInQuietHours(hour, quietHours)) {
    return { hour, minute, deferred: false };
  }
  return { hour: quietHours.endHour, minute: 0, deferred: true };
}

/**
 * Check if a category has exceeded its daily throttle.
 */
export function isThrottled(
  category: NotificationCategory,
  dailyCounts: DailyCounts,
  todayDate: string
): boolean {
  if (dailyCounts.date !== todayDate) return false; // New day, reset
  const count = dailyCounts.counts[category] ?? 0;
  return count >= MAX_PER_CATEGORY_PER_DAY;
}

/**
 * Increment the daily count for a category.
 * Returns a new DailyCounts object (immutable).
 */
export function incrementDailyCount(
  category: NotificationCategory,
  dailyCounts: DailyCounts,
  todayDate: string
): DailyCounts {
  // Reset if it's a new day
  if (dailyCounts.date !== todayDate) {
    return { date: todayDate, counts: { [category]: 1 } };
  }
  return {
    date: todayDate,
    counts: {
      ...dailyCounts.counts,
      [category]: (dailyCounts.counts[category] ?? 0) + 1,
    },
  };
}

/**
 * Get today's date as YYYY-MM-DD.
 */
export function getTodayDateStr(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// ── Notification Manager Singleton ───────────────────────────────────────────

/**
 * Lazy-loaded Notifications module.
 * Returns null on web where expo-notifications is unavailable.
 */
async function getNotifications() {
  if (Platform.OS === "web") return null;
  try {
    return await import("expo-notifications");
  } catch {
    return null;
  }
}

class NotificationManagerImpl {
  private state: ManagerState = {
    scheduledByCategory: {},
    lastRescheduledAt: null,
  };
  private dailyCounts: DailyCounts = { date: "", counts: {} };
  private quietHours: QuietHours = DEFAULT_QUIET_HOURS;
  private initialized = false;

  /**
   * Initialize the manager by loading persisted state.
   * Safe to call multiple times — subsequent calls are no-ops.
   */
  async init(): Promise<void> {
    if (this.initialized) return;
    try {
      const [stateRaw, countsRaw, quietRaw] = await Promise.all([
        AsyncStorage.getItem(MANAGER_STATE_KEY),
        AsyncStorage.getItem(DAILY_COUNTS_KEY),
        AsyncStorage.getItem(QUIET_HOURS_KEY),
      ]);
      if (stateRaw) this.state = JSON.parse(stateRaw);
      if (countsRaw) this.dailyCounts = JSON.parse(countsRaw);
      if (quietRaw) this.quietHours = JSON.parse(quietRaw);
    } catch (err) {
      console.warn("[NotifManager] Failed to load state:", err);
    }
    this.initialized = true;
  }

  /**
   * Schedule a notification with deduplication and throttling.
   *
   * If a notification already exists for the same category, it is
   * cancelled before the new one is scheduled.
   *
   * Returns the notification ID, or null if throttled/blocked.
   */
  async schedule(request: ScheduleRequest): Promise<string | null> {
    await this.init();
    const Notifications = await getNotifications();
    if (!Notifications) return null;

    const todayDate = getTodayDateStr();
    const { category, title, body, data, channelId, trigger, bypassQuietHours } = request;

    // Check throttle
    if (isThrottled(category, this.dailyCounts, todayDate)) {
      console.warn(`[NotifManager] Category "${category}" throttled (${MAX_PER_CATEGORY_PER_DAY}/day limit)`);
      return null;
    }

    // Cancel existing notification for this category (deduplication)
    await this.cancelCategory(category);

    // Build trigger input
    let triggerInput: any;
    if (trigger.type === "daily") {
      let { hour, minute } = trigger;
      // Apply quiet hours deferral unless bypassed
      if (!bypassQuietHours) {
        const adjusted = deferIfQuietHours(hour, minute, this.quietHours);
        hour = adjusted.hour;
        minute = adjusted.minute;
      }
      triggerInput = {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      };
    } else if (trigger.type === "delay") {
      triggerInput = {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: trigger.seconds,
        repeats: false,
      };
    } else {
      // Immediate — use a 1-second delay
      triggerInput = {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 1,
        repeats: false,
      };
    }

    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: { ...data, category },
          sound: "default",
          ...(Platform.OS === "android" && channelId ? { channelId } : {}),
        },
        trigger: triggerInput,
      });

      // Track the scheduled notification
      const entry: ScheduledNotification = {
        id,
        category,
        scheduledAt: new Date().toISOString(),
      };
      this.state.scheduledByCategory[category] = entry;

      // Increment daily count
      this.dailyCounts = incrementDailyCount(category, this.dailyCounts, todayDate);

      // Persist state
      await this.persistState();

      return id;
    } catch (err) {
      console.warn(`[NotifManager] Failed to schedule "${category}":`, err);
      return null;
    }
  }

  /**
   * Cancel all notifications for a specific category.
   */
  async cancelCategory(category: NotificationCategory): Promise<void> {
    const Notifications = await getNotifications();
    if (!Notifications) return;

    const existing = this.state.scheduledByCategory[category];
    if (existing) {
      try {
        await Notifications.cancelScheduledNotificationAsync(existing.id);
      } catch {
        // Notification may have already been delivered or expired
      }
      delete this.state.scheduledByCategory[category];
    }
  }

  /**
   * Cancel ALL scheduled notifications and reset state.
   * Call this before rescheduling all daily notifications.
   */
  async cancelAll(): Promise<void> {
    const Notifications = await getNotifications();
    if (!Notifications) return;

    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (err) {
      console.warn("[NotifManager] Failed to cancel all:", err);
    }

    this.state.scheduledByCategory = {};
    await this.persistState();
  }

  /**
   * Reschedule all standard daily notifications.
   * Cancels everything first, then schedules fresh.
   *
   * This is the primary entry point for the app's notification setup.
   * Call on app open, after preference changes, or after quiet hours update.
   */
  async rescheduleAll(preferences?: {
    workoutHour?: number;
    workoutMinute?: number;
    mealReminderEnabled?: boolean;
    workoutReminderEnabled?: boolean;
    morningBriefingEnabled?: boolean;
    eveningRecapEnabled?: boolean;
  }): Promise<void> {
    await this.init();
    await this.cancelAll();

    const prefs = preferences ?? {};

    // Morning briefing (default 7:30 AM)
    if (prefs.morningBriefingEnabled !== false) {
      await this.schedule({
        category: "morning_briefing",
        title: "Good Morning",
        body: "Your daily fitness briefing is ready. Check your plan for today!",
        data: { screen: "/(tabs)" },
        trigger: { type: "daily", hour: 7, minute: 30 },
      });
    }

    // Workout reminder (default 8:00 AM or user-configured)
    if (prefs.workoutReminderEnabled !== false) {
      await this.schedule({
        category: "workout_reminder",
        title: "Time to Train",
        body: "Your workout plan is ready. Let's crush today's session!",
        data: { screen: "/active-workout" },
        channelId: "peakpulse-workout",
        trigger: {
          type: "daily",
          hour: prefs.workoutHour ?? 8,
          minute: prefs.workoutMinute ?? 0,
        },
      });
    }

    // Meal reminder — lunch (12:30 PM)
    if (prefs.mealReminderEnabled !== false) {
      await this.schedule({
        category: "meal_reminder",
        title: "Log Your Lunch",
        body: "Don't forget to track your midday meal. Stay on top of your nutrition!",
        data: { screen: "/meal-log" },
        channelId: "peakpulse-meals",
        trigger: { type: "daily", hour: 12, minute: 30 },
      });
    }

    // Meal nudge — evening (6:30 PM)
    if (prefs.mealReminderEnabled !== false) {
      await this.schedule({
        category: "meal_nudge",
        title: "Dinner Time",
        body: "Have you logged your evening meal? Keep your nutrition on track.",
        data: { screen: "/meal-log" },
        channelId: "peakpulse-meals",
        trigger: { type: "daily", hour: 18, minute: 30 },
      });
    }

    // Evening recap (8:00 PM)
    if (prefs.eveningRecapEnabled !== false) {
      await this.schedule({
        category: "evening_recap",
        title: "Daily Check-In",
        body: "How was your day? Review your progress and plan tomorrow.",
        data: { screen: "/(tabs)" },
        trigger: { type: "daily", hour: 20, minute: 0 },
      });
    }

    this.state.lastRescheduledAt = new Date().toISOString();
    await this.persistState();
  }

  /**
   * Send a one-time contextual notification (e.g., streak protection).
   * Subject to throttling and quiet hours.
   */
  async sendContextual(
    category: NotificationCategory,
    title: string,
    body: string,
    data?: Record<string, any>
  ): Promise<string | null> {
    return this.schedule({
      category,
      title,
      body,
      data,
      trigger: { type: "immediate" },
    });
  }

  /**
   * Get the current quiet hours configuration.
   */
  getQuietHours(): QuietHours {
    return { ...this.quietHours };
  }

  /**
   * Update quiet hours configuration.
   */
  async setQuietHours(quietHours: Partial<QuietHours>): Promise<void> {
    await this.init();
    this.quietHours = { ...this.quietHours, ...quietHours };
    await AsyncStorage.setItem(QUIET_HOURS_KEY, JSON.stringify(this.quietHours));
  }

  /**
   * Get the daily notification counts for today.
   */
  getDailyCounts(): DailyCounts {
    const todayDate = getTodayDateStr();
    if (this.dailyCounts.date !== todayDate) {
      return { date: todayDate, counts: {} };
    }
    return { ...this.dailyCounts };
  }

  /**
   * Get the current manager state (for debugging/testing).
   */
  getState(): ManagerState {
    return {
      scheduledByCategory: { ...this.state.scheduledByCategory },
      lastRescheduledAt: this.state.lastRescheduledAt,
    };
  }

  /**
   * Get the count of currently tracked scheduled notifications.
   */
  getScheduledCount(): number {
    return Object.keys(this.state.scheduledByCategory).length;
  }

  /**
   * Reset the manager state (for testing).
   */
  async reset(): Promise<void> {
    this.state = { scheduledByCategory: {}, lastRescheduledAt: null };
    this.dailyCounts = { date: "", counts: {} };
    this.quietHours = DEFAULT_QUIET_HOURS;
    this.initialized = false;
    await Promise.all([
      AsyncStorage.removeItem(MANAGER_STATE_KEY),
      AsyncStorage.removeItem(DAILY_COUNTS_KEY),
      AsyncStorage.removeItem(QUIET_HOURS_KEY),
    ]);
  }

  // ── Private ────────────────────────────────────────────────────────────────

  private async persistState(): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.setItem(MANAGER_STATE_KEY, JSON.stringify(this.state)),
        AsyncStorage.setItem(DAILY_COUNTS_KEY, JSON.stringify(this.dailyCounts)),
      ]);
    } catch (err) {
      console.warn("[NotifManager] Failed to persist state:", err);
    }
  }
}

/**
 * Singleton instance of the Notification Manager.
 * Import and use directly:
 *   import { NotificationManager } from "@/lib/notification-manager";
 *   await NotificationManager.schedule({ ... });
 */
export const NotificationManager = new NotificationManagerImpl();
