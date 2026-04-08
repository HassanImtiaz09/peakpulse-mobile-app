// lib/upgrade-prompts.ts
// Contextual Upgrade Prompt System for PeakPulse AI
// Shows targeted upgrade modals when free users access locked features
// Each prompt explains the specific value they'd unlock

import AsyncStorage from "@react-native-async-storage/async-storage";

// —— Types ——————————————————————————————————

export type FeatureId =
  | "adaptive_workouts"
  | "outcome_programs"
  | "ai_coach"
  | "streak_freeze"
  | "advanced_analytics"
  | "custom_workout_builder"
  | "nutrition_tracking"
  | "priority_support"
  | "export_data"
  | "workout_history_full";

export type RequiredTier = "starter" | "pro" | "elite";

export interface FeatureGate {
  featureId: FeatureId;
  requiredTier: RequiredTier;
  name: string;
  description: string;
  upgradeTitle: string;
  upgradeMessage: string;
  upgradeCtaText: string;
  benefitPoints: string[];
  icon: string;
}

export interface UpgradePromptLog {
  featureId: FeatureId;
  shownAt: string;
  dismissed: boolean;
  converted: boolean;
}

export interface UpgradePromptState {
  promptHistory: UpgradePromptLog[];
  suppressedFeatures: FeatureId[];
  totalPromptsShown: number;
  lastPromptShownAt: string | null;
}

// —— Storage ——————————————————————————————

const UPGRADE_STATE_KEY = "peakpulse_upgrade_prompts";

async function getUpgradeState(): Promise<UpgradePromptState> {
  try {
    const data = await AsyncStorage.getItem(UPGRADE_STATE_KEY);
    if (data) return JSON.parse(data);
  } catch {
    // ignore
  }
  return {
    promptHistory: [],
    suppressedFeatures: [],
    totalPromptsShown: 0,
    lastPromptShownAt: null,
  };
}

async function saveUpgradeState(state: UpgradePromptState): Promise<void> {
  await AsyncStorage.setItem(UPGRADE_STATE_KEY, JSON.stringify(state));
}

// —— Feature Gate Definitions —————————————

