/**
 * Coach Personality Engine
 *
 * Enhances AI coach interactions with personality-driven context:
 * - Morning briefing: time-of-day adaptive greeting with daily state data
 * - Post-workout analysis: immediate feedback after completing a workout
 * - Re-engagement nudge: motivational prompt after 2+ days of inactivity
 * - Workout data pipeline: feeds progression, streak, and daily state into coach context
 *
 * All functions are pure (AsyncStorage reads only) and return structured
 * context objects that can be passed to the server-side AI coach.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { getDailyState, type DailyState } from "./daily-state";

// ── Types ────────────────────────────────────────────────────────────────────

export type CoachPersonality = "motivator" | "analyst" | "mentor";

export interface CoachContext {
  /** Which personality to use for this interaction */
  personality: CoachPersonality;
  /** Trigger type */
  trigger: "morning_briefing" | "post_workout" | "re_engagement" | "general";
  /** Structured data to include in the AI prompt */
  contextData: Record<string, unknown>;
  /** Suggested system prompt additions */
  systemPromptAdditions: string;
}

export interface PostWorkoutData {
  exerciseCount: number;
  totalSets: number;
  totalVolume: number; // kg
  duration: number; // minutes
  muscleGroups: string[];
  personalRecords?: string[];
  exerciseNames: string[];
}

// ── Personality Selection ────────────────────────────────────────────────────

/**
 * Select coach personality based on time of day and user behavior.
 * - Morning (5am-11am): Motivator (energetic, encouraging)
 * - Midday (11am-5pm): Analyst (data-driven, precise)
 * - Evening (5pm-10pm): Mentor (reflective, supportive)
 * - Night (10pm-5am): Mentor (calm, recovery-focused)
 */
export function selectPersonality(hour?: number): CoachPersonality {
  const h = hour ?? new Date().getHours();
  if (h >= 5 && h < 11) return "motivator";
  if (h >= 11 && h < 17) return "analyst";
  return "mentor";
}

/**
 * Get personality-specific system prompt additions.
 */
export function getPersonalityPrompt(personality: CoachPersonality): string {
  switch (personality) {
    case "motivator":
      return (
        "You are an energetic, encouraging fitness coach. " +
        "Use motivational language, celebrate wins (even small ones), " +
        "and frame challenges as opportunities. Keep energy high but authentic. " +
        "Use phrases like 'Let's crush it!', 'You've got this!', 'Great progress!'"
      );
    case "analyst":
      return (
        "You are a data-driven, precise fitness coach. " +
        "Reference specific numbers (volume, calories, streaks) when available. " +
        "Provide actionable insights based on trends. Be concise and evidence-based. " +
        "Use phrases like 'The data shows...', 'Based on your progress...', 'Optimally...'"
      );
    case "mentor":
      return (
        "You are a wise, supportive fitness mentor. " +
        "Focus on long-term habits, recovery, and sustainable progress. " +
        "Be reflective and empathetic. Acknowledge effort over outcomes. " +
        "Use phrases like 'Remember why you started...', 'Consistency is key...', 'Listen to your body...'"
      );
  }
}

// ── Morning Briefing Context ─────────────────────────────────────────────────

/**
 * Build morning briefing context from daily state.
 * Includes: streak status, today's workout plan, meal progress, macro balance.
 */
export async function buildMorningBriefingContext(): Promise<CoachContext> {
  const personality = selectPersonality();
  const dailyState = await getDailyState();

  const streakDays = dailyState.dailyXPStreak;
  const streakActive = streakDays > 0;

  const contextData: Record<string, unknown> = {
    timeOfDay: dailyState.timeOfDay,
    streakDays,
    streakActive,
    workoutStatus: dailyState.workoutStatus,
    mealsLogged: dailyState.mealsLogged,
    mealsPlanned: dailyState.mealsPlanned,
    caloriesConsumed: dailyState.caloriesConsumed,
    caloriesRemaining: dailyState.caloriesRemaining,
    macros: dailyState.macros,
  };

  // Add yesterday's workout summary if available
  const yesterdaySummary = await getYesterdayWorkoutSummary();
  if (yesterdaySummary) {
    contextData.yesterdayWorkout = yesterdaySummary;
  }

  const systemPromptAdditions = [
    getPersonalityPrompt(personality),
    `Time of day: ${dailyState.timeOfDay}.`,
    streakActive
      ? `User has a ${streakDays}-day streak — acknowledge it!`
      : streakDays > 0
        ? `User had a ${streakDays}-day streak but it lapsed — encourage them to restart.`
        : "User is just starting out — be welcoming and set expectations.",
    dailyState.workoutStatus === "completed"
      ? "Today's workout is already done — congratulate them."
      : dailyState.workoutStatus === "scheduled"
        ? "User has a workout scheduled today — remind them."
        : "No workout scheduled today — suggest active recovery or a light session.",
  ].join(" ");

  return {
    personality,
    trigger: "morning_briefing",
    contextData,
    systemPromptAdditions,
  };
}

