import { useState, useEffect, useCallback, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { scheduleTrialReminders, cancelTrialReminders } from "@/lib/notifications";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";

export type SubscriptionTier = "free" | "basic" | "pro";

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
  isPro: boolean;
  isPaid: boolean;
  /** Effective Pro access — true if tier is pro OR trial is active */
  hasProAccess: boolean;
  /** Whether the subscription is managed by Stripe (server-side) */
  stripeManaged: boolean;
  /** Stripe subscription status (active, past_due, canceled, etc.) */
  stripeStatus: string | null;
  /** Whether the subscription will cancel at period end */
  cancelAtPeriodEnd: boolean;
}

export type FullSubscriptionState = SubscriptionState & TrialState;

const DEFAULT_STATE: FullSubscriptionState = {
  tier: "free",
  billingCycle: null,
  expiresAt: null,
  isBasic: false,
  isPro: false,
  isPaid: false,
  hasProAccess: false,
  stripeManaged: false,
  stripeStatus: null,
  cancelAtPeriodEnd: false,
  hasUsedTrial: false,
  isTrialActive: false,
  trialStartDate: null,
  trialEndDate: null,
  daysLeftInTrial: 0,
};

/**
 * Feature tier matrix — defines which tier each feature requires.
 * "free"  = available to all users (manual logging, exercise library, basic calorie, timer, 2 AI plans/mo, 5 body scans/mo, 4 progress photos/mo)
 * "basic" = requires Basic or Pro subscription (unlimited AI plans, analytics, voice coaching, progress photos, basic body scan, offline mode, PR tracking)
 * "pro"   = requires Pro subscription only (wearable sync, AI coach chat, form checker, social, challenges, meal prep, unlimited photos, priority AI)
 */
