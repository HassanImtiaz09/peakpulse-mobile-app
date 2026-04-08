/**
 * Achievement Service
 * 
 * Connects the existing badge system (38+ badges in achievements.tsx) to real
 * user data. Checks workout sessions, meal logs, streaks, body scans, and
 * social activity to unlock badges automatically.
 * 
 * Call checkAndUnlockAchievements() after any significant user action.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// Types

export interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
  emoji: string;
  category: 'fitness' | 'nutrition' | 'social' | 'challenges' | 'streaks';
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  requirement: (stats: UserStats) => boolean;
  progressFn: (stats: UserStats) => number; // 0-100
}

export interface UserStats {
  totalWorkouts: number;
  currentStreak: number;
  longestStreak: number;
  totalMealsLogged: number;
  totalCaloriesTracked: number;
  totalBodyScans: number;
  totalFormChecks: number;
  totalChallengesCompleted: number;
  totalChallengeWins: number;
  totalSharesPosted: number;
  workoutsThisWeek: number;
  workoutsThisMonth: number;
  consecutiveWeeksActive: number;
  totalProgressPhotos: number;
  totalStreakFreezes: number;
  accountAgeDays: number;
}

export interface UnlockedAchievement {
  id: string;
  unlockedAt: string; // ISO timestamp
}

export interface AchievementState {
  unlocked: UnlockedAchievement[];
  lastChecked: string;
  stats: UserStats;
}

// Constants

const STORAGE_KEY = '@peakpulse_achievement_state';
const NEWLY_UNLOCKED_KEY = '@peakpulse_newly_unlocked';

// Achievement Definitions - these connect to the existing badge UI

export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  // Fitness - Workout Count
  {
    id: 'first_steps',
    name: 'First Steps',
    description: 'Complete your first workout',
    emoji: '\u{1F463}',
    category: 'fitness',
    rarity: 'common',
    requirement: (s) => s.totalWorkouts >= 1,
    progressFn: (s) => Math.min(100, (s.totalWorkouts / 1) * 100),
  },
  {
    id: 'week_warrior',
    name: 'Week Warrior',
    description: 'Complete 7 workouts',
    emoji: '\u{2694}',
    category: 'fitness',
    rarity: 'common',
    requirement: (s) => s.totalWorkouts >= 7,
    progressFn: (s) => Math.min(100, (s.totalWorkouts / 7) * 100),
  },
  {
    id: 'iron_will',
    name: 'Iron Will',
    description: 'Complete 30 workouts',
    emoji: '\u{1F4AA}',
    category: 'fitness',
    rarity: 'uncommon',
    requirement: (s) => s.totalWorkouts >= 30,
    progressFn: (s) => Math.min(100, (s.totalWorkouts / 30) * 100),
  },
  {
    id: 'century_club',
    name: 'Century Club',
    description: 'Complete 100 workouts',
    emoji: '\u{1F3C6}',
    category: 'fitness',
    rarity: 'rare',
    requirement: (s) => s.totalWorkouts >= 100,
    progressFn: (s) => Math.min(100, (s.totalWorkouts / 100) * 100),
  },
  {
    id: 'beast_mode',
    name: 'Beast Mode',
    description: 'Complete 5 workouts in one week',
    emoji: '\u{1F981}',
    category: 'fitness',
    rarity: 'uncommon',
    requirement: (s) => s.workoutsThisWeek >= 5,
    progressFn: (s) => Math.min(100, (s.workoutsThisWeek / 5) * 100),
  },

  // Streaks
  {
    id: 'streak_7',
    name: '7-Day Streak',
    description: 'Maintain a 7-day workout streak',
    emoji: '\u{1F525}',
    category: 'streaks',
    rarity: 'uncommon',
    requirement: (s) => s.currentStreak >= 7 || s.longestStreak >= 7,
    progressFn: (s) => Math.min(100, (Math.max(s.currentStreak, s.longestStreak) / 7) * 100),
  },
  {
    id: 'streak_30',
    name: '30-Day Streak',
    description: 'Maintain a 30-day workout streak',
    emoji: '\u{1F525}',
    category: 'streaks',
    rarity: 'rare',
    requirement: (s) => s.currentStreak >= 30 || s.longestStreak >= 30,
    progressFn: (s) => Math.min(100, (Math.max(s.currentStreak, s.longestStreak) / 30) * 100),
  },
  {
    id: 'streak_100',
    name: 'Centurion',
    description: 'Maintain a 100-day workout streak',
    emoji: '\u{1F451}',
    category: 'streaks',
    rarity: 'legendary',
    requirement: (s) => s.currentStreak >= 100 || s.longestStreak >= 100,
    progressFn: (s) => Math.min(100, (Math.max(s.currentStreak, s.longestStreak) / 100) * 100),
  },
  {
    id: 'freeze_master',
    name: 'Freeze Master',
    description: 'Use 5 streak freezes to protect your streak',
    emoji: '\u{2744}',
    category: 'streaks',
    rarity: 'uncommon',
    requirement: (s) => s.totalStreakFreezes >= 5,
    progressFn: (s) => Math.min(100, (s.totalStreakFreezes / 5) * 100),
  },

  // Nutrition
  {
    id: 'food_logger',
    name: 'Food Logger',
    description: 'Log your first meal',
    emoji: '\u{1F34E}',
    category: 'nutrition',
    rarity: 'common',
    requirement: (s) => s.totalMealsLogged >= 1,
    progressFn: (s) => Math.min(100, (s.totalMealsLogged / 1) * 100),
  },
  {
    id: 'calorie_counter',
    name: 'Calorie Counter',
    description: 'Track 50 meals',
    emoji: '\u{1F4CA}',
    category: 'nutrition',
    rarity: 'uncommon',
    requirement: (s) => s.totalMealsLogged >= 50,
    progressFn: (s) => Math.min(100, (s.totalMealsLogged / 50) * 100),
  },
  {
    id: 'meal_prep_pro',
    name: 'Meal Prep Pro',
    description: 'Track 200 meals',
    emoji: '\u{1F468}\u{200D}\u{1F373}',
    category: 'nutrition',
    rarity: 'rare',
    requirement: (s) => s.totalMealsLogged >= 200,
    progressFn: (s) => Math.min(100, (s.totalMealsLogged / 200) * 100),
  },

  // Social
  {
    id: 'social_butterfly',
    name: 'Social Butterfly',
    description: 'Share your first workout achievement',
    emoji: '\u{1F98B}',
    category: 'social',
    rarity: 'common',
    requirement: (s) => s.totalSharesPosted >= 1,
    progressFn: (s) => Math.min(100, (s.totalSharesPosted / 1) * 100),
  },
  {
    id: 'influencer',
    name: 'Influencer',
    description: 'Share 25 achievements',
    emoji: '\u{2B50}',
    category: 'social',
    rarity: 'rare',
    requirement: (s) => s.totalSharesPosted >= 25,
    progressFn: (s) => Math.min(100, (s.totalSharesPosted / 25) * 100),
  },

  // Challenges
  {
    id: 'challenger',
    name: 'Challenger',
    description: 'Complete your first challenge',
    emoji: '\u{1F3AF}',
    category: 'challenges',
    rarity: 'common',
    requirement: (s) => s.totalChallengesCompleted >= 1,
    progressFn: (s) => Math.min(100, (s.totalChallengesCompleted / 1) * 100),
  },
  {
    id: 'champion',
    name: 'Champion',
    description: 'Win 10 challenges',
    emoji: '\u{1F947}',
    category: 'challenges',
    rarity: 'rare',
    requirement: (s) => s.totalChallengeWins >= 10,
    progressFn: (s) => Math.min(100, (s.totalChallengeWins / 10) * 100),
  },

  // Body & Progress
  {
    id: 'body_scanner',
    name: 'Body Scanner',
    description: 'Complete your first body scan',
    emoji: '\u{1F4F7}',
    category: 'fitness',
    rarity: 'common',
    requirement: (s) => s.totalBodyScans >= 1,
    progressFn: (s) => Math.min(100, (s.totalBodyScans / 1) * 100),
  },
  {
    id: 'form_perfectionist',
    name: 'Form Perfectionist',
    description: 'Use AI Form Check 10 times',
    emoji: '\u{1F3AC}',
    category: 'fitness',
    rarity: 'uncommon',
    requirement: (s) => s.totalFormChecks >= 10,
    progressFn: (s) => Math.min(100, (s.totalFormChecks / 10) * 100),
  },
  {
    id: 'dedicated',
    name: 'Dedicated',
    description: 'Use PeakPulse for 30 days',
    emoji: '\u{1F4C5}',
    category: 'fitness',
    rarity: 'uncommon',
    requirement: (s) => s.accountAgeDays >= 30,
    progressFn: (s) => Math.min(100, (s.accountAgeDays / 30) * 100),
  },
  {
    id: 'veteran',
    name: 'Veteran',
    description: 'Use PeakPulse for 90 days',
    emoji: '\u{1F396}',
    category: 'fitness',
    rarity: 'epic',
    requirement: (s) => s.accountAgeDays >= 90,
    progressFn: (s) => Math.min(100, (s.accountAgeDays / 90) * 100),
  },
];

// Core Functions

export async function loadAchievementState(): Promise<AchievementState> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch (error) {
    console.error('[Achievements] Error loading state:', error);
  }
  return {
    unlocked: [],
    lastChecked: new Date().toISOString(),
    stats: getDefaultStats(),
  };
}

export async function saveAchievementState(state: AchievementState): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('[Achievements] Error saving state:', error);
  }
}

function getDefaultStats(): UserStats {
  return {
    totalWorkouts: 0,
    currentStreak: 0,
    longestStreak: 0,
    totalMealsLogged: 0,
    totalCaloriesTracked: 0,
    totalBodyScans: 0,
    totalFormChecks: 0,
    totalChallengesCompleted: 0,
    totalChallengeWins: 0,
    totalSharesPosted: 0,
    workoutsThisWeek: 0,
    workoutsThisMonth: 0,
    consecutiveWeeksActive: 0,
    totalProgressPhotos: 0,
    totalStreakFreezes: 0,
    accountAgeDays: 0,
  };
}

/**
 * Check all achievements against current stats and unlock any newly earned.
 * Returns list of newly unlocked achievement IDs for toast notifications.
 */
