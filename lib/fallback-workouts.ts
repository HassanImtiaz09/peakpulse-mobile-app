// lib/fallback-workouts.ts
// Fallback Workout System for PeakPulse AI
// Detects missed sessions and proactively offers shorter alternative workouts
// to keep users engaged and prevent dropout

import AsyncStorage from "@react-native-async-storage/async-storage";

// —— Types ——————————————————————————————————

export type FallbackReason = "missed_session" | "low_energy" | "time_crunch" | "recovery_day" | "travel";

export interface FallbackWorkout {
  id: string;
  name: string;
  reason: FallbackReason;
  durationMinutes: number;
  exercises: FallbackExercise[];
  motivationalMessage: string;
  calorieEstimate: number;
  difficulty: "easy" | "moderate";
  equipment: "none" | "minimal";
}

export interface FallbackExercise {
  name: string;
  reps?: number;
  durationSeconds?: number;
  restSeconds: number;
  instructions: string;
}

export interface MissedSessionLog {
  date: string;
  scheduledTime?: string;
  reason?: FallbackReason;
  fallbackOffered: boolean;
  fallbackAccepted: boolean;
  fallbackCompleted: boolean;
}

export interface UserSessionPattern {
  lastWorkoutDate: string | null;
  averageWorkoutsPerWeek: number;
  consecutiveMissedDays: number;
  totalMissedThisWeek: number;
  missedSessionHistory: MissedSessionLog[];
  preferredWorkoutDays: number[]; // 0=Sun, 1=Mon, etc.
}

// —— Storage Keys ——————————————————————————

const SESSION_PATTERN_KEY = "peakpulse_session_pattern";
const LAST_WORKOUT_KEY = "peakpulse_last_workout_timestamp";

// —— Fallback Workout Templates ———————————

