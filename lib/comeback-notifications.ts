/**
 * Comeback Notifications Service
 * 
 * Manages inactivity-based notifications for PeakPulse AI.
 * Schedules escalating push notifications when users stop working out,
 * with personalized messages based on streak history and inactivity duration.
 * 
 * Notification schedule:
 * - 1 day inactive: Gentle reminder
 * - 3 days inactive: Motivational nudge
 * - 7 days inactive: Streak loss warning
 * - 14 days inactive: We miss you / comeback offer
 */

import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ComebackConfig {
  /** Whether comeback notifications are enabled */
  enabled: boolean;
  /** User's display name for personalized messages */
  userName: string;
  /** Last workout date (ISO string YYYY-MM-DD) */
  lastWorkoutDate: string | null;
  /** Current streak at time of last workout */
  lastKnownStreak: number;
  /** IDs of scheduled notifications (for cancellation) */
  scheduledNotificationIds: string[];
  /** Timestamps of sent notifications (to avoid duplicates) */
  sentNotifications: Record<string, string>;
}

interface NotificationTemplate {
  triggerDays: number;
  title: string;
  body: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const STORAGE_KEY = '@peakpulse_comeback_config';

const NOTIFICATION_HOUR = 19; // 7 PM local time

// ─── Notification Templates ─────────────────────────────────────────────────

function getNotificationTemplates(
  userName: string,
  currentStreak: number
): NotificationTemplate[] {
  const name = userName || 'there';
  
  return [
    {
      triggerDays: 1,
      title: "Don't break your streak! 🔥",
      body: currentStreak > 0
        ? `Hey ${name}, your ${currentStreak}-day streak is on the line! A quick workout keeps it alive.`
        : `Hey ${name}, ready for today's workout? Your body will thank you!`,
    },
    {
      triggerDays: 3,
      title: "Your muscles miss you 💪",
      body: currentStreak > 5
        ? `${name}, you built an amazing ${currentStreak}-day streak! Don't let it slip away — come back and keep the momentum.`
        : `${name}, 3 days is nothing — jump back in with a quick session and feel the difference!`,
    },
    {
      triggerDays: 7,
      title: "It's comeback time! 🏆",
      body: `${name}, a week away? No worries — champions take breaks too. Your personalized plan is waiting for you.`,
    },
    {
      triggerDays: 14,
      title: "We saved your spot ❤️",
      body: `${name}, it's been a while and we miss you! Come back to a fresh workout plan designed just for your comeback.`,
    },
  ];
      }

// ─── Helper Functions ────────────────────────────────────────────────────────

/** Calculate days since last workout */
function getDaysInactive(lastWorkoutDate: string | null): number {
  if (!lastWorkoutDate) return 0;
  const last = new Date(lastWorkoutDate);
  const now = new Date();
  const diffMs = now.getTime() - last.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/** Load comeback config from storage */
async function loadConfig(): Promise<ComebackConfig> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch (error) {
    console.error('[Comeback] Error loading config:', error);
  }
  
  return {
    enabled: true,
    userName: '',
    lastWorkoutDate: null,
    lastKnownStreak: 0,
    scheduledNotificationIds: [],
    sentNotifications: {},
  };
}

/** Save comeback config to storage */
async function saveConfig(config: ComebackConfig): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (error) {
    console.error('[Comeback] Error saving config:', error);
  }
}

// ─── Core Service ────────────────────────────────────────────────────────────

/**
 * Schedule comeback notifications based on inactivity
 * Cancels any existing scheduled notifications first
 */
export async function scheduleComebackNotifications(
  userName: string,
  currentStreak: number,
  lastWorkoutDate: string | null
): Promise<void> {
  const config = await loadConfig();
  
  if (!config.enabled) return;
  
  // Cancel previously scheduled notifications
  await cancelComebackNotifications();
  
  if (!lastWorkoutDate) return;
  
  const templates = getNotificationTemplates(userName, currentStreak);
  const lastWorkout = new Date(lastWorkoutDate);
  const newIds: string[] = [];
  
  for (const template of templates) {
    // Calculate when this notification should fire
    const triggerDate = new Date(lastWorkout);
    triggerDate.setDate(triggerDate.getDate() + template.triggerDays);
    triggerDate.setHours(NOTIFICATION_HOUR, 0, 0, 0);
    
    // Only schedule if the trigger date is in the future
    if (triggerDate.getTime() > Date.now()) {
      try {
        const id = await Notifications.scheduleNotificationAsync({
          content: {
            title: template.title,
            body: template.body,
            data: {
              type: 'comeback',
              triggerDays: template.triggerDays,
            },
            sound: 'default',
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: triggerDate,
          },
        });
        newIds.push(id);
      } catch (error) {
        console.error(`[Comeback] Error scheduling ${template.triggerDays}-day notification:`, error);
      }
    }
  }
  
  // Save updated config
  config.userName = userName;
  config.lastWorkoutDate = lastWorkoutDate;
  config.lastKnownStreak = currentStreak;
  config.scheduledNotificationIds = newIds;
  await saveConfig(config);
}

/**
 * Cancel all scheduled comeback notifications
 */
export async function cancelComebackNotifications(): Promise<void> {
  const config = await loadConfig();
  
  for (const id of config.scheduledNotificationIds) {
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
    } catch (error) {
      // Notification may have already fired or been dismissed
    }
  }
  
  config.scheduledNotificationIds = [];
  await saveConfig(config);
}

/**
 * Call when user completes a workout
 * Reschedules notifications from the new "last workout" date
 */
export async function onWorkoutCompleted(
  userName: string,
  currentStreak: number
): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  await scheduleComebackNotifications(userName, currentStreak, today);
}

/**
 * Enable or disable comeback notifications
 */
export async function setComebackEnabled(enabled: boolean): Promise<void> {
  const config = await loadConfig();
  config.enabled = enabled;
  await saveConfig(config);
  
  if (!enabled) {
    await cancelComebackNotifications();
  }
}

/**
 * Check comeback status on app open
 * This is the main entry point — call from app/_layout.tsx or home screen.
 */
export async function checkComebackOnAppOpen(
  userName: string,
  currentStreak: number,
  lastWorkoutDate: string | null
): Promise<{ shouldShowModal: boolean; daysInactive: number; message: string }> {
  const daysInactive = getDaysInactive(lastWorkoutDate);
  
  // Schedule future notifications
  await scheduleComebackNotifications(userName, currentStreak, lastWorkoutDate);
  
  // Determine if we should show an in-app comeback modal
  if (daysInactive >= 3) {
    const templates = getNotificationTemplates(userName, currentStreak);
    const relevantTemplate = [...templates].reverse().find((t) => daysInactive >= t.triggerDays);
    
    if (relevantTemplate) {
      return {
        shouldShowModal: true,
        daysInactive,
        message: relevantTemplate.body,
      };
    }
  }
  
  return {
    shouldShowModal: false,
    daysInactive,
    message: '',
  };
}

