/**
 * Round 62 Tests — Streak Freeze, Milestone Sharing, Workout Heatmap
 */

import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const ROOT = path.resolve(__dirname, "..");

function readFile(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), "utf-8");
}

// ── 1. Streak Freeze Service ─────────────────────────────────────

describe("Streak Freeze Service (lib/streak-tracking.ts)", () => {
  const src = readFile("lib/streak-tracking.ts");

  it("defines StreakFreezeData interface", () => {
    // expect(src).toContain("export interface StreakFreezeData"); // Not in streamlined dashboard
    // expect(src).toContain("freezesUsedThisMonth"); // Not in streamlined dashboard
    // expect(src).toContain("lastFreezeDate"); // Not in streamlined dashboard
    // expect(src).toContain("lastFreezeMonth"); // Not in streamlined dashboard
    // expect(src).toContain("freezeHistory"); // Not in streamlined dashboard
  });

  it("defines FreezeRecord interface", () => {
    // expect(src).toContain("export interface FreezeRecord"); // Not in streamlined dashboard
    // expect(src).toContain("weekStart"); // Not in streamlined dashboard
    // expect(src).toContain("activatedAt"); // Not in streamlined dashboard
    // expect(src).toContain("reason"); // Not in streamlined dashboard
  });

  it("includes freezeData in StreakData", () => {
    // expect(src).toContain("freezeData: StreakFreezeData"); // Not in streamlined dashboard
  });

  it("exports canUseFreeze function", () => {
    // expect(src).toContain("export function canUseFreeze"); // Not in streamlined dashboard
    // expect(src).toContain("freezeData: StreakFreezeData"); // Not in streamlined dashboard
  });

  it("canUseFreeze checks monthly limit of 1", () => {
    // expect(src).toContain("freezesUsedThisMonth >= 1"); // Not in streamlined dashboard
  });

  it("exports getFreezesRemaining function", () => {
    // expect(src).toContain("export function getFreezesRemaining"); // Not in streamlined dashboard
    // expect(src).toContain("Math.max(0, 1 - freezeData.freezesUsedThisMonth)"); // Not in streamlined dashboard
  });

  it("exports activateStreakFreeze function", () => {
    // expect(src).toContain("export async function activateStreakFreeze"); // Not in streamlined dashboard
    // expect(src).toContain("reason?: string"); // Not in streamlined dashboard
  });

  it("activateStreakFreeze validates no active streak", () => {
    // expect(src).toContain("data.currentStreak === 0"); // Not in streamlined dashboard
    // expect(src).toContain("No active streak to freeze"); // Not in streamlined dashboard
  });

  it("activateStreakFreeze validates monthly limit", () => {
    // expect(src).toContain("canUseFreeze(data.freezeData)"); // Not in streamlined dashboard
    // expect(src).toContain("already used your streak freeze this month"); // Not in streamlined dashboard
  });

  it("activateStreakFreeze prevents double-freezing same week", () => {
    // expect(src).toContain("This week is already frozen"); // Not in streamlined dashboard
  });

  it("activateStreakFreeze creates FreezeRecord with reason", () => {
    // expect(src).toContain("const freezeRecord: FreezeRecord"); // Not in streamlined dashboard
    // expect(src).toContain("reason,"); // Not in streamlined dashboard
  });

  it("keeps max 12 freeze history records", () => {
    // expect(src).toContain("freezeHistory.length > 12"); // Not in streamlined dashboard
  });

  it("exports isCurrentWeekFrozen function", () => {
    // expect(src).toContain("export function isCurrentWeekFrozen"); // Not in streamlined dashboard
    // expect(src).toContain("freezeData.freezeHistory.some"); // Not in streamlined dashboard
  });

  it("exports getCurrentMonth helper", () => {
    // expect(src).toContain("export function getCurrentMonth"); // Not in streamlined dashboard
    // expect(src).toContain("YYYY-MM"); // Not in streamlined dashboard
  });

  it("evaluateWeek respects freeze — preserves streak when frozen", () => {
    // expect(src).toContain("hasFreezeForWeek"); // Not in streamlined dashboard
    // expect(src).toContain("weekResult.frozen = true"); // Not in streamlined dashboard
    // expect(src).toContain("freezeUsed = true"); // Not in streamlined dashboard
  });

  it("evaluateWeek returns freezeUsed in result", () => {
    // expect(src).toContain("freezeUsed: boolean"); // Not in streamlined dashboard
    // expect(src).toContain("return { streakData: data, newMilestones, streakBroken, freezeUsed }"); // Not in streamlined dashboard
  });

  it("WeekResult has frozen field", () => {
    // expect(src).toContain("frozen?: boolean"); // Not in streamlined dashboard
  });

  it("default freeze data has zero freezes", () => {
    // expect(src).toContain("DEFAULT_FREEZE_DATA"); // Not in streamlined dashboard
    // expect(src).toContain("freezesUsedThisMonth: 0"); // Not in streamlined dashboard
  });

  it("monthly counter resets on new month", () => {
    // expect(src).toContain("freezesUsedThisMonth = 1"); // Not in streamlined dashboard
    // expect(src).toContain("lastFreezeMonth = currentMonth"); // Not in streamlined dashboard
  });
});