// ── Post-Workout Analysis Context ────────────────────────────────────────────

/**
 * Build post-workout analysis context from the just-completed session.
 */
export async function buildPostWorkoutContext(
  workoutData: PostWorkoutData
): Promise<CoachContext> {
  const personality = selectPersonality();
  const dailyState = await getDailyState();

  const contextData: Record<string, unknown> = {
    exerciseCount: workoutData.exerciseCount,
    totalSets: workoutData.totalSets,
    totalVolume: workoutData.totalVolume,
    durationMinutes: workoutData.duration,
    muscleGroups: workoutData.muscleGroups,
    personalRecords: workoutData.personalRecords ?? [],
    exerciseNames: workoutData.exerciseNames,
    streakDays: dailyState.dailyXPStreak,
    caloriesRemaining: dailyState.caloriesRemaining,
  };

  // Check for progression suggestions
  const progressionRaw = await AsyncStorage.getItem("@progression_suggestions");
  if (progressionRaw) {
    try {
      const suggestions = JSON.parse(progressionRaw);
      contextData.progressionSuggestions = suggestions;
    } catch {}
  }

  const hasPRs = (workoutData.personalRecords?.length ?? 0) > 0;
  const systemPromptAdditions = [
    getPersonalityPrompt(personality),
    `User just completed a ${workoutData.duration}-minute workout with ${workoutData.exerciseCount} exercises and ${workoutData.totalSets} total sets.`,
    `Total volume: ${workoutData.totalVolume}kg across ${workoutData.muscleGroups.join(", ")}.`,
    hasPRs
      ? `PERSONAL RECORDS HIT: ${workoutData.personalRecords!.join(", ")}! Celebrate this achievement enthusiastically!`
      : "No new PRs today — encourage consistency and progressive overload.",
    dailyState.caloriesRemaining > 0
      ? `User still has ${Math.round(dailyState.caloriesRemaining)} calories remaining today — suggest post-workout nutrition.`
      : "User has met their calorie target — remind them about protein timing.",
    `Current streak: ${dailyState.dailyXPStreak} days.`,
  ].join(" ");

  return {
    personality,
    trigger: "post_workout",
    contextData,
    systemPromptAdditions,
  };
}

// ── Re-engagement Nudge Context ──────────────────────────────────────────────

/**
 * Build re-engagement context for users who haven't worked out in 2+ days.
 */
