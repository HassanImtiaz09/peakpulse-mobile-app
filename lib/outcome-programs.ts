// lib/outcome-programs.ts
// Outcome-Based Programs for PeakPulse AI
// Structured multi-week fitness programs with milestones and progress tracking

import AsyncStorage from "@react-native-async-storage/async-storage";

// —— Types ——————————————————————————————————

export type ProgramGoal = "fat_loss" | "muscle_gain" | "strength" | "endurance" | "flexibility" | "general_fitness";
export type ProgramDifficulty = "beginner" | "intermediate" | "advanced";
export type WeekPhase = "foundation" | "build" | "peak" | "deload";
export type MilestoneStatus = "locked" | "available" | "completed";

export interface ProgramMilestone {
  id: string;
  weekNumber: number;
  title: string;
  description: string;
  criteria: MilestoneCriteria;
  reward: string;
  status: MilestoneStatus;
  completedDate?: string;
}

export interface MilestoneCriteria {
  type: "workouts_completed" | "streak_days" | "total_volume" | "body_metric" | "custom";
  target: number;
  current: number;
  unit: string;
}

export interface WeekPlan {
  weekNumber: number;
  phase: WeekPhase;
  theme: string;
  description: string;
  workoutsPerWeek: number;
  focusAreas: string[];
  intensityPercent: number;
  tips: string[];
}

export interface OutcomeProgram {
  id: string;
  name: string;
  goal: ProgramGoal;
  difficulty: ProgramDifficulty;
  durationWeeks: number;
  description: string;
  expectedOutcome: string;
  weekPlans: WeekPlan[];
  milestones: ProgramMilestone[];
  requirements: string[];
  tags: string[];
}

export interface UserProgramEnrollment {
  programId: string;
  startDate: string;
  currentWeek: number;
  completedWorkouts: number;
  totalWorkoutsPlanned: number;
  milestoneProgress: Record<string, MilestoneCriteria>;
  isActive: boolean;
  pausedDate?: string;
  completedDate?: string;
  weeklyLog: WeeklyProgress[];
}

export interface WeeklyProgress {
  weekNumber: number;
  workoutsCompleted: number;
  workoutsPlanned: number;
  adherencePercent: number;
  notes?: string;
  startDate: string;
  endDate: string;
}

export interface ProgramRecommendation {
  program: OutcomeProgram;
  matchScore: number;
  reasons: string[];
}

// —— Program Templates ———————————————————