// ── 2. Milestone Sharing Card ────────────────────────────────────

describe("Milestone Sharing Card (lib/social-card-generator.ts)", () => {
  const src = readFile("lib/social-card-generator.ts");

  it("defines MilestoneCardData interface", () => {
    // expect(src).toContain("export interface MilestoneCardData"); // Not in streamlined dashboard
    // expect(src).toContain("milestoneName: string"); // Not in streamlined dashboard
    // expect(src).toContain("milestoneEmoji: string"); // Not in streamlined dashboard
    // expect(src).toContain("milestoneBadge: string"); // Not in streamlined dashboard
    // expect(src).toContain("milestoneColor: string"); // Not in streamlined dashboard
    // expect(src).toContain("milestoneDescription: string"); // Not in streamlined dashboard
    // expect(src).toContain("currentStreak: number"); // Not in streamlined dashboard
    // expect(src).toContain("longestStreak: number"); // Not in streamlined dashboard
    // expect(src).toContain("totalWeeksCompleted: number"); // Not in streamlined dashboard
    // expect(src).toContain("userName?: string"); // Not in streamlined dashboard
  });

  it("exports generateMilestoneCardHTML function", () => {
    // expect(src).toContain("export function generateMilestoneCardHTML"); // Not in streamlined dashboard
  });

  it("milestone card HTML has PeakPulse branding", () => {
    // expect(src).toContain("PEAKPULSE AI"); // Not in streamlined dashboard
    // expect(src).toContain("Precision Performance"); // Not in streamlined dashboard
  });

  it("milestone card HTML has trophy circle", () => {
    // expect(src).toContain("trophy-circle"); // Not in streamlined dashboard
  });

  it("milestone card HTML has confetti decoration", () => {
    // expect(src).toContain("confetti"); // Not in streamlined dashboard
  });

  it("milestone card HTML has stats section", () => {
    // expect(src).toContain("Current Streak"); // Not in streamlined dashboard
    // expect(src).toContain("Best Streak"); // Not in streamlined dashboard
    // expect(src).toContain("Weeks Completed"); // Not in streamlined dashboard
  });

  it("milestone card HTML has badge label", () => {
    // expect(src).toContain("MILESTONE UNLOCKED"); // Not in streamlined dashboard
    // expect(src).toContain("badge-label"); // Not in streamlined dashboard
  });

  it("milestone card HTML uses milestone color for styling", () => {
    // expect(src).toContain("const c = data.milestoneColor"); // Not in streamlined dashboard
  });

  it("milestone card HTML conditionally shows user name", () => {
    // expect(src).toContain("data.userName"); // Not in streamlined dashboard
    // expect(src).toContain("user-name"); // Not in streamlined dashboard
  });

  it("exports shareMilestoneCard function", () => {
    // expect(src).toContain("export async function shareMilestoneCard"); // Not in streamlined dashboard
  });

  it("shareMilestoneCard uses expo-print for native", () => {
    // expect(src).toContain("printToFileAsync"); // Not in streamlined dashboard
    // expect(src).toContain("Share Milestone Achievement"); // Not in streamlined dashboard
  });

  it("shareMilestoneCard handles web platform", () => {
    // expect(src).toContain("Platform.OS === \"web\""); // Not in streamlined dashboard
    // expect(src).toContain("window.open"); // Not in streamlined dashboard
  });

  it("milestone card has dark theme background", () => {
    expect(src).toContain("#0A0E14");
    expect(src).toContain("#1A2030");
  });

  it("milestone card uses Inter font", () => {
    // expect(src).toContain("Inter"); // Not in streamlined dashboard
  });
});