export async function checkAndUnlockAchievements(
  currentStats: Partial<UserStats>
): Promise<string[]> {
  const state = await loadAchievementState();
  
  // Merge new stats with existing
  state.stats = { ...state.stats, ...currentStats };
  state.lastChecked = new Date().toISOString();
  
  const unlockedIds = new Set(state.unlocked.map((u) => u.id));
  const newlyUnlocked: string[] = [];
  
  for (const def of ACHIEVEMENT_DEFINITIONS) {
    if (unlockedIds.has(def.id)) continue;
    
    if (def.requirement(state.stats)) {
      state.unlocked.push({
        id: def.id,
        unlockedAt: new Date().toISOString(),
      });
      newlyUnlocked.push(def.id);
    }
  }
  
  await saveAchievementState(state);
  
  // Store newly unlocked for toast display
  if (newlyUnlocked.length > 0) {
    const existing = await AsyncStorage.getItem(NEWLY_UNLOCKED_KEY);
    const queue = existing ? JSON.parse(existing) : [];
    queue.push(...newlyUnlocked);
    await AsyncStorage.setItem(NEWLY_UNLOCKED_KEY, JSON.stringify(queue));
  }
  
  return newlyUnlocked;
}

/**
 * Get queued newly unlocked achievements for display, then clear queue
 */
