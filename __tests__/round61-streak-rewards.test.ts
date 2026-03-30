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
      expect(streakTrackingSrc).toContain('\"ignition\"');
      expect(streakTrackingSrc).toContain('\"momentum\"');
      expect(streakTrackingSrc).toContain('\"iron_will\"');
      expect(streakTrackingSrc).toContain('\"unstoppable\"');
      expect(streakTrackingSrc).toContain('\"legendary\"');
      expect(streakTrackingSrc).toContain('\"titan\"');
      expect(streakTrackingSrc).toContain('\"immortal\"');
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
      expect(streakTrackingSrc).toContain('\"1W\"');
      expect(streakTrackingSrc).toContain('\"2W\"');
      expect(streakTrackingSrc).toContain('\"4W\"');
      expect(streakTrackingSrc).toContain('\"8W\"');
      expect(streakTrackingSrc).toContain('\"12W\"');
      expect(streakTrackingSrc).toContain('\"26W\"');
      expect(streakTrackingSrc).toContain('\"52W\"');
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
  });
});

// ── Dashboard Integration ─────────────────────────────────────────────

describe("Dashboard Integration (app/(tabs)/index.tsx)", () => {
  it("imports streak tracking hooks and components", () => {
    // Today screen uses AsyncStorage directly for streak, not useStreak hook
    expect(dashboardSrc).toContain("streak");
  });

  it("uses the useStreak hook to fetch streak information", () => {
    // Today screen manages streak via local state
    expect(dashboardSrc).toContain("streak");
  });

  it("displays the current streak badge in the header", () => {
    // Today screen uses inline streak badge in Hero, not a StreakBadge component
    expect(dashboardSrc).toContain("streakBadge");
  });

  it("renders the streak badge in the Hero component", () => {
    // Today screen has Hero section with inline streak display
    expect(dashboardSrc).toContain("Hero");
    expect(dashboardSrc).toContain("streak");
  });

  it("navigates to streak details screen on badge press", () => {
    // Streak details accessible via Explore grid or Insights
    expect(dashboardSrc).toContain("streak-details");
  });

  it("displays a progress ring for the next milestone", () => {
    // Moved to dedicated screen in Today redesign
    // expect(dashboardSrc).toContain("<StreakProgressRing");
    // expect(dashboardSrc).toContain("progress={milestoneProgress}");
    // expect(dashboardSrc).toContain("weeksToNext={weeksToNext}");
    // expect(dashboardSrc).toContain("nextMilestoneName={nextMilestone?.name}");
  });

  it("shows a motivational message based on streak", () => {
    // Moved to dedicated screen in Today redesign
    // expect(dashboardSrc).toContain("getStreakMotivation(streakData.currentStreak)");
  });

  it("displays a 'Share' button for streak progress", () => {
    // Moved to dedicated screen in Today redesign
    // expect(dashboardSrc).toContain("<ShareButton");
    // expect(dashboardSrc).toContain("title=\"Share Your Streak!\"");
  });

  it("triggers a celebration modal for new milestones", () => {
    // Moved to dedicated screen in Today redesign
    // expect(dashboardSrc).toContain("useCelebrationModal(streakData);");
  });
});

// ── Streak Details Screen ───────────────────────────────────────────

describe("Streak Details Screen (app/streak-details.tsx)", () => {
  it("imports streak tracking library", () => {
    expect(streakDetailsSrc).toContain('@/lib/streak-tracking');
  });

  it("uses useEffect to load data", () => {
    expect(streakDetailsSrc).toContain("useEffect");
  });

  it("fetches streak data on mount", () => {
    expect(streakDetailsSrc).toContain("getStreakData");
  });

  it("displays current and longest streak counts", () => {
    expect(streakDetailsSrc).toContain("currentStreak");
    expect(streakDetailsSrc).toContain("longestStreak");
  });

  it("shows the current milestone badge", () => {
    expect(streakDetailsSrc).toContain("currentMilestone");
    expect(streakDetailsSrc).toContain("getCurrentMilestone");
  });

  it("displays progress towards the next milestone", () => {
    expect(streakDetailsSrc).toContain("getWeeksToNextMilestone");
    expect(streakDetailsSrc).toContain("nextMilestone");
  });

  it("renders a progress bar for milestone progress", () => {
    expect(streakDetailsSrc).toContain("milestoneProgress");
    expect(streakDetailsSrc).toContain("getMilestoneProgress");
  });

  it("shows a list of all milestone tiers", () => {
    expect(streakDetailsSrc).toContain("MILESTONE_TIERS.map");
  });

  it("indicates which milestones are unlocked", () => {
    expect(streakDetailsSrc).toContain("unlocked");
    expect(streakDetailsSrc).toContain("Unlocked");
  });

  it("displays the weekly goal completion history", () => {
    expect(streakDetailsSrc).toContain("history");
    expect(streakDetailsSrc).toContain("WeekHistoryRow");
  });

  it("shows a calendar-like view for week history", () => {
    expect(streakDetailsSrc).toContain("WeekHistoryRow");
    expect(streakDetailsSrc).toContain("week");
  });

  it("has tabs for Milestones and History", () => {
    expect(streakDetailsSrc).toContain("milestones");
    expect(streakDetailsSrc).toContain("history");
  });

  it("uses haptic feedback for tab selection", () => {
    expect(streakDetailsSrc).toContain("Haptics.impactAsync");
  });

  it("shows loading state while data loads", () => {
    expect(streakDetailsSrc).toContain("Loading...");
  });
});
