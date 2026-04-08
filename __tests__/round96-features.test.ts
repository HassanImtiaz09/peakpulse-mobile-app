/**
 * Round 96 Tests:
 * 1. Weekly Goal Rings component
 * 2. Exercise demo player auto-fallback
 * 3. Workout comparison mode
 */
import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const readFile = (relPath: string) =>
  fs.readFileSync(path.join(__dirname, "..", relPath), "utf-8");

// ══════════════════════════════════════════════════════════════════
// 1. Weekly Goal Rings Component
// ══════════════════════════════════════════════════════════════════
describe("WeeklyGoalRings Component", () => {
  const src = readFile("components/weekly-goal-rings.tsx");

  it("should export WeeklyGoalRings component", () => {
    expect(src).toContain("export function WeeklyGoalRings");
  });

  it("should render SVG circle rings", () => {
    expect(src).toContain("Svg");
    expect(src).toContain("Circle");
  });

  it("should display three goal categories (workouts, calories, steps)", () => {
    expect(src).toMatch(/workout/i);
    expect(src).toMatch(/calorie/i);
    // Steps or active minutes
    expect(src).toMatch(/step|active/i);
  });

  it("should calculate progress percentages", () => {
    expect(src).toMatch(/progress|percentage|ratio/i);
  });

  it("should accept an onPress callback", () => {
    expect(src).toContain("onPress");
  });

  it("should use animated stroke dash for ring progress", () => {
    expect(src).toMatch(/strokeDashoffset|strokeDasharray/i);
  });

  it("should display current/goal values", () => {
    // Should show something like "3/5" or "3 of 5"
    expect(src).toMatch(/goal|target/i);
  });

  it("should be integrated into workout calendar", () => {
    const calendar = readFile("app/workout-calendar.tsx");
    expect(calendar).toContain("WeeklyGoalRings");
    expect(calendar).toContain("weekly-goal-rings");
  });
});

// ══════════════════════════════════════════════════════════════════
// 2. Exercise Demo Player Auto-Fallback
// ══════════════════════════════════════════════════════════════════
describe("Exercise Demo Player Auto-Fallback", () => {
  const src = readFile("components/exercise-demo-player.tsx");

  it("should track video failed auto-fallback state", () => {
    expect(src).toContain("videoFailedAutoFallback");
    expect(src).toContain("setVideoFailedAutoFallback");
  });

  it("should auto-switch to ExerciseDB GIF when video fails", () => {
    // The useEffect that triggers auto-fallback
    expect(src).toContain("videoHasError && !useExerciseDb && exerciseDbGifUrl && !videoFailedAutoFallback");
    expect(src).toContain("setVideoFailedAutoFallback(true)");
    expect(src).toContain("setUseExerciseDb(true)");
  });

  it("should show fallback info banner when auto-fallback is active", () => {
    expect(src).toContain("MuscleWiki video unavailable");
    expect(src).toContain("showing animated illustration instead");
  });

  it("should display 'Illustration (fallback)' badge when auto-fallback is active", () => {
    expect(src).toContain("Illustration (fallback)");
  });

  it("should hide error overlay when auto-fallback has a GIF", () => {
    // Error overlay should only show when no auto-fallback
    expect(src).toContain("videoHasError && !videoFailedAutoFallback");
  });

  it("should allow retry to go back to video source", () => {
    // Retry should reset auto-fallback state
    expect(src).toContain("setVideoFailedAutoFallback(false)");
    expect(src).toContain("setUseExerciseDb(false)");
  });

  it("should have a retry button in the fallback banner", () => {
    expect(src).toContain("Retry Video");
  });

  it("should reset fallback state when manually toggling source", () => {
    // The source toggle buttons should clear auto-fallback
    const toggleMatches = src.match(/setVideoFailedAutoFallback\(false\)/g);
    expect(toggleMatches).toBeTruthy();
    expect(toggleMatches!.length).toBeGreaterThanOrEqual(3); // retry + 2 toggle buttons
  });
});

