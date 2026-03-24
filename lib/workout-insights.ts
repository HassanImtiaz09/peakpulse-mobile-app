/**
 * AI Workout Insights Engine
 *
 * Provides intelligent recommendations for custom workout building:
 * - Rep/set suggestions based on exercise type and user goals
 * - Workout balance analysis (muscle group coverage)
 * - Calorie expenditure estimates
 * - Muscle gain / fat loss projections
 * - Coaching suggestions
 */
import { getExerciseInfo, type ExerciseInfo } from "@/lib/exercise-data";
import type { MuscleGroup } from "@/components/body-diagram";

// ── Types ────────────────────────────────────────────────────────────────────

export type FitnessGoal = "build_muscle" | "lose_fat" | "maintain" | "athletic" | "endurance";
export type FitnessLevel = "beginner" | "intermediate" | "advanced";

export interface WorkoutExerciseInput {
  name: string;
  sets: number;
  reps: number;
  restSeconds: number;
  weight?: number; // kg
}

export interface RepSuggestion {
  exercise: string;
  suggestedSets: number;
  suggestedReps: string; // e.g. "8-12"
  suggestedRest: string; // e.g. "60-90s"
  reasoning: string;
}

export interface BalanceAnalysis {
  overallScore: number; // 0-100
  rating: "excellent" | "good" | "fair" | "poor";
  muscleDistribution: { muscle: MuscleGroup; percentage: number; status: "over" | "balanced" | "under" | "missing" }[];
  warnings: string[];
  suggestions: string[];
}

export interface CalorieEstimate {
  totalCalories: number;
  perExercise: { name: string; calories: number }[];
  durationMinutes: number;
  afterburnCalories: number; // EPOC
  totalWithAfterburn: number;
}

export interface BodyCompositionEstimate {
  weeklyCalorieDeficit: number;
  weeklyMuscleStimulusScore: number; // 0-100
  estimatedWeeklyFatLossKg: number;
  estimatedMonthlyFatLossKg: number;
  estimatedWeeklyMuscleGainKg: number;
  estimatedMonthlyMuscleGainKg: number;
  daysToGoal: number;
  confidence: "high" | "medium" | "low";
  notes: string[];
}

export interface WorkoutCoachInsight {
  type: "tip" | "warning" | "suggestion" | "praise";
  icon: string; // MaterialIcons name
  title: string;
  message: string;
  priority: number; // 1=highest
}

// ── Constants ────────────────────────────────────────────────────────────────

const GOAL_REP_RANGES: Record<FitnessGoal, { sets: number; repsMin: number; repsMax: number; restSec: string }> = {
  build_muscle: { sets: 4, repsMin: 8, repsMax: 12, restSec: "60-90s" },
  lose_fat: { sets: 3, repsMin: 12, repsMax: 15, restSec: "30-45s" },
  maintain: { sets: 3, repsMin: 8, repsMax: 12, restSec: "60-90s" },
  athletic: { sets: 3, repsMin: 6, repsMax: 10, restSec: "90-120s" },
  endurance: { sets: 3, repsMin: 15, repsMax: 20, restSec: "30-45s" },
};

const LEVEL_MULTIPLIER: Record<FitnessLevel, number> = {
  beginner: 0.8,
  intermediate: 1.0,
  advanced: 1.2,
};

/** MET values for different exercise types (Metabolic Equivalent of Task) */
const EXERCISE_MET: Record<string, number> = {
  chest: 5.0,
  back: 5.5,
  shoulders: 4.5,
  arms: 3.5,
  legs: 6.0,
  core: 3.5,
  cardio: 7.0,
  full_body: 6.0,
};

const COMPOUND_EXERCISES = new Set([
  "bench press", "squat", "deadlift", "overhead press", "barbell row",
  "pull up", "chin up", "dip", "clean and press", "push up",
  "lunge", "front squat", "sumo deadlift", "incline bench press",
]);

// ── Rep Suggestions ──────────────────────────────────────────────────────────

/**
 * Get AI-powered rep/set suggestions for an exercise.
 */
