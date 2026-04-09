/**
 * Achievement Tracking Engine
 *
 * Tracks real user progress for non-streak achievements.
 * Stores counters in AsyncStorage and checks thresholds on each action.
 * Awards XP on first unlock.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

// ── Types ────────────────────────────────────────────────────────────────

export type AchievementCategory = "fitness" | "nutrition" | "wellness" | "social";

export type AchievementTier = "bronze" | "silver" | "gold" | "platinum" | "diamond";

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  emoji: string;
  category: AchievementCategory;
  tier: AchievementTier;
  /** Counter key in storage (e.g., "workouts_completed") */
  counterKey: string;
  /** Threshold to unlock */
  threshold: number;
  /** XP awarded on unlock */
  xpReward: number;
}

export interface AchievementProgress {
  id: string;
  currentCount: number;
  unlocked: boolean;
  unlockedAt: string | null;
}

export interface AchievementWithProgress extends AchievementDef {
  currentCount: number;
  unlocked: boolean;
  unlockedAt: string | null;
  progressPct: number;
}

export interface AchievementUnlockResult {
  achievement: AchievementDef;
  xpAwarded: number;
  isNew: boolean;
}

// ── Tier Colours ─────────────────────────────────────────────────────────

export const TIER_COLORS: Record<AchievementTier, string> = {
  bronze: "#CD7F32",
  silver: "#C0C0C0",
  gold: "#FFD700",
  platinum: "#E5E4E2",
  diamond: "#B9F2FF",
};

export const TIER_LABELS: Record<AchievementTier, string> = {
  bronze: "Bronze",
  silver: "Silver",
  gold: "Gold",
  platinum: "Platinum",
  diamond: "Diamond",
};

// ── Achievement Definitions ──────────────────────────────────────────────

