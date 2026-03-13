import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { scheduleTrialReminders, cancelTrialReminders } from "@/lib/notifications";

export type SubscriptionTier = "free" | "basic" | "advanced";

const SUBSCRIPTION_KEY = "@peakpulse_subscription";
const TRIAL_KEY = "@peakpulse_trial";
const TRIAL_DURATION_DAYS = 7;

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
  isBasic: boolean;
  isAdvanced: boolean;
  isPaid: boolean;
  /** Effective Advanced access — true if tier is advanced OR trial is active */
  hasAdvancedAccess: boolean;
}

export type FullSubscriptionState = SubscriptionState & TrialState;

const DEFAULT_STATE: FullSubscriptionState = {
  tier: "free",
  billingCycle: null,
  expiresAt: null,
  isBasic: false,
  isAdvanced: false,
  isPaid: false,
  hasAdvancedAccess: false,
  hasUsedTrial: false,
  isTrialActive: false,
  trialStartDate: null,
  trialEndDate: null,
  daysLeftInTrial: 0,
};

/**
 * Feature tier matrix — defines which tier each feature requires.
 * "free"     = available to all users (including guests)
 * "basic"    = requires Basic or Advanced subscription (or active trial)
 * "advanced" = requires Advanced subscription only (or active trial)
 */
export const FEATURE_TIERS: Record<string, SubscriptionTier> = {
  // Free features
  ai_meal_plans: "free",
  ai_workout_plans: "free",
  calorie_estimator: "free",
  gym_finder: "free",
  daily_checkin: "free",
  tips_tricks: "free",
  onboarding: "free",
  meal_swap_ai: "free",
  // Basic features
  body_scan: "basic",
  progress_photos: "basic",
  referral: "basic",
  notification_preferences: "basic",
  wearable_sync: "basic",
  // Advanced features
  form_checker: "advanced",
  social_feed: "advanced",
  challenges: "advanced",
  ai_coaching: "advanced",
  unlimited_body_scans: "advanced",
  unlimited_progress_photos: "advanced",
  unlimited_meal_swaps: "advanced",
};

function computeTrialState(trialData: { startDate: string } | null): TrialState {
  if (!trialData) {
    return {
      hasUsedTrial: false,
      isTrialActive: false,
      trialStartDate: null,
      trialEndDate: null,
      daysLeftInTrial: 0,
    };
  }
  const startDate = new Date(trialData.startDate);
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + TRIAL_DURATION_DAYS);
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

export function useSubscription(): FullSubscriptionState & {
  setSubscription: (tier: SubscriptionTier, billingCycle: "monthly" | "annual") => Promise<void>;
  clearSubscription: () => Promise<void>;
  startTrial: () => Promise<void>;
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
          tier = saved.tier ?? "free";
          billingCycle = saved.billingCycle ?? null;
          expiresAt = saved.expiresAt ?? null;
        }
      }

      // Effective Advanced access: paid Advanced OR active trial
      const hasAdvancedAccess = tier === "advanced" || trialState.isTrialActive;

      setState({
        tier,
        billingCycle,
        expiresAt,
        isBasic: tier === "basic" || tier === "advanced",
        isAdvanced: tier === "advanced",
        isPaid: tier !== "free",
        hasAdvancedAccess,
        ...trialState,
      });
    } catch {
      setState(DEFAULT_STATE);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const setSubscription = useCallback(async (tier: SubscriptionTier, billingCycle: "monthly" | "annual") => {
    const months = billingCycle === "annual" ? 12 : 1;
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + months);
    const data = { tier, billingCycle, expiresAt: expiresAt.toISOString() };
    await AsyncStorage.setItem(SUBSCRIPTION_KEY, JSON.stringify(data));
    // Cancel trial reminders — user has subscribed, no longer needs the nudge
    cancelTrialReminders().catch(() => {});
    await load();
  }, [load]);

  const clearSubscription = useCallback(async () => {
    await AsyncStorage.removeItem(SUBSCRIPTION_KEY);
    await load();
  }, [load]);

  const startTrial = useCallback(async () => {
    // Only allow starting a trial if one has never been used
    const existing = await AsyncStorage.getItem(TRIAL_KEY);
    if (existing) return; // Trial already used — do not reset
    const startDate = new Date().toISOString();
    const trialData = { startDate };
    await AsyncStorage.setItem(TRIAL_KEY, JSON.stringify(trialData));
    // Schedule Day 5 and Day 7 reminder notifications
    scheduleTrialReminders(startDate).catch(() => {}); // fire-and-forget; permission may be denied
    await load();
  }, [load]);

  const canAccess = useCallback((feature: string): boolean => {
    const required = FEATURE_TIERS[feature] ?? "free";
    if (required === "free") return true;
    // Active trial grants full Advanced access
    if (state.isTrialActive) return true;
    if (required === "basic") return state.tier === "basic" || state.tier === "advanced";
    if (required === "advanced") return state.tier === "advanced";
    return false;
  }, [state.tier, state.isTrialActive]);

  return { ...state, setSubscription, clearSubscription, startTrial, canAccess, refresh: load };
}
