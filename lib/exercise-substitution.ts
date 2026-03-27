/**
 * Exercise Substitution Service
 *
 * Suggests alternative exercises based on shared primary muscle groups,
 * equipment availability, and difficulty level. Used when a user wants
 * to swap an exercise in their workout plan.
 */
import type { MuscleGroup } from "@/components/body-diagram";
import {
  getExercisesByMuscle,
  getExerciseInfo,
  type ExerciseInfo,
} from "@/lib/exercise-data";
import { hasExerciseDbGif } from "@/lib/exercisedb-api";

export interface SubstitutionResult {
  /** The exercise being suggested as a substitute */
  exercise: ExerciseInfo;
  /** How well this substitute matches (0-100) */
  matchScore: number;
  /** Why this exercise is a good substitute */
  reason: string;
  /** Whether this exercise has an animated GIF demo */
  hasGif: boolean;
}

/**
 * Score how well a candidate exercise substitutes for the original.
 * Higher score = better match.
 */
function scoreSubstitution(
  original: ExerciseInfo,
  candidate: ExerciseInfo
): { score: number; reason: string } {
  let score = 0;
  const reasons: string[] = [];

  // Primary muscle overlap (most important — 40 points max)
  const primaryOverlap = original.primaryMuscles.filter((m) =>
    candidate.primaryMuscles.includes(m)
  );
  const primaryScore = Math.min(
    40,
    (primaryOverlap.length / Math.max(original.primaryMuscles.length, 1)) * 40
  );
  score += primaryScore;
  if (primaryOverlap.length > 0) {
    reasons.push(
      `Targets ${primaryOverlap.map((m) => m.replace(/_/g, " ")).join(", ")}`
    );
  }

  // Secondary muscle overlap (20 points max)
  const allOriginalMuscles = [
    ...original.primaryMuscles,
    ...original.secondaryMuscles,
  ];
  const allCandidateMuscles = [
    ...candidate.primaryMuscles,
    ...candidate.secondaryMuscles,
  ];
  const totalOverlap = allOriginalMuscles.filter((m) =>
    allCandidateMuscles.includes(m)
  );
  const secondaryScore = Math.min(
    20,
    (totalOverlap.length / Math.max(allOriginalMuscles.length, 1)) * 20
  );
  score += secondaryScore;

  // Same category bonus (10 points)
  if (original.category === candidate.category) {
    score += 10;
    reasons.push(`Same category (${original.category})`);
  }

  // Same equipment bonus (10 points)
  if (original.equipment === candidate.equipment) {
    score += 10;
    reasons.push(`Same equipment (${original.equipment})`);
  }

  // Same difficulty bonus (5 points)
  if (original.difficulty === candidate.difficulty) {
    score += 5;
  }

  // Similar difficulty bonus (3 points for adjacent levels)
  const difficultyOrder = ["beginner", "intermediate", "advanced"];
  const origIdx = difficultyOrder.indexOf(original.difficulty);
  const candIdx = difficultyOrder.indexOf(candidate.difficulty);
  if (Math.abs(origIdx - candIdx) === 1) {
    score += 3;
  }

  // Has animated GIF bonus (5 points — better for learning)
  if (hasExerciseDbGif(candidate.name)) {
    score += 5;
  }

  // Compound reason
  if (reasons.length === 0 && primaryOverlap.length === 0) {
    reasons.push("Similar movement pattern");
  }

  return { score: Math.min(100, Math.round(score)), reason: reasons.join(" · ") };
}

/**
 * Get exercise substitution suggestions for a given exercise.
 * Returns up to `limit` alternatives sorted by match score.
 */
export function getSubstitutions(
  exerciseName: string,
  limit: number = 8
): SubstitutionResult[] {
  const original = getExerciseInfo(exerciseName);
  if (!original) return [];

  // Collect candidates from all primary muscles
  const candidateSet = new Set<string>();
  const candidates: ExerciseInfo[] = [];

  for (const muscle of original.primaryMuscles) {
    for (const ex of getExercisesByMuscle(muscle)) {
      if (ex.key !== original.key && !candidateSet.has(ex.key)) {
        candidateSet.add(ex.key);
        candidates.push(ex);
      }
    }
  }

  // Score and sort
  const scored: SubstitutionResult[] = candidates.map((candidate) => {
    const { score, reason } = scoreSubstitution(original, candidate);
    return {
      exercise: candidate,
      matchScore: score,
      reason,
      hasGif: hasExerciseDbGif(candidate.name),
    };
  });

  scored.sort((a, b) => b.matchScore - a.matchScore);

  return scored.slice(0, limit);
}

/**
 * Get substitutions filtered by specific constraints.
 */
export function getFilteredSubstitutions(
  exerciseName: string,
  options: {
    equipment?: string;
    difficulty?: "beginner" | "intermediate" | "advanced";
    muscle?: MuscleGroup;
    limit?: number;
  } = {}
): SubstitutionResult[] {
  let results = getSubstitutions(exerciseName, 20);

  if (options.equipment) {
    results = results.filter(
      (r) => r.exercise.equipment.toLowerCase() === options.equipment!.toLowerCase()
    );
  }

  if (options.difficulty) {
    results = results.filter(
      (r) => r.exercise.difficulty === options.difficulty
    );
  }

  if (options.muscle) {
    results = results.filter(
      (r) =>
        r.exercise.primaryMuscles.includes(options.muscle!) ||
        r.exercise.secondaryMuscles.includes(options.muscle!)
    );
  }

  return results.slice(0, options.limit ?? 8);
}

/**
 * Get all unique equipment types from exercises that target a muscle.
 */
export function getEquipmentForMuscle(muscle: MuscleGroup): string[] {
  const exercises = getExercisesByMuscle(muscle);
  const equipmentSet = new Set(exercises.map((e) => e.equipment));
  return Array.from(equipmentSet).sort();
}
