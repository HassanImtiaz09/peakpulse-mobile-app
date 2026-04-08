/**
 * Weekly Challenge Service
 * 
 * Auto-generates weekly mini-challenges for PeakPulse AI users.
 * New challenges rotate every Monday and provide bonus XP/badges
 * for completion. Challenges scale with user fitness level.
 * 
 * Challenge categories:
 * - Consistency: workout frequency goals
 * - Volume: total reps/sets/minutes targets
 * - Variety: try different workout types
 * - Social: share progress or invite friends
 * - Nutrition: meal logging streaks
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Types ───────────────────────────────────────────────────────────────────

export type ChallengeCategory = 'consistency' | 'volume' | 'variety' | 'social' | 'nutrition';
export type ChallengeDifficulty = 'easy' | 'medium' | 'hard';

export interface WeeklyChallenge {
  /** Unique ID for this challenge instance */
  id: string;
  /** Challenge template ID */
  templateId: string;
  /** Display name */
  name: string;
  /** Description of what to do */
  description: string;
  /** Category for UI grouping */
  category: ChallengeCategory;
  /** Difficulty level */
  difficulty: ChallengeDifficulty;
  /** Emoji icon */
  emoji: string;
  /** XP reward for completion */
  xpReward: number;
  /** Target value to reach */
  targetValue: number;
  /** Current progress value */
  currentValue: number;
  /** Unit of measurement */
  unit: string;
  /** Whether the challenge is completed */
  completed: boolean;
  /** When the challenge was completed (ISO string) */
  completedAt: string | null;
  /** Week start date (Monday, ISO string YYYY-MM-DD) */
  weekStart: string;
}

