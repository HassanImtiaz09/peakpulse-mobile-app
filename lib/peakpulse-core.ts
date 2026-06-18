// lib/peakpulse-core.ts
// PeakPulse AI — Core Integration & Orchestration Layer
// Ties together all subsystems: adaptive engine, programs, streaks,
// AI coach, paywalls, fallback workouts, and analytics
// This is the single entry point that screens/hooks should call

import AsyncStorage from "@react-native-async-storage/async-storage";

// —— Re-exports for convenience ——————————————
// Screens can import everything from peakpulse-core instead of individual modules

export { checkFeatureAccess, getLockedFeatures } from "./upgrade-prompts";
export { shouldShowPaywall, recordValueMoment, recordConversion } from "./paywall-triggers";
export { getSmartFallback, recordWorkoutCompleted as recordFallbackCompleted } from "./fallback-workouts";

// —— Types ——————————————————————————————————

export type WorkoutSource = "adaptive" | "program" | "fallback" | "custom" | "quick_start";

export interface CompletedWorkoutEvent {
  workoutId: string;
  source: WorkoutSource;
  durationMinutes: number;
  exercises: CompletedExercise[];
  perceivedDifficulty: 1 | 2 | 3 | 4 | 5;
  timestamp: string;
  programId?: string;
  fallbackReason?: string;
}

export interface CompletedExercise {
  name: string;
  sets: number;
  reps: number;
  weight?: number;
  durationSeconds?: number;
  completed: boolean;
}

export interface SessionContext {
  userId: string;
  userTier: "free" | "starter" | "pro" | "elite";
  isGuest: boolean;
  currentStreak: number;
  fitnessLevel: "beginner" | "intermediate" | "advanced";
  activeProgramId: string | null;
  coachPersonality: string | null;
  lastWorkoutDate: string | null;
}

export interface PostWorkoutActions {
  streakUpdated: boolean;
  newStreak: number;
  milestoneReached: boolean;
  milestoneName: string | null;
  coachMessage: string | null;
  showPaywall: boolean;
  paywallConfig: any | null;
  xpEarned: number;
  levelUp: boolean;
  valueMomentTriggered: string | null;
  analyticsEvents: AnalyticsEvent[];
}

export interface AnalyticsEvent {
  event: string;
  properties: Record<string, any>;
  timestamp: string;
}

// —— Storage ——————————————————————————————

const SESSION_CONTEXT_KEY = "peakpulse_session_context";
const WORKOUT_LOG_KEY = "peakpulse_workout_log";

async function getSessionContext(): Promise<SessionContext> {
  try {
    const data = await AsyncStorage.getItem(SESSION_CONTEXT_KEY);
    if (data) return JSON.parse(data);
  } catch {
    // ignore
  }
  return {
    userId: "guest",
    userTier: "free",
    isGuest: true,
    currentStreak: 0,
    fitnessLevel: "beginner",
    activeProgramId: null,
    coachPersonality: null,
    lastWorkoutDate: null,
  };
}

async function saveSessionContext(ctx: SessionContext): Promise<void> {
  await AsyncStorage.setItem(SESSION_CONTEXT_KEY, JSON.stringify(ctx));
}

async function getWorkoutLog(): Promise<CompletedWorkoutEvent[]> {
  try {
    const data = await AsyncStorage.getItem(WORKOUT_LOG_KEY);
    if (data) return JSON.parse(data);
  } catch {
    // ignore
  }
  return [];
}

async function appendWorkoutLog(event: CompletedWorkoutEvent): Promise<void> {
  const log = await getWorkoutLog();
  log.push(event);
  // Keep last 200 entries
  const trimmed = log.length > 200 ? log.slice(-200) : log;
  await AsyncStorage.setItem(WORKOUT_LOG_KEY, JSON.stringify(trimmed));
}

// —— Core Orchestration —————————————————————

/**
 * Called when the app opens. Runs all session-start checks:
 * - Increments session count for paywall timing
 * - Checks for missed sessions and prepares fallback offers
 * - Loads user context for the session
 */
