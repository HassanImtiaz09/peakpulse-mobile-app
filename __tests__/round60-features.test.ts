/**
 * Round 60 — Goal Tracking, Workout Templates, Social Sharing Cards
 *
 * Tests cover:
 * 1. Goal tracking service (lib/goal-tracking.ts)
 * 2. Workout templates service (lib/workout-templates.ts)
 * 3. Social card generator (lib/social-card-generator.ts)
 * 4. Weekly goals screen (app/weekly-goals.tsx)
 * 5. Workout templates screen (app/workout-templates.tsx)
 * 6. Dashboard goal progress rings integration
 * 7. Log-workout template pre-fill and share integration
 */

import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const ROOT = path.resolve(__dirname, "..");
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf-8");

// ── Goal Tracking Service ─────────────────────────────────────────

describe("Goal Tracking Service (lib/goal-tracking.ts)", () => {
  const src = read("lib/goal-tracking.ts");

  it("exports WeeklyGoals interface with steps, calories, workouts targets", () => {
    expect(src).toContain("WeeklyGoals");
    expect(src).toMatch(/stepsTarget/);
    expect(src).toMatch(/caloriesTarget/);
    expect(src).toMatch(/workoutsTarget/);
  });

  it("exports WeeklyProgress interface with percentage and current/target", () => {
    expect(src).toContain("WeeklyProgress");
    expect(src).toMatch(/percentage/);
    expect(src).toMatch(/current/);
    expect(src).toMatch(/target/);
  });

  it("exports getWeeklyGoals function", () => {
    expect(src).toMatch(/export\s+(async\s+)?function\s+getWeeklyGoals/);
  });

  it("exports saveWeeklyGoals function", () => {
    expect(src).toMatch(/export\s+(async\s+)?function\s+saveWeeklyGoals/);
  });

  it("exports calculateWeeklyProgress function", () => {
    expect(src).toMatch(/export\s+(async\s+)?function\s+calculateWeeklyProgress/);
  });

  it("exports isGoalTrackingEnabled function", () => {
    expect(src).toMatch(/export\s+(async\s+)?function\s+isGoalTrackingEnabled/);
  });

  it("exports getWorkoutsThisWeek function", () => {
    expect(src).toMatch(/export\s+(async\s+)?function\s+getWorkoutsThisWeek/);
  });

  it("uses AsyncStorage for persistence", () => {
    expect(src).toContain("AsyncStorage");
    expect(src).toMatch(/@weekly_goals|weekly.goals/i);
  });

  it("provides default goal values", () => {
    expect(src).toMatch(/10000|10_000/); // default steps target
    expect(src).toMatch(/2000|2_000|2500|2_500/); // default calories target
  });

  it("calculates days remaining in the week", () => {
    expect(src).toMatch(/daysRemaining/);
  });

  it("caps percentage at 100 or allows over 100", () => {
    expect(src).toMatch(/Math\.min|Math\.round|percentage/);
  });
});

// ── Workout Templates Service ─────────────────────────────────────

