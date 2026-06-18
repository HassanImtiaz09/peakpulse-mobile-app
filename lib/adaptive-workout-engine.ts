// lib/adaptive-workout-engine.ts
// Adaptive Workout Engine for PeakPulse AI
// Generates personalized workouts that adapt to user performance and recovery

import AsyncStorage from "@react-native-async-storage/async-storage";

// —— Types ——————————————————————————————————

export type MuscleGroup = "chest" | "back" | "legs" | "shoulders" | "core" | "arms" | "glutes" | "hamstrings" | "quads" | "triceps" | "biceps";
export type DifficultyLevel = "beginner" | "intermediate" | "advanced" | "elite";
export type WorkoutType = "strength" | "hypertrophy" | "endurance" | "hiit" | "flexibility";

export interface Exercise {
  id: string;
  name: string;
  muscleGroups: MuscleGroup[];
  type: WorkoutType;
  difficulty: DifficultyLevel;
  equipment: string[];
  baseReps: number;
  baseSets: number;
  restSeconds: number;
  formCues: string[];
  alternatives: string[];
}

export interface WorkoutSet {
  exerciseId: string;
  exerciseName: string;
  sets: number;
  reps: number;
  restSeconds: number;
  weight?: number;
  formCues: string[];
  isWarmup?: boolean;
}

export interface AdaptiveWorkout {
  id: string;
  date: string;
  type: WorkoutType;
  difficulty: DifficultyLevel;
  targetMuscles: MuscleGroup[];
  estimatedDuration: number;
  exercises: WorkoutSet[];
  warmup: WorkoutSet[];
  cooldown: string[];
  adaptationNotes: string[];
}

export interface PerformanceLog {
  workoutId: string;
  date: string;
  exerciseId: string;
  plannedSets: number;
  completedSets: number;
  plannedReps: number;
  completedReps: number;
  weight?: number;
  rpe: number; // Rate of Perceived Exertion 1-10
  notes?: string;
}

export interface UserFitnessProfile {
  level: DifficultyLevel;
  preferredTypes: WorkoutType[];
  availableEquipment: string[];
  workoutDuration: number; // minutes
  daysPerWeek: number;
  injuries: string[];
  goals: string[];
  lastWorkoutDate?: string;
  totalWorkouts: number;
  streakDays: number;
}

export interface RecoveryStatus {
  muscleGroup: MuscleGroup;
  lastWorked: string;
  hoursAgo: number;
  recoveryPercent: number;
  recommendation: "ready" | "light_ok" | "rest";
}

// —— Exercise Database ——————————————————————

