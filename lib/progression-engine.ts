/**
 * Progression Engine — Enhanced workout progression with double progression
 * and deload detection.
 *
 * Builds on top of the existing workout-progression.ts module by adding:
 *
 *   1. **Double Progression** — Instead of always increasing weight, first
 *      increase reps within a target range (e.g., 8→12), then increase
 *      weight and reset reps to the bottom of the range. This is the
 *      standard hypertrophy progression model.
 *
 *   2. **Deload Detection** — Detects when the user has failed to complete
 *      all prescribed sets for N consecutive sessions, suggesting a deload
 *      (reduce weight by 10-15%) to break through plateaus.
 *
 *   3. **Progression Suggestions Storage** — Persists suggestions to
 *      AsyncStorage so they can be displayed on the dashboard and in the
 *      workout screen.
 *
 * This module re-exports the core utilities from workout-progression.ts
 * and adds the enhanced logic on top.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  classifyExercise,
  type ExerciseType,
  type ExerciseSession,
  type ExerciseHistory,
  loadProgressionHistory,
  getConsecutiveCompletions,
  getLatestPerformance,
} from "@/lib/workout-progression";

// Re-export core types for convenience
export type { ExerciseType, ExerciseSession, ExerciseHistory };
export { classifyExercise, getConsecutiveCompletions, getLatestPerformance };

// ── Types ──────────────────────────────────────────────────────────────────────

export type ProgressionMode = "linear" | "double";

export interface RepRange {
  /** Minimum reps in the target range (e.g., 8) */
  min: number;
  /** Maximum reps in the target range (e.g., 12) */
  max: number;
}

export interface ProgressionConfig {
  /** Progression mode: "linear" (weight only) or "double" (reps then weight) */
  mode: ProgressionMode;
  /** Target rep range for double progression (default 8–12) */
  repRange: RepRange;
  /** Sessions needed to trigger a level-up (default 3) */
  consecutiveThreshold: number;
  /** Sessions of failure before suggesting a deload (default 3) */
  deloadThreshold: number;
  /** Deload percentage (0–1, default 0.1 = 10%) */
  deloadPercent: number;
  /** Weight increment for compound lifts in kg (default 2.5) */
  compoundIncrement: number;
  /** Weight increment for isolation lifts in kg (default 1.25) */
  isolationIncrement: number;
}

export interface ProgressionSuggestion {
  exerciseName: string;
  exerciseType: ExerciseType;
  mode: ProgressionMode;
  currentWeight: number;
  currentReps: number;
  suggestedWeight: number;
  suggestedReps: number;
  consecutiveCompletions: number;
  action: "increase_weight" | "increase_reps" | "deload" | "maintain";
  message: string;
  confidence: "high" | "medium" | "low";
}

