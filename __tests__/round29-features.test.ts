import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const ROOT = path.resolve(__dirname, "..");

function readFile(rel: string) {
  return fs.readFileSync(path.join(ROOT, rel), "utf-8");
}

describe("Round 29 — Barcode Scan History", () => {
  const scanner = readFile("app/barcode-scanner.tsx");

  it("defines HISTORY_KEY and MAX_HISTORY constants", () => {
    expect(scanner).toContain("HISTORY_KEY");
    expect(scanner).toContain("MAX_HISTORY");
  });

  it("has loadHistory and saveToHistory functions", () => {
    expect(scanner).toContain("async function loadHistory");
    expect(scanner).toContain("async function saveToHistory");
  });

  it("has showHistory state toggle", () => {
    expect(scanner).toContain("showHistory");
    expect(scanner).toContain("setShowHistory");
  });

  it("renders a history button in the top bar", () => {
    expect(scanner).toContain('name="history"');
    expect(scanner).toContain("setShowHistory(true)");
  });

  it("renders a FlatList for history items", () => {
    expect(scanner).toContain("FlatList");
    expect(scanner).toContain("historyCard");
  });

  it("has handleRelogFromHistory function", () => {
    expect(scanner).toContain("handleRelogFromHistory");
    expect(scanner).toContain("@barcode_scan_result");
  });

  it("has handleDeleteHistoryItem and handleClearHistory", () => {
    expect(scanner).toContain("handleDeleteHistoryItem");
    expect(scanner).toContain("handleClearHistory");
    expect(scanner).toContain("Clear Scan History");
  });

  it("saves to history after successful scan", () => {
    expect(scanner).toContain("saveToHistory(nutrition)");
    expect(scanner).toContain("loadHistory().then(setHistory)");
  });

  it("has history card styles", () => {
    expect(scanner).toContain("historyCard");
    expect(scanner).toContain("historyName");
    expect(scanner).toContain("historyMacros");
    expect(scanner).toContain("historyLogBtn");
    expect(scanner).toContain("historyDeleteBtn");
  });
});

describe("Round 29 — Favourites / Frequent Foods", () => {
  const meals = readFile("app/(tabs)/meals.tsx");

  it("defines FavouriteFood interface", () => {
    expect(meals).toContain("interface FavouriteFood");
    expect(meals).toContain("logCount: number");
  });

  it("has favourites state and persistence", () => {
    expect(meals).toContain("@favourite_foods");
    expect(meals).toContain("setFavourites");
  });

  it("has addToFavourites function with duplicate check", () => {
    expect(meals).toContain("addToFavourites");
    expect(meals).toContain("Already in Favourites");
  });

  it("has removeFromFavourites function", () => {
    expect(meals).toContain("removeFromFavourites");
  });

  it("has logFromFavourite function that increments logCount", () => {
    expect(meals).toContain("logFromFavourite");
    expect(meals).toContain("logCount: f.logCount + 1");
  });

  it("renders collapsible favourites section", () => {
    expect(meals).toContain("showFavourites");
    expect(meals).toContain("Saved Foods");
    expect(meals).toContain("setShowFavourites");
  });

  it("sorts favourites by most logged first", () => {
    expect(meals).toContain("sort((a, b) => b.logCount - a.logCount)");
  });

  it("has star button on logged meals for adding to favourites", () => {
    // Star / star-outline icons for adding to favourites
    expect(meals).toContain('"star"');
    expect(meals).toContain('"star-outline"');
  });

  it("imports MaterialIcons for the favourites UI", () => {
    expect(meals).toContain("import MaterialIcons");
  });
});

describe("Round 29 — Barcode Scanner Favourites Integration", () => {
  const scanner = readFile("app/barcode-scanner.tsx");

  it("has Save to Favourites button on result card", () => {
    expect(scanner).toContain("Save to Favourites");
    expect(scanner).toContain("@favourite_foods");
  });

  it("checks for duplicates before saving to favourites", () => {
    expect(scanner).toContain("Already in Favourites");
  });

  it("sets source as barcode when saving from scanner", () => {
    expect(scanner).toContain('"barcode" as const');
  });
});
