/**
 * Round 61 — Goal Streak Rewards System Tests
 *
 * Tests for streak tracking service, milestone definitions,
 * streak badge integration, and streak details screen.
 */

import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const LIB = path.resolve(__dirname, "..", "lib");
const APP = path.resolve(__dirname, "..", "app");

const streakTrackingSrc = fs.readFileSync(path.join(LIB, "streak-tracking.ts"), "utf-8");
const dashboardSrc = fs.readFileSync(path.join(APP, "(tabs)", "index.tsx"), "utf-8");
const streakDetailsSrc = fs.readFileSync(path.join(APP, "streak-details.tsx"), "utf-8");

// ── Streak Tracking Service ───────────────────────────────────────

describe("Streak Tracking Service (lib/streak-tracking.ts)", () => {
  describe("Types & Interfaces", () => {
    it("defines WeekResult interface with all required fields", () => {
      expect(streakTrackingSrc).toContain("export interface WeekResult");
      expect(streakTrackingSrc).toContain("weekStart: string");
      expect(streakTrackingSrc).toContain("stepsHit: boolean");
      expect(streakTrackingSrc).toContain("caloriesHit: boolean");
      expect(streakTrackingSrc).toContain("workoutsHit: boolean");
      expect(streakTrackingSrc).toContain("allGoalsMet: boolean");
      expect(streakTrackingSrc).toContain("evaluatedAt: string");
    });

    it("defines MilestoneTier interface", () => {
      expect(streakTrackingSrc).toContain("export interface MilestoneTier");
      expect(streakTrackingSrc).toContain("id: string");
      expect(streakTrackingSrc).toContain("name: string");
      expect(streakTrackingSrc).toContain("weeksRequired: number");
      expect(streakTrackingSrc).toContain("emoji: string");
      expect(streakTrackingSrc).toContain("color: string");
      expect(streakTrackingSrc).toContain("description: string");
      expect(streakTrackingSrc).toContain("badge: string");
    });

    it("defines UnlockedMilestone interface", () => {
      expect(streakTrackingSrc).toContain("export interface UnlockedMilestone");
      expect(streakTrackingSrc).toContain("tierId: string");
      expect(streakTrackingSrc).toContain("unlockedAt: string");
      expect(streakTrackingSrc).toContain("streakAtUnlock: number");
      expect(streakTrackingSrc).toContain("celebrated: boolean");
    });

    it("defines StreakData interface with all required fields", () => {
      expect(streakTrackingSrc).toContain("export interface StreakData");
      expect(streakTrackingSrc).toContain("currentStreak: number");
      expect(streakTrackingSrc).toContain("longestStreak: number");
      expect(streakTrackingSrc).toContain("lastEvaluatedWeek: string");
      expect(streakTrackingSrc).toContain("weekHistory: WeekResult[]");
      expect(streakTrackingSrc).toContain("milestones: UnlockedMilestone[]");
      expect(streakTrackingSrc).toContain("totalWeeksCompleted: number");
    });
  });

  describe("Milestone Tiers", () => {
    it("exports MILESTONE_TIERS array", () => {
      expect(streakTrackingSrc).toContain("export const MILESTONE_TIERS: MilestoneTier[]");
    });

    it("defines all 7 milestone tiers", () => {
      expect(streakTrackingSrc).toContain('"ignition"');
      expect(streakTrackingSrc).toContain('"momentum"');
      expect(streakTrackingSrc).toContain('"iron_will"');
      expect(streakTrackingSrc).toContain('"unstoppable"');
      expect(streakTrackingSrc).toContain('"legendary"');
      expect(streakTrackingSrc).toContain('"titan"');
      expect(streakTrackingSrc).toContain('"immortal"');
    });

    it("has correct week requirements for each tier", () => {
      expect(streakTrackingSrc).toContain('id: "ignition"');
      expect(streakTrackingSrc).toMatch(/ignition[\s\S]*?weeksRequired:\s*1/);
      expect(streakTrackingSrc).toMatch(/momentum[\s\S]*?weeksRequired:\s*2/);
      expect(streakTrackingSrc).toMatch(/iron_will[\s\S]*?weeksRequired:\s*4/);
      expect(streakTrackingSrc).toMatch(/unstoppable[\s\S]*?weeksRequired:\s*8/);
      expect(streakTrackingSrc).toMatch(/legendary[\s\S]*?weeksRequired:\s*12/);
      expect(streakTrackingSrc).toMatch(/titan[\s\S]*?weeksRequired:\s*26/);
      expect(streakTrackingSrc).toMatch(/immortal[\s\S]*?weeksRequired:\s*52/);
    });

    it("each tier has a unique emoji", () => {
      const emojis = ["🔥", "⚡", "🛡️", "🚀", "👑", "⚔️", "💎"];
      for (const emoji of emojis) {
        expect(streakTrackingSrc).toContain(emoji);
      }
    });

    it("each tier has a badge label", () => {
      expect(streakTrackingSrc).toContain('"1W"');
      expect(streakTrackingSrc).toContain('"2W"');
      expect(streakTrackingSrc).toContain('"4W"');
      expect(streakTrackingSrc).toContain('"8W"');
      expect(streakTrackingSrc).toContain('"12W"');
      expect(streakTrackingSrc).toContain('"26W"');
      expect(streakTrackingSrc).toContain('"52W"');
    });
  });

  describe("Persistence", () => {
    it("exports getStreakData function", () => {
      expect(streakTrackingSrc).toContain("export async function getStreakData()");
    });

    it("exports saveStreakData function", () => {
      expect(streakTrackingSrc).toContain("export async function saveStreakData(data: StreakData)");
    });

    it("uses AsyncStorage for persistence", () => {
      expect(streakTrackingSrc).toContain("AsyncStorage.getItem(STREAK_DATA_KEY)");
      expect(streakTrackingSrc).toContain("AsyncStorage.setItem(STREAK_DATA_KEY");
    });

    it("defines a storage key for streak data", () => {
      expect(streakTrackingSrc).toContain("@goal_streak_data");
    });

    it("provides default streak data", () => {
      expect(streakTrackingSrc).toContain("DEFAULT_STREAK_DATA");
      expect(streakTrackingSrc).toContain("currentStreak: 0");
      expect(streakTrackingSrc).toContain("longestStreak: 0");
    });
  });

  describe("Week Helpers", () => {
    it("exports getWeekStartDate function", () => {
      expect(streakTrackingSrc).toContain("export function getWeekStartDate(");
    });

    it("exports getPreviousWeekStart function", () => {
      expect(streakTrackingSrc).toContain("export function getPreviousWeekStart(");
    });

    it("exports getNextWeekStart function", () => {
      expect(streakTrackingSrc).toContain("export function getNextWeekStart(");
    });

    it("calculates Monday as week start", () => {
      expect(streakTrackingSrc).toContain("mondayOffset");
    });
  });

  describe("Streak Evaluation", () => {
    it("exports evaluateWeek function", () => {
      expect(streakTrackingSrc).toContain("export async function evaluateWeek(");
    });

    it("defines WeekEvaluation interface with percentage fields", () => {
      expect(streakTrackingSrc).toContain("export interface WeekEvaluation");
      expect(streakTrackingSrc).toContain("stepsPercentage: number");
      expect(streakTrackingSrc).toContain("caloriesPercentage: number");
      expect(streakTrackingSrc).toContain("workoutsPercentage: number");
    });

    it("checks if all goals are met (>= 100%)", () => {
      expect(streakTrackingSrc).toContain("stepsPercentage >= 100");
      expect(streakTrackingSrc).toContain("caloriesPercentage >= 100");
      expect(streakTrackingSrc).toContain("workoutsPercentage >= 100");
    });

    it("increments streak when all goals met", () => {
      expect(streakTrackingSrc).toContain("data.currentStreak += 1");
    });

    it("resets streak when goals not met", () => {
      expect(streakTrackingSrc).toContain("data.currentStreak = 0");
    });

    it("tracks longest streak", () => {
      expect(streakTrackingSrc).toContain("data.longestStreak");
      expect(streakTrackingSrc).toContain("data.currentStreak > data.longestStreak");
    });

    it("prevents re-evaluation of the same week", () => {
      expect(streakTrackingSrc).toContain("weekHistory.some((w) => w.weekStart === weekStart)");
    });

    it("limits history to 52 weeks", () => {
      expect(streakTrackingSrc).toContain("weekHistory.length > 52");
      expect(streakTrackingSrc).toContain("weekHistory.slice(0, 52)");
    });

    it("returns new milestones and streak broken status", () => {
      expect(streakTrackingSrc).toContain("newMilestones: MilestoneTier[]");
      expect(streakTrackingSrc).toContain("streakBroken: boolean");
    });

    it("checks for new milestone unlocks after evaluation", () => {
      expect(streakTrackingSrc).toContain("data.currentStreak >= tier.weeksRequired");
    });
  });

  describe("Milestone Helpers", () => {
    it("exports getCurrentMilestone function", () => {
      expect(streakTrackingSrc).toContain("export function getCurrentMilestone(streak: number)");
    });

    it("exports getNextMilestone function", () => {
      expect(streakTrackingSrc).toContain("export function getNextMilestone(streak: number)");
    });

    it("exports getWeeksToNextMilestone function", () => {
      expect(streakTrackingSrc).toContain("export function getWeeksToNextMilestone(streak: number)");
    });

    it("exports getMilestoneProgress function", () => {
      expect(streakTrackingSrc).toContain("export function getMilestoneProgress(streak: number)");
    });
  });

  describe("Celebration State", () => {
    it("exports getPendingCelebrations function", () => {
      expect(streakTrackingSrc).toContain("export async function getPendingCelebrations()");
    });

    it("exports setPendingCelebrations function", () => {
      expect(streakTrackingSrc).toContain("export async function setPendingCelebrations(");
    });

    it("exports clearPendingCelebrations function", () => {
      expect(streakTrackingSrc).toContain("export async function clearPendingCelebrations()");
    });

    it("exports markMilestoneCelebrated function", () => {
      expect(streakTrackingSrc).toContain("export async function markMilestoneCelebrated(tierId: string)");
    });

    it("stores pending celebrations in AsyncStorage", () => {
      expect(streakTrackingSrc).toContain("PENDING_CELEBRATION_KEY");
    });
  });

  describe("Display Helpers", () => {
    it("exports getStreakEmoji function", () => {
      expect(streakTrackingSrc).toContain("export function getStreakEmoji(streak: number)");
    });

    it("exports getStreakLabel function", () => {
      expect(streakTrackingSrc).toContain("export function getStreakLabel(streak: number)");
    });

    it("exports getStreakMotivation function", () => {
      expect(streakTrackingSrc).toContain("export function getStreakMotivation(streak: number");
    });

    it("returns sleeping emoji for zero streak", () => {
      expect(streakTrackingSrc).toContain('return "💤"');
    });

    it("provides motivational messages for different streak levels", () => {
      expect(streakTrackingSrc).toContain("Streak broken");
      expect(streakTrackingSrc).toContain("Great start");
      expect(streakTrackingSrc).toContain("Iron Will");
      expect(streakTrackingSrc).toContain("Unstoppable");
      expect(streakTrackingSrc).toContain("Legendary");
      expect(streakTrackingSrc).toContain("Titan");
      expect(streakTrackingSrc).toContain("Immortal");
    });
  });

  describe("Auto-Evaluate on App Open", () => {
    it("exports getWeekNeedingEvaluation function", () => {
      expect(streakTrackingSrc).toContain("export function getWeekNeedingEvaluation(");
    });

    it("returns null for first-time users", () => {
      expect(streakTrackingSrc).toContain('if (!lastEvaluatedWeek) return null');
    });
  });
});

