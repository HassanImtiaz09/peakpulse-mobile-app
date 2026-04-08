// lib/analytics.ts
// PeakPulse AI — Analytics & Telemetry Hooks
// Provides a structured event tracking system for monitoring user behavior,
// feature adoption, retention signals, and conversion funnel metrics.
// Events are queued locally and flushed in batches.

import AsyncStorage from "@react-native-async-storage/async-storage";

// —— Types ——————————————————————————————————

export type EventCategory =
  | "onboarding"
  | "workout"
  | "program"
  | "streak"
  | "coach"
  | "paywall"
  | "feature_gate"
  | "navigation"
  | "engagement"
  | "error";

export type EventName =
  // Onboarding
  | "onboarding_started"
  | "onboarding_step_completed"
  | "onboarding_completed"
  | "onboarding_skipped"
  // Workout
  | "workout_started"
  | "workout_completed"
  | "workout_abandoned"
  | "exercise_completed"
  | "exercise_skipped"
  | "rest_timer_used"
  // Program
  | "program_viewed"
  | "program_enrolled"
  | "program_workout_completed"
  | "program_milestone_reached"
  | "program_completed"
  | "program_paused"
  | "program_resumed"
  | "program_abandoned"
  // Streak
  | "streak_incremented"
  | "streak_broken"
  | "streak_freeze_used"
  | "streak_milestone" // 3, 7, 14, 30, 60, 90 days
  // Coach
  | "coach_personality_selected"
  | "coach_message_shown"
  | "coach_message_dismissed"
  | "coach_interaction"
  // Paywall
  | "paywall_shown"
  | "paywall_dismissed"
  | "paywall_cta_tapped"
  | "subscription_started"
  | "subscription_converted"
  | "subscription_cancelled"
  | "trial_started"
  | "trial_expired"
  // Feature Gate
  | "feature_gate_hit"
  | "upgrade_prompt_shown"
  | "upgrade_prompt_dismissed"
  | "upgrade_prompt_converted"
  // Navigation
  | "screen_viewed"
  | "tab_switched"
  | "deep_link_opened"
  // Engagement
  | "session_started"
  | "session_ended"
  | "fallback_offered"
  | "fallback_accepted"
  | "fallback_completed"
  | "fallback_declined"
  | "notification_received"
  | "notification_tapped"
  | "share_initiated"
  // Error
  | "error_occurred"
  | "crash_detected";

export interface AnalyticsEvent {
  id: string;
  event: EventName;
  category: EventCategory;
  properties: Record<string, any>;
  timestamp: string;
  sessionId: string;
  userId: string;
  userTier: string;
}

export interface AnalyticsConfig {
  enabled: boolean;
  batchSize: number;
  flushIntervalMs: number;
  maxQueueSize: number;
  debugMode: boolean;
}

export interface SessionMetrics {
  sessionId: string;
  startTime: string;
  endTime: string | null;
  duration: number; // seconds
  eventsCount: number;
  screensViewed: string[];
  workoutsCompleted: number;
  paywallsShown: number;
}

export interface RetentionMetrics {
  day1: boolean;
  day3: boolean;
  day7: boolean;
  day14: boolean;
  day30: boolean;
  totalActiveDays: number;
  lastActiveDate: string;
}

export interface FunnelStep {
  name: string;
  count: number;
  conversionFromPrevious: number;
}

// —— Storage Keys ——————————————————————————

const ANALYTICS_QUEUE_KEY = "peakpulse_analytics_queue";
const ANALYTICS_CONFIG_KEY = "peakpulse_analytics_config";
const SESSION_METRICS_KEY = "peakpulse_session_metrics";
const RETENTION_KEY = "peakpulse_retention";
const ACTIVE_DAYS_KEY = "peakpulse_active_days";

// —— Default Config ——————————————————————

const DEFAULT_CONFIG: AnalyticsConfig = {
  enabled: true,
  batchSize: 25,
  flushIntervalMs: 60000, // 1 minute
  maxQueueSize: 500,
  debugMode: false,
};

// —— Session State ———————————————————————

