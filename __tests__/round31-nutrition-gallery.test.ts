/**
 * Round 31 — Nutrition Charts + Meal Photo Gallery tests
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const root = join(__dirname, "..");

const nutritionCharts = readFileSync(join(root, "app/nutrition-charts.tsx"), "utf-8");
const mealPhotoGallery = readFileSync(join(root, "app/meal-photo-gallery.tsx"), "utf-8");
const calorieContext = readFileSync(join(root, "lib/calorie-context.tsx"), "utf-8");
const meals = readFileSync(join(root, "app/(tabs)/meals.tsx"), "utf-8");

describe("Calorie Context — Historical Data Helpers", () => {
  it("exports getHistoricalMeals function", () => {
    expect(calorieContext).toContain("export async function getHistoricalMeals");
  });

  it("exports getMealPhotos function", () => {
    expect(calorieContext).toContain("export async function getMealPhotos");
  });

  it("getHistoricalMeals loads data for N days", () => {
    expect(calorieContext).toContain("for (let i = 0; i < days; i++)");
    expect(calorieContext).toContain("MEALS_KEY");
  });

  it("getMealPhotos filters entries with photoUri", () => {
    expect(calorieContext).toContain("if (m.photoUri)");
  });
});

describe("Nutrition Charts Screen", () => {
  it("imports getHistoricalMeals from calorie-context", () => {
    expect(nutritionCharts).toContain("getHistoricalMeals");
  });

  it("has daily and weekly view mode toggle", () => {
    expect(nutritionCharts).toContain('"daily"');
    expect(nutritionCharts).toContain('"weekly"');
    expect(nutritionCharts).toContain("7-Day");
    expect(nutritionCharts).toContain("4-Week");
  });

  it("renders calorie bar chart with SVG", () => {
    expect(nutritionCharts).toContain("import Svg");
    expect(nutritionCharts).toContain("<Rect");
    expect(nutritionCharts).toContain("Daily Calories");
  });

  it("shows calorie goal line", () => {
    expect(nutritionCharts).toContain("calorieGoal");
    expect(nutritionCharts).toContain("strokeDasharray");
  });

  it("highlights bars over calorie goal in red", () => {
    expect(nutritionCharts).toContain("overGoal");
    expect(nutritionCharts).toMatch(/UI\.red|#EF4444/);
  });

  it("renders macro stacked bar chart", () => {
    expect(nutritionCharts).toContain("Daily Macros (g)");
    expect(nutritionCharts).toContain("Protein");
    expect(nutritionCharts).toContain("Carbs");
    expect(nutritionCharts).toContain("Fat");
  });

  it("renders today's macro donut chart", () => {
    expect(nutritionCharts).toContain("Today's Macro Breakdown");
    expect(nutritionCharts).toContain("arcPath");
    expect(nutritionCharts).toContain("<Path");
  });

  it("shows summary stats", () => {
    expect(nutritionCharts).toContain("Avg Calories");
    expect(nutritionCharts).toContain("Avg Protein");
    expect(nutritionCharts).toContain("Total Meals");
    expect(nutritionCharts).toContain("Days Tracked");
  });
});

describe("Meal Photo Gallery Screen", () => {
  it("imports getMealPhotos from calorie-context", () => {
    expect(mealPhotoGallery).toContain("getMealPhotos");
  });

  it("loads photos for the last 60 days (with archive support)", () => {
    expect(mealPhotoGallery).toContain("getMealPhotos(60)");
  });

  it("groups photos by date", () => {
    expect(mealPhotoGallery).toContain("groupMap");
    expect(mealPhotoGallery).toContain("DateGroup");
  });

  it("renders a 3-column photo grid", () => {
    expect(mealPhotoGallery).toContain("numColumns={3}");
  });

  it("shows date labels with today/yesterday handling", () => {
    expect(mealPhotoGallery).toContain('"Today"');
    expect(mealPhotoGallery).toContain('"Yesterday"');
  });

  it("has a fullscreen photo modal with meal details", () => {
    expect(mealPhotoGallery).toContain("selectedPhoto");
    expect(mealPhotoGallery).toContain("<Modal");
    expect(mealPhotoGallery).toContain("Calories");
    expect(mealPhotoGallery).toContain("Protein");
  });

  it("shows meal type icon overlay on thumbnails", () => {
    expect(mealPhotoGallery).toContain("photoOverlay");
    expect(mealPhotoGallery).toContain("MEAL_ICONS");
  });

  it("shows empty state when no photos exist", () => {
    expect(mealPhotoGallery).toContain("No Meal Photos Yet");
    expect(mealPhotoGallery).toContain("AI Scan");
  });
});

describe("Meals Tab Navigation", () => {
  it("has Charts navigation link", () => {
    expect(meals).toContain("nutrition-charts");
  });

  it("has Meal Gallery navigation button", () => {
    expect(meals).toContain("meal-photo-gallery");
    expect(meals).toContain("Meal Gallery");
  });
});