export async function onSessionStart(): Promise<{
  context: SessionContext;
  fallbackOffer: { workout: any; reason: string; message: string } | null;
  showPaywall: boolean;
  paywallConfig: any | null;
}> {
  const context = await getSessionContext();
  const events: AnalyticsEvent[] = [];

  // Track session open
  events.push({
    event: "session_started",
    properties: { tier: context.userTier, streak: context.currentStreak },
    timestamp: new Date().toISOString(),
  });

  // Check for missed workouts and offer fallback
  let fallbackOffer = null;
  try {
    const { checkForMissedSession, getFallbackWorkout } = await import("./fallback-workouts");
    const missedCheck = await checkForMissedSession();
    if (missedCheck.missed) {
      const workout = getFallbackWorkout(missedCheck.suggestedReason);
      if (workout) {
        fallbackOffer = {
          workout,
          reason: missedCheck.suggestedReason,
          message: workout.motivationalMessage,
        };
        events.push({
          event: "fallback_offered",
          properties: { reason: missedCheck.suggestedReason, daysMissed: missedCheck.daysMissed },
          timestamp: new Date().toISOString(),
        });
      }
    }
  } catch {
    // fallback module not available
  }

  // Check if we should show a paywall
  let showPaywall = false;
  let paywallConfig = null;
  try {
    const { shouldShowPaywall: checkPaywall, recordSessionOpen } = await import("./paywall-triggers");
    await recordSessionOpen();
    const decision = await checkPaywall();
    showPaywall = decision.shouldShow;
    paywallConfig = decision.config;
    if (showPaywall) {
      events.push({
        event: "paywall_shown",
        properties: { trigger: decision.config?.trigger, reason: decision.reason },
        timestamp: new Date().toISOString(),
      });
    }
  } catch {
    // paywall module not available
  }

  // Flush analytics
  await flushAnalyticsEvents(events);

  return { context, fallbackOffer, showPaywall, paywallConfig };
}

/**
 * The main post-workout orchestrator. Called after ANY workout completes,
 * regardless of source. Coordinates streak updates, program progress,
 * AI coach messages, paywall timing, XP, and analytics.
 */
export async function onWorkoutCompleted(event: CompletedWorkoutEvent): Promise<PostWorkoutActions> {
  const context = await getSessionContext();
  const analyticsEvents: AnalyticsEvent[] = [];

  // 1. Log the workout
  await appendWorkoutLog(event);

  // 2. Update streak
  const streakResult = await updateStreak(context);
  context.currentStreak = streakResult.newStreak;
  context.lastWorkoutDate = event.timestamp;

  analyticsEvents.push({
    event: "workout_completed",
    properties: {
      source: event.source,
      durationMinutes: event.durationMinutes,
      exerciseCount: event.exercises.length,
      perceivedDifficulty: event.perceivedDifficulty,
      streak: streakResult.newStreak,
    },
    timestamp: event.timestamp,
  });

  // 3. Check if this is a value moment (first workout)
  let valueMomentTriggered: string | null = null;
  const allWorkouts = await getWorkoutLog();
  if (allWorkouts.length === 1) {
    valueMomentTriggered = "first_workout_completed";
    try {
      const { recordValueMoment } = await import("./paywall-triggers");
      await recordValueMoment("first_workout_completed");
    } catch { /* */ }
    analyticsEvents.push({
      event: "value_moment",
      properties: { moment: "first_workout_completed" },
      timestamp: event.timestamp,
    });
  }

  // 4. Check 3-day streak value moment
  if (streakResult.newStreak === 3) {
    valueMomentTriggered = "first_streak_3_days";
    try {
      const { recordValueMoment } = await import("./paywall-triggers");
      await recordValueMoment("first_streak_3_days");
    } catch { /* */ }
    analyticsEvents.push({
      event: "value_moment",
      properties: { moment: "first_streak_3_days" },
      timestamp: event.timestamp,
    });
  }

  // 5. Update program progress if workout is part of a program
  let milestoneReached = false;
  let milestoneName: string | null = null;
  if (event.source === "program" && event.programId) {
    try {
      const { logWorkoutToProgram, getActiveEnrollment, checkMilestones, getProgramById } =
        await import("./outcome-programs");
      await logWorkoutToProgram(event.programId, event.workoutId, event.perceivedDifficulty);

      const enrollment = await getActiveEnrollment();
      const program = getProgramById(event.programId);
      if (enrollment && program) {
        const milestones = checkMilestones(program, enrollment);
        const justCompleted = milestones.find(
          m => m.status === "completed" && m.completedDate &&
            new Date(m.completedDate).getTime() > Date.now() - 60000
        );
        if (justCompleted) {
          milestoneReached = true;
          milestoneName = justCompleted.name;
          analyticsEvents.push({
            event: "milestone_reached",
            properties: { milestone: justCompleted.id, program: event.programId },
            timestamp: event.timestamp,
          });
          try {
            const { recordValueMoment } = await import("./paywall-triggers");
            await recordValueMoment("first_milestone_reached");
          } catch { /* */ }
        }
      }
    } catch { /* */ }
  }

  // 6. Generate AI coach message
  let coachMessage: string | null = null;
  if (context.coachPersonality) {
    coachMessage = generateCoachMessage(context, event, streakResult, milestoneReached);
  }

  // 7. Calculate XP
  const xpEarned = calculateXP(event, streakResult.newStreak, milestoneReached);
  const levelUp = await checkLevelUp(xpEarned);

  if (levelUp) {
    analyticsEvents.push({
      event: "level_up",
      properties: { xpEarned },
      timestamp: event.timestamp,
    });
  }

  // 8. Check paywall after value moment
  let showPaywall = false;
  let paywallConfig = null;
  if (context.userTier === "free" && valueMomentTriggered) {
    try {
      const { shouldShowPaywall: checkPaywall } = await import("./paywall-triggers");
      const decision = await checkPaywall({
        trigger: "post_value_moment",
        valueMoment: valueMomentTriggered as any,
      });
      showPaywall = decision.shouldShow;
      paywallConfig = decision.config;
    } catch { /* */ }
  }

  // 9. Update fallback tracking
  try {
    const { recordWorkoutCompleted } = await import("./fallback-workouts");
    await recordWorkoutCompleted();
  } catch { /* */ }

  // 10. Save context and flush analytics
  await saveSessionContext(context);
  await flushAnalyticsEvents(analyticsEvents);

  return {
    streakUpdated: streakResult.updated,
    newStreak: streakResult.newStreak,
    milestoneReached,
    milestoneName,
    coachMessage,
    showPaywall,
    paywallConfig,
    xpEarned,
    levelUp,
    valueMomentTriggered,
    analyticsEvents,
  };
}

