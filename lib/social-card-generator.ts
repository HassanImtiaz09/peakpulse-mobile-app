/**
 * Social Card Generator
 *
 * Generates branded HTML cards for sharing workout completions
 * and weekly summaries on social media. Uses expo-print to render
 * HTML to PDF, then expo-sharing to share.
 */

import { Platform } from "react-native";
import type { WorkoutType } from "@/lib/health-service";

// ── Types ──────────────────────────────────────────────────────────

export interface WorkoutCardData {
  type: WorkoutType;
  typeName: string;
  title: string;
  durationMinutes: number;
  caloriesBurned: number;
  distanceKm?: number;
  heartRateAvg?: number;
  date: string;
  userName?: string;
}

export interface WeeklySummaryCardData {
  weekRange: string; // e.g., "Mar 17 - Mar 23, 2026"
  avgSteps: number;
  totalCalories: number;
  totalWorkouts: number;
  avgSleepHours: number;
  avgHeartRate: number;
  totalDistanceKm: number;
  userName?: string;
  stepsGoalPct?: number;
  caloriesGoalPct?: number;
  workoutsGoalPct?: number;
}

// ── Workout Type Config ───────────────────────────────────────────

const WORKOUT_ICONS: Record<string, string> = {
  running: "🏃",
  walking: "🚶",
  cycling: "🚴",
  swimming: "🏊",
  strength_training: "🏋️",
  hiit: "⚡",
  yoga: "🧘",
  pilates: "🤸",
  dance: "💃",
  elliptical: "🏃",
  rowing: "🚣",
  stair_climbing: "🪜",
  other: "🏅",
};

const WORKOUT_COLORS: Record<string, string> = {
  running: "#22C55E",
  walking: "#3B82F6",
  cycling: "#F59E0B",
  swimming: "#06B6D4",
  strength_training: "#EF4444",
  hiit: "#F97316",
  yoga: "#8B5CF6",
  pilates: "#EC4899",
  dance: "#A78BFA",
  elliptical: "#14B8A6",
  rowing: "#0EA5E9",
  stair_climbing: "#FBBF24",
  other: "#9CA3AF",
};

// ── Workout Completion Card ───────────────────────────────────────