export interface DeloadSuggestion {
  exerciseName: string;
  exerciseType: ExerciseType;
  currentWeight: number;
  suggestedWeight: number;
  consecutiveFailures: number;
  message: string;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const SUGGESTIONS_KEY = "@progression_suggestions";
const CONFIG_KEY = "@progression_config";

export const DEFAULT_CONFIG: ProgressionConfig = {
  mode: "double",
  repRange: { min: 8, max: 12 },
  consecutiveThreshold: 3,
  deloadThreshold: 3,
  deloadPercent: 0.1,
  compoundIncrement: 2.5,
  isolationIncrement: 1.25,
};

export const DEFAULT_REP_RANGE: RepRange = { min: 8, max: 12 };

// ── Pure Helpers (testable without side effects) ─────────────────────────────

/**
 * Calculate the weight increment based on exercise type and config.
 */
export function getWeightIncrement(
  exerciseType: ExerciseType,
  config: ProgressionConfig = DEFAULT_CONFIG,
): number {
  if (exerciseType === "bodyweight") return 0;
  return exerciseType === "compound"
    ? config.compoundIncrement
    : config.isolationIncrement;
}

/**
 * Calculate double progression suggestion.
 *
 * Rules:
 * - If current reps < repRange.max → increase reps by 1
 * - If current reps >= repRange.max → increase weight, reset reps to repRange.min
 * - Bodyweight exercises always increase reps (no weight to add)
 */
export function calculateDoubleProgression(
  exerciseName: string,
  currentWeight: number,
  currentReps: number,
  config: ProgressionConfig = DEFAULT_CONFIG,
  exerciseType?: ExerciseType,
): { suggestedWeight: number; suggestedReps: number; action: "increase_weight" | "increase_reps" } {
  const type = exerciseType ?? classifyExercise(exerciseName);

  if (type === "bodyweight" || currentWeight === 0) {
    // Bodyweight: always increase reps
    return {
      suggestedWeight: 0,
      suggestedReps: currentReps + 1,
      action: "increase_reps",
    };
  }

  if (currentReps >= config.repRange.max) {
    // At top of rep range → increase weight, reset reps
    const increment = getWeightIncrement(type, config);
    return {
      suggestedWeight: currentWeight + increment,
      suggestedReps: config.repRange.min,
      action: "increase_weight",
    };
  }

  // Below rep range max → increase reps
  return {
    suggestedWeight: currentWeight,
    suggestedReps: currentReps + 1,
    action: "increase_reps",
  };
}

/**
 * Calculate linear progression suggestion (weight only).
 */
export function calculateLinearProgression(
  exerciseName: string,
  currentWeight: number,
  currentReps: number,
  config: ProgressionConfig = DEFAULT_CONFIG,
  exerciseType?: ExerciseType,
): { suggestedWeight: number; suggestedReps: number; action: "increase_weight" | "increase_reps" } {
  const type = exerciseType ?? classifyExercise(exerciseName);

  if (type === "bodyweight" || currentWeight === 0) {
    return {
      suggestedWeight: 0,
      suggestedReps: currentReps + (currentReps < 15 ? 2 : 1),
      action: "increase_reps",
    };
  }

  const increment = getWeightIncrement(type, config);
  return {
    suggestedWeight: currentWeight + increment,
    suggestedReps: currentReps,
    action: "increase_weight",
  };
}

/**
 * Count consecutive failures (sessions where NOT all sets were completed),
 * counting from the most recent session backwards.
 */
export function getConsecutiveFailures(sessions: ExerciseSession[]): number {
  if (sessions.length === 0) return 0;
  let count = 0;
  for (let i = sessions.length - 1; i >= 0; i--) {
    if (!sessions[i].allSetsCompleted) {
      count++;
    } else {
      break;
    }
  }
  return count;
}

/**
 * Calculate deload suggestion.
 * Reduces weight by the configured deload percentage.
 */
export function calculateDeload(
  exerciseName: string,
  currentWeight: number,
  consecutiveFailures: number,
  config: ProgressionConfig = DEFAULT_CONFIG,
  exerciseType?: ExerciseType,
): DeloadSuggestion {
  const type = exerciseType ?? classifyExercise(exerciseName);
  const reduction = currentWeight * config.deloadPercent;
  // Round to nearest 1.25 kg
  const suggestedWeight = Math.max(0, Math.round((currentWeight - reduction) / 1.25) * 1.25);

  return {
    exerciseName,
    exerciseType: type,
    currentWeight,
    suggestedWeight,
    consecutiveFailures,
    message: buildDeloadMessage(exerciseName, currentWeight, suggestedWeight, consecutiveFailures),
  };
}

/**
 * Build a human-readable deload message.
 */
export function buildDeloadMessage(
  exerciseName: string,
  currentWeight: number,
  suggestedWeight: number,
  consecutiveFailures: number,
): string {
  if (currentWeight === 0) {
    return `You've struggled with ${exerciseName} for ${consecutiveFailures} sessions. Consider reducing the difficulty or taking extra rest.`;
  }
  const reduction = currentWeight - suggestedWeight;
  return `You've missed sets on ${exerciseName} for ${consecutiveFailures} sessions in a row. Consider a deload: drop from ${currentWeight}kg to ${suggestedWeight}kg (-${reduction.toFixed(1)}kg) and build back up.`;
}

/**
 * Build a human-readable progression message.
 */
export function buildProgressionMessage(
  suggestion: Pick<ProgressionSuggestion, "exerciseName" | "exerciseType" | "mode" | "currentWeight" | "currentReps" | "suggestedWeight" | "suggestedReps" | "consecutiveCompletions" | "action">,
): string {
  const { exerciseName, exerciseType, mode, currentWeight, currentReps, suggestedWeight, suggestedReps, consecutiveCompletions, action } = suggestion;
  const streak = `${consecutiveCompletions} sessions in a row`;

  if (exerciseType === "bodyweight" || currentWeight === 0) {
    return `You've crushed ${exerciseName} for ${streak}! Level up from ${currentReps} to ${suggestedReps} reps.`;
  }

  if (action === "increase_reps") {
    return `You've completed all sets of ${exerciseName} for ${streak}! Increase reps from ${currentReps} to ${suggestedReps} (same weight: ${currentWeight}kg).`;
  }

  const weightDiff = suggestedWeight - currentWeight;
  if (mode === "double") {
    return `You've maxed out the rep range on ${exerciseName} for ${streak}! Increase weight from ${currentWeight}kg to ${suggestedWeight}kg (+${weightDiff}kg) and reset reps to ${suggestedReps}.`;
  }

  return `You've completed all sets of ${exerciseName} for ${streak}! Ready to increase from ${currentWeight}kg to ${suggestedWeight}kg (+${weightDiff}kg).`;
}

/**
 * Determine the confidence level of a progression suggestion based on
 * the number of consecutive completions.
 */
export function getConfidence(
  consecutiveCompletions: number,
  threshold: number,
): "high" | "medium" | "low" {
  if (consecutiveCompletions >= threshold + 2) return "high";
  if (consecutiveCompletions >= threshold) return "medium";
  return "low";
}

/**
 * Analyze exercise history and produce a progression suggestion.
 *
 * This is the main pure analysis function. It examines the session history
 * for a single exercise and returns a suggestion (or null if no action needed).
 */
export function analyzeExercise(
  exerciseName: string,
  sessions: ExerciseSession[],
  config: ProgressionConfig = DEFAULT_CONFIG,
): ProgressionSuggestion | null {
  if (sessions.length === 0) return null;

  const exerciseType = classifyExercise(exerciseName);
  const latest = sessions[sessions.length - 1];
  const currentWeight = latest.weight;
  const currentReps = latest.reps;

  // Check for deload first
  const failures = getConsecutiveFailures(sessions);
  if (failures >= config.deloadThreshold && currentWeight > 0) {
    const deload = calculateDeload(exerciseName, currentWeight, failures, config, exerciseType);
    return {
      exerciseName,
      exerciseType,
      mode: config.mode,
      currentWeight,
      currentReps,
      suggestedWeight: deload.suggestedWeight,
      suggestedReps: currentReps,
      consecutiveCompletions: 0,
      action: "deload",
      message: deload.message,
      confidence: "high",
    };
  }

  // Check for progression
  const completions = getConsecutiveCompletions(sessions);
  if (completions < config.consecutiveThreshold) {
    // Not enough consecutive completions yet
    return {
      exerciseName,
      exerciseType,
      mode: config.mode,
      currentWeight,
      currentReps,
      suggestedWeight: currentWeight,
      suggestedReps: currentReps,
      consecutiveCompletions: completions,
      action: "maintain",
      message: `Keep going with ${exerciseName} at ${currentWeight > 0 ? `${currentWeight}kg x ${currentReps}` : `${currentReps} reps`}. ${config.consecutiveThreshold - completions} more successful session${config.consecutiveThreshold - completions > 1 ? "s" : ""} until level-up!`,
      confidence: "low",
    };
  }

  // Calculate progression based on mode
  const calc = config.mode === "double"
    ? calculateDoubleProgression(exerciseName, currentWeight, currentReps, config, exerciseType)
    : calculateLinearProgression(exerciseName, currentWeight, currentReps, config, exerciseType);

  const suggestion: ProgressionSuggestion = {
    exerciseName,
    exerciseType,
    mode: config.mode,
    currentWeight,
    currentReps,
    suggestedWeight: calc.suggestedWeight,
    suggestedReps: calc.suggestedReps,
    consecutiveCompletions: completions,
    action: calc.action,
    message: "",
    confidence: getConfidence(completions, config.consecutiveThreshold),
  };

  suggestion.message = buildProgressionMessage(suggestion);
  return suggestion;
}

// ── Async I/O Functions ──────────────────────────────────────────────────────

/**
 * Load the user's progression configuration from AsyncStorage.
 */
export async function loadConfig(): Promise<ProgressionConfig> {
  try {
    const raw = await AsyncStorage.getItem(CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_CONFIG, ...parsed };
    }
  } catch {
    // Fall through to default
  }
  return DEFAULT_CONFIG;
}