export function getRepSuggestion(
  exerciseName: string,
  goal: FitnessGoal = "build_muscle",
  level: FitnessLevel = "intermediate",
): RepSuggestion {
  const info = getExerciseInfo(exerciseName);
  const range = GOAL_REP_RANGES[goal];
  const mult = LEVEL_MULTIPLIER[level];
  const isCompound = COMPOUND_EXERCISES.has(exerciseName.toLowerCase());

  let sets = Math.round(range.sets * mult);
  let repsMin = range.repsMin;
  let repsMax = range.repsMax;
  let rest = range.restSec;

  // Compound exercises: fewer reps, more rest
  if (isCompound) {
    repsMin = Math.max(repsMin - 2, 4);
    repsMax = Math.max(repsMax - 2, 6);
    sets = Math.min(sets + 1, 5);
    if (goal === "build_muscle" || goal === "athletic") rest = "90-120s";
  }

  // Cardio exercises: higher reps, less rest
  if (info?.category === "cardio") {
    repsMin = 15;
    repsMax = 30;
    sets = 3;
    rest = "30-45s";
  }

  // Core exercises: moderate reps
  if (info?.category === "core") {
    repsMin = 12;
    repsMax = 20;
    sets = 3;
    rest = "30-60s";
  }

  // Beginner: cap sets
  if (level === "beginner") sets = Math.min(sets, 3);

  const goalLabel = goal.replace(/_/g, " ");
  const reasoning = isCompound
    ? `As a compound movement, ${exerciseName} benefits from heavier loads with moderate reps (${repsMin}-${repsMax}) and longer rest for ${goalLabel}.`
    : `For ${goalLabel}, ${repsMin}-${repsMax} reps per set with ${rest} rest optimises ${goal === "build_muscle" ? "hypertrophy" : goal === "lose_fat" ? "metabolic stress" : "performance"}.`;

  return {
    exercise: exerciseName,
    suggestedSets: sets,
    suggestedReps: `${repsMin}-${repsMax}`,
    suggestedRest: rest,
    reasoning,
  };
}

// ── Balance Analysis ─────────────────────────────────────────────────────────

/**
 * Analyse muscle group balance of a custom workout.
 */
export function analyzeWorkoutBalance(exercises: WorkoutExerciseInput[]): BalanceAnalysis {
  const muscleHits: Record<string, number> = {};
  const allMuscles: MuscleGroup[] = [
    "chest", "back", "shoulders", "biceps", "triceps",
    "quads", "hamstrings", "glutes", "calves", "abs",
    "obliques", "lats", "traps", "lower_back", "forearms",
  ];

  // Count muscle hits weighted by sets
  for (const ex of exercises) {
    const info = getExerciseInfo(ex.name);
    if (!info) continue;
    for (const m of info.primaryMuscles) {
      muscleHits[m] = (muscleHits[m] || 0) + ex.sets * 1.0;
    }
    for (const m of info.secondaryMuscles) {
      muscleHits[m] = (muscleHits[m] || 0) + ex.sets * 0.5;
    }
  }

  const totalHits = Object.values(muscleHits).reduce((s, v) => s + v, 0) || 1;
  const avgHits = totalHits / allMuscles.length;

  const muscleDistribution = allMuscles.map((m) => {
    const hits = muscleHits[m] || 0;
    const percentage = Math.round((hits / totalHits) * 100);
    let status: "over" | "balanced" | "under" | "missing" = "balanced";
    if (hits === 0) status = "missing";
    else if (hits > avgHits * 1.8) status = "over";
    else if (hits < avgHits * 0.3 && hits > 0) status = "under";
    return { muscle: m, percentage, status };
  });

  const warnings: string[] = [];
  const suggestions: string[] = [];

  const overMuscles = muscleDistribution.filter(m => m.status === "over");
  const missingMuscles = muscleDistribution.filter(m => m.status === "missing");
  const underMuscles = muscleDistribution.filter(m => m.status === "under");

  if (overMuscles.length > 0) {
    warnings.push(`Heavy focus on ${overMuscles.map(m => m.muscle.replace(/_/g, " ")).join(", ")}. Consider reducing sets to avoid overtraining.`);
  }
  if (missingMuscles.length > 3) {
    warnings.push(`${missingMuscles.length} muscle groups not targeted. This workout is quite specialised.`);
  }

  // Push/pull balance
  const pushHits = (muscleHits["chest"] || 0) + (muscleHits["shoulders"] || 0) + (muscleHits["triceps"] || 0);
  const pullHits = (muscleHits["back"] || 0) + (muscleHits["lats"] || 0) + (muscleHits["biceps"] || 0);
  if (pushHits > 0 && pullHits > 0) {
    const ratio = pushHits / pullHits;
    if (ratio > 2) suggestions.push("Your workout is push-dominant. Add more pulling exercises (rows, pull-ups) for shoulder health.");
    else if (ratio < 0.5) suggestions.push("Your workout is pull-dominant. Add pressing movements for balanced development.");
  }

  // Upper/lower balance
  const upperHits = (muscleHits["chest"] || 0) + (muscleHits["back"] || 0) + (muscleHits["shoulders"] || 0) + (muscleHits["biceps"] || 0) + (muscleHits["triceps"] || 0);
  const lowerHits = (muscleHits["quads"] || 0) + (muscleHits["hamstrings"] || 0) + (muscleHits["glutes"] || 0) + (muscleHits["calves"] || 0);
  if (upperHits > 0 && lowerHits === 0) {
    suggestions.push("No lower body exercises included. Consider adding squats or lunges for a balanced workout.");
  } else if (lowerHits > 0 && upperHits === 0) {
    suggestions.push("No upper body exercises included. Consider adding pressing or pulling movements.");
  }

  // Missing core
  if (!muscleHits["abs"] && !muscleHits["obliques"] && exercises.length > 3) {
    suggestions.push("Consider adding core work (planks, crunches) for stability and injury prevention.");
  }

  // Score calculation
  const coverageScore = Math.min(100, (Object.keys(muscleHits).length / 8) * 50);
  const balanceScore = overMuscles.length === 0 ? 30 : Math.max(0, 30 - overMuscles.length * 10);
  const warningPenalty = warnings.length * 5;
  const overallScore = Math.max(0, Math.min(100, Math.round(coverageScore + balanceScore - warningPenalty)));

  let rating: BalanceAnalysis["rating"] = "excellent";
  if (overallScore < 40) rating = "poor";
  else if (overallScore < 60) rating = "fair";
  else if (overallScore < 80) rating = "good";

  return { overallScore, rating, muscleDistribution, warnings, suggestions };
}