export interface WeeklyChallengeState {
  /** Currently active challenges */
  activeChallenges: WeeklyChallenge[];
  /** History of completed challenges */
  completedHistory: Array<{
    challengeId: string;
    name: string;
    weekStart: string;
    xpEarned: number;
  }>;
  /** Total XP earned from challenges */
  totalXpEarned: number;
  /** Total challenges completed */
  totalChallengesCompleted: number;
  /** Current week start (Monday ISO string) */
  currentWeekStart: string;
  /** User's fitness level for scaling (1-10) */
  fitnessLevel: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const STORAGE_KEY = '@peakpulse_weekly_challenges';
const CHALLENGES_PER_WEEK = 3;

// ─── Challenge Templates ────────────────────────────────────────────────────

interface ChallengeTemplate {
  id: string;
  name: string;
  description: string;
  category: ChallengeCategory;
  difficulty: ChallengeDifficulty;
  emoji: string;
  xpReward: number;
  baseTarget: number;
  unit: string;
  /** Scale factor per fitness level (target = baseTarget * (1 + fitnessLevel * scaleFactor)) */
  scaleFactor: number;
}

const CHALLENGE_TEMPLATES: ChallengeTemplate[] = [
  // Consistency challenges
  {
    id: 'workout_3x',
    name: 'Three-Peat',
    description: 'Complete 3 workouts this week',
    category: 'consistency',
    difficulty: 'easy',
    emoji: '🎯',
    xpReward: 50,
    baseTarget: 3,
    unit: 'workouts',
    scaleFactor: 0,
  },
  {
    id: 'workout_5x',
    name: 'Five Alive',
    description: 'Complete 5 workouts this week',
    category: 'consistency',
    difficulty: 'medium',
    emoji: '🔥',
    xpReward: 100,
    baseTarget: 5,
    unit: 'workouts',
    scaleFactor: 0,
  },
  {
    id: 'daily_warrior',
    name: 'Daily Warrior',
    description: 'Work out every day this week',
    category: 'consistency',
    difficulty: 'hard',
    emoji: '⚔️',
    xpReward: 200,
    baseTarget: 7,
    unit: 'workouts',
    scaleFactor: 0,
  },
  // Volume challenges
  {
    id: 'total_minutes_60',
    name: 'Hour Power',
    description: 'Log 60+ minutes of exercise this week',
    category: 'volume',
    difficulty: 'easy',
    emoji: '⏱️',
    xpReward: 50,
    baseTarget: 60,
    unit: 'minutes',
    scaleFactor: 0.15,
  },
  {
    id: 'total_minutes_150',
    name: 'Marathon Mentality',
    description: 'Log 150+ minutes of exercise this week',
    category: 'volume',
    difficulty: 'medium',
    emoji: '🏃',
    xpReward: 120,
    baseTarget: 150,
    unit: 'minutes',
    scaleFactor: 0.1,
  },
  {
    id: 'total_minutes_300',
    name: 'Iron Will',
    description: 'Log 300+ minutes of exercise this week',
    category: 'volume',
    difficulty: 'hard',
    emoji: '🦾',
    xpReward: 250,
    baseTarget: 300,
    unit: 'minutes',
    scaleFactor: 0.1,
  },
  // Variety challenges
  {
    id: 'try_new_workout',
    name: 'Explorer',
    description: 'Try 2 different workout types this week',
    category: 'variety',
    difficulty: 'easy',
    emoji: '🧭',
    xpReward: 75,
    baseTarget: 2,
    unit: 'types',
    scaleFactor: 0,
  },
  {
    id: 'variety_master',
    name: 'Variety Master',
    description: 'Do 4 different workout types this week',
    category: 'variety',
    difficulty: 'hard',
    emoji: '🌈',
    xpReward: 150,
    baseTarget: 4,
    unit: 'types',
    scaleFactor: 0,
  },
  // Social challenges
  {
    id: 'share_progress',
    name: 'Show Off',
    description: 'Share your workout results once this week',
    category: 'social',
    difficulty: 'easy',
    emoji: '📣',
    xpReward: 40,
    baseTarget: 1,
    unit: 'shares',
    scaleFactor: 0,
  },
  {
    id: 'social_butterfly',
    name: 'Social Butterfly',
    description: 'Share 3 times and react to 2 friends this week',
    category: 'social',
    difficulty: 'medium',
    emoji: '🦋',
    xpReward: 100,
    baseTarget: 5,
    unit: 'interactions',
    scaleFactor: 0,
  },
  // Nutrition challenges
  {
    id: 'log_meals_3',
    name: 'Fuel Tracker',
    description: 'Log meals for 3 days this week',
    category: 'nutrition',
    difficulty: 'easy',
    emoji: '🥗',
    xpReward: 50,
    baseTarget: 3,
    unit: 'days',
    scaleFactor: 0,
  },
  {
    id: 'log_meals_7',
    name: 'Nutrition Ninja',
    description: 'Log meals every day this week',
    category: 'nutrition',
    difficulty: 'hard',
    emoji: '🥷',
    xpReward: 150,
    baseTarget: 7,
    unit: 'days',
    scaleFactor: 0,
  },
];

// ─── Helper Functions ────────────────────────────────────────────────────────

/** Get the Monday of the current week as YYYY-MM-DD */
function getCurrentWeekMonday(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  return monday.toISOString().split('T')[0];
}

/** Generate a deterministic but varied selection of challenges for a given week */
function selectChallengesForWeek(
  weekStart: string,
  fitnessLevel: number
): WeeklyChallenge[] {
  // Use week start date as seed for pseudo-random but deterministic selection
  const seed = weekStart.split('-').reduce((acc, n) => acc + parseInt(n, 10), 0);
  
  // Group templates by difficulty
  const easy = CHALLENGE_TEMPLATES.filter((t) => t.difficulty === 'easy');
  const medium = CHALLENGE_TEMPLATES.filter((t) => t.difficulty === 'medium');
  const hard = CHALLENGE_TEMPLATES.filter((t) => t.difficulty === 'hard');
  
  // Select 1 easy, 1 medium, 1 hard (rotate through available templates)
  const selected: ChallengeTemplate[] = [
    easy[seed % easy.length],
    medium[(seed + 1) % medium.length],
    hard[(seed + 2) % hard.length],
  ];
  
  // Ensure no duplicate categories if possible
  const categories = new Set(selected.map((s) => s.category));
  if (categories.size < CHALLENGES_PER_WEEK && CHALLENGE_TEMPLATES.length > CHALLENGES_PER_WEEK) {
    // Try to swap duplicates with different categories
    for (let i = 1; i < selected.length; i++) {
      const prev = selected.slice(0, i).map((s) => s.category);
      if (prev.includes(selected[i].category)) {
        const pool = CHALLENGE_TEMPLATES.filter(
          (t) => t.difficulty === selected[i].difficulty && !prev.includes(t.category)
        );
        if (pool.length > 0) {
          selected[i] = pool[(seed + i) % pool.length];
        }
      }
    }
  }
  
  return selected.map((template) => {
    const scaledTarget = Math.round(
      template.baseTarget * (1 + fitnessLevel * template.scaleFactor)
    );
    
    return {
      id: `${weekStart}_${template.id}`,
      templateId: template.id,
      name: template.name,
      description: template.description,
      category: template.category,
      difficulty: template.difficulty,
      emoji: template.emoji,
      xpReward: template.xpReward,
      targetValue: scaledTarget,
      currentValue: 0,
      unit: template.unit,
      completed: false,
      completedAt: null,
      weekStart,
    };
  });
}

// ─── Storage ─────────────────────────────────────────────────────────────────

async function loadState(): Promise<WeeklyChallengeState> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch (error) {
    console.error('[WeeklyChallenge] Error loading state:', error);
  }
  
  return {
    activeChallenges: [],
    completedHistory: [],
    totalXpEarned: 0,
    totalChallengesCompleted: 0,
    currentWeekStart: getCurrentWeekMonday(),
    fitnessLevel: 3,
  };
}

async function saveState(state: WeeklyChallengeState): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('[WeeklyChallenge] Error saving state:', error);
  }
      }

