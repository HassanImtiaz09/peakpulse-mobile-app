/**
 * Social Circle Service
 *
 * Manages friend invites, social circles, leaderboards, and referral
 * discount tracking. Friends can see each other's streaks, weekly
 * progress, and compete on leaderboards.
 *
 * Data is persisted locally via AsyncStorage. In a production app,
 * this would sync with a backend server for real-time updates.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { Share, Platform } from "react-native";
import * as Linking from "expo-linking";

// ── Storage Keys ──────────────────────────────────────────────────

const SOCIAL_CIRCLE_KEY = "@social_circle_data";
const INVITE_CODE_KEY = "@social_invite_code";
const DISCOUNT_KEY = "@referral_discounts";

// ── Types ─────────────────────────────────────────────────────────

export interface FriendProfile {
  id: string;
  name: string;
  avatarEmoji: string;        // emoji avatar (no image dependency)
  streakCount: number;
  currentMilestone: string;   // milestone tier id or ""
  weeklySteps: number;
  weeklyCalories: number;
  weeklyWorkouts: number;
  weeklyDistance: number;      // km
  avgHeartRate: number;
  sleepHoursAvg: number;
  lastActive: string;          // ISO timestamp
  joinedAt: string;            // ISO timestamp
  joinedVia: "invite" | "referral" | "circle_code";
  isActive: boolean;           // active in last 24h
}

export interface PendingInvite {
  id: string;
  name: string;
  sentAt: string;
  status: "pending" | "accepted" | "expired";
}

export interface SocialCircleData {
  circleCode: string;
  friends: FriendProfile[];
  pendingInvites: PendingInvite[];
  createdAt: string;
  totalInvitesSent: number;
  totalFriendsJoined: number;
}

export type LeaderboardMetric = "streak" | "steps" | "calories" | "workouts" | "distance";
export type LeaderboardPeriod = "this_week" | "all_time";

export interface LeaderboardEntry {
  rank: number;
  id: string;
  name: string;
  avatarEmoji: string;
  value: number;
  isCurrentUser: boolean;
  trend: "up" | "down" | "same";
}

export interface ReferralDiscount {
  id: string;
  type: "percentage" | "free_month";
  value: number;            // percentage off or months free
  description: string;
  earnedAt: string;
  appliedAt?: string;
  friendName: string;
  isUsed: boolean;
}

export interface DiscountData {
  discounts: ReferralDiscount[];
  totalSaved: number;        // total months saved
  activeDiscount: ReferralDiscount | null;
}

// ── Invite Code Generation ────────────────────────────────────────

const AVATAR_EMOJIS = [
  "🦁", "🐺", "🦅", "🐉", "🦈", "🐆", "🦊", "🐻",
  "🦇", "🐍", "🦂", "🐗", "🦬", "🦏", "🐘", "🦍",
  "🐯", "🦎", "🐊", "🦖", "🦩", "🐧", "🦉", "🐝",
];

const DEMO_NAMES = [
  "Alex T.", "Jordan K.", "Sam R.", "Riley M.", "Casey P.",
  "Morgan W.", "Taylor B.", "Jamie L.", "Quinn D.", "Avery N.",
  "Blake S.", "Drew F.", "Kai H.", "Reese C.", "Skyler J.",
];

function randomId(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generate a unique circle invite code.
 * Format: "PP-" + 6 alphanumeric chars (e.g., "PP-K3NX7R")
 */
export function generateCircleCode(userName: string): string {
  const base = userName
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
    .slice(0, 2)
    .padEnd(2, "X");
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let i = 0; i < 4; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `PP-${base}${suffix}`;
}

// ── Smart Store Links ─────────────────────────────────────────────

/**
 * Build the invite URL that redirects to the correct app store.
 * Uses a universal HTTPS link that can be intercepted by the app
 * via universal links, or falls back to a web page with store redirect.
 */
export function buildInviteUrl(circleCode: string): string {
  return `https://peakpulse.app/circle/${circleCode}`;
}

/**
 * Build a direct store link based on platform.
 */
export function getStoreUrl(): string {
  if (Platform.OS === "ios") {
    return "https://apps.apple.com/app/peakpulse-ai/id0000000000";
  }
  return "https://play.google.com/store/apps/details?id=space.manus.peakpulse.mobile";
}

/**
 * Extract a circle code from a deep link URL.
 * Supports: https://peakpulse.app/circle/CODE
 */
