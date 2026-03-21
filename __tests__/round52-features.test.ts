import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const APP_DIR = path.join(__dirname, "..");

describe("Round 52: Editable Receipt Items", () => {
  const scanReceiptSrc = fs.readFileSync(path.join(APP_DIR, "app/scan-receipt.tsx"), "utf-8");

  it("has inline name editing with TextInput", () => {
    expect(scanReceiptSrc).toContain("editingIndex");
    expect(scanReceiptSrc).toContain("editName");
    expect(scanReceiptSrc).toContain("commitEditName");
    expect(scanReceiptSrc).toContain("TextInput");
  });

  it("has category picker modal with all receipt categories", () => {
    expect(scanReceiptSrc).toContain("showCategoryPicker");
    expect(scanReceiptSrc).toContain("categoryPickerIndex");
    expect(scanReceiptSrc).toContain("selectCategory");
    expect(scanReceiptSrc).toContain("RECEIPT_CATEGORIES");
    expect(scanReceiptSrc).toContain("Select Category");
  });

  it("has expiry date picker modal with preset options", () => {
    expect(scanReceiptSrc).toContain("showExpiryPicker");
    expect(scanReceiptSrc).toContain("expiryPickerIndex");
    expect(scanReceiptSrc).toContain("selectExpiry");
    expect(scanReceiptSrc).toContain("EXPIRY_OPTIONS");
    expect(scanReceiptSrc).toContain("Set Shelf Life");
  });

  it("has quantity +/- controls", () => {
    expect(scanReceiptSrc).toContain("qtyControl");
    expect(scanReceiptSrc).toContain("Math.max(1, item.quantity - 1)");
    expect(scanReceiptSrc).toContain("item.quantity + 1");
  });

  it("has edit hint text for user guidance", () => {
    expect(scanReceiptSrc).toContain("Tap name, category, or expiry to edit");
  });

  it("has updateItem function for modifying individual items", () => {
    expect(scanReceiptSrc).toContain("function updateItem");
  });

  it("maps receipt categories to pantry categories", () => {
    expect(scanReceiptSrc).toContain("CATEGORY_MAP");
    expect(scanReceiptSrc).toContain("produce");
    expect(scanReceiptSrc).toContain("dairy");
    expect(scanReceiptSrc).toContain("meat");
  });
});

describe("Round 52: Meal Prep Planner", () => {
  const mealPrepSrc = fs.readFileSync(path.join(APP_DIR, "app/meal-prep.tsx"), "utf-8");

  it("uses pantry context to get expiring items", () => {
    expect(mealPrepSrc).toContain("usePantry");
    expect(mealPrepSrc).toContain("expiringItems");
  });

  it("filters items expiring within 5 days", () => {
    expect(mealPrepSrc).toContain("fiveDays");
    expect(mealPrepSrc).toContain("5 * 24 * 60 * 60 * 1000");
  });

  it("calls mealPrep.fromExpiring tRPC endpoint", () => {
    expect(mealPrepSrc).toContain("trpc.mealPrep.fromExpiring");
    expect(mealPrepSrc).toContain("generatePrep.mutateAsync");
  });

  it("has servings control with +/- buttons", () => {
    expect(mealPrepSrc).toContain("servingsControl");
    expect(mealPrepSrc).toContain("setServings");
    expect(mealPrepSrc).toContain("Math.max(1, servings - 1)");
    expect(mealPrepSrc).toContain("Math.min(12, servings + 1)");
  });

  it("displays recipe cards with expiring item pills", () => {
    expect(mealPrepSrc).toContain("usesExpiring");
    expect(mealPrepSrc).toContain("expiringPill");
    expect(mealPrepSrc).toContain("expiringPillText");
  });

  it("has expandable recipe details with ingredients and instructions", () => {
    expect(mealPrepSrc).toContain("expandedRecipe");
    expect(mealPrepSrc).toContain("expandedContent");
    expect(mealPrepSrc).toContain("Ingredients");
    expect(mealPrepSrc).toContain("Instructions");
    expect(mealPrepSrc).toContain("storageInstructions");
  });

  it("shows macro breakdown per recipe", () => {
    expect(mealPrepSrc).toContain("recipe.protein");
    expect(mealPrepSrc).toContain("recipe.carbs");
    expect(mealPrepSrc).toContain("recipe.fat");
    expect(mealPrepSrc).toContain("recipe.calories");
  });

  it("has waste reduction tips section", () => {
    expect(mealPrepSrc).toContain("tipsSection");
    expect(mealPrepSrc).toContain("tipText");
  });

  it("has regenerate button", () => {
    expect(mealPrepSrc).toContain("Generate New Recipes");
    expect(mealPrepSrc).toContain("regenBtn");
  });
});

