// lib/user-profile-state.ts
// PeakPulse AI — Unified User Profile State
// Connects fitness level, goals, streak data, program enrollment,
// coach preferences, subscription tier, and onboarding state
// into a single cohesive profile used across the app

import AsyncStorage from "@react-native-async-storage/async-storage";

// —— Types ——————————————————————————————————

export type FitnessLevel = "beginner" | "intermediate" | "advanced";
export type FitnessGoal = "lose_weight" | "build_muscle" | "get_stronger" | "improve_endurance" | "stay_active";
export type EquipmentAccess = "none" | "minimal" | "full_gym";
export type WorkoutFrequency = 2 | 3 | 4 | 5 | 6;
export type CoachPersonality = "motivator" | "drill_sergeant" | "zen_master" | "buddy";

export interface UserProfile {
  // Identity
  id: string;
  displayName: string;
  email: string | null;
  isGuest: boolean;
  createdAt: string;
  lastActiveAt: string;

  // Subscription
  tier: "free" | "starter" | "pro" | "elite";
  tierStartDate: string | null;
  trialEndDate: string | null;
  isInTrial: boolean;

  // Fitness Profile
  fitnessLevel: FitnessLevel;
  primaryGoal: FitnessGoal;
  secondaryGoals: FitnessGoal[];
  equipment: EquipmentAccess;
  preferredFrequency: WorkoutFrequency;
  preferredWorkoutDays: number[]; // 0=Sun, 1=Mon, etc.
  preferredDuration: number; // minutes

  // Physical Data (optional)
  age: number | null;
  height: number | null; // cm
  weight: number | null; // kg
  targetWeight: number | null; // kg

  // Coach Preferences
  coachPersonality: CoachPersonality | null;
  coachMuted: boolean;
  notificationsEnabled: boolean;
  reminderTime: string | null; // HH:mm format

  // Progress Snapshot
  currentStreak: number;
  longestStreak: number;
  totalWorkouts: number;
  totalMinutes: number;
  currentLevel: number;
  totalXP: number;

  // Program State
  activeProgramId: string | null;
  completedProgramIds: string[];

  // Onboarding
  onboardingComplete: boolean;
  onboardingStep: number;
  hasSeenWelcomeTour: boolean;
  hasSetGoal: boolean;
  hasCompletedFirstWorkout: boolean;
}

export interface ProfileUpdate {
  [key: string]: any;
}

export interface OnboardingProgress {
  currentStep: number;
  totalSteps: number;
  stepsCompleted: string[];
  nextStep: string | null;
  percentComplete: number;
}

// —— Storage ——————————————————————————————

const PROFILE_KEY = "peakpulse_user_profile";

function createDefaultProfile(): UserProfile {
  return {
    id: `guest_${Date.now()}`,
    displayName: "Athlete",
    email: null,
    isGuest: true,
    createdAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString(),

    tier: "free",
    tierStartDate: null,
    trialEndDate: null,
    isInTrial: false,

    fitnessLevel: "beginner",
    primaryGoal: "stay_active",
    secondaryGoals: [],
    equipment: "none",
    preferredFrequency: 3,
    preferredWorkoutDays: [1, 3, 5], // Mon, Wed, Fri
    preferredDuration: 30,

    age: null,
    height: null,
    weight: null,
    targetWeight: null,

    coachPersonality: null,
    coachMuted: false,
    notificationsEnabled: true,
    reminderTime: "08:00",

    currentStreak: 0,
    longestStreak: 0,
    totalWorkouts: 0,
    totalMinutes: 0,
    currentLevel: 1,
    totalXP: 0,

    activeProgramId: null,
    completedProgramIds: [],

    onboardingComplete: false,
    onboardingStep: 0,
    hasSeenWelcomeTour: false,
    hasSetGoal: false,
    hasCompletedFirstWorkout: false,
  };
}

// —— Core CRUD ———————————————————————————

export async function getUserProfile(): Promise<UserProfile> {
  try {
    const data = await AsyncStorage.getItem(PROFILE_KEY);
    if (data) {
      const profile = JSON.parse(data);
      // Merge with defaults to handle new fields added in updates
      return { ...createDefaultProfile(), ...profile };
    }
  } catch {
    // ignore
  }
  return createDefaultProfile();
}