export async function buildReEngagementContext(): Promise<CoachContext | null> {
  const lastWorkoutRaw = await AsyncStorage.getItem("@last_workout_date");
  if (!lastWorkoutRaw) return null;

  const lastWorkoutDate = new Date(lastWorkoutRaw);
  const daysSince = Math.floor(
    (Date.now() - lastWorkoutDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Only trigger for 2+ days of inactivity
  if (daysSince < 2) return null;

  const personality: CoachPersonality = "mentor"; // Always mentor for re-engagement
  const dailyState = await getDailyState();
  const streakDays = dailyState.dailyXPStreak;
  const streakActive = streakDays > 0;

  const contextData: Record<string, unknown> = {
    daysSinceLastWorkout: daysSince,
    previousStreakDays: streakDays,
    streakActive,
  };

  // Check if there's a workout plan they can resume
  const planRaw = await AsyncStorage.getItem("@workout_plan");
  if (planRaw) {
    try {
      const plan = JSON.parse(planRaw);
      contextData.hasWorkoutPlan = true;
      contextData.planName = plan.name ?? plan.title ?? "their workout plan";
    } catch {}
  }

  const systemPromptAdditions = [
    getPersonalityPrompt(personality),
    `User hasn't worked out in ${daysSince} days.`,
    daysSince <= 3
      ? "This is a short break — gently encourage them to get back on track without guilt."
      : daysSince <= 7
        ? "It's been almost a week — acknowledge life happens and suggest an easy re-entry workout."
        : "Extended break — be very supportive, no guilt. Suggest starting fresh with a light session.",
    streakDays > 0 && !streakActive
      ? `They had a ${streakDays}-day streak before the break — use this as motivation to rebuild.`
      : "",
    contextData.hasWorkoutPlan
      ? `They have a workout plan (${contextData.planName}) ready to resume.`
      : "Suggest creating a new workout plan to get started.",
  ]
    .filter(Boolean)
    .join(" ");

  return {
    personality,
    trigger: "re_engagement",
    contextData,
    systemPromptAdditions,
  };
}

// ── Workout Data Pipeline ────────────────────────────────────────────────────

/**
 * Build comprehensive workout data context for any coach interaction.
 * This is the "data pipeline" that feeds all available user data into the coach.
 */
export async function buildWorkoutDataPipeline(): Promise<Record<string, unknown>> {
  const dailyState = await getDailyState();

  const pipeline: Record<string, unknown> = {
    // Daily snapshot
    daily: {
      mealsLogged: dailyState.mealsLogged,
      mealsPlanned: dailyState.mealsPlanned,
      caloriesConsumed: dailyState.caloriesConsumed,
      caloriesRemaining: dailyState.caloriesRemaining,
      macros: dailyState.macros,
      workoutStatus: dailyState.workoutStatus,
      streakDays: dailyState.dailyXPStreak,
      streakActive: dailyState.dailyXPStreak > 0,
      timeOfDay: dailyState.timeOfDay,
    },
  };

  // Recent workout history (last 7 sessions)
  try {
    const sessionsRaw = await AsyncStorage.getItem("@workout_sessions");
    if (sessionsRaw) {
      const sessions = JSON.parse(sessionsRaw);
      const recent = Array.isArray(sessions) ? sessions.slice(-7) : [];
      pipeline.recentWorkouts = recent.map((s: any) => ({
        date: s.date,
        duration: s.duration,
        exerciseCount: s.exercises?.length ?? s.exerciseCount ?? 0,
        muscleGroups: s.muscleGroups ?? [],
      }));
    }
  } catch {}

  // Progression suggestions
  try {
    const progressionRaw = await AsyncStorage.getItem("@progression_suggestions");
    if (progressionRaw) {
      pipeline.progressionSuggestions = JSON.parse(progressionRaw);
    }
  } catch {}

  // XP and level
  try {
    const xpRaw = await AsyncStorage.getItem("@xp_state");
    if (xpRaw) {
      const xp = JSON.parse(xpRaw);
      pipeline.xp = { level: xp.level, totalXP: xp.totalXP };
    }
  } catch {}

  // Body composition (latest scan)
  try {
    const scanRaw = await AsyncStorage.getItem("@body_scan_history");
    if (scanRaw) {
      const scans = JSON.parse(scanRaw);
      if (Array.isArray(scans) && scans.length > 0) {
        const latest = scans[scans.length - 1];
        pipeline.bodyComposition = {
          estimatedBF: latest.estimatedBodyFat,
          date: latest.date,
          trend: latest.trend,
        };
      }
    }
  } catch {}

  return pipeline;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function getYesterdayWorkoutSummary(): Promise<Record<string, unknown> | null> {
  try {
    const sessionsRaw = await AsyncStorage.getItem("@workout_sessions");
    if (!sessionsRaw) return null;
    const sessions = JSON.parse(sessionsRaw);
    if (!Array.isArray(sessions) || sessions.length === 0) return null;

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    const yesterdaySession = sessions.find(
      (s: any) => s.date?.startsWith(yesterdayStr)
    );
    if (!yesterdaySession) return null;

    return {
      duration: yesterdaySession.duration,
      exerciseCount: yesterdaySession.exercises?.length ?? yesterdaySession.exerciseCount ?? 0,
      muscleGroups: yesterdaySession.muscleGroups ?? [],
    };
  } catch {
    return null;
  }
}

/**
 * Check if a re-engagement nudge should be shown.
 * Returns true if user hasn't worked out in 2+ days and hasn't been nudged today.
 */
export async function shouldShowReEngagement(): Promise<boolean> {
  try {
    const lastNudgeRaw = await AsyncStorage.getItem("@last_reengagement_nudge");
    if (lastNudgeRaw) {
      const lastNudge = new Date(lastNudgeRaw);
      const hoursSince = (Date.now() - lastNudge.getTime()) / (1000 * 60 * 60);
      if (hoursSince < 24) return false; // Only nudge once per day
    }

    const context = await buildReEngagementContext();
    return context !== null;
  } catch {
    return false;
  }
}

/**
 * Record that a re-engagement nudge was shown.
 */
export async function recordReEngagementNudge(): Promise<void> {
  try {
    await AsyncStorage.setItem(
      "@last_reengagement_nudge",
      new Date().toISOString()
    );
  } catch {}
}