export const PROGRAM_CATALOG: OutcomeProgram[] = [
  {
    id: "fat_loss_8week",
    name: "Lean Machine",
    goal: "fat_loss",
    difficulty: "beginner",
    durationWeeks: 8,
    description: "An 8-week progressive fat loss program combining strength training and HIIT to maximize calorie burn while preserving muscle mass.",
    expectedOutcome: "Lose 4-8 lbs of fat, increase daily energy, improve cardiovascular fitness",
    requirements: ["Bodyweight exercises", "30 min sessions", "3-4 days per week"],
    tags: ["weight loss", "beginner friendly", "no equipment needed"],
    weekPlans: [
      { weekNumber: 1, phase: "foundation", theme: "Building Habits", description: "Focus on movement consistency and learning proper form", workoutsPerWeek: 3, focusAreas: ["full body", "form"], intensityPercent: 50, tips: ["Start light", "Focus on form over speed", "Stay hydrated"] },
      { weekNumber: 2, phase: "foundation", theme: "Finding Your Rhythm", description: "Establish workout routine and increase movement quality", workoutsPerWeek: 3, focusAreas: ["full body", "cardio"], intensityPercent: 55, tips: ["Add 5 min walks post-workout", "Track your meals"] },
      { weekNumber: 3, phase: "build", theme: "Turning Up the Heat", description: "Introduce HIIT elements and increase workout density", workoutsPerWeek: 4, focusAreas: ["upper body", "HIIT"], intensityPercent: 65, tips: ["Push through discomfort", "Sleep 7+ hours"] },
      { weekNumber: 4, phase: "build", theme: "Progressive Overload", description: "Increase reps and reduce rest periods for higher calorie burn", workoutsPerWeek: 4, focusAreas: ["lower body", "core"], intensityPercent: 70, tips: ["Add resistance if possible", "Meal prep for the week"] },
      { weekNumber: 5, phase: "peak", theme: "Peak Performance", description: "Maximum intensity week with compound movements and HIIT circuits", workoutsPerWeek: 4, focusAreas: ["full body", "HIIT"], intensityPercent: 80, tips: ["Push your limits", "Recovery nutrition is key"] },
      { weekNumber: 6, phase: "peak", theme: "Fat Burning Zone", description: "High-intensity circuits targeting all major muscle groups", workoutsPerWeek: 4, focusAreas: ["circuits", "cardio"], intensityPercent: 85, tips: ["Stay consistent", "Hydrate more than usual"] },
      { weekNumber: 7, phase: "deload", theme: "Active Recovery", description: "Reduced intensity to allow adaptation and prevent burnout", workoutsPerWeek: 3, focusAreas: ["flexibility", "light cardio"], intensityPercent: 60, tips: ["Stretch daily", "Reflect on your progress"] },
      { weekNumber: 8, phase: "peak", theme: "Final Push", description: "Finish strong with your best effort across all workouts", workoutsPerWeek: 4, focusAreas: ["full body", "HIIT"], intensityPercent: 85, tips: ["Give it everything", "Celebrate your transformation"] },
    ],
    milestones: [
      { id: "fl_m1", weekNumber: 1, title: "First Steps", description: "Complete your first 3 workouts", criteria: { type: "workouts_completed", target: 3, current: 0, unit: "workouts" }, reward: "Unlocked: HIIT workouts", status: "available" },
      { id: "fl_m2", weekNumber: 2, title: "Consistency King", description: "Maintain a 7-day workout streak", criteria: { type: "streak_days", target: 7, current: 0, unit: "days" }, reward: "Unlocked: Advanced circuits", status: "locked" },
      { id: "fl_m3", weekNumber: 4, title: "Halfway Hero", description: "Complete 15 total workouts", criteria: { type: "workouts_completed", target: 15, current: 0, unit: "workouts" }, reward: "Unlocked: Custom workout builder", status: "locked" },
      { id: "fl_m4", weekNumber: 6, title: "Endurance Elite", description: "Complete 24 total workouts", criteria: { type: "workouts_completed", target: 24, current: 0, unit: "workouts" }, reward: "Unlocked: Peak performance plan", status: "locked" },
      { id: "fl_m5", weekNumber: 8, title: "Lean Machine", description: "Complete the full 8-week program", criteria: { type: "workouts_completed", target: 30, current: 0, unit: "workouts" }, reward: "Badge: Lean Machine Graduate", status: "locked" },
    ],
  },
  {
    id: "muscle_gain_12week",
    name: "Mass Builder",
    goal: "muscle_gain",
    difficulty: "intermediate",
    durationWeeks: 12,
    description: "A 12-week hypertrophy program designed to maximize muscle growth through progressive overload and strategic volume increases.",
    expectedOutcome: "Gain 4-8 lbs of lean muscle, increase strength by 15-20%, improved physique",
    requirements: ["Dumbbells or gym access", "45 min sessions", "4-5 days per week"],
    tags: ["muscle building", "hypertrophy", "gym"],
    weekPlans: [
      { weekNumber: 1, phase: "foundation", theme: "Baseline Testing", description: "Establish starting weights and rep maxes for all key lifts", workoutsPerWeek: 4, focusAreas: ["full body", "form"], intensityPercent: 60, tips: ["Record all weights", "Focus on mind-muscle connection"] },
      { weekNumber: 2, phase: "foundation", theme: "Volume Introduction", description: "Begin structured hypertrophy training with moderate volume", workoutsPerWeek: 4, focusAreas: ["push", "pull", "legs"], intensityPercent: 65, tips: ["Eat in a slight surplus", "Get 8 hours sleep"] },
      { weekNumber: 3, phase: "build", theme: "Progressive Loading", description: "Increase weights by 5% across all exercises", workoutsPerWeek: 4, focusAreas: ["chest", "back", "legs"], intensityPercent: 70, tips: ["Protein with every meal", "Control the eccentric"] },
      { weekNumber: 4, phase: "deload", theme: "Recovery Week", description: "Reduced volume to allow muscles to recover and grow", workoutsPerWeek: 3, focusAreas: ["light full body"], intensityPercent: 50, tips: ["Extra sleep", "Foam roll daily"] },
      { weekNumber: 5, phase: "build", theme: "Volume Wave 2", description: "Higher volume block with increased sets per muscle group", workoutsPerWeek: 5, focusAreas: ["push", "pull", "legs", "arms"], intensityPercent: 75, tips: ["Track progressive overload", "Eat enough carbs"] },
      { weekNumber: 6, phase: "build", theme: "Intensity Focus", description: "Heavy compound lifts with strategic isolation work", workoutsPerWeek: 5, focusAreas: ["compounds", "isolation"], intensityPercent: 80, tips: ["Use proper warm-up sets", "Stay hydrated during training"] },
      { weekNumber: 7, phase: "build", theme: "Peak Volume", description: "Highest training volume of the program", workoutsPerWeek: 5, focusAreas: ["push", "pull", "legs"], intensityPercent: 85, tips: ["Push through plateaus", "Nutrition is non-negotiable"] },
      { weekNumber: 8, phase: "deload", theme: "Strategic Recovery", description: "Deload week for supercompensation", workoutsPerWeek: 3, focusAreas: ["light training", "mobility"], intensityPercent: 55, tips: ["Trust the process", "Active recovery walks"] },
      { weekNumber: 9, phase: "peak", theme: "Strength Phase", description: "Lower reps, heavier weights to build peak strength", workoutsPerWeek: 4, focusAreas: ["heavy compounds"], intensityPercent: 90, tips: ["Longer rest periods", "Focus on the big lifts"] },
      { weekNumber: 10, phase: "peak", theme: "Peak Hypertrophy", description: "Optimal combination of heavy and moderate work", workoutsPerWeek: 5, focusAreas: ["push", "pull", "legs"], intensityPercent: 85, tips: ["Mind-muscle connection", "Every rep counts"] },
      { weekNumber: 11, phase: "peak", theme: "Final Surge", description: "Maximum effort training across all muscle groups", workoutsPerWeek: 5, focusAreas: ["full body", "weak points"], intensityPercent: 90, tips: ["Leave nothing on the table", "Sleep is your secret weapon"] },
      { weekNumber: 12, phase: "deload", theme: "Test & Celebrate", description: "Retest your maxes and see how far you have come", workoutsPerWeek: 4, focusAreas: ["testing", "light training"], intensityPercent: 70, tips: ["Compare to week 1", "Plan your next program"] },
    ],
    milestones: [
      { id: "mg_m1", weekNumber: 1, title: "Foundation Set", description: "Complete baseline testing for all lifts", criteria: { type: "workouts_completed", target: 4, current: 0, unit: "workouts" }, reward: "Unlocked: Progressive overload tracker", status: "available" },
      { id: "mg_m2", weekNumber: 4, title: "First Cycle Done", description: "Complete the first 4-week mesocycle", criteria: { type: "workouts_completed", target: 15, current: 0, unit: "workouts" }, reward: "Unlocked: Advanced split routines", status: "locked" },
      { id: "mg_m3", weekNumber: 8, title: "Volume Veteran", description: "Complete 35 total workouts", criteria: { type: "workouts_completed", target: 35, current: 0, unit: "workouts" }, reward: "Badge: Volume Veteran", status: "locked" },
      { id: "mg_m4", weekNumber: 12, title: "Mass Builder", description: "Complete the full 12-week program", criteria: { type: "workouts_completed", target: 52, current: 0, unit: "workouts" }, reward: "Badge: Mass Builder Graduate", status: "locked" },
    ],
  },
  {
    id: "strength_6week",
    name: "Power Foundations",
    goal: "strength",
    difficulty: "beginner",
    durationWeeks: 6,
    description: "A 6-week strength-focused program building foundational strength through progressive compound movements.",
    expectedOutcome: "Increase strength by 20-30% on key lifts, improved movement patterns, better posture",
    requirements: ["Bodyweight + optional dumbbells", "30-40 min sessions", "3 days per week"],
    tags: ["strength", "beginner", "compound movements"],
    weekPlans: [
      { weekNumber: 1, phase: "foundation", theme: "Learn the Lifts", description: "Master form on squat, push-up, row, and plank variations", workoutsPerWeek: 3, focusAreas: ["movement patterns"], intensityPercent: 50, tips: ["Quality over quantity", "Film yourself for form check"] },
      { weekNumber: 2, phase: "foundation", theme: "Building the Base", description: "Add volume while maintaining perfect form", workoutsPerWeek: 3, focusAreas: ["full body strength"], intensityPercent: 60, tips: ["Rest 2-3 min between sets", "Eat adequate protein"] },
      { weekNumber: 3, phase: "build", theme: "Loading Up", description: "Increase resistance and challenge your limits", workoutsPerWeek: 3, focusAreas: ["progressive overload"], intensityPercent: 70, tips: ["Add weight or harder variations", "Track every set"] },
      { weekNumber: 4, phase: "build", theme: "Strength Gains", description: "Push past previous limits with structured overload", workoutsPerWeek: 3, focusAreas: ["compounds", "core"], intensityPercent: 75, tips: ["Longer rest for heavy sets", "Visualize success"] },
      { weekNumber: 5, phase: "peak", theme: "Test Week", description: "Test your new strength levels on all key movements", workoutsPerWeek: 3, focusAreas: ["testing", "maxes"], intensityPercent: 85, tips: ["Warm up thoroughly", "Trust your training"] },
      { weekNumber: 6, phase: "deload", theme: "Solidify & Plan", description: "Light training to lock in gains and plan next steps", workoutsPerWeek: 2, focusAreas: ["light training", "mobility"], intensityPercent: 50, tips: ["Compare to week 1 numbers", "Choose your next program"] },
    ],
    milestones: [
      { id: "sf_m1", weekNumber: 1, title: "Form Master", description: "Complete 3 workouts with proper form focus", criteria: { type: "workouts_completed", target: 3, current: 0, unit: "workouts" }, reward: "Unlocked: Progressive loading", status: "available" },
      { id: "sf_m2", weekNumber: 3, title: "Getting Stronger", description: "Complete 9 total workouts", criteria: { type: "workouts_completed", target: 9, current: 0, unit: "workouts" }, reward: "Unlocked: Strength testing protocol", status: "locked" },
      { id: "sf_m3", weekNumber: 6, title: "Power Foundations", description: "Complete the full 6-week program", criteria: { type: "workouts_completed", target: 17, current: 0, unit: "workouts" }, reward: "Badge: Power Foundations Graduate", status: "locked" },
    ],
  },
  {
    id: "endurance_8week",
    name: "Cardio Crusher",
    goal: "endurance",
    difficulty: "intermediate",
    durationWeeks: 8,
    description: "An 8-week cardiovascular endurance program combining steady-state and interval training to dramatically improve stamina.",
    expectedOutcome: "Double workout endurance, improved resting heart rate, better recovery between sets",
    requirements: ["Bodyweight exercises", "30-45 min sessions", "4-5 days per week"],
    tags: ["cardio", "endurance", "stamina", "HIIT"],
    weekPlans: [
      { weekNumber: 1, phase: "foundation", theme: "Aerobic Base", description: "Build aerobic foundation with steady-state training", workoutsPerWeek: 4, focusAreas: ["light cardio", "movement"], intensityPercent: 50, tips: ["Conversational pace", "Build the habit first"] },
      { weekNumber: 2, phase: "foundation", theme: "Interval Intro", description: "Introduce basic interval training alongside steady-state", workoutsPerWeek: 4, focusAreas: ["intervals", "steady state"], intensityPercent: 60, tips: ["30s work / 60s rest to start", "Monitor heart rate"] },
      { weekNumber: 3, phase: "build", theme: "Pushing Boundaries", description: "Increase interval intensity and duration", workoutsPerWeek: 4, focusAreas: ["HIIT", "tempo"], intensityPercent: 70, tips: ["Push slightly past comfort", "Breathe rhythmically"] },
      { weekNumber: 4, phase: "build", theme: "Endurance Builder", description: "Longer workout sessions with sustained effort", workoutsPerWeek: 5, focusAreas: ["sustained effort", "circuits"], intensityPercent: 75, tips: ["Mental toughness matters", "Fuel properly pre-workout"] },
      { weekNumber: 5, phase: "peak", theme: "Cardio Peak", description: "Maximum cardiovascular challenge with varied training", workoutsPerWeek: 5, focusAreas: ["mixed modality"], intensityPercent: 85, tips: ["Embrace the burn", "Recovery drinks help"] },
      { weekNumber: 6, phase: "peak", theme: "Stamina Test", description: "Extended work periods with minimal rest", workoutsPerWeek: 5, focusAreas: ["endurance circuits"], intensityPercent: 85, tips: ["You're tougher than you think", "Pace yourself wisely"] },
      { weekNumber: 7, phase: "deload", theme: "Recovery & Adapt", description: "Lighter week to allow cardiovascular adaptation", workoutsPerWeek: 3, focusAreas: ["easy cardio", "flexibility"], intensityPercent: 55, tips: ["Active recovery only", "Reflect on improvements"] },
      { weekNumber: 8, phase: "peak", theme: "Final Challenge", description: "Ultimate endurance test to showcase your progress", workoutsPerWeek: 4, focusAreas: ["endurance test"], intensityPercent: 90, tips: ["All out effort", "You've earned this"] },
    ],
    milestones: [
      { id: "cc_m1", weekNumber: 1, title: "Cardio Kickoff", description: "Complete 4 workouts in the first week", criteria: { type: "workouts_completed", target: 4, current: 0, unit: "workouts" }, reward: "Unlocked: Interval training", status: "available" },
      { id: "cc_m2", weekNumber: 4, title: "Endurance Builder", description: "Complete 17 total workouts", criteria: { type: "workouts_completed", target: 17, current: 0, unit: "workouts" }, reward: "Unlocked: Advanced HIIT protocols", status: "locked" },
      { id: "cc_m3", weekNumber: 8, title: "Cardio Crusher", description: "Complete the full 8-week program", criteria: { type: "workouts_completed", target: 34, current: 0, unit: "workouts" }, reward: "Badge: Cardio Crusher Graduate", status: "locked" },
    ],
  },
];