export const ACHIEVEMENT_DEFS: AchievementDef[] = [
  // Fitness — Workout Count
  { id: "first_workout",    name: "First Steps",     description: "Complete your first workout",     emoji: "🏋️", category: "fitness",   tier: "bronze",   counterKey: "workouts_completed", threshold: 1,   xpReward: 25 },
  { id: "workout_10",       name: "Getting Serious",  description: "Complete 10 workouts",            emoji: "💪", category: "fitness",   tier: "silver",   counterKey: "workouts_completed", threshold: 10,  xpReward: 50 },
  { id: "workout_25",       name: "Quarter Century",   description: "Complete 25 workouts",            emoji: "⚡", category: "fitness",   tier: "gold",     counterKey: "workouts_completed", threshold: 25,  xpReward: 100 },
  { id: "workout_50",       name: "Half Century",      description: "Complete 50 workouts",            emoji: "🔥", category: "fitness",   tier: "platinum", counterKey: "workouts_completed", threshold: 50,  xpReward: 200 },
  { id: "workout_100",      name: "Century Club",      description: "Complete 100 workouts",           emoji: "💯", category: "fitness",   tier: "diamond",  counterKey: "workouts_completed", threshold: 100, xpReward: 500 },

  // Nutrition — Meals Logged
  { id: "first_meal",       name: "Food Logger",       description: "Log your first meal",             emoji: "🍽️", category: "nutrition", tier: "bronze",   counterKey: "meals_logged",       threshold: 1,   xpReward: 15 },
  { id: "meals_25",         name: "Meal Tracker",      description: "Log 25 meals",                    emoji: "📝", category: "nutrition", tier: "silver",   counterKey: "meals_logged",       threshold: 25,  xpReward: 50 },
  { id: "meals_100",        name: "Nutrition Nerd",     description: "Log 100 meals",                   emoji: "🧮", category: "nutrition", tier: "gold",     counterKey: "meals_logged",       threshold: 100, xpReward: 150 },
  { id: "meals_250",        name: "Dedicated Dieter",   description: "Log 250 meals",                   emoji: "🥗", category: "nutrition", tier: "platinum", counterKey: "meals_logged",       threshold: 250, xpReward: 300 },
  { id: "meals_500",        name: "Meal Master",        description: "Log 500 meals",                   emoji: "👨‍🍳", category: "nutrition", tier: "diamond",  counterKey: "meals_logged",       threshold: 500, xpReward: 750 },

  // Nutrition — Protein Target Days
  { id: "protein_3",        name: "Protein Starter",    description: "Hit protein target 3 days",       emoji: "🥩", category: "nutrition", tier: "bronze",   counterKey: "protein_target_days", threshold: 3,   xpReward: 30 },
  { id: "protein_7",        name: "Protein Pro",        description: "Hit protein target 7 days",       emoji: "🥩", category: "nutrition", tier: "silver",   counterKey: "protein_target_days", threshold: 7,   xpReward: 75 },
  { id: "protein_30",       name: "Protein King",       description: "Hit protein target 30 days",      emoji: "👑", category: "nutrition", tier: "gold",     counterKey: "protein_target_days", threshold: 30,  xpReward: 200 },

  // Wellness — Check-ins
  { id: "checkin_1",        name: "Self-Aware",         description: "Complete your first check-in",    emoji: "📋", category: "wellness",  tier: "bronze",   counterKey: "checkins_completed", threshold: 1,   xpReward: 15 },
  { id: "checkin_7",        name: "Weekly Reflector",   description: "Complete 7 check-ins",            emoji: "🪞", category: "wellness",  tier: "silver",   counterKey: "checkins_completed", threshold: 7,   xpReward: 50 },
  { id: "checkin_30",       name: "Monthly Mindful",    description: "Complete 30 check-ins",           emoji: "🧘", category: "wellness",  tier: "gold",     counterKey: "checkins_completed", threshold: 30,  xpReward: 150 },

  // Wellness — Progress Photos
  { id: "photo_1",          name: "First Snapshot",     description: "Take your first progress photo",  emoji: "📸", category: "wellness",  tier: "bronze",   counterKey: "progress_photos",    threshold: 1,   xpReward: 20 },
  { id: "photo_10",         name: "Photo Journal",      description: "Take 10 progress photos",         emoji: "🖼️", category: "wellness",  tier: "silver",   counterKey: "progress_photos",    threshold: 10,  xpReward: 75 },
  { id: "photo_30",         name: "Transformation",     description: "Take 30 progress photos",         emoji: "✨", category: "wellness",  tier: "gold",     counterKey: "progress_photos",    threshold: 30,  xpReward: 200 },

  // Social — Shares
  { id: "share_1",          name: "Social Butterfly",   description: "Share your first milestone",      emoji: "📤", category: "social",    tier: "bronze",   counterKey: "milestones_shared",  threshold: 1,   xpReward: 15 },
  { id: "share_5",          name: "Influencer",         description: "Share 5 milestones",              emoji: "📢", category: "social",    tier: "silver",   counterKey: "milestones_shared",  threshold: 5,   xpReward: 50 },

  // Fitness — Body Scans
  { id: "scan_1",           name: "Body Aware",         description: "Complete your first body scan",   emoji: "📊", category: "fitness",   tier: "bronze",   counterKey: "body_scans",         threshold: 1,   xpReward: 20 },
  { id: "scan_10",          name: "Data Driven",        description: "Complete 10 body scans",          emoji: "📈", category: "fitness",   tier: "silver",   counterKey: "body_scans",         threshold: 10,  xpReward: 75 },
];

// ── Storage Keys ─────────────────────────────────────────────────────────

const COUNTERS_KEY = "@achievement_counters";
const UNLOCKS_KEY = "@achievement_unlocks";

// ── Pure Helper Functions (exported for testing) ─────────────────────────

/**
 * Given a counter value and achievement definitions for that counter,
 * returns which achievements are newly unlocked.
 */
export function checkUnlocks(
  counterKey: string,
  newCount: number,
  previousCount: number,
  alreadyUnlocked: Set<string>,
): AchievementDef[] {
  const relevant = ACHIEVEMENT_DEFS.filter((a) => a.counterKey === counterKey);
  const newlyUnlocked: AchievementDef[] = [];

  for (const def of relevant) {
    if (alreadyUnlocked.has(def.id)) continue;
    if (newCount >= def.threshold && previousCount < def.threshold) {
      newlyUnlocked.push(def);
    }
  }

  return newlyUnlocked;
}

/**
 * Merge achievement definitions with progress data.
 */