describe("Round 52: Meal Prep Server Endpoint", () => {
  const routersSrc = fs.readFileSync(path.join(APP_DIR, "server/routers.ts"), "utf-8");

  it("has mealPrep.fromExpiring endpoint", () => {
    expect(routersSrc).toContain("fromExpiring:");
    expect(routersSrc).toContain("expiringItems: z.string()");
    expect(routersSrc).toContain("allPantryItems: z.string()");
  });

  it("uses zero-waste chef prompt for expiring items", () => {
    expect(routersSrc).toContain("zero-waste chef");
    expect(routersSrc).toContain("EXPIRING SOON");
  });
});

describe("Round 52: Calorie/Macro Trend Chart", () => {
  const timelineSrc = fs.readFileSync(path.join(APP_DIR, "app/meal-timeline.tsx"), "utf-8");

  it("imports SVG components for chart rendering", () => {
    expect(timelineSrc).toContain("react-native-svg");
    expect(timelineSrc).toContain("Rect");
    expect(timelineSrc).toContain("SvgText");
  });

  it("has metric selector tabs for calories, protein, carbs, fat", () => {
    expect(timelineSrc).toContain("selectedMetric");
    expect(timelineSrc).toContain("CHART_METRICS");
    expect(timelineSrc).toContain("metricTabs");
    expect(timelineSrc).toContain("calories");
    expect(timelineSrc).toContain("protein");
    expect(timelineSrc).toContain("carbs");
    expect(timelineSrc).toContain("fat");
  });

  it("computes weekly averages from daily totals", () => {
    expect(timelineSrc).toContain("chartData");
    expect(timelineSrc).toContain("dailyTotals");
    expect(timelineSrc).toContain("Weekly Averages");
  });

  it("renders bar chart with SVG", () => {
    expect(timelineSrc).toContain("renderChart");
    expect(timelineSrc).toContain("<Svg");
    expect(timelineSrc).toContain("<Rect");
    expect(timelineSrc).toContain("barWidth");
    expect(timelineSrc).toContain("barH");
  });

  it("shows summary stats: this week, last week, overall avg, change %", () => {
    expect(timelineSrc).toContain("This week");
    expect(timelineSrc).toContain("Last week");
    expect(timelineSrc).toContain("Overall avg");
    expect(timelineSrc).toContain("Change");
  });

  it("chart is collapsible", () => {
    expect(timelineSrc).toContain("showChart");
    expect(timelineSrc).toContain("setShowChart");
  });

  it("chart is rendered as ListHeaderComponent", () => {
    expect(timelineSrc).toContain("ListHeaderComponent={renderChart}");
  });
});

describe("Round 52: Integration Links", () => {
  const pantrySrc = fs.readFileSync(path.join(APP_DIR, "app/pantry.tsx"), "utf-8");
  const dashboardSrc = fs.readFileSync(path.join(APP_DIR, "app/(tabs)/index.tsx"), "utf-8");

  it("pantry has Meal Prep Planner button", () => {
    expect(pantrySrc).toContain("Meal Prep Planner");
    expect(pantrySrc).toContain("/meal-prep");
  });

  it("dashboard has Meal Prep quick action", () => {
    expect(dashboardSrc).toContain("Meal Prep");
    expect(dashboardSrc).toContain("/meal-prep");
  });
});
