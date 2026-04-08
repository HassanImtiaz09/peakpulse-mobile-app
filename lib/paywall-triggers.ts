// lib/paywall-triggers.ts
// Smart Paywall Trigger System for PeakPulse AI
// Delays paywall until after the user experiences their first value moment
// Uses behavioral signals to find the optimal conversion point

import AsyncStorage from "@react-native-async-storage/async-storage";

// —— Types ——————————————————————————————————

export type ValueMoment =
  | "first_plan_generated"
  | "first_workout_completed"
  | "first_streak_3_days"
  | "first_program_enrolled"
  | "first_milestone_reached"
  | "ai_coach_interaction";

export type PaywallTrigger =
  | "post_value_moment"
  | "feature_gate"
  | "session_count"
  | "time_based"
  | "upgrade_nudge";

export type PaywallStyle = "full_screen" | "bottom_sheet" | "inline_banner" | "subtle_badge";

export interface PaywallConfig {
  trigger: PaywallTrigger;
  style: PaywallStyle;
  title: string;
  subtitle: string;
  ctaText: string;
  dismissible: boolean;
  showAfterValueMoment: boolean;
  minimumSessionsBeforeShow: number;
  cooldownMinutes: number;
  highlightTier: "starter" | "pro" | "elite";
  showSavings: boolean;
  showDailyBreakdown: boolean;
}

export interface PaywallState {
  valueMomentsReached: ValueMoment[];
  totalSessions: number;
  paywallsShown: number;
  paywallsDismissed: number;
  lastPaywallShownAt: string | null;
  conversionDate: string | null;
  currentTier: "free" | "starter" | "pro" | "elite";
  firstOpenDate: string;
  hasCompletedOnboarding: boolean;
}

export interface PaywallDecision {
  shouldShow: boolean;
  config: PaywallConfig | null;
  reason: string;
}

// —— Storage ——————————————————————————————

const PAYWALL_STATE_KEY = "peakpulse_paywall_state";

export async function getPaywallState(): Promise<PaywallState> {
  try {
    const data = await AsyncStorage.getItem(PAYWALL_STATE_KEY);
    if (data) return JSON.parse(data);
  } catch {
    // ignore
  }
  return {
    valueMomentsReached: [],
    totalSessions: 0,
    paywallsShown: 0,
    paywallsDismissed: 0,
    lastPaywallShownAt: null,
    conversionDate: null,
    currentTier: "free",
    firstOpenDate: new Date().toISOString(),
    hasCompletedOnboarding: false,
  };
}

export async function savePaywallState(state: PaywallState): Promise<void> {
  await AsyncStorage.setItem(PAYWALL_STATE_KEY, JSON.stringify(state));
}

// —— Value Moment Tracking ————————————————

export async function recordValueMoment(moment: ValueMoment): Promise<void> {
  const state = await getPaywallState();
  if (!state.valueMomentsReached.includes(moment)) {
    state.valueMomentsReached.push(moment);
    await savePaywallState(state);
  }
}

export async function recordSessionOpen(): Promise<void> {
  const state = await getPaywallState();
  state.totalSessions += 1;
  await savePaywallState(state);
}

export async function recordOnboardingComplete(): Promise<void> {
  const state = await getPaywallState();
  state.hasCompletedOnboarding = true;
  await savePaywallState(state);
}

export async function recordPaywallShown(): Promise<void> {
  const state = await getPaywallState();
  state.paywallsShown += 1;
  state.lastPaywallShownAt = new Date().toISOString();
  await savePaywallState(state);
}

export async function recordPaywallDismissed(): Promise<void> {
  const state = await getPaywallState();
  state.paywallsDismissed += 1;
  await savePaywallState(state);
}

export async function recordConversion(tier: "starter" | "pro" | "elite"): Promise<void> {
  const state = await getPaywallState();
  state.currentTier = tier;
  state.conversionDate = new Date().toISOString();
  await savePaywallState(state);
}