// ── Calorie Estimates ────────────────────────────────────────────────────────

/**
 * Estimate calorie expenditure for a workout.
 */
export function estimateCalories(
  exercises: WorkoutExerciseInput[],
  bodyWeightKg: number = 75,
): CalorieEstimate {
  const perExercise: CalorieEstimate["perExercise"] = [];
  let totalDurationMin = 0;

  for (const ex of exercises) {
    const info = getExerciseInfo(ex.name);
    const category = info?.category ?? "chest";
    const met = EXERCISE_MET[category] ?? 4.5;

    // Time per exercise: (sets × reps × ~3s per rep) + (sets × rest)
    const timePerSetSec = ex.reps * 3;
    const totalTimeSec = ex.sets * (timePerSetSec + ex.restSeconds);
    const timeMin = totalTimeSec / 60;
    totalDurationMin += timeMin;

    // Calories = MET × weight(kg) × time(hours)
    const calories = Math.round(met * bodyWeightKg * (timeMin / 60));
    perExercise.push({ name: ex.name, calories });
  }

  // Add warm-up and transition time
  totalDurationMin += exercises.length * 0.5 + 5; // 30s transitions + 5min warmup

  const totalCalories = perExercise.reduce((s, e) => s + e.calories, 0);

  // EPOC (Excess Post-Exercise Oxygen Consumption) — afterburn effect
  // Typically 6-15% of exercise calories for resistance training
  const afterburnCalories = Math.round(totalCalories * 0.1);

  return {
    totalCalories,
    perExercise,
    durationMinutes: Math.round(totalDurationMin),
    afterburnCalories,
    totalWithAfterburn: totalCalories + afterburnCalories,
  };
}

// ── Body Composition Estimates ───────────────────────────────────────────────

/**
 * Estimate muscle gain and fat loss over time.
 */
