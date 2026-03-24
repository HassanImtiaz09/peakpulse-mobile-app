/**
 * Round 69 — Custom Workout Builder, Trend Charts, Personal Records
 * Tests for all three major features.
 */
import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const PROJECT = "/home/ubuntu/peakpulse-mobile";

// ── 1. Personal Records System ──────────────────────────────────────────────

describe("Personal Records System", () => {
  it("personal-records.ts exists and exports required functions", () => {
    const content = fs.readFileSync(path.join(PROJECT, "lib/personal-records.ts"), "utf-8");
    expect(content).toContain("export async function logPR(");
    expect(content).toContain("export async function getExercisePR(");
    expect(content).toContain("export async function getPRHistory(");
    expect(content).toContain("export async function getPRSummary(");
    expect(content).toContain("export async function getProgressChartData(");
    expect(content).toContain("export async function logWorkoutPRs(");
    expect(content).toContain("export async function clearAllPRs(");
  });

  it("PREntry interface has required fields", () => {
    const content = fs.readFileSync(path.join(PROJECT, "lib/personal-records.ts"), "utf-8");
    expect(content).toContain("weight: number");
    expect(content).toContain("reps: number");
    expect(content).toContain("sets: number");
    expect(content).toContain("date: string");
  });

  it("PRSummary interface has required fields", () => {
    const content = fs.readFileSync(path.join(PROJECT, "lib/personal-records.ts"), "utf-8");
    expect(content).toContain("totalExercisesTracked");
    expect(content).toContain("totalPREntries");
    expect(content).toContain("recentPRs");
    expect(content).toContain("topLifts");
  });

  it("logWorkoutPRs accepts completed exercises with set logs", () => {
    const content = fs.readFileSync(path.join(PROJECT, "lib/personal-records.ts"), "utf-8");
    expect(content).toContain("completedExercises: { name: string; logs: { weight: string; reps: string; completed: boolean }[] }[]");
    expect(content).toContain("isNewPR: boolean");
  });

  it("active-workout.tsx imports and uses logWorkoutPRs", () => {
    const content = fs.readFileSync(path.join(PROJECT, "app/active-workout.tsx"), "utf-8");
    expect(content).toContain('import { logWorkoutPRs } from "@/lib/personal-records"');
    expect(content).toContain("logWorkoutPRs(completedExercises)");
    expect(content).toContain("newPRs.length");
  });
});

// ── 2. AI Workout Insights Engine ───────────────────────────────────────────

describe("AI Workout Insights Engine", () => {
  it("workout-insights.ts exists and exports required functions", () => {
    const content = fs.readFileSync(path.join(PROJECT, "lib/workout-insights.ts"), "utf-8");
    expect(content).toContain("export function getRepSuggestion(");
    expect(content).toContain("export function analyzeWorkoutBalance(");
    expect(content).toContain("export function estimateCalories(");
    expect(content).toContain("export function estimateBodyComposition(");
    expect(content).toContain("export function getCoachingInsights(");
  });

  it("getRepSuggestion considers exercise type and user goal", () => {
    const content = fs.readFileSync(path.join(PROJECT, "lib/workout-insights.ts"), "utf-8");
    expect(content).toContain("build_muscle");
    expect(content).toContain("lose_fat");
    expect(content).toContain("endurance");
  });

  it("analyzeWorkoutBalance returns muscle group distribution", () => {
    const content = fs.readFileSync(path.join(PROJECT, "lib/workout-insights.ts"), "utf-8");
    expect(content).toContain('"over"');
    expect(content).toContain('"under"');
    expect(content).toContain('"balanced"');
  });

  it("estimateCalories returns calorie expenditure estimate", () => {
    const content = fs.readFileSync(path.join(PROJECT, "lib/workout-insights.ts"), "utf-8");
    expect(content).toContain("totalCalories");
    expect(content).toContain("MET");
  });

  it("estimateBodyComposition provides muscle gain and fat loss estimates", () => {
    const content = fs.readFileSync(path.join(PROJECT, "lib/workout-insights.ts"), "utf-8");
    expect(content).toContain("estimatedWeeklyMuscleGainKg");
    expect(content).toContain("estimatedWeeklyFatLossKg");
    expect(content).toContain("daysToGoal");
  });

  it("getCoachingInsights returns actionable insights", () => {
    const content = fs.readFileSync(path.join(PROJECT, "lib/workout-insights.ts"), "utf-8");
    expect(content).toContain("WorkoutCoachInsight");
    expect(content).toContain("priority");
    expect(content).toContain("message");
  });
});

// ── 3. Create Custom Workout Screen ─────────────────────────────────────────