// —— Paywall Configurations ———————————————

const PAYWALL_CONFIGS: Record<string, PaywallConfig> = {
  post_first_workout: {
    trigger: "post_value_moment",
    style: "full_screen",
    title: "You just crushed your first workout!",
    subtitle: "Unlock unlimited workouts, AI coaching, and structured programs to keep the momentum going.",
    ctaText: "Continue Your Journey",
    dismissible: true,
    showAfterValueMoment: true,
    minimumSessionsBeforeShow: 1,
    cooldownMinutes: 0,
    highlightTier: "pro",
    showSavings: true,
    showDailyBreakdown: true,
  },
  post_first_plan: {
    trigger: "post_value_moment",
    style: "bottom_sheet",
    title: "Your personalized plan is ready!",
    subtitle: "Go Pro to unlock adaptive difficulty, outcome programs, and your personal AI coach.",
    ctaText: "Unlock Full Plan",
    dismissible: true,
    showAfterValueMoment: true,
    minimumSessionsBeforeShow: 1,
    cooldownMinutes: 0,
    highlightTier: "pro",
    showSavings: true,
    showDailyBreakdown: true,
  },
  session_3_nudge: {
    trigger: "session_count",
    style: "bottom_sheet",
    title: "You're building a habit!",
    subtitle: "3 sessions in — you're ahead of 80% of users. Pro members see 3x faster results.",
    ctaText: "Go Pro",
    dismissible: true,
    showAfterValueMoment: false,
    minimumSessionsBeforeShow: 3,
    cooldownMinutes: 1440, // 24 hours
    highlightTier: "pro",
    showSavings: true,
    showDailyBreakdown: false,
  },
  streak_celebration: {
    trigger: "post_value_moment",
    style: "full_screen",
    title: "3-day streak! You're on fire!",
    subtitle: "Keep the momentum — Elite members get streak freezes, advanced programs, and priority coaching.",
    ctaText: "Protect Your Streak",
    dismissible: true,
    showAfterValueMoment: true,
    minimumSessionsBeforeShow: 3,
    cooldownMinutes: 4320, // 3 days
    highlightTier: "elite",
    showSavings: true,
    showDailyBreakdown: true,
  },
  gentle_reminder: {
    trigger: "time_based",
    style: "inline_banner",
    title: "Unlock your full potential",
    subtitle: "Adaptive workouts, structured programs, and AI coaching — all in Pro.",
    ctaText: "See Plans",
    dismissible: true,
    showAfterValueMoment: false,
    minimumSessionsBeforeShow: 5,
    cooldownMinutes: 10080, // 7 days
    highlightTier: "pro",
    showSavings: false,
    showDailyBreakdown: false,
  },
  feature_locked: {
    trigger: "feature_gate",
    style: "bottom_sheet",
    title: "This feature requires an upgrade",
    subtitle: "Unlock this and more with a Pro or Elite subscription.",
    ctaText: "View Plans",
    dismissible: true,
    showAfterValueMoment: false,
    minimumSessionsBeforeShow: 0,
    cooldownMinutes: 60,
    highlightTier: "pro",
    showSavings: true,
    showDailyBreakdown: true,
  },
};

// —— Decision Engine —————————————————————

