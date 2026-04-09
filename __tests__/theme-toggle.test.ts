import { describe, it, expect, beforeEach } from "vitest";
import { setUIColorScheme, getUIColorScheme, UI, SF, C } from "../constants/ui-colors";

describe("Reactive UI Colors", () => {
  beforeEach(() => {
    // Reset to dark mode before each test
    setUIColorScheme("dark");
  });

  it("should default to dark scheme", () => {
    expect(getUIColorScheme()).toBe("dark");
  });

  it("should return dark colors when scheme is dark", () => {
    setUIColorScheme("dark");
    expect(UI.bg).toBe("#0A0E14");
    expect(UI.fg).toBe("#F1F5F9");
    expect(UI.surface).toBe("#141A22");
    expect(UI.gold).toBe("#F59E0B");
    expect(UI.muted).toBe("#94A3B8");
  });

  it("should return light colors when scheme is light", () => {
    setUIColorScheme("light");
    expect(UI.bg).toBe("#F8FAFC");
    expect(UI.fg).toBe("#0F172A");
    expect(UI.surface).toBe("#FFFFFF");
    expect(UI.gold).toBe("#D97706");
    expect(UI.muted).toBe("#64748B");
  });

  it("should switch colors dynamically", () => {
    setUIColorScheme("dark");
    expect(UI.bg).toBe("#0A0E14");

    setUIColorScheme("light");
    expect(UI.bg).toBe("#F8FAFC");

    setUIColorScheme("dark");
    expect(UI.bg).toBe("#0A0E14");
  });

  it("SF should be an alias for UI", () => {
    setUIColorScheme("dark");
    expect(SF.bg).toBe(UI.bg);
    expect(SF.fg).toBe(UI.fg);
    expect(SF.gold).toBe(UI.gold);

    setUIColorScheme("light");
    expect(SF.bg).toBe(UI.bg);
    expect(SF.fg).toBe(UI.fg);
  });

  it("C should be an alias for UI", () => {
    setUIColorScheme("dark");
    expect(C.bg).toBe(UI.bg);
    expect(C.fg).toBe(UI.fg);

    setUIColorScheme("light");
    expect(C.bg).toBe(UI.bg);
  });

  it("should have all expected color keys in dark mode", () => {
    setUIColorScheme("dark");
    const keys = Object.keys(UI);
    expect(keys).toContain("bg");
    expect(keys).toContain("fg");
    expect(keys).toContain("surface");
    expect(keys).toContain("gold");
    expect(keys).toContain("muted");
    expect(keys).toContain("border");
    expect(keys).toContain("primary");
    expect(keys).toContain("success");
    expect(keys).toContain("red");
    expect(keys).toContain("macroProtein");
    expect(keys).toContain("macroCarbs");
    expect(keys).toContain("macroFat");
  });

  it("should have all expected color keys in light mode", () => {
    setUIColorScheme("light");
    const keys = Object.keys(UI);
    expect(keys).toContain("bg");
    expect(keys).toContain("fg");
    expect(keys).toContain("surface");
    expect(keys).toContain("gold");
    expect(keys).toContain("muted");
    expect(keys).toContain("border");
    expect(keys).toContain("primary");
    expect(keys).toContain("success");
    expect(keys).toContain("red");
  });

  it("light mode colors should have proper contrast (bg is light, fg is dark)", () => {
    setUIColorScheme("light");
    // Light bg should start with #F or be a light color
    expect(UI.bg).toMatch(/^#[A-Fa-f8-9]/);
    // Dark fg should start with #0 or #1
    expect(UI.fg).toMatch(/^#[0-2]/);
  });

  it("dark mode colors should have proper contrast (bg is dark, fg is light)", () => {
    setUIColorScheme("dark");
    // Dark bg should start with #0
    expect(UI.bg).toMatch(/^#0/);
    // Light fg should start with #E or #F
    expect(UI.fg).toMatch(/^#[E-F]/);
  });

  it("should return correct semantic colors in both modes", () => {
    setUIColorScheme("dark");
    expect(UI.red).toBe("#EF4444");
    expect(UI.green).toBe("#22C55E");
    expect(UI.blue).toBe("#60A5FA");

    setUIColorScheme("light");
    expect(UI.red).toBe("#DC2626");
    expect(UI.green).toBe("#16A34A");
    expect(UI.blue).toBe("#3B82F6");
  });

  it("should return correct chart colors in both modes", () => {
    setUIColorScheme("dark");
    expect(UI.chartLine).toBe("#F59E0B");

    setUIColorScheme("light");
    expect(UI.chartLine).toBe("#D97706");
  });
});

describe("Rest Timer Haptic Enhancement", () => {
  it("should have rest timer settings with default durations", async () => {
    const { loadRestTimerSettings, DEFAULT_REST_TIMERS } = await import("../lib/rest-timer-settings");
    const settings = await loadRestTimerSettings();
    expect(settings).toBeDefined();
    expect(settings.defaultDuration).toBe(DEFAULT_REST_TIMERS.defaultDuration);
  });
});
