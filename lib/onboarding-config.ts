/**
 * PeakPulse Onboarding Optimization Config
 *
 * Reduces onboarding from 8 steps to 4 streamlined steps.
 * Adds progress tracking, skip/complete-later, and quick-start templates.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

// ——— Types ————————————————————————————————————————

export interface OnboardingStep {
  id: string;
  title: string;
  subtitle: string;
  emoji: string;
  fields: OnboardingField[];
  skippable: boolean;
  estimatedSeconds: number;
}

export interface OnboardingField {
  key: string;
  label: string;
  type: "select" | "number" | "text" | "multi-select" | "slider";
  placeholder?: string;
  options?: { label: string; value: string; emoji?: string }[];
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  required: boolean;
  defaultValue?: any;
}

export interface OnboardingProgress {
  currentStep: number;
  completedSteps: string[];
  skippedSteps: string[];
  startedAt: string;
  completedAt?: string;
  answers: Record<string, any>;
}

export interface QuickStartTemplate {
  id: string;
  name: string;
  emoji: string;
  description: string;
  tagline: string;
  defaults: Record<string, any>;
  recommendedFor: string[];
}

// ——— Optimized 4-Step Onboarding ————————————————

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: "basics",
    title: "Let's Get Started",
    subtitle: "Just the essentials — takes 30 seconds",
    emoji: "\u{1F44B}",
    skippable: false,
    estimatedSeconds: 30,
    fields: [
      {
        key: "name",
        label: "What should we call you?",
        type: "text",
        placeholder: "Your name",
        required: true,
      },
      {
        key: "gender",
        label: "Gender",
        type: "select",
        options: [
          { label: "Male", value: "male", emoji: "\u{1F468}" },
          { label: "Female", value: "female", emoji: "\u{1F469}" },
          { label: "Other", value: "other", emoji: "\u{1F9D1}" },
          { label: "Prefer not to say", value: "unspecified", emoji: "\u{1F910}" },
        ],
        required: false,
        defaultValue: "unspecified",
      },
      {
        key: "age",
        label: "Age",
        type: "number",
        placeholder: "25",
        min: 13,
        max: 100,
        required: true,
      },
    ],
  },
  {
    id: "body",
    title: "Your Body Stats",
    subtitle: "Helps us personalise your experience",
    emoji: "\u{1F4CF}",
    skippable: true,
    estimatedSeconds: 20,
    fields: [
      {
        key: "heightCm",
        label: "Height",
        type: "slider",
        min: 120,
        max: 220,
        step: 1,
        unit: "cm",
        required: false,
        defaultValue: 170,
      },
      {
        key: "weightKg",
        label: "Weight",
        type: "slider",
        min: 30,
        max: 200,
        step: 0.5,
        unit: "kg",
        required: false,
        defaultValue: 70,
      },
      {
        key: "fitnessLevel",
        label: "Fitness level",
        type: "select",
        options: [
          { label: "Beginner", value: "beginner", emoji: "\u{1F331}" },
          { label: "Intermediate", value: "intermediate", emoji: "\u{1F4AA}" },
          { label: "Advanced", value: "advanced", emoji: "\u{1F525}" },
        ],
        required: true,
        defaultValue: "beginner",
      },
    ],
  },
  {
    id: "goals",
    title: "What's Your Goal?",
    subtitle: "Pick one primary goal — you can change it later",
    emoji: "\u{1F3AF}",
    skippable: false,
    estimatedSeconds: 15,
    fields: [
      {
        key: "goal",
        label: "Primary goal",
        type: "select",
        options: [
          { label: "Lose Weight", value: "weight loss", emoji: "\u{1F525}" },
          { label: "Build Muscle", value: "muscle gain", emoji: "\u{1F4AA}" },
          { label: "Get Fit Overall", value: "general fitness", emoji: "\u26A1" },
          { label: "Build Endurance", value: "endurance", emoji: "\u{1F3C3}" },
          { label: "Improve Flexibility", value: "flexibility", emoji: "\u{1F9D8}" },
        ],
        required: true,
      },
      {
        key: "daysPerWeek",
        label: "How many days per week can you train?",
        type: "select",
        options: [
          { label: "2-3 days", value: "3", emoji: "\u{1F4C5}" },
          { label: "4-5 days", value: "5", emoji: "\u{1F4AA}" },
          { label: "6-7 days", value: "6", emoji: "\u{1F525}" },
        ],
        required: true,
        defaultValue: "3",
      },
    ],
  },
  {
    id: "preferences",
    title: "Quick Preferences",
    subtitle: "Optional — fine-tune your experience",
    emoji: "\u2699\uFE0F",
    skippable: true,
    estimatedSeconds: 20,
    fields: [
      {
        key: "workoutDuration",
        label: "Preferred workout length",
        type: "select",
        options: [
          { label: "15-30 min", value: "short", emoji: "\u23F1" },
          { label: "30-45 min", value: "medium", emoji: "\u{1F55B}" },
          { label: "45-60+ min", value: "long", emoji: "\u{1F4AA}" },
        ],
        required: false,
        defaultValue: "medium",
      },
      {
        key: "equipment",
        label: "Available equipment",
        type: "multi-select",
        options: [
          { label: "None (Bodyweight)", value: "bodyweight", emoji: "\u{1F9D1}\u200D\u{1F3A4}" },
          { label: "Dumbbells", value: "dumbbells", emoji: "\u{1F3CB}" },
          { label: "Full Gym", value: "full_gym", emoji: "\u{1F3E2}" },
          { label: "Resistance Bands", value: "bands", emoji: "\u27B0" },
        ],
        required: false,
        defaultValue: ["bodyweight"],
      },
      {
        key: "notifications",
        label: "Workout reminders",
        type: "select",
        options: [
          { label: "Yes, remind me", value: "enabled", emoji: "\u{1F514}" },
          { label: "No thanks", value: "disabled", emoji: "\u{1F515}" },
        ],
        required: false,
        defaultValue: "enabled",
      },
    ],
  },
];

// ——— Quick-Start Templates ——————————————————————

export const QUICK_START_TEMPLATES: QuickStartTemplate[] = [
  {
    id: "fat_burner",
    name: "Fat Burner",
    emoji: "\u{1F525}",
    description: "High-intensity program focused on maximum calorie burn and fat loss",
    tagline: "Torch calories, reveal your physique",
    recommendedFor: ["weight loss", "general fitness"],
    defaults: {
      goal: "weight loss",
      fitnessLevel: "intermediate",
      daysPerWeek: "5",
      workoutDuration: "medium",
      equipment: ["bodyweight", "dumbbells"],
      notifications: "enabled",
    },
  },
  {
    id: "muscle_builder",
    name: "Muscle Builder",
    emoji: "\u{1F4AA}",
    description: "Progressive overload program to build lean muscle mass",
    tagline: "Structured gains, week by week",
    recommendedFor: ["muscle gain"],
    defaults: {
      goal: "muscle gain",
      fitnessLevel: "intermediate",
      daysPerWeek: "5",
      workoutDuration: "long",
      equipment: ["dumbbells", "full_gym"],
      notifications: "enabled",
    },
  },
  {
    id: "couch_to_fit",
    name: "Couch to Fit",
    emoji: "\u{1F331}",
    description: "Gentle beginner program that builds habits and confidence",
    tagline: "Start small, finish strong",
    recommendedFor: ["general fitness", "weight loss"],
    defaults: {
      goal: "general fitness",
      fitnessLevel: "beginner",
      daysPerWeek: "3",
      workoutDuration: "short",
      equipment: ["bodyweight"],
      notifications: "enabled",
    },
  },
  {
    id: "endurance_pro",
    name: "Endurance Pro",
    emoji: "\u{1F3C3}",
    description: "Cardio-focused program to build stamina and aerobic capacity",
    tagline: "Go longer, go faster",
    recommendedFor: ["endurance", "general fitness"],
    defaults: {
      goal: "endurance",
      fitnessLevel: "intermediate",
      daysPerWeek: "5",
      workoutDuration: "medium",
      equipment: ["bodyweight"],
      notifications: "enabled",
    },
  },
  {
    id: "flexibility_flow",
    name: "Flexibility Flow",
    emoji: "\u{1F9D8}",
    description: "Mobility and stretching program for better range of motion",
    tagline: "Move freely, feel amazing",
    recommendedFor: ["flexibility"],
    defaults: {
      goal: "flexibility",
      fitnessLevel: "beginner",
      daysPerWeek: "3",
      workoutDuration: "short",
      equipment: ["bodyweight"],
      notifications: "enabled",
    },
  },
];

// ——— Progress Helpers ————————————————————————————

const ONBOARDING_PROGRESS_KEY = "@peakpulse/onboarding-progress";
const ONBOARDING_COMPLETED_KEY = "@peakpulse/onboarding-completed";

export function getInitialProgress(): OnboardingProgress {
  return {
    currentStep: 0,
    completedSteps: [],
    skippedSteps: [],
    startedAt: new Date().toISOString(),
    answers: {},
  };
}

export async function saveOnboardingProgress(
  progress: OnboardingProgress,
): Promise<void> {
  try {
    await AsyncStorage.setItem(
      ONBOARDING_PROGRESS_KEY,
      JSON.stringify(progress),
    );
  } catch (error) {
    console.error("Failed to save onboarding progress:", error);
  }
}

export async function loadOnboardingProgress(): Promise<OnboardingProgress | null> {
  try {
    const raw = await AsyncStorage.getItem(ONBOARDING_PROGRESS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (error) {
    console.error("Failed to load onboarding progress:", error);
  }
  return null;
}

export async function markOnboardingComplete(
  progress: OnboardingProgress,
): Promise<void> {
  const completed = {
    ...progress,
    completedAt: new Date().toISOString(),
  };
  try {
    await Promise.all([
      AsyncStorage.setItem(ONBOARDING_COMPLETED_KEY, "true"),
      AsyncStorage.setItem(ONBOARDING_PROGRESS_KEY, JSON.stringify(completed)),
    ]);
  } catch (error) {
    console.error("Failed to mark onboarding complete:", error);
  }
}

export async function isOnboardingComplete(): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(ONBOARDING_COMPLETED_KEY);
    return val === "true";
  } catch {
    return false;
  }
}

export async function resetOnboarding(): Promise<void> {
  try {
    await Promise.all([
      AsyncStorage.removeItem(ONBOARDING_PROGRESS_KEY),
      AsyncStorage.removeItem(ONBOARDING_COMPLETED_KEY),
    ]);
  } catch (error) {
    console.error("Failed to reset onboarding:", error);
  }
}

// ——— Step Navigation ————————————————————————————

export function getStepProgress(currentStep: number): {
  percentage: number;
  label: string;
  stepsRemaining: number;
} {
  const total = ONBOARDING_STEPS.length;
  const percentage = Math.round(((currentStep + 1) / total) * 100);
  return {
    percentage,
    label: `Step ${currentStep + 1} of ${total}`,
    stepsRemaining: total - currentStep - 1,
  };
}

export function canSkipStep(stepIndex: number): boolean {
  return ONBOARDING_STEPS[stepIndex]?.skippable ?? false;
}

export function getEstimatedTimeRemaining(currentStep: number): number {
  return ONBOARDING_STEPS.slice(currentStep).reduce(
    (sum, step) => sum + step.estimatedSeconds,
    0,
  );
}

export function formatTimeEstimate(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} min`;
}

// ——— Quick-Start Application ————————————————————

export function applyQuickStart(
  template: QuickStartTemplate,
  progress: OnboardingProgress,
): OnboardingProgress {
  return {
    ...progress,
    answers: { ...progress.answers, ...template.defaults },
    completedSteps: ONBOARDING_STEPS.map((s) => s.id),
    currentStep: ONBOARDING_STEPS.length - 1,
  };
}

export function getRecommendedTemplates(
  partialAnswers: Record<string, any>,
): QuickStartTemplate[] {
  const goal = partialAnswers.goal;
  if (!goal) return QUICK_START_TEMPLATES;

  // Sort templates: matching goal first, then others
  return [...QUICK_START_TEMPLATES].sort((a, b) => {
    const aMatch = a.recommendedFor.includes(goal) ? 0 : 1;
    const bMatch = b.recommendedFor.includes(goal) ? 0 : 1;
    return aMatch - bMatch;
  });
}

// ——— Profile Builder ————————————————————————————

export function buildProfileFromAnswers(
  answers: Record<string, any>,
): Record<string, any> {
  return {
    name: answers.name ?? "",
    gender: answers.gender ?? "unspecified",
    age: answers.age ? parseInt(String(answers.age)) : undefined,
    heightCm: answers.heightCm ? parseFloat(String(answers.heightCm)) : undefined,
    weightKg: answers.weightKg ? parseFloat(String(answers.weightKg)) : undefined,
    fitnessLevel: answers.fitnessLevel ?? "beginner",
    goal: answers.goal ?? "general fitness",
    daysPerWeek: answers.daysPerWeek ? parseInt(String(answers.daysPerWeek)) : 3,
    workoutDuration: answers.workoutDuration ?? "medium",
    equipment: answers.equipment ?? ["bodyweight"],
    notificationsEnabled: answers.notifications === "enabled",
  };
}

// ——— Onboarding Analytics ———————————————————————

export interface OnboardingAnalytics {
  totalTimeSeconds: number;
  stepsCompleted: number;
  stepsSkipped: number;
  usedQuickStart: boolean;
  templateUsed?: string;
  dropOffStep?: string;
}

export function calculateAnalytics(
  progress: OnboardingProgress,
  templateUsed?: string,
): OnboardingAnalytics {
  const startTime = new Date(progress.startedAt).getTime();
  const endTime = progress.completedAt
    ? new Date(progress.completedAt).getTime()
    : Date.now();

  return {
    totalTimeSeconds: Math.round((endTime - startTime) / 1000),
    stepsCompleted: progress.completedSteps.length,
    stepsSkipped: progress.skippedSteps.length,
    usedQuickStart: !!templateUsed,
    templateUsed,
    dropOffStep: !progress.completedAt
      ? ONBOARDING_STEPS[progress.currentStep]?.id
      : undefined,
  };
}

// ——— Validation ——————————————————————————————————

export function validateStep(
  stepIndex: number,
  answers: Record<string, any>,
): { valid: boolean; errors: string[] } {
  const step = ONBOARDING_STEPS[stepIndex];
  if (!step) return { valid: false, errors: ["Invalid step"] };

  const errors: string[] = [];
  for (const field of step.fields) {
    if (field.required) {
      const val = answers[field.key];
      if (val === undefined || val === null || val === "") {
        errors.push(`${field.label} is required`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

export function getDefaultAnswers(): Record<string, any> {
  const defaults: Record<string, any> = {};
  for (const step of ONBOARDING_STEPS) {
    for (const field of step.fields) {
      if (field.defaultValue !== undefined) {
        defaults[field.key] = field.defaultValue;
      }
    }
  }
  return defaults;
}