// —— Program Management ——————————————————

const ENROLLMENT_KEY = "peakpulse_program_enrollment";
const PROGRAM_HISTORY_KEY = "peakpulse_program_history";

export function getProgramById(id: string): OutcomeProgram | undefined {
  return PROGRAM_CATALOG.find(p => p.id === id);
}

export function getProgramsByGoal(goal: ProgramGoal): OutcomeProgram[] {
  return PROGRAM_CATALOG.filter(p => p.goal === goal);
}

export function getRecommendedPrograms(
  goals: string[],
  fitnessLevel: ProgramDifficulty,
  daysPerWeek: number,
): ProgramRecommendation[] {
  const goalMap: Record<string, ProgramGoal> = {
    lose_weight: "fat_loss",
    fat_loss: "fat_loss",
    build_muscle: "muscle_gain",
    muscle_gain: "muscle_gain",
    get_stronger: "strength",
    strength: "strength",
    improve_endurance: "endurance",
    endurance: "endurance",
    flexibility: "flexibility",
    general_fitness: "general_fitness",
  };

  return PROGRAM_CATALOG.map(program => {
    let score = 0;
    const reasons: string[] = [];

    // Goal match
    const matchedGoal = goals.some(g => goalMap[g] === program.goal);
    if (matchedGoal) {
      score += 40;
      reasons.push(`Matches your ${program.goal.replace("_", " ")} goal`);
    }

    // Difficulty match
    if (program.difficulty === fitnessLevel) {
      score += 25;
      reasons.push("Perfect for your fitness level");
    } else if (
      (fitnessLevel === "beginner" && program.difficulty === "intermediate") ||
      (fitnessLevel === "intermediate" && program.difficulty === "advanced")
    ) {
      score += 10;
      reasons.push("A good challenge for your level");
    }

    // Schedule fit
    const avgWorkoutsPerWeek = program.weekPlans.reduce((sum, w) => sum + w.workoutsPerWeek, 0) / program.weekPlans.length;
    if (Math.abs(avgWorkoutsPerWeek - daysPerWeek) <= 1) {
      score += 20;
      reasons.push(`Fits your ${daysPerWeek} days/week schedule`);
    }

    // Duration preference (shorter programs score slightly higher for beginners)
    if (fitnessLevel === "beginner" && program.durationWeeks <= 8) {
      score += 10;
      reasons.push("Great program length for getting started");
    }

    return { program, matchScore: score, reasons };
  })
    .filter(r => r.matchScore > 0)
    .sort((a, b) => b.matchScore - a.matchScore);
}

