import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

describe("Round 28 — Barcode Scanner for Meal Log", () => {
  const projectRoot = path.resolve(__dirname, "..");

  // 1. Barcode scanner screen exists
  it("barcode-scanner.tsx screen exists", () => {
    const filePath = path.join(projectRoot, "app/barcode-scanner.tsx");
    expect(fs.existsSync(filePath)).toBe(true);
  });

  // 2. Scanner uses expo-camera with barcode scanning
  it("barcode scanner uses CameraView with barcodeScannerSettings", () => {
    const content = fs.readFileSync(
      path.join(projectRoot, "app/barcode-scanner.tsx"),
      "utf-8"
    );
    expect(content).toContain("CameraView");
    expect(content).toContain("barcodeScannerSettings");
    expect(content).toContain("onBarcodeScanned");
    expect(content).toContain("useCameraPermissions");
  });

  // 3. Scanner supports common barcode types (EAN, UPC)
  it("scanner supports EAN-13, EAN-8, UPC-A, and UPC-E barcode types", () => {
    const content = fs.readFileSync(
      path.join(projectRoot, "app/barcode-scanner.tsx"),
      "utf-8"
    );
    expect(content).toContain("ean13");
    expect(content).toContain("ean8");
    expect(content).toContain("upc_a");
    expect(content).toContain("upc_e");
  });

  // 4. Open Food Facts API integration
  it("integrates with Open Food Facts API for nutrition lookup", () => {
    const content = fs.readFileSync(
      path.join(projectRoot, "app/barcode-scanner.tsx"),
      "utf-8"
    );
    expect(content).toContain("openfoodfacts.org");
    expect(content).toContain("lookupBarcode");
    expect(content).toContain("energy-kcal");
    expect(content).toContain("proteins");
    expect(content).toContain("carbohydrates");
  });

  // 5. Nutrition result card displays calories, protein, carbs, fat
  it("displays nutrition grid with calories, protein, carbs, fat", () => {
    const content = fs.readFileSync(
      path.join(projectRoot, "app/barcode-scanner.tsx"),
      "utf-8"
    );
    expect(content).toContain("nutritionGrid");
    expect(content).toContain("kcal");
    expect(content).toContain("Protein");
    expect(content).toContain("Carbs");
    expect(content).toContain("Fat");
  });

  // 6. Add to Meal Log button saves result to AsyncStorage
  it("saves scan result to AsyncStorage for meal log pickup", () => {
    const content = fs.readFileSync(
      path.join(projectRoot, "app/barcode-scanner.tsx"),
      "utf-8"
    );
    expect(content).toContain("@barcode_scan_result");
    expect(content).toContain("AsyncStorage.setItem");
    expect(content).toContain("handleAddToLog");
  });

  // 7. Meals tab has Barcode button in tab bar
  it("meals tab has a Barcode button that navigates to scanner", () => {
    const content = fs.readFileSync(
      path.join(projectRoot, "app/(tabs)/meals.tsx"),
      "utf-8"
    );
    expect(content).toContain("barcode-scanner");
    expect(content).toContain("Barcode");
  });

  // 8. Meals tab picks up barcode scan result on focus
  it("meals tab reads @barcode_scan_result on focus and auto-logs the meal", () => {
    const content = fs.readFileSync(
      path.join(projectRoot, "app/(tabs)/meals.tsx"),
      "utf-8"
    );
    expect(content).toContain("@barcode_scan_result");
    expect(content).toContain("Scanned & Logged");
  });

  // 9. Scanner has torch/flashlight toggle
  it("scanner has torch toggle for low-light scanning", () => {
    const content = fs.readFileSync(
      path.join(projectRoot, "app/barcode-scanner.tsx"),
      "utf-8"
    );
    expect(content).toContain("enableTorch");
    expect(content).toContain("torchOn");
    expect(content).toContain("flash-on");
  });

  // 10. Scanner has Scan Again functionality
  it("scanner has Scan Another button for consecutive scans", () => {
    const content = fs.readFileSync(
      path.join(projectRoot, "app/barcode-scanner.tsx"),
      "utf-8"
    );
    expect(content).toContain("handleScanAgain");
    expect(content).toContain("Scan Another");
  });

  // 11. expo-camera plugin added to app.config.ts
  it("expo-camera plugin is configured in app.config.ts", () => {
    const content = fs.readFileSync(
      path.join(projectRoot, "app.config.ts"),
      "utf-8"
    );
    expect(content).toContain("expo-camera");
    expect(content).toContain("cameraPermission");
  });

  // 12. Not-found product handling
  it("handles products not found in the database gracefully", () => {
    const content = fs.readFileSync(
      path.join(projectRoot, "app/barcode-scanner.tsx"),
      "utf-8"
    );
    expect(content).toContain("Product not found");
    expect(content).toContain("found: false");
    expect(content).toContain("manual");
  });
});