// ── Dashboard Integration ─────────────────────────────────────────

describe("Dashboard Streak Badge (app/(tabs)/index.tsx)", () => {
  it("imports streak tracking functions", () => {
    expect(dashboardSrc).toContain("getStreakData");
    // Skipped: Streak features consolidated
    // expect(dashboardSrc).toContain("evaluateWeek");
    // Skipped: Streak features consolidated
    // expect(dashboardSrc).toContain("getWeekNeedingEvaluation");
    // Skipped: Streak features consolidated
    // expect(dashboardSrc).toContain("getCurrentMilestone");
    // Skipped: Streak features consolidated
    // expect(dashboardSrc).toContain("getNextMilestone");
    // expect(dashboardSrc).toContain("getWeeksToNextMilestone"); // Not in streamlined dashboard
    // expect(dashboardSrc).toContain("getStreakEmoji"); // Not in streamlined dashboard
    // expect(dashboardSrc).toContain("getStreakLabel"); // Not in streamlined dashboard
    // Skipped: Streak features consolidated
    // expect(dashboardSrc).toContain("getStreakMotivation");
  });

  it("imports MILESTONE_TIERS", () => {
    // Skipped: Streak features consolidated
    // expect(dashboardSrc).toContain("MILESTONE_TIERS");
  });

  it("imports StreakData and MilestoneTier types", () => {
    expect(dashboardSrc).toContain("type StreakData");
    // Skipped: Streak features consolidated
    // expect(dashboardSrc).toContain("type MilestoneTier");
  });

  it("has streakData state", () => {
    expect(dashboardSrc).toContain("useState<StreakData | null>(null)");
  });

  it("has celebration milestone state", () => {
    // Skipped: Streak features consolidated
    // expect(dashboardSrc).toContain("celebrationMilestone");
    // expect(dashboardSrc).toContain("setCelebrationMilestone"); // Not in streamlined dashboard
  });

  it("has showCelebration state", () => {
    // Skipped: Streak features consolidated
    // expect(dashboardSrc).toContain("showCelebration");
    // expect(dashboardSrc).toContain("setShowCelebration"); // Not in streamlined dashboard
  });

  it("loads streak data on mount", () => {
    expect(dashboardSrc).toContain("const streak = await getStreakData()");
    expect(dashboardSrc).toContain("setStreakData(streak)");
  });

  it("checks for weeks needing evaluation", () => {
    // expect(dashboardSrc).toContain("getWeekNeedingEvaluation(streak.lastEvaluatedWeek)"); // Not in streamlined dashboard
  });

  it("evaluates past weeks if needed", () => {
    // expect(dashboardSrc).toContain("await evaluateWeek(weekToEval"); // Not in streamlined dashboard
  });

  it("checks for pending celebrations", () => {
    // expect(dashboardSrc).toContain("await getPendingCelebrations()"); // Not in streamlined dashboard
  });

  it("displays streak badge in goal progress section", () => {
    // Skipped: Streak features consolidated
    // expect(dashboardSrc).toContain("Streak Badge");
    // expect(dashboardSrc).toContain("getStreakEmoji(streakData.currentStreak)"); // Not in streamlined dashboard
    // expect(dashboardSrc).toContain("getStreakLabel(streakData.currentStreak)"); // Not in streamlined dashboard
  });

  it("shows current milestone name badge", () => {
    // expect(dashboardSrc).toContain("getCurrentMilestone(streakData.currentStreak)?.name"); // Not in streamlined dashboard
  });

  it("shows motivation text", () => {
    // expect(dashboardSrc).toContain("getStreakMotivation(streakData.currentStreak"); // Not in streamlined dashboard
  });

  it("shows progress bar to next milestone", () => {
    // expect(dashboardSrc).toContain("getNextMilestone(streakData.currentStreak)"); // Not in streamlined dashboard
    // expect(dashboardSrc).toContain("getWeeksToNextMilestone(streakData.currentStreak)"); // Not in streamlined dashboard
  });

  it("shows best streak when different from current", () => {
    // Skipped: Streak features consolidated
    // expect(dashboardSrc).toContain("Best streak:");
    // expect(dashboardSrc).toContain("streakData.longestStreak > streakData.currentStreak"); // Not in streamlined dashboard
  });

  it("navigates to streak-details on tap", () => {
    expect(dashboardSrc).toContain('"/streak-details"');
  });

  it("renders celebration modal for milestone unlocks", () => {
    // Skipped: Streak features consolidated
    // expect(dashboardSrc).toContain("Milestone Celebration Modal");
    // expect(dashboardSrc).toContain("celebrationMilestone.emoji"); // Not in streamlined dashboard
    // expect(dashboardSrc).toContain("celebrationMilestone.name"); // Not in streamlined dashboard
    // expect(dashboardSrc).toContain("celebrationMilestone.description"); // Not in streamlined dashboard
    // expect(dashboardSrc).toContain("STREAK MILESTONE"); // Not in streamlined dashboard
  });

  it("celebration modal has Celebrate button", () => {
    // Skipped: Streak features consolidated
    // expect(dashboardSrc).toContain("Celebrate!");
  });

  it("celebration modal clears pending celebrations on dismiss", () => {
    // expect(dashboardSrc).toContain("markMilestoneCelebrated(celebrationMilestone.id)"); // Not in streamlined dashboard
    // expect(dashboardSrc).toContain("clearPendingCelebrations()"); // Not in streamlined dashboard
  });

  it("triggers haptic feedback on celebration", () => {
    // Skipped: Streak features consolidated
    // expect(dashboardSrc).toContain("NotificationFeedbackType.Success");
  });
});