const FEATURE_GATES: Record<FeatureId, FeatureGate> = {
  adaptive_workouts: {
    featureId: "adaptive_workouts",
    requiredTier: "pro",
    name: "Adaptive Workouts",
    description: "Workouts that automatically adjust to your fatigue, recovery, and progress",
    upgradeTitle: "Unlock Smart Workouts",
    upgradeMessage: "Your workouts will automatically adapt based on how you're feeling, your recovery status, and your progress. No more guessing — the AI does the thinking for you.",
    upgradeCtaText: "Get Adaptive Workouts",
    benefitPoints: [
      "Auto-adjusts difficulty based on your recovery",
      "Smart exercise selection for your goals",
      "Progressive overload built in automatically",
      "Never waste a workout again",
    ],
    icon: "brain",
  },
  outcome_programs: {
    featureId: "outcome_programs",
    requiredTier: "pro",
    name: "Outcome Programs",
    description: "Structured multi-week programs with milestones and tracking",
    upgradeTitle: "Follow a Proven Program",
    upgradeMessage: "Stop guessing. Follow structured programs like 'Lean Machine' or 'Mass Builder' with weekly plans, milestones, and progress tracking.",
    upgradeCtaText: "Start a Program",
    benefitPoints: [
      "4 expert-designed programs to choose from",
      "Weekly progressive plans with clear phases",
      "Milestone rewards to keep you motivated",
      "Real-time progress analytics",
    ],
    icon: "target",
  },
  ai_coach: {
    featureId: "ai_coach",
    requiredTier: "pro",
    name: "AI Coach",
    description: "Personalized coaching with motivational messages and form tips",
    upgradeTitle: "Meet Your AI Coach",
    upgradeMessage: "Get a personal AI coach that knows your goals, adapts to your mood, and keeps you motivated with contextual advice and encouragement.",
    upgradeCtaText: "Unlock AI Coaching",
    benefitPoints: [
      "4 coach personalities to choose from",
      "Context-aware motivational messages",
      "Form tips and workout guidance",
      "Celebrates your wins with you",
    ],
    icon: "message-circle",
  },
  streak_freeze: {
    featureId: "streak_freeze",
    requiredTier: "elite",
    name: "Streak Freeze",
    description: "Protect your streak on rest days or busy days",
    upgradeTitle: "Protect Your Streak",
    upgradeMessage: "Life happens. Elite members get streak freezes so a busy day doesn't erase weeks of consistency.",
    upgradeCtaText: "Get Streak Protection",
    benefitPoints: [
      "Up to 2 streak freezes per week",
      "Never lose your streak to a rest day",
      "Automatic freeze on recovery days",
      "Keep your motivation intact",
    ],
    icon: "shield",
  },
  advanced_analytics: {
    featureId: "advanced_analytics",
    requiredTier: "elite",
    name: "Advanced Analytics",
    description: "Deep insights into your workout patterns and progress trends",
    upgradeTitle: "See Your Full Picture",
    upgradeMessage: "Unlock detailed analytics including workout trends, muscle group balance, recovery patterns, and projected goal completion dates.",
    upgradeCtaText: "Unlock Analytics",
    benefitPoints: [
      "Workout frequency and consistency trends",
      "Muscle group balance analysis",
      "Recovery quality tracking",
      "Goal projection with estimated dates",
    ],
    icon: "bar-chart",
  },
  custom_workout_builder: {
    featureId: "custom_workout_builder",
    requiredTier: "pro",
    name: "Custom Workout Builder",
    description: "Create your own workouts from the exercise database",
    upgradeTitle: "Build Your Own Workouts",
    upgradeMessage: "Mix and match from our exercise database to create custom workouts tailored exactly to your preferences and available equipment.",
    upgradeCtaText: "Start Building",
    benefitPoints: [
      "Access to full exercise database",
      "Save unlimited custom workouts",
      "Share workouts with friends",
      "AI suggestions while you build",
    ],
    icon: "edit",
  },
  nutrition_tracking: {
    featureId: "nutrition_tracking",
    requiredTier: "elite",
    name: "Nutrition Tracking",
    description: "Track meals and get nutrition recommendations aligned with your goals",
    upgradeTitle: "Complete the Puzzle",
    upgradeMessage: "Workouts are only half the equation. Track your nutrition and get personalized meal suggestions aligned with your fitness goals.",
    upgradeCtaText: "Add Nutrition",
    benefitPoints: [
      "Calorie and macro tracking",
      "Goal-aligned meal suggestions",
      "Pre and post-workout nutrition tips",
      "Weekly nutrition reports",
    ],
    icon: "utensils",
  },
  priority_support: {
    featureId: "priority_support",
    requiredTier: "elite",
    name: "Priority Support",
    description: "Direct access to fitness support and faster response times",
    upgradeTitle: "Get Priority Support",
    upgradeMessage: "Elite members get priority access to our fitness support team with faster response times and personalized guidance.",
    upgradeCtaText: "Upgrade to Elite",
    benefitPoints: [
      "24-hour response guarantee",
      "Personalized fitness guidance",
      "Direct chat support",
      "Workout form reviews",
    ],
    icon: "headphones",
  },
  export_data: {
    featureId: "export_data",
    requiredTier: "pro",
    name: "Export Data",
    description: "Export your workout history and analytics data",
    upgradeTitle: "Own Your Data",
    upgradeMessage: "Export your complete workout history, analytics, and progress data in CSV or PDF format.",
    upgradeCtaText: "Unlock Export",
    benefitPoints: [
      "CSV export for spreadsheets",
      "PDF progress reports",
      "Full workout history download",
      "Analytics data export",
    ],
    icon: "download",
  },
  workout_history_full: {
    featureId: "workout_history_full",
    requiredTier: "starter",
    name: "Full Workout History",
    description: "Access your complete workout history beyond the last 7 days",
    upgradeTitle: "See Your Full History",
    upgradeMessage: "Free users can see the last 7 days. Upgrade to see your complete workout history and track your long-term progress.",
    upgradeCtaText: "Unlock History",
    benefitPoints: [
      "Complete workout history",
      "Long-term progress tracking",
      "Monthly and yearly summaries",
      "Personal records tracking",
    ],
    icon: "clock",
  },
};

// —— Feature Access Check —————————————————

export function checkFeatureAccess(featureId: FeatureId, userTier: "free" | "starter" | "pro" | "elite"): {
  hasAccess: boolean;
  gate: FeatureGate | null;
} {
  const gate = FEATURE_GATES[featureId];
  if (!gate) return { hasAccess: true, gate: null };

  const tierOrder: Record<string, number> = { free: 0, starter: 1, pro: 2, elite: 3 };
  const userLevel = tierOrder[userTier] || 0;
  const requiredLevel = tierOrder[gate.requiredTier] || 0;

  return {
    hasAccess: userLevel >= requiredLevel,
    gate: userLevel < requiredLevel ? gate : null,
  };
}

export function getFeatureGate(featureId: FeatureId): FeatureGate | null {
  return FEATURE_GATES[featureId] || null;
}

