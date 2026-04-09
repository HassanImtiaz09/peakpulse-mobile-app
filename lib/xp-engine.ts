/**
 * XP Engine — Micro-Reward System
 *
 * Tracks experience points (XP) earned through consistent app usage.
 * Awards XP for: meal logging, workout completion, progress photos,
 * body scans, and daily streak bonuses.
 *
 * Features:
 *   - Level system (1–50) with named tiers
 *   - Streak badges at milestones (3, 7, 14, 30, 60, 100 days)
 *   - XP history log for recent awards
 *   - Persistence via AsyncStorage
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { UI } from "@/constants/ui-colors";

// ── Storage Keys ─────────────────────────────────────────────────────────

const XP_DATA_KEY = "@peakpulse_xp_data";
const XP_HISTORY_KEY = "@peakpulse_xp_history";

// ── Types ────────────────────────────────────────────────────────────────

export type XPAction =
  | "meal_logged"
  | "workout_completed"
  | "progress_photo"
  | "body_scan"
  | "daily_checkin"
  | "streak_day"
  | "streak_milestone"
  | "first_meal_of_day"
  | "all_macros_hit"
  | "weekly_goal_met";

export interface XPHistoryEntry {
  action: XPAction;
  xp: number;
  label: string;
  timestamp: string;
}

export interface XPData {
  totalXP: number;
  level: number;
  /** Consecutive days with at least one logged action */
  dailyStreak: number;
  /** Date string (YYYY-MM-DD) of last action */
  lastActionDate: string;
  /** Earned badge milestone days */
  earnedBadges: number[];
}

export interface LevelInfo {
  level: number;
  title: string;
  minXP: number;
  maxXP: number;
  progress: number; // 0–1 within current level
}

export interface StreakBadge {
  days: number;
  name: string;
  icon: string;
  color: string;
  earned: boolean;
}

// ── XP Rewards ───────────────────────────────────────────────────────────

export const XP_REWARDS: Record<XPAction, { xp: number; label: string }> = {
  meal_logged:        { xp: 10,  label: "Meal Logged" },
  workout_completed:  { xp: 50,  label: "Workout Completed" },
  progress_photo:     { xp: 25,  label: "Progress Photo" },
  body_scan:          { xp: 30,  label: "Body Scan" },
  daily_checkin:       { xp: 20,  label: "Daily Check-In" },
  streak_day:         { xp: 5,   label: "Daily Streak Bonus" },
  streak_milestone:   { xp: 100, label: "Streak Milestone" },
  first_meal_of_day:  { xp: 15,  label: "First Meal of the Day" },
  all_macros_hit:     { xp: 25,  label: "All Macros Hit" },
  weekly_goal_met:    { xp: 75,  label: "Weekly Goal Met" },
};

// ── Level Thresholds ─────────────────────────────────────────────────────

/**
 * XP required to reach each level. Uses a gentle curve:
 * Level N requires N * 100 XP total (cumulative).
 * Level 1 = 0 XP, Level 2 = 100 XP, Level 10 = 900 XP, Level 50 = 4900 XP.
 */
export function getXPForLevel(level: number): number {
  if (level <= 1) return 0;
  return (level - 1) * 100;
}

export const LEVEL_TITLES: Record<number, string> = {
  1:  "Beginner",
  5:  "Rookie",
  10: "Regular",
  15: "Committed",
  20: "Dedicated",
  25: "Warrior",
  30: "Champion",
  35: "Elite",
  40: "Master",
  45: "Legend",
  50: "Immortal",
};

export function getLevelTitle(level: number): string {
  // Find the highest tier at or below the current level
  const tiers = Object.keys(LEVEL_TITLES)
    .map(Number)
    .sort((a, b) => b - a);
  for (const tier of tiers) {
    if (level >= tier) return LEVEL_TITLES[tier];
  }
  return "Beginner";
}

export function getLevelFromXP(totalXP: number): number {
  // Level N requires (N-1)*100 XP
  // So level = floor(totalXP / 100) + 1, capped at 50
  return Math.min(50, Math.floor(totalXP / 100) + 1);
}

export function getLevelInfo(totalXP: number): LevelInfo {
  const level = getLevelFromXP(totalXP);
  const minXP = getXPForLevel(level);
  const maxXP = getXPForLevel(level + 1);
  const range = maxXP - minXP;
  const progress = range > 0 ? Math.min(1, (totalXP - minXP) / range) : 1;

  return {
    level,
    title: getLevelTitle(level),
    minXP,
    maxXP,
    progress,
  };
}

// ── Streak Badges ────────────────────────────────────────────────────────

export const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100];

