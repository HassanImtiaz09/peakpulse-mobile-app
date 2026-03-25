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
    expect(src).toContain("export interface StreakFreezeData");
    expect(src).toContain("freezesUsedThisMonth");
    expect(src).toContain("lastFreezeDate");
    expect(src).toContain("lastFreezeMonth");
    expect(src).toContain("freezeHistory");
  });

  it("defines FreezeRecord interface", () => {
    expect(src).toContain("export interface FreezeRecord");
    expect(src).toContain("weekStart");
    expect(src).toContain("activatedAt");
    expect(src).toContain("reason");
  });

  it("includes freezeData in StreakData", () => {
    expect(src).toContain("freezeData: StreakFreezeData");
  });

  it("exports canUseFreeze function", () => {
    expect(src).toContain("export function canUseFreeze");
    expect(src).toContain("freezeData: StreakFreezeData");
  });

  it("canUseFreeze checks monthly limit of 1", () => {
    expect(src).toContain("freezesUsedThisMonth >= 1");
  });

  it("exports getFreezesRemaining function", () => {
    expect(src).toContain("export function getFreezesRemaining");
    expect(src).toContain("Math.max(0, 1 - freezeData.freezesUsedThisMonth)");
  });

  it("exports activateStreakFreeze function", () => {
    expect(src).toContain("export async function activateStreakFreeze");
    expect(src).toContain("reason?: string");
  });

  it("activateStreakFreeze validates no active streak", () => {
    expect(src).toContain("data.currentStreak === 0");
    expect(src).toContain("No active streak to freeze");
  });

  it("activateStreakFreeze validates monthly limit", () => {
    expect(src).toContain("canUseFreeze(data.freezeData)");
    expect(src).toContain("already used your streak freeze this month");
  });

  it("activateStreakFreeze prevents double-freezing same week", () => {
    expect(src).toContain("This week is already frozen");
  });

  it("activateStreakFreeze creates FreezeRecord with reason", () => {
    expect(src).toContain("const freezeRecord: FreezeRecord");
    expect(src).toContain("reason,");
  });

  it("keeps max 12 freeze history records", () => {
    expect(src).toContain("freezeHistory.length > 12");
  });

  it("exports isCurrentWeekFrozen function", () => {
    expect(src).toContain("export function isCurrentWeekFrozen");
    expect(src).toContain("freezeData.freezeHistory.some");
  });

  it("exports getCurrentMonth helper", () => {
    expect(src).toContain("export function getCurrentMonth");
    expect(src).toContain("YYYY-MM");
  });

  it("evaluateWeek respects freeze — preserves streak when frozen", () => {
    expect(src).toContain("hasFreezeForWeek");
    expect(src).toContain("weekResult.frozen = true");
    expect(src).toContain("freezeUsed = true");
  });

  it("evaluateWeek returns freezeUsed in result", () => {
    expect(src).toContain("freezeUsed: boolean");
    expect(src).toContain("return { streakData: data, newMilestones, streakBroken, freezeUsed }");
  });

  it("WeekResult has frozen field", () => {
    expect(src).toContain("frozen?: boolean");
  });

  it("default freeze data has zero freezes", () => {
    expect(src).toContain("DEFAULT_FREEZE_DATA");
    expect(src).toContain("freezesUsedThisMonth: 0");
  });

  it("monthly counter resets on new month", () => {
    expect(src).toContain("freezesUsedThisMonth = 1");
    expect(src).toContain("lastFreezeMonth = currentMonth");
  });
});

// ── 2. Milestone Sharing Card ────────────────────────────────────

