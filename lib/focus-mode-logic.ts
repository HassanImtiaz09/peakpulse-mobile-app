/**
 * Focus Mode — Pure logic functions.
 * Extracted for testability (vitest can't parse JSX in .tsx files).
 */

interface SetLog {
  weight: string;
  reps: string;
  completed: boolean;
}

export function getProgressPercentage(
  currentIndex: number,
  total: number,
  completedSetsForCurrent: number,
  totalSetsForCurrent: number
): number {
  if (total === 0) return 0;
  const exerciseProgress = currentIndex / total;
  const setProgress =
    totalSetsForCurrent > 0
      ? completedSetsForCurrent / totalSetsForCurrent / total
      : 0;
  return Math.min(100, (exerciseProgress + setProgress) * 100);
}

export function shouldAutoAdvance(
  logs: SetLog[],
  currentIndex: number,
  totalExercises: number
): boolean {
  if (logs.length === 0) return false;
  const allDone = logs.every((l) => l.completed);
  return allDone && currentIndex < totalExercises - 1;
}

export function getMotivationalMessage(
  currentIndex: number,
  totalExercises: number,
  allSetsDone: boolean
): string {
  if (allSetsDone && currentIndex === totalExercises - 1) {
    return "Last exercise done — finish strong!";
  }
  if (allSetsDone) {
    return "All sets done — moving on!";
  }
  if (currentIndex === 0) {
    return "Let's get started.";
  }
  const remaining = totalExercises - currentIndex;
  if (remaining <= 2) {
    return `Almost there — ${remaining} to go.`;
  }
  return `${currentIndex} down, ${remaining} to go.`;
}