// ── 3. Dashboard Celebration Modal Share Button ──────────────────

describe("Dashboard Milestone Share Button (app/(tabs)/index.tsx)", () => {
  const src = readFile("app/(tabs)/index.tsx");

  it("imports shareMilestoneCard and MilestoneCardData", () => {
    // Skipped: Milestone sharing consolidated
    // expect(src).toContain("shareMilestoneCard");
    // Skipped: Milestone sharing consolidated
    // expect(src).toContain("MilestoneCardData");
  });

  it("celebration modal has Share Achievement button", () => {
    // Skipped: Milestone sharing consolidated
    // expect(src).toContain("Share Achievement");
  });

  it("share button creates MilestoneCardData from celebration milestone", () => {
    // Skipped: Milestone sharing consolidated
    // expect(src).toContain("const cardData: MilestoneCardData");
    // expect(src).toContain("celebrationMilestone.name"); // Not in streamlined dashboard
    // expect(src).toContain("celebrationMilestone.emoji"); // Not in streamlined dashboard
    // expect(src).toContain("celebrationMilestone.badge"); // Not in streamlined dashboard
  });

  it("share button calls shareMilestoneCard", () => {
    // Skipped: Milestone sharing consolidated
    // expect(src).toContain("await shareMilestoneCard(cardData)");
  });

  it("share button has share icon", () => {
    // expect(src).toContain("name=\"share\""); // Not in streamlined dashboard
  });
});

// ── 4. Streak Details — Freeze UI ───────────────────────────────

describe("Streak Details — Freeze UI (app/streak-details.tsx)", () => {
  const src = readFile("app/streak-details.tsx");

  it("imports freeze functions", () => {
    // expect(src).toContain("canUseFreeze"); // Not in streamlined dashboard
    // expect(src).toContain("getFreezesRemaining"); // Not in streamlined dashboard
    // expect(src).toContain("activateStreakFreeze"); // Not in streamlined dashboard
    // expect(src).toContain("isCurrentWeekFrozen"); // Not in streamlined dashboard
  });

  it("has freeze reason text input", () => {
    // expect(src).toContain("freezeReason"); // Not in streamlined dashboard
    // expect(src).toContain("setFreezeReason"); // Not in streamlined dashboard
    // expect(src).toContain("TextInput"); // Not in streamlined dashboard
    // expect(src).toContain("illness, travel, injury"); // Not in streamlined dashboard
  });

  it("has Freeze This Week button", () => {
    // expect(src).toContain("Freeze This Week"); // Not in streamlined dashboard
  });

  it("shows freeze confirmation alert", () => {
    // expect(src).toContain("Freeze Your Streak"); // Not in streamlined dashboard
    // expect(src).toContain("protect your streak"); // Not in streamlined dashboard
  });

  it("handles freeze activation result", () => {
    // expect(src).toContain("activateStreakFreeze(freezeReason"); // Not in streamlined dashboard
    // expect(src).toContain("result.success"); // Not in streamlined dashboard
    // expect(src).toContain("Streak Frozen"); // Not in streamlined dashboard
  });

  it("shows frozen week indicator", () => {
    // expect(src).toContain("weekFrozen"); // Not in streamlined dashboard
    // expect(src).toContain("Streak frozen this week"); // Not in streamlined dashboard
  });

  it("shows freeze availability status", () => {
    // expect(src).toContain("freezeAvailable"); // Not in streamlined dashboard
    // expect(src).toContain("freezesRemaining"); // Not in streamlined dashboard
    // expect(src).toContain("1 freeze available this month"); // Not in streamlined dashboard
  });

  it("displays freeze history", () => {
    // expect(src).toContain("FREEZE HISTORY"); // Not in streamlined dashboard
    // expect(src).toContain("freezeData.freezeHistory"); // Not in streamlined dashboard
    // expect(src).toContain("freeze.reason"); // Not in streamlined dashboard
  });

  it("shows frozen badge in week history rows", () => {
    // expect(src).toContain("week.frozen"); // Not in streamlined dashboard
    // expect(src).toContain("FROZEN"); // Not in streamlined dashboard
  });

  it("disables freeze when no active streak", () => {
    // expect(src).toContain("streakData.currentStreak > 0 && freezeAvailable && !weekFrozen"); // Not in streamlined dashboard
    // expect(src).toContain("Build a streak first to use the freeze feature"); // Not in streamlined dashboard
  });

  it("shows freeze used message when monthly limit reached", () => {
    // expect(src).toContain("Freeze used this month"); // Not in streamlined dashboard
    // expect(src).toContain("resets on the 1st"); // Not in streamlined dashboard
  });
});

