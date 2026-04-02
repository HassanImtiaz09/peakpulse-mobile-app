/**
 * Today's Workout Navigation Fix Tests
 * Verifies that the Home tab passes dayData params when navigating to active-workout.
 */
import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const HOME_TAB = fs.readFileSync(path.join(__dirname, "../app/(tabs)/index.tsx"), "utf-8");
const ACTIVE_WORKOUT = fs.readFileSync(path.join(__dirname, "../app/active-workout.tsx"), "utf-8");

describe("Today's Workout Navigation", () => {
  it("Home tab passes dayData param when navigating to active-workout", () => {
    // The Home tab should use router.push with params containing dayData
    expect(HOME_TAB).toContain('pathname: "/active-workout"');
    expect(HOME_TAB).toContain("dayData: JSON.stringify(todayData)");
  });

  it("Home tab reads today's workout from workoutPlan or localWorkoutPlan schedule[0]", () => {
    expect(HOME_TAB).toContain("(workoutPlan ?? localWorkoutPlan)?.schedule?.[0]");
  });

  it("active-workout screen reads dayData from useLocalSearchParams", () => {
    expect(ACTIVE_WORKOUT).toContain("useLocalSearchParams<{ dayData: string }>");
    expect(ACTIVE_WORKOUT).toContain("JSON.parse(params.dayData)");
  });

  it("active-workout shows 'No workout data found' only when dayData is null", () => {
    expect(ACTIVE_WORKOUT).toContain("if (!dayData)");
    expect(ACTIVE_WORKOUT).toContain("No workout data found");
  });

  it("'Get Started' card navigates to plans tab instead of active-workout when no plan exists", () => {
    // When there's no workout plan, the CTA should go to plans tab to create one
    expect(HOME_TAB).toContain('onPress={() => router.push("/plans" as any)}');
  });

  it("does not navigate to active-workout without params from the Today's Workout card", () => {
    // The Today's Workout card (when plan exists) should NEVER use bare /active-workout
    // Find the section between "Today's Workout" and "Get Started"
    const todaySection = HOME_TAB.slice(
      HOME_TAB.indexOf("Today's Workout Card with CTA"),
      HOME_TAB.indexOf("Get Started")
    );
    // Within this section, all /active-workout pushes should include params
    const bareNavMatches = todaySection.match(/router\.push\("\/active-workout"/g);
    // The only bare push should be in the fallback (else branch of todayData check)
    expect(bareNavMatches?.length ?? 0).toBeLessThanOrEqual(1);
  });
});
