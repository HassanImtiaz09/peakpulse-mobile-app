import { describe, it, expect } from "vitest";
import { extractGroceryList, generateGroceryText } from "../lib/grocery-list";

const MOCK_MEAL_PLAN = {
  days: [
    {
      day: "Monday",
      meals: [
        { name: "Scrambled Eggs", type: "breakfast", calories: 350, protein: 20, carbs: 5, fat: 25, ingredients: ["eggs", "butter", "salt", "pepper", "spinach"], prepTime: "10 min", instructions: ["Crack eggs", "Cook in butter"] },
        { name: "Grilled Chicken Salad", type: "lunch", calories: 450, protein: 35, carbs: 15, fat: 20, ingredients: ["chicken breast", "lettuce", "tomato", "olive oil", "lemon"], prepTime: "20 min", instructions: ["Grill chicken", "Toss salad"] },
      ],
    },
    {
      day: "Tuesday",
      meals: [
        { name: "Oatmeal Bowl", type: "breakfast", calories: 300, protein: 10, carbs: 50, fat: 8, ingredients: ["oats", "banana", "almond milk", "honey", "blueberry"], prepTime: "5 min", instructions: ["Cook oats", "Top with fruit"] },
        { name: "Salmon Fillet", type: "dinner", calories: 500, protein: 40, carbs: 10, fat: 30, ingredients: ["salmon", "olive oil", "garlic", "lemon", "broccoli"], prepTime: "25 min", instructions: ["Season salmon", "Bake at 400F"] },
      ],
    },
    {
      day: "Wednesday",
      meals: [
        { name: "Greek Yogurt Parfait", type: "breakfast", calories: 280, protein: 15, carbs: 35, fat: 10, ingredients: ["yogurt", "granola", "strawberry", "honey"], prepTime: "5 min", instructions: ["Layer ingredients"] },
      ],
    },
  ],
};

describe("extractGroceryList", () => {
  it("extracts and categorizes ingredients from a meal plan", () => {
    const result = extractGroceryList(MOCK_MEAL_PLAN);
    expect(result.length).toBeGreaterThan(0);

    // Check that categories are returned
    const categoryNames = result.map(c => c.name);
    expect(categoryNames).toContain("Proteins");
    expect(categoryNames).toContain("Vegetables");
  });

  it("deduplicates ingredients across meals", () => {
    const result = extractGroceryList(MOCK_MEAL_PLAN);
    const allItems = result.flatMap(c => c.items);
    // "olive oil" appears in both Monday lunch and Tuesday dinner
    const oliveOil = allItems.find(i => i.name.toLowerCase().includes("olive oil"));
    expect(oliveOil).toBeDefined();
    expect(oliveOil!.days.length).toBe(2);
    expect(oliveOil!.days).toContain("Monday");
    expect(oliveOil!.days).toContain("Tuesday");
  });

  it("tracks which meals use each ingredient", () => {
    const result = extractGroceryList(MOCK_MEAL_PLAN);
    const allItems = result.flatMap(c => c.items);
    const lemon = allItems.find(i => i.name.toLowerCase().includes("lemon"));
    expect(lemon).toBeDefined();
    expect(lemon!.meals).toContain("Grilled Chicken Salad");
    expect(lemon!.meals).toContain("Salmon Fillet");
  });

  it("classifies proteins correctly", () => {
    const result = extractGroceryList(MOCK_MEAL_PLAN);
    const proteins = result.find(c => c.name === "Proteins");
    expect(proteins).toBeDefined();
    const proteinNames = proteins!.items.map(i => i.name.toLowerCase());
    expect(proteinNames.some(n => n.includes("chicken"))).toBe(true);
    expect(proteinNames.some(n => n.includes("salmon"))).toBe(true);
    expect(proteinNames.some(n => n.includes("egg"))).toBe(true);
  });

  it("classifies vegetables correctly", () => {
    const result = extractGroceryList(MOCK_MEAL_PLAN);
    const vegs = result.find(c => c.name === "Vegetables");
    expect(vegs).toBeDefined();
    const vegNames = vegs!.items.map(i => i.name.toLowerCase());
    expect(vegNames.some(n => n.includes("spinach") || n.includes("lettuce") || n.includes("tomato") || n.includes("broccoli"))).toBe(true);
  });

  it("classifies fruits correctly", () => {
    const result = extractGroceryList(MOCK_MEAL_PLAN);
    const fruits = result.find(c => c.name === "Fruits");
    expect(fruits).toBeDefined();
    const fruitNames = fruits!.items.map(i => i.name.toLowerCase());
    expect(fruitNames.some(n => n.includes("banana") || n.includes("blueberry") || n.includes("strawberry"))).toBe(true);
  });

  it("returns empty array for null/undefined meal plan", () => {
    expect(extractGroceryList(null)).toEqual([]);
    expect(extractGroceryList(undefined)).toEqual([]);
    expect(extractGroceryList({})).toEqual([]);
    expect(extractGroceryList({ days: [] })).toEqual([]);
  });

  it("has icons for each category", () => {
    const result = extractGroceryList(MOCK_MEAL_PLAN);
    for (const cat of result) {
      expect(cat.icon).toBeDefined();
      expect(cat.icon.length).toBeGreaterThan(0);
    }
  });

  it("sorts items alphabetically within categories", () => {
    const result = extractGroceryList(MOCK_MEAL_PLAN);
    for (const cat of result) {
      for (let i = 1; i < cat.items.length; i++) {
        expect(cat.items[i].name.localeCompare(cat.items[i - 1].name)).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

describe("generateGroceryText", () => {
  it("generates formatted text from grocery categories", () => {
    const categories = extractGroceryList(MOCK_MEAL_PLAN);
    const text = generateGroceryText(categories);
    expect(text).toContain("Weekly Grocery List");
    expect(text).toContain("PeakPulse AI");
    expect(text).toContain("Total:");
  });

  it("includes category headers", () => {
    const categories = extractGroceryList(MOCK_MEAL_PLAN);
    const text = generateGroceryText(categories);
    for (const cat of categories) {
      expect(text).toContain(cat.name.toUpperCase());
    }
  });

  it("includes item names", () => {
    const categories = extractGroceryList(MOCK_MEAL_PLAN);
    const text = generateGroceryText(categories);
    expect(text).toContain("chicken breast");
  });
});
