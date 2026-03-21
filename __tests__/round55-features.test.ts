import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const APP_DIR = path.join(__dirname, "..");
const mealPrepSrc = fs.readFileSync(path.join(APP_DIR, "app/meal-prep.tsx"), "utf-8");

describe("Round 55: Ingredient Matching Logic", () => {
  it("has normalizeForMatch utility for fuzzy string comparison", () => {
    expect(mealPrepSrc).toContain("function normalizeForMatch(s: string): string");
    expect(mealPrepSrc).toContain("toLowerCase()");
    expect(mealPrepSrc).toContain("replace(/[^a-z0-9]/g");
  });

  it("has matchIngredientToPantry function with exact and fuzzy matching", () => {
    expect(mealPrepSrc).toContain("function matchIngredientToPantry(ingName: string, pantryItems: PantryItem[]): PantryItem | null");
    // Exact match
    expect(mealPrepSrc).toContain("pNorm === norm || pNorm.includes(norm) || norm.includes(pNorm)");
    // Fuzzy match with 60% threshold
    expect(mealPrepSrc).toContain("score >= 0.6");
  });

  it("has getIngredientMatches that returns status for each ingredient", () => {
    expect(mealPrepSrc).toContain("function getIngredientMatches(ingredients: PrepRecipe[\"ingredients\"], pantryItems: PantryItem[]): IngredientMatch[]");
    expect(mealPrepSrc).toContain("status: pantryItem ? \"available\" : \"missing\"");
  });

  it("defines IngredientMatch interface with status field", () => {
    expect(mealPrepSrc).toContain("interface IngredientMatch");
    expect(mealPrepSrc).toContain("status: \"available\" | \"partial\" | \"missing\"");
    expect(mealPrepSrc).toContain("pantryItem: PantryItem | null");
  });
});

describe("Round 55: Cook Now Handler", () => {
  it("has handleCookNow callback function", () => {
    expect(mealPrepSrc).toContain("handleCookNow");
    expect(mealPrepSrc).toContain("useCallback(async (recipe: PrepRecipe, cardKey: string)");
  });

  it("deducts matched pantry items via removeItem", () => {
    expect(mealPrepSrc).toContain("await removeItem(match.pantryItem.id)");
  });

  it("logs pantry usage for deducted items", () => {
    expect(mealPrepSrc).toContain("await logUsage({ itemName: match.pantryItem.name, action: \"used\" })");
  });

  it("logs the cooked meal to calorie tracker via addMeal", () => {
    expect(mealPrepSrc).toContain("await addMeal({");
    expect(mealPrepSrc).toContain("name: recipe.name");
    expect(mealPrepSrc).toContain("mealType: recipe.mealType || \"lunch\"");
    expect(mealPrepSrc).toContain("calories: scaledCal");
    expect(mealPrepSrc).toContain("protein: scaledP");
  });

  it("applies serving scale multiplier to logged calories/macros", () => {
    expect(mealPrepSrc).toContain("const multiplier = getScaleMultiplier(cardKey, recipe.servings)");
    expect(mealPrepSrc).toContain("Math.round(recipe.calories * multiplier)");
  });

  it("triggers haptic success feedback on native platforms", () => {
    expect(mealPrepSrc).toContain("Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)");
  });

  it("shows confirmation alert with missing ingredient count", () => {
    expect(mealPrepSrc).toContain("Missing Ingredients");
    expect(mealPrepSrc).toContain("Cook Anyway");
    expect(mealPrepSrc).toContain("ingredients not in pantry");
  });

  it("shows confirmation alert when all ingredients available", () => {
    expect(mealPrepSrc).toContain("All ${available.length} ingredients found in pantry");
    expect(mealPrepSrc).toContain("They will be deducted");
  });

  it("tracks cooking state with cookingRecipe and cookSuccess", () => {
    expect(mealPrepSrc).toContain("cookingRecipe");
    expect(mealPrepSrc).toContain("setCookingRecipe");
    expect(mealPrepSrc).toContain("cookSuccess");
    expect(mealPrepSrc).toContain("setCookSuccess");
  });

  it("auto-clears success message after 3 seconds", () => {
    expect(mealPrepSrc).toContain("setTimeout(() => setCookSuccess(null), 3000)");
  });
});

describe("Round 55: Cook Now UI", () => {
  it("renders ingredient availability summary (X/Y in pantry)", () => {
    expect(mealPrepSrc).toContain("cookNowAvailRow");
    expect(mealPrepSrc).toContain("{avail}/{total} ingredients in pantry");
    expect(mealPrepSrc).toContain("inventory-2");
  });

  it("color-codes availability: green (all), orange (partial), red (none)", () => {
    expect(mealPrepSrc).toContain("avail === total ? SF.green : avail > 0 ? SF.orange : SF.red");
  });

  it("lists each ingredient with check/cancel icon and pantry tag", () => {
    expect(mealPrepSrc).toContain("cookNowIngRow");
    expect(mealPrepSrc).toContain("cookNowIngText");
    expect(mealPrepSrc).toContain("cookNowPantryTag");
    expect(mealPrepSrc).toContain("check-circle");
    expect(mealPrepSrc).toContain("cancel");
    expect(mealPrepSrc).toContain("✓ pantry");
  });

  it("scales ingredient amounts in the availability list", () => {
    expect(mealPrepSrc).toContain("scaleAmount(m.ingredientAmount, multiplier)");
  });

  it("renders Cook Now button with fire icon", () => {
    expect(mealPrepSrc).toContain("cookNowBtn");
    expect(mealPrepSrc).toContain("cookNowBtnText");
    expect(mealPrepSrc).toContain("local-fire-department");
    expect(mealPrepSrc).toContain("Cook Now");
  });

  it("shows loading spinner while cooking", () => {
    expect(mealPrepSrc).toContain("isCooking");
    expect(mealPrepSrc).toContain("ActivityIndicator");
  });

  it("shows success message after cooking", () => {
    expect(mealPrepSrc).toContain("cookSuccessRow");
    expect(mealPrepSrc).toContain("cookSuccessText");
    expect(mealPrepSrc).toContain("Cooked! Ingredients deducted & calories logged.");
  });

  it("has proper styles for Cook Now section", () => {
    expect(mealPrepSrc).toContain("cookNowSection:");
    expect(mealPrepSrc).toContain("cookNowBtn:");
    expect(mealPrepSrc).toContain("cookSuccessRow:");
  });
});

describe("Round 55: Integration", () => {
  it("imports usePantry with removeItem and logUsage", () => {
    expect(mealPrepSrc).toContain("const { items: pantryItems, removeItem, logUsage } = usePantry()");
  });

  it("imports useCalories with addMeal", () => {
    expect(mealPrepSrc).toContain("const { addMeal } = useCalories()");
  });

  it("imports Haptics for native feedback", () => {
    expect(mealPrepSrc).toContain("import * as Haptics from \"expo-haptics\"");
  });

  it("imports PantryItem type for matching", () => {
    expect(mealPrepSrc).toContain("import { usePantry, type PantryItem }");
  });
});