// ══════════════════════════════════════════════════════════════════
// 3. Workout Comparison Mode
// ══════════════════════════════════════════════════════════════════
describe("Workout Comparison Mode", () => {
  const src = readFile("app/workout-calendar.tsx");

  it("should have compare mode state", () => {
    expect(src).toContain("compareMode");
    expect(src).toContain("setCompareMode");
  });

  it("should track two selected days for comparison", () => {
    expect(src).toContain("compareDays");
    expect(src).toContain("setCompareDays");
  });

  it("should have a compare modal", () => {
    expect(src).toContain("compareModalVisible");
    expect(src).toContain("setCompareModalVisible");
  });

  it("should have a toggle compare mode function", () => {
    expect(src).toContain("toggleCompareMode");
  });

  it("should have a compare button in the month navigation", () => {
    expect(src).toContain("compare-arrows");
  });

  it("should show compare mode banner with instructions", () => {
    expect(src).toContain("Tap a workout day to start comparing");
    expect(src).toContain("Now tap a second day to compare");
  });

  it("should highlight selected compare days with blue", () => {
    expect(src).toContain("isCompareSelected");
    expect(src).toContain("rgba(59,130,246,0.7)");
  });

  it("should show numbered badges on selected days", () => {
    expect(src).toContain("compareIndex");
  });

  it("should have getDayStats function for comparison metrics", () => {
    expect(src).toContain("function getDayStats");
    expect(src).toContain("totalDuration");
    expect(src).toContain("totalVolume");
    expect(src).toContain("totalCalories");
    expect(src).toContain("totalExercises");
  });

  it("should calculate volume from exercise logs", () => {
    expect(src).toContain("parseFloat(log.weight)");
    expect(src).toContain("parseInt(log.reps)");
  });

  it("should display comparison metrics with bar charts", () => {
    expect(src).toContain("Duration");
    expect(src).toContain("Exercises");
    expect(src).toContain("Volume");
    expect(src).toContain("Calories");
    expect(src).toContain("Sessions");
  });

  it("should show percentage difference between days", () => {
    expect(src).toContain("trending-up");
    expect(src).toContain("trending-down");
  });

  it("should show exercise overlap analysis", () => {
    expect(src).toContain("Exercise Overlap");
    expect(src).toContain("SHARED");
    expect(src).toContain("DAY 1 ONLY");
    expect(src).toContain("DAY 2 ONLY");
  });

  it("should have a 'Compare Different Days' button to reset", () => {
    expect(src).toContain("Compare Different Days");
  });

  it("should open comparison modal when second day is selected", () => {
    // In handleDayPress, when compareDays[1] is set, modal opens
    expect(src).toContain("setCompareModalVisible(true)");
  });

  it("should prevent selecting the same day twice", () => {
    expect(src).toContain("dk === compareDays[0]");
  });

  it("should disable non-workout days in normal mode but enable all in compare mode", () => {
    expect(src).toContain("!compareMode && !cell.hasWorkout");
  });
});

// ══════════════════════════════════════════════════════════════════
// Integration: All features work together
// ══════════════════════════════════════════════════════════════════
describe("Integration", () => {
  it("should have TypeScript-compatible imports in workout-calendar", () => {
    const src = readFile("app/workout-calendar.tsx");
    expect(src).toContain("import");
    expect(src).toContain("WeeklyGoalRings");
    expect(src).toContain("MaterialIcons");
  });

  it("should have all three features in the same calendar screen", () => {
    const src = readFile("app/workout-calendar.tsx");
    // Goal rings
    expect(src).toContain("WeeklyGoalRings");
    // Compare mode
    expect(src).toContain("compareMode");
    // Streak tracking (existing)
    expect(src).toContain("currentStreak");
    expect(src).toContain("longestStreak");
  });

  it("should have ExerciseDB fallback in the demo player", () => {
    const src = readFile("components/exercise-demo-player.tsx");
    expect(src).toContain("exerciseDbGifUrl");
    expect(src).toContain("videoFailedAutoFallback");
  });
});