export function buildAchievementList(
  counters: Record<string, number>,
  unlocks: Record<string, string>, // id -> ISO date
): AchievementWithProgress[] {
  return ACHIEVEMENT_DEFS.map((def) => {
    const currentCount = counters[def.counterKey] ?? 0;
    const unlockedAt = unlocks[def.id] ?? null;
    const unlocked = !!unlockedAt;
    const progressPct = Math.min(1, currentCount / def.threshold);
    return { ...def, currentCount, unlocked, unlockedAt, progressPct };
  });
}

/**
 * Get progress label like "47/100".
 */
export function getProgressLabel(current: number, threshold: number): string {
  return `${Math.min(current, threshold)}/${threshold}`;
}

/**
 * Group achievements by category.
 */
export function groupByCategory(
  achievements: AchievementWithProgress[],
): Record<AchievementCategory, AchievementWithProgress[]> {
  const groups: Record<AchievementCategory, AchievementWithProgress[]> = {
    fitness: [],
    nutrition: [],
    wellness: [],
    social: [],
  };
  for (const a of achievements) {
    groups[a.category].push(a);
  }
  return groups;
}

/**
 * Get summary stats.
 */
export function getAchievementStats(achievements: AchievementWithProgress[]): {
  total: number;
  unlocked: number;
  pct: number;
  totalXPEarned: number;
  nextToUnlock: AchievementWithProgress | null;
} {
  const total = achievements.length;
  const unlocked = achievements.filter((a) => a.unlocked).length;
  const pct = total > 0 ? Math.round((unlocked / total) * 100) : 0;
  const totalXPEarned = achievements
    .filter((a) => a.unlocked)
    .reduce((sum, a) => sum + a.xpReward, 0);

  // Find closest-to-unlocking achievement
  const locked = achievements
    .filter((a) => !a.unlocked)
    .sort((a, b) => b.progressPct - a.progressPct);
  const nextToUnlock = locked.length > 0 ? locked[0] : null;

  return { total, unlocked, pct, totalXPEarned, nextToUnlock };
}

// ── Async Storage Operations ─────────────────────────────────────────────

async function loadCounters(): Promise<Record<string, number>> {
  try {
    const raw = await AsyncStorage.getItem(COUNTERS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

async function saveCounters(counters: Record<string, number>): Promise<void> {
  await AsyncStorage.setItem(COUNTERS_KEY, JSON.stringify(counters));
}

async function loadUnlocks(): Promise<Record<string, string>> {
  try {
    const raw = await AsyncStorage.getItem(UNLOCKS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

async function saveUnlocks(unlocks: Record<string, string>): Promise<void> {
  await AsyncStorage.setItem(UNLOCKS_KEY, JSON.stringify(unlocks));
}

/**
 * Increment a counter and check for newly unlocked achievements.
 * Returns array of newly unlocked achievements (empty if none).
 */
export async function incrementCounter(
  counterKey: string,
  amount: number = 1,
): Promise<AchievementUnlockResult[]> {
  const counters = await loadCounters();
  const unlocks = await loadUnlocks();

  const previousCount = counters[counterKey] ?? 0;
  const newCount = previousCount + amount;
  counters[counterKey] = newCount;

  const alreadyUnlocked = new Set(Object.keys(unlocks));
  const newlyUnlocked = checkUnlocks(counterKey, newCount, previousCount, alreadyUnlocked);

  const results: AchievementUnlockResult[] = [];
  const now = new Date().toISOString();

  for (const def of newlyUnlocked) {
    unlocks[def.id] = now;
    results.push({ achievement: def, xpAwarded: def.xpReward, isNew: true });
  }

  await saveCounters(counters);
  if (results.length > 0) {
    await saveUnlocks(unlocks);
  }

  return results;
}

/**
 * Get all achievements with current progress.
 */
export async function getAllAchievements(): Promise<AchievementWithProgress[]> {
  const counters = await loadCounters();
  const unlocks = await loadUnlocks();
  return buildAchievementList(counters, unlocks);
}

/**
 * Get current counter value.
 */
export async function getCounter(counterKey: string): Promise<number> {
  const counters = await loadCounters();
  return counters[counterKey] ?? 0;
}
