/**
 * Tests for Round 89: Animated pagination dots in Quick Insights carousel
 */
import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const ROOT = path.resolve(__dirname, "..");
const CAROUSEL_PATH = path.join(ROOT, "components/quick-insights-carousel.tsx");

describe("Animated Pagination Dots", () => {
  const src = fs.readFileSync(CAROUSEL_PATH, "utf-8");

  // ─── Reanimated integration ──────────────────────────────────────────
  it("imports react-native-reanimated", () => {
    expect(src).toContain('from "react-native-reanimated"');
  });

  it("imports useSharedValue and useAnimatedStyle", () => {
    expect(src).toContain("useSharedValue");
    expect(src).toContain("useAnimatedStyle");
  });

  it("imports withTiming for smooth transitions", () => {
    expect(src).toContain("withTiming");
  });

  it("imports Easing for custom bezier curve", () => {
    expect(src).toContain("Easing");
    expect(src).toContain("Easing.bezier");
  });

  // ─── AnimatedDot component ───────────────────────────────────────────
  it("defines an AnimatedDot component", () => {
    expect(src).toContain("function AnimatedDot");
  });

  it("AnimatedDot accepts isActive, accentColor, and inactiveColor props", () => {
    expect(src).toContain("isActive: boolean");
    expect(src).toContain("accentColor: string");
    expect(src).toContain("inactiveColor: string");
  });

  it("AnimatedDot uses Animated.View for rendering", () => {
    expect(src).toContain("<Animated.View");
  });

  it("AnimatedDot uses useSharedValue for width", () => {
    expect(src).toMatch(/useSharedValue\(/);
  });

  it("AnimatedDot uses useAnimatedStyle for the style", () => {
    expect(src).toMatch(/useAnimatedStyle\(/);
  });

  // ─── Dot dimensions ─────────────────────────────────────────────────
  it("defines inactive dot width as 6", () => {
    expect(src).toContain("DOT_INACTIVE_W = 6");
  });

  it("defines active dot width as 20", () => {
    expect(src).toContain("DOT_ACTIVE_W = 20");
  });

  it("defines dot height as 6", () => {
    expect(src).toContain("DOT_H = 6");
  });

  it("defines dot border radius as 3", () => {
    expect(src).toContain("DOT_RADIUS = 3");
  });

  // ─── Animation config ───────────────────────────────────────────────
  it("uses a timing duration of 250ms", () => {
    expect(src).toContain("duration: 250");
  });

  it("uses a bezier easing curve", () => {
    expect(src).toMatch(/Easing\.bezier\(0\.4,\s*0,\s*0\.2,\s*1\)/);
  });

  // ─── No RN Animated import ──────────────────────────────────────────
  it("does not import RN Animated (uses Reanimated instead)", () => {
    // Should not have "Animated" in the react-native import block
    const rnImportMatch = src.match(/import\s*\{[^}]*\}\s*from\s*"react-native"/);
    expect(rnImportMatch).toBeTruthy();
    expect(rnImportMatch![0]).not.toContain("Animated");
  });

  // ─── No web-only CSS transition ──────────────────────────────────────
  it("does not use web-only CSS transition property", () => {
    expect(src).not.toContain('transition:');
  });

  // ─── Pagination rendering ───────────────────────────────────────────
  it("renders AnimatedDot for each card", () => {
    expect(src).toContain("<AnimatedDot");
  });

  it("passes isActive based on activeIndex comparison", () => {
    expect(src).toMatch(/isActive=\{i\s*===\s*activeIndex\}/);
  });

  it("passes card accentColor to each dot", () => {
    expect(src).toMatch(/accentColor=\{card\.accentColor\}/);
  });

  it("passes SF.border as inactiveColor", () => {
    expect(src).toMatch(/inactiveColor=\{SF\.border\}/);
  });

  // ─── Dots container styling ──────────────────────────────────────────
  it("uses StyleSheet.create for dots row style", () => {
    expect(src).toContain("dotsRow");
    expect(src).toContain("StyleSheet.create");
  });

  it("dots row uses flexDirection row and center justification", () => {
    expect(src).toContain('flexDirection: "row"');
    expect(src).toContain('justifyContent: "center"');
  });
});
