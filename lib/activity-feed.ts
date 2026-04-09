/**
 * Activity Feed Service — shows friend workout completions, milestone unlocks,
 * challenge wins, streak achievements, and goal completions.
 *
 * Generates simulated feed items from friend data for demo mode.
 * Persisted in AsyncStorage with a max of 50 items.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { FriendProfile } from "@/lib/social-circle";
import { UI } from "@/constants/ui-colors";

// ── Types ────────────────────────────────────────────────────────────

export type FeedEventType =
  | "workout_completed"
  | "milestone_unlocked"
  | "challenge_won"
  | "streak_achieved"
  | "goal_hit"
  | "joined_circle";

export interface ActivityFeedItem {
  id: string;
  type: FeedEventType;
  userId: string;
  userName: string;
  userEmoji: string;
  timestamp: string; // ISO
  data: FeedEventData;
}

export type FeedEventData =
  | { kind: "workout"; workoutType: string; duration: number; calories: number }
  | { kind: "milestone"; milestoneName: string; streakWeeks: number }
  | { kind: "challenge"; challengeType: string; opponentName: string; margin: number }
  | { kind: "streak"; streakWeeks: number }
  | { kind: "goal"; goalType: string; target: number; achieved: number }
  | { kind: "joined"; circleName: string };

// ── Storage ──────────────────────────────────────────────────────────

const FEED_KEY = "@peakpulse_activity_feed";
const MAX_ITEMS = 50;

export async function getActivityFeed(): Promise<ActivityFeedItem[]> {
  try {
    const raw = await AsyncStorage.getItem(FEED_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

export async function saveActivityFeed(feed: ActivityFeedItem[]): Promise<void> {
  const trimmed = feed.slice(0, MAX_ITEMS);
  await AsyncStorage.setItem(FEED_KEY, JSON.stringify(trimmed));
}

/**
 * Add a new item to the top of the feed.
 */
export async function addFeedItem(item: Omit<ActivityFeedItem, "id">): Promise<void> {
  const feed = await getActivityFeed();
  const newItem: ActivityFeedItem = {
    ...item,
    id: `feed_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  };
  feed.unshift(newItem);
  await saveActivityFeed(feed);
}

// ── Feed Item Display ────────────────────────────────────────────────

export function getFeedItemIcon(type: FeedEventType): string {
  switch (type) {
    case "workout_completed": return "🏋️";
    case "milestone_unlocked": return "🏅";
    case "challenge_won": return "🏆";
    case "streak_achieved": return "🔥";
    case "goal_hit": return "🎯";
    case "joined_circle": return "👋";
  }
}

export function getFeedItemMessage(item: ActivityFeedItem): string {
  const { data } = item;
  switch (data.kind) {
    case "workout":
      return `completed a ${data.workoutType} workout (${data.duration}min, ${data.calories} kcal)`;
    case "milestone":
      return `unlocked the "${data.milestoneName}" milestone at ${data.streakWeeks}-week streak`;
    case "challenge":
      return `won a ${data.challengeType} challenge against ${data.opponentName}`;
    case "streak":
      return `reached a ${data.streakWeeks}-week goal streak`;
    case "goal":
      return `hit their weekly ${data.goalType} goal (${data.achieved.toLocaleString()}/${data.target.toLocaleString()})`;
    case "joined":
      return `joined the circle`;
  }
}

export function getFeedItemColor(type: FeedEventType): string {
  switch (type) {
    case "workout_completed": return "#3B82F6"; // Blue
    case "milestone_unlocked": return UI.gold; // Gold
    case "challenge_won": return "#8B5CF6"; // Purple
    case "streak_achieved": return UI.red; // Red
    case "goal_hit": return UI.emerald; // Green
    case "joined_circle": return "#06B6D4"; // Cyan
  }
}

// ── Simulated Feed Generation ────────────────────────────────────────

const WORKOUT_TYPES = ["Running", "Cycling", "HIIT", "Yoga", "Swimming", "Strength", "Walking"];
const MILESTONE_NAMES = ["Ignition", "Momentum", "Iron Will", "Unstoppable", "Legendary"];

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

/**
 * Generate a realistic simulated activity feed from friend profiles.
 * Creates a mix of event types spread over the past 48 hours.
 */
export function generateSimulatedFeed(friends: FriendProfile[]): ActivityFeedItem[] {
  if (friends.length === 0) return [];

  const items: ActivityFeedItem[] = [];
  let idCounter = 0;

  // Generate 15-25 feed items
  const count = 15 + Math.floor(Math.random() * 11);

  for (let i = 0; i < count; i++) {
    const friend = randomFrom(friends);
    const hoursOffset = Math.random() * 48; // Within last 48 hours
    const eventType = pickRandomEventType();
    const data = generateEventData(eventType, friend, friends);

    items.push({
      id: `sim_feed_${idCounter++}_${Math.random().toString(36).slice(2, 6)}`,
      type: eventType,
      userId: friend.id,
      userName: friend.name,
      userEmoji: friend.avatarEmoji,
      timestamp: hoursAgo(hoursOffset),
      data,
    });
  }

  // Sort by timestamp descending (most recent first)
  items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return items.slice(0, MAX_ITEMS);
}

function pickRandomEventType(): FeedEventType {
  const weights: [FeedEventType, number][] = [
    ["workout_completed", 40],
    ["goal_hit", 20],
    ["streak_achieved", 15],
    ["milestone_unlocked", 10],
    ["challenge_won", 10],
    ["joined_circle", 5],
  ];
  const total = weights.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [type, weight] of weights) {
    r -= weight;
    if (r <= 0) return type;
  }
  return "workout_completed";
}

function generateEventData(
  type: FeedEventType,
  friend: FriendProfile,
  allFriends: FriendProfile[],
): FeedEventData {
  switch (type) {
    case "workout_completed": {
      const workoutType = randomFrom(WORKOUT_TYPES);
      return {
        kind: "workout",
        workoutType,
        duration: 20 + Math.floor(Math.random() * 50),
        calories: 150 + Math.floor(Math.random() * 400),
      };
    }
    case "milestone_unlocked":
      return {
        kind: "milestone",
        milestoneName: randomFrom(MILESTONE_NAMES),
        streakWeeks: friend.streakCount,
      };
    case "challenge_won": {
      const opponent = allFriends.find((f) => f.id !== friend.id) ?? friend;
      return {
        kind: "challenge",
        challengeType: Math.random() > 0.5 ? "step" : "calorie",
        opponentName: opponent.name,
        margin: 1000 + Math.floor(Math.random() * 5000),
      };
    }
    case "streak_achieved":
      return {
        kind: "streak",
        streakWeeks: friend.streakCount,
      };
    case "goal_hit": {
      const goalTypes = ["steps", "calories", "workouts"];
      const goalType = randomFrom(goalTypes);
      const targets: Record<string, number> = { steps: 70000, calories: 14000, workouts: 5 };
      const target = targets[goalType] ?? 70000;
      return {
        kind: "goal",
        goalType,
        target,
        achieved: target + Math.floor(Math.random() * target * 0.2),
      };
    }
    case "joined_circle":
      return {
        kind: "joined",
        circleName: "Your Circle",
      };
  }
}

/**
 * Load or generate the activity feed.
 * If no feed exists, generates a simulated one from friend data.
 */
export async function loadOrCreateFeed(friends: FriendProfile[]): Promise<ActivityFeedItem[]> {
  const existing = await getActivityFeed();
  if (existing.length > 0) return existing;

  const simulated = generateSimulatedFeed(friends);
  await saveActivityFeed(simulated);
  return simulated;
}
