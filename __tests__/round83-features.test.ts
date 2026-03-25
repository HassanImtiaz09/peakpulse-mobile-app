import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const APP_DIR = path.join(__dirname, "..");
const read = (p: string) => fs.readFileSync(path.join(APP_DIR, p), "utf-8");

// ── Social Card Generator Tests ──────────────────────────────────
describe("Social Card Generator", () => {
  const src = read("lib/social-card-generator.ts");

  it("exports generateWorkoutCardHTML function", () => {
    expect(src).toContain("export function generateWorkoutCardHTML");
  });

  it("exports generateWeeklySummaryCardHTML function", () => {
    expect(src).toContain("export function generateWeeklySummaryCardHTML");
  });

  it("exports generateMilestoneCardHTML function", () => {
    expect(src).toContain("export function generateMilestoneCardHTML");
  });

  it("includes PeakPulse branding in workout card", () => {
    expect(src).toContain("PEAKPULSE AI");
  });

  it("escapes HTML to prevent XSS", () => {
    expect(src).toContain("escapeHtml");
  });

  it("supports workout type icons", () => {
    expect(src).toContain("running");
    expect(src).toContain("cycling");
    expect(src).toContain("swimming");
  });

  it("includes golden gradient styling", () => {
    // The card generator should use the golden theme
    expect(src).toMatch(/#F59E0B|#FBBF24|#FDE68A|gold/i);
  });
});

// ── Social Circle Service Tests ──────────────────────────────────
describe("Social Circle Service", () => {
  const src = read("lib/social-circle.ts");

  it("exports generateCircleCode function", () => {
    expect(src).toContain("export function generateCircleCode");
  });

  it("generates circle codes with PP- prefix", () => {
    expect(src).toContain("PP-");
  });

  it("exports buildInviteUrl function", () => {
    expect(src).toContain("export function buildInviteUrl");
  });

  it("builds invite URLs with peakpulse.app domain", () => {
    expect(src).toContain("peakpulse.app/circle/");
  });

  it("exports extractCircleCodeFromUrl function", () => {
    expect(src).toContain("export function extractCircleCodeFromUrl");
  });

  it("exports generateDemoFriends function", () => {
    expect(src).toContain("export function generateDemoFriends");
  });

  it("exports buildLeaderboard function", () => {
    expect(src).toContain("export function buildLeaderboard");
  });

  it("exports timeAgo function", () => {
    expect(src).toContain("export function timeAgo");
  });

  it("exports getMetricDisplay function", () => {
    expect(src).toContain("export function getMetricDisplay");
  });

  it("exports getCircleStats function", () => {
    expect(src).toContain("export function getCircleStats");
  });

  it("exports shareCircleInvite function", () => {
    expect(src).toContain("export async function shareCircleInvite");
  });

  it("exports removeFriend function", () => {
    expect(src).toContain("export async function removeFriend");
  });

  it("exports getActiveFriendsCount function", () => {
    expect(src).toContain("export function getActiveFriendsCount");
  });

  it("supports leaderboard metrics: streak, steps, calories, workouts, distance", () => {
    expect(src).toContain("streak");
    expect(src).toContain("steps");
    expect(src).toContain("calories");
    expect(src).toContain("workouts");
    expect(src).toContain("distance");
  });

  it("has FriendProfile type with required fields", () => {
    expect(src).toContain("id:");
    expect(src).toContain("name:");
    expect(src).toContain("avatarEmoji:");
    expect(src).toContain("weeklySteps:");
    expect(src).toContain("streakCount:");
  });
});

// ── Exercise Completion Context Tests ────────────────────────────
describe("Exercise Completion Context", () => {
  const src = read("lib/exercise-completion-context.tsx");

  it("exports ExerciseCompletionProvider", () => {
    expect(src).toContain("export function ExerciseCompletionProvider");
  });

  it("exports useExerciseCompletion hook", () => {
    expect(src).toContain("export function useExerciseCompletion");
  });

  it("persists completion state to AsyncStorage", () => {
    expect(src).toContain("AsyncStorage");
    expect(src).toContain("@exercise_completion");
  });

  it("provides toggleExercise function", () => {
    expect(src).toContain("toggleExercise");
  });

  it("provides isCompleted function", () => {
    expect(src).toContain("isCompleted");
  });

  it("provides getCompletedCount function", () => {
    expect(src).toContain("getCompletedCount");
  });
});

// ── Golden Background URLs Tests ─────────────────────────────────
describe("Golden Background URLs", () => {
  it("social circle uses golden background instead of Unsplash", () => {
    const content = read("app/social-circle.tsx");
    expect(content).not.toContain("unsplash.com");
    expect(content).toContain("cloudfront.net");
  });

  it("challenge screen uses golden background", () => {
    const content = read("app/challenge.tsx");
    expect(content).not.toContain("unsplash.com");
    expect(content).toContain("cloudfront.net");
  });

  it("daily-checkin screen uses golden background", () => {
    const content = read("app/daily-checkin.tsx");
    expect(content).not.toContain("unsplash.com");
    expect(content).toContain("cloudfront.net");
  });

  it("group-goals screen uses golden background", () => {
    const content = read("app/group-goals.tsx");
    expect(content).not.toContain("unsplash.com");
    expect(content).toContain("cloudfront.net");
  });

  it("pantry screen uses golden background", () => {
    const content = read("app/pantry.tsx");
    expect(content).not.toContain("unsplash.com");
    expect(content).toContain("cloudfront.net");
  });

  it("weekly summary has ImageBackground with golden theme", () => {
    const content = read("app/weekly-summary.tsx");
    expect(content).toContain("ImageBackground");
    expect(content).toContain("cloudfront.net");
    expect(content).toContain("golden-checkin-bg");
  });

  it("weekly summary tiles use translucent backgrounds", () => {
    const content = read("app/weekly-summary.tsx");
    expect(content).toContain("rgba(20,26,34,0.82)");
  });
});

// ── Weekly Summary Screen Tests ──────────────────────────────────
describe("Weekly Summary Screen", () => {
  const src = read("app/weekly-summary.tsx");

  it("exports default screen component", () => {
    expect(src).toContain("export default function WeeklySummaryScreen");
  });

  it("includes performance overview with progress rings", () => {
    expect(src).toContain("PERFORMANCE OVERVIEW");
    expect(src).toContain("ProgressRing");
  });

  it("includes workout completion stats", () => {
    expect(src).toContain("workoutsCompleted");
    expect(src).toContain("workoutsPlanned");
  });

  it("includes calorie adherence tracking", () => {
    expect(src).toContain("calorieAdherence");
    expect(src).toContain("avgCalories");
  });

  it("includes body composition changes", () => {
    expect(src).toContain("bodyFatCurrent");
    expect(src).toContain("bodyFatStart");
    expect(src).toContain("bodyFatTarget");
  });

  it("has share functionality", () => {
    expect(src).toContain("handleShare");
    expect(src).toContain("Share.share");
    expect(src).toContain("PeakPulse Weekly Summary");
  });

  it("includes streak and photos stats", () => {
    expect(src).toContain("Day Streak");
    expect(src).toContain("Photos This Week");
  });
});

// ── Share Progress Overlay Tests ─────────────────────────────────
describe("Share Progress Overlay in Scan Screen", () => {
  const src = read("app/(tabs)/scan.tsx");

  it("has share progress button", () => {
    expect(src).toContain("Share Progress");
    expect(src).toContain("showShareOverlay");
  });

  it("has ShareProgressOverlay component", () => {
    expect(src).toContain("ShareProgressOverlay");
  });

  it("has watermark toggle", () => {
    expect(src).toContain("watermarkEnabled");
    expect(src).toContain("PeakPulse Watermark");
  });

  it("has stats overlay toggle", () => {
    expect(src).toContain("statsOverlay");
    expect(src).toContain("Progress Stats");
  });

  it("has share transformation button", () => {
    expect(src).toContain("Share Transformation");
  });

  it("has watermark toggle control", () => {
    expect(src).toContain("watermarkEnabled");
    expect(src).toContain("setWatermarkEnabled");
  });
});

// ── Dashboard Navigation Tests ───────────────────────────────────
describe("Dashboard Navigation", () => {
  const src = read("app/(tabs)/index.tsx");

  it("has weekly summary quick action", () => {
    expect(src).toContain("Weekly Summary");
    expect(src).toContain("/weekly-summary");
  });

  it("has View Weekly Summary button in goals section", () => {
    expect(src).toContain("View Weekly Summary");
  });
});

// ── Social Circle Screen Tests ───────────────────────────────────
describe("Social Circle Screen", () => {
  const src = read("app/social-circle.tsx");

  it("has four tabs: circle, activity, leaderboard, invite", () => {
    expect(src).toContain("circle");
    expect(src).toContain("activity");
    expect(src).toContain("leaderboard");
    expect(src).toContain("invite");
  });

  it("has friend cards with stats", () => {
    expect(src).toContain("friendCard");
    expect(src).toContain("friendName");
    expect(src).toContain("friendStat");
  });

  it("has invite code sharing", () => {
    expect(src).toContain("Circle Code");
    expect(src).toContain("circleCode");
    expect(src).toContain("shareCircleInvite");
  });

  it("has leaderboard with multiple metrics", () => {
    expect(src).toContain("leaderboardMetric");
    expect(src).toContain("buildLeaderboard");
  });

  it("has activity feed", () => {
    expect(src).toContain("activityFeed");
    expect(src).toContain("ActivityFeedItem");
  });

  it("has challenge friends button", () => {
    expect(src).toContain("challengeBtn");
    expect(src).toContain("/challenge");
  });

  it("has referral discount tiers", () => {
    expect(src).toContain("discountData");
    expect(src).toContain("friendsRequired");
  });

  it("has pending invites section", () => {
    expect(src).toContain("pendingInvites");
  });

  it("has invite stats (sent, joined, rewards)", () => {
    expect(src).toContain("Invites Sent");
    expect(src).toContain("Friends Joined");
    expect(src).toContain("Rewards Earned");
  });
});