export function generateWorkoutCardHTML(data: WorkoutCardData): string {
  const icon = WORKOUT_ICONS[data.type] || "🏅";
  const color = WORKOUT_COLORS[data.type] || "#F59E0B";
  const hours = Math.floor(data.durationMinutes / 60);
  const mins = data.durationMinutes % 60;
  const durationStr = hours > 0 ? `${hours}h ${mins}m` : `${mins} min`;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Inter', -apple-system, sans-serif; background: #0A0500; color: #FFF7ED; }
  .card {
    width: 400px; min-height: 520px; margin: 0 auto;
    background: linear-gradient(160deg, #1C0E02 0%, #0A0500 50%, #1A0A00 100%);
    border: 2px solid rgba(245,158,11,0.25);
    border-radius: 24px; overflow: hidden; position: relative;
  }
  .card::before {
    content: ''; position: absolute; top: -50%; left: -50%;
    width: 200%; height: 200%;
    background: radial-gradient(circle at 30% 20%, ${color}08 0%, transparent 50%);
  }
  .header {
    padding: 28px 24px 16px; text-align: center; position: relative;
  }
  .icon-circle {
    width: 72px; height: 72px; border-radius: 50%; margin: 0 auto 14px;
    background: ${color}18; border: 2px solid ${color}40;
    display: flex; align-items: center; justify-content: center;
    font-size: 32px;
  }
  .workout-type {
    font-size: 11px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase;
    color: ${color}; margin-bottom: 6px;
  }
  .workout-title {
    font-size: 22px; font-weight: 900; color: #FFF7ED; line-height: 1.2;
  }
  .date {
    font-size: 12px; color: #B45309; margin-top: 6px;
  }
  .stats {
    display: flex; flex-wrap: wrap; gap: 10px; padding: 0 24px 20px;
    position: relative;
  }
  .stat-box {
    flex: 1 1 45%; background: rgba(245,158,11,0.06);
    border: 1px solid rgba(245,158,11,0.15); border-radius: 14px;
    padding: 14px; text-align: center;
  }
  .stat-value {
    font-size: 26px; font-weight: 900; color: #FBBF24;
  }
  .stat-label {
    font-size: 10px; font-weight: 600; color: #B45309; letter-spacing: 1px;
    text-transform: uppercase; margin-top: 4px;
  }
  .branding {
    padding: 16px 24px 20px; text-align: center;
    border-top: 1px solid rgba(245,158,11,0.10); position: relative;
  }
  .brand-name {
    font-size: 14px; font-weight: 800; color: #F59E0B;
    letter-spacing: 3px;
  }
  .brand-sub {
    font-size: 10px; color: #78350F; margin-top: 4px;
  }
  .user-name {
    font-size: 12px; color: #B45309; margin-top: 8px; font-weight: 600;
  }
  .accent-line {
    width: 40px; height: 3px; background: ${color}; border-radius: 2px;
    margin: 12px auto 0;
  }
</style>
</head>
<body>
<div class="card">
  <div class="header">
    <div class="icon-circle">${icon}</div>
    <div class="workout-type">${data.typeName} Complete</div>
    <div class="workout-title">${escapeHtml(data.title)}</div>
    <div class="date">${data.date}</div>
  </div>
  <div class="stats">
    <div class="stat-box">
      <div class="stat-value">${durationStr}</div>
      <div class="stat-label">Duration</div>
    </div>
    <div class="stat-box">
      <div class="stat-value">${data.caloriesBurned}</div>
      <div class="stat-label">Calories</div>
    </div>
    ${data.distanceKm ? `
    <div class="stat-box">
      <div class="stat-value">${data.distanceKm.toFixed(1)}</div>
      <div class="stat-label">Distance (km)</div>
    </div>` : ""}
    ${data.heartRateAvg ? `
    <div class="stat-box">
      <div class="stat-value">${data.heartRateAvg}</div>
      <div class="stat-label">Avg BPM</div>
    </div>` : ""}
  </div>
  <div class="branding">
    <div class="brand-name">PEAKPULSE AI</div>
    <div class="brand-sub">Precision Performance</div>
    ${data.userName ? `<div class="user-name">${escapeHtml(data.userName)}</div>` : ""}
    <div class="accent-line"></div>
  </div>
</div>
</body>
</html>`;
}

// ── Weekly Summary Card ───────────────────────────────────────────

export function generateWeeklySummaryCardHTML(data: WeeklySummaryCardData): string {
  const goalBadge = (pct: number | undefined) => {
    if (pct === undefined) return "";
    const color = pct >= 100 ? "#22C55E" : pct >= 75 ? "#F59E0B" : "#EF4444";
    const label = pct >= 100 ? "GOAL MET" : `${pct}%`;
    return `<span style="display:inline-block;background:${color}20;color:${color};font-size:9px;font-weight:700;padding:2px 6px;border-radius:4px;margin-left:6px;">${label}</span>`;
  };

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Inter', -apple-system, sans-serif; background: #0A0500; color: #FFF7ED; }
  .card {
    width: 400px; min-height: 580px; margin: 0 auto;
    background: linear-gradient(160deg, #1C0E02 0%, #0A0500 50%, #1A0A00 100%);
    border: 2px solid rgba(245,158,11,0.25);
    border-radius: 24px; overflow: hidden; position: relative;
  }
  .card::before {
    content: ''; position: absolute; top: -50%; left: -50%;
    width: 200%; height: 200%;
    background: radial-gradient(circle at 70% 20%, #F59E0B08 0%, transparent 50%);
  }
  .header {
    padding: 28px 24px 20px; text-align: center; position: relative;
    border-bottom: 1px solid rgba(245,158,11,0.10);
  }
  .week-label {
    font-size: 11px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase;
    color: #F59E0B; margin-bottom: 6px;
  }
  .week-range {
    font-size: 18px; font-weight: 900; color: #FFF7ED;
  }
  .stats {
    padding: 20px 24px; position: relative;
  }
  .stat-row {
    display: flex; align-items: center; gap: 12px;
    padding: 12px 0; border-bottom: 1px solid rgba(245,158,11,0.08);
  }
  .stat-row:last-child { border-bottom: none; }
  .stat-icon {
    width: 40px; height: 40px; border-radius: 12px;
    display: flex; align-items: center; justify-content: center;
    font-size: 20px; flex-shrink: 0;
  }
  .stat-info { flex: 1; }
  .stat-name {
    font-size: 11px; font-weight: 600; color: #B45309; letter-spacing: 0.5px;
  }
  .stat-val {
    font-size: 20px; font-weight: 900; color: #FBBF24; margin-top: 2px;
  }
  .stat-unit {
    font-size: 12px; font-weight: 600; color: #78350F;
  }
  .branding {
    padding: 16px 24px 24px; text-align: center;
    border-top: 1px solid rgba(245,158,11,0.10); position: relative;
  }
  .brand-name {
    font-size: 14px; font-weight: 800; color: #F59E0B; letter-spacing: 3px;
  }
  .brand-sub {
    font-size: 10px; color: #78350F; margin-top: 4px;
  }
  .user-name {
    font-size: 12px; color: #B45309; margin-top: 8px; font-weight: 600;
  }
  .accent-line {
    width: 40px; height: 3px; background: #F59E0B; border-radius: 2px;
    margin: 12px auto 0;
  }
</style>
</head>
<body>
<div class="card">
  <div class="header">
    <div class="week-label">Weekly Summary</div>
    <div class="week-range">${escapeHtml(data.weekRange)}</div>
  </div>
  <div class="stats">
    <div class="stat-row">
      <div class="stat-icon" style="background:#22C55E18;">🚶</div>
      <div class="stat-info">
        <div class="stat-name">AVG DAILY STEPS ${goalBadge(data.stepsGoalPct)}</div>
        <div class="stat-val">${data.avgSteps.toLocaleString()} <span class="stat-unit">steps</span></div>
      </div>
    </div>
    <div class="stat-row">
      <div class="stat-icon" style="background:#F59E0B18;">🔥</div>
      <div class="stat-info">
        <div class="stat-name">TOTAL CALORIES ${goalBadge(data.caloriesGoalPct)}</div>
        <div class="stat-val">${data.totalCalories.toLocaleString()} <span class="stat-unit">kcal</span></div>
      </div>
    </div>
    <div class="stat-row">
      <div class="stat-icon" style="background:#EF444418;">💪</div>
      <div class="stat-info">
        <div class="stat-name">WORKOUTS ${goalBadge(data.workoutsGoalPct)}</div>
        <div class="stat-val">${data.totalWorkouts} <span class="stat-unit">sessions</span></div>
      </div>
    </div>
    <div class="stat-row">
      <div class="stat-icon" style="background:#8B5CF618;">😴</div>
      <div class="stat-info">
        <div class="stat-name">AVG SLEEP</div>
        <div class="stat-val">${data.avgSleepHours.toFixed(1)} <span class="stat-unit">hours</span></div>
      </div>
    </div>
    <div class="stat-row">
      <div class="stat-icon" style="background:#EF444418;">❤️</div>
      <div class="stat-info">
        <div class="stat-name">AVG HEART RATE</div>
        <div class="stat-val">${data.avgHeartRate} <span class="stat-unit">bpm</span></div>
      </div>
    </div>
    <div class="stat-row">
      <div class="stat-icon" style="background:#3B82F618;">📏</div>
      <div class="stat-info">
        <div class="stat-name">TOTAL DISTANCE</div>
        <div class="stat-val">${data.totalDistanceKm.toFixed(1)} <span class="stat-unit">km</span></div>
      </div>
    </div>
  </div>
  <div class="branding">
    <div class="brand-name">PEAKPULSE AI</div>
    <div class="brand-sub">Precision Performance</div>
    ${data.userName ? `<div class="user-name">${escapeHtml(data.userName)}</div>` : ""}
    <div class="accent-line"></div>
  </div>
</div>
</body>
</html>`;
}

// ── Milestone Achievement Card ───────────────────────────────────

export interface MilestoneCardData {
  milestoneName: string;
  milestoneEmoji: string;
  milestoneBadge: string;
  milestoneColor: string;
  milestoneDescription: string;
  currentStreak: number;
  longestStreak: number;
  totalWeeksCompleted: number;
  userName?: string;
}

export function generateMilestoneCardHTML(data: MilestoneCardData): string {
  const c = data.milestoneColor || "#F59E0B";
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Inter', -apple-system, sans-serif; background: #0A0500; color: #FFF7ED; }
  .card {
    width: 400px; min-height: 560px; margin: 0 auto;
    background: linear-gradient(160deg, #1C0E02 0%, #0A0500 40%, #1A0A00 100%);
    border: 2px solid ${c}40;
    border-radius: 24px; overflow: hidden; position: relative;
  }
  .card::before {
    content: ''; position: absolute; top: -30%; left: -30%;
    width: 160%; height: 160%;
    background: radial-gradient(circle at 50% 30%, ${c}12 0%, transparent 60%);
  }
  .confetti {
    position: absolute; top: 0; left: 0; right: 0; text-align: center;
    font-size: 20px; padding: 12px; letter-spacing: 8px; opacity: 0.6;
  }
  .header {
    padding: 48px 24px 20px; text-align: center; position: relative;
  }
  .trophy-circle {
    width: 96px; height: 96px; border-radius: 50%; margin: 0 auto 16px;
    background: ${c}15; border: 3px solid ${c}50;
    display: flex; align-items: center; justify-content: center;
    font-size: 48px; position: relative;
  }
  .trophy-circle::after {
    content: ''; position: absolute; inset: -6px; border-radius: 50%;
    border: 1px solid ${c}20;
  }
  .badge-label {
    display: inline-block; background: ${c}20; color: ${c};
    font-size: 10px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase;
    padding: 4px 12px; border-radius: 6px; margin-bottom: 10px;
  }
  .milestone-name {
    font-size: 28px; font-weight: 900; color: #FFF7ED; line-height: 1.2;
  }
  .milestone-desc {
    font-size: 13px; color: #B45309; margin-top: 8px; line-height: 1.5;
    max-width: 300px; margin-left: auto; margin-right: auto;
  }
  .divider {
    height: 1px; background: ${c}15; margin: 0 24px;
  }
  .stats {
    display: flex; gap: 0; padding: 20px 24px; position: relative;
  }
  .stat-col {
    flex: 1; text-align: center;
    border-right: 1px solid ${c}10;
  }
  .stat-col:last-child { border-right: none; }
  .stat-value {
    font-size: 28px; font-weight: 900; color: ${c};
  }
  .stat-label {
    font-size: 9px; font-weight: 700; color: #78350F; letter-spacing: 1px;
    text-transform: uppercase; margin-top: 4px;
  }
  .streak-fire {
    text-align: center; padding: 8px 0 4px; position: relative;
  }
  .streak-fire span {
    font-size: 16px; letter-spacing: 4px;
  }
  .branding {
    padding: 16px 24px 24px; text-align: center;
    border-top: 1px solid ${c}10; position: relative;
  }
  .brand-name {
    font-size: 14px; font-weight: 800; color: #F59E0B; letter-spacing: 3px;
  }
  .brand-sub {
    font-size: 10px; color: #78350F; margin-top: 4px;
  }
  .user-name {
    font-size: 12px; color: #B45309; margin-top: 8px; font-weight: 600;
  }
  .accent-line {
    width: 40px; height: 3px; background: ${c}; border-radius: 2px;
    margin: 12px auto 0;
  }
</style>
</head>
<body>
<div class="card">
  <div class="confetti">\u2728 \u2B50 \u2728 \u2B50 \u2728 \u2B50 \u2728</div>
  <div class="header">
    <div class="trophy-circle">${data.milestoneEmoji}</div>
    <div class="badge-label">${escapeHtml(data.milestoneBadge)} MILESTONE UNLOCKED</div>
    <div class="milestone-name">${escapeHtml(data.milestoneName)}</div>
    <div class="milestone-desc">${escapeHtml(data.milestoneDescription)}</div>
  </div>
  <div class="divider"></div>
  <div class="stats">
    <div class="stat-col">
      <div class="stat-value">${data.currentStreak}</div>
      <div class="stat-label">Current Streak</div>
    </div>
    <div class="stat-col">
      <div class="stat-value">${data.longestStreak}</div>
      <div class="stat-label">Best Streak</div>
    </div>
    <div class="stat-col">
      <div class="stat-value">${data.totalWeeksCompleted}</div>
      <div class="stat-label">Weeks Completed</div>
    </div>
  </div>
  <div class="streak-fire">
    <span>\uD83D\uDD25\uD83D\uDD25\uD83D\uDD25</span>
  </div>
  <div class="branding">
    <div class="brand-name">PEAKPULSE AI</div>
    <div class="brand-sub">Precision Performance</div>
    ${data.userName ? `<div class="user-name">${escapeHtml(data.userName)}</div>` : ""}
    <div class="accent-line"></div>
  </div>
</div>
</body>
</html>`;
}

// ── Share Functions ────────────────────────────────────────────────

export async function shareWorkoutCard(data: WorkoutCardData): Promise<boolean> {
  if (Platform.OS === "web") {
    // Web: open in new window for screenshot
    const html = generateWorkoutCardHTML(data);
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    return true;
  }

  try {
    const Print = await import("expo-print");
    const Sharing = await import("expo-sharing");
    const html = generateWorkoutCardHTML(data);
    const { uri } = await Print.printToFileAsync({ html, width: 400, height: 520 });
    const available = await Sharing.isAvailableAsync();
    if (available) {
      await Sharing.shareAsync(uri, {
        mimeType: "application/pdf",
        dialogTitle: "Share Workout Card",
      });
      return true;
    }
  } catch (e) {
    console.warn("[SocialCard] Share failed:", e);
  }
  return false;
}

export async function shareWeeklySummaryCard(data: WeeklySummaryCardData): Promise<boolean> {
  if (Platform.OS === "web") {
    const html = generateWeeklySummaryCardHTML(data);
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    return true;
  }

  try {
    const Print = await import("expo-print");
    const Sharing = await import("expo-sharing");
    const html = generateWeeklySummaryCardHTML(data);
    const { uri } = await Print.printToFileAsync({ html, width: 400, height: 580 });
    const available = await Sharing.isAvailableAsync();
    if (available) {
      await Sharing.shareAsync(uri, {
        mimeType: "application/pdf",
        dialogTitle: "Share Weekly Summary",
      });
      return true;
    }
  } catch (e) {
    console.warn("[SocialCard] Share failed:", e);
  }
  return false;
}

export async function shareMilestoneCard(data: MilestoneCardData): Promise<boolean> {
  if (Platform.OS === "web") {
    const html = generateMilestoneCardHTML(data);
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    return true;
  }

  try {
    const Print = await import("expo-print");
    const Sharing = await import("expo-sharing");
    const html = generateMilestoneCardHTML(data);
    const { uri } = await Print.printToFileAsync({ html, width: 400, height: 560 });
    const available = await Sharing.isAvailableAsync();
    if (available) {
      await Sharing.shareAsync(uri, {
        mimeType: "application/pdf",
        dialogTitle: "Share Milestone Achievement",
      });
      return true;
    }
  } catch (e) {
    console.warn("[SocialCard] Milestone share failed:", e);
  }
  return false;
}

// ── Utility ───────────────────────────────────────────────────────

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