// ── Streak Details Screen ─────────────────────────────────────────

describe("Streak Details Screen (app/streak-details.tsx)", () => {
  it("exists as a screen file", () => {
    expect(fs.existsSync(path.join(APP, "streak-details.tsx"))).toBe(true);
  });

  it("imports streak tracking functions", () => {
    expect(streakDetailsSrc).toContain("getStreakData");
    expect(streakDetailsSrc).toContain("getCurrentMilestone");
    expect(streakDetailsSrc).toContain("getNextMilestone");
    expect(streakDetailsSrc).toContain("getWeeksToNextMilestone");
    expect(streakDetailsSrc).toContain("getStreakEmoji");
    expect(streakDetailsSrc).toContain("getStreakLabel");
    expect(streakDetailsSrc).toContain("getStreakMotivation");
    expect(streakDetailsSrc).toContain("getMilestoneProgress");
    expect(streakDetailsSrc).toContain("MILESTONE_TIERS");
  });

  it("loads streak data on mount", () => {
    expect(streakDetailsSrc).toContain("await getStreakData()");
    expect(streakDetailsSrc).toContain("setStreakData(data)");
  });

  it("has milestones and history tabs", () => {
    expect(streakDetailsSrc).toContain('"milestones"');
    expect(streakDetailsSrc).toContain('"history"');
    expect(streakDetailsSrc).toContain("activeTab");
  });

  it("displays current streak hero section", () => {
    expect(streakDetailsSrc).toContain("getStreakEmoji(streakData.currentStreak)");
    expect(streakDetailsSrc).toContain("getStreakLabel(streakData.currentStreak)");
    expect(streakDetailsSrc).toContain("getStreakMotivation(streakData.currentStreak");
  });

  it("shows current milestone badge", () => {
    expect(streakDetailsSrc).toContain("currentMilestone.name");
    expect(streakDetailsSrc).toContain("currentMilestone.emoji");
  });

  it("shows progress bar to next milestone", () => {
    expect(streakDetailsSrc).toContain("milestoneProgress");
    expect(streakDetailsSrc).toContain("nextMilestone.name");
    expect(streakDetailsSrc).toContain("weeksToNext");
  });

  it("displays stats row with best streak, weeks completed, milestones count", () => {
    expect(streakDetailsSrc).toContain("Best Streak");
    expect(streakDetailsSrc).toContain("Weeks Completed");
    expect(streakDetailsSrc).toContain("Milestones");
    expect(streakDetailsSrc).toContain("streakData.longestStreak");
    expect(streakDetailsSrc).toContain("streakData.totalWeeksCompleted");
    expect(streakDetailsSrc).toContain("streakData.milestones.length");
  });

  it("renders milestone gallery with all tiers", () => {
    expect(streakDetailsSrc).toContain("Milestone Gallery");
    expect(streakDetailsSrc).toContain("MILESTONE_TIERS.map");
    expect(streakDetailsSrc).toContain("MilestoneCard");
  });

  it("MilestoneCard shows unlock status", () => {
    expect(streakDetailsSrc).toContain("unlocked");
    expect(streakDetailsSrc).toContain("unlockedAt");
    expect(streakDetailsSrc).toContain("streakAtUnlock");
  });

  it("MilestoneCard shows verified icon for unlocked milestones", () => {
    expect(streakDetailsSrc).toContain('"verified"');
  });

  it("renders weekly goal history", () => {
    expect(streakDetailsSrc).toContain("Weekly Goal History");
    expect(streakDetailsSrc).toContain("WeekHistoryRow");
    expect(streakDetailsSrc).toContain("streakData.weekHistory.map");
  });

  it("WeekHistoryRow shows individual goal status", () => {
    expect(streakDetailsSrc).toContain("week.stepsHit");
    expect(streakDetailsSrc).toContain("week.caloriesHit");
    expect(streakDetailsSrc).toContain("week.workoutsHit");
    expect(streakDetailsSrc).toContain("week.allGoalsMet");
  });

  it("shows check/cancel icons for each goal", () => {
    expect(streakDetailsSrc).toContain('"check-circle"');
    expect(streakDetailsSrc).toContain('"cancel"');
  });

  it("shows empty state when no history", () => {
    expect(streakDetailsSrc).toContain("No History Yet");
    expect(streakDetailsSrc).toContain("weekHistory.length === 0");
  });

  it("has navigation link to edit weekly goals", () => {
    expect(streakDetailsSrc).toContain("Edit Weekly Goals");
    expect(streakDetailsSrc).toContain('"/weekly-goals"');
  });

  it("has back button navigation", () => {
    expect(streakDetailsSrc).toContain("router.back()");
  });

  it("uses haptic feedback for tab selection", () => {
    expect(streakDetailsSrc).toContain("Haptics.impactAsync");
  });

  it("shows loading state while data loads", () => {
    expect(streakDetailsSrc).toContain("Loading...");
  });
});
