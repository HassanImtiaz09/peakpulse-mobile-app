/**
 * Streak Tracking Service
 *
 * Tracks consecutive weeks where the user hits ALL three weekly goals
 * (steps, calories, workouts). Manages milestone tiers, streak history,
 * and celebration state.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { UI } from "@/constants/ui-colors";

// ── Types ──────────────────────────────────────────────────────────

export interface WeekResult {
  weekStart: string;          // ISO date (Monday)
  stepsHit: boolean;
  caloriesHit: boolean;
  workoutsHit: boolean;
  allGoalsMet: boolean;       // true only if all three are met
  evaluatedAt: string;        // ISO timestamp when evaluated
  frozen?: boolean;           // true if streak freeze was used this week
}

export interface MilestoneTier {
  id: string;
  name: string;
  weeksRequired: number;
  emoji: string;
  color: string;
  description: string;
  badge: string;              // short badge label
}

export interface UnlockedMilestone {
  tierId: string;
  unlockedAt: string;         // ISO timestamp
  streakAtUnlock: number;
  celebrated: boolean;        // whether user has seen the celebration
}

export interface StreakFreezeData {
  freezesUsedThisMonth: number;  // max 1 per calendar month
  lastFreezeDate: string;        // ISO date of last freeze activation
  lastFreezeMonth: string;       // "YYYY-MM" of last freeze
  freezeHistory: FreezeRecord[];
}

export interface FreezeRecord {
  weekStart: string;    // ISO date of the frozen week
  activatedAt: string;  // ISO timestamp when freeze was activated
  reason?: string;      // optional user-provided reason
}

export interface StreakData {
  currentStreak: number;      // consecutive weeks with all goals met
  longestStreak: number;
  lastEvaluatedWeek: string;  // ISO date of last evaluated week start
  weekHistory: WeekResult[];  // most recent first, max 52 weeks
  milestones: UnlockedMilestone[];
  totalWeeksCompleted: number;
  freezeData: StreakFreezeData;
}

// ── Milestone Tiers ────────────────────────────────────────────────

export const MILESTONE_TIERS: MilestoneTier[] = [
  {
    id: "ignition",
    name: "Ignition",
    weeksRequired: 1,
    emoji: "🔥",
    color: UI.gold,
    description: "First week of hitting all your goals. The spark is lit.",
    badge: "1W",
  },
  {
    id: "momentum",
    name: "Momentum",
    weeksRequired: 2,
    emoji: "⚡",
    color: "#3B82F6",
    description: "Two consecutive weeks. You're building real momentum.",
    badge: "2W",
  },
  {
    id: "iron_will",
    name: "Iron Will",
    weeksRequired: 4,
    emoji: "🛡️",
    color: "#8B5CF6",
    description: "A full month of consistency. Your discipline is forged in iron.",
    badge: "4W",
  },
  {
    id: "unstoppable",
    name: "Unstoppable",
    weeksRequired: 8,
    emoji: "🚀",
    color: UI.red,
    description: "Eight weeks without breaking. You are unstoppable.",
    badge: "8W",
  },
  {
    id: "legendary",
    name: "Legendary",
    weeksRequired: 12,
    emoji: "👑",
    color: UI.gold,
    description: "Three months of perfection. You've entered legendary status.",
    badge: "12W",
  },
  {
    id: "titan",
    name: "Titan",
    weeksRequired: 26,
    emoji: "⚔️",
    color: UI.emerald,
    description: "Half a year of relentless consistency. You are a Titan.",
    badge: "26W",
  },
  {
    id: "immortal",
    name: "Immortal",
    weeksRequired: 52,
    emoji: "💎",
    color: "#06B6D4",
    description: "One full year. Your dedication is immortalised forever.",
    badge: "52W",
  },
];

// ── Storage Keys ──────────────────────────────────────────────────

const STREAK_DATA_KEY = "@goal_streak_data";
const PENDING_CELEBRATION_KEY = "@streak_pending_celebration";
const STREAK_FREEZE_KEY = "@streak_freeze_data";

// ── Default Data ──────────────────────────────────────────────────

const DEFAULT_FREEZE_DATA: StreakFreezeData = {
  freezesUsedThisMonth: 0,
  lastFreezeDate: "",
  lastFreezeMonth: "",
  freezeHistory: [],
};

const DEFAULT_STREAK_DATA: StreakData = {
  currentStreak: 0,
  longestStreak: 0,
  lastEvaluatedWeek: "",
  weekHistory: [],
  milestones: [],
  totalWeeksCompleted: 0,
  freezeData: { ...DEFAULT_FREEZE_DATA },
};

// ── Persistence ───────────────────────────────────────────────────

export async function getStreakData(): Promise<StreakData> {
  try {
    const raw = await AsyncStorage.getItem(STREAK_DATA_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as StreakData;
      // Ensure all fields exist (migration safety)
      return {
        ...DEFAULT_STREAK_DATA,
        ...parsed,
        freezeData: { ...DEFAULT_FREEZE_DATA, ...(parsed.freezeData ?? {}) },
      };
    }
  } catch (e) {
    console.warn("[StreakTracking] Failed to load streak data:", e);
  }
  return { ...DEFAULT_STREAK_DATA, freezeData: { ...DEFAULT_FREEZE_DATA } };
}

export async function saveStreakData(data: StreakData): Promise<void> {
  try {
    await AsyncStorage.setItem(STREAK_DATA_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn("[StreakTracking] Failed to save streak data:", e);
  }
}

// ── Week Helpers ──────────────────────────────────────────────────

export function getWeekStartDate(date: Date = new Date()): string {
  const d = new Date(date);
  const dayOfWeek = d.getDay(); // 0=Sun, 1=Mon
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  d.setDate(d.getDate() + mondayOffset);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().split("T")[0];
}

export function getPreviousWeekStart(weekStart: string): string {
  const d = new Date(weekStart + "T00:00:00");
  d.setDate(d.getDate() - 7);
  return d.toISOString().split("T")[0];
}

export function getNextWeekStart(weekStart: string): string {
  const d = new Date(weekStart + "T00:00:00");
  d.setDate(d.getDate() + 7);
  return d.toISOString().split("T")[0];
}

// ── Streak Evaluation ─────────────────────────────────────────────

export interface WeekEvaluation {
  stepsPercentage: number;
  caloriesPercentage: number;
  workoutsPercentage: number;
}

/**
 * Evaluate a completed week and update the streak.
 * Should be called when transitioning to a new week (e.g., on Monday)
 * or when the user opens the app and the last evaluated week is stale.
 */
