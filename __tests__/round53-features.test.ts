import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const APP_DIR = path.join(__dirname, "..");

describe("Round 53: Save for Later (Meal Prep Bookmarks)", () => {
  const mealPrepSrc = fs.readFileSync(path.join(APP_DIR, "app/meal-prep.tsx"), "utf-8");

  it("imports AsyncStorage for persistent bookmark storage", () => {
    expect(mealPrepSrc).toContain("@react-native-async-storage/async-storage");
    expect(mealPrepSrc).toContain("SAVED_KEY");
    expect(mealPrepSrc).toContain("peakpulse_saved_recipes");
  });

  it("defines SavedRecipe interface with savedAt and id", () => {
    expect(mealPrepSrc).toContain("interface SavedRecipe extends PrepRecipe");
    expect(mealPrepSrc).toContain("savedAt: string");
    expect(mealPrepSrc).toContain("id: string");
  });

  it("has tab selector for Generate and Saved views", () => {
    expect(mealPrepSrc).toContain("TabMode");
    expect(mealPrepSrc).toContain("\"generate\"");
    expect(mealPrepSrc).toContain("\"saved\"");
    expect(mealPrepSrc).toContain("tabRow");
    expect(mealPrepSrc).toContain("tabBtn");
  });

  it("has loadSavedRecipes function that reads from AsyncStorage", () => {
    expect(mealPrepSrc).toContain("loadSavedRecipes");
    expect(mealPrepSrc).toContain("AsyncStorage.getItem(SAVED_KEY)");
  });

  it("has persistSaved function that writes to AsyncStorage", () => {
    expect(mealPrepSrc).toContain("persistSaved");
    expect(mealPrepSrc).toContain("AsyncStorage.setItem(SAVED_KEY");
  });

  it("has saveRecipe function that creates a SavedRecipe with id and timestamp", () => {
    expect(mealPrepSrc).toContain("saveRecipe");
    expect(mealPrepSrc).toContain("Date.now()");
    expect(mealPrepSrc).toContain("Math.random().toString(36)");
  });

  it("has unsaveRecipe function that removes by id", () => {
    expect(mealPrepSrc).toContain("unsaveRecipe");
    expect(mealPrepSrc).toContain("savedRecipes.filter(s => s.id !== id)");
  });

  it("has confirmation dialog before removing a bookmark", () => {
    expect(mealPrepSrc).toContain("confirmUnsave");
    expect(mealPrepSrc).toContain("Remove Bookmark");
    expect(mealPrepSrc).toContain("Alert.alert");
  });

  it("has isRecipeSaved check function", () => {
    expect(mealPrepSrc).toContain("isRecipeSaved");
    expect(mealPrepSrc).toContain("savedRecipes.some(s => s.name === name)");
  });

  it("renders bookmark icon on each recipe card", () => {
    expect(mealPrepSrc).toContain("bookmark-border");
    expect(mealPrepSrc).toContain("bookmark");
    expect(mealPrepSrc).toContain("saveBtn");
    expect(mealPrepSrc).toContain("saveBtnActive");
  });

  it("renders Save for Later inline button for unsaved recipes", () => {
    expect(mealPrepSrc).toContain("saveForLaterBtn");
    expect(mealPrepSrc).toContain("Save for Later");
    expect(mealPrepSrc).toContain("bookmark-add");
  });

  it("shows Saved indicator for already-saved recipes", () => {
    expect(mealPrepSrc).toContain("savedIndicator");
    expect(mealPrepSrc).toContain("savedIndicatorText");
  });

  it("shows saved count in the tab label", () => {
    expect(mealPrepSrc).toContain("Saved ({savedRecipes.length})");
  });

  it("saved tab shows empty state with prompt to generate", () => {
    expect(mealPrepSrc).toContain("No saved recipes");
    expect(mealPrepSrc).toContain("Generate Recipes");
    expect(mealPrepSrc).toContain("goGenerateBtn");
  });

  it("saved tab shows saved date for each recipe", () => {
    expect(mealPrepSrc).toContain("formatSavedDate");
    expect(mealPrepSrc).toContain("savedDate");
    expect(mealPrepSrc).toContain("Saved {formatSavedDate");
  });

  it("saved tab has Remove Bookmark button in expanded view", () => {
    expect(mealPrepSrc).toContain("removeBtn");
    expect(mealPrepSrc).toContain("removeText");
    expect(mealPrepSrc).toContain("Remove Bookmark");
    expect(mealPrepSrc).toContain("delete-outline");
  });

  it("loads saved recipes on component mount", () => {
    expect(mealPrepSrc).toContain("useEffect(() => {");
    expect(mealPrepSrc).toContain("loadSavedRecipes()");
  });
});
