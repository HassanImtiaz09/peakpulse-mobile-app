/**
 * Social Notification Service
 *
 * Handles local push notifications for social circle events:
 * - Friend joins circle
 * - Friend completes a challenge
 * - Challenge invitation received
 * - Circle milestone reached
 *
 * Preferences are persisted in AsyncStorage so users can toggle
 * individual social notification categories on/off.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";

// ── Storage Keys ─────────────────────────────────────────────────

const SOCIAL_NOTIF_PREFS_KEY = "@social_notification_prefs";
const SOCIAL_NOTIF_HISTORY_KEY = "@social_notification_history";
const SOCIAL_NOTIF_BADGE_KEY = "@social_notification_badge_count";

// ── Types ────────────────────────────────────────────────────────

export type SocialNotificationType =
  | "friend_joined"
  | "challenge_completed"
  | "challenge_invitation"
  | "circle_milestone"
  | "friend_streak"
  | "leaderboard_change";

export interface SocialNotificationPrefs {
  friendJoined: boolean;
  challengeCompleted: boolean;
  challengeInvitation: boolean;
  circleMilestone: boolean;
  friendStreak: boolean;
  leaderboardChange: boolean;
}

export interface SocialNotificationEntry {
  id: string;
  type: SocialNotificationType;
  title: string;
  body: string;
  friendName?: string;
  friendEmoji?: string;
  timestamp: string; // ISO
  read: boolean;
  data?: Record<string, unknown>;
}

// ── Defaults ─────────────────────────────────────────────────────

const DEFAULT_PREFS: SocialNotificationPrefs = {
  friendJoined: true,
  challengeCompleted: true,
  challengeInvitation: true,
  circleMilestone: true,
  friendStreak: true,
  leaderboardChange: false,
};

// ── Android Channel ──────────────────────────────────────────────

export async function setupSocialNotificationChannel(): Promise<void> {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("peakpulse-social", {
      name: "Social Circle",
      description: "Friend joins, challenge completions, and circle updates",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 200, 100, 200],
      lightColor: "#F59E0B",
      sound: "default",
    });
  }
}

// ── Preferences ──────────────────────────────────────────────────

export async function getSocialNotificationPrefs(): Promise<SocialNotificationPrefs> {
  try {
    const raw = await AsyncStorage.getItem(SOCIAL_NOTIF_PREFS_KEY);
    if (raw) return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {}
  return { ...DEFAULT_PREFS };
}

export async function saveSocialNotificationPrefs(
  partial: Partial<SocialNotificationPrefs>,
): Promise<SocialNotificationPrefs> {
  const current = await getSocialNotificationPrefs();
  const updated = { ...current, ...partial };
  await AsyncStorage.setItem(SOCIAL_NOTIF_PREFS_KEY, JSON.stringify(updated));
  return updated;
}

// ── Notification History ─────────────────────────────────────────

export async function getSocialNotificationHistory(): Promise<SocialNotificationEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(SOCIAL_NOTIF_HISTORY_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

async function addToHistory(entry: SocialNotificationEntry): Promise<void> {
  const history = await getSocialNotificationHistory();
  history.unshift(entry); // newest first
  // Keep last 50 entries
  const trimmed = history.slice(0, 50);
  await AsyncStorage.setItem(SOCIAL_NOTIF_HISTORY_KEY, JSON.stringify(trimmed));
}

// ── Badge Count ──────────────────────────────────────────────────

export async function getSocialBadgeCount(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(SOCIAL_NOTIF_BADGE_KEY);
    return raw ? parseInt(raw, 10) : 0;
  } catch {
    return 0;
  }
}

export async function incrementSocialBadge(): Promise<number> {
  const count = await getSocialBadgeCount();
  const newCount = count + 1;
  await AsyncStorage.setItem(SOCIAL_NOTIF_BADGE_KEY, String(newCount));
  return newCount;
}

export async function clearSocialBadge(): Promise<void> {
  await AsyncStorage.setItem(SOCIAL_NOTIF_BADGE_KEY, "0");
}

export async function markNotificationRead(notifId: string): Promise<void> {
  const history = await getSocialNotificationHistory();
  const idx = history.findIndex((n) => n.id === notifId);
  if (idx >= 0) {
    history[idx].read = true;
    await AsyncStorage.setItem(SOCIAL_NOTIF_HISTORY_KEY, JSON.stringify(history));
  }
}

export async function markAllNotificationsRead(): Promise<void> {
  const history = await getSocialNotificationHistory();
  history.forEach((n) => { n.read = true; });
  await AsyncStorage.setItem(SOCIAL_NOTIF_HISTORY_KEY, JSON.stringify(history));
  await clearSocialBadge();
}

// ── Core: Send Social Notification ───────────────────────────────

function notifId(): string {
  return `sn_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

async function sendLocalNotification(
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<string | null> {
  if (Platform.OS === "web") return null;
  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data ?? {},
        sound: "default",
        ...(Platform.OS === "android" ? { channelId: "peakpulse-social" } : {}),
      },
      trigger: null, // immediate
    });
    return id;
  } catch (err) {
    console.warn("[SocialNotif] Failed to send:", err);
    return null;
  }
}

// ── Public API: Trigger Social Notifications ─────────────────────

export async function notifyFriendJoined(
  friendName: string,
  friendEmoji: string,
): Promise<void> {
  const prefs = await getSocialNotificationPrefs();
  if (!prefs.friendJoined) return;

  const title = `${friendEmoji} New Circle Member!`;
  const body = `${friendName} just joined your social circle. Welcome them!`;

  await sendLocalNotification(title, body, { type: "friend_joined", friendName });
  await addToHistory({
    id: notifId(),
    type: "friend_joined",
    title,
    body,
    friendName,
    friendEmoji,
    timestamp: new Date().toISOString(),
    read: false,
  });
  await incrementSocialBadge();
}

export async function notifyChallengeCompleted(
  friendName: string,
  friendEmoji: string,
  challengeType: string,
  isWinner: boolean,
): Promise<void> {
  const prefs = await getSocialNotificationPrefs();
  if (!prefs.challengeCompleted) return;

  const title = isWinner
    ? `🏆 You won the ${challengeType} challenge!`
    : `${friendEmoji} Challenge Complete`;
  const body = isWinner
    ? `You beat ${friendName} in the ${challengeType} challenge. Keep it up!`
    : `${friendName} completed the ${challengeType} challenge. Check the results!`;

  await sendLocalNotification(title, body, { type: "challenge_completed", friendName, challengeType, isWinner });
  await addToHistory({
    id: notifId(),
    type: "challenge_completed",
    title,
    body,
    friendName,
    friendEmoji,
    timestamp: new Date().toISOString(),
    read: false,
    data: { challengeType, isWinner },
  });
  await incrementSocialBadge();
}

export async function notifyChallengeInvitation(
  friendName: string,
  friendEmoji: string,
  challengeType: string,
): Promise<void> {
  const prefs = await getSocialNotificationPrefs();
  if (!prefs.challengeInvitation) return;

  const title = `${friendEmoji} Challenge Request`;
  const body = `${friendName} challenged you to a ${challengeType} duel! Accept?`;

  await sendLocalNotification(title, body, { type: "challenge_invitation", friendName, challengeType });
  await addToHistory({
    id: notifId(),
    type: "challenge_invitation",
    title,
    body,
    friendName,
    friendEmoji,
    timestamp: new Date().toISOString(),
    read: false,
    data: { challengeType },
  });
  await incrementSocialBadge();
}

export async function notifyCircleMilestone(
  milestoneName: string,
  memberCount: number,
): Promise<void> {
  const prefs = await getSocialNotificationPrefs();
  if (!prefs.circleMilestone) return;

  const title = "🎉 Circle Milestone!";
  const body = `Your circle reached ${memberCount} members — "${milestoneName}" unlocked!`;

  await sendLocalNotification(title, body, { type: "circle_milestone", milestoneName, memberCount });
  await addToHistory({
    id: notifId(),
    type: "circle_milestone",
    title,
    body,
    timestamp: new Date().toISOString(),
    read: false,
    data: { milestoneName, memberCount },
  });
  await incrementSocialBadge();
}

export async function notifyFriendStreak(
  friendName: string,
  friendEmoji: string,
  streakDays: number,
): Promise<void> {
  const prefs = await getSocialNotificationPrefs();
  if (!prefs.friendStreak) return;

  const title = `${friendEmoji} ${friendName} is on fire!`;
  const body = `${friendName} hit a ${streakDays}-day streak. Can you keep up?`;

  await sendLocalNotification(title, body, { type: "friend_streak", friendName, streakDays });
  await addToHistory({
    id: notifId(),
    type: "friend_streak",
    title,
    body,
    friendName,
    friendEmoji,
    timestamp: new Date().toISOString(),
    read: false,
    data: { streakDays },
  });
  await incrementSocialBadge();
}

export async function notifyLeaderboardChange(
  metric: string,
  newRank: number,
  previousRank: number,
): Promise<void> {
  const prefs = await getSocialNotificationPrefs();
  if (!prefs.leaderboardChange) return;

  const direction = newRank < previousRank ? "up" : "down";
  const title = direction === "up" ? "📈 Leaderboard Climb!" : "📉 Leaderboard Update";
  const body = direction === "up"
    ? `You moved up to #${newRank} in ${metric}! Keep pushing.`
    : `You dropped to #${newRank} in ${metric}. Time to step it up!`;

  await sendLocalNotification(title, body, { type: "leaderboard_change", metric, newRank, previousRank });
  await addToHistory({
    id: notifId(),
    type: "leaderboard_change",
    title,
    body,
    timestamp: new Date().toISOString(),
    read: false,
    data: { metric, newRank, previousRank },
  });
  await incrementSocialBadge();
}

// ── Notification Type Metadata ───────────────────────────────────

export function getNotificationIcon(type: SocialNotificationType): string {
  switch (type) {
    case "friend_joined": return "person-add";
    case "challenge_completed": return "emoji-events";
    case "challenge_invitation": return "sports-mma";
    case "circle_milestone": return "celebration";
    case "friend_streak": return "local-fire-department";
    case "leaderboard_change": return "leaderboard";
    default: return "notifications";
  }
}

export function getNotificationColor(type: SocialNotificationType): string {
  switch (type) {
    case "friend_joined": return "#22C55E";
    case "challenge_completed": return "#F59E0B";
    case "challenge_invitation": return "#EF4444";
    case "circle_milestone": return "#8B5CF6";
    case "friend_streak": return "#F97316";
    case "leaderboard_change": return "#3B82F6";
    default: return "#64748B";
  }
}