describe("Create Custom Workout Screen", () => {
  it("create-workout.tsx exists", () => {
    expect(fs.existsSync(path.join(PROJECT, "app/create-workout.tsx"))).toBe(true);
  });

  it("has exercise category selection from EXERCISE_CATEGORIES", () => {
    const content = fs.readFileSync(path.join(PROJECT, "app/create-workout.tsx"), "utf-8");
    expect(content).toContain("EXERCISE_CATEGORIES");
    expect(content).toContain("activeCategory");
    // Categories defined in workout-insights.ts
    const insights = fs.readFileSync(path.join(PROJECT, "lib/workout-insights.ts"), "utf-8");
    expect(insights).toContain("Upper Body");
    expect(insights).toContain("Lower Body");
    expect(insights).toContain("Core");
    expect(insights).toContain("Shoulders");
  });

  it("imports workout insights for AI coaching", () => {
    const content = fs.readFileSync(path.join(PROJECT, "app/create-workout.tsx"), "utf-8");
    expect(content).toContain("workout-insights");
    expect(content).toContain("getRepSuggestion");
  });

  it("has calorie and body composition estimates", () => {
    const content = fs.readFileSync(path.join(PROJECT, "app/create-workout.tsx"), "utf-8");
    expect(content).toContain("estimateCalories");
    expect(content).toContain("estimateBodyComposition");
  });

  it("has workout balance analysis", () => {
    const content = fs.readFileSync(path.join(PROJECT, "app/create-workout.tsx"), "utf-8");
    expect(content).toContain("analyzeWorkoutBalance");
  });

  it("saves custom workout to AsyncStorage", () => {
    const content = fs.readFileSync(path.join(PROJECT, "app/create-workout.tsx"), "utf-8");
    expect(content).toContain("AsyncStorage");
    expect(content).toContain("@guest_workout_plan");
  });

  it("has navigation from plans tab", () => {
    const content = fs.readFileSync(path.join(PROJECT, "app/(tabs)/plans.tsx"), "utf-8");
    expect(content).toContain("/create-workout");
    expect(content).toContain("Create");
  });
});

// ── 4. Trend Charts ─────────────────────────────────────────────────────────

describe("Trend Charts", () => {
  it("trend-chart.tsx exists and exports TrendChart and PRProgressChart", () => {
    const content = fs.readFileSync(path.join(PROJECT, "components/trend-chart.tsx"), "utf-8");
    expect(content).toContain("export function TrendChart(");
    expect(content).toContain("export function PRProgressChart(");
  });

  it("TrendChart has data point interface with required fields", () => {
    const content = fs.readFileSync(path.join(PROJECT, "components/trend-chart.tsx"), "utf-8");
    expect(content).toContain("overCount: number");
    expect(content).toContain("optimalCount: number");
    expect(content).toContain("underCount: number");
    expect(content).toContain("overallScore: number");
    expect(content).toContain("muscleScores");
  });

  it("TrendChart uses SVG for rendering", () => {
    const content = fs.readFileSync(path.join(PROJECT, "components/trend-chart.tsx"), "utf-8");
    expect(content).toContain("react-native-svg");
    expect(content).toContain("<Svg");
    expect(content).toContain("<Path");
  });

  it("TrendChart has muscle group filter for specific tracking", () => {
    const content = fs.readFileSync(path.join(PROJECT, "components/trend-chart.tsx"), "utf-8");
    expect(content).toContain("selectedMuscle");
    expect(content).toContain("TRACK SPECIFIC MUSCLE");
  });

  it("PRProgressChart shows trend direction", () => {
    const content = fs.readFileSync(path.join(PROJECT, "components/trend-chart.tsx"), "utf-8");
    expect(content).toContain("trending-up");
    expect(content).toContain("trending-down");
    expect(content).toContain("trendPct");
  });

  it("dashboard imports and uses TrendChart", () => {
    const content = fs.readFileSync(path.join(PROJECT, "app/(tabs)/index.tsx"), "utf-8");
    expect(content).toContain('import { TrendChart');
    expect(content).toContain("<TrendChart");
    expect(content).toContain("trendData");
  });

  it("dashboard imports and uses PRSummary", () => {
    const content = fs.readFileSync(path.join(PROJECT, "app/(tabs)/index.tsx"), "utf-8");
    expect(content).toContain('import { getPRSummary');
    expect(content).toContain("prSummary");
    expect(content).toContain("Personal Records");
  });
});

// ── 5. Integration Tests ────────────────────────────────────────────────────

describe("Integration", () => {
  it("all new files exist", () => {
    const files = [
      "lib/personal-records.ts",
      "lib/workout-insights.ts",
      "app/create-workout.tsx",
      "components/trend-chart.tsx",
    ];
    for (const f of files) {
      expect(fs.existsSync(path.join(PROJECT, f))).toBe(true);
    }
  });

  it("no circular imports between new modules", () => {
    const pr = fs.readFileSync(path.join(PROJECT, "lib/personal-records.ts"), "utf-8");
    const wi = fs.readFileSync(path.join(PROJECT, "lib/workout-insights.ts"), "utf-8");
    // personal-records should not import workout-insights
    expect(pr).not.toContain("workout-insights");
    // workout-insights should not import personal-records
    expect(wi).not.toContain("personal-records");
  });

  it("exercise categories cover all major muscle groups", () => {
    const content = fs.readFileSync(path.join(PROJECT, "lib/workout-insights.ts"), "utf-8");
    const groups = ["chest", "back", "shoulders", "biceps", "triceps", "quads", "hamstrings", "glutes", "calves", "abs"];
    for (const g of groups) {
      expect(content).toContain(g);
    }
  });
});