export function estimateBodyComposition(
  exercises: WorkoutExerciseInput[],
  sessionsPerWeek: number = 4,
  goal: FitnessGoal = "build_muscle",
  level: FitnessLevel = "intermediate",
  bodyWeightKg: number = 75,
  targetWeightKg?: number,
): BodyCompositionEstimate {
  const calorieEst = estimateCalories(exercises, bodyWeightKg);
  const weeklyCalorieBurn = calorieEst.totalWithAfterburn * sessionsPerWeek;

  // Muscle stimulus score based on exercise variety and volume
  const balance = analyzeWorkoutBalance(exercises);
  const totalSets = exercises.reduce((s, e) => s + e.sets, 0);
  const volumeScore = Math.min(50, totalSets * 2.5);
  const balanceBonus = balance.overallScore * 0.5;
  const weeklyMuscleStimulusScore = Math.min(100, Math.round(volumeScore + balanceBonus));

  // Realistic estimates based on scientific literature
  const levelFactor = level === "beginner" ? 1.5 : level === "intermediate" ? 1.0 : 0.7;

  // Muscle gain: 0.1-0.25kg/week for intermediates doing proper resistance training
  let weeklyMuscleGain = 0;
  if (goal === "build_muscle" || goal === "athletic") {
    weeklyMuscleGain = 0.15 * levelFactor * (weeklyMuscleStimulusScore / 100);
  } else if (goal === "maintain") {
    weeklyMuscleGain = 0.05 * levelFactor * (weeklyMuscleStimulusScore / 100);
  } else {
    weeklyMuscleGain = 0.08 * levelFactor * (weeklyMuscleStimulusScore / 100);
  }

  // Fat loss: ~0.5kg/week is sustainable (requires ~3500 kcal deficit)
  let weeklyFatLoss = 0;
  if (goal === "lose_fat") {
    // Assume moderate calorie deficit of 500 kcal/day
    weeklyFatLoss = Math.min(0.7, (weeklyCalorieBurn + 500 * 7) / 7700);
  } else if (goal === "build_muscle") {
    weeklyFatLoss = Math.max(0, weeklyCalorieBurn / 7700 * 0.3);
  }

  // Days to goal
  let daysToGoal = 90; // default
  if (targetWeightKg && bodyWeightKg) {
    const diff = Math.abs(bodyWeightKg - targetWeightKg);
    if (goal === "lose_fat" && weeklyFatLoss > 0) {
      daysToGoal = Math.round((diff / weeklyFatLoss) * 7);
    } else if (goal === "build_muscle" && weeklyMuscleGain > 0) {
      daysToGoal = Math.round((diff / weeklyMuscleGain) * 7);
    }
  }

  const notes: string[] = [];
  if (goal === "build_muscle") {
    notes.push("Muscle gain estimates assume a caloric surplus of 200-300 kcal/day and adequate protein (1.6-2.2g/kg).");
  }
  if (goal === "lose_fat") {
    notes.push("Fat loss estimates assume a moderate caloric deficit of ~500 kcal/day combined with this training.");
  }
  if (level === "beginner") {
    notes.push("Beginners can expect faster initial progress (newbie gains) in the first 3-6 months.");
  }
  if (weeklyMuscleStimulusScore < 40) {
    notes.push("Increasing workout volume (more sets/exercises) would improve results significantly.");
  }
  notes.push("These are estimates based on averages. Individual results vary based on genetics, nutrition, sleep, and consistency.");

  return {
    weeklyCalorieDeficit: goal === "lose_fat" ? weeklyCalorieBurn : 0,
    weeklyMuscleStimulusScore,
    estimatedWeeklyFatLossKg: Math.round(weeklyFatLoss * 100) / 100,
    estimatedMonthlyFatLossKg: Math.round(weeklyFatLoss * 4.3 * 100) / 100,
    estimatedWeeklyMuscleGainKg: Math.round(weeklyMuscleGain * 100) / 100,
    estimatedMonthlyMuscleGainKg: Math.round(weeklyMuscleGain * 4.3 * 100) / 100,
    daysToGoal: Math.min(365, Math.max(14, daysToGoal)),
    confidence: level === "beginner" ? "low" : weeklyMuscleStimulusScore > 60 ? "high" : "medium",
    notes,
  };
}

// ── Coaching Insights ────────────────────────────────────────────────────────

/**
 * Generate coaching insights for a custom workout.
 */