const FALLBACK_TEMPLATES: Record<FallbackReason, FallbackWorkout[]> = {
  missed_session: [
    {
      id: "fb_comeback_5",
      name: "5-Minute Comeback",
      reason: "missed_session",
      durationMinutes: 5,
      calorieEstimate: 40,
      difficulty: "easy",
      equipment: "none",
      motivationalMessage: "Missed yesterday? No worries — 5 minutes is all it takes to get back on track!",
      exercises: [
        { name: "Jumping Jacks", durationSeconds: 30, restSeconds: 10, instructions: "Light pace, just get moving" },
        { name: "Bodyweight Squats", reps: 10, restSeconds: 10, instructions: "Controlled, full range of motion" },
        { name: "Push-ups", reps: 8, restSeconds: 10, instructions: "Knees okay if needed" },
        { name: "Mountain Climbers", durationSeconds: 20, restSeconds: 10, instructions: "Moderate pace" },
        { name: "Plank Hold", durationSeconds: 30, restSeconds: 0, instructions: "Tight core, breathe steadily" },
      ],
    },
    {
      id: "fb_comeback_10",
      name: "10-Minute Reset",
      reason: "missed_session",
      durationMinutes: 10,
      calorieEstimate: 85,
      difficulty: "moderate",
      equipment: "none",
      motivationalMessage: "One missed day doesn't define you. Let's make the next 10 minutes count!",
      exercises: [
        { name: "High Knees", durationSeconds: 30, restSeconds: 15, instructions: "Warm up those legs" },
        { name: "Lunges (alternating)", reps: 12, restSeconds: 15, instructions: "Step forward, knee to 90 degrees" },
        { name: "Push-ups", reps: 12, restSeconds: 15, instructions: "Chest to the floor" },
        { name: "Burpees", reps: 6, restSeconds: 20, instructions: "Full range, controlled pace" },
        { name: "Bicycle Crunches", reps: 20, restSeconds: 15, instructions: "Slow and controlled" },
        { name: "Squat Jumps", reps: 8, restSeconds: 15, instructions: "Explode up, soft landing" },
        { name: "Plank to Downward Dog", reps: 8, restSeconds: 10, instructions: "Flow between positions" },
        { name: "Superman Hold", durationSeconds: 30, restSeconds: 0, instructions: "Squeeze your back muscles" },
      ],
    },
  ],
  low_energy: [
    {
      id: "fb_gentle_flow",
      name: "Gentle Energy Flow",
      reason: "low_energy",
      durationMinutes: 8,
      calorieEstimate: 35,
      difficulty: "easy",
      equipment: "none",
      motivationalMessage: "Low energy days still count. This gentle flow will leave you feeling better than before.",
      exercises: [
        { name: "Cat-Cow Stretch", reps: 10, restSeconds: 10, instructions: "Slow, rhythmic breathing" },
        { name: "Standing Forward Fold", durationSeconds: 30, restSeconds: 10, instructions: "Let gravity do the work" },
        { name: "Gentle Squats", reps: 8, restSeconds: 15, instructions: "Slow tempo, no strain" },
        { name: "Wall Push-ups", reps: 10, restSeconds: 10, instructions: "Easy on the joints" },
        { name: "Seated Twist", durationSeconds: 20, restSeconds: 10, instructions: "Each side, breathe deeply" },
        { name: "Leg Raises (lying)", reps: 8, restSeconds: 10, instructions: "Controlled, support your back" },
        { name: "Child's Pose", durationSeconds: 30, restSeconds: 0, instructions: "Relax and breathe" },
      ],
    },
  ],
  time_crunch: [
    {
      id: "fb_express_blast",
      name: "Express Blast",
      reason: "time_crunch",
      durationMinutes: 7,
      calorieEstimate: 70,
      difficulty: "moderate",
      equipment: "none",
      motivationalMessage: "Only 7 minutes? That's enough to make a difference. Let's go!",
      exercises: [
        { name: "Burpees", reps: 5, restSeconds: 10, instructions: "Fast but controlled" },
        { name: "Jump Squats", reps: 10, restSeconds: 10, instructions: "Explosive power" },
        { name: "Push-up to Shoulder Tap", reps: 8, restSeconds: 10, instructions: "Stay stable" },
        { name: "High Knees", durationSeconds: 30, restSeconds: 10, instructions: "Sprint pace" },
        { name: "Plank Jacks", reps: 12, restSeconds: 10, instructions: "Keep hips level" },
        { name: "Tuck Jumps", reps: 6, restSeconds: 10, instructions: "Knees to chest" },
        { name: "Plank Hold", durationSeconds: 30, restSeconds: 0, instructions: "Finish strong!" },
      ],
    },
  ],
  recovery_day: [
    {
      id: "fb_active_recovery",
      name: "Active Recovery",
      reason: "recovery_day",
      durationMinutes: 10,
      calorieEstimate: 30,
      difficulty: "easy",
      equipment: "none",
      motivationalMessage: "Recovery is where the magic happens. Light movement today fuels tomorrow's gains.",
      exercises: [
        { name: "Neck Rolls", durationSeconds: 30, restSeconds: 5, instructions: "Slow circles each direction" },
        { name: "Arm Circles", durationSeconds: 30, restSeconds: 5, instructions: "Small to large circles" },
        { name: "Hip Circles", durationSeconds: 30, restSeconds: 5, instructions: "Loosen those hip flexors" },
        { name: "Hamstring Stretch", durationSeconds: 30, restSeconds: 5, instructions: "Hold, don't bounce" },
        { name: "Pigeon Stretch", durationSeconds: 30, restSeconds: 5, instructions: "Each side, breathe into it" },
        { name: "Spine Twist (lying)", durationSeconds: 30, restSeconds: 5, instructions: "Relax into the stretch" },
        { name: "Deep Breathing", durationSeconds: 60, restSeconds: 0, instructions: "4 count in, 6 count out" },
      ],
    },
  ],
  travel: [
    {
      id: "fb_hotel_room",
      name: "Hotel Room Hustle",
      reason: "travel",
      durationMinutes: 8,
      calorieEstimate: 60,
      difficulty: "moderate",
      equipment: "none",
      motivationalMessage: "On the road? No excuses needed — this workout fits anywhere!",
      exercises: [
        { name: "Bodyweight Squats", reps: 15, restSeconds: 10, instructions: "Use a chair for support if needed" },
        { name: "Incline Push-ups (bed/chair)", reps: 12, restSeconds: 10, instructions: "Hands on elevated surface" },
        { name: "Glute Bridges", reps: 15, restSeconds: 10, instructions: "Squeeze at the top" },
        { name: "Tricep Dips (chair)", reps: 10, restSeconds: 10, instructions: "Control the descent" },
        { name: "Crunches", reps: 15, restSeconds: 10, instructions: "Slow and controlled" },
        { name: "Wall Sit", durationSeconds: 30, restSeconds: 10, instructions: "Thighs parallel to floor" },
        { name: "Standing Calf Raises", reps: 20, restSeconds: 0, instructions: "Squeeze at the top" },
      ],
    },
  ],
};

