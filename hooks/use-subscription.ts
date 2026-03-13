import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type SubscriptionTier = "free" | "basic" | "advanced";

const SUBSCRIPTION_KEY = "@peakpulse_subscription";

export interface SubscriptionState {
  tier: SubscriptionTier;
  billingCycle: "monthly" | "annual" | null;
  expiresAt: string | null;
  isBasic: boolean;
  isAdvanced: boolean;
  isPaid: boolean;
}

const DEFAULT_STATE: SubscriptionState = {
  tier: "free",
  billingCycle: null,
  expiresAt: null,
  isBasic: false,
  isAdvanced: false,
  isPaid: false,
};

/**
 * Feature tier matrix — defines which tier each feature requires.
 * "free"     = available to all users (including guests)
 * "basic"    = requires Basic or Advanced subscription
 * "advanced" = requires Advanced subscription only
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

  // Basic features
  body_scan: "basic",           // 1 scan/month on Basic, unlimited on Advanced
  progress_photos: "basic",     // 5/month on Basic, unlimited on Advanced
  meal_swap_ai: "basic",        // 3 swaps/day on Basic, unlimited on Advanced
  referral: "basic",
  notification_preferences: "basic",
  wearable_sync: "basic",

  // Advanced features
  form_checker: "advanced",
  social_feed: "advanced",
  challenges: "advanced",
  ai_coaching: "advanced",      // Personalised coaching (beyond daily tip)
  unlimited_body_scans: "advanced",
  unlimited_progress_photos: "advanced",
  unlimited_meal_swaps: "advanced",
};

export function useSubscription(): SubscriptionState & {
  setSubscription: (tier: SubscriptionTier, billingCycle: "monthly" | "annual") => Promise<void>;
  clearSubscription: () => Promise<void>;
  canAccess: (feature: string) => boolean;
  refresh: () => Promise<void>;
} {
  const [state, setState] = useState<SubscriptionState>(DEFAULT_STATE);

  const load = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(SUBSCRIPTION_KEY);
      if (!raw) { setState(DEFAULT_STATE); return; }
      const saved = JSON.parse(raw);
      // Check expiry
      if (saved.expiresAt && new Date(saved.expiresAt) < new Date()) {
        await AsyncStorage.removeItem(SUBSCRIPTION_KEY);
        setState(DEFAULT_STATE);
        return;
      }
      const tier: SubscriptionTier = saved.tier ?? "free";
      setState({
        tier,
        billingCycle: saved.billingCycle ?? null,
        expiresAt: saved.expiresAt ?? null,
        isBasic: tier === "basic" || tier === "advanced",
        isAdvanced: tier === "advanced",
        isPaid: tier !== "free",
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
    setState({
      tier,
      billingCycle,
      expiresAt: data.expiresAt,
      isBasic: tier === "basic" || tier === "advanced",
      isAdvanced: tier === "advanced",
      isPaid: true,
    });
  }, []);

  const clearSubscription = useCallback(async () => {
    await AsyncStorage.removeItem(SUBSCRIPTION_KEY);
    setState(DEFAULT_STATE);
  }, []);

  const canAccess = useCallback((feature: string): boolean => {
    const required = FEATURE_TIERS[feature] ?? "free";
    if (required === "free") return true;
    if (required === "basic") return state.tier === "basic" || state.tier === "advanced";
    if (required === "advanced") return state.tier === "advanced";
    return false;
  }, [state.tier]);

  return { ...state, setSubscription, clearSubscription, canAccess, refresh: load };
}
