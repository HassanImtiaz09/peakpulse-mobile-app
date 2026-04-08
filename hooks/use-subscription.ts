import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { scheduleTrialReminders, cancelTrialReminders } from "@/lib/notifications";
import {
  type SubscriptionTier,
  type FeatureKey,
  FEATURE_TIERS,
  TIER_RANK,
  AI_CALL_LIMITS,
  TRIAL_CONFIG,
  normalizeLegacyTier,
} from "@/constants/pricing";

// Re-export for convenience
export type { SubscriptionTier };

const SUBSCRIPTION_KEY = "@peakpulse_subscription";
const TRIAL_KEY = "@peakpulse_trial";
const AI_CALLS_KEY = "@peakpulse_ai_calls";

export interface TrialState {
  /** Whether the user has ever started a trial (used/expired/active) */
  hasUsedTrial: boolean;
  /** Whether the trial is currently active (started and not yet expired) */
  isTrialActive: boolean;
  /** ISO date string when the trial started, or null */
  trialStartDate: string | null;
  /** ISO date string when the trial ends, or null */
  trialEndDate: string | null;
  /** Number of full days remaining in the trial (0 if expired or not started) */
  daysLeftInTrial: number;
}

export interface SubscriptionState {
  tier: SubscriptionTier;
  billingCycle: "monthly" | "annual" | null;
  expiresAt: string | null;
  isStarter: boolean;
  isPro: boolean;
  isElite: boolean;
  isPaid: boolean;
  /** Effective Pro access — true if tier is pro/elite OR trial is active */
  hasProAccess: boolean;
  /** AI calls made today */
  aiCallsToday: number;
  /** AI calls remaining today (or "unlimited" for elite) */
  aiCallsRemaining: number | "unlimited";
}

export type FullSubscriptionState = SubscriptionState & TrialState;

const DEFAULT_STATE: FullSubscriptionState = {
  tier: "free",
  billingCycle: null,
  expiresAt: null,
  isStarter: false,
  isPro: false,
  isElite: false,
  isPaid: false,
  hasProAccess: false,
  hasUsedTrial: false,
  isTrialActive: false,
  trialStartDate: null,
  trialEndDate: null,
  daysLeftInTrial: 0,
  aiCallsToday: 0,
  aiCallsRemaining: AI_CALL_LIMITS.free.daily,
};

function computeTrialState(trialData: { startDate: string; durationDays?: number } | null): TrialState {
  if (!trialData) {
    return {
      hasUsedTrial: false,
      isTrialActive: false,
      trialStartDate: null,
      trialEndDate: null,
      daysLeftInTrial: 0,
    };
  }

  const duration = trialData.durationDays ?? TRIAL_CONFIG.durationDays;
  const startDate = new Date(trialData.startDate);
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + duration);

  const now = new Date();
  const isActive = now < endDate;
  const msLeft = endDate.getTime() - now.getTime();
  const daysLeft = isActive ? Math.ceil(msLeft / (1000 * 60 * 60 * 24)) : 0;

  return {
    hasUsedTrial: true,
    isTrialActive: isActive,
    trialStartDate: trialData.startDate,
    trialEndDate: endDate.toISOString(),
    daysLeftInTrial: daysLeft,
  };
}

/** Get today's AI call count from storage */
async function getAICallsToday(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(AI_CALLS_KEY);
    if (!raw) return 0;
    const data = JSON.parse(raw);
    const today = new Date().toISOString().split("T")[0];
    if (data.date !== today) return 0; // Reset for new day
    return data.count ?? 0;
  } catch {
    return 0;
  }
}

/** Increment today's AI call count */
export async function incrementAICallCount(): Promise<number> {
  const today = new Date().toISOString().split("T")[0];
  let count = 0;
  try {
    const raw = await AsyncStorage.getItem(AI_CALLS_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      count = data.date === today ? (data.count ?? 0) : 0;
    }
  } catch {}
  count += 1;
  await AsyncStorage.setItem(AI_CALLS_KEY, JSON.stringify({ date: today, count }));
  return count;
}