export const EXERCISE_DB: Exercise[] = [
  // Chest
  { id: "push_up", name: "Push-Ups", muscleGroups: ["chest", "triceps", "shoulders"], type: "strength", difficulty: "beginner", equipment: ["bodyweight"], baseReps: 12, baseSets: 3, restSeconds: 60, formCues: ["Keep core tight", "Elbows at 45 degrees", "Full range of motion"], alternatives: ["knee_push_up", "bench_press"] },
  { id: "bench_press", name: "Bench Press", muscleGroups: ["chest", "triceps", "shoulders"], type: "strength", difficulty: "intermediate", equipment: ["barbell", "bench"], baseReps: 8, baseSets: 4, restSeconds: 90, formCues: ["Retract shoulder blades", "Feet flat on floor", "Bar to mid-chest"], alternatives: ["push_up", "dumbbell_press"] },
  { id: "dumbbell_press", name: "Dumbbell Chest Press", muscleGroups: ["chest", "triceps"], type: "hypertrophy", difficulty: "intermediate", equipment: ["dumbbells", "bench"], baseReps: 10, baseSets: 3, restSeconds: 75, formCues: ["Control the negative", "Press up and slightly in", "Don't lock elbows"], alternatives: ["push_up", "bench_press"] },
  // Back
  { id: "pull_up", name: "Pull-Ups", muscleGroups: ["back", "biceps"], type: "strength", difficulty: "intermediate", equipment: ["pull_up_bar"], baseReps: 6, baseSets: 3, restSeconds: 90, formCues: ["Dead hang start", "Pull chest to bar", "Control the descent"], alternatives: ["inverted_row", "bent_over_row"] },
  { id: "bent_over_row", name: "Bent-Over Row", muscleGroups: ["back", "biceps"], type: "strength", difficulty: "intermediate", equipment: ["dumbbells"], baseReps: 10, baseSets: 3, restSeconds: 75, formCues: ["Hinge at hips", "Pull to lower chest", "Squeeze shoulder blades"], alternatives: ["pull_up", "inverted_row"] },
  { id: "inverted_row", name: "Inverted Rows", muscleGroups: ["back", "biceps"], type: "strength", difficulty: "beginner", equipment: ["bodyweight", "bar"], baseReps: 10, baseSets: 3, restSeconds: 60, formCues: ["Keep body straight", "Pull chest to bar", "Controlled movement"], alternatives: ["bent_over_row", "pull_up"] },
  // Legs
  { id: "squat", name: "Bodyweight Squats", muscleGroups: ["quads", "glutes", "hamstrings"], type: "strength", difficulty: "beginner", equipment: ["bodyweight"], baseReps: 15, baseSets: 3, restSeconds: 60, formCues: ["Knees track over toes", "Depth below parallel", "Weight in heels"], alternatives: ["goblet_squat", "lunges"] },
  { id: "goblet_squat", name: "Goblet Squat", muscleGroups: ["quads", "glutes"], type: "strength", difficulty: "intermediate", equipment: ["dumbbell", "kettlebell"], baseReps: 12, baseSets: 3, restSeconds: 75, formCues: ["Hold weight at chest", "Elbows inside knees", "Upright torso"], alternatives: ["squat", "lunges"] },
  { id: "lunges", name: "Walking Lunges", muscleGroups: ["quads", "glutes", "hamstrings"], type: "strength", difficulty: "beginner", equipment: ["bodyweight"], baseReps: 12, baseSets: 3, restSeconds: 60, formCues: ["Long stride", "Back knee near floor", "Upright torso"], alternatives: ["squat", "goblet_squat"] },
  { id: "rdl", name: "Romanian Deadlift", muscleGroups: ["hamstrings", "glutes", "back"], type: "strength", difficulty: "intermediate", equipment: ["dumbbells", "barbell"], baseReps: 10, baseSets: 3, restSeconds: 75, formCues: ["Slight knee bend", "Hinge at hips", "Feel hamstring stretch"], alternatives: ["lunges", "squat"] },
  // Shoulders
  { id: "overhead_press", name: "Overhead Press", muscleGroups: ["shoulders", "triceps"], type: "strength", difficulty: "intermediate", equipment: ["dumbbells", "barbell"], baseReps: 8, baseSets: 3, restSeconds: 75, formCues: ["Core braced", "Press straight up", "Full lockout"], alternatives: ["lateral_raise"] },
  { id: "lateral_raise", name: "Lateral Raises", muscleGroups: ["shoulders"], type: "hypertrophy", difficulty: "beginner", equipment: ["dumbbells"], baseReps: 12, baseSets: 3, restSeconds: 45, formCues: ["Slight elbow bend", "Raise to shoulder height", "Control the weight"], alternatives: ["overhead_press"] },
  // Core
  { id: "plank", name: "Plank Hold", muscleGroups: ["core"], type: "strength", difficulty: "beginner", equipment: ["bodyweight"], baseReps: 30, baseSets: 3, restSeconds: 45, formCues: ["Straight line head to heels", "Engage glutes", "Breathe steadily"], alternatives: ["dead_bug"] },
  { id: "dead_bug", name: "Dead Bug", muscleGroups: ["core"], type: "strength", difficulty: "beginner", equipment: ["bodyweight"], baseReps: 10, baseSets: 3, restSeconds: 45, formCues: ["Lower back pressed to floor", "Move opposite arm and leg", "Exhale as you extend"], alternatives: ["plank"] },
  // HIIT
  { id: "burpee", name: "Burpees", muscleGroups: ["chest", "legs", "core"], type: "hiit", difficulty: "intermediate", equipment: ["bodyweight"], baseReps: 8, baseSets: 4, restSeconds: 30, formCues: ["Explosive jump", "Chest to floor", "Keep pace consistent"], alternatives: ["mountain_climber"] },
  { id: "mountain_climber", name: "Mountain Climbers", muscleGroups: ["core", "legs", "shoulders"], type: "hiit", difficulty: "beginner", equipment: ["bodyweight"], baseReps: 20, baseSets: 3, restSeconds: 30, formCues: ["Hands under shoulders", "Drive knees to chest", "Keep hips level"], alternatives: ["burpee"] },
];