/**
 * Called when user taps a locked feature.
 * Checks access, logs the attempt, and returns upgrade info.
 */
export async function onFeatureAccessed(featureId: string): Promise<{
  hasAccess: boolean;
  upgradeInfo: any | null;
  showPaywall: boolean;
  paywallConfig: any | null;
}> {
  const context = await getSessionContext();

  try {
    const { checkFeatureAccess, getFeatureGate, shouldShowUpgradePrompt, logUpgradePromptShown } =
      await import("./upgrade-prompts");

    const access = checkFeatureAccess(featureId as any, context.userTier);

    if (access.hasAccess) {
      return { hasAccess: true, upgradeInfo: null, showPaywall: false, paywallConfig: null };
    }

    // Feature is locked — check if we should show upgrade prompt
    const shouldShow = await shouldShowUpgradePrompt(featureId as any);
    if (shouldShow) {
      await logUpgradePromptShown(featureId as any);
    }

    // Also trigger feature-gate paywall
    let showPaywall = false;
    let paywallConfig = null;
    try {
      const { shouldShowPaywall: checkPaywall } = await import("./paywall-triggers");
      const decision = await checkPaywall({ trigger: "feature_gate" });
      showPaywall = decision.shouldShow;
      paywallConfig = decision.config;
    } catch { /* */ }

    await flushAnalyticsEvents([{
      event: "feature_gate_hit",
      properties: { featureId, userTier: context.userTier, requiredTier: access.gate?.requiredTier },
      timestamp: new Date().toISOString(),
    }]);

    return {
      hasAccess: false,
      upgradeInfo: shouldShow ? access.gate : null,
      showPaywall,
      paywallConfig,
    };
  } catch {
    return { hasAccess: true, upgradeInfo: null, showPaywall: false, paywallConfig: null };
  }
}

/**
 * Called when user upgrades their tier.
 * Updates context, records conversion, triggers analytics.
 */
export async function onUserUpgraded(newTier: "starter" | "pro" | "elite"): Promise<void> {
  const context = await getSessionContext();
  context.userTier = newTier;
  await saveSessionContext(context);

  try {
    const { recordConversion } = await import("./paywall-triggers");
    await recordConversion(newTier);
  } catch { /* */ }

  await flushAnalyticsEvents([{
    event: "subscription_converted",
    properties: { fromTier: context.userTier, toTier: newTier, streak: context.currentStreak },
    timestamp: new Date().toISOString(),
  }]);
}