export function useSubscription(): FullSubscriptionState & {
  setSubscription: (tier: SubscriptionTier, billingCycle: "monthly" | "annual") => Promise<void>;
  clearSubscription: () => Promise<void>;
  /** Start a free trial. Pass `durationDays` to override the default duration. */
  startTrial: (durationDays?: number) => Promise<void>;
  canAccess: (feature: string) => boolean;
  refresh: () => Promise<void>;
} {
  const [state, setState] = useState<FullSubscriptionState>(DEFAULT_STATE);

  const load = useCallback(async () => {
    try {
      const [rawSub, rawTrial] = await Promise.all([
        AsyncStorage.getItem(SUBSCRIPTION_KEY),
        AsyncStorage.getItem(TRIAL_KEY),
      ]);

      // Parse trial state
      const trialData = rawTrial ? JSON.parse(rawTrial) : null;
      const trialState = computeTrialState(trialData);

      // Parse subscription state
      let tier: SubscriptionTier = "free";
      let billingCycle: "monthly" | "annual" | null = null;
      let expiresAt: string | null = null;

      if (rawSub) {
        const saved = JSON.parse(rawSub);
        if (saved.expiresAt && new Date(saved.expiresAt) < new Date()) {
          // Subscription expired — clean up
          await AsyncStorage.removeItem(SUBSCRIPTION_KEY);
        } else {
          // Normalize legacy "basic" tier to "starter"
          tier = normalizeLegacyTier(saved.tier ?? "free");
          billingCycle = saved.billingCycle ?? null;
          expiresAt = saved.expiresAt ?? null;
        }
      }

      // Get AI call count for today
      const aiCallsToday = await getAICallsToday();
      const limits = AI_CALL_LIMITS[tier];
      const aiCallsRemaining = limits.isUnlimited
        ? ("unlimited" as const)
        : Math.max(0, limits.daily - aiCallsToday);

      // Effective Pro access: paid Pro/Elite OR active trial
      const hasProAccess = TIER_RANK[tier] >= TIER_RANK.pro || trialState.isTrialActive;

      setState({
        tier,
        billingCycle,
        expiresAt,
        isStarter: TIER_RANK[tier] >= TIER_RANK.starter,
        isPro: TIER_RANK[tier] >= TIER_RANK.pro,
        isElite: tier === "elite",
        isPaid: tier !== "free",
        hasProAccess,
        aiCallsToday,
        aiCallsRemaining,
        ...trialState,
      });
    } catch {
      setState(DEFAULT_STATE);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const setSubscription = useCallback(
    async (tier: SubscriptionTier, billingCycle: "monthly" | "annual") => {
      const months = billingCycle === "annual" ? 12 : 1;
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + months);

      const data = { tier, billingCycle, expiresAt: expiresAt.toISOString() };
      await AsyncStorage.setItem(SUBSCRIPTION_KEY, JSON.stringify(data));

      // Cancel trial reminders — user has subscribed
      cancelTrialReminders().catch(() => {});
      await load();
    },
    [load]
  );

  const clearSubscription = useCallback(async () => {
    await AsyncStorage.removeItem(SUBSCRIPTION_KEY);
    await load();
  }, [load]);

  const startTrial = useCallback(
    async (durationDays: number = TRIAL_CONFIG.durationDays) => {
      // Only allow starting a trial if one has never been used
      const existing = await AsyncStorage.getItem(TRIAL_KEY);
      if (existing) return; // Trial already used

      const startDate = new Date().toISOString();
      const trialData = { startDate, durationDays };
      await AsyncStorage.setItem(TRIAL_KEY, JSON.stringify(trialData));

      // Schedule reminder notifications
      scheduleTrialReminders(startDate).catch(() => {});
      await load();
    },
    [load]
  );

  const canAccess = useCallback(
    (feature: string): boolean => {
      const required = FEATURE_TIERS[feature as FeatureKey] ?? "free";
      if (required === "free") return true;

      // Active trial grants Pro-level access
      if (state.isTrialActive) {
        return TIER_RANK[required] <= TIER_RANK[TRIAL_CONFIG.trialTier];
      }

      // Check tier rank: user's tier must be >= required tier
      return TIER_RANK[state.tier] >= TIER_RANK[required];
    },
    [state.tier, state.isTrialActive]
  );

  return {
    ...state,
    setSubscription,
    clearSubscription,
    startTrial,
    canAccess,
    refresh: load,
  };
}

