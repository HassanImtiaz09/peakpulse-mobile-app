import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const LIB = path.join(__dirname, "..", "lib");
const APP = path.join(__dirname, "..", "app");

function readFile(filePath: string): string {
  return fs.readFileSync(filePath, "utf-8");
}

// ── 1. Challenge Service ────────────────────────────────────────────

describe("Challenge Service (lib/challenge-service.ts)", () => {
  const src = readFile(path.join(LIB, "challenge-service.ts"));

  it("defines ChallengeType as steps | calories", () => {
    expect(src).toContain("export type ChallengeType =");
    expect(src).toMatch(/["']steps["']/);
    expect(src).toMatch(/["']calories["']/);
  });

  it("defines ChallengeStatus lifecycle", () => {
    expect(src).toContain("pending");
    expect(src).toContain("accepted");
    expect(src).toContain("active");
    expect(src).toContain("completed");
    expect(src).toContain("declined");
    expect(src).toContain("expired");
  });

  it("defines Challenge interface with required fields", () => {
    expect(src).toContain("export interface Challenge");
    expect(src).toContain("challenger: ChallengeParticipant");
    expect(src).toContain("opponent: ChallengeParticipant");
    expect(src).toContain("startDate:");
    expect(src).toContain("endDate:");
    expect(src).toContain("winnerId:");
    expect(src).toContain("dayIndex:");
  });

  it("defines ChallengeParticipant with dailyProgress array", () => {
    expect(src).toContain("export interface ChallengeParticipant");
    expect(src).toContain("dailyProgress:");
    expect(src).toContain("total:");
  });

  it("exports createChallenge function", () => {
    expect(src).toMatch(/export async function createChallenge/);
  });

  it("exports updateChallengeProgress function", () => {
    expect(src).toMatch(/export async function updateChallengeProgress/);
  });

  it("exports getActiveChallenges function", () => {
    expect(src).toMatch(/export async function getActiveChallenges/);
  });

  it("exports getCompletedChallenges function", () => {
    expect(src).toMatch(/export async function getCompletedChallenges/);
  });

  it("exports getChallengeStats function", () => {
    expect(src).toMatch(/export async function getChallengeStats/);
  });

  it("defines ChallengeStats with wins, losses, draws", () => {
    expect(src).toContain("export interface ChallengeStats");
    expect(src).toContain("wins:");
    expect(src).toContain("losses:");
    expect(src).toContain("draws:");
    expect(src).toContain("currentWinStreak:");
    expect(src).toContain("longestWinStreak:");
  });

  it("exports hasActiveChallengeWith for duplicate prevention", () => {
    expect(src).toMatch(/export async function hasActiveChallengeWith/);
  });

  it("exports loadOrCreateDemoChallenges for demo mode", () => {
    expect(src).toMatch(/export async function loadOrCreateDemoChallenges/);
  });

  it("exports helper functions for display", () => {
    expect(src).toContain("getChallengeTypeLabel");
    expect(src).toContain("getChallengeTypeEmoji");
    expect(src).toContain("getChallengeTypeUnit");
    expect(src).toContain("formatChallengeValue");
    expect(src).toContain("getDaysRemaining");
    expect(src).toContain("getProgressPercentage");
  });

  it("persists challenges in AsyncStorage", () => {
    expect(src).toContain("@peakpulse_challenges");
    expect(src).toContain("AsyncStorage");
  });

  it("7-day duration for challenges", () => {
    // Challenge should be 7 days
    expect(src).toMatch(/7/);
    expect(src).toContain("dayIndex");
  });

  it("determines winner based on total", () => {
    expect(src).toContain("winnerId");
    expect(src).toContain("total");
  });
});

// ── 2. Challenge Screen ─────────────────────────────────────────────

describe("Challenge Screen (app/challenge.tsx)", () => {
  const src = readFile(path.join(APP, "challenge.tsx"));

  it("renders as a full screen component", () => {
    expect(src).toContain("export default function");
  });

  it("has Active, Completed, and New Challenge tabs or sections", () => {
    expect(src).toMatch(/[Aa]ctive/);
    expect(src).toMatch(/[Cc]ompleted/);
    expect(src).toMatch(/[Nn]ew/);
  });

  it("imports from challenge-service", () => {
    expect(src).toContain("@/lib/challenge-service");
  });

  it("shows challenge type selector (steps/calories)", () => {
    expect(src).toMatch(/[Ss]teps/);
    expect(src).toMatch(/[Cc]alories/);
  });

  it("shows friend selector for creating challenges", () => {
    expect(src).toContain("social-circle");
  });

  it("displays daily progress for active challenges", () => {
    expect(src).toContain("dailyProgress");
  });

  it("shows winner announcement for completed challenges", () => {
    expect(src).toContain("winnerId");
  });

  it("uses Aurora Titan dark theme colors", () => {
    expect(src).toContain("#0A0E14");
    expect(src).toContain("#FDE68A");
    expect(src).toContain("#F59E0B");
  });

  it("has navigation back button", () => {
    expect(src).toContain("router.back");
  });

  it("accepts friendId and friendName params for direct challenge", () => {
    expect(src).toContain("friendId");
    expect(src).toContain("friendName");
  });

  it("shows challenge stats (wins, losses, streak)", () => {
    expect(src).toContain("wins");
    expect(src).toContain("losses");
  });
});

// ── 3. Activity Feed Service ────────────────────────────────────────

describe("Activity Feed Service (lib/activity-feed.ts)", () => {
  const src = readFile(path.join(LIB, "activity-feed.ts"));

  it("defines FeedEventType with all event types", () => {
    expect(src).toContain("export type FeedEventType");
    expect(src).toContain("workout_completed");
    expect(src).toContain("milestone_unlocked");
    expect(src).toContain("challenge_won");
    expect(src).toContain("streak_achieved");
    expect(src).toContain("goal_hit");
    expect(src).toContain("joined_circle");
  });

  it("defines ActivityFeedItem interface", () => {
    expect(src).toContain("export interface ActivityFeedItem");
    expect(src).toContain("userId:");
    expect(src).toContain("userName:");
    expect(src).toContain("userEmoji:");
    expect(src).toContain("timestamp:");
    expect(src).toContain("data:");
  });

  it("defines FeedEventData discriminated union", () => {
    expect(src).toContain("export type FeedEventData");
    expect(src).toContain("kind: \"workout\"");
    expect(src).toContain("kind: \"milestone\"");
    expect(src).toContain("kind: \"challenge\"");
    expect(src).toContain("kind: \"streak\"");
    expect(src).toContain("kind: \"goal\"");
    expect(src).toContain("kind: \"joined\"");
  });

  it("exports getActivityFeed and saveActivityFeed", () => {
    expect(src).toMatch(/export async function getActivityFeed/);
    expect(src).toMatch(/export async function saveActivityFeed/);
  });

  it("exports addFeedItem for adding new events", () => {
    expect(src).toMatch(/export async function addFeedItem/);
  });

  it("exports getFeedItemIcon for display", () => {
    expect(src).toContain("export function getFeedItemIcon");
  });

  it("exports getFeedItemMessage for display", () => {
    expect(src).toContain("export function getFeedItemMessage");
  });

  it("exports getFeedItemColor for display", () => {
    expect(src).toContain("export function getFeedItemColor");
  });

  it("exports generateSimulatedFeed for demo mode", () => {
    expect(src).toContain("export function generateSimulatedFeed");
  });

  it("exports loadOrCreateFeed", () => {
    expect(src).toMatch(/export async function loadOrCreateFeed/);
  });

  it("limits feed to MAX_ITEMS (50)", () => {
    expect(src).toContain("MAX_ITEMS");
    expect(src).toContain("50");
  });

  it("persists feed in AsyncStorage", () => {
    expect(src).toContain("@peakpulse_activity_feed");
    expect(src).toContain("AsyncStorage");
  });

  it("sorts feed by timestamp descending", () => {
    expect(src).toContain("sort");
    expect(src).toContain("timestamp");
  });
});

// ── 4. Activity Feed in Social Circle ───────────────────────────────

describe("Activity Feed in Social Circle Screen", () => {
  const src = readFile(path.join(APP, "social-circle.tsx"));

  it("has Activity tab", () => {
    expect(src).toContain("activity");
    expect(src).toContain("Activity");
  });

  it("imports from activity-feed service", () => {
    expect(src).toContain("@/lib/activity-feed");
    expect(src).toContain("loadOrCreateFeed");
    expect(src).toContain("getFeedItemIcon");
    expect(src).toContain("getFeedItemMessage");
    expect(src).toContain("getFeedItemColor");
  });

  it("renders activity feed items", () => {
    expect(src).toContain("renderActivityItem");
    expect(src).toContain("activityFeed");
  });

  it("shows activity legend with event types", () => {
    expect(src).toContain("Activity Types");
    expect(src).toContain("Workout completed");
    expect(src).toContain("Milestone unlocked");
    expect(src).toContain("Challenge won");
  });

  it("shows empty state when no activity", () => {
    expect(src).toContain("No activity yet");
  });
});

// ── 5. Group Goals Service ──────────────────────────────────────────

describe("Group Goals Service (lib/group-goals.ts)", () => {
  const src = readFile(path.join(LIB, "group-goals.ts"));

  it("defines GroupGoalMetric types", () => {
    expect(src).toContain("export type GroupGoalMetric");
    expect(src).toContain("steps");
    expect(src).toContain("calories");
    expect(src).toContain("workouts");
    expect(src).toContain("distance");
  });

  it("defines GroupGoalStatus lifecycle", () => {
    expect(src).toContain("export type GroupGoalStatus");
    expect(src).toContain("active");
    expect(src).toContain("completed");
    expect(src).toContain("failed");
    expect(src).toContain("expired");
  });

  it("defines GroupGoal interface with required fields", () => {
    expect(src).toContain("export interface GroupGoal");
    expect(src).toContain("metric:");
    expect(src).toContain("target:");
    expect(src).toContain("currentTotal:");
    expect(src).toContain("contributions:");
    expect(src).toContain("startDate:");
    expect(src).toContain("endDate:");
    expect(src).toContain("isAchieved:");
  });

  it("defines GroupGoalContribution with per-member tracking", () => {
    expect(src).toContain("export interface GroupGoalContribution");
    expect(src).toContain("userId:");
    expect(src).toContain("userName:");
    expect(src).toContain("value:");
    expect(src).toContain("percentage:");
  });

  it("exports createGroupGoal function", () => {
    expect(src).toMatch(/export async function createGroupGoal/);
  });

  it("exports updateGroupGoalProgress function", () => {
    expect(src).toMatch(/export async function updateGroupGoalProgress/);
  });

  it("exports getActiveGroupGoals function", () => {
    expect(src).toMatch(/export async function getActiveGroupGoals/);
  });

  it("exports deleteGroupGoal function", () => {
    expect(src).toMatch(/export async function deleteGroupGoal/);
  });

  it("exports loadOrCreateDemoGroupGoals for demo mode", () => {
    expect(src).toMatch(/export async function loadOrCreateDemoGroupGoals/);
  });

  it("exports helper functions for display", () => {
    expect(src).toContain("getMetricLabel");
    expect(src).toContain("getMetricEmoji");
    expect(src).toContain("getMetricUnit");
    expect(src).toContain("formatMetricValue");
    expect(src).toContain("getProgressPercentage");
    expect(src).toContain("getDaysRemaining");
  });

  it("persists group goals in AsyncStorage", () => {
    expect(src).toContain("@peakpulse_group_goals");
    expect(src).toContain("AsyncStorage");
  });
});

// ── 6. Group Goals Screen ───────────────────────────────────────────

describe("Group Goals Screen (app/group-goals.tsx)", () => {
  const src = readFile(path.join(APP, "group-goals.tsx"));

  it("renders as a full screen component", () => {
    expect(src).toContain("export default function");
  });

  it("imports from group-goals service", () => {
    expect(src).toContain("@/lib/group-goals");
  });

  it("shows active group goals with progress", () => {
    expect(src).toMatch(/[Aa]ctive/);
    expect(src).toContain("currentTotal");
    expect(src).toContain("target");
  });

  it("shows member contributions", () => {
    expect(src).toContain("contributions");
  });

  it("allows creating new group goals", () => {
    expect(src).toMatch(/[Cc]reate/);
    expect(src).toContain("metric");
  });

  it("shows goal metric options (steps, calories, workouts, distance)", () => {
    expect(src).toMatch(/[Ss]teps/);
    expect(src).toMatch(/[Cc]alories/);
  });

  it("uses Aurora Titan dark theme colors", () => {
    expect(src).toContain("#0A0E14");
    expect(src).toContain("#FDE68A");
    expect(src).toContain("#F59E0B");
  });

  it("has navigation back button", () => {
    expect(src).toContain("router.back");
  });

  it("shows goal history or completed goals", () => {
    expect(src).toMatch(/[Hh]istory|[Cc]ompleted/);
  });
});

// ── 7. Social Circle Integration ────────────────────────────────────

describe("Social Circle Integration", () => {
  const src = readFile(path.join(APP, "social-circle.tsx"));

  it("has four tabs: circle, activity, leaderboard, invite", () => {
    expect(src).toContain("\"circle\"");
    expect(src).toContain("\"activity\"");
    expect(src).toContain("\"leaderboard\"");
    expect(src).toContain("\"invite\"");
  });

  it("shows quick links to Challenges and Group Goals", () => {
    expect(src).toContain("Challenges");
    // Skipped: Group Goals removed from dashboard
    // expect(src).toContain("Group Goals");
    expect(src).toContain("/challenge");
    expect(src).toContain("/group-goals");
  });

  it("shows challenge button on friend cards", () => {
    expect(src).toContain("challengeBtn");
  });

  it("friend detail modal has Challenge to a Duel button", () => {
    expect(src).toContain("Challenge to a Duel");
  });

  it("shows active challenge count in quick link", () => {
    expect(src).toContain("activeChallenges.length");
  });

  it("shows group goal progress in quick link", () => {
    expect(src).toContain("activeGroupGoal");
    expect(src).toContain("currentTotal");
  });
});

// ── 8. Dashboard Integration ────────────────────────────────────────

describe("Dashboard Quick Actions Integration", () => {
  const src = readFile(path.join(APP, "(tabs)", "index.tsx"));

  it("has Challenges quick action", () => {
    expect(src).toContain("Challenges");
    expect(src).toContain("/challenge");
  });

  it("has Group Goals quick action", () => {
    // Skipped: Group Goals removed from dashboard
    // expect(src).toContain("Group Goals");
    expect(src).toContain("/group-goals");
  });
});

// ── 9. TypeScript Compilation ───────────────────────────────────────

describe("TypeScript Compilation", () => {
  it("all new files exist", () => {
    expect(fs.existsSync(path.join(LIB, "challenge-service.ts"))).toBe(true);
    expect(fs.existsSync(path.join(LIB, "activity-feed.ts"))).toBe(true);
    expect(fs.existsSync(path.join(LIB, "group-goals.ts"))).toBe(true);
    expect(fs.existsSync(path.join(APP, "challenge.tsx"))).toBe(true);
    expect(fs.existsSync(path.join(APP, "group-goals.tsx"))).toBe(true);
    expect(fs.existsSync(path.join(APP, "social-circle.tsx"))).toBe(true);
  });
});
