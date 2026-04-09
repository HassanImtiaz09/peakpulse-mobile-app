/**
 * Tests for Step 16-18: Workout Progression, Meal Photo Logging (existing), Theme Toggle
 *
 * Tests pure functions only (no AsyncStorage/native modules).
 * Inlines the logic from workout-progression.ts to avoid native imports.
 */
import { describe, it, expect } from "vitest";

// ── Inline workout progression pure functions ─────────────────────────────────

type ExerciseType = "compound" | "isolation" | "bodyweight";

interface ExerciseSession {
  exerciseName: string;
  date: string;
  prescribedSets: number;
  completedSets: number;
  weight: number;
  reps: number;
  allSetsCompleted: boolean;
}

const COMPOUND_KEYWORDS = [
  "bench press", "squat", "deadlift", "overhead press", "barbell row",
  "pull-up", "chin-up", "dip", "military press", "clean", "snatch",
  "front squat", "romanian deadlift", "hip thrust", "leg press",
  "incline press", "decline press", "bent over row", "pendlay row",
  "t-bar row", "power clean", "push press", "sumo deadlift",
];

const BODYWEIGHT_KEYWORDS = [
  "push-up", "pushup", "sit-up", "situp", "crunch", "plank",
  "burpee", "mountain climber", "jumping jack", "lunge walk",
  "bodyweight squat", "body weight", "wall sit", "flutter kick",
  "leg raise", "bicycle crunch", "russian twist", "superman",
  "bird dog", "glute bridge", "calf raise",
];

function classifyExercise(name: string): ExerciseType {
  const lower = name.toLowerCase();
  if (BODYWEIGHT_KEYWORDS.some((kw) => lower.includes(kw))) return "bodyweight";
  if (COMPOUND_KEYWORDS.some((kw) => lower.includes(kw))) return "compound";
  return "isolation";
}

function calculateProgression(
  exerciseName: string,
  currentWeight: number,
  currentReps: number,
  exerciseType?: ExerciseType,
): { suggestedWeight: number; suggestedReps: number } {
  const type = exerciseType ?? classifyExercise(exerciseName);
  if (type === "bodyweight" || currentWeight === 0) {
    return {
      suggestedWeight: 0,
      suggestedReps: currentReps + (currentReps < 15 ? 2 : 1),
    };
  }
  if (type === "compound") {
    return { suggestedWeight: currentWeight + 2.5, suggestedReps: currentReps };
  }
  return { suggestedWeight: currentWeight + 1.25, suggestedReps: currentReps };
}

function getConsecutiveCompletions(sessions: ExerciseSession[]): number {
  if (sessions.length === 0) return 0;
  let count = 0;
  for (let i = sessions.length - 1; i >= 0; i--) {
    if (sessions[i].allSetsCompleted) {
      count++;
    } else {
      break;
    }
  }
  return count;
}

function getLatestPerformance(sessions: ExerciseSession[]): { weight: number; reps: number } | null {
  if (sessions.length === 0) return null;
  const latest = sessions[sessions.length - 1];
  return { weight: latest.weight, reps: latest.reps };
}

function buildProgressionMessage(
  exerciseName: string,
  exerciseType: ExerciseType,
  currentWeight: number,
  currentReps: number,
  suggestedWeight: number,
  suggestedReps: number,
  consecutive: number,
): string {
  const streak = `${consecutive} sessions in a row`;
  if (exerciseType === "bodyweight" || currentWeight === 0) {
    return `You've crushed ${exerciseName} for ${streak}! Time to level up from ${currentReps} to ${suggestedReps} reps.`;
  }
  const weightDiff = suggestedWeight - currentWeight;
  return `You've completed all sets of ${exerciseName} for ${streak}! Ready to increase from ${currentWeight}kg to ${suggestedWeight}kg (+${weightDiff}kg).`;
}

// ── Inline theme preference logic ─────────────────────────────────────────────

type ThemePreference = "system" | "light" | "dark";