export async function evaluateWeek(
  weekStart: string,
  evaluation: WeekEvaluation,
): Promise<{
  streakData: StreakData;
  newMilestones: MilestoneTier[];
  streakBroken: boolean;
  freezeUsed: boolean;
}> {
  const data = await getStreakData();

  // Don't re-evaluate the same week
  if (data.weekHistory.some((w) => w.weekStart === weekStart)) {
    return { streakData: data, newMilestones: [], streakBroken: false, freezeUsed: false };
  }

  const stepsHit = evaluation.stepsPercentage >= 100;
  const caloriesHit = evaluation.caloriesPercentage >= 100;
  const workoutsHit = evaluation.workoutsPercentage >= 100;
  const allGoalsMet = stepsHit && caloriesHit && workoutsHit;

  const weekResult: WeekResult = {
    weekStart,
    stepsHit,
    caloriesHit,
    workoutsHit,
    allGoalsMet,
    evaluatedAt: new Date().toISOString(),
  };

  // Add to history (most recent first, keep 52 weeks max)
  data.weekHistory.unshift(weekResult);
  if (data.weekHistory.length > 52) {
    data.weekHistory = data.weekHistory.slice(0, 52);
  }

  data.lastEvaluatedWeek = weekStart;

  let streakBroken = false;
  let freezeUsed = false;

  if (allGoalsMet) {
    data.currentStreak += 1;
    data.totalWeeksCompleted += 1;
    if (data.currentStreak > data.longestStreak) {
      data.longestStreak = data.currentStreak;
    }
  } else {
    // Check if a freeze is active for this week
    const hasFreezeForWeek = data.freezeData.freezeHistory.some(
      (f) => f.weekStart === weekStart
    );
    if (hasFreezeForWeek && data.currentStreak > 0) {
      // Freeze preserves the streak — don't increment, don't break
      weekResult.frozen = true;
      freezeUsed = true;
    } else {
      if (data.currentStreak > 0) {
        streakBroken = true;
      }
      data.currentStreak = 0;
    }
  }

  // Check for new milestones
  const newMilestones: MilestoneTier[] = [];
  const unlockedIds = new Set(data.milestones.map((m) => m.tierId));

  for (const tier of MILESTONE_TIERS) {
    if (!unlockedIds.has(tier.id) && data.currentStreak >= tier.weeksRequired) {
      data.milestones.push({
        tierId: tier.id,
        unlockedAt: new Date().toISOString(),
        streakAtUnlock: data.currentStreak,
        celebrated: false,
      });
      newMilestones.push(tier);
    }
  }

  await saveStreakData(data);

  // Store pending celebrations for the UI to pick up
  if (newMilestones.length > 0) {
    await setPendingCelebrations(newMilestones.map((m) => m.id));
  }

  return { streakData: data, newMilestones, streakBroken, freezeUsed };
}

