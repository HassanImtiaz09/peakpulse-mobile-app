import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const ROOT = path.resolve(__dirname, "..");

describe("Round 40 — Workout Plan PDF Export", () => {
  const pdfModuleCode = fs.readFileSync(path.join(ROOT, "lib/workout-pdf.ts"), "utf-8");
  const plansCode = fs.readFileSync(path.join(ROOT, "app/(tabs)/plans.tsx"), "utf-8");

  // ─── PDF Module Tests ─────────────────────────────────────────────────────

  it("exports exportWorkoutPlanPdf function", () => {
    expect(pdfModuleCode).toContain("export async function exportWorkoutPlanPdf");
  });

  it("exports printWorkoutPlan function", () => {
    expect(pdfModuleCode).toContain("export async function printWorkoutPlan");
  });

  it("uses expo-print for PDF generation", () => {
    expect(pdfModuleCode).toContain('import * as Print from "expo-print"');
    expect(pdfModuleCode).toContain("Print.printToFileAsync");
  });

  it("uses expo-sharing for share sheet", () => {
    expect(pdfModuleCode).toContain('import { shareAsync } from "expo-sharing"');
    expect(pdfModuleCode).toContain("shareAsync(uri");
  });

  it("generates HTML with PeakPulse branding", () => {
    expect(pdfModuleCode).toContain("PeakPulse AI");
    expect(pdfModuleCode).toContain("Your Personal Workout Plan");
    expect(pdfModuleCode).toContain("AI-Powered Fitness Companion");
  });

  it("includes branded gold gradient header", () => {
    expect(pdfModuleCode).toContain("linear-gradient");
    expect(pdfModuleCode).toContain("#F59E0B");
    expect(pdfModuleCode).toContain("#1C0A00");
  });

  it("includes summary stats section with workout/rest days and totals", () => {
    expect(pdfModuleCode).toContain("Workout Days");
    expect(pdfModuleCode).toContain("Rest Days");
    expect(pdfModuleCode).toContain("Total Exercises");
    expect(pdfModuleCode).toContain("Total Sets");
  });

  it("renders exercise table with sets, reps, and rest columns", () => {
    expect(pdfModuleCode).toContain("exercise-table");
    expect(pdfModuleCode).toContain("Sets");
    expect(pdfModuleCode).toContain("Reps");
    expect(pdfModuleCode).toContain("Rest");
  });

  it("classifies exercises with type badges", () => {
    expect(pdfModuleCode).toContain("classifyExercise");
    expect(pdfModuleCode).toContain("type-badge");
    expect(pdfModuleCode).toContain("Compound");
    expect(pdfModuleCode).toContain("Isolation");
    expect(pdfModuleCode).toContain("Cardio");
    expect(pdfModuleCode).toContain("Stretching");
  });

  it("handles rest days with recovery message", () => {
    expect(pdfModuleCode).toContain("rest-card");
    expect(pdfModuleCode).toContain("recovery");
  });

  it("includes AI insight callout when available", () => {
    expect(pdfModuleCode).toContain("plan.insight");
    expect(pdfModuleCode).toContain("insight");
  });

  it("includes exercise notes when present", () => {
    expect(pdfModuleCode).toContain("ex.notes");
    expect(pdfModuleCode).toContain("ex-notes");
  });

  it("handles web platform with window.open print fallback", () => {
    expect(pdfModuleCode).toContain('Platform.OS === "web"');
    expect(pdfModuleCode).toContain("window.open");
    expect(pdfModuleCode).toContain("printWindow.print()");
  });

  it("handles errors gracefully with Alert", () => {
    expect(pdfModuleCode).toContain("Export Failed");
    expect(pdfModuleCode).toContain("Alert.alert");
  });

  it("sets correct MIME type for PDF sharing", () => {
    expect(pdfModuleCode).toContain("application/pdf");
    expect(pdfModuleCode).toContain("com.adobe.pdf");
  });

  it("accepts optional userName parameter", () => {
    expect(pdfModuleCode).toContain("userName?: string");
  });

  // ─── Plans Tab Integration Tests ──────────────────────────────────────────

  it("imports exportWorkoutPlanPdf in plans tab", () => {
    expect(plansCode).toContain('import { exportWorkoutPlanPdf } from "@/lib/workout-pdf"');
  });

  it("has Export PDF button in the plans tab", () => {
    expect(plansCode).toContain("Export PDF");
    expect(plansCode).toContain("exportWorkoutPlanPdf");
  });

  it("passes user name or Guest to PDF export", () => {
    expect(plansCode).toContain("user?.name");
    expect(plansCode).toContain('"Guest"');
  });

  it("triggers haptic feedback on export button press", () => {
    expect(plansCode).toContain("Haptics.impactAsync");
  });
});