// —— Difficulty Scaling ————————————————————

const DIFFICULTY_MULTIPLIERS: Record<DifficultyLevel, { reps: number; sets: number; rest: number }> = {
  beginner: { reps: 0.7, sets: 0.75, rest: 1.3 },
  intermediate: { reps: 1.0, sets: 1.0, rest: 1.0 },
  advanced: { reps: 1.2, sets: 1.25, rest: 0.8 },
  elite: { reps: 1.4, sets: 1.5, rest: 0.65 },
};

const WORKOUT_TYPE_CONFIG: Record<WorkoutType, { repRange: [number, number]; setRange: [number, number]; restRange: [number, number]; exerciseCount: [number, number] }> = {
  strength: { repRange: [3, 8], setRange: [3, 5], restRange: [90, 180], exerciseCount: [4, 6] },
  hypertrophy: { repRange: [8, 15], setRange: [3, 4], restRange: [60, 90], exerciseCount: [5, 7] },
  endurance: { repRange: [15, 25], setRange: [2, 3], restRange: [30, 60], exerciseCount: [6, 8] },
  hiit: { repRange: [8, 20], setRange: [3, 5], restRange: [15, 45], exerciseCount: [4, 6] },
  flexibility: { repRange: [1, 3], setRange: [2, 3], restRange: [30, 60], exerciseCount: [6, 10] },
};

const RECOVERY_HOURS: Record<string, number> = {
  light: 24,
  moderate: 48,
  heavy: 72,
};

// —— Recovery Assessment ——————————————————

export function assessRecovery(
  muscleGroup: MuscleGroup,
  performanceLogs: PerformanceLog[],
): RecoveryStatus {
  const now = new Date();
  const muscleExercises = EXERCISE_DB.filter(e => e.muscleGroups.includes(muscleGroup));
  const muscleExerciseIds = muscleExercises.map(e => e.id);

  const lastLog = performanceLogs
    .filter(log => muscleExerciseIds.includes(log.exerciseId))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

  if (!lastLog) {
    return {
      muscleGroup,
      lastWorked: "never",
      hoursAgo: 999,
      recoveryPercent: 100,
      recommendation: "ready",
    };
  }

  const lastDate = new Date(lastLog.date);
  const hoursAgo = (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60);
  const intensity = lastLog.rpe >= 8 ? "heavy" : lastLog.rpe >= 5 ? "moderate" : "light";
  const recoveryNeeded = RECOVERY_HOURS[intensity];
  const recoveryPercent = Math.min(100, Math.round((hoursAgo / recoveryNeeded) * 100));

  let recommendation: RecoveryStatus["recommendation"] = "ready";
  if (recoveryPercent < 50) recommendation = "rest";
  else if (recoveryPercent < 80) recommendation = "light_ok";

  return {
    muscleGroup,
    lastWorked: lastLog.date,
    hoursAgo: Math.round(hoursAgo),
    recoveryPercent,
    recommendation,
  };
}

