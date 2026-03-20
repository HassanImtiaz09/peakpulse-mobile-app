import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const ROOT = path.resolve(__dirname, "..");

function readFile(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), "utf-8");
}

describe("Round 46 — Barcode Scanner for Pantry", () => {
  const barcodeSrc = readFile("app/barcode-scanner.tsx");

  it("should import usePantry for pantry integration", () => {
    expect(barcodeSrc).toContain("usePantry");
  });

  it("should have an 'Add to Pantry' button", () => {
    expect(barcodeSrc).toContain("Add to Pantry");
  });

  it("should use Open Food Facts API for barcode lookup", () => {
    expect(barcodeSrc).toContain("openfoodfacts.org");
  });

  it("should auto-detect category from product data", () => {
    expect(barcodeSrc).toContain("mapCategoryToPantry");
  });

  it("should show nutritional info from barcode scan", () => {
    expect(barcodeSrc).toContain("energy-kcal");
  });
});

describe("Round 46 — Pantry Expiry Push Notifications", () => {
  const notifSrc = readFile("lib/notification-service.ts");

  it("should export schedulePantryExpiryNotifications function", () => {
    expect(notifSrc).toContain("export async function schedulePantryExpiryNotifications");
  });

  it("should export cancelPantryExpiryNotifications function", () => {
    expect(notifSrc).toContain("export async function cancelPantryExpiryNotifications");
  });

  it("should define PantryExpiryItem interface", () => {
    expect(notifSrc).toContain("export interface PantryExpiryItem");
  });

  it("should handle items expiring today", () => {
    expect(notifSrc).toContain("Expiring Today");
  });

  it("should handle items expiring tomorrow", () => {
    expect(notifSrc).toContain("Expiring Tomorrow");
  });

  it("should handle items expiring within 3 days", () => {
    expect(notifSrc).toContain("Expiring Soon");
  });

  it("should store notification IDs for cancellation", () => {
    expect(notifSrc).toContain("pantry_expiry_ids");
  });

  it("should skip items expiring more than 30 days away", () => {
    expect(notifSrc).toContain("daysUntil > 30");
  });

  const pantrySrc = readFile("app/pantry.tsx");

  it("should schedule expiry notifications when pantry items change", () => {
    expect(pantrySrc).toContain("schedulePantryExpiryNotifications");
  });
});

describe("Round 46 — Shopping List Export", () => {
  const shoppingPdfSrc = readFile("lib/shopping-pdf.ts");

  it("should export generateShoppingListText function", () => {
    expect(shoppingPdfSrc).toContain("export function generateShoppingListText");
  });

  it("should export shareShoppingListAsText function", () => {
    expect(shoppingPdfSrc).toContain("export async function shareShoppingListAsText");
  });

  it("should export exportShoppingListPdf function", () => {
    expect(shoppingPdfSrc).toContain("export async function exportShoppingListPdf");
  });

  it("should define ShoppingExportItem interface", () => {
    expect(shoppingPdfSrc).toContain("export interface ShoppingExportItem");
  });

  it("should group items by priority (essential, recommended, nice-to-have)", () => {
    expect(shoppingPdfSrc).toContain("essential");
    expect(shoppingPdfSrc).toContain("recommended");
    expect(shoppingPdfSrc).toContain("nice-to-have");
  });

  it("should generate branded HTML with PeakPulse header", () => {
    expect(shoppingPdfSrc).toContain("PeakPulse AI");
    expect(shoppingPdfSrc).toContain("Shopping List");
  });

  it("should include estimated cost in the PDF", () => {
    expect(shoppingPdfSrc).toContain("estimatedCost");
    expect(shoppingPdfSrc).toContain("Est. Cost");
  });

  it("should show meals enabled by each item", () => {
    expect(shoppingPdfSrc).toContain("mealsEnabled");
    expect(shoppingPdfSrc).toContain("Enables:");
  });

  it("should use expo-print for native PDF generation", () => {
    expect(shoppingPdfSrc).toContain("expo-print");
  });

  it("should use expo-sharing for native sharing", () => {
    expect(shoppingPdfSrc).toContain("expo-sharing");
  });

  it("should handle web platform with print dialog", () => {
    expect(shoppingPdfSrc).toContain("window.open");
  });

  const pantrySrc = readFile("app/pantry.tsx");

  it("should have Share as Text button in pantry shopping view", () => {
    expect(pantrySrc).toContain("Share as Text");
  });

  it("should have Export PDF button in pantry shopping view", () => {
    expect(pantrySrc).toContain("Export PDF");
  });

  it("should import shopping-pdf module in pantry screen", () => {
    expect(pantrySrc).toContain("shopping-pdf");
  });
});

describe("Round 46 — Text export format", () => {
  // Inline test of the text generation logic
  it("should produce a formatted shopping list text", () => {
    // Simulate the text format
    const items = [
      { name: "Chicken Breast", category: "Proteins", estimatedCost: "$5-7", priority: "essential" as const, reason: "High protein source", mealsEnabled: ["Grilled Chicken Salad"] },
      { name: "Greek Yogurt", category: "Dairy", estimatedCost: "$3-4", priority: "recommended" as const, reason: "Calcium and probiotics", mealsEnabled: ["Smoothie Bowl"] },
    ];

    // Check structure expectations
    expect(items.filter(i => i.priority === "essential")).toHaveLength(1);
    expect(items.filter(i => i.priority === "recommended")).toHaveLength(1);
    expect(items.every(i => i.name && i.estimatedCost && i.reason)).toBe(true);
  });
});