export async function shouldShowPaywall(context?: { trigger?: PaywallTrigger; valueMoment?: ValueMoment }): Promise<PaywallDecision> {
  const state = await getPaywallState();

  // Already a paid user — never show
  if (state.currentTier !== "free") {
    return { shouldShow: false, config: null, reason: "User is already subscribed" };
  }

  // Check cooldown
  if (state.lastPaywallShownAt) {
    const lastShown = new Date(state.lastPaywallShownAt).getTime();
    const minutesSince = (Date.now() - lastShown) / (1000 * 60);
    if (minutesSince < 30) {
      return { shouldShow: false, config: null, reason: "Cooldown period active" };
    }
  }

  // Post value-moment triggers (highest priority)
  if (context?.valueMoment) {
    if (context.valueMoment === "first_workout_completed" && !state.valueMomentsReached.includes("first_workout_completed")) {
      return { shouldShow: true, config: PAYWALL_CONFIGS.post_first_workout, reason: "First workout completed" };
    }
    if (context.valueMoment === "first_plan_generated" && !state.valueMomentsReached.includes("first_plan_generated")) {
      return { shouldShow: true, config: PAYWALL_CONFIGS.post_first_plan, reason: "First plan generated" };
    }
    if (context.valueMoment === "first_streak_3_days") {
      return { shouldShow: true, config: PAYWALL_CONFIGS.streak_celebration, reason: "3-day streak achieved" };
    }
  }

  // Feature gate trigger
  if (context?.trigger === "feature_gate") {
    return { shouldShow: true, config: PAYWALL_CONFIGS.feature_locked, reason: "Locked feature accessed" };
  }

  // Session count milestones
  if (state.totalSessions === 3 && state.paywallsShown < 2) {
    return { shouldShow: true, config: PAYWALL_CONFIGS.session_3_nudge, reason: "3rd session milestone" };
  }

  // Time-based gentle reminder (after 7+ days, 5+ sessions, no conversion)
  if (state.totalSessions >= 5) {
    const daysSinceFirst = Math.floor((Date.now() - new Date(state.firstOpenDate).getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceFirst >= 7 && state.paywallsShown < 5) {
      const lastShownMinutes = state.lastPaywallShownAt
        ? (Date.now() - new Date(state.lastPaywallShownAt).getTime()) / (1000 * 60)
        : Infinity;
      if (lastShownMinutes > 10080) {
        return { shouldShow: true, config: PAYWALL_CONFIGS.gentle_reminder, reason: "Weekly gentle reminder" };
      }
    }
  }

  return { shouldShow: false, config: null, reason: "No trigger conditions met" };
}

// —— Pricing Display Helpers ——————————————

export function calculateDailyBreakdown(monthlyPrice: number): string {
  const daily = (monthlyPrice / 30).toFixed(2);
  return `Just $${daily}/day`;
}

export function calculateAnnualSavings(monthlyPrice: number, annualPrice: number): {
  savingsPercent: number;
  savingsAmount: number;
  monthlyEquivalent: number;
} {
  const annualIfMonthly = monthlyPrice * 12;
  const savingsAmount = Math.round((annualIfMonthly - annualPrice) * 100) / 100;
  const savingsPercent = Math.round((savingsAmount / annualIfMonthly) * 100);
  const monthlyEquivalent = Math.round((annualPrice / 12) * 100) / 100;
  return { savingsPercent, savingsAmount, monthlyEquivalent };
}

export function getOutcomeBasedMessage(tier: string): string {
  const messages: Record<string, string> = {
    starter: "Users on Starter complete 2x more workouts per week",
    pro: "Pro members achieve their fitness goals 3x faster on average",
    elite: "Elite members see 40% better results with personalized AI coaching",
  };
  return messages[tier] || messages.pro;
}

// —— Paywall Analytics ————————————————————

export async function getPaywallAnalytics(): Promise<{
  totalShown: number;
  totalDismissed: number;
  conversionRate: number;
  avgSessionsBeforeConversion: number;
  valueMomentsReached: number;
}> {
  const state = await getPaywallState();
  const converted = state.conversionDate !== null;
  const conversionRate = state.paywallsShown > 0 ? (converted ? (1 / state.paywallsShown) * 100 : 0) : 0;

  return {
    totalShown: state.paywallsShown,
    totalDismissed: state.paywallsDismissed,
    conversionRate: Math.round(conversionRate),
    avgSessionsBeforeConversion: converted ? state.totalSessions : 0,
    valueMomentsReached: state.valueMomentsReached.length,
  };
}
