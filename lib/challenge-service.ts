/**
 * Challenge Service — 7-day step or calorie duels between friends.
 *
 * Lifecycle: pending → accepted → active → completed
 * Persisted in AsyncStorage.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

// ── Types ────────────────────────────────────────────────────────────

export type ChallengeType = "steps" | "calories";
export type ChallengeStatus = "pending" | "accepted" | "active" | "completed" | "declined" | "expired";

export interface ChallengeParticipant {
  id: string;
  name: string;
  avatarEmoji: string;
  dailyProgress: number[]; // 7 entries, one per day
  total: number;
}

export interface Challenge {
  id: string;
  type: ChallengeType;
  status: ChallengeStatus;
  challenger: ChallengeParticipant;
  opponent: ChallengeParticipant;
  startDate: string; // ISO
  endDate: string;   // ISO
  createdAt: string;
  winnerId: string | null;
  dayIndex: number; // 0-6, current day of the challenge
}

export interface ChallengeStats {
  totalChallenges: number;
  wins: number;
  losses: number;
  draws: number;
  currentWinStreak: number;
  longestWinStreak: number;
}

interface ChallengeStore {
  challenges: Challenge[];
  stats: ChallengeStats;
}

// ── Storage ──────────────────────────────────────────────────────────

const STORE_KEY = "@peakpulse_challenges";

async function getStore(): Promise<ChallengeStore> {
  try {
    const raw = await AsyncStorage.getItem(STORE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    challenges: [],
    stats: { totalChallenges: 0, wins: 0, losses: 0, draws: 0, currentWinStreak: 0, longestWinStreak: 0 },
  };
}

async function saveStore(store: ChallengeStore): Promise<void> {
  await AsyncStorage.setItem(STORE_KEY, JSON.stringify(store));
}

// ── Helpers ──────────────────────────────────────────────────────────

function randomId(): string {
  return `ch_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function getDayIndex(startDate: string): number {
  const start = new Date(startDate);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return Math.min(Math.max(diffDays, 0), 6);
}

// ── Challenge CRUD ───────────────────────────────────────────────────

/**
 * Create a new challenge against a friend.
 */
export async function createChallenge(
  type: ChallengeType,
  challengerName: string,
  opponentId: string,
  opponentName: string,
  opponentEmoji: string,
): Promise<Challenge> {
  const store = await getStore();
  const now = new Date();
  const challenge: Challenge = {
    id: randomId(),
    type,
    status: "active", // Auto-accept for demo (simulated friends)
    challenger: {
      id: "current_user",
      name: challengerName,
      avatarEmoji: "🏆",
      dailyProgress: [0, 0, 0, 0, 0, 0, 0],
      total: 0,
    },
    opponent: {
      id: opponentId,
      name: opponentName,
      avatarEmoji: opponentEmoji,
      dailyProgress: [0, 0, 0, 0, 0, 0, 0],
      total: 0,
    },
    startDate: now.toISOString(),
    endDate: addDays(now, 7).toISOString(),
    createdAt: now.toISOString(),
    winnerId: null,
    dayIndex: 0,
  };

  // Generate simulated opponent progress for demo
  const opponentDaily = generateSimulatedProgress(type);
  challenge.opponent.dailyProgress = opponentDaily;
  challenge.opponent.total = opponentDaily.reduce((s, v) => s + v, 0);

  store.challenges.unshift(challenge);
  store.stats.totalChallenges += 1;
  await saveStore(store);
  return challenge;
}

/**
 * Update the current user's progress for an active challenge.
 */
export async function updateChallengeProgress(
  challengeId: string,
  dailyValue: number,
): Promise<Challenge | null> {
  const store = await getStore();
  const challenge = store.challenges.find((c) => c.id === challengeId);
  if (!challenge || challenge.status !== "active") return null;

  const dayIdx = getDayIndex(challenge.startDate);
  challenge.dayIndex = dayIdx;
  challenge.challenger.dailyProgress[dayIdx] = dailyValue;
  challenge.challenger.total = challenge.challenger.dailyProgress.reduce((s, v) => s + v, 0);

  // Check if challenge is complete (7 days elapsed)
  if (new Date() >= new Date(challenge.endDate)) {
    completeChallenge(challenge, store);
  }

  await saveStore(store);
  return challenge;
}

/**
 * Complete a challenge and determine the winner.
 */
function completeChallenge(challenge: Challenge, store: ChallengeStore): void {
  challenge.status = "completed";
  const challengerTotal = challenge.challenger.total;
  const opponentTotal = challenge.opponent.total;

  if (challengerTotal > opponentTotal) {
    challenge.winnerId = challenge.challenger.id;
    store.stats.wins += 1;
    store.stats.currentWinStreak += 1;
    if (store.stats.currentWinStreak > store.stats.longestWinStreak) {
      store.stats.longestWinStreak = store.stats.currentWinStreak;
    }
  } else if (opponentTotal > challengerTotal) {
    challenge.winnerId = challenge.opponent.id;
    store.stats.losses += 1;
    store.stats.currentWinStreak = 0;
  } else {
    challenge.winnerId = null; // Draw
    store.stats.draws += 1;
  }
}

/**
 * Force-complete a challenge (for testing or manual resolution).
 */