export async function saveUserProfile(profile: UserProfile): Promise<void> {
  profile.lastActiveAt = new Date().toISOString();
  await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export async function updateUserProfile(updates: ProfileUpdate): Promise<UserProfile> {
  const profile = await getUserProfile();
  const updated = { ...profile, ...updates, lastActiveAt: new Date().toISOString() };
  await saveUserProfile(updated);
  return updated;
}

export async function resetUserProfile(): Promise<UserProfile> {
  const fresh = createDefaultProfile();
  await saveUserProfile(fresh);
  return fresh;
}

// —— Onboarding ————————————————————————————

const ONBOARDING_STEPS = [
  { id: "welcome", label: "Welcome Tour" },
  { id: "set_goal", label: "Set Your Goal" },
  { id: "fitness_level", label: "Fitness Level" },
  { id: "equipment", label: "Equipment Check" },
  { id: "schedule", label: "Set Schedule" },
  { id: "coach", label: "Choose Coach" },
  { id: "first_plan", label: "Generate Plan" },
];

export function getOnboardingProgress(profile: UserProfile): OnboardingProgress {
  const stepsCompleted: string[] = [];
  if (profile.hasSeenWelcomeTour) stepsCompleted.push("welcome");
  if (profile.hasSetGoal) stepsCompleted.push("set_goal");
  if (profile.fitnessLevel !== "beginner" || profile.onboardingStep > 2) stepsCompleted.push("fitness_level");
  if (profile.equipment !== "none" || profile.onboardingStep > 3) stepsCompleted.push("equipment");
  if (profile.preferredWorkoutDays.length > 0 && profile.onboardingStep > 4) stepsCompleted.push("schedule");
  if (profile.coachPersonality !== null) stepsCompleted.push("coach");
  if (profile.hasCompletedFirstWorkout) stepsCompleted.push("first_plan");

  const totalSteps = ONBOARDING_STEPS.length;
  const currentStep = stepsCompleted.length;
  const nextStepObj = ONBOARDING_STEPS.find(s => !stepsCompleted.includes(s.id));

  return {
    currentStep,
    totalSteps,
    stepsCompleted,
    nextStep: nextStepObj ? nextStepObj.id : null,
    percentComplete: Math.round((currentStep / totalSteps) * 100),
  };
}

export async function completeOnboardingStep(stepId: string): Promise<UserProfile> {
  const profile = await getUserProfile();

  switch (stepId) {
    case "welcome":
      profile.hasSeenWelcomeTour = true;
      break;
    case "set_goal":
      profile.hasSetGoal = true;
      break;
    case "first_plan":
      profile.hasCompletedFirstWorkout = true;
      break;
  }

  profile.onboardingStep = Math.max(profile.onboardingStep, ONBOARDING_STEPS.findIndex(s => s.id === stepId) + 1);

  const progress = getOnboardingProgress(profile);
  if (progress.percentComplete === 100) {
    profile.onboardingComplete = true;
  }

  await saveUserProfile(profile);
  return profile;
}

// —— Fitness Profile Helpers ——————————————

export async function setFitnessGoal(primary: FitnessGoal, secondary?: FitnessGoal[]): Promise<UserProfile> {
  return updateUserProfile({
    primaryGoal: primary,
    secondaryGoals: secondary || [],
    hasSetGoal: true,
  });
}

export async function setFitnessLevel(level: FitnessLevel): Promise<UserProfile> {
  return updateUserProfile({ fitnessLevel: level });
}

export async function setEquipment(equipment: EquipmentAccess): Promise<UserProfile> {
  return updateUserProfile({ equipment });
}

export async function setSchedule(
  frequency: WorkoutFrequency,
  days: number[],
  durationMinutes: number,
): Promise<UserProfile> {
  return updateUserProfile({
    preferredFrequency: frequency,
    preferredWorkoutDays: days,
    preferredDuration: durationMinutes,
  });
}

export async function setCoachPersonality(personality: CoachPersonality): Promise<UserProfile> {
  return updateUserProfile({ coachPersonality: personality });
}

// —— Subscription Helpers —————————————————

export async function upgradeTier(newTier: "starter" | "pro" | "elite"): Promise<UserProfile> {
  return updateUserProfile({
    tier: newTier,
    tierStartDate: new Date().toISOString(),
    isInTrial: false,
  });
}

export async function startTrial(tier: "starter" | "pro" | "elite", trialDays: number): Promise<UserProfile> {
  const trialEnd = new Date();
  trialEnd.setDate(trialEnd.getDate() + trialDays);
  return updateUserProfile({
    tier,
    tierStartDate: new Date().toISOString(),
    trialEndDate: trialEnd.toISOString(),
    isInTrial: true,
  });
}

export async function checkTrialExpiry(): Promise<{ expired: boolean; daysRemaining: number }> {
  const profile = await getUserProfile();
  if (!profile.isInTrial || !profile.trialEndDate) {
    return { expired: false, daysRemaining: 0 };
  }

  const now = Date.now();
  const end = new Date(profile.trialEndDate).getTime();
  const daysRemaining = Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)));

  if (daysRemaining <= 0) {
    // Trial expired — downgrade to free
    await updateUserProfile({ tier: "free", isInTrial: false });
    return { expired: true, daysRemaining: 0 };
  }

  return { expired: false, daysRemaining };
}