// —— Enrollment & Progress ———————————————

export async function enrollInProgram(programId: string): Promise<UserProgramEnrollment> {
  const program = getProgramById(programId);
  if (!program) throw new Error(`Program ${programId} not found`);

  const totalWorkouts = program.weekPlans.reduce((sum, w) => sum + w.workoutsPerWeek, 0);

  const enrollment: UserProgramEnrollment = {
    programId,
    startDate: new Date().toISOString(),
    currentWeek: 1,
    completedWorkouts: 0,
    totalWorkoutsPlanned: totalWorkouts,
    milestoneProgress: {},
    isActive: true,
    weeklyLog: [],
  };

  // Initialize milestone progress
  for (const milestone of program.milestones) {
    enrollment.milestoneProgress[milestone.id] = { ...milestone.criteria };
  }

  await AsyncStorage.setItem(ENROLLMENT_KEY, JSON.stringify(enrollment));
  return enrollment;
}

export async function getActiveEnrollment(): Promise<UserProgramEnrollment | null> {
  try {
    const data = await AsyncStorage.getItem(ENROLLMENT_KEY);
    if (!data) return null;
    const enrollment: UserProgramEnrollment = JSON.parse(data);
    return enrollment.isActive ? enrollment : null;
  } catch {
    return null;
  }
}