export async function forceCompleteChallenge(challengeId: string): Promise<Challenge | null> {
  const store = await getStore();
  const challenge = store.challenges.find((c) => c.id === challengeId);
  if (!challenge || challenge.status === "completed") return null;
  completeChallenge(challenge, store);
  await saveStore(store);
  return challenge;
}

/**
 * Decline or cancel a challenge.
 */
export async function declineChallenge(challengeId: string): Promise<void> {
  const store = await getStore();
  const challenge = store.challenges.find((c) => c.id === challengeId);
  if (challenge && challenge.status !== "completed") {
    challenge.status = "declined";
    await saveStore(store);
  }
}

// ── Queries ──────────────────────────────────────────────────────────

/**
 * Get all challenges.
 */
export async function getChallenges(): Promise<Challenge[]> {
  const store = await getStore();
  return store.challenges;
}

/**
 * Get active challenges only.
 */
export async function getActiveChallenges(): Promise<Challenge[]> {
  const store = await getStore();
  return store.challenges.filter((c) => c.status === "active");
}

/**
 * Get completed challenges.
 */
export async function getCompletedChallenges(): Promise<Challenge[]> {
  const store = await getStore();
  return store.challenges.filter((c) => c.status === "completed");
}

/**
 * Get challenge stats.
 */
export async function getChallengeStats(): Promise<ChallengeStats> {
  const store = await getStore();
  return store.stats;
}

/**
 * Check if user has an active challenge with a specific friend.
 */
export async function hasActiveChallengeWith(friendId: string): Promise<boolean> {
  const store = await getStore();
  return store.challenges.some(
    (c) => c.status === "active" && (c.opponent.id === friendId || c.challenger.id === friendId),
  );
}

// ── Simulated Data ───────────────────────────────────────────────────

/**
 * Generate realistic simulated daily progress for a 7-day challenge.
 */
function generateSimulatedProgress(type: ChallengeType): number[] {
  const daily: number[] = [];
  for (let i = 0; i < 7; i++) {
    if (type === "steps") {
      // 5,000 - 15,000 steps per day
      daily.push(Math.round(5000 + Math.random() * 10000));
    } else {
      // 1,500 - 3,000 calories per day
      daily.push(Math.round(1500 + Math.random() * 1500));
    }
  }
  return daily;
}

/**
 * Load or create demo challenges for first-time users.
 */
export async function loadOrCreateDemoChallenges(userName: string): Promise<Challenge[]> {
  const store = await getStore();
  if (store.challenges.length > 0) return store.challenges;

  // Create a couple of demo challenges
  const now = new Date();
  const threeDaysAgo = addDays(now, -3);
  const tenDaysAgo = addDays(now, -10);

  const activeChallenge: Challenge = {
    id: randomId(),
    type: "steps",
    status: "active",
    challenger: {
      id: "current_user",
      name: userName,
      avatarEmoji: "🏆",
      dailyProgress: [8200, 11500, 9800, 0, 0, 0, 0],
      total: 29500,
    },
    opponent: {
      id: "demo_friend_1",
      name: "Sarah K.",
      avatarEmoji: "🏃‍♀️",
      dailyProgress: [9100, 10200, 8700, 11300, 0, 0, 0],
      total: 39300,
    },
    startDate: threeDaysAgo.toISOString(),
    endDate: addDays(threeDaysAgo, 7).toISOString(),
    createdAt: threeDaysAgo.toISOString(),
    winnerId: null,
    dayIndex: 3,
  };

  const completedChallenge: Challenge = {
    id: randomId(),
    type: "calories",
    status: "completed",
    challenger: {
      id: "current_user",
      name: userName,
      avatarEmoji: "🏆",
      dailyProgress: [2100, 2350, 1900, 2500, 2200, 2800, 2400],
      total: 16250,
    },
    opponent: {
      id: "demo_friend_2",
      name: "Mike R.",
      avatarEmoji: "💪",
      dailyProgress: [1800, 2100, 2000, 1950, 2300, 2100, 1900],
      total: 14150,
    },
    startDate: tenDaysAgo.toISOString(),
    endDate: addDays(tenDaysAgo, 7).toISOString(),
    createdAt: tenDaysAgo.toISOString(),
    winnerId: "current_user",
    dayIndex: 6,
  };

  store.challenges = [activeChallenge, completedChallenge];
  store.stats = { totalChallenges: 2, wins: 1, losses: 0, draws: 0, currentWinStreak: 1, longestWinStreak: 1 };
  await saveStore(store);
  return store.challenges;
}

// ── Display Helpers ──────────────────────────────────────────────────

export function getChallengeTypeLabel(type: ChallengeType): string {
  return type === "steps" ? "Step Challenge" : "Calorie Challenge";
}

export function getChallengeTypeEmoji(type: ChallengeType): string {
  return type === "steps" ? "👟" : "🔥";
}

export function getChallengeTypeUnit(type: ChallengeType): string {
  return type === "steps" ? "steps" : "kcal";
}

export function formatChallengeValue(type: ChallengeType, value: number): string {
  if (type === "steps") {
    return value >= 1000 ? `${(value / 1000).toFixed(1)}K` : `${value}`;
  }
  return value.toLocaleString();
}

export function getDaysRemaining(endDate: string): number {
  const end = new Date(endDate);
  const now = new Date();
  const diffMs = end.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

export function getProgressPercentage(current: number, opponent: number): number {
  const max = Math.max(current, opponent, 1);
  return Math.min((current / max) * 100, 100);
}