describe("Milestone Sharing Card (lib/social-card-generator.ts)", () => {
  const src = readFile("lib/social-card-generator.ts");

  it("defines MilestoneCardData interface", () => {
    expect(src).toContain("export interface MilestoneCardData");
    expect(src).toContain("milestoneName: string");
    expect(src).toContain("milestoneEmoji: string");
    expect(src).toContain("milestoneBadge: string");
    expect(src).toContain("milestoneColor: string");
    expect(src).toContain("milestoneDescription: string");
    expect(src).toContain("currentStreak: number");
    expect(src).toContain("longestStreak: number");
    expect(src).toContain("totalWeeksCompleted: number");
    expect(src).toContain("userName?: string");
  });

  it("exports generateMilestoneCardHTML function", () => {
    expect(src).toContain("export function generateMilestoneCardHTML");
  });

  it("milestone card HTML has PeakPulse branding", () => {
    expect(src).toContain("PEAKPULSE AI");
    expect(src).toContain("Precision Performance");
  });

  it("milestone card HTML has trophy circle", () => {
    expect(src).toContain("trophy-circle");
  });

  it("milestone card HTML has confetti decoration", () => {
    expect(src).toContain("confetti");
  });

  it("milestone card HTML has stats section", () => {
    expect(src).toContain("Current Streak");
    expect(src).toContain("Best Streak");
    expect(src).toContain("Weeks Completed");
  });

  it("milestone card HTML has badge label", () => {
    expect(src).toContain("MILESTONE UNLOCKED");
    expect(src).toContain("badge-label");
  });

  it("milestone card HTML uses milestone color for styling", () => {
    expect(src).toContain("const c = data.milestoneColor");
  });

  it("milestone card HTML conditionally shows user name", () => {
    expect(src).toContain("data.userName");
    expect(src).toContain("user-name");
  });

  it("exports shareMilestoneCard function", () => {
    expect(src).toContain("export async function shareMilestoneCard");
  });

  it("shareMilestoneCard uses expo-print for native", () => {
    expect(src).toContain("printToFileAsync");
    expect(src).toContain("Share Milestone Achievement");
  });

  it("shareMilestoneCard handles web platform", () => {
    expect(src).toContain("Platform.OS === \"web\"");
    expect(src).toContain("window.open");
  });

  it("milestone card has dark theme background", () => {
    expect(src).toContain("#0A0E14");
    expect(src).toContain("#1A2030");
  });

  it("milestone card uses Inter font", () => {
    expect(src).toContain("Inter");
  });
});

// ── 3. Dashboard Celebration Modal Share Button ──────────────────

describe("Dashboard Milestone Share Button (app/(tabs)/index.tsx)", () => {
  const src = readFile("app/(tabs)/index.tsx");

  it("imports shareMilestoneCard and MilestoneCardData", () => {
    expect(src).toContain("shareMilestoneCard");
    expect(src).toContain("MilestoneCardData");
  });

  it("celebration modal has Share Achievement button", () => {
    expect(src).toContain("Share Achievement");
  });

  it("share button creates MilestoneCardData from celebration milestone", () => {
    expect(src).toContain("const cardData: MilestoneCardData");
    expect(src).toContain("celebrationMilestone.name");
    expect(src).toContain("celebrationMilestone.emoji");
    expect(src).toContain("celebrationMilestone.badge");
  });

  it("share button calls shareMilestoneCard", () => {
    expect(src).toContain("await shareMilestoneCard(cardData)");
  });

  it("share button has share icon", () => {
    expect(src).toContain("name=\"share\"");
  });
});

// ── 4. Streak Details — Freeze UI ───────────────────────────────

describe("Streak Details — Freeze UI (app/streak-details.tsx)", () => {
  const src = readFile("app/streak-details.tsx");

  it("imports freeze functions", () => {
    expect(src).toContain("canUseFreeze");
    expect(src).toContain("getFreezesRemaining");
    expect(src).toContain("activateStreakFreeze");
    expect(src).toContain("isCurrentWeekFrozen");
  });

  it("has freeze reason text input", () => {
    expect(src).toContain("freezeReason");
    expect(src).toContain("setFreezeReason");
    expect(src).toContain("TextInput");
    expect(src).toContain("illness, travel, injury");
  });

  it("has Freeze This Week button", () => {
    expect(src).toContain("Freeze This Week");
  });

  it("shows freeze confirmation alert", () => {
    expect(src).toContain("Freeze Your Streak");
    expect(src).toContain("protect your streak");
  });

  it("handles freeze activation result", () => {
    expect(src).toContain("activateStreakFreeze(freezeReason");
    expect(src).toContain("result.success");
    expect(src).toContain("Streak Frozen");
  });

  it("shows frozen week indicator", () => {
    expect(src).toContain("weekFrozen");
    expect(src).toContain("Streak frozen this week");
  });

  it("shows freeze availability status", () => {
    expect(src).toContain("freezeAvailable");
    expect(src).toContain("freezesRemaining");
    expect(src).toContain("1 freeze available this month");
  });

  it("displays freeze history", () => {
    expect(src).toContain("FREEZE HISTORY");
    expect(src).toContain("freezeData.freezeHistory");
    expect(src).toContain("freeze.reason");
  });

  it("shows frozen badge in week history rows", () => {
    expect(src).toContain("week.frozen");
    expect(src).toContain("FROZEN");
  });

  it("disables freeze when no active streak", () => {
    expect(src).toContain("streakData.currentStreak > 0 && freezeAvailable && !weekFrozen");
    expect(src).toContain("Build a streak first to use the freeze feature");
  });

  it("shows freeze used message when monthly limit reached", () => {
    expect(src).toContain("Freeze used this month");
    expect(src).toContain("resets on the 1st");
  });
});

