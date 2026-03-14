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
      expect(src).toContain("Regenerate Workout Plan");
    });

    it("has a Regenerate Meal Plan button", () => {
      expect(src).toContain("Regenerate Meal Plan");
    });

    it("shows confirmation alert before regenerating workout plan", () => {
      expect(src).toContain("Regenerate Workout Plan?");
      expect(src).toContain("This will replace your current workout plan");
    });

    it("shows confirmation alert before regenerating meal plan", () => {
      expect(src).toContain("Regenerate Meal Plan?");
      expect(src).toContain("This will replace your current meal plan");
    });

    it("disables regenerate button while pending", () => {
      expect(src).toContain("Regenerating...");
    });
  });

  describe("Meals tab — Regenerate button and 7-day selector", () => {
    const src = readFile("app/(tabs)/meals.tsx");

    it("has a Regenerate button in the meals tab", () => {
      expect(src).toContain("Regenerate");
      expect(src).toContain("regenerateMealPlan");
    });

    it("has selectedDayIndex state for 7-day selector", () => {
      expect(src).toContain("selectedDayIndex");
      expect(src).toContain("setSelectedDayIndex");
    });

    it("renders day selector pills from AI meal plan days", () => {
      expect(src).toContain("aiMealPlan.days.map");
      expect(src).toContain("selectedDayIndex === i");
    });

    it("uses selectedDayIndex to pick the correct day's meals", () => {
      expect(src).toContain("aiMealPlan?.days?.[selectedDayIndex]?.meals");
    });

    it("clears swapped meals when changing day", () => {
      expect(src).toContain("setSwappedMeals({})");
    });

    it("persists regenerated meal plan to AsyncStorage", () => {
      expect(src).toContain('@guest_meal_plan');
      expect(src).toContain('@cached_meal_plan');
    });

    it("SuggestedMealCard accepts calories/protein/carbs/fat props", () => {
      expect(src).toContain("calories={cals}");
      expect(src).toContain("protein={prot}");
      expect(src).toContain("carbs={carbs}");
      expect(src).toContain("fat={fat}");
    });
  });

  describe("Dashboard — Social sharing for target body image", () => {
    const src = readFile("app/(tabs)/index.tsx");

    it("imports expo-sharing", () => {
      expect(src).toContain('import * as Sharing from "expo-sharing"');
    });

    it("imports expo-file-system for native download", () => {
      expect(src).toContain('import * as FileSystem from "expo-file-system/legacy"');
    });

    it("has a sharing state variable", () => {
      expect(src).toContain("const [sharing, setSharing] = useState(false)");
    });

    it("has a Share button in the fullscreen modal", () => {
      expect(src).toContain("Share");
      expect(src).toContain("Sharing.shareAsync");
    });

    it("downloads image to cache before sharing on native", () => {
      expect(src).toContain("FileSystem.downloadAsync");
      expect(src).toContain("FileSystem.cacheDirectory");
    });

    it("checks sharing availability on web", () => {
      expect(src).toContain("Sharing.isAvailableAsync");
    });

    it("shows loading state while sharing", () => {
      expect(src).toContain("Preparing...");
    });

    it("handles share errors gracefully", () => {
      expect(src).toContain("Share Failed");
    });
  });
});