export async function logWorkoutToProgram(): Promise<UserProgramEnrollment | null> {
  const enrollment = await getActiveEnrollment();
  if (!enrollment) return null;

  enrollment.completedWorkouts += 1;

  // Update milestone progress
  for (const [milestoneId, criteria] of Object.entries(enrollment.milestoneProgress)) {
    if (criteria.type === "workouts_completed") {
      criteria.current = enrollment.completedWorkouts;
    }
  }

  // Check if we need to advance the week
  const program = getProgramById(enrollment.programId);
  if (program) {
    const daysSinceStart = Math.floor(
      (Date.now() - new Date(enrollment.startDate).getTime()) / (1000 * 60 * 60 * 24)
    );
    enrollment.currentWeek = Math.min(
      program.durationWeeks,
      Math.floor(daysSinceStart / 7) + 1
    );
  }

  await AsyncStorage.setItem(ENROLLMENT_KEY, JSON.stringify(enrollment));
  return enrollment;
}

export async function completeProgram(): Promise<void> {
  const enrollment = await getActiveEnrollment();
  if (!enrollment) return;

  enrollment.isActive = false;
  enrollment.completedDate = new Date().toISOString();

  // Save to history
  const history = await getProgramHistory();
  history.push(enrollment);
  await AsyncStorage.setItem(PROGRAM_HISTORY_KEY, JSON.stringify(history));
  await AsyncStorage.setItem(ENROLLMENT_KEY, JSON.stringify(enrollment));
}