// —— Exercise Selection ———————————————————

function selectExercises(
  targetMuscles: MuscleGroup[],
  profile: UserFitnessProfile,
  recoveryStatuses: RecoveryStatus[],
  count: number,
): Exercise[] {
  const available = EXERCISE_DB.filter(exercise => {
    const matchesMuscle = exercise.muscleGroups.some(mg => targetMuscles.includes(mg));
    const matchesDifficulty = getDifficultyOrder(exercise.difficulty) <= getDifficultyOrder(profile.level) + 1;
    const hasEquipment = exercise.equipment.some(eq => eq === "bodyweight" || profile.availableEquipment.includes(eq));
    return matchesMuscle && matchesDifficulty && hasEquipment;
  });

  const scored = available.map(exercise => {
    let score = 0;
    const recovery = recoveryStatuses.find(r => exercise.muscleGroups.includes(r.muscleGroup));

    if (recovery?.recommendation === "ready") score += 3;
    else if (recovery?.recommendation === "light_ok") score += 1;
    else score -= 5;

    if (exercise.difficulty === profile.level) score += 2;
    if (profile.preferredTypes.includes(exercise.type)) score += 1;
    score += Math.random() * 1.5; // variety factor

    return { exercise, score };
  });

  scored.sort((a, b) => b.score - a.score);

  const selected: Exercise[] = [];
  const usedMuscles = new Set<string>();

  for (const { exercise } of scored) {
    if (selected.length >= count) break;
    const primaryMuscle = exercise.muscleGroups[0];
    const muscleCount = selected.filter(e => e.muscleGroups[0] === primaryMuscle).length;
    if (muscleCount < 2) {
      selected.push(exercise);
      exercise.muscleGroups.forEach(mg => usedMuscles.add(mg));
    }
  }

  return selected;
}

function getDifficultyOrder(d: DifficultyLevel): number {
  const order: Record<DifficultyLevel, number> = { beginner: 0, intermediate: 1, advanced: 2, elite: 3 };
  return order[d];
}

// —— Workout Generation ——————————————————

export function generateAdaptiveWorkout(
  profile: UserFitnessProfile,
  performanceLogs: PerformanceLog[],
  targetMuscles?: MuscleGroup[],
  workoutType?: WorkoutType,
): AdaptiveWorkout {
  const type = workoutType || profile.preferredTypes[0] || "strength";
  const config = WORKOUT_TYPE_CONFIG[type];
  const diffMultiplier = DIFFICULTY_MULTIPLIERS[profile.level];

  const muscles: MuscleGroup[] = targetMuscles || getDefaultMuscleTargets(profile, performanceLogs);

  const recoveryStatuses = muscles.map(mg => assessRecovery(mg, performanceLogs));

  const exerciseCount = Math.round(
    (config.exerciseCount[0] + config.exerciseCount[1]) / 2 * (profile.workoutDuration / 45)
  );
  const clampedCount = Math.max(config.exerciseCount[0], Math.min(config.exerciseCount[1], exerciseCount));

  const selectedExercises = selectExercises(muscles, profile, recoveryStatuses, clampedCount);

  const warmup: WorkoutSet[] = [
    {
      exerciseId: "warmup_cardio",
      exerciseName: "Light Cardio (Jog/Jump Rope)",
      sets: 1,
      reps: 1,
      restSeconds: 0,
      formCues: ["5 minutes at easy pace", "Get heart rate up gradually"],
      isWarmup: true,
    },
    {
      exerciseId: "warmup_dynamic",
      exerciseName: "Dynamic Stretching",
      sets: 1,
      reps: 10,
      restSeconds: 0,
      formCues: ["Arm circles", "Leg swings", "Hip circles", "Torso twists"],
      isWarmup: true,
    },
  ];

  const exercises: WorkoutSet[] = selectedExercises.map(exercise => {
    const reps = Math.round(exercise.baseReps * diffMultiplier.reps);
    const sets = Math.round(exercise.baseSets * diffMultiplier.sets);
    const rest = Math.round(exercise.restSeconds * diffMultiplier.rest);

    const clampedReps = Math.max(config.repRange[0], Math.min(config.repRange[1], reps));
    const clampedSets = Math.max(config.setRange[0], Math.min(config.setRange[1], sets));
    const clampedRest = Math.max(config.restRange[0], Math.min(config.restRange[1], rest));

    return {
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      sets: clampedSets,
      reps: clampedReps,
      restSeconds: clampedRest,
      formCues: exercise.formCues,
    };
  });

  const cooldown = [
    "Static stretching - 5 minutes",
    "Focus on worked muscle groups",
    "Deep breathing exercises",
    "Foam rolling if available",
  ];

  const adaptationNotes = generateAdaptationNotes(profile, recoveryStatuses, performanceLogs);
  const estimatedDuration = calculateDuration(warmup, exercises);

  return {
    id: `workout_${Date.now()}`,
    date: new Date().toISOString(),
    type,
    difficulty: profile.level,
    targetMuscles: muscles,
    estimatedDuration,
    exercises,
    warmup,
    cooldown,
    adaptationNotes,
  };
}