export const STREAK_BADGE_DEFS: Array<{ days: number; name: string; icon: string; color: string }> = [
  { days: 3,   name: "Spark",       icon: "local-fire-department", color: UI.gold },
  { days: 7,   name: "Flame",       icon: "whatshot",              color: UI.red },
  { days: 14,  name: "Blaze",       icon: "bolt",                 color: "#8B5CF6" },
  { days: 30,  name: "Inferno",     icon: "military-tech",        color: "#3B82F6" },
  { days: 60,  name: "Titan",       icon: "shield",               color: UI.emerald },
  { days: 100, name: "Immortal",    icon: "diamond",              color: "#EC4899" },
];

export function getStreakBadges(earnedBadges: number[]): StreakBadge[] {
  return STREAK_BADGE_DEFS.map((def) => ({
    ...def,
    earned: earnedBadges.includes(def.days),
  }));
}

// ── Persistence ──────────────────────────────────────────────────────────

const DEFAULT_XP_DATA: XPData = {
  totalXP: 0,
  level: 1,
  dailyStreak: 0,
  lastActionDate: "",
  earnedBadges: [],
};

export async function loadXPData(): Promise<XPData> {
  try {
    const raw = await AsyncStorage.getItem(XP_DATA_KEY);
    if (raw) return { ...DEFAULT_XP_DATA, ...JSON.parse(raw) };
  } catch {}
  return { ...DEFAULT_XP_DATA };
}

export async function saveXPData(data: XPData): Promise<void> {
  await AsyncStorage.setItem(XP_DATA_KEY, JSON.stringify(data));
}

export async function loadXPHistory(limit: number = 20): Promise<XPHistoryEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(XP_HISTORY_KEY);
    if (raw) {
      const entries: XPHistoryEntry[] = JSON.parse(raw);
      return entries.slice(0, limit);
    }
  } catch {}
  return [];
}

async function appendXPHistory(entry: XPHistoryEntry): Promise<void> {
  const history = await loadXPHistory(100);
  history.unshift(entry);
  // Keep last 100 entries
  await AsyncStorage.setItem(XP_HISTORY_KEY, JSON.stringify(history.slice(0, 100)));
}

// ── Core Award Function ──────────────────────────────────────────────────

export interface AwardResult {
  xpAwarded: number;
  newTotal: number;
  levelUp: boolean;
  oldLevel: number;
  newLevel: number;
  newBadges: number[];
  label: string;
}

/**
 * Award XP for an action. Handles streak tracking, badge unlocks,
 * and level progression. Returns details for UI celebration.
 */
export async function awardXP(action: XPAction): Promise<AwardResult> {
  const data = await loadXPData();
  const reward = XP_REWARDS[action];
  const today = new Date().toISOString().split("T")[0];
  const oldLevel = data.level;

  // Update daily streak
  if (data.lastActionDate !== today) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    if (data.lastActionDate === yesterdayStr) {
      // Consecutive day
      data.dailyStreak += 1;
    } else if (data.lastActionDate === today) {
      // Same day, no change
    } else {
      // Streak broken (or first action ever)
      data.dailyStreak = 1;
    }
    data.lastActionDate = today;

    // Award streak day bonus (once per day)
    if (action !== "streak_day" && action !== "streak_milestone") {
      data.totalXP += XP_REWARDS.streak_day.xp;
      await appendXPHistory({
        action: "streak_day",
        xp: XP_REWARDS.streak_day.xp,
        label: XP_REWARDS.streak_day.label,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Award the action XP
  data.totalXP += reward.xp;
  data.level = getLevelFromXP(data.totalXP);

  // Check for new streak badges
  const newBadges: number[] = [];
  for (const milestone of STREAK_MILESTONES) {
    if (data.dailyStreak >= milestone && !data.earnedBadges.includes(milestone)) {
      data.earnedBadges.push(milestone);
      newBadges.push(milestone);
      // Award milestone bonus
      data.totalXP += XP_REWARDS.streak_milestone.xp;
      await appendXPHistory({
        action: "streak_milestone",
        xp: XP_REWARDS.streak_milestone.xp,
        label: `${milestone}-Day Streak!`,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Recalculate level after potential milestone bonuses
  data.level = getLevelFromXP(data.totalXP);

  // Save
  await saveXPData(data);
  await appendXPHistory({
    action,
    xp: reward.xp,
    label: reward.label,
    timestamp: new Date().toISOString(),
  });

  return {
    xpAwarded: reward.xp,
    newTotal: data.totalXP,
    levelUp: data.level > oldLevel,
    oldLevel,
    newLevel: data.level,
    newBadges,
    label: reward.label,
  };
}

/**
 * Get a summary of the user's current XP state for display.
 */
export async function getXPSummary(): Promise<{
  data: XPData;
  levelInfo: LevelInfo;
  badges: StreakBadge[];
  recentHistory: XPHistoryEntry[];
}> {
  const data = await loadXPData();
  const levelInfo = getLevelInfo(data.totalXP);
  const badges = getStreakBadges(data.earnedBadges);
  const recentHistory = await loadXPHistory(10);
  return { data, levelInfo, badges, recentHistory };
}