// —— Missed Session Detection ——————————————

export async function getSessionPattern(): Promise<UserSessionPattern> {
  try {
    const data = await AsyncStorage.getItem(SESSION_PATTERN_KEY);
    if (data) return JSON.parse(data);
  } catch {
    // ignore
  }
  return {
    lastWorkoutDate: null,
    averageWorkoutsPerWeek: 0,
    consecutiveMissedDays: 0,
    totalMissedThisWeek: 0,
    missedSessionHistory: [],
    preferredWorkoutDays: [1, 2, 3, 4, 5], // Default: weekdays
  };
}

export async function saveSessionPattern(pattern: UserSessionPattern): Promise<void> {
  await AsyncStorage.setItem(SESSION_PATTERN_KEY, JSON.stringify(pattern));
}

export async function recordWorkoutCompleted(): Promise<void> {
  const pattern = await getSessionPattern();
  pattern.lastWorkoutDate = new Date().toISOString();
  pattern.consecutiveMissedDays = 0;

  // Recalculate average
  const recentLogs = pattern.missedSessionHistory.slice(-30);
  const completedDays = recentLogs.filter(l => l.fallbackCompleted || !l.fallbackOffered).length;
  pattern.averageWorkoutsPerWeek = Math.round((completedDays / 30) * 7 * 10) / 10;

  await saveSessionPattern(pattern);
  await AsyncStorage.setItem(LAST_WORKOUT_KEY, Date.now().toString());
}

export async function checkForMissedSession(): Promise<{
  missed: boolean;
  daysMissed: number;
  isScheduledDay: boolean;
  suggestedReason: FallbackReason;
}> {
  const pattern = await getSessionPattern();
  const now = new Date();
  const today = now.getDay();

  let daysMissed = 0;
  if (pattern.lastWorkoutDate) {
    const lastWorkout = new Date(pattern.lastWorkoutDate);
    const diffMs = now.getTime() - lastWorkout.getTime();
    daysMissed = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  } else {
    daysMissed = 0; // New user, no missed sessions yet
  }

  const isScheduledDay = pattern.preferredWorkoutDays.includes(today);
  const missed = daysMissed >= 2 || (daysMissed >= 1 && isScheduledDay);

  // Determine most likely reason
  let suggestedReason: FallbackReason = "missed_session";
  if (daysMissed >= 3) suggestedReason = "missed_session";
  else if (daysMissed === 1 && !isScheduledDay) suggestedReason = "recovery_day";

  // Update pattern
  if (missed) {
    pattern.consecutiveMissedDays = daysMissed;
    pattern.totalMissedThisWeek = Math.min(7, pattern.totalMissedThisWeek + 1);
    await saveSessionPattern(pattern);
  }

  return { missed, daysMissed, isScheduledDay, suggestedReason };
}

// —— Fallback Workout Selection ———————————

export function getFallbackWorkout(reason: FallbackReason, maxMinutes?: number): FallbackWorkout | null {
  const templates = FALLBACK_TEMPLATES[reason];
  if (!templates || templates.length === 0) return null;

  if (maxMinutes) {
    const filtered = templates.filter(t => t.durationMinutes <= maxMinutes);
    return filtered.length > 0 ? filtered[0] : templates[0];
  }

  return templates[0];
}

export function getAllFallbackWorkouts(): FallbackWorkout[] {
  return Object.values(FALLBACK_TEMPLATES).flat();
}