/**
 * Called when user enrolls in a program.
 * Records value moment and triggers analytics.
 */
export async function onProgramEnrolled(programId: string): Promise<void> {
  try {
    const { recordValueMoment } = await import("./paywall-triggers");
    await recordValueMoment("first_program_enrolled");
  } catch { /* */ }

  await flushAnalyticsEvents([{
    event: "program_enrolled",
    properties: { programId },
    timestamp: new Date().toISOString(),
  }]);
}

// —— Streak Management ——————————————————————

const STREAK_KEY = "peakpulse_streak_data";

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastWorkoutDate: string | null;
  streakFreezeUsedThisWeek: number;
}

async function getStreakData(): Promise<StreakData> {
  try {
    const data = await AsyncStorage.getItem(STREAK_KEY);
    if (data) return JSON.parse(data);
  } catch { /* */ }
  return { currentStreak: 0, longestStreak: 0, lastWorkoutDate: null, streakFreezeUsedThisWeek: 0 };
}

async function saveStreakData(data: StreakData): Promise<void> {
  await AsyncStorage.setItem(STREAK_KEY, JSON.stringify(data));
}

async function updateStreak(context: SessionContext): Promise<{ updated: boolean; newStreak: number }> {
  const streakData = await getStreakData();
  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  if (streakData.lastWorkoutDate) {
    const lastDate = streakData.lastWorkoutDate.slice(0, 10);

    if (lastDate === today) {
      // Already worked out today — no change
      return { updated: false, newStreak: streakData.currentStreak };
    }

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    if (lastDate === yesterdayStr) {
      // Consecutive day — increment streak
      streakData.currentStreak += 1;
    } else {
      // Missed a day — reset (unless streak freeze available)
      if (context.userTier === "elite" && streakData.streakFreezeUsedThisWeek < 2) {
        // Use a streak freeze
        streakData.streakFreezeUsedThisWeek += 1;
        streakData.currentStreak += 1;
      } else {
        streakData.currentStreak = 1; // Reset to 1 (today counts)
      }
    }
  } else {
    // First ever workout
    streakData.currentStreak = 1;
  }

  streakData.lastWorkoutDate = now.toISOString();
  if (streakData.currentStreak > streakData.longestStreak) {
    streakData.longestStreak = streakData.currentStreak;
  }

  // Reset weekly freeze counter on Mondays
  if (now.getDay() === 1) {
    streakData.streakFreezeUsedThisWeek = 0;
  }

  await saveStreakData(streakData);
  return { updated: true, newStreak: streakData.currentStreak };
}

// —— AI Coach Message Generation ————————————

function generateCoachMessage(
  context: SessionContext,
  event: CompletedWorkoutEvent,
  streakResult: { newStreak: number },
  milestoneReached: boolean,
): string {
  const personality = context.coachPersonality || "motivator";
  const streak = streakResult.newStreak;

  // Milestone celebration takes priority
  if (milestoneReached) {
    const milestoneMessages: Record<string, string> = {
      motivator: "MILESTONE UNLOCKED! You're proving that consistency beats perfection every single time!",
      drill_sergeant: "Milestone hit. Don't celebrate too long — the next one won't wait.",
      zen_master: "A milestone is simply a marker on your path. The journey itself is the reward.",
      buddy: "Duuude! You just hit a milestone! This calls for a protein shake celebration!",
    };
    return milestoneMessages[personality] || milestoneMessages.motivator;
  }

  // Streak-based messages
  if (streak >= 7 && streak % 7 === 0) {
    const weekStreak: Record<string, string> = {
      motivator: `${streak} days in a row! You're building something incredible here — don't stop now!`,
      drill_sergeant: `${streak}-day streak. Acceptable. Now double it.`,
      zen_master: `${streak} days of practice. Your body thanks you with each sunrise.`,
      buddy: `${streak} days straight! You're officially on fire — someone get the extinguisher!`,
    };
    return weekStreak[personality] || weekStreak.motivator;
  }

  // Difficulty-based messages
  if (event.perceivedDifficulty >= 4) {
    const hardMessages: Record<string, string> = {
      motivator: "That was TOUGH and you crushed it anyway. That's what champions are made of!",
      drill_sergeant: "Hard work noted. You earned your rest. But you better be back tomorrow.",
      zen_master: "Difficulty is the teacher. You showed up and you learned. Well done.",
      buddy: "Whew, that was a beast of a workout! You handled it like a pro though!",
    };
    return hardMessages[personality] || hardMessages.motivator;
  }

  // Default post-workout messages
  const defaultMessages: Record<string, string[]> = {
    motivator: [
      "Another one in the books! Every rep gets you closer to your goals!",
      "You showed up and that's what matters. Keep this energy going!",
      "Great work today! Your future self is going to thank you!",
    ],
    drill_sergeant: [
      "Workout logged. Recovery starts now. Hydrate.",
      "Solid work. Come back stronger tomorrow.",
      "That's one more than most people did today. Stay hungry.",
    ],
    zen_master: [
      "Movement is medicine. You've nourished your body well today.",
      "Be proud of what you accomplished, and at peace with what you didn't.",
      "You are one workout wiser. Carry that strength forward.",
    ],
    buddy: [
      "Nice one! That workout didn't stand a chance against you!",
      "Look at you go! One more workout closer to being an absolute legend!",
      "Boom! Workout done! Now go eat something good — you earned it!",
    ],
  };

  const messages = defaultMessages[personality] || defaultMessages.motivator;
  const index = Math.floor(Math.random() * messages.length);
  return messages[index];
}