export const FEATURE_TIERS: Record<string, SubscriptionTier> = {
  // Free features — available to all users
  calorie_estimator: "free",
  gym_finder: "free",
  daily_checkin: "free",
  tips_tricks: "free",
  onboarding: "free",
  // Basic features — unlocked with Basic or Pro
  ai_meal_plans: "basic",
  ai_workout_plans: "basic",
  meal_swap_ai: "basic",
  body_scan: "basic",
  progress_photos: "basic",
  referral: "basic",
  notification_preferences: "basic",
  workout_analytics: "basic",
  voice_coaching: "basic",
  offline_mode: "basic",
  pr_tracking: "basic",
  wearable_sync: "basic",  // moved from Pro
  social_feed: "basic",    // moved from Pro (read-only)
  // Pro features — unlocked with Pro only
  form_checker: "pro",
  challenges: "pro",
  ai_coaching: "pro",
  unlimited_body_scans: "pro",
  unlimited_progress_photos: "pro",
  unlimited_meal_swaps: "pro",
  meal_prep: "pro",
  priority_ai: "pro",
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
  const duration = trialData.durationDays ?? TRIAL_DURATION_DAYS;
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

export function useSubscription(): FullSubscriptionState & {
  setSubscription: (tier: SubscriptionTier, billingCycle: "monthly" | "annual") => Promise<void>;
  clearSubscription: () => Promise<void>;
  /** Start a free trial. Pass `durationDays` to override the default 7-day duration (e.g. 14 for referral trial). */
  startTrial: (durationDays?: number) => Promise<void>;
  canAccess: (feature: string) => boolean;
  refresh: () => Promise<void>;
  /** Open Stripe checkout for a plan */
  openCheckout: (plan: "basic" | "pro", billingCycle: "monthly" | "annual") => Promise<string | null>;
  /** Open Stripe customer portal for managing subscription */
  openPortal: () => Promise<string | null>;
  /** Cancel the Stripe subscription at period end */
  cancelStripeSubscription: () => Promise<boolean>;
  /** Reactivate a Stripe subscription that was set to cancel */
  reactivateStripeSubscription: () => Promise<boolean>;
} {
  const [state, setState] = useState<FullSubscriptionState>(DEFAULT_STATE);
  const { user } = useAuth({ autoFetch: false });
  const isAuthenticated = !!user;
  const serverSubRef = useRef<{ plan: string; status: string; billingCycle: string; currentPeriodEnd: string | null; cancelAtPeriodEnd: boolean } | null>(null);

  // tRPC mutations for Stripe operations
  const checkoutMutation = trpc.subscription.createCheckout.useMutation();
  const portalMutation = trpc.subscription.createPortal.useMutation();
  const cancelMutation = trpc.subscription.cancel.useMutation();
  const reactivateMutation = trpc.subscription.reactivate.useMutation();

  // Query server subscription status when authenticated
  const { data: serverSub, refetch: refetchServerSub } = trpc.subscription.getCurrentPlan.useQuery(
    undefined,
    { enabled: isAuthenticated, staleTime: 60_000, refetchOnWindowFocus: true },
  );

  // Track server subscription data
  useEffect(() => {
    if (serverSub) {
      serverSubRef.current = serverSub as any;
    }
  }, [serverSub]);

  const load = useCallback(async () => {
    try {
      const [rawSub, rawTrial] = await Promise.all([
        AsyncStorage.getItem(SUBSCRIPTION_KEY),
        AsyncStorage.getItem(TRIAL_KEY),
      ]);

      // Parse trial state
      const trialData = rawTrial ? JSON.parse(rawTrial) : null;
      const trialState = computeTrialState(trialData);

      // Parse local subscription state
      let tier: SubscriptionTier = "free";
      let billingCycle: "monthly" | "annual" | null = null;
      let expiresAt: string | null = null;
      let stripeManaged = false;
      let stripeStatus: string | null = null;
      let cancelAtPeriodEnd = false;

      // Check server-side Stripe subscription first (takes priority)
      const srv = serverSubRef.current;
      if (srv && srv.plan !== "free") {
        tier = srv.plan as SubscriptionTier;
        billingCycle = (srv.billingCycle as "monthly" | "annual") ?? null;
        expiresAt = srv.currentPeriodEnd ?? null;
        stripeManaged = true;
        stripeStatus = srv.status;
        cancelAtPeriodEnd = srv.cancelAtPeriodEnd;
        // Sync to local storage so offline access works
        await AsyncStorage.setItem(SUBSCRIPTION_KEY, JSON.stringify({ tier, billingCycle, expiresAt, stripeManaged: true }));
      } else if (rawSub) {
        const saved = JSON.parse(rawSub);
        if (saved.expiresAt && new Date(saved.expiresAt) < new Date()) {
          // Subscription expired — clean up
          await AsyncStorage.removeItem(SUBSCRIPTION_KEY);
        } else {
          tier = saved.tier ?? "free";
          billingCycle = saved.billingCycle ?? null;
          expiresAt = saved.expiresAt ?? null;
          stripeManaged = saved.stripeManaged ?? false;
        }
      }

      // Effective Pro access: paid Pro OR active trial
      const hasProAccess = tier === "pro" || trialState.isTrialActive;

      setState({
        tier,
        billingCycle,
        expiresAt,
        isBasic: tier === "basic" || tier === "pro",
        isPro: tier === "pro",
        isPaid: tier !== "free",
        hasProAccess,
        stripeManaged,
        stripeStatus,
        cancelAtPeriodEnd,
        ...trialState,
      });
    } catch {
      setState(DEFAULT_STATE);
    }
  }, []);

  // Reload when server subscription data changes
  useEffect(() => { load(); }, [load, serverSub]);

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

  const startTrial = useCallback(async (durationDays: number = TRIAL_DURATION_DAYS) => {
    // Only allow starting a trial if one has never been used
    const existing = await AsyncStorage.getItem(TRIAL_KEY);
    if (existing) return; // Trial already used — do not reset
    const startDate = new Date().toISOString();
    // Store duration so computeTrialState can use the correct end date
    const trialData = { startDate, durationDays };
    await AsyncStorage.setItem(TRIAL_KEY, JSON.stringify(trialData));
    // Schedule Day 5 and Day 7 reminder notifications
    scheduleTrialReminders(startDate).catch(() => {}); // fire-and-forget; permission may be denied
    await load();
  }, [load]);

  const canAccess = useCallback((feature: string): boolean => {
    const required = FEATURE_TIERS[feature] ?? "free";
    if (required === "free") return true;
    // Active trial grants full Pro access
    if (state.isTrialActive) return true;
    if (required === "basic") return state.tier === "basic" || state.tier === "pro";
    if (required === "pro") return state.tier === "pro";
    return false;
  }, [state.tier, state.isTrialActive]);

  // ── Stripe operations ──────────────────────────────────────────────────

  const openCheckout = useCallback(async (plan: "basic" | "pro", billingCycle: "monthly" | "annual"): Promise<string | null> => {
    try {
      const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://fytnova.app";
      const result = await checkoutMutation.mutateAsync({
        plan,
        billingCycle,
        successUrl: `${baseUrl}/subscription-success`,
        cancelUrl: `${baseUrl}/subscription-plans`,
      });
      return result.url;
    } catch (err) {
      console.error("[Subscription] Checkout failed:", err);
      return null;
    }
  }, [checkoutMutation]);

  const openPortal = useCallback(async (): Promise<string | null> => {
    try {
      const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://fytnova.app";
      const result = await portalMutation.mutateAsync({ returnUrl: `${baseUrl}/settings` });
      return result.url;
    } catch (err) {
      console.error("[Subscription] Portal failed:", err);
      return null;
    }
  }, [portalMutation]);

  const cancelStripeSubscription = useCallback(async (): Promise<boolean> => {
    try {
      await cancelMutation.mutateAsync();
      await refetchServerSub();
      await load();
      return true;
    } catch (err) {
      console.error("[Subscription] Cancel failed:", err);
      return false;
    }
  }, [cancelMutation, refetchServerSub, load]);

  const reactivateStripeSubscription = useCallback(async (): Promise<boolean> => {
    try {
      await reactivateMutation.mutateAsync();
      await refetchServerSub();
      await load();
      return true;
    } catch (err) {
      console.error("[Subscription] Reactivate failed:", err);
      return false;
    }
  }, [reactivateMutation, refetchServerSub, load]);

  return {
    ...state,
    setSubscription,
    clearSubscription,
    startTrial,
    canAccess,
    refresh: load,
    openCheckout,
    openPortal,
    cancelStripeSubscription,
    reactivateStripeSubscription,
  };
}