export async function pauseProgram(): Promise<void> {
  const enrollment = await getActiveEnrollment();
  if (!enrollment) return;

  enrollment.isActive = false;
  enrollment.pausedDate = new Date().toISOString();
  await AsyncStorage.setItem(ENROLLMENT_KEY, JSON.stringify(enrollment));
}

export async function resumeProgram(): Promise<void> {
  try {
    const data = await AsyncStorage.getItem(ENROLLMENT_KEY);
    if (!data) return;
    const enrollment: UserProgramEnrollment = JSON.parse(data);
    enrollment.isActive = true;
    enrollment.pausedDate = undefined;
    await AsyncStorage.setItem(ENROLLMENT_KEY, JSON.stringify(enrollment));
  } catch {
    // ignore
  }
}

export async function getProgramHistory(): Promise<UserProgramEnrollment[]> {
  try {
    const data = await AsyncStorage.getItem(PROGRAM_HISTORY_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

// —— Milestone Checking —————————————————

export function checkMilestones(
  program: OutcomeProgram,
  enrollment: UserProgramEnrollment,
): ProgramMilestone[] {
  const updatedMilestones = program.milestones.map(milestone => {
    const progress = enrollment.milestoneProgress[milestone.id];
    if (!progress) return milestone;

    const updated = { ...milestone };

    // Check if milestone should be available
    if (updated.status === "locked" && enrollment.currentWeek >= updated.weekNumber) {
      const previousMilestones = program.milestones.filter(m => m.weekNumber < updated.weekNumber);
      const allPreviousComplete = previousMilestones.every(m => {
        const p = enrollment.milestoneProgress[m.id];
        return p && p.current >= p.target;
      });
      if (allPreviousComplete) {
        updated.status = "available";
      }
    }

    // Check if milestone is completed
    if (updated.status === "available" && progress.current >= progress.target) {
      updated.status = "completed";
      updated.completedDate = new Date().toISOString();
    }

    return updated;
  });

  return updatedMilestones;
}

export function getNextMilestone(
  program: OutcomeProgram,
  enrollment: UserProgramEnrollment,
): ProgramMilestone | null {
  const milestones = checkMilestones(program, enrollment);
  return milestones.find(m => m.status === "available") || null;
}

// —— Progress Analytics —————————————————

export function calculateProgramProgress(enrollment: UserProgramEnrollment): {
  overallPercent: number;
  weekPercent: number;
  milestonesCompleted: number;
  milestonesTotal: number;
  adherencePercent: number;
  projectedCompletion: string;
  onTrack: boolean;
} {
  const program = getProgramById(enrollment.programId);
  if (!program) {
    return {
      overallPercent: 0,
      weekPercent: 0,
      milestonesCompleted: 0,
      milestonesTotal: 0,
      adherencePercent: 0,
      projectedCompletion: "Unknown",
      onTrack: false,
    };
  }

  const overallPercent = Math.round((enrollment.completedWorkouts / enrollment.totalWorkoutsPlanned) * 100);
  const weekPercent = Math.round((enrollment.currentWeek / program.durationWeeks) * 100);

  const milestonesCompleted = Object.values(enrollment.milestoneProgress).filter(
    m => m.current >= m.target
  ).length;
  const milestonesTotal = program.milestones.length;

  // Calculate adherence
  const expectedWorkouts = program.weekPlans
    .slice(0, enrollment.currentWeek)
    .reduce((sum, w) => sum + w.workoutsPerWeek, 0);
  const adherencePercent = expectedWorkouts > 0
    ? Math.round((enrollment.completedWorkouts / expectedWorkouts) * 100)
    : 100;

  // Project completion
  const daysElapsed = Math.max(1, Math.floor(
    (Date.now() - new Date(enrollment.startDate).getTime()) / (1000 * 60 * 60 * 24)
  ));
  const workoutsPerDay = enrollment.completedWorkouts / daysElapsed;
  const remainingWorkouts = enrollment.totalWorkoutsPlanned - enrollment.completedWorkouts;
  const daysRemaining = workoutsPerDay > 0 ? Math.ceil(remainingWorkouts / workoutsPerDay) : 999;
  const projectedDate = new Date(Date.now() + daysRemaining * 24 * 60 * 60 * 1000);
  const projectedCompletion = projectedDate.toLocaleDateString();

  const onTrack = adherencePercent >= 80;

  return {
    overallPercent: Math.min(100, overallPercent),
    weekPercent: Math.min(100, weekPercent),
    milestonesCompleted,
    milestonesTotal,
    adherencePercent: Math.min(100, adherencePercent),
    projectedCompletion,
    onTrack,
  };
}

export function getCurrentWeekPlan(enrollment: UserProgramEnrollment): WeekPlan | null {
  const program = getProgramById(enrollment.programId);
  if (!program) return null;
  return program.weekPlans.find(w => w.weekNumber === enrollment.currentWeek) || null;
}

export function getProgramSummary(program: OutcomeProgram): string {
  const totalWorkouts = program.weekPlans.reduce((sum, w) => sum + w.workoutsPerWeek, 0);
  return `${program.name}: ${program.durationWeeks}-week ${program.goal.replace("_", " ")} program. ${totalWorkouts} total workouts, ${program.milestones.length} milestones. ${program.expectedOutcome}`;
}