/**
 * Save the user's progression configuration to AsyncStorage.
 */
export async function saveConfig(config: ProgressionConfig): Promise<void> {
  await AsyncStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

/**
 * Load saved progression suggestions from AsyncStorage.
 */
export async function loadSuggestions(): Promise<ProgressionSuggestion[]> {
  try {
    const raw = await AsyncStorage.getItem(SUGGESTIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Save progression suggestions to AsyncStorage.
 */
export async function saveSuggestions(suggestions: ProgressionSuggestion[]): Promise<void> {
  await AsyncStorage.setItem(SUGGESTIONS_KEY, JSON.stringify(suggestions));
}

/**
 * Analyze all exercises in the progression history and generate suggestions.
 *
 * This is the main entry point for the progression engine. It:
 * 1. Loads the progression history from workout-progression.ts
 * 2. Loads the user's config
 * 3. Analyzes each exercise
 * 4. Saves actionable suggestions to AsyncStorage
 * 5. Returns all suggestions (including "maintain")
 */
export async function analyzeAllExercises(): Promise<ProgressionSuggestion[]> {
  const [history, config] = await Promise.all([
    loadProgressionHistory(),
    loadConfig(),
  ]);

  const suggestions: ProgressionSuggestion[] = [];

  for (const [name, data] of Object.entries(history)) {
    const suggestion = analyzeExercise(name, data.sessions, config);
    if (suggestion) {
      suggestions.push(suggestion);
    }
  }

  // Save only actionable suggestions (not "maintain")
  const actionable = suggestions.filter((s) => s.action !== "maintain");
  await saveSuggestions(actionable);

  return suggestions;
}

/**
 * Get a summary of the user's progression status.
 */
export async function getProgressionSummary(): Promise<{
  totalExercises: number;
  readyToProgress: number;
  needsDeload: number;
  maintaining: number;
  topSuggestion: ProgressionSuggestion | null;
}> {
  const suggestions = await analyzeAllExercises();

  const readyToProgress = suggestions.filter(
    (s) => s.action === "increase_weight" || s.action === "increase_reps",
  ).length;
  const needsDeload = suggestions.filter((s) => s.action === "deload").length;
  const maintaining = suggestions.filter((s) => s.action === "maintain").length;

  // Top suggestion: prioritize deloads, then progressions
  const deloads = suggestions.filter((s) => s.action === "deload");
  const progressions = suggestions.filter(
    (s) => s.action === "increase_weight" || s.action === "increase_reps",
  );
  const topSuggestion = deloads[0] ?? progressions[0] ?? null;

  return {
    totalExercises: suggestions.length,
    readyToProgress,
    needsDeload,
    maintaining,
    topSuggestion,
  };
}