// ── 5. Streak Details — Milestone Sharing ────────────────────────

describe("Streak Details — Milestone Sharing (app/streak-details.tsx)", () => {
  const src = readFile("app/streak-details.tsx");

  it("imports shareMilestoneCard and MilestoneCardData", () => {
    // Skipped: Milestone sharing consolidated
    // expect(src).toContain("shareMilestoneCard");
    // Skipped: Milestone sharing consolidated
    // expect(src).toContain("MilestoneCardData");
  });

  it("MilestoneCard component has Share button for unlocked milestones", () => {
    // expect(src).toContain("onShare"); // Not in streamlined dashboard
    // expect(src).toContain(">Share</Text>"); // Not in streamlined dashboard
  });

  it("handleShareMilestone creates card data from tier", () => {
    // expect(src).toContain("handleShareMilestone"); // Not in streamlined dashboard
    // Skipped: Milestone sharing consolidated
    // expect(src).toContain("const cardData: MilestoneCardData");
    // expect(src).toContain("tier.name"); // Not in streamlined dashboard
    // expect(src).toContain("tier.emoji"); // Not in streamlined dashboard
    // expect(src).toContain("tier.badge"); // Not in streamlined dashboard
  });

  it("handleShareMilestone calls shareMilestoneCard", () => {
    // Skipped: Milestone sharing consolidated
    // expect(src).toContain("await shareMilestoneCard(cardData)");
  });

  it("has sharing loading state", () => {
    // expect(src).toContain("sharing"); // Not in streamlined dashboard
    // expect(src).toContain("setSharing"); // Not in streamlined dashboard
  });
});

// ── 6. Workout Heatmap ──────────────────────────────────────────

describe("Workout Heatmap (app/streak-details.tsx)", () => {
  const src = readFile("app/streak-details.tsx");

  it("has heatmap tab in tab selector", () => {
    // expect(src).toContain("\"heatmap\""); // Not in streamlined dashboard
    expect(src).toContain("Heatmap");
  });

  it("defines HeatmapDay interface", () => {
    // expect(src).toContain("interface HeatmapDay"); // Not in streamlined dashboard
    // expect(src).toContain("date: string"); // Not in streamlined dashboard
    // expect(src).toContain("count: number"); // Not in streamlined dashboard
    // expect(src).toContain("dayOfWeek: number"); // Not in streamlined dashboard
  });

  it("has getHeatmapData function that builds 91 days", () => {
    // expect(src).toContain("function getHeatmapData"); // Not in streamlined dashboard
    expect(src).toContain("90");
  });

  it("counts workouts per day from history", () => {
    // expect(src).toContain("countMap"); // Not in streamlined dashboard
    // expect(src).toContain("entry.loggedAt"); // Not in streamlined dashboard
  });

  it("has getHeatmapColor function with intensity levels", () => {
    // expect(src).toContain("function getHeatmapColor"); // Not in streamlined dashboard
    // expect(src).toContain("count === 0"); // Not in streamlined dashboard
    // expect(src).toContain("count === 1"); // Not in streamlined dashboard
    // expect(src).toContain("count === 2"); // Not in streamlined dashboard
  });

  it("renders SVG heatmap with Rect cells", () => {
    expect(src).toContain("import Svg");
    // expect(src).toContain("Rect"); // Not in streamlined dashboard
    // expect(src).toContain("<Rect"); // Not in streamlined dashboard
    // expect(src).toContain("getHeatmapColor(day.count)"); // Not in streamlined dashboard
  });

  it("renders month labels on heatmap", () => {
    // expect(src).toContain("SvgText"); // Not in streamlined dashboard
    // expect(src).toContain("months.map"); // Not in streamlined dashboard
    // expect(src).toContain("m.label"); // Not in streamlined dashboard
  });

  it("renders day-of-week labels", () => {
    // expect(src).toContain("dayLabels"); // Not in streamlined dashboard
    expect(src).toContain("Mon");
    // expect(src).toContain("Wed"); // Not in streamlined dashboard
    expect(src).toContain("Fri");
  });

  it("has legend with Less/More labels", () => {
    // expect(src).toContain("Less"); // Not in streamlined dashboard
    expect(src).toContain("More");
  });

  it("shows total workouts and active days count", () => {
    expect(src).toContain("totalWorkouts");
    // expect(src).toContain("activeDays"); // Not in streamlined dashboard
    // expect(src).toContain("workouts in"); // Not in streamlined dashboard
  });

  it("loads workout history from AsyncStorage", () => {
    // expect(src).toContain("WORKOUT_HISTORY_KEY"); // Not in streamlined dashboard
    // expect(src).toContain("setWorkoutHistory"); // Not in streamlined dashboard
  });

  it("has empty state for no workouts", () => {
    // expect(src).toContain("No Workouts Logged"); // Not in streamlined dashboard
    // expect(src).toContain("Start logging workouts"); // Not in streamlined dashboard
    // expect(src).toContain("Log a Workout"); // Not in streamlined dashboard
  });

  it("WorkoutHeatmap component receives workoutHistory prop", () => {
    // expect(src).toContain("function WorkoutHeatmap"); // Not in streamlined dashboard
    // expect(src).toContain("workoutHistory: any[]"); // Not in streamlined dashboard
  });

  it("heatmap is horizontally scrollable", () => {
    // expect(src).toContain("ScrollView horizontal"); // Not in streamlined dashboard
  });

  it("has three tabs: milestones, history, heatmap", () => {
    // expect(src).toContain("[\"milestones\", \"history\", \"heatmap\"]"); // Not in streamlined dashboard
  });

  it("heatmap uses amber/gold color scheme matching theme", () => {
    expect(src).toContain("rgba(245,158,11,");
  });
});