// —— XP & Level System ————————————————————

const XP_KEY = "peakpulse_xp_data";

interface XPData {
  totalXP: number;
  currentLevel: number;
}

function calculateXP(event: CompletedWorkoutEvent, streak: number, milestoneReached: boolean): number {
  let xp = 0;

  // Base XP by duration
  xp += Math.min(event.durationMinutes * 5, 200);

  // Exercise completion bonus
  const completionRate = event.exercises.filter(e => e.completed).length / Math.max(event.exercises.length, 1);
  xp += Math.round(completionRate * 50);

  // Difficulty bonus
  xp += event.perceivedDifficulty * 10;

  // Streak multiplier
  if (streak >= 3) xp = Math.round(xp * 1.2);
  if (streak >= 7) xp = Math.round(xp * 1.5);
  if (streak >= 30) xp = Math.round(xp * 2.0);

  // Milestone bonus
  if (milestoneReached) xp += 100;

  return xp;
}

async function checkLevelUp(xpEarned: number): Promise<boolean> {
  try {
    const data = await AsyncStorage.getItem(XP_KEY);
    const xpData: XPData = data ? JSON.parse(data) : { totalXP: 0, currentLevel: 1 };

    const previousLevel = xpData.currentLevel;
    xpData.totalXP += xpEarned;

    // Level formula: Level = floor(sqrt(totalXP / 100)) + 1
    xpData.currentLevel = Math.floor(Math.sqrt(xpData.totalXP / 100)) + 1;

    await AsyncStorage.setItem(XP_KEY, JSON.stringify(xpData));
    return xpData.currentLevel > previousLevel;
  } catch {
    return false;
  }
}

// —— Analytics Flush ————————————————————————

const ANALYTICS_QUEUE_KEY = "peakpulse_analytics_queue";

async function flushAnalyticsEvents(events: AnalyticsEvent[]): Promise<void> {
  if (events.length === 0) return;

  try {
    const existing = await AsyncStorage.getItem(ANALYTICS_QUEUE_KEY);
    const queue: AnalyticsEvent[] = existing ? JSON.parse(existing) : [];
    queue.push(...events);

    // Keep max 500 events in queue
    const trimmed = queue.length > 500 ? queue.slice(-500) : queue;
    await AsyncStorage.setItem(ANALYTICS_QUEUE_KEY, JSON.stringify(trimmed));
  } catch {
    // Analytics should never block the main flow
  }
}

export async function getQueuedAnalytics(): Promise<AnalyticsEvent[]> {
  try {
    const data = await AsyncStorage.getItem(ANALYTICS_QUEUE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export async function clearAnalyticsQueue(): Promise<void> {
  await AsyncStorage.removeItem(ANALYTICS_QUEUE_KEY);
}

// —— Health Check / Debug ———————————————————

export async function getSystemHealth(): Promise<{
  context: SessionContext;
  streakData: StreakData;
  workoutCount: number;
  analyticsQueueSize: number;
}> {
  const context = await getSessionContext();
  const streakData = await getStreakData();
  const workouts = await getWorkoutLog();
  const analytics = await getQueuedAnalytics();

  return {
    context,
    streakData,
    workoutCount: workouts.length,
    analyticsQueueSize: analytics.length,
  };
}