// ─── Core Service (Exports) ─────────────────────────────────────────────────

/**
 * Get current weekly challenges, generating new ones if needed
 */
export async function getWeeklyChallenges(): Promise<WeeklyChallenge[]> {
  const state = await loadState();
  const currentMonday = getCurrentWeekMonday();
  
  // Check if we need new challenges for the current week
  if (state.currentWeekStart !== currentMonday || state.activeChallenges.length === 0) {
    // Archive completed challenges from last week
    for (const challenge of state.activeChallenges) {
      if (challenge.completed) {
        state.completedHistory.push({
          challengeId: challenge.id,
          name: challenge.name,
          weekStart: challenge.weekStart,
          xpEarned: challenge.xpReward,
        });
      }
    }
    
    // Generate new challenges
    state.activeChallenges = selectChallengesForWeek(currentMonday, state.fitnessLevel);
    state.currentWeekStart = currentMonday;
    await saveState(state);
  }
  
  return state.activeChallenges;
}

/**
 * Update challenge progress (call after workouts, meal logs, shares, etc.)
 */
export async function updateChallengeProgress(
  category: ChallengeCategory,
  incrementBy: number = 1,
  metadata?: { workoutType?: string }
): Promise<{ completed: WeeklyChallenge[]; xpEarned: number }> {
  const state = await loadState();
  const newlyCompleted: WeeklyChallenge[] = [];
  let xpEarned = 0;
  
  for (const challenge of state.activeChallenges) {
    if (challenge.completed) continue;
    if (challenge.category !== category) continue;
    
    // Special handling for variety challenges — track unique workout types
    if (challenge.category === 'variety' && metadata?.workoutType) {
      // For variety, incrementBy represents a new unique type count
      challenge.currentValue = incrementBy;
    } else {
      challenge.currentValue += incrementBy;
    }
    
    // Check if challenge is now completed
    if (challenge.currentValue >= challenge.targetValue && !challenge.completed) {
      challenge.completed = true;
      challenge.completedAt = new Date().toISOString();
      state.totalChallengesCompleted += 1;
      state.totalXpEarned += challenge.xpReward;
      xpEarned += challenge.xpReward;
      newlyCompleted.push(challenge);
    }
  }
  
  await saveState(state);
  return { completed: newlyCompleted, xpEarned };
}

/**
 * Called when a workout is completed
 */
export async function onWorkoutCompleted(
  workoutType: string,
  durationMinutes: number,
  uniqueTypesThisWeek: number
): Promise<{ completed: WeeklyChallenge[]; totalXpEarned: number }> {
  let allCompleted: WeeklyChallenge[] = [];
  let totalXp = 0;
  
  // Update consistency
  const consistency = await updateChallengeProgress('consistency', 1);
  allCompleted = [...allCompleted, ...consistency.completed];
  totalXp += consistency.xpEarned;
  
  // Update volume (minutes)
  const volume = await updateChallengeProgress('volume', durationMinutes);
  allCompleted = [...allCompleted, ...volume.completed];
  totalXp += volume.xpEarned;
  
  // Update variety
  const variety = await updateChallengeProgress('variety', uniqueTypesThisWeek, {
    workoutType,
  });
  allCompleted = [...allCompleted, ...variety.completed];
  totalXp += variety.xpEarned;
  
  return { completed: allCompleted, totalXpEarned: totalXp };
}

/**
 * Called when a meal is logged
 */
export async function onMealLogged(): Promise<{ completed: WeeklyChallenge[]; xpEarned: number }> {
  return updateChallengeProgress('nutrition', 1);
}

/**
 * Called when user shares progress
 */
export async function onSocialInteraction(): Promise<{ completed: WeeklyChallenge[]; xpEarned: number }> {
  return updateChallengeProgress('social', 1);
}

/**
 * Update user's fitness level (affects challenge scaling)
 */
export async function setFitnessLevel(level: number): Promise<void> {
  const state = await loadState();
  state.fitnessLevel = Math.max(1, Math.min(10, level));
  await saveState(state);
}

/**
 * Get challenge completion stats
 */
export async function getChallengeStats(): Promise<{
  totalCompleted: number;
  totalXp: number;
  currentWeekProgress: number;
  completionRate: number;
}> {
  const state = await loadState();
  const completedThisWeek = state.activeChallenges.filter((c) => c.completed).length;
  
  return {
    totalCompleted: state.totalChallengesCompleted,
    totalXp: state.totalXpEarned,
    currentWeekProgress: completedThisWeek / CHALLENGES_PER_WEEK,
    completionRate:
      state.completedHistory.length > 0
        ? state.totalChallengesCompleted / (state.completedHistory.length + state.activeChallenges.length)
        : 0,
  };
}

/**
 * Get challenge history (for profile/stats screen)
 */
export async function getChallengeHistory(): Promise<WeeklyChallengeState['completedHistory']> {
  const state = await loadState();
  return state.completedHistory;
}