export function getFallbacksByReason(reason: FallbackReason): FallbackWorkout[] {
  return FALLBACK_TEMPLATES[reason] || [];
}

export async function getSmartFallback(): Promise<{
  workout: FallbackWorkout;
  reason: FallbackReason;
  message: string;
} | null> {
  const { missed, daysMissed, suggestedReason } = await checkForMissedSession();

  if (!missed) return null;

  const workout = getFallbackWorkout(suggestedReason);
  if (!workout) return null;

  // Customize message based on context
  let message = workout.motivationalMessage;
  if (daysMissed >= 3) {
    message = `It's been ${daysMissed} days — but today is a fresh start. This ${workout.durationMinutes}-minute workout will get you back in the game!`;
  } else if (daysMissed === 2) {
    message = `Missed a couple days? Totally normal. This quick ${workout.durationMinutes}-minute session keeps your streak alive!`;
  }

  return { workout, reason: suggestedReason, message };
}

// —— Fallback Session Logging —————————————

export async function logFallbackOffered(reason: FallbackReason): Promise<void> {
  const pattern = await getSessionPattern();
  const log: MissedSessionLog = {
    date: new Date().toISOString(),
    reason,
    fallbackOffered: true,
    fallbackAccepted: false,
    fallbackCompleted: false,
  };
  pattern.missedSessionHistory.push(log);
  // Keep last 90 days of history
  if (pattern.missedSessionHistory.length > 90) {
    pattern.missedSessionHistory = pattern.missedSessionHistory.slice(-90);
  }
  await saveSessionPattern(pattern);
}

export async function logFallbackAccepted(): Promise<void> {
  const pattern = await getSessionPattern();
  const lastLog = pattern.missedSessionHistory[pattern.missedSessionHistory.length - 1];
  if (lastLog) {
    lastLog.fallbackAccepted = true;
  }
  await saveSessionPattern(pattern);
}

export async function logFallbackCompleted(): Promise<void> {
  const pattern = await getSessionPattern();
  const lastLog = pattern.missedSessionHistory[pattern.missedSessionHistory.length - 1];
  if (lastLog) {
    lastLog.fallbackCompleted = true;
  }
  await saveSessionPattern(pattern);
  await recordWorkoutCompleted();
}

// —— Analytics Helpers ————————————————————

export async function getFallbackStats(): Promise<{
  totalOffered: number;
  totalAccepted: number;
  totalCompleted: number;
  acceptanceRate: number;
  completionRate: number;
  mostCommonReason: FallbackReason;
}> {
  const pattern = await getSessionPattern();
  const history = pattern.missedSessionHistory;

  const totalOffered = history.filter(h => h.fallbackOffered).length;
  const totalAccepted = history.filter(h => h.fallbackAccepted).length;
  const totalCompleted = history.filter(h => h.fallbackCompleted).length;

  const acceptanceRate = totalOffered > 0 ? Math.round((totalAccepted / totalOffered) * 100) : 0;
  const completionRate = totalAccepted > 0 ? Math.round((totalCompleted / totalAccepted) * 100) : 0;

  // Find most common reason
  const reasonCounts: Record<string, number> = {};
  for (const log of history) {
    if (log.reason) {
      reasonCounts[log.reason] = (reasonCounts[log.reason] || 0) + 1;
    }
  }
  const mostCommonReason = (Object.entries(reasonCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "missed_session") as FallbackReason;

  return { totalOffered, totalAccepted, totalCompleted, acceptanceRate, completionRate, mostCommonReason };
}

export function getWorkoutDuration(workout: FallbackWorkout): number {
  return workout.exercises.reduce((total, ex) => {
    const exerciseTime = ex.durationSeconds || (ex.reps ? ex.reps * 3 : 0);
    return total + exerciseTime + ex.restSeconds;
  }, 0);
}

export function formatFallbackSummary(workout: FallbackWorkout): string {
  return `${workout.name} (${workout.durationMinutes} min) — ${workout.exercises.length} exercises, ~${workout.calorieEstimate} cal. ${workout.motivationalMessage}`;
}
