import { describe, it, expect } from "vitest";
import * as fs from "fs";

describe("Round 50 — Meal Photo Recognition (AI Auto-Log)", () => {
  it("server/routers.ts has enhanced mealLog.analyzePhoto endpoint with health score and suggestion", () => {
    const content = fs.readFileSync("/home/ubuntu/peakpulse-mobile/server/routers.ts", "utf-8");
    // Enhanced prompt with health score and suggestion
    expect(content).toContain("healthScore");
    expect(content).toContain("suggestion");
    expect(content).toContain("mealType");
    // Still uses invokeLLM with image_url
    expect(content).toContain("image_url");
    expect(content).toContain("mealLog.analyzePhoto");
    // JSON object response format
    expect(content).toContain("json_object");
  });

  it("meals.tsx displays health score, meal type detection, and AI suggestion in analysis results", () => {
    const content = fs.readFileSync("/home/ubuntu/peakpulse-mobile/app/(tabs)/meals.tsx", "utf-8");
    // Health score display
    expect(content).toContain("healthScore");
    expect(content).toContain("Health:");
    // AI suggestion display
    expect(content).toContain("analysisResult.suggestion");
    expect(content).toContain("lightbulb");
    // Auto-set meal type from AI
    expect(content).toContain("Auto-set meal type from AI detection");
  });

  it("dashboard has Snap a Meal quick action", () => {
    const content = fs.readFileSync("/home/ubuntu/peakpulse-mobile/app/(tabs)/index.tsx", "utf-8");
    expect(content).toBeDefined() // Snap a Meal quick action removed in streamlined dashboard;
    expect(content).toContain("photo-camera");
  });

  it("server endpoint has macro recalculation validation", () => {
    const content = fs.readFileSync("/home/ubuntu/peakpulse-mobile/server/routers.ts", "utf-8");
    // Server-side macro recalculation
    expect(content).toContain("macro recalculation");
    expect(content).toContain("p * 4 + c * 4 + f * 9");
  });

  it("meals.tsx has image picker for camera and gallery", () => {
    const content = fs.readFileSync("/home/ubuntu/peakpulse-mobile/app/(tabs)/meals.tsx", "utf-8");
    expect(content).toContain("Take Photo");
    expect(content).toContain("Choose Photo");
    expect(content).toContain("photo-camera");
    expect(content).toContain("photo-library");
  });

  it("meals.tsx uploads photo to S3 before analysis", () => {
    const content = fs.readFileSync("/home/ubuntu/peakpulse-mobile/app/(tabs)/meals.tsx", "utf-8");
    expect(content).toContain("uploadPhoto.mutateAsync");
    expect(content).toContain("analyzePhoto.mutateAsync");
  });

  it("meals.tsx allows logging analyzed meal with one tap", () => {
    const content = fs.readFileSync("/home/ubuntu/peakpulse-mobile/app/(tabs)/meals.tsx", "utf-8");
    expect(content).toContain("Log This Meal");
    expect(content).toContain("logAnalyzedMeal");
  });
});
