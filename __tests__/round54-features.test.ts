import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const APP_DIR = path.join(__dirname, "..");
const mealPrepSrc = fs.readFileSync(path.join(APP_DIR, "app/meal-prep.tsx"), "utf-8");

describe("Round 54: Recipe Serving Size Scaling", () => {
  it("has scaleAmount utility function for proportional ingredient scaling", () => {
    expect(mealPrepSrc).toContain("function scaleAmount(amount: string, multiplier: number): string");
  });

  it("scaleAmount handles fractional amounts (e.g. 1/2)", () => {
    expect(mealPrepSrc).toContain("match[1].includes(\"/\")");
    expect(mealPrepSrc).toContain("parseFloat(parts[0]) / parseFloat(parts[1])");
  });

  it("tracks per-recipe serving scales in state", () => {
    expect(mealPrepSrc).toContain("recipeScales");
    expect(mealPrepSrc).toContain("setRecipeScales");
    expect(mealPrepSrc).toContain("Record<string, number>");
  });

  it("has getScaleMultiplier that computes ratio from original servings", () => {
    expect(mealPrepSrc).toContain("getScaleMultiplier");
    expect(mealPrepSrc).toContain("customServings / originalServings");
  });

  it("renders per-recipe serving size adjuster with +/- buttons", () => {
    expect(mealPrepSrc).toContain("scaleRow");
    expect(mealPrepSrc).toContain("scaleControl");
    expect(mealPrepSrc).toContain("scaleBtn");
    expect(mealPrepSrc).toContain("scaleValue");
  });

  it("clamps custom servings between 1 and 24", () => {
    expect(mealPrepSrc).toContain("Math.max(1, Math.min(24, val))");
  });

  it("shows Reset button when scale differs from original", () => {
    expect(mealPrepSrc).toContain("resetScale");
    expect(mealPrepSrc).toContain("Reset");
    expect(mealPrepSrc).toContain("multiplier !== 1");
  });

  it("scales macros (calories, protein, carbs, fat) by multiplier", () => {
    expect(mealPrepSrc).toContain("scaledCal");
    expect(mealPrepSrc).toContain("scaledP");
    expect(mealPrepSrc).toContain("scaledC");
    expect(mealPrepSrc).toContain("scaledF");
    expect(mealPrepSrc).toContain("recipe.calories * multiplier");
    expect(mealPrepSrc).toContain("recipe.protein * multiplier");
  });

  it("scales ingredient amounts in expanded view", () => {
    expect(mealPrepSrc).toContain("scaleAmount(ing.amount, multiplier)");
  });

  it("shows serving count label in expanded ingredients heading", () => {
    expect(mealPrepSrc).toContain("({customSrv} servings)");
  });
});

describe("Round 54: Drag-and-Drop Reorder (Saved Recipes)", () => {
  it("has reorderMode state toggle", () => {
    expect(mealPrepSrc).toContain("reorderMode");
    expect(mealPrepSrc).toContain("setReorderMode");
  });

  it("has Reorder toggle button in saved tab header", () => {
    expect(mealPrepSrc).toContain("reorderToggle");
    expect(mealPrepSrc).toContain("reorderToggleActive");
    expect(mealPrepSrc).toContain("swap-vert");
    expect(mealPrepSrc).toContain("Reorder");
    expect(mealPrepSrc).toContain("Done");
  });

  it("has moveRecipe function that swaps adjacent items", () => {
    expect(mealPrepSrc).toContain("moveRecipe");
    expect(mealPrepSrc).toContain("direction: \"up\" | \"down\"");
    expect(mealPrepSrc).toContain("updated[index] = updated[newIdx]");
    expect(mealPrepSrc).toContain("updated[newIdx] = temp");
  });

  it("persists reordered list to AsyncStorage", () => {
    expect(mealPrepSrc).toContain("moveRecipe");
    expect(mealPrepSrc).toContain("persistSaved(updated)");
  });

  it("renders Up/Down buttons when reorder mode is active", () => {
    expect(mealPrepSrc).toContain("reorderRow");
    expect(mealPrepSrc).toContain("reorderBtn");
    expect(mealPrepSrc).toContain("arrow-upward");
    expect(mealPrepSrc).toContain("arrow-downward");
  });

  it("disables Up for first item and Down for last item", () => {
    expect(mealPrepSrc).toContain("idx === 0 && styles.reorderBtnDisabled");
    expect(mealPrepSrc).toContain("idx === savedRecipes.length - 1 && styles.reorderBtnDisabled");
  });

  it("shows position number for each recipe in reorder mode", () => {
    expect(mealPrepSrc).toContain("reorderPos");
    expect(mealPrepSrc).toContain("#{idx + 1}");
  });

  it("exits reorder mode when switching to generate tab", () => {
    expect(mealPrepSrc).toContain("setReorderMode(false)");
  });
});

describe("Round 54: Rating & Review System", () => {
  it("has RATINGS_KEY for AsyncStorage persistence", () => {
    expect(mealPrepSrc).toContain("RATINGS_KEY");
    expect(mealPrepSrc).toContain("peakpulse_recipe_ratings");
  });

  it("defines RecipeRating interface with rating, review, and updatedAt", () => {
    expect(mealPrepSrc).toContain("interface RecipeRating");
    expect(mealPrepSrc).toContain("rating: number");
    expect(mealPrepSrc).toContain("review: string");
    expect(mealPrepSrc).toContain("updatedAt: string");
  });

  it("loads and persists ratings from AsyncStorage", () => {
    expect(mealPrepSrc).toContain("loadRatings");
    expect(mealPrepSrc).toContain("persistRatings");
    expect(mealPrepSrc).toContain("AsyncStorage.getItem(RATINGS_KEY)");
    expect(mealPrepSrc).toContain("AsyncStorage.setItem(RATINGS_KEY");
  });

  it("renders 5 star icons for rating", () => {
    expect(mealPrepSrc).toContain("renderStars");
    expect(mealPrepSrc).toContain("[1, 2, 3, 4, 5]");
    expect(mealPrepSrc).toContain("star-border");
    expect(mealPrepSrc).toContain("starsRow");
  });

  it("allows toggling rating off by tapping same star", () => {
    expect(mealPrepSrc).toContain("star === current ? 0 : star");
  });

  it("shows numeric rating text next to stars", () => {
    expect(mealPrepSrc).toContain("ratingText");
    expect(mealPrepSrc).toContain("{current}/5");
  });

  it("has review section with add, edit, and display modes", () => {
    expect(mealPrepSrc).toContain("renderReviewSection");
    expect(mealPrepSrc).toContain("editingReview");
    expect(mealPrepSrc).toContain("reviewDraft");
  });

  it("has review input with 300 char limit", () => {
    expect(mealPrepSrc).toContain("reviewInput");
    expect(mealPrepSrc).toContain("maxLength={300}");
    expect(mealPrepSrc).toContain("Add your notes...");
  });

  it("has Save and Cancel buttons for review editing", () => {
    expect(mealPrepSrc).toContain("reviewSaveBtn");
    expect(mealPrepSrc).toContain("reviewCancelBtn");
    expect(mealPrepSrc).toContain("submitReview");
  });

  it("displays existing review with edit icon", () => {
    expect(mealPrepSrc).toContain("reviewDisplay");
    expect(mealPrepSrc).toContain("reviewText");
    expect(mealPrepSrc).toContain("rate-review");
  });

  it("has Add notes button when no review exists", () => {
    expect(mealPrepSrc).toContain("addReviewBtn");
    expect(mealPrepSrc).toContain("Add notes");
  });
});