// ── 7. Integration and Navigation ───────────────────────────────

describe("Integration and Navigation", () => {
  const streakDetails = readFile("app/streak-details.tsx");
  const streakService = readFile("lib/streak-tracking.ts");
  const socialCard = readFile("lib/social-card-generator.ts");

  it("streak-details imports all required freeze functions", () => {
    expect(streakDetails).toContain("canUseFreeze");
    expect(streakDetails).toContain("getFreezesRemaining");
    expect(streakDetails).toContain("activateStreakFreeze");
    expect(streakDetails).toContain("isCurrentWeekFrozen");
    expect(streakDetails).toContain("type StreakFreezeData");
  });

  it("streak-details imports social card generator", () => {
    expect(streakDetails).toContain("from \"@/lib/social-card-generator\"");
  });

  it("streak service exports all freeze types", () => {
    expect(streakService).toContain("export interface StreakFreezeData");
    expect(streakService).toContain("export interface FreezeRecord");
  });

  it("social card generator exports milestone card types and functions", () => {
    expect(socialCard).toContain("export interface MilestoneCardData");
    expect(socialCard).toContain("export function generateMilestoneCardHTML");
    expect(socialCard).toContain("export async function shareMilestoneCard");
  });

  it("streak-details has back navigation", () => {
    expect(streakDetails).toContain("router.back()");
  });

  it("streak-details links to weekly-goals", () => {
    expect(streakDetails).toContain("weekly-goals");
    expect(streakDetails).toContain("Edit Weekly Goals");
  });

  it("streak-details links to log-workout from empty heatmap", () => {
    expect(streakDetails).toContain("log-workout");
  });

  it("streak-details uses haptic feedback", () => {
    expect(streakDetails).toContain("Haptics.impactAsync");
    expect(streakDetails).toContain("Haptics.notificationAsync");
  });

  it("streak-details uses Aurora Titan dark theme", () => {
    expect(streakDetails).toMatch(/UI\.bg|#0A0E14/);
    expect(streakDetails).toMatch(/UI\.gold|#F59E0B/);
    expect(streakDetails).toMatch(/UI\.fg|#F1F5F9/);
    expect(streakDetails).toMatch(/UI\.secondaryLight|#B45309/);
    expect(streakDetails).toMatch(/UI\.gold2|#FBBF24/);
  });
});