function getDefaultMuscleTargets(profile: UserFitnessProfile, logs: PerformanceLog[]): MuscleGroup[] {
  const allMuscles: MuscleGroup[] = ["chest", "back", "legs", "shoulders", "core"];
  const recoveries = allMuscles.map(mg => assessRecovery(mg, logs));
  const ready = recoveries.filter(r => r.recommendation === "ready").map(r => r.muscleGroup);
  return ready.length >= 2 ? ready.slice(0, 3) : allMuscles.slice(0, 3);
}

function calculateDuration(warmup: WorkoutSet[], exercises: WorkoutSet[]): number {
  let totalSeconds = 0;
  totalSeconds += 300; // 5 min warmup
  for (const ex of exercises) {
    const exerciseTime = ex.sets * (30 + ex.restSeconds); // 30s per set + rest
    totalSeconds += exerciseTime;
  }
  totalSeconds += 300; // 5 min cooldown
  return Math.round(totalSeconds / 60);
}

function generateAdaptationNotes(
  profile: UserFitnessProfile,
  recoveryStatuses: RecoveryStatus[],
  logs: PerformanceLog[],
): string[] {
  const notes: string[] = [];
  const restingMuscles = recoveryStatuses.filter(r => r.recommendation === "rest");
  if (restingMuscles.length > 0) {
    notes.push(`Avoiding ${restingMuscles.map(r => r.muscleGroup).join(", ")} — still recovering`);
  }

  const recentLogs = logs.filter(l => {
    const daysAgo = (Date.now() - new Date(l.date).getTime()) / (1000 * 60 * 60 * 24);
    return daysAgo <= 7;
  });

  if (recentLogs.length > 0) {
    const avgRpe = recentLogs.reduce((sum, l) => sum + l.rpe, 0) / recentLogs.length;
    if (avgRpe > 8) notes.push("Recent workouts have been intense — slightly reduced volume today");
    if (avgRpe < 5) notes.push("You've been taking it easy — pushing intensity up slightly");
  }

  if (profile.totalWorkouts < 5) {
    notes.push("New to PeakPulse — starting with foundational movements");
  }

  return notes;
}

// —— Auto-Progression ————————————————————

