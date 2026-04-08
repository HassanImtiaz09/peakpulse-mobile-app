/**
 * Streak Freeze Service
 * Manages streak freeze functionality for PeakPulse AI.
 * Free: 0/week | Starter: 1/week | Pro: 2/week | Elite: Unlimited
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export type SubscriptionTier = 'free' | 'starter' | 'pro' | 'elite';

export interface StreakFreezeData {
  weeklyAllowance: number;
  freezesUsedThisWeek: number;
  frozenDates: string[];
  currentWeekStart: string;
  totalFreezesUsed: number;
  tier: SubscriptionTier;
}

export interface StreakFreezeStatus {
  canFreeze: boolean;
  remainingFreezes: number;
  isTodayFrozen: boolean;
  frozenDates: string[];
  tier: SubscriptionTier;
  message: string;
}

const STORAGE_KEY = '@peakpulse_streak_freeze';

const FREEZE_LIMITS: Record<SubscriptionTier, number> = {
  free: 0,
  starter: 1,
  pro: 2,
  elite: 999,
};

function getTodayStr(): string {
  return new Date().toISOString().split('T')[0];
}

function getCurrentWeekMonday(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  return monday.toISOString().split('T')[0];
}

export async function loadStreakFreezeData(): Promise<StreakFreezeData> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored) {
      const data: StreakFreezeData = JSON.parse(stored);
      const currentMonday = getCurrentWeekMonday();
      if (data.currentWeekStart !== currentMonday) {
        data.freezesUsedThisWeek = 0;
        data.currentWeekStart = currentMonday;
        data.weeklyAllowance = FREEZE_LIMITS[data.tier] || 0;
        await saveStreakFreezeData(data);
      }
      return data;
    }
  } catch (error) {
    console.error('[StreakFreeze] Error loading data:', error);
  }
  const defaultData: StreakFreezeData = {
    weeklyAllowance: FREEZE_LIMITS.free,
    freezesUsedThisWeek: 0,
    frozenDates: [],
    currentWeekStart: getCurrentWeekMonday(),
    totalFreezesUsed: 0,
    tier: 'free',
  };
  await saveStreakFreezeData(defaultData);
  return defaultData;
}

export async function saveStreakFreezeData(data: StreakFreezeData): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('[StreakFreeze] Error saving data:', error);
  }
}

export async function updateStreakFreezeTier(tier: SubscriptionTier): Promise<void> {
  const data = await loadStreakFreezeData();
  data.tier = tier;
  data.weeklyAllowance = FREEZE_LIMITS[tier];
  await saveStreakFreezeData(data);
}

export async function getStreakFreezeStatus(): Promise<StreakFreezeStatus> {
  const data = await loadStreakFreezeData();
  const todayStr = getTodayStr();
  const isTodayFrozen = data.frozenDates.includes(todayStr);
  const isElite = data.tier === 'elite';
  const remainingFreezes = isElite ? 999 : Math.max(0, data.weeklyAllowance - data.freezesUsedThisWeek);
  const canFreeze = !isTodayFrozen && remainingFreezes > 0;
  let message = '';
  if (data.tier === 'free') {
    message = 'Upgrade to Starter or higher to unlock streak freezes!';
  } else if (isTodayFrozen) {
    message = 'Today is already frozen. Your streak is safe!';
  } else if (canFreeze) {
    const freezeText = isElite ? 'unlimited' : String(remainingFreezes);
    message = 'You have ' + freezeText + ' freeze' + (remainingFreezes !== 1 ? 's' : '') + ' remaining this week.';
  } else {
    message = 'No freezes remaining this week. Upgrade your plan for more!';
  }
  return { canFreeze, remainingFreezes, isTodayFrozen, frozenDates: data.frozenDates, tier: data.tier, message };
}

export async function applyStreakFreeze(dateStr?: string): Promise<boolean> {
  const data = await loadStreakFreezeData();
  const targetDate = dateStr || getTodayStr();
  if (data.frozenDates.includes(targetDate)) return true;
  if (data.tier === 'free') return false;
  if (data.tier !== 'elite' && data.freezesUsedThisWeek >= data.weeklyAllowance) return false;
  data.frozenDates.push(targetDate);
  data.freezesUsedThisWeek += 1;
  data.totalFreezesUsed += 1;
  await saveStreakFreezeData(data);
  return true;
}

export async function autoFreezeIfNeeded(
  workoutDates: string[],
  currentStreak: number
): Promise<{ didFreeze: boolean; message: string }> {
  if (currentStreak < 3) return { didFreeze: false, message: '' };
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  if (workoutDates.includes(yesterdayStr)) return { didFreeze: false, message: '' };
  const data = await loadStreakFreezeData();
  if (data.frozenDates.includes(yesterdayStr)) return { didFreeze: false, message: '' };
  const success = await applyStreakFreeze(yesterdayStr);
  if (success) {
    return { didFreeze: true, message: 'Your ' + currentStreak + '-day streak was saved! A streak freeze was automatically applied for yesterday.' };
  }
  return { didFreeze: false, message: 'Your ' + currentStreak + '-day streak is at risk! You missed yesterday and have no freezes remaining.' };
}

export async function isDateFrozen(dateStr: string): Promise<boolean> {
  const data = await loadStreakFreezeData();
  return data.frozenDates.includes(dateStr);
}

export async function getFrozenDates(): Promise<string[]> {
  const data = await loadStreakFreezeData();
  return data.frozenDates;
}

export function calculateStreakWithFreezes(workoutDates: string[], frozenDates: string[]): number {
  const allActiveDates = new Set([...workoutDates, ...frozenDates]);
  const sortedDates = Array.from(allActiveDates).sort().reverse();
  if (sortedDates.length === 0) return 0;
  const today = getTodayStr();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  if (sortedDates[0] !== today && sortedDates[0] !== yesterdayStr) return 0;
  let streak = 1;
  for (let i = 0; i < sortedDates.length - 1; i++) {
    const current = new Date(sortedDates[i]);
    const next = new Date(sortedDates[i + 1]);
    const diffDays = Math.round((current.getTime() - next.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 1) { streak++; } else { break; }
  }
  return streak;
}
