/**
 * R2: Progressive Feature Disclosure Service
 * Tracks user milestones and shows contextual prompts to surface features
 * at the moment they become relevant. Each prompt shows only once.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { UI } from "@/constants/ui-colors";

const DISCOVERY_KEY = "@peakpulse_feature_discovery";

export interface DiscoveryPrompt {
  id: string;
  title: string;
  message: string;
  icon: string;
  route: string;
  ctaText: string;
  accentColor: string;
}

export interface DiscoveryState {
  /** IDs of prompts that have been dismissed */
  dismissed: string[];
  /** Milestone counters */
  workoutsCompleted: number;
  mealsLogged: number;
  timerUsed: boolean;
  progressPhotoTaken: boolean;
  firstWeekComplete: boolean;
}

const DEFAULT_STATE: DiscoveryState = {
  dismissed: [],
  workoutsCompleted: 0,
  mealsLogged: 0,
  timerUsed: false,
  progressPhotoTaken: false,
  firstWeekComplete: false,
};

/** All possible discovery prompts with their trigger conditions */
const PROMPT_DEFINITIONS: Array<{
  prompt: DiscoveryPrompt;
  shouldShow: (state: DiscoveryState) => boolean;
}> = [
  {
    prompt: {
      id: "analytics_after_first_workout",
      title: "Track Your Progress",
      message: "Great workout! View your progress trends and strength gains in Analytics.",
      icon: "bar-chart",
      route: "/workout-analytics",
      ctaText: "View Analytics",
      accentColor: "#3B82F6",
    },
    shouldShow: (s) => s.workoutsCompleted >= 1,
  },
  {
    prompt: {
      id: "voice_coach_after_timer",
      title: "Try Voice Coaching",
      message: "Want hands-free guidance? Enable Voice Coach for audio form cues during your sets.",
      icon: "record-voice-over",
      route: "/voice-coach-settings",
      ctaText: "Enable Voice Coach",
      accentColor: UI.gold,
    },
    shouldShow: (s) => s.timerUsed,
  },
  {
    prompt: {
      id: "pr_after_three_workouts",
      title: "Personal Records",
      message: "You've completed 3 workouts! Track your personal records to see strength gains over time.",
      icon: "emoji-events",
      route: "/workout-analytics",
      ctaText: "View Records",
      accentColor: UI.green,
    },
    shouldShow: (s) => s.workoutsCompleted >= 3,
  },
  {
    prompt: {
      id: "body_scan_after_photo",
      title: "AI Body Analysis",
      message: "Want to track your transformation? Try an AI Body Scan for detailed body composition analysis.",
      icon: "camera-alt",
      route: "/(tabs)/scan",
      ctaText: "Try Body Scan",
      accentColor: UI.ice,
    },
    shouldShow: (s) => s.progressPhotoTaken,
  },
  {
    prompt: {
      id: "meal_prep_after_five_meals",
      title: "AI Meal Prep Plans",
      message: "Loving your meal plan? Upgrade for detailed meal prep instructions and shopping lists.",
      icon: "restaurant",
      route: "/subscription",
      ctaText: "Learn More",
      accentColor: UI.teal,
    },
    shouldShow: (s) => s.mealsLogged >= 5,
  },
  {
    prompt: {
      id: "weekly_summary_after_seven_days",
      title: "Your First Week!",
      message: "Congratulations on completing your first week! Check your weekly summary and keep the momentum going.",
      icon: "calendar-today",
      route: "/workout-calendar",
      ctaText: "View Summary",
      accentColor: UI.gold,
    },
    shouldShow: (s) => s.firstWeekComplete,
  },
];

async function loadState(): Promise<DiscoveryState> {
  try {
    const raw = await AsyncStorage.getItem(DISCOVERY_KEY);
    if (!raw) return DEFAULT_STATE;
    return { ...DEFAULT_STATE, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_STATE;
  }
}

async function saveState(state: DiscoveryState): Promise<void> {
  await AsyncStorage.setItem(DISCOVERY_KEY, JSON.stringify(state));
}

/** Get the next undismissed prompt that should be shown */
export async function getNextPrompt(): Promise<DiscoveryPrompt | null> {
  const state = await loadState();
  for (const def of PROMPT_DEFINITIONS) {
    if (def.shouldShow(state) && !state.dismissed.includes(def.prompt.id)) {
      return def.prompt;
    }
  }
  return null;
}

/** Dismiss a prompt so it never shows again */
export async function dismissPrompt(promptId: string): Promise<void> {
  const state = await loadState();
  if (!state.dismissed.includes(promptId)) {
    state.dismissed.push(promptId);
    await saveState(state);
  }
}

/** Record that a workout was completed */
export async function recordWorkoutCompleted(): Promise<void> {
  const state = await loadState();
  state.workoutsCompleted += 1;
  await saveState(state);
}

/** Record that the timer was used */
export async function recordTimerUsed(): Promise<void> {
  const state = await loadState();
  state.timerUsed = true;
  await saveState(state);
}

/** Record that a meal was logged */
export async function recordMealLogged(): Promise<void> {
  const state = await loadState();
  state.mealsLogged += 1;
  await saveState(state);
}

/** Record that a progress photo was taken */
export async function recordProgressPhotoTaken(): Promise<void> {
  const state = await loadState();
  state.progressPhotoTaken = true;
  await saveState(state);
}

/** Record that the first week is complete */
export async function recordFirstWeekComplete(): Promise<void> {
  const state = await loadState();
  state.firstWeekComplete = true;
  await saveState(state);
}

/** Get current discovery state (for testing) */
export async function getDiscoveryState(): Promise<DiscoveryState> {
  return loadState();
}

/** Reset all discovery state (for testing) */
export async function resetDiscoveryState(): Promise<void> {
  await AsyncStorage.removeItem(DISCOVERY_KEY);
}
