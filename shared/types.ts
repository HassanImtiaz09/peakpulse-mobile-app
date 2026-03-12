/**
 * Unified type exports
 * Import shared types from this single entry point.
 */

export type * from "../drizzle/schema";
export * from "./_core/errors";

// ─── PeakPulse AI App Types ───────────────────────────────────────────────────

export interface Exercise {
  name: string;
  sets: string;
  rest: string;
  notes?: string;
}

export interface WorkoutDay {
  day: string;
  focus: string;
  isRest: boolean;
  exercises: Exercise[];
}

export interface Meal {
  name: string;
  type: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  ingredients?: string[];
  prepTime?: string;
}

export interface MealDay {
  day: string;
  meals: Meal[];
}

export interface MealPlanData {
  dailyCalories: number;
  proteinTarget: number;
  carbTarget: number;
  fatTarget: number;
  dietType: string;
  days: MealDay[];
  insight?: string;
}

export interface Transformation {
  target_bf: number;
  description: string;
  estimated_weeks: number;
  effort_level: string;
  imageUrl?: string | null;
}

export interface BodyScanResult {
  id?: number;
  estimatedBodyFat: number;
  confidenceLow: number;
  confidenceHigh: number;
  muscleMassEstimate: string;
  analysisNotes: string;
  transformations: Transformation[];
}

export interface MealLogEntry {
  id?: number;
  name: string;
  mealType?: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  photoUrl?: string;
  loggedAt?: string;
}

export interface MealPrepRecipe {
  name: string;
  servings: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  ingredients: string[];
  instructions: string[];
  storageInstructions: string;
  mealType: string;
}

export interface MealPrepPlan {
  prepTime: string;
  recipes: MealPrepRecipe[];
  shoppingList: string[];
  tips: string[];
}