export function getLockedFeatures(userTier: "free" | "starter" | "pro" | "elite"): FeatureGate[] {
  return Object.values(FEATURE_GATES).filter(gate => {
    const tierOrder: Record<string, number> = { free: 0, starter: 1, pro: 2, elite: 3 };
    return (tierOrder[userTier] || 0) < (tierOrder[gate.requiredTier] || 0);
  });
}

export function getUnlockableFeatures(targetTier: RequiredTier): FeatureGate[] {
  const tierOrder: Record<string, number> = { starter: 1, pro: 2, elite: 3 };
  const targetLevel = tierOrder[targetTier] || 0;
  return Object.values(FEATURE_GATES).filter(gate => {
    return (tierOrder[gate.requiredTier] || 0) <= targetLevel;
  });
}

// —— Prompt Management ————————————————————

export async function shouldShowUpgradePrompt(featureId: FeatureId): Promise<boolean> {
  const state = await getUpgradeState();

  // Check if feature is suppressed
  if (state.suppressedFeatures.includes(featureId)) return false;

  // Check global cooldown (5 minutes between any prompts)
  if (state.lastPromptShownAt) {
    const minutesSince = (Date.now() - new Date(state.lastPromptShownAt).getTime()) / (1000 * 60);
    if (minutesSince < 5) return false;
  }

  // Check per-feature cooldown (show max 3 times per feature, then suppress)
  const featurePrompts = state.promptHistory.filter(p => p.featureId === featureId);
  if (featurePrompts.length >= 3) return false;

  // Check per-feature cooldown (once per day per feature)
  const lastForFeature = featurePrompts[featurePrompts.length - 1];
  if (lastForFeature) {
    const hoursSince = (Date.now() - new Date(lastForFeature.shownAt).getTime()) / (1000 * 60 * 60);
    if (hoursSince < 24) return false;
  }

  return true;
}

export async function logUpgradePromptShown(featureId: FeatureId): Promise<void> {
  const state = await getUpgradeState();
  state.promptHistory.push({
    featureId,
    shownAt: new Date().toISOString(),
    dismissed: false,
    converted: false,
  });
  state.totalPromptsShown += 1;
  state.lastPromptShownAt = new Date().toISOString();
  // Keep last 100 entries
  if (state.promptHistory.length > 100) {
    state.promptHistory = state.promptHistory.slice(-100);
  }
  await saveUpgradeState(state);
}

export async function logUpgradePromptDismissed(featureId: FeatureId): Promise<void> {
  const state = await getUpgradeState();
  const lastPrompt = state.promptHistory.filter(p => p.featureId === featureId).pop();
  if (lastPrompt) lastPrompt.dismissed = true;
  await saveUpgradeState(state);
}

export async function logUpgradePromptConverted(featureId: FeatureId): Promise<void> {
  const state = await getUpgradeState();
  const lastPrompt = state.promptHistory.filter(p => p.featureId === featureId).pop();
  if (lastPrompt) lastPrompt.converted = true;
  await saveUpgradeState(state);
}

export async function suppressFeaturePrompt(featureId: FeatureId): Promise<void> {
  const state = await getUpgradeState();
  if (!state.suppressedFeatures.includes(featureId)) {
    state.suppressedFeatures.push(featureId);
  }
  await saveUpgradeState(state);
}

// —— Analytics ————————————————————————————

export async function getUpgradePromptStats(): Promise<{
  totalShown: number;
  totalDismissed: number;
  totalConverted: number;
  conversionRate: number;
  mostTriggeredFeature: FeatureId | null;
  bestConvertingFeature: FeatureId | null;
}> {
  const state = await getUpgradeState();
  const history = state.promptHistory;

  const totalShown = history.length;
  const totalDismissed = history.filter(p => p.dismissed).length;
  const totalConverted = history.filter(p => p.converted).length;
  const conversionRate = totalShown > 0 ? Math.round((totalConverted / totalShown) * 100) : 0;

  // Most triggered feature
  const featureCounts: Record<string, number> = {};
  const featureConversions: Record<string, number> = {};
  for (const log of history) {
    featureCounts[log.featureId] = (featureCounts[log.featureId] || 0) + 1;
    if (log.converted) {
      featureConversions[log.featureId] = (featureConversions[log.featureId] || 0) + 1;
    }
  }

  const mostTriggeredFeature = Object.entries(featureCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0] as FeatureId | undefined || null;

  const bestConvertingFeature = Object.entries(featureConversions)
    .sort((a, b) => b[1] - a[1])[0]?.[0] as FeatureId | undefined || null;

  return {
    totalShown,
    totalDismissed,
    totalConverted,
    conversionRate,
    mostTriggeredFeature,
    bestConvertingFeature,
  };
}