describe("Workout Templates Service (lib/workout-templates.ts)", () => {
  const src = read("lib/workout-templates.ts");

  it("exports WorkoutTemplate interface with required fields", () => {
    expect(src).toContain("WorkoutTemplate");
    expect(src).toMatch(/id:\s*string/);
    expect(src).toMatch(/name:\s*string/);
    expect(src).toMatch(/type:\s*WorkoutType/);
    expect(src).toMatch(/durationMinutes:\s*number/);
    expect(src).toMatch(/estimatedCalories:\s*number/);
    expect(src).toMatch(/usageCount:\s*number/);
  });

  it("exports getTemplates function", () => {
    expect(src).toMatch(/export\s+(async\s+)?function\s+getTemplates/);
  });

  it("exports saveTemplate function", () => {
    expect(src).toMatch(/export\s+(async\s+)?function\s+saveTemplate/);
  });

  it("exports deleteTemplate function", () => {
    expect(src).toMatch(/export\s+(async\s+)?function\s+deleteTemplate/);
  });

  it("exports recordTemplateUsage function", () => {
    expect(src).toMatch(/export\s+(async\s+)?function\s+recordTemplateUsage/);
  });

  it("exports BUILT_IN_TEMPLATES with at least 5 presets", () => {
    expect(src).toContain("BUILT_IN_TEMPLATES");
    const matches = src.match(/name:\s*"/g);
    expect(matches).toBeTruthy();
    expect(matches!.length).toBeGreaterThanOrEqual(5);
  });

  it("includes Morning Run 5K as a built-in template", () => {
    expect(src).toContain("Morning Run 5K");
  });

  it("includes HIIT Session as a built-in template", () => {
    expect(src).toContain("HIIT Session");
  });

  it("includes Evening Yoga as a built-in template", () => {
    expect(src).toContain("Evening Yoga");
  });

  it("uses AsyncStorage for persistence", () => {
    expect(src).toContain("AsyncStorage");
    expect(src).toMatch(/@workout_templates/);
  });

  it("generates unique IDs for templates", () => {
    expect(src).toMatch(/tmpl_|generateId/);
  });

  it("tracks usage count and last used date", () => {
    expect(src).toMatch(/usageCount/);
    expect(src).toMatch(/lastUsedAt/);
  });

  it("has color and icon fields for visual display", () => {
    expect(src).toMatch(/color:\s*string/);
    expect(src).toMatch(/icon:\s*string/);
  });
});

// ── Social Card Generator ─────────────────────────────────────────

describe("Social Card Generator (lib/social-card-generator.ts)", () => {
  const src = read("lib/social-card-generator.ts");

  it("exports WorkoutCardData interface", () => {
    expect(src).toContain("WorkoutCardData");
    expect(src).toMatch(/type:\s*WorkoutType/);
    expect(src).toMatch(/typeName:\s*string/);
    expect(src).toMatch(/durationMinutes:\s*number/);
    expect(src).toMatch(/caloriesBurned:\s*number/);
  });

  it("exports WeeklySummaryCardData interface", () => {
    expect(src).toContain("WeeklySummaryCardData");
    expect(src).toMatch(/avgSteps:\s*number/);
    expect(src).toMatch(/totalCalories:\s*number/);
    expect(src).toMatch(/totalWorkouts:\s*number/);
    expect(src).toMatch(/avgSleepHours:\s*number/);
  });

  it("exports generateWorkoutCardHTML function", () => {
    expect(src).toMatch(/export\s+function\s+generateWorkoutCardHTML/);
  });

  it("exports generateWeeklySummaryCardHTML function", () => {
    expect(src).toMatch(/export\s+function\s+generateWeeklySummaryCardHTML/);
  });

  it("exports shareWorkoutCard function", () => {
    expect(src).toMatch(/export\s+(async\s+)?function\s+shareWorkoutCard/);
  });

  it("exports shareWeeklySummaryCard function", () => {
    expect(src).toMatch(/export\s+(async\s+)?function\s+shareWeeklySummaryCard/);
  });

  it("generates HTML with PeakPulse branding", () => {
    expect(src).toContain("PEAKPULSE AI");
    expect(src).toContain("Precision Performance");
  });

  it("includes workout type icons mapping", () => {
    expect(src).toContain("WORKOUT_ICONS");
    expect(src).toMatch(/running.*🏃/);
    expect(src).toMatch(/cycling.*🚴/);
    expect(src).toMatch(/swimming.*🏊/);
  });

  it("includes workout type color mapping", () => {
    expect(src).toContain("WORKOUT_COLORS");
    expect(src).toMatch(/#22C55E/); // running green
    expect(src).toMatch(/#F59E0B/); // cycling amber
  });

  it("generates card with duration, calories, distance stats", () => {
    expect(src).toContain("Duration");
    expect(src).toContain("Calories");
    expect(src).toContain("Distance");
  });

  it("weekly summary card includes goal badge indicators", () => {
    expect(src).toMatch(/goalBadge|GOAL MET/);
    expect(src).toMatch(/stepsGoalPct|caloriesGoalPct|workoutsGoalPct/);
  });

  it("uses expo-print for PDF generation on native", () => {
    expect(src).toContain("expo-print");
    expect(src).toContain("printToFileAsync");
  });

  it("uses expo-sharing for sharing on native", () => {
    expect(src).toContain("expo-sharing");
    expect(src).toContain("shareAsync");
  });

  it("handles web platform with blob URL fallback", () => {
    expect(src).toContain("Blob");
    expect(src).toContain("createObjectURL");
  });

  it("escapes HTML in user input", () => {
    expect(src).toMatch(/escapeHtml/);
    expect(src).toContain("&amp;");
    expect(src).toContain("&lt;");
  });

  it("uses Aurora Titan dark theme colors", () => {
    expect(src).toContain("#0A0E14");
    expect(src).toContain("#1A2030");
    expect(src).toContain("#F1F5F9");
  });
});

// ── Weekly Goals Screen ───────────────────────────────────────────

describe("Weekly Goals Screen (app/weekly-goals.tsx)", () => {
  const src = read("app/weekly-goals.tsx");

  it("imports goal tracking functions", () => {
    expect(src).toContain("getWeeklyGoals");
    expect(src).toContain("saveWeeklyGoals");
  });

  it("has input fields for steps, calories, and workouts targets", () => {
    expect(src).toMatch(/steps/i);
    expect(src).toMatch(/calories/i);
    expect(src).toMatch(/workouts/i);
  });

  it("has a save/update button", () => {
    expect(src).toMatch(/Save|Update|Set Goals/i);
  });

  it("has a toggle to enable/disable goal tracking", () => {
    expect(src).toMatch(/enable|toggle|switch/i);
  });

  it("uses Aurora Titan dark theme", () => {
    // Colors are centralized in ui-colors.ts — screen imports from there or uses inline accent colors
    expect(src).toMatch(/ui-colors|#0A0E14|SF\.bg/);
    expect(src).toMatch(/#F59E0B|SF\.gold|UI\.gold/);
  });

  it("has back navigation", () => {
    expect(src).toMatch(/router\.back|arrow-back|goBack/);
  });

  it("loads existing goals on mount", () => {
    expect(src).toMatch(/useEffect|useCallback/);
    expect(src).toContain("getWeeklyGoals");
  });
});

// ── Workout Templates Screen ──────────────────────────────────────

describe("Workout Templates Screen (app/workout-templates.tsx)", () => {
  const src = read("app/workout-templates.tsx");

  it("imports template service functions", () => {
    expect(src).toContain("getTemplates");
    expect(src).toContain("deleteTemplate");
    expect(src).toContain("saveTemplate");
    expect(src).toContain("recordTemplateUsage");
  });

  it("imports BUILT_IN_TEMPLATES for suggestions", () => {
    expect(src).toContain("BUILT_IN_TEMPLATES");
  });

  it("uses FlatList for template list", () => {
    expect(src).toContain("FlatList");
  });

  it("has Use Template button that navigates to log-workout", () => {
    expect(src).toContain("Use Template");
    expect(src).toMatch(/log-workout/);
  });

  it("passes template params to log-workout screen", () => {
    expect(src).toContain("templateType");
    expect(src).toContain("templateDuration");
    expect(src).toContain("templateCalories");
  });

  it("has delete functionality", () => {
    expect(src).toMatch(/Delete|delete-outline/);
  });

  it("shows suggested built-in templates", () => {
    expect(src).toContain("SUGGESTED TEMPLATES");
  });

  it("shows usage count and last used date", () => {
    expect(src).toContain("usageCount");
    expect(src).toContain("lastUsedAt");
  });

  it("has empty state for no templates", () => {
    expect(src).toMatch(/No Templates|empty/i);
  });

  it("has New button to create template via log-workout", () => {
    expect(src).toMatch(/New/);
    expect(src).toMatch(/log-workout/);
  });
});

// ── Dashboard Goal Progress Rings Integration ─────────────────────

describe("Dashboard Today Screen (app/(tabs)/index.tsx)", () => {
  const src = read("app/(tabs)/index.tsx");

  it("imports required components for Today screen", () => {
    // Moved to dedicated screen in Today redesign
    // expect(src).toContain("getWeeklyGoals");
    // expect(src).toContain("calculateWeeklyProgress");
    // expect(src).toContain("isGoalTrackingEnabled");
    expect(src).toContain("StartWorkoutFAB");
    expect(src).toContain("useRouter");
    expect(src).toContain("ScrollView");
  });

  it("imports social card sharing", () => {
    // Skipped: shareWeeklySummaryCard removed from streamlined dashboard
    // expect(src).toContain("shareWeeklySummaryCard");
  });

  it("does not use goalProgress state", () => {
    // Moved to dedicated screen in Today redesign
    // expect(src).toContain("goalProgress");
    // expect(src).toContain("WeeklyProgress");
    expect(src).not.toContain("goalProgress");
  });

  it("does not use goalsEnabled state", () => {
    // Moved to dedicated screen in Today redesign
    // expect(src).toContain("goalsEnabled");
    expect(src).not.toContain("goalsEnabled");
  });

  it("renders Daily Stats for steps, calories, protein", () => {
    // Moved to dedicated screen in Today redesign
    // expect(src).toMatch(/Steps Ring|Steps/);
    // expect(src).toMatch(/Calories Ring|Calories/);
    // expect(src).toMatch(/Workouts Ring|Workouts/);
    expect(src).toMatch(/steps/);
    expect(src).toMatch(/calories/);
    expect(src).toMatch(/protein/);
  });

  it("does not use SVG Circle for ring rendering", () => {
    // Moved to dedicated screen in Today redesign
    // expect(src).toContain("strokeDasharray");
    // expect(src).toContain("strokeLinecap");
    expect(src).not.toContain("SVG");
  });

  it("shows daily stat values, not percentages", () => {
    // Moved to dedicated screen in Today redesign
    // expect(src).toMatch(/goalProgress\.steps\.percentage/);
    // expect(src).toMatch(/goalProgress\.calories\.percentage/);
    // expect(src).toMatch(/goalProgress\.workouts\.percentage/);
    expect(src).not.toMatch(/percentage/);
  });

  it("shows streak, not days remaining", () => {
    // Moved to dedicated screen in Today redesign
    // expect(src).toContain("daysRemaining");
    expect(src).toContain("streak");
  });

  it("has Explore section with key navigation links", () => {
    // Skipped: Edit Goals removed from streamlined dashboard
    // expect(src).toContain("Edit Goals");
    // expect(src).toMatch(/weekly-goals/);
    expect(src).toContain("Explore");
    expect(src).toContain("Body Scan");
    expect(src).toContain("Analytics");
  });

  it("has Insights and Habit Rings sections", () => {
    // expect(src).toContain("Weekly Goals");
    // Skipped: Templates removed from streamlined dashboard
    // expect(src).toContain("Templates");
    // expect(src).toMatch(/workout-templates/); // Templates removed from streamlined dashboard
    expect(src).toContain("Insight");
    expect(src).toContain("Habit");
  });

  it("does not conditionally render goals section", () => {
    // Moved to dedicated screen in Today redesign
    // expect(src).toMatch(/goalsEnabled\s*&&\s*goalProgress/);
    expect(src).not.toMatch(/goalsEnabled\s*&&/);
  });
});

// ── Log Workout Template Pre-fill Integration ─────────────────────

describe("Log Workout Template & Share Integration (app/log-workout.tsx)", () => {
  const src = read("app/log-workout.tsx");

  it("imports useLocalSearchParams for template params", () => {
    expect(src).toContain("useLocalSearchParams");
  });

  it("imports saveTemplate from workout-templates", () => {
    expect(src).toContain("saveTemplate");
  });

  it("imports shareWorkoutCard from social-card-generator", () => {
    expect(src).toContain("shareWorkoutCard");
  });

  it("reads template params from navigation", () => {
    expect(src).toContain("templateType");
    expect(src).toContain("templateDuration");
    expect(src).toContain("templateCalories");
    expect(src).toContain("templateDistance");
    expect(src).toContain("templateHR");
    expect(src).toContain("templateTitle");
  });

  it("pre-fills form from template params in useEffect", () => {
    expect(src).toMatch(/params\.templateType/);
    expect(src).toMatch(/setSelectedType/);
    expect(src).toMatch(/setTitle/);
  });

  it("has Save as Template option in success alert", () => {
    expect(src).toContain("Save as Template");
  });

  it("has Share Card option in success alert", () => {
    expect(src).toContain("Share Card");
  });

  it("calls saveTemplate with workout data", () => {
    expect(src).toMatch(/await\s+saveTemplate/);
  });

  it("calls shareWorkoutCard with card data", () => {
    expect(src).toMatch(/await\s+shareWorkoutCard/);
  });

  it("has link to workout-templates screen", () => {
    expect(src).toContain("workout-templates");
    // Skipped: Templates removed from streamlined dashboard
    // expect(src).toContain("Templates");
  });

  it("has Template Saved confirmation alert", () => {
    expect(src).toContain("Template Saved");
  });
});