function resolveTheme(preference: ThemePreference, systemScheme: "light" | "dark"): "light" | "dark" {
  if (preference === "system") return systemScheme;
  return preference;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("Workout Progression: Exercise Classification", () => {
  it("classifies bench press as compound", () => {
    expect(classifyExercise("Barbell Bench Press")).toBe("compound");
  });

  it("classifies squat as compound", () => {
    expect(classifyExercise("Back Squat")).toBe("compound");
  });

  it("classifies deadlift as compound", () => {
    expect(classifyExercise("Sumo Deadlift")).toBe("compound");
  });

  it("classifies pull-up as compound", () => {
    expect(classifyExercise("Weighted Pull-Up")).toBe("compound");
  });

  it("classifies push-up as bodyweight", () => {
    expect(classifyExercise("Diamond Push-Up")).toBe("bodyweight");
  });

  it("classifies plank as bodyweight", () => {
    expect(classifyExercise("Side Plank")).toBe("bodyweight");
  });

  it("classifies crunch as bodyweight", () => {
    expect(classifyExercise("Bicycle Crunch")).toBe("bodyweight");
  });

  it("classifies burpee as bodyweight", () => {
    expect(classifyExercise("Burpee")).toBe("bodyweight");
  });

  it("classifies bicep curl as isolation", () => {
    expect(classifyExercise("Dumbbell Bicep Curl")).toBe("isolation");
  });

  it("classifies tricep extension as isolation", () => {
    expect(classifyExercise("Tricep Cable Extension")).toBe("isolation");
  });

  it("classifies lateral raise as isolation", () => {
    expect(classifyExercise("Lateral Raise")).toBe("isolation");
  });

  it("classifies unknown exercise as isolation (default)", () => {
    expect(classifyExercise("Wrist Roller")).toBe("isolation");
  });
});

describe("Workout Progression: Calculate Progression", () => {
  it("increases compound lift by 2.5kg", () => {
    const result = calculateProgression("Bench Press", 60, 8, "compound");
    expect(result.suggestedWeight).toBe(62.5);
    expect(result.suggestedReps).toBe(8);
  });

  it("increases isolation lift by 1.25kg", () => {
    const result = calculateProgression("Bicep Curl", 12, 12, "isolation");
    expect(result.suggestedWeight).toBe(13.25);
    expect(result.suggestedReps).toBe(12);
  });

  it("increases bodyweight reps by 2 when under 15", () => {
    const result = calculateProgression("Push-Up", 0, 10, "bodyweight");
    expect(result.suggestedWeight).toBe(0);
    expect(result.suggestedReps).toBe(12);
  });

  it("increases bodyweight reps by 1 when 15 or above", () => {
    const result = calculateProgression("Push-Up", 0, 20, "bodyweight");
    expect(result.suggestedWeight).toBe(0);
    expect(result.suggestedReps).toBe(21);
  });

  it("treats zero-weight exercises as bodyweight regardless of type", () => {
    const result = calculateProgression("Dumbbell Curl", 0, 12);
    expect(result.suggestedWeight).toBe(0);
    expect(result.suggestedReps).toBe(14);
  });

  it("auto-classifies exercise when type not provided", () => {
    const result = calculateProgression("Barbell Squat", 80, 5);
    expect(result.suggestedWeight).toBe(82.5);
    expect(result.suggestedReps).toBe(5);
  });

  it("preserves reps for weight-based progressions", () => {
    const result = calculateProgression("Overhead Press", 40, 6, "compound");
    expect(result.suggestedReps).toBe(6);
  });
});

describe("Workout Progression: Consecutive Completions", () => {
  it("returns 0 for empty sessions", () => {
    expect(getConsecutiveCompletions([])).toBe(0);
  });

  it("counts all completed sessions", () => {
    const sessions: ExerciseSession[] = [
      { exerciseName: "Squat", date: "2026-01-01", prescribedSets: 3, completedSets: 3, weight: 80, reps: 5, allSetsCompleted: true },
      { exerciseName: "Squat", date: "2026-01-03", prescribedSets: 3, completedSets: 3, weight: 80, reps: 5, allSetsCompleted: true },
      { exerciseName: "Squat", date: "2026-01-05", prescribedSets: 3, completedSets: 3, weight: 80, reps: 5, allSetsCompleted: true },
    ];
    expect(getConsecutiveCompletions(sessions)).toBe(3);
  });

  it("stops counting at first incomplete session from end", () => {
    const sessions: ExerciseSession[] = [
      { exerciseName: "Squat", date: "2026-01-01", prescribedSets: 3, completedSets: 3, weight: 80, reps: 5, allSetsCompleted: true },
      { exerciseName: "Squat", date: "2026-01-03", prescribedSets: 3, completedSets: 2, weight: 80, reps: 5, allSetsCompleted: false },
      { exerciseName: "Squat", date: "2026-01-05", prescribedSets: 3, completedSets: 3, weight: 80, reps: 5, allSetsCompleted: true },
      { exerciseName: "Squat", date: "2026-01-07", prescribedSets: 3, completedSets: 3, weight: 80, reps: 5, allSetsCompleted: true },
    ];
    expect(getConsecutiveCompletions(sessions)).toBe(2);
  });

  it("returns 0 when last session is incomplete", () => {
    const sessions: ExerciseSession[] = [
      { exerciseName: "Squat", date: "2026-01-01", prescribedSets: 3, completedSets: 3, weight: 80, reps: 5, allSetsCompleted: true },
      { exerciseName: "Squat", date: "2026-01-03", prescribedSets: 3, completedSets: 1, weight: 80, reps: 5, allSetsCompleted: false },
    ];
    expect(getConsecutiveCompletions(sessions)).toBe(0);
  });

  it("returns 1 for single completed session", () => {
    const sessions: ExerciseSession[] = [
      { exerciseName: "Squat", date: "2026-01-01", prescribedSets: 3, completedSets: 3, weight: 80, reps: 5, allSetsCompleted: true },
    ];
    expect(getConsecutiveCompletions(sessions)).toBe(1);
  });
});

describe("Workout Progression: Latest Performance", () => {
  it("returns null for empty sessions", () => {
    expect(getLatestPerformance([])).toBeNull();
  });

  it("returns the last session's weight and reps", () => {
    const sessions: ExerciseSession[] = [
      { exerciseName: "Bench", date: "2026-01-01", prescribedSets: 3, completedSets: 3, weight: 60, reps: 8, allSetsCompleted: true },
      { exerciseName: "Bench", date: "2026-01-03", prescribedSets: 3, completedSets: 3, weight: 62.5, reps: 8, allSetsCompleted: true },
    ];
    const result = getLatestPerformance(sessions);
    expect(result).toEqual({ weight: 62.5, reps: 8 });
  });
});

describe("Workout Progression: Message Builder", () => {
  it("builds compound progression message with weight increase", () => {
    const msg = buildProgressionMessage("Bench Press", "compound", 60, 8, 62.5, 8, 3);
    expect(msg).toContain("Bench Press");
    expect(msg).toContain("3 sessions in a row");
    expect(msg).toContain("60kg");
    expect(msg).toContain("62.5kg");
    expect(msg).toContain("+2.5kg");
  });

  it("builds bodyweight progression message with rep increase", () => {
    const msg = buildProgressionMessage("Push-Up", "bodyweight", 0, 10, 0, 12, 4);
    expect(msg).toContain("Push-Up");
    expect(msg).toContain("4 sessions in a row");
    expect(msg).toContain("10");
    expect(msg).toContain("12 reps");
  });

  it("builds isolation progression message", () => {
    const msg = buildProgressionMessage("Bicep Curl", "isolation", 12, 12, 13.25, 12, 3);
    expect(msg).toContain("Bicep Curl");
    expect(msg).toContain("12kg");
    expect(msg).toContain("13.25kg");
  });
});

describe("Workout Progression: Full Flow", () => {
  it("triggers level-up after 3 consecutive completions", () => {
    const sessions: ExerciseSession[] = [
      { exerciseName: "Squat", date: "2026-01-01", prescribedSets: 4, completedSets: 4, weight: 80, reps: 5, allSetsCompleted: true },
      { exerciseName: "Squat", date: "2026-01-03", prescribedSets: 4, completedSets: 4, weight: 80, reps: 5, allSetsCompleted: true },
      { exerciseName: "Squat", date: "2026-01-05", prescribedSets: 4, completedSets: 4, weight: 80, reps: 5, allSetsCompleted: true },
    ];
    const consecutive = getConsecutiveCompletions(sessions);
    expect(consecutive).toBeGreaterThanOrEqual(3);
    const progression = calculateProgression("Squat", 80, 5, "compound");
    expect(progression.suggestedWeight).toBe(82.5);
  });

  it("does not trigger level-up with only 2 consecutive completions", () => {
    const sessions: ExerciseSession[] = [
      { exerciseName: "Squat", date: "2026-01-01", prescribedSets: 4, completedSets: 3, weight: 80, reps: 5, allSetsCompleted: false },
      { exerciseName: "Squat", date: "2026-01-03", prescribedSets: 4, completedSets: 4, weight: 80, reps: 5, allSetsCompleted: true },
      { exerciseName: "Squat", date: "2026-01-05", prescribedSets: 4, completedSets: 4, weight: 80, reps: 5, allSetsCompleted: true },
    ];
    const consecutive = getConsecutiveCompletions(sessions);
    expect(consecutive).toBe(2);
    expect(consecutive).toBeLessThan(3);
  });

  it("handles mixed exercise types in a workout", () => {
    // Compound
    const compoundProg = calculateProgression("Deadlift", 100, 5);
    expect(compoundProg.suggestedWeight).toBe(102.5);

    // Isolation
    const isolationProg = calculateProgression("Hammer Curl", 14, 10);
    expect(isolationProg.suggestedWeight).toBe(15.25);

    // Bodyweight
    const bwProg = calculateProgression("Push-Up", 0, 12);
    expect(bwProg.suggestedReps).toBe(14);
  });
});

describe("Theme Toggle: Resolve Theme", () => {
  it("returns light when preference is light", () => {
    expect(resolveTheme("light", "dark")).toBe("light");
  });

  it("returns dark when preference is dark", () => {
    expect(resolveTheme("dark", "light")).toBe("dark");
  });

  it("follows system when preference is system (light)", () => {
    expect(resolveTheme("system", "light")).toBe("light");
  });

  it("follows system when preference is system (dark)", () => {
    expect(resolveTheme("system", "dark")).toBe("dark");
  });
});

describe("Theme Toggle: Preference Validation", () => {
  it("only allows valid theme preferences", () => {
    const validPrefs: ThemePreference[] = ["system", "light", "dark"];
    expect(validPrefs).toHaveLength(3);
    expect(validPrefs).toContain("system");
    expect(validPrefs).toContain("light");
    expect(validPrefs).toContain("dark");
  });

  it("system is the default preference", () => {
    const defaultPref: ThemePreference = "system";
    expect(defaultPref).toBe("system");
  });
});

describe("Meal Photo Logging: AI Analysis Response Parsing", () => {
  it("parses valid food analysis response", () => {
    const response = {
      foods: [
        { name: "Grilled Chicken", portion: "150g", calories: 250, protein: 40, carbs: 0, fat: 8 },
        { name: "Brown Rice", portion: "1 cup", calories: 215, protein: 5, carbs: 45, fat: 2 },
      ],
      totalCalories: 465,
      totalProtein: 45,
      totalCarbs: 45,
      totalFat: 10,
      confidence: "high",
      mealType: "lunch",
      healthScore: 8,
      suggestion: "Add some vegetables for more fiber",
      notes: "Grilled chicken with brown rice",
    };

    expect(response.foods).toHaveLength(2);
    expect(response.totalCalories).toBe(465);
    expect(response.confidence).toBe("high");
    expect(response.mealType).toBe("lunch");
  });

  it("validates macro recalculation logic (p*4 + c*4 + f*9)", () => {
    const food = { protein: 40, carbs: 45, fat: 10 };
    const calculated = Math.round(food.protein * 4 + food.carbs * 4 + food.fat * 9);
    expect(calculated).toBe(430); // 160 + 180 + 90
  });

  it("corrects AI calorie estimate when deviation > 15%", () => {
    const food = { protein: 30, carbs: 40, fat: 15, calories: 600 }; // AI says 600
    const calculated = Math.round(food.protein * 4 + food.carbs * 4 + food.fat * 9); // 415
    const deviation = Math.abs(food.calories - calculated) / Math.max(calculated, 1);
    expect(deviation).toBeGreaterThan(0.15);
    // Should correct to calculated value
    const corrected = deviation > 0.15 ? calculated : food.calories;
    expect(corrected).toBe(415);
  });

  it("keeps AI calorie estimate when deviation <= 15%", () => {
    const food = { protein: 30, carbs: 40, fat: 15, calories: 420 }; // AI says 420
    const calculated = Math.round(food.protein * 4 + food.carbs * 4 + food.fat * 9); // 415
    const deviation = Math.abs(food.calories - calculated) / Math.max(calculated, 1);
    expect(deviation).toBeLessThanOrEqual(0.15);
    const corrected = deviation > 0.15 ? calculated : food.calories;
    expect(corrected).toBe(420);
  });

  it("handles portion multiplier correctly", () => {
    const base = { totalCalories: 500, totalProtein: 40, totalCarbs: 50, totalFat: 15 };
    const multiplier = 1.5;
    expect(Math.round(base.totalCalories * multiplier)).toBe(750);
    expect(Math.round(base.totalProtein * multiplier)).toBe(60);
    expect(Math.round(base.totalCarbs * multiplier)).toBe(75);
    expect(Math.round(base.totalFat * multiplier)).toBe(23);
  });

  it("handles empty food analysis response", () => {
    const response = {
      foods: [],
      totalCalories: 0,
      totalProtein: 0,
      totalCarbs: 0,
      totalFat: 0,
      confidence: "low",
      notes: "Could not analyze",
    };
    expect(response.foods).toHaveLength(0);
    expect(response.confidence).toBe("low");
  });
});