export function extractCircleCodeFromUrl(url: string): string | null {
  try {
    const match = url.match(/\/circle\/([A-Z0-9-]{6,12})/i);
    if (match) return match[1].toUpperCase();
    const parsed = Linking.parse(url);
    const code = parsed.queryParams?.circle;
    if (typeof code === "string" && code.length >= 6) return code.toUpperCase();
    return null;
  } catch {
    return null;
  }
}

// ── Persistence ───────────────────────────────────────────────────

const DEFAULT_SOCIAL_CIRCLE: SocialCircleData = {
  circleCode: "",
  friends: [],
  pendingInvites: [],
  createdAt: "",
  totalInvitesSent: 0,
  totalFriendsJoined: 0,
};

export async function getSocialCircleData(): Promise<SocialCircleData> {
  try {
    const raw = await AsyncStorage.getItem(SOCIAL_CIRCLE_KEY);
    if (raw) {
      return { ...DEFAULT_SOCIAL_CIRCLE, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.warn("[SocialCircle] Failed to load:", e);
  }
  return { ...DEFAULT_SOCIAL_CIRCLE };
}

export async function saveSocialCircleData(data: SocialCircleData): Promise<void> {
  try {
    await AsyncStorage.setItem(SOCIAL_CIRCLE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn("[SocialCircle] Failed to save:", e);
  }
}

/**
 * Initialize or load the social circle for the current user.
 */
export async function loadOrCreateSocialCircle(userName: string): Promise<SocialCircleData> {
  const existing = await getSocialCircleData();
  if (existing.circleCode) return existing;

  // First time — create circle with demo friends for engagement
  const data: SocialCircleData = {
    circleCode: generateCircleCode(userName),
    friends: generateDemoFriends(5),
    pendingInvites: [],
    createdAt: new Date().toISOString(),
    totalInvitesSent: 0,
    totalFriendsJoined: 0,
  };
  await saveSocialCircleData(data);
  return data;
}

// ── Demo Friends ──────────────────────────────────────────────────

/**
 * Generate realistic demo friends for the social circle preview.
 * In production, these would come from the server.
 */
export function generateDemoFriends(count: number): FriendProfile[] {
  const shuffledNames = [...DEMO_NAMES].sort(() => Math.random() - 0.5);
  const shuffledEmojis = [...AVATAR_EMOJIS].sort(() => Math.random() - 0.5);
  const now = Date.now();
  const milestones = ["", "ignition", "momentum", "iron_will", "unstoppable", "legendary"];

  return Array.from({ length: Math.min(count, shuffledNames.length) }, (_, i) => {
    const streak = randomBetween(0, 16);
    const milestone = milestones.find((_, mi) =>
      mi === 0 ? streak === 0 :
      mi === 1 ? streak >= 1 && streak < 2 :
      mi === 2 ? streak >= 2 && streak < 4 :
      mi === 3 ? streak >= 4 && streak < 8 :
      mi === 4 ? streak >= 8 && streak < 12 :
      streak >= 12
    ) ?? "";
    const hoursAgo = randomBetween(0, 48);

    return {
      id: `demo_${randomId()}`,
      name: shuffledNames[i],
      avatarEmoji: shuffledEmojis[i % shuffledEmojis.length],
      streakCount: streak,
      currentMilestone: streak >= 12 ? "legendary" : streak >= 8 ? "unstoppable" : streak >= 4 ? "iron_will" : streak >= 2 ? "momentum" : streak >= 1 ? "ignition" : "",
      weeklySteps: randomBetween(35000, 105000),
      weeklyCalories: randomBetween(1500, 5000),
      weeklyWorkouts: randomBetween(0, 7),
      weeklyDistance: Math.round(randomBetween(5, 60) * 10) / 10,
      avgHeartRate: randomBetween(58, 82),
      sleepHoursAvg: Math.round(randomBetween(55, 85) * 10) / 100,
      lastActive: new Date(now - hoursAgo * 3600000).toISOString(),
      joinedAt: new Date(now - randomBetween(7, 90) * 86400000).toISOString(),
      joinedVia: i < 2 ? "referral" : "circle_code",
      isActive: hoursAgo < 24,
    };
  });
}

// ── Friend Management ─────────────────────────────────────────────

export async function addFriend(friend: FriendProfile): Promise<SocialCircleData> {
  const data = await getSocialCircleData();
  if (data.friends.some((f) => f.id === friend.id)) return data;
  data.friends.push(friend);
  data.totalFriendsJoined += 1;
  await saveSocialCircleData(data);
  return data;
}

export async function removeFriend(friendId: string): Promise<SocialCircleData> {
  const data = await getSocialCircleData();
  data.friends = data.friends.filter((f) => f.id !== friendId);
  await saveSocialCircleData(data);
  return data;
}

export async function updateFriendStats(
  friendId: string,
  updates: Partial<FriendProfile>,
): Promise<void> {
  const data = await getSocialCircleData();
  const friend = data.friends.find((f) => f.id === friendId);
  if (friend) {
    Object.assign(friend, updates);
    await saveSocialCircleData(data);
  }
}

// ── Invite Sharing ────────────────────────────────────────────────

/**
 * Share the circle invite via the native share sheet.
 * The link uses a universal URL that works on both iOS and Android.
 * When the app is installed, it intercepts the link via universal links.
 * When not installed, the web page redirects to the correct app store.
 */
export async function shareCircleInvite(
  circleCode: string,
  userName: string,
): Promise<void> {
  const url = buildInviteUrl(circleCode);
  const storeUrl = getStoreUrl();

  const message =
    `💪 ${userName} invited you to their PeakPulse AI fitness circle!\n\n` +
    `Join our circle to track each other's streaks, compete on leaderboards, ` +
    `and stay motivated together.\n\n` +
    `🔥 Circle Code: ${circleCode}\n\n` +
    `✨ You'll get a FREE 14-day Advanced trial when you join!\n\n` +
    `Download PeakPulse AI:\n` +
    `📱 ${url}\n\n` +
    `Or search "PeakPulse AI" on the App Store / Google Play`;

  try {
    await Share.share(
      Platform.OS === "ios"
        ? { message, url }
        : { message },
      { dialogTitle: "Invite to PeakPulse Circle" },
    );
  } catch {
    // User cancelled
  }
}

/**
 * Record that an invite was sent.
 */
export async function recordInviteSent(name?: string): Promise<void> {
  const data = await getSocialCircleData();
  data.totalInvitesSent += 1;
  data.pendingInvites.unshift({
    id: randomId(),
    name: name ?? "Friend",
    sentAt: new Date().toISOString(),
    status: "pending",
  });
  // Keep last 20 invites
  if (data.pendingInvites.length > 20) {
    data.pendingInvites = data.pendingInvites.slice(0, 20);
  }
  await saveSocialCircleData(data);
}

// ── Leaderboard ───────────────────────────────────────────────────

/**
 * Build a leaderboard from the social circle.
 * Includes the current user in the ranking.
 */
export function buildLeaderboard(
  friends: FriendProfile[],
  currentUser: {
    name: string;
    streakCount: number;
    weeklySteps: number;
    weeklyCalories: number;
    weeklyWorkouts: number;
    weeklyDistance: number;
  },
  metric: LeaderboardMetric,
  _period: LeaderboardPeriod = "this_week",
): LeaderboardEntry[] {
  const getValue = (f: { streakCount: number; weeklySteps: number; weeklyCalories: number; weeklyWorkouts: number; weeklyDistance: number }) => {
    switch (metric) {
      case "streak": return f.streakCount;
      case "steps": return f.weeklySteps;
      case "calories": return f.weeklyCalories;
      case "workouts": return f.weeklyWorkouts;
      case "distance": return f.weeklyDistance;
    }
  };

  const allEntries = [
    ...friends.map((f) => ({
      id: f.id,
      name: f.name,
      avatarEmoji: f.avatarEmoji,
      value: getValue(f),
      isCurrentUser: false,
      trend: "same" as const,
    })),
    {
      id: "current_user",
      name: currentUser.name,
      avatarEmoji: "🏆",
      value: getValue(currentUser),
      isCurrentUser: true,
      trend: "same" as const,
    },
  ];

  // Sort descending by value
  allEntries.sort((a, b) => b.value - a.value);

  // Assign ranks (handle ties)
  let currentRank = 1;
  return allEntries.map((entry, index) => {
    if (index > 0 && entry.value < allEntries[index - 1].value) {
      currentRank = index + 1;
    }
    // Simulate trend for demo friends
    const trend = entry.isCurrentUser ? "same" :
      Math.random() > 0.6 ? "up" : Math.random() > 0.3 ? "same" : "down";
    return { ...entry, rank: currentRank, trend: trend as "up" | "down" | "same" };
  });
}

// ── Referral Discount System ──────────────────────────────────────

const DISCOUNT_TIERS = [
  { friendsRequired: 1, type: "percentage" as const, value: 10, description: "10% off next month" },
  { friendsRequired: 3, type: "free_month" as const, value: 1, description: "1 month free" },
  { friendsRequired: 5, type: "percentage" as const, value: 25, description: "25% off for 3 months" },
  { friendsRequired: 10, type: "percentage" as const, value: 50, description: "50% off forever" },
];

export { DISCOUNT_TIERS };

export async function getDiscountData(): Promise<DiscountData> {
  try {
    const raw = await AsyncStorage.getItem(DISCOUNT_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { discounts: [], totalSaved: 0, activeDiscount: null };
}

export async function saveDiscountData(data: DiscountData): Promise<void> {
  await AsyncStorage.setItem(DISCOUNT_KEY, JSON.stringify(data));
}

/**
 * Award a discount when a friend joins via referral.
 * Checks which tier the user has reached and awards the appropriate discount.
 */
export async function awardReferralDiscount(
  totalReferrals: number,
  friendName: string,
): Promise<ReferralDiscount | null> {
  const discountData = await getDiscountData();
  const earnedIds = new Set(discountData.discounts.map((d) => `tier_${d.value}_${d.type}`));

  // Find the highest tier the user qualifies for that hasn't been awarded
  for (const tier of [...DISCOUNT_TIERS].reverse()) {
    const tierId = `tier_${tier.value}_${tier.type}`;
    if (totalReferrals >= tier.friendsRequired && !earnedIds.has(tierId)) {
      const discount: ReferralDiscount = {
        id: randomId(),
        type: tier.type,
        value: tier.value,
        description: tier.description,
        earnedAt: new Date().toISOString(),
        friendName,
        isUsed: false,
      };
      discountData.discounts.push(discount);
      if (!discountData.activeDiscount || discount.value > discountData.activeDiscount.value) {
        discountData.activeDiscount = discount;
      }
      await saveDiscountData(discountData);
      return discount;
    }
  }
  return null;
}

/**
 * Apply a discount (mark as used).
 */
export async function applyDiscount(discountId: string): Promise<void> {
  const data = await getDiscountData();
  const discount = data.discounts.find((d) => d.id === discountId);
  if (discount) {
    discount.isUsed = true;
    discount.appliedAt = new Date().toISOString();
    if (data.activeDiscount?.id === discountId) {
      // Find next best unused discount
      data.activeDiscount = data.discounts
        .filter((d) => !d.isUsed)
        .sort((a, b) => b.value - a.value)[0] ?? null;
    }
    await saveDiscountData(data);
  }
}

// ── Activity Helpers ──────────────────────────────────────────────

export function getActiveFriendsCount(friends: FriendProfile[]): number {
  return friends.filter((f) => f.isActive).length;
}

export function getCircleStats(friends: FriendProfile[]) {
  if (friends.length === 0) {
    return { avgStreak: 0, avgSteps: 0, avgWorkouts: 0, topStreak: 0 };
  }
  return {
    avgStreak: Math.round(friends.reduce((s, f) => s + f.streakCount, 0) / friends.length * 10) / 10,
    avgSteps: Math.round(friends.reduce((s, f) => s + f.weeklySteps, 0) / friends.length),
    avgWorkouts: Math.round(friends.reduce((s, f) => s + f.weeklyWorkouts, 0) / friends.length * 10) / 10,
    topStreak: Math.max(...friends.map((f) => f.streakCount)),
  };
}

/**
 * Format a "time ago" string from an ISO timestamp.
 */
export function timeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

/**
 * Get the metric display name and unit.
 */
export function getMetricDisplay(metric: LeaderboardMetric): { label: string; unit: string; format: (v: number) => string } {
  switch (metric) {
    case "streak": return { label: "Streak", unit: "weeks", format: (v) => `${v}w` };
    case "steps": return { label: "Steps", unit: "steps", format: (v) => v >= 1000 ? `${(v / 1000).toFixed(1)}K` : `${v}` };
    case "calories": return { label: "Calories", unit: "kcal", format: (v) => `${v.toLocaleString()}` };
    case "workouts": return { label: "Workouts", unit: "", format: (v) => `${v}` };
    case "distance": return { label: "Distance", unit: "km", format: (v) => `${v.toFixed(1)}km` };
  }
}