// —— Progress Tracking ———————————————————

export async function recordWorkoutInProfile(durationMinutes: number): Promise<UserProfile> {
  const profile = await getUserProfile();
  profile.totalWorkouts += 1;
  profile.totalMinutes += durationMinutes;
  if (!profile.hasCompletedFirstWorkout) {
    profile.hasCompletedFirstWorkout = true;
  }
  await saveUserProfile(profile);
  return profile;
}

export async function syncStreakToProfile(currentStreak: number, longestStreak: number): Promise<void> {
  const profile = await getUserProfile();
  profile.currentStreak = currentStreak;
  if (longestStreak > profile.longestStreak) {
    profile.longestStreak = longestStreak;
  }
  await saveUserProfile(profile);
}

export async function syncXPToProfile(totalXP: number, level: number): Promise<void> {
  const profile = await getUserProfile();
  profile.totalXP = totalXP;
  profile.currentLevel = level;
  await saveUserProfile(profile);
}

// —— Profile Summary ————————————————————

export function getProfileSummary(profile: UserProfile): string {
  const goalLabel = profile.primaryGoal.replace(/_/g, " ");
  const tierLabel = profile.tier.charAt(0).toUpperCase() + profile.tier.slice(1);
  const streak = profile.currentStreak > 0 ? `${profile.currentStreak}-day streak` : "No active streak";

  return `${profile.displayName} | ${tierLabel} | Level ${profile.currentLevel} | ${goalLabel} | ${streak} | ${profile.totalWorkouts} workouts`;
}

export function getMotivationalInsight(profile: UserProfile): string {
  if (profile.totalWorkouts === 0) {
    return "Ready to start your fitness journey? Let's generate your first plan!";
  }
  if (profile.currentStreak >= 7) {
    return `${profile.currentStreak}-day streak! You're in the top 10% of consistent users. Keep it up!`;
  }
  if (profile.totalWorkouts >= 10 && profile.currentStreak === 0) {
    return "You've done great work before — let's restart that streak today!";
  }
  if (profile.totalWorkouts < 5) {
    return `${profile.totalWorkouts} workouts down! Hit 5 to unlock your first achievement.`;
  }
  return `${profile.totalWorkouts} workouts completed. Every session makes you stronger!`;
}

// —— Data Export (for Pro+ users) ————————

export async function exportProfileData(): Promise<Record<string, any>> {
  const profile = await getUserProfile();
  return {
    exportDate: new Date().toISOString(),
    profile: {
      displayName: profile.displayName,
      fitnessLevel: profile.fitnessLevel,
      primaryGoal: profile.primaryGoal,
      equipment: profile.equipment,
      preferredFrequency: profile.preferredFrequency,
    },
    stats: {
      totalWorkouts: profile.totalWorkouts,
      totalMinutes: profile.totalMinutes,
      currentStreak: profile.currentStreak,
      longestStreak: profile.longestStreak,
      currentLevel: profile.currentLevel,
      totalXP: profile.totalXP,
    },
    programs: {
      active: profile.activeProgramId,
      completed: profile.completedProgramIds,
    },
  };
}
