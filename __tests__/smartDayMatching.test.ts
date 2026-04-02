/**
 * Smart Day Matching & Notification Deep-Link Tests
 */
import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const HOME_TAB = fs.readFileSync(path.join(__dirname, "../app/(tabs)/index.tsx"), "utf-8");
const LAYOUT = fs.readFileSync(path.join(__dirname, "../app/_layout.tsx"), "utf-8");

describe("Smart Day Matching", () => {
  it("Home tab has a todayWorkout useMemo that matches current day of week", () => {
    expect(HOME_TAB).toContain("const todayWorkout = useMemo(");
    expect(HOME_TAB).toContain('const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]');
    expect(HOME_TAB).toContain("new Date().getDay()");
  });

  it("todayWorkout matches by day name (case-insensitive) or abbreviation prefix", () => {
    expect(HOME_TAB).toContain("dayStr === todayName.toLowerCase()");
    expect(HOME_TAB).toContain('dayStr.startsWith(todayName.toLowerCase().slice(0, 3))');
  });

  it("todayWorkout falls back to schedule[0] if no match found", () => {
    expect(HOME_TAB).toContain("return match ?? plan.schedule[0]");
  });

  it("Today's Workout section uses todayWorkout instead of schedule[0]", () => {
    // The section should reference todayWorkout, not schedule[0]
    const todaySection = HOME_TAB.slice(
      HOME_TAB.indexOf("SECTION 2: Today's Workout"),
      HOME_TAB.indexOf("SECTION 3:")
    );
    expect(todaySection).toContain("todayWorkout");
    expect(todaySection).toContain("todayWorkout.day");
    expect(todaySection).toContain("todayWorkout.focus");
    expect(todaySection).toContain("todayWorkout.exercises");
    // Should NOT have schedule[0] in this section anymore
    expect(todaySection).not.toContain("schedule[0]");
  });

  it("passes todayWorkout as dayData when navigating to active-workout", () => {
    expect(HOME_TAB).toContain("dayData: JSON.stringify(todayWorkout)");
  });
});

describe("Notification Deep-Link", () => {
  it("_layout.tsx has findTodayWorkout helper function", () => {
    expect(LAYOUT).toContain("function findTodayWorkout(schedule: any[])");
    expect(LAYOUT).toContain('const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]');
  });

  it("_layout.tsx has loadTodayWorkoutData that reads from AsyncStorage", () => {
    expect(LAYOUT).toContain("async function loadTodayWorkoutData()");
    expect(LAYOUT).toContain('@cached_workout_plan');
    expect(LAYOUT).toContain('@guest_workout_plan');
  });

  it("handles workout_reminder notification type by navigating to active-workout", () => {
    expect(LAYOUT).toContain('data.type === "workout_reminder"');
    expect(LAYOUT).toContain("loadTodayWorkoutData()");
    expect(LAYOUT).toContain('pathname: "/active-workout"');
    expect(LAYOUT).toContain("dayData: JSON.stringify(todayData)");
  });

  it("falls back to plans tab if no workout plan found", () => {
    expect(LAYOUT).toContain('router.push("/(tabs)/plans" as any)');
  });

  it("handles meal_reminder and meal_plan_renewal notification types", () => {
    expect(LAYOUT).toContain('data.type === "meal_reminder"');
    expect(LAYOUT).toContain('data.type === "meal_plan_renewal"');
    expect(LAYOUT).toContain('router.push("/(tabs)/meals" as any)');
  });

  it("still supports explicit URL-based deep-links", () => {
    expect(LAYOUT).toContain('typeof data.url === "string"');
    expect(LAYOUT).toContain("router.push(data.url as any)");
  });

  it("handles both cold-start and foreground notification taps", () => {
    expect(LAYOUT).toContain("getLastNotificationResponseAsync");
    expect(LAYOUT).toContain("addNotificationResponseReceivedListener");
  });
});