// ── 5. Streak Details — Milestone Sharing ────────────────────────

describe("Streak Details — Milestone Sharing (app/streak-details.tsx)", () => {
  const src = readFile("app/streak-details.tsx");

  it("imports shareMilestoneCard and MilestoneCardData", () => {
    expect(src).toContain("shareMilestoneCard");
    expect(src).toContain("MilestoneCardData");
  });

  it("MilestoneCard component has Share button for unlocked milestones", () => {
    expect(src).toContain("onShare");
    expect(src).toContain(">Share</Text>");
  });

  it("handleShareMilestone creates card data from tier", () => {
    expect(src).toContain("handleShareMilestone");
    expect(src).toContain("const cardData: MilestoneCardData");
    expect(src).toContain("tier.name");
    expect(src).toContain("tier.emoji");
    expect(src).toContain("tier.badge");
  });

  it("handleShareMilestone calls shareMilestoneCard", () => {
    expect(src).toContain("await shareMilestoneCard(cardData)");
  });

  it("has sharing loading state", () => {
    expect(src).toContain("sharing");
    expect(src).toContain("setSharing");
  });
});

// ── 6. Workout Heatmap ──────────────────────────────────────────

describe("Workout Heatmap (app/streak-details.tsx)", () => {
  const src = readFile("app/streak-details.tsx");

  it("has heatmap tab in tab selector", () => {
    expect(src).toContain("\"heatmap\"");
    expect(src).toContain("Heatmap");
  });

  it("defines HeatmapDay interface", () => {
    expect(src).toContain("interface HeatmapDay");
    expect(src).toContain("date: string");
    expect(src).toContain("count: number");
    expect(src).toContain("dayOfWeek: number");
  });

  it("has getHeatmapData function that builds 91 days", () => {
    expect(src).toContain("function getHeatmapData");
    expect(src).toContain("90");
  });

  it("counts workouts per day from history", () => {
    expect(src).toContain("countMap");
    expect(src).toContain("entry.loggedAt");
  });

  it("has getHeatmapColor function with intensity levels", () => {
    expect(src).toContain("function getHeatmapColor");
    expect(src).toContain("count === 0");
    expect(src).toContain("count === 1");
    expect(src).toContain("count === 2");
  });

  it("renders SVG heatmap with Rect cells", () => {
    expect(src).toContain("import Svg");
    expect(src).toContain("Rect");
    expect(src).toContain("<Rect");
    expect(src).toContain("getHeatmapColor(day.count)");
  });

  it("renders month labels on heatmap", () => {
    expect(src).toContain("SvgText");
    expect(src).toContain("months.map");
    expect(src).toContain("m.label");
  });

  it("renders day-of-week labels", () => {
    expect(src).toContain("dayLabels");
    expect(src).toContain("Mon");
    expect(src).toContain("Wed");
    expect(src).toContain("Fri");
  });

  it("has legend with Less/More labels", () => {
    expect(src).toContain("Less");
    expect(src).toContain("More");
  });

  it("shows total workouts and active days count", () => {
    expect(src).toContain("totalWorkouts");
    expect(src).toContain("activeDays");
    expect(src).toContain("workouts in");
  });

  it("loads workout history from AsyncStorage", () => {
    expect(src).toContain("WORKOUT_HISTORY_KEY");
    expect(src).toContain("setWorkoutHistory");
  });

  it("has empty state for no workouts", () => {
    expect(src).toContain("No Workouts Logged");
    expect(src).toContain("Start logging workouts");
    expect(src).toContain("Log a Workout");
  });

  it("WorkoutHeatmap component receives workoutHistory prop", () => {
    expect(src).toContain("function WorkoutHeatmap");
    expect(src).toContain("workoutHistory: any[]");
  });

  it("heatmap is horizontally scrollable", () => {
    expect(src).toContain("ScrollView horizontal");
  });

  it("has three tabs: milestones, history, heatmap", () => {
    expect(src).toContain("[\"milestones\", \"history\", \"heatmap\"]");
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
    expect(streakDetails).toContain("#0A0E14");
    expect(streakDetails).toContain("#F59E0B");
    expect(streakDetails).toContain("#F1F5F9");
    expect(streakDetails).toContain("#B45309");
    expect(streakDetails).toContain("#FBBF24");
  });
});