// ── Milestone Helpers ─────────────────────────────────────────────

export function getCurrentMilestone(streak: number): MilestoneTier | null {
  let current: MilestoneTier | null = null;
  for (const tier of MILESTONE_TIERS) {
    if (streak >= tier.weeksRequired) {
      current = tier;
    }
  }
  return current;
}

export function getNextMilestone(streak: number): MilestoneTier | null {
  for (const tier of MILESTONE_TIERS) {
    if (streak < tier.weeksRequired) {
      return tier;
    }
  }
  return null; // All milestones achieved
}

export function getWeeksToNextMilestone(streak: number): number {
  const next = getNextMilestone(streak);
  if (!next) return 0;
  return next.weeksRequired - streak;
}

export function getMilestoneProgress(streak: number): number {
  const next = getNextMilestone(streak);
  if (!next) return 100;
  const current = getCurrentMilestone(streak);
  const base = current ? current.weeksRequired : 0;
  const range = next.weeksRequired - base;
  if (range <= 0) return 100;
  return Math.round(((streak - base) / range) * 100);
}

// ── Celebration State ─────────────────────────────────────────────

export async function getPendingCelebrations(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(PENDING_CELEBRATION_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function setPendingCelebrations(tierIds: string[]): Promise<void> {
  await AsyncStorage.setItem(PENDING_CELEBRATION_KEY, JSON.stringify(tierIds));
}

export async function clearPendingCelebrations(): Promise<void> {
  await AsyncStorage.removeItem(PENDING_CELEBRATION_KEY);
}

export async function markMilestoneCelebrated(tierId: string): Promise<void> {
  const data = await getStreakData();
  const milestone = data.milestones.find((m) => m.tierId === tierId);
  if (milestone) {
    milestone.celebrated = true;
    await saveStreakData(data);
  }
}

// ── Auto-Evaluate on App Open ─────────────────────────────────────

/**
 * Check if there are any past weeks that need evaluation.
 * Call this on app launch to catch up on missed evaluations.
 * Returns the week start string that needs evaluation, or null if current.
 */
export function getWeekNeedingEvaluation(lastEvaluatedWeek: string): string | null {
  const currentWeek = getWeekStartDate();
  if (!lastEvaluatedWeek) return null; // First time — nothing to evaluate yet

  // Check if the previous week needs evaluation
  const prevWeek = getPreviousWeekStart(currentWeek);
  if (lastEvaluatedWeek < prevWeek) {
    // There's a gap — the previous week was missed
    return prevWeek;
  }

  return null;
}

// ── Streak Display Helpers ────────────────────────────────────────

export function getStreakEmoji(streak: number): string {
  if (streak === 0) return "💤";
  if (streak >= 52) return "💎";
  if (streak >= 26) return "⚔️";
  if (streak >= 12) return "👑";
  if (streak >= 8) return "🚀";
  if (streak >= 4) return "🛡️";
  if (streak >= 2) return "⚡";
  return "🔥";
}

export function getStreakLabel(streak: number): string {
  if (streak === 0) return "No Active Streak";
  if (streak === 1) return "1 Week Streak";
  return `${streak} Week Streak`;
}

// ── Streak Freeze Functions ───────────────────────────────────────

/**
 * Get the current month string in YYYY-MM format.
 */
export function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Check if the user can use a streak freeze this month.
 * Returns true if no freeze has been used in the current calendar month.
 */
export function canUseFreeze(freezeData: StreakFreezeData): boolean {
  const currentMonth = getCurrentMonth();
  if (freezeData.lastFreezeMonth === currentMonth && freezeData.freezesUsedThisMonth >= 1) {
    return false;
  }
  return true;
}

/**
 * Get the number of freezes remaining this month (0 or 1).
 */
export function getFreezesRemaining(freezeData: StreakFreezeData): number {
  const currentMonth = getCurrentMonth();
  if (freezeData.lastFreezeMonth === currentMonth) {
    return Math.max(0, 1 - freezeData.freezesUsedThisMonth);
  }
  return 1; // New month, freeze is available
}

/**
 * Activate a streak freeze for the current week.
 * Returns the updated StreakData, or null if freeze is not available.
 */
export async function activateStreakFreeze(
  reason?: string,
): Promise<{ success: boolean; streakData: StreakData; error?: string }> {
  const data = await getStreakData();
  const currentMonth = getCurrentMonth();
  const weekStart = getWeekStartDate();

  // Check if freeze already used this month
  if (!canUseFreeze(data.freezeData)) {
    return { success: false, streakData: data, error: "You've already used your streak freeze this month. Freezes reset on the 1st of each month." };
  }

  // Check if there's an active streak to freeze
  if (data.currentStreak === 0) {
    return { success: false, streakData: data, error: "No active streak to freeze. Start hitting your goals to build a streak first." };
  }

  // Check if this week is already frozen
  if (data.freezeData.freezeHistory.some((f) => f.weekStart === weekStart)) {
    return { success: false, streakData: data, error: "This week is already frozen." };
  }

  // Activate freeze
  const freezeRecord: FreezeRecord = {
    weekStart,
    activatedAt: new Date().toISOString(),
    reason,
  };

  data.freezeData.freezeHistory.unshift(freezeRecord);
  // Keep last 12 freeze records
  if (data.freezeData.freezeHistory.length > 12) {
    data.freezeData.freezeHistory = data.freezeData.freezeHistory.slice(0, 12);
  }

  // Update monthly counter
  if (data.freezeData.lastFreezeMonth === currentMonth) {
    data.freezeData.freezesUsedThisMonth += 1;
  } else {
    data.freezeData.freezesUsedThisMonth = 1;
    data.freezeData.lastFreezeMonth = currentMonth;
  }
  data.freezeData.lastFreezeDate = new Date().toISOString();

  await saveStreakData(data);
  return { success: true, streakData: data };
}

/**
 * Check if the current week has an active freeze.
 */
export function isCurrentWeekFrozen(freezeData: StreakFreezeData): boolean {
  const weekStart = getWeekStartDate();
  return freezeData.freezeHistory.some((f) => f.weekStart === weekStart);
}

export function getStreakMotivation(streak: number, streakBroken: boolean): string {
  if (streakBroken) return "Streak broken — but every champion falls. Start again stronger.";
  if (streak === 0) return "Hit all three goals this week to start your streak.";
  if (streak === 1) return "Great start! Keep it going for two weeks to build momentum.";
  if (streak < 4) return "You're building consistency. Iron Will awaits at 4 weeks.";
  if (streak < 8) return "Your discipline is forged. Unstoppable status at 8 weeks.";
  if (streak < 12) return "Incredible run. Legendary status is within reach.";
  if (streak < 26) return "You're a legend. Titan status at half a year.";
  if (streak < 52) return "Titan-level dedication. Immortal status at one year.";
  return "You are Immortal. Your consistency is unmatched.";
}
