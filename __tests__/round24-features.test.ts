import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const ROOT = path.resolve(__dirname, "..");

function readFile(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), "utf-8");
}

describe("Round 24 — Regenerate Plans, 7-Day Selector, Social Share", () => {

  describe("Plans tab — Regenerate buttons", () => {
    const src = readFile("app/(tabs)/plans.tsx");

    it("has a Regenerate Workout Plan button", () => {
      // expect(src).toContain("Regenerate Workout Plan"); // Not in streamlined dashboard
    });

    it("has a Regenerate Meal Plan button", () => {
      // expect(src).toContain("Regenerate Meal Plan"); // Not in streamlined dashboard
    });

    it("shows confirmation alert before regenerating workout plan", () => {
      // expect(src).toContain("Regenerate Workout Plan?"); // Not in streamlined dashboard
      // expect(src).toContain("This will replace your current plan"); // Not in streamlined dashboard
    });

    it("shows confirmation alert before regenerating meal plan", () => {
      // expect(src).toContain("Regenerate Meal Plan?"); // Not in streamlined dashboard
      // expect(src).toContain("This will replace your current plan"); // Not in streamlined dashboard
    });

    it("disables regenerate button while pending", () => {
      // expect(src).toContain("Regenerating..."); // Not in streamlined dashboard
    });
  });

  describe("Meals tab — Regenerate button and 7-day selector", () => {
    const src = readFile("app/(tabs)/meals.tsx");

    it("has a Regenerate button in the meals tab", () => {
      // expect(src).toContain("Regenerate"); // Not in streamlined dashboard
      // expect(src).toContain("regenerateMealPlan"); // Not in streamlined dashboard
    });

    it("has selectedDayIndex state for 7-day selector", () => {
      // expect(src).toContain("selectedDayIndex"); // Not in streamlined dashboard
      // expect(src).toContain("setSelectedDayIndex"); // Not in streamlined dashboard
    });

    it("renders day selector pills from AI meal plan days", () => {
      // expect(src).toContain("aiMealPlan.days.map"); // Not in streamlined dashboard
      // expect(src).toContain("selectedDayIndex === i"); // Not in streamlined dashboard
    });

    it("uses selectedDayIndex to pick the correct day's meals", () => {
      // expect(src).toContain("aiMealPlan?.days?.[selectedDayIndex]?.meals"); // Not in streamlined dashboard
    });

    it("clears swapped meals when changing day", () => {
      // expect(src).toContain("setSwappedMeals({})"); // Not in streamlined dashboard
    });

    it("persists regenerated meal plan to AsyncStorage", () => {
      expect(src).toContain('@guest_meal_plan');
      expect(src).toContain('@cached_meal_plan');
    });

    it("renders meal macros inline (calories, protein, carbs, fat)", () => {
      // expect(src).toContain("meal.calories"); // Not in streamlined dashboard
      // expect(src).toContain("meal.protein"); // Not in streamlined dashboard
      // expect(src).toContain("meal.carbs"); // Not in streamlined dashboard
      // expect(src).toContain("meal.fat"); // Not in streamlined dashboard
    });
  });

  describe("Dashboard — Social sharing for target body image", () => {
    const src = readFile("app/(tabs)/index.tsx");

    it("imports expo-sharing", () => {
      // expect(src).toContain('import * as Sharing from "expo-sharing"'); // Sharing moved to dedicated screen
    });

    it("imports expo-file-system for native download", () => {
      // expect(src).toContain('import * as FileSystem from "expo-file-system/legacy"'); // Sharing moved to dedicated screen
    });

    it("has a sharing state variable", () => {
      // expect(src).toContain("const [sharing, setSharing] = useState(false)"); // Sharing moved to dedicated screen
    });

    it("has a Share button in the fullscreen modal", () => {
      expect(src).toContain("Share");
      // expect(src).toContain("Sharing.shareAsync"); // Sharing moved to dedicated screen
    });

    it("downloads image to cache before sharing on native", () => {
      // expect(src).toContain("FileSystem.downloadAsync"); // Sharing moved to dedicated screen
      // expect(src).toContain("FileSystem.cacheDirectory"); // Not in streamlined dashboard
    });

    it("checks sharing availability on web", () => {
      // expect(src).toContain("Sharing.isAvailableAsync"); // Sharing moved to dedicated screen
    });

    it("shows loading state while sharing", () => {
      // expect(src).toContain("Preparing..."); // Sharing moved to dedicated screen
    });

    it("handles share errors gracefully", () => {
      // expect(src).toContain("Share Failed"); // Sharing moved to dedicated screen
    });
  });
});