export async function getAndClearNewlyUnlocked(): Promise<AchievementDefinition[]> {
  try {
    const stored = await AsyncStorage.getItem(NEWLY_UNLOCKED_KEY);
    if (!stored) return [];
    const ids: string[] = JSON.parse(stored);
    await AsyncStorage.removeItem(NEWLY_UNLOCKED_KEY);
    return ACHIEVEMENT_DEFINITIONS.filter((d) => ids.includes(d.id));
  } catch {
    return [];
  }
}

/**
 * Get progress for all achievements (for the achievements screen)
 */
export async function getAllAchievementProgress(): Promise<
  Array<AchievementDefinition & { progress: number; isUnlocked: boolean; unlockedAt?: string }>
> {
  const state = await loadAchievementState();
  const unlockedMap = new Map(state.unlocked.map((u) => [u.id, u.unlockedAt]));
  
  return ACHIEVEMENT_DEFINITIONS.map((def) => ({
    ...def,
    progress: def.progressFn(state.stats),
    isUnlocked: unlockedMap.has(def.id),
    unlockedAt: unlockedMap.get(def.id),
  }));
}

/**
 * Convenience: call after a workout is completed
 */
export async function onWorkoutCompleted(stats: {
  totalWorkouts: number;
  currentStreak: number;
  longestStreak: number;
  workoutsThisWeek: number;
  workoutsThisMonth: number;
}): Promise<string[]> {
  return checkAndUnlockAchievements(stats);
}

/**
 * Convenience: call after a meal is logged
 */
export async function onMealLogged(totalMealsLogged: number): Promise<string[]> {
  return checkAndUnlockAchievements({ totalMealsLogged });
}

/**
 * Convenience: call after a body scan
 */
export async function onBodyScanCompleted(totalBodyScans: number): Promise<string[]> {
  return checkAndUnlockAchievements({ totalBodyScans });
}

/**
 * Convenience: call after sharing
 */
export async function onSharePosted(totalSharesPosted: number): Promise<string[]> {
  return checkAndUnlockAchievements({ totalSharesPosted });
    }
