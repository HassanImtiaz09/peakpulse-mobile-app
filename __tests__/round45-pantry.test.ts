import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

// ── File-reading helpers ──
function readFile(relPath: string): string {
  return fs.readFileSync(path.resolve(__dirname, "..", relPath), "utf-8");
}

describe("Round 45 — Pantry Inventory Feature", () => {
  // ── Pantry Context ──
  describe("Pantry Context (lib/pantry-context.tsx)", () => {
    const src = readFile("lib/pantry-context.tsx");

    it("exports PantryProvider and usePantry hook", () => {
      expect(src).toContain("export function PantryProvider");
      expect(src).toContain("export function usePantry");
    });

    it("defines PantryItem type with required fields", () => {
      expect(src).toContain("id: string");
      expect(src).toContain("name: string");
      expect(src).toContain("category: PantryCategory");
      expect(src).toContain("quantity");
    });

    it("supports all PANTRY_CATEGORIES", () => {
      expect(src).toContain("Proteins");
      expect(src).toContain("Dairy");
      expect(src).toContain("Grains & Carbs");
      expect(src).toContain("Vegetables");
      expect(src).toContain("Fruits");
      expect(src).toContain("Condiments & Spices");
      expect(src).toContain("Oils & Fats");
    });

    it("provides addItem, removeItem, updateItem, clearAll functions", () => {
      expect(src).toContain("addItem");
      expect(src).toContain("removeItem");
      expect(src).toContain("updateItem");
      expect(src).toContain("clearAll");
    });

    it("provides getItemsByCategory and getExpiringItems helpers", () => {
      expect(src).toContain("getItemsByCategory");
      expect(src).toContain("getExpiringItems");
    });

    it("persists to AsyncStorage with @pantry_items key", () => {
      expect(src).toContain("@pantry_items");
      expect(src).toContain("AsyncStorage");
    });
  });

  // ── Pantry Screen ──
  describe("Pantry Screen (app/pantry.tsx)", () => {
    const src = readFile("app/pantry.tsx");

    it("renders the pantry screen with ScreenContainer", () => {
      expect(src).toContain("ScreenContainer");
    });

    it("has manual item entry with name, category, and quantity fields", () => {
      expect(src).toContain("Add Item");
      expect(src).toContain("category");
      expect(src).toContain("quantity");
    });

    it("supports AI photo scanning of pantry/fridge", () => {
      expect(src).toContain("Scan Pantry");
      expect(src).toContain("pantry.scanPhoto");
    });

    it("shows AI-generated meal suggestions from pantry items", () => {
      expect(src).toContain("suggestMeals");
      expect(src).toContain("AISuggestedMeal");
    });

    it("shows smart shopping suggestions for nutritional gaps", () => {
      expect(src).toContain("suggestShopping");
      expect(src).toContain("ShoppingSuggestion");
    });

    it("displays items grouped by category", () => {
      expect(src).toContain("getItemsByCategory");
      expect(src).toContain("nonEmptyCategories");
    });

    it("shows expiring items warning", () => {
      expect(src).toContain("getExpiringItems");
      expect(src).toContain("Expiring Soon");
    });

    it("allows logging suggested meals to calorie tracker", () => {
      expect(src).toContain("handleLogMeal");
      expect(src).toContain("addMeal");
    });

    it("uses MaterialIcons consistently (no emoji)", () => {
      expect(src).toContain("MaterialIcons");
      // Check for common icon names used
      expect(src).toContain("kitchen");
      expect(src).toContain("add-circle");
    });
  });

  // ── Server Endpoints ──
  describe("Server Pantry Router (server/routers.ts)", () => {
    const src = readFile("server/routers.ts");

    it("has pantry.suggestMeals endpoint", () => {
      expect(src).toContain("suggestMeals: guestOrUserProcedure");
      expect(src).toContain("pantryItems: z.string()");
    });

    it("has pantry.scanPhoto endpoint for AI photo scanning", () => {
      expect(src).toContain("scanPhoto: guestOrUserProcedure");
      expect(src).toContain("photoUrl: z.string()");
    });

    it("has pantry.suggestShopping endpoint for budget shopping suggestions", () => {
      expect(src).toContain("suggestShopping: guestOrUserProcedure");
      expect(src).toContain("estimatedCost");
    });

    it("respects AI rate limits for all pantry endpoints", () => {
      expect(src).toContain('checkAiLimit(ctx.user?.id, "pantry.suggestMeals")');
      expect(src).toContain('checkAiLimit(ctx.user?.id, "pantry.scanPhoto")');
      expect(src).toContain('checkAiLimit(ctx.user?.id, "pantry.suggestShopping")');
    });

    it("uses JSON response format for all pantry AI calls", () => {
      const pantrySection = src.substring(src.indexOf("pantry: router({"));
      const jsonFormatCount = (pantrySection.match(/response_format.*json_object/g) || []).length;
      expect(jsonFormatCount).toBeGreaterThanOrEqual(3);
    });
  });

  // ── Navigation Integration ──
  describe("Navigation Integration", () => {
    it("Meals tab has a link to My Pantry", () => {
      const meals = readFile("app/(tabs)/meals.tsx");
      expect(meals).toContain("My Pantry");
      expect(meals).toContain("/pantry");
      expect(meals).toContain("kitchen");
    });

    it("Dashboard Quick Actions includes My Pantry", () => {
      const dashboard = readFile("app/(tabs)/index.tsx");
      expect(dashboard).toContain('"My Pantry"');
      expect(dashboard).toContain('"/pantry"');
      expect(dashboard).toContain('"kitchen"');
    });

    it("PantryProvider is wired into root layout", () => {
      const layout = readFile("app/_layout.tsx");
      expect(layout).toContain("PantryProvider");
      expect(layout).toContain("pantry-context");
    });
  });
});
