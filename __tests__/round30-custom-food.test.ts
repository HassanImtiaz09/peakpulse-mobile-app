import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const ROOT = path.resolve(__dirname, "..");

function readFile(rel: string) {
  return fs.readFileSync(path.join(ROOT, rel), "utf-8");
}

describe("Round 30 — Custom Food Entry", () => {
  const meals = readFile("app/(tabs)/meals.tsx");

  it("has showCustomEntry state toggle", () => {
    expect(meals).toContain("showCustomEntry");
    expect(meals).toContain("setShowCustomEntry");
  });

  it("has custom nutritional input fields (calories, protein, carbs, fat)", () => {
    expect(meals).toContain("customCalories");
    expect(meals).toContain("setCustomCalories");
    expect(meals).toContain("customProtein");
    expect(meals).toContain("setCustomProtein");
    expect(meals).toContain("customCarbs");
    expect(meals).toContain("setCustomCarbs");
    expect(meals).toContain("customFat");
    expect(meals).toContain("setCustomFat");
  });

  it("has serving size input field", () => {
    expect(meals).toContain("customServing");
    expect(meals).toContain("setCustomServing");
    expect(meals).toContain("Serving size");
  });

  it("renders a toggle button between Quick Log and Custom Food Entry", () => {
    expect(meals).toContain("+ Log Custom Food");
    expect(meals).toContain("+ Log Meal");
    expect(meals).toContain("Add nutrition details");
    expect(meals).toContain("Hide nutrition fields");
  });

  it("renders calorie input with kcal label", () => {
    expect(meals).toContain("Calories");
    expect(meals).toContain("kcal");
    expect(meals).toContain('keyboardType="numeric"');
  });

  it("renders protein, carbs, fat macro inputs in a row", () => {
    expect(meals).toContain("PROTEIN");
    expect(meals).toContain("CARBS");
    expect(meals).toContain("FAT");
  });

  it("has save to favourites checkbox toggle", () => {
    expect(meals).toContain("saveToFavOnLog");
    expect(meals).toContain("setSaveToFavOnLog");
  });

  it("handles custom entry in quickLogMeal with full macros", () => {
    expect(meals).toContain("if (showCustomEntry)");
    expect(meals).toContain("parseFloat(customCalories)");
    expect(meals).toContain("parseFloat(customProtein)");
    expect(meals).toContain("parseFloat(customCarbs)");
    expect(meals).toContain("parseFloat(customFat)");
  });

  it("appends serving size to meal name when provided", () => {
    expect(meals).toContain("`${name} (${serving})`");
  });

  it("optionally saves to favourites when checkbox is checked", () => {
    expect(meals).toContain("if (saveToFavOnLog && cal > 0)");
    expect(meals).toContain("addToFavourites");
  });

  it("resets all custom fields after logging", () => {
    expect(meals).toContain('setCustomCalories("")');
    expect(meals).toContain('setCustomProtein("")');
    expect(meals).toContain('setCustomCarbs("")');
    expect(meals).toContain('setCustomFat("")');
    expect(meals).toContain('setCustomServing("")');
    expect(meals).toContain("setSaveToFavOnLog(false)");
  });

  it("shows different button text for custom vs quick log", () => {
    expect(meals).toContain("+ Log Custom Food");
    expect(meals).toContain("+ Log Meal");
  });

  it("uses MaterialIcons for the toggle button", () => {
    expect(meals).toContain('"edit-note"');
    expect(meals).toContain('"edit-off"');
  });
});