export function getCoachingInsights(
  exercises: WorkoutExerciseInput[],
  goal: FitnessGoal = "build_muscle",
  level: FitnessLevel = "intermediate",
): WorkoutCoachInsight[] {
  const insights: WorkoutCoachInsight[] = [];
  const balance = analyzeWorkoutBalance(exercises);
  const totalSets = exercises.reduce((s, e) => s + e.sets, 0);
  const totalExercises = exercises.length;

  // Volume check
  if (totalSets < 8) {
    insights.push({
      type: "warning",
      icon: "trending-down",
      title: "Low Volume",
      message: `Only ${totalSets} total sets. For ${goal === "build_muscle" ? "muscle growth" : "results"}, aim for 15-25 sets per session.`,
      priority: 1,
    });
  } else if (totalSets > 30) {
    insights.push({
      type: "warning",
      icon: "warning",
      title: "Very High Volume",
      message: `${totalSets} sets is quite high. This may lead to excessive fatigue and diminishing returns. Consider splitting into two sessions.`,
      priority: 1,
    });
  } else if (totalSets >= 15 && totalSets <= 25) {
    insights.push({
      type: "praise",
      icon: "check-circle",
      title: "Great Volume",
      message: `${totalSets} total sets is in the optimal range for ${goal === "build_muscle" ? "hypertrophy" : "fitness gains"}.`,
      priority: 5,
    });
  }

  // Exercise count
  if (totalExercises < 3) {
    insights.push({
      type: "suggestion",
      icon: "add-circle",
      title: "Add More Exercises",
      message: "Consider adding 2-3 more exercises for a more complete workout.",
      priority: 2,
    });
  } else if (totalExercises > 10) {
    insights.push({
      type: "warning",
      icon: "timer",
      title: "Many Exercises",
      message: `${totalExercises} exercises may make this workout very long. Focus on quality over quantity.`,
      priority: 2,
    });
  }

  // Compound movement check
  const compoundCount = exercises.filter(e => COMPOUND_EXERCISES.has(e.name.toLowerCase())).length;
  if (compoundCount === 0 && totalExercises > 2) {
    insights.push({
      type: "suggestion",
      icon: "fitness-center",
      title: "Add Compound Movements",
      message: "Include compound exercises (squats, deadlifts, bench press) for maximum efficiency and hormonal response.",
      priority: 2,
    });
  } else if (compoundCount >= 2) {
    insights.push({
      type: "praise",
      icon: "star",
      title: "Good Foundation",
      message: `${compoundCount} compound movements provide an excellent training stimulus.`,
      priority: 5,
    });
  }

  // Balance warnings
  for (const warning of balance.warnings) {
    insights.push({
      type: "warning",
      icon: "balance",
      title: "Balance Alert",
      message: warning,
      priority: 3,
    });
  }

  // Balance suggestions
  for (const suggestion of balance.suggestions) {
    insights.push({
      type: "suggestion",
      icon: "lightbulb",
      title: "Improvement Tip",
      message: suggestion,
      priority: 4,
    });
  }

  // Goal-specific tips
  if (goal === "build_muscle") {
    const hasProgressiveOverload = exercises.some(e => e.weight && e.weight > 0);
    if (!hasProgressiveOverload) {
      insights.push({
        type: "tip",
        icon: "trending-up",
        title: "Progressive Overload",
        message: "Track your weights and aim to increase by 2.5-5% each week for consistent muscle growth.",
        priority: 4,
      });
    }
  }

  if (goal === "lose_fat") {
    insights.push({
      type: "tip",
      icon: "local-fire-department",
      title: "Maximise Fat Burn",
      message: "Keep rest periods short (30-45s) and maintain intensity to maximise metabolic stress and calorie burn.",
      priority: 4,
    });
  }

  // Sort by priority
  insights.sort((a, b) => a.priority - b.priority);
  return insights;
}

// ── Exercise Categories for UI ───────────────────────────────────────────────

export interface ExerciseCategory {
  key: string;
  label: string;
  icon: string;
  muscles: MuscleGroup[];
}

export const EXERCISE_CATEGORIES: ExerciseCategory[] = [
  { key: "all", label: "All", icon: "apps", muscles: [] },
  { key: "upper_body", label: "Upper Body", icon: "accessibility-new", muscles: ["chest", "back", "shoulders", "biceps", "triceps", "lats", "traps"] },
  { key: "chest", label: "Chest", icon: "fitness-center", muscles: ["chest"] },
  { key: "back", label: "Back", icon: "swap-horiz", muscles: ["back", "lats", "traps"] },
  { key: "shoulders", label: "Shoulders", icon: "pan-tool", muscles: ["shoulders"] },
  { key: "biceps", label: "Biceps", icon: "front-hand", muscles: ["biceps"] },
  { key: "triceps", label: "Triceps", icon: "back-hand", muscles: ["triceps"] },
  { key: "lower_body", label: "Lower Body", icon: "directions-walk", muscles: ["quads", "hamstrings", "glutes", "calves"] },
  { key: "quads", label: "Quads", icon: "airline-seat-legroom-extra", muscles: ["quads"] },
  { key: "hamstrings", label: "Hamstrings", icon: "airline-seat-legroom-normal", muscles: ["hamstrings"] },
  { key: "glutes", label: "Glutes", icon: "chair", muscles: ["glutes"] },
  { key: "calves", label: "Calves", icon: "do-not-step", muscles: ["calves"] },
  { key: "core", label: "Core", icon: "self-improvement", muscles: ["abs", "obliques", "lower_back"] },
  { key: "cardio", label: "Cardio", icon: "directions-run", muscles: [] },
  { key: "full_body", label: "Full Body", icon: "accessibility", muscles: [] },
];