let currentSessionId: string = `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
let currentUserId: string = "guest";
let currentUserTier: string = "free";

export function setAnalyticsUser(userId: string, tier: string): void {
  currentUserId = userId;
  currentUserTier = tier;
}

export function getSessionId(): string {
  return currentSessionId;
}

export function startNewSession(): string {
  currentSessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  return currentSessionId;
}

// —— Core Tracking ———————————————————————

function getCategoryForEvent(event: EventName): EventCategory {
  if (event.startsWith("onboarding")) return "onboarding";
  if (event.startsWith("workout") || event.startsWith("exercise") || event.startsWith("rest_timer")) return "workout";
  if (event.startsWith("program")) return "program";
  if (event.startsWith("streak")) return "streak";
  if (event.startsWith("coach")) return "coach";
  if (event.startsWith("paywall") || event.startsWith("subscription") || event.startsWith("trial")) return "paywall";
  if (event.startsWith("feature") || event.startsWith("upgrade")) return "feature_gate";
  if (event.startsWith("screen") || event.startsWith("tab") || event.startsWith("deep_link")) return "navigation";
  if (event.startsWith("error") || event.startsWith("crash")) return "error";
  return "engagement";
}

export async function track(event: EventName, properties: Record<string, any> = {}): Promise<void> {
  const config = await getConfig();
  if (!config.enabled) return;

  const analyticsEvent: AnalyticsEvent = {
    id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    event,
    category: getCategoryForEvent(event),
    properties,
    timestamp: new Date().toISOString(),
    sessionId: currentSessionId,
    userId: currentUserId,
    userTier: currentUserTier,
  };

  if (config.debugMode) {
    console.log("[PeakPulse Analytics]", analyticsEvent.event, analyticsEvent.properties);
  }

  await enqueueEvent(analyticsEvent);
}

/**
 * Convenience methods for common tracking patterns
 */
export const trackOnboarding = {
  started: () => track("onboarding_started"),
  stepCompleted: (step: string, stepNumber: number) =>
    track("onboarding_step_completed", { step, stepNumber }),
  completed: (totalTimeSeconds: number) =>
    track("onboarding_completed", { totalTimeSeconds }),
  skipped: (atStep: string) =>
    track("onboarding_skipped", { atStep }),
};

export const trackWorkout = {
  started: (source: string, workoutId: string) =>
    track("workout_started", { source, workoutId }),
  completed: (source: string, workoutId: string, durationMin: number, exerciseCount: number) =>
    track("workout_completed", { source, workoutId, durationMin, exerciseCount }),
  abandoned: (source: string, workoutId: string, atExercise: number, percentComplete: number) =>
    track("workout_abandoned", { source, workoutId, atExercise, percentComplete }),
  exerciseCompleted: (exerciseName: string, sets: number, reps: number) =>
    track("exercise_completed", { exerciseName, sets, reps }),
  exerciseSkipped: (exerciseName: string, reason?: string) =>
    track("exercise_skipped", { exerciseName, reason }),
};

export const trackProgram = {
  viewed: (programId: string) =>
    track("program_viewed", { programId }),
  enrolled: (programId: string, goal: string) =>
    track("program_enrolled", { programId, goal }),
  milestoneReached: (programId: string, milestoneId: string, weekNumber: number) =>
    track("program_milestone_reached", { programId, milestoneId, weekNumber }),
  completed: (programId: string, totalWeeks: number, adherencePercent: number) =>
    track("program_completed", { programId, totalWeeks, adherencePercent }),
  paused: (programId: string, atWeek: number) =>
    track("program_paused", { programId, atWeek }),
  abandoned: (programId: string, atWeek: number, reason?: string) =>
    track("program_abandoned", { programId, atWeek, reason }),
};

export const trackStreak = {
  incremented: (newStreak: number) =>
    track("streak_incremented", { newStreak }),
  broken: (previousStreak: number, daysMissed: number) =>
    track("streak_broken", { previousStreak, daysMissed }),
  freezeUsed: (currentStreak: number) =>
    track("streak_freeze_used", { currentStreak }),
  milestone: (days: number) =>
    track("streak_milestone", { days }),
};

export const trackPaywall = {
  shown: (trigger: string, style: string) =>
    track("paywall_shown", { trigger, style }),
  dismissed: (trigger: string, timeVisibleMs: number) =>
    track("paywall_dismissed", { trigger, timeVisibleMs }),
  ctaTapped: (trigger: string, targetTier: string) =>
    track("paywall_cta_tapped", { trigger, targetTier }),
  converted: (fromTier: string, toTier: string, trigger: string) =>
    track("subscription_converted", { fromTier, toTier, trigger }),
};

export const trackFeatureGate = {
  hit: (featureId: string, requiredTier: string) =>
    track("feature_gate_hit", { featureId, requiredTier }),
  upgradeShown: (featureId: string) =>
    track("upgrade_prompt_shown", { featureId }),
  upgradeDismissed: (featureId: string) =>
    track("upgrade_prompt_dismissed", { featureId }),
  upgradeConverted: (featureId: string, tier: string) =>
    track("upgrade_prompt_converted", { featureId, tier }),
};

export const trackEngagement = {
  screenViewed: (screenName: string) =>
    track("screen_viewed", { screenName }),
  sessionStarted: () =>
    track("session_started", { sessionId: currentSessionId }),
  sessionEnded: (durationSeconds: number) =>
    track("session_ended", { sessionId: currentSessionId, durationSeconds }),
  fallbackOffered: (reason: string, workoutId: string) =>
    track("fallback_offered", { reason, workoutId }),
  fallbackAccepted: (workoutId: string) =>
    track("fallback_accepted", { workoutId }),
  fallbackDeclined: (reason?: string) =>
    track("fallback_declined", { reason }),
};

// —— Event Queue ——————————————————————————

async function enqueueEvent(event: AnalyticsEvent): Promise<void> {
  try {
    const config = await getConfig();
    const data = await AsyncStorage.getItem(ANALYTICS_QUEUE_KEY);
    const queue: AnalyticsEvent[] = data ? JSON.parse(data) : [];

    queue.push(event);

    // Trim if over max
    const trimmed = queue.length > config.maxQueueSize
      ? queue.slice(-config.maxQueueSize)
      : queue;

    await AsyncStorage.setItem(ANALYTICS_QUEUE_KEY, JSON.stringify(trimmed));

    // Auto-flush if batch size reached
    if (trimmed.length >= config.batchSize) {
      await flushEvents();
    }
  } catch {
    // Analytics should never crash the app
  }
}

export async function flushEvents(): Promise<{ flushed: number; remaining: number }> {
  try {
    const data = await AsyncStorage.getItem(ANALYTICS_QUEUE_KEY);
    if (!data) return { flushed: 0, remaining: 0 };

    const queue: AnalyticsEvent[] = JSON.parse(data);
    if (queue.length === 0) return { flushed: 0, remaining: 0 };

    const config = await getConfig();
    const batch = queue.slice(0, config.batchSize);
    const remaining = queue.slice(config.batchSize);

    // In a real app, this would send to an analytics backend.
    // For now, we process locally and clear.
    if (config.debugMode) {
      console.log(`[PeakPulse Analytics] Flushing ${batch.length} events`);
    }

    // Keep remaining events in queue
    await AsyncStorage.setItem(ANALYTICS_QUEUE_KEY, JSON.stringify(remaining));

    return { flushed: batch.length, remaining: remaining.length };
  } catch {
    return { flushed: 0, remaining: 0 };
  }
}

export async function getQueueSize(): Promise<number> {
  try {
    const data = await AsyncStorage.getItem(ANALYTICS_QUEUE_KEY);
    if (!data) return 0;
    return JSON.parse(data).length;
  } catch {
    return 0;
  }
}

export async function clearQueue(): Promise<void> {
  await AsyncStorage.removeItem(ANALYTICS_QUEUE_KEY);
}

// —— Configuration ———————————————————————

async function getConfig(): Promise<AnalyticsConfig> {
  try {
    const data = await AsyncStorage.getItem(ANALYTICS_CONFIG_KEY);
    if (data) return { ...DEFAULT_CONFIG, ...JSON.parse(data) };
  } catch { /* */ }
  return DEFAULT_CONFIG;
}

export async function updateConfig(updates: Partial<AnalyticsConfig>): Promise<AnalyticsConfig> {
  const config = await getConfig();
  const updated = { ...config, ...updates };
  await AsyncStorage.setItem(ANALYTICS_CONFIG_KEY, JSON.stringify(updated));
  return updated;
}

export async function enableDebugMode(): Promise<void> {
  await updateConfig({ debugMode: true });
}

export async function disableAnalytics(): Promise<void> {
  await updateConfig({ enabled: false });
}

// —— Retention Tracking ——————————————————

export async function recordActiveDay(): Promise<void> {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const data = await AsyncStorage.getItem(ACTIVE_DAYS_KEY);
    const activeDays: string[] = data ? JSON.parse(data) : [];

    if (!activeDays.includes(today)) {
      activeDays.push(today);
      // Keep last 90 days
      const trimmed = activeDays.length > 90 ? activeDays.slice(-90) : activeDays;
      await AsyncStorage.setItem(ACTIVE_DAYS_KEY, JSON.stringify(trimmed));
    }
  } catch { /* */ }
}

export async function getRetentionMetrics(installDate: string): Promise<RetentionMetrics> {
  try {
    const data = await AsyncStorage.getItem(ACTIVE_DAYS_KEY);
    const activeDays: string[] = data ? JSON.parse(data) : [];
    const install = new Date(installDate);

    const checkDay = (n: number): boolean => {
      const target = new Date(install);
      target.setDate(target.getDate() + n);
      return activeDays.includes(target.toISOString().slice(0, 10));
    };

    return {
      day1: checkDay(1),
      day3: checkDay(3),
      day7: checkDay(7),
      day14: checkDay(14),
      day30: checkDay(30),
      totalActiveDays: activeDays.length,
      lastActiveDate: activeDays[activeDays.length - 1] || installDate,
    };
  } catch {
    return {
      day1: false, day3: false, day7: false, day14: false, day30: false,
      totalActiveDays: 0, lastActiveDate: installDate,
    };
  }
}

// —— Funnel Analysis ————————————————————

export async function getOnboardingFunnel(): Promise<FunnelStep[]> {
  const data = await AsyncStorage.getItem(ANALYTICS_QUEUE_KEY);
  const allEvents: AnalyticsEvent[] = data ? JSON.parse(data) : [];

  const steps = [
    { name: "App Opened", event: "session_started" as EventName },
    { name: "Onboarding Started", event: "onboarding_started" as EventName },
    { name: "Goal Set", event: "onboarding_step_completed" as EventName },
    { name: "Onboarding Complete", event: "onboarding_completed" as EventName },
    { name: "First Workout", event: "workout_completed" as EventName },
  ];

  let previousCount = 0;
  return steps.map((step, idx) => {
    const count = allEvents.filter(e => e.event === step.event).length;
    const conversion = idx === 0 || previousCount === 0 ? 100 : Math.round((count / previousCount) * 100);
    previousCount = count || previousCount;
    return { name: step.name, count, conversionFromPrevious: conversion };
  });
}

export async function getConversionFunnel(): Promise<FunnelStep[]> {
  const data = await AsyncStorage.getItem(ANALYTICS_QUEUE_KEY);
  const allEvents: AnalyticsEvent[] = data ? JSON.parse(data) : [];

  const steps = [
    { name: "Paywall Shown", event: "paywall_shown" as EventName },
    { name: "CTA Tapped", event: "paywall_cta_tapped" as EventName },
    { name: "Subscription Started", event: "subscription_started" as EventName },
    { name: "Converted", event: "subscription_converted" as EventName },
  ];

  let previousCount = 0;
  return steps.map((step, idx) => {
    const count = allEvents.filter(e => e.event === step.event).length;
    const conversion = idx === 0 || previousCount === 0 ? 100 : Math.round((count / previousCount) * 100);
    previousCount = count || previousCount;
    return { name: step.name, count, conversionFromPrevious: conversion };
  });
}

// —— Summary Reports ————————————————————

export async function getEventSummary(): Promise<Record<EventCategory, number>> {
  const data = await AsyncStorage.getItem(ANALYTICS_QUEUE_KEY);
  const allEvents: AnalyticsEvent[] = data ? JSON.parse(data) : [];

  const summary: Record<string, number> = {
    onboarding: 0, workout: 0, program: 0, streak: 0,
    coach: 0, paywall: 0, feature_gate: 0, navigation: 0,
    engagement: 0, error: 0,
  };

  for (const event of allEvents) {
    summary[event.category] = (summary[event.category] || 0) + 1;
  }

  return summary as Record<EventCategory, number>;
}

export async function getRecentEvents(limit: number = 20): Promise<AnalyticsEvent[]> {
  const data = await AsyncStorage.getItem(ANALYTICS_QUEUE_KEY);
  const allEvents: AnalyticsEvent[] = data ? JSON.parse(data) : [];
  return allEvents.slice(-limit);
}