export function calculateProgression(
  exerciseId: string,
  recentLogs: PerformanceLog[],
): { shouldProgress: boolean; suggestion: string } {
  const exerciseLogs = recentLogs
    .filter(l => l.exerciseId === exerciseId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 3);

  if (exerciseLogs.length < 3) {
    return { shouldProgress: false, suggestion: "Keep training — need more data to assess progression" };
  }

  const allCompleted = exerciseLogs.every(l => l.completedReps >= l.plannedReps && l.completedSets >= l.plannedSets);
  const avgRpe = exerciseLogs.reduce((sum, l) => sum + l.rpe, 0) / exerciseLogs.length;

  if (allCompleted && avgRpe < 7) {
    return { shouldProgress: true, suggestion: "Great consistency! Increase weight by 5% or add 2 reps per set" };
  }

  if (allCompleted && avgRpe >= 7 && avgRpe <= 8.5) {
    return { shouldProgress: false, suggestion: "Good effort — maintain current level for another week" };
  }

  if (!allCompleted || avgRpe > 8.5) {
    return { shouldProgress: false, suggestion: "Consider reducing weight slightly or taking an extra rest day" };
  }

  return { shouldProgress: false, suggestion: "Stay the course — you're making progress" };
}

// —— Performance Tracking ————————————————

const PERFORMANCE_KEY = "peakpulse_performance_logs";
const FITNESS_PROFILE_KEY = "peakpulse_fitness_profile";

export async function logPerformance(log: PerformanceLog): Promise<void> {
  try {
    const existing = await getPerformanceHistory();
    existing.push(log);
    // Keep last 500 entries
    const trimmed = existing.slice(-500);
    await AsyncStorage.setItem(PERFORMANCE_KEY, JSON.stringify(trimmed));
  } catch (error) {
    console.error("Failed to log performance:", error);
  }
}

export async function getPerformanceHistory(): Promise<PerformanceLog[]> {
  try {
    const data = await AsyncStorage.getItem(PERFORMANCE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export async function saveFitnessProfile(profile: UserFitnessProfile): Promise<void> {
  try {
    await AsyncStorage.setItem(FITNESS_PROFILE_KEY, JSON.stringify(profile));
  } catch (error) {
    console.error("Failed to save fitness profile:", error);
  }
}

export async function loadFitnessProfile(): Promise<UserFitnessProfile> {
  try {
    const data = await AsyncStorage.getItem(FITNESS_PROFILE_KEY);
    if (data) return JSON.parse(data);
  } catch {
    // Return default
  }
  return getDefaultProfile();
}

export function getDefaultProfile(): UserFitnessProfile {
  return {
    level: "beginner",
    preferredTypes: ["strength"],
    availableEquipment: ["bodyweight"],
    workoutDuration: 30,
    daysPerWeek: 3,
    injuries: [],
    goals: ["general_fitness"],
    totalWorkouts: 0,
    streakDays: 0,
  };
}

// —— Quick Workout Presets ———————————————

export function getQuickWorkout(
  preset: "upper" | "lower" | "full" | "core" | "hiit",
  profile: UserFitnessProfile,
): AdaptiveWorkout {
  const muscleMap: Record<string, MuscleGroup[]> = {
    upper: ["chest", "back", "shoulders", "arms"],
    lower: ["legs", "glutes", "hamstrings", "quads"],
    full: ["chest", "back", "legs", "shoulders", "core"],
    core: ["core"],
    hiit: ["chest", "legs", "core"],
  };

  const typeMap: Record<string, WorkoutType> = {
    upper: "strength",
    lower: "strength",
    full: "hypertrophy",
    core: "endurance",
    hiit: "hiit",
  };

  return generateAdaptiveWorkout(profile, [], muscleMap[preset], typeMap[preset]);
}

// —— Workout Summary —————————————————————

export function getWorkoutSummary(workout: AdaptiveWorkout): string {
  const totalSets = workout.exercises.reduce((sum, ex) => sum + ex.sets, 0);
  const totalReps = workout.exercises.reduce((sum, ex) => sum + (ex.sets * ex.reps), 0);
  const muscles = [...new Set(workout.targetMuscles)].join(", ");

  return `${workout.type.toUpperCase()} workout targeting ${muscles}. ${workout.exercises.length} exercises, ${totalSets} total sets, ~${totalReps} total reps. Estimated ${workout.estimatedDuration} minutes.`;
}

