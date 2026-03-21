import { describe, it, expect } from "vitest";

/**
 * Round 49 Tests — Custom Time Pickers, Weekly Nutrition Summary,
 * UI Contrast Fixes, and Text Verbosity Reduction
 */

describe("Round 49 — Custom Time Pickers & Weekly Summary", () => {
  it("notification-settings.tsx contains time picker modal and weekly summary toggle", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("/home/ubuntu/peakpulse-mobile/app/notification-settings.tsx", "utf-8");
    // Time picker modal
    expect(content).toContain("TimePickerModal");
    expect(content).toContain("openTimePicker");
    // Weekly summary toggle
    expect(content).toContain("weeklySummary");
    expect(content).toContain("Weekly Summary");
  });

  it("ai-notification-scheduler.ts includes weeklySummary preference and custom time fields", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("/home/ubuntu/peakpulse-mobile/lib/ai-notification-scheduler.ts", "utf-8");
    expect(content).toContain("weeklySummary: boolean");
    expect(content).toContain("weeklySummary: true");
    expect(content).toContain("breakfastHour: number");
    expect(content).toContain("lunchHour: number");
    expect(content).toContain("dinnerHour: number");
    expect(content).toContain("workoutHour: number");
    expect(content).toContain("morningHour: number");
    expect(content).toContain("eveningHour: number");
    expect(content).toContain("WEEKLY_SUMMARY_KEY");
    expect(content).toContain("getWeeklyNutritionContext");
    expect(content).toContain("getWeeklySummaryMessages");
  });

  it("weekly summary schedules on Sunday at 7pm", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("/home/ubuntu/peakpulse-mobile/lib/ai-notification-scheduler.ts", "utf-8");
    expect(content).toContain("WEEKLY");
    expect(content).toContain("weekday: 1"); // Sunday
    expect(content).toContain("hour: 19");
  });
});

describe("Round 49 — Assistant Greetings Conciseness", () => {
  it("getGreeting returns a string under 80 chars for new users", async () => {
    const { getGreeting } = await import("../lib/assistant-greetings");
    const greeting = getGreeting({
      name: "Alex",
      streakDays: 0,
      workoutsCompleted: 0,
      totalScans: 0,
      totalMeals: 0,
      lastScanBF: null,
      goal: "build_muscle",
    });
    expect(typeof greeting).toBe("string");
    expect(greeting.length).toBeLessThan(80);
  });

  it("getGreeting returns a string under 80 chars for active users", async () => {
    const { getGreeting } = await import("../lib/assistant-greetings");
    const greeting = getGreeting({
      name: "Jordan",
      streakDays: 5,
      workoutsCompleted: 20,
      totalScans: 3,
      totalMeals: 50,
      lastScanBF: 18.5,
      goal: "lose_fat",
      todayCalories: 1200,
      calorieGoal: 2000,
      todayMealsLogged: 2,
      hasWorkoutToday: true,
      wearableSteps: 5000,
      wearableCaloriesBurnt: 1800,
      wearableSleepHours: 7,
      pantryExpiringCount: 2,
    });
    expect(typeof greeting).toBe("string");
    expect(greeting.length).toBeLessThan(80);
  });

  it("streak milestone greeting is concise", async () => {
    const { getGreeting } = await import("../lib/assistant-greetings");
    const greeting = getGreeting({
      name: "Sam",
      streakDays: 100,
      workoutsCompleted: 100,
      totalScans: 10,
      totalMeals: 200,
      lastScanBF: 15,
      goal: "build_muscle",
    });
    expect(greeting.length).toBeLessThan(60);
    expect(greeting).toContain("100");
  });
});

describe("Round 49 — UI Contrast Fixes", () => {
  it("no #78350F or #92400E colors remain in app files", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const appDir = "/home/ubuntu/peakpulse-mobile/app";
    const compDir = "/home/ubuntu/peakpulse-mobile/components";

    function scanDir(dir: string): string[] {
      const results: string[] = [];
      try {
        const files = fs.readdirSync(dir, { withFileTypes: true });
        for (const f of files) {
          const full = path.join(dir, f.name);
          if (f.isDirectory()) results.push(...scanDir(full));
          else if (f.name.endsWith(".tsx")) {
            const content = fs.readFileSync(full, "utf-8");
            if (content.includes("#78350F") || content.includes("#92400E")) {
              results.push(full);
            }
          }
        }
      } catch {}
      return results;
    }

    const badFiles = [...scanDir(appDir), ...scanDir(compDir)];
    expect(badFiles).toEqual([]);
  });
});
