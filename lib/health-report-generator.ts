/**
 * Health Report PDF Generator
 *
 * Generates a branded PeakPulse health report as a PDF using expo-print.
 * Supports 7-day and 30-day reports with daily breakdown tables,
 * summary stats, trend indicators, and health insights.
 *
 * Users can select which metrics to include and add personal notes
 * for their trainer, physio, or doctor.
 *
 * Uses expo-sharing to let users share the PDF.
 */

import * as Print from "expo-print";
import { shareAsync } from "expo-sharing";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fetchHealthHistory, type DailyHealthSummary } from "./health-service";

// ── Types ──

export type ReportMetricKey = "steps" | "heartRate" | "calories" | "sleep" | "distance" | "hrv";

export const ALL_REPORT_METRICS: { key: ReportMetricKey; label: string; icon: string }[] = [
  { key: "steps", label: "Steps", icon: "directions-walk" },
  { key: "heartRate", label: "Heart Rate", icon: "favorite" },
  { key: "calories", label: "Calories", icon: "local-fire-department" },
  { key: "sleep", label: "Sleep", icon: "bedtime" },
  { key: "distance", label: "Distance", icon: "straighten" },
  { key: "hrv", label: "HRV", icon: "monitor-heart" },
];

export const DEFAULT_SELECTED_METRICS: ReportMetricKey[] = [
  "steps", "heartRate", "calories", "sleep", "distance", "hrv",
];

export interface ReportConfig {
  period: 7 | 30;
  userName?: string;
  userAge?: number;
  userGoal?: string;
  /** Which metrics to include in the report. Defaults to all. */
  selectedMetrics?: ReportMetricKey[];
  /** Personal notes for the trainer/physio/doctor. */
  personalNotes?: string;
}

export interface ReportResult {
  success: boolean;
  uri?: string;
  error?: string;
}

// ── Persistence Keys ──
const REPORT_METRICS_KEY = "@report_selected_metrics";
const REPORT_NOTES_KEY = "@report_personal_notes";

export async function getReportPreferences(): Promise<{
  selectedMetrics: ReportMetricKey[];
  personalNotes: string;
}> {
  try {
    const [metricsRaw, notesRaw] = await Promise.all([
      AsyncStorage.getItem(REPORT_METRICS_KEY),
      AsyncStorage.getItem(REPORT_NOTES_KEY),
    ]);
    return {
      selectedMetrics: metricsRaw ? JSON.parse(metricsRaw) : [...DEFAULT_SELECTED_METRICS],
      personalNotes: notesRaw ?? "",
    };
  } catch {
    return { selectedMetrics: [...DEFAULT_SELECTED_METRICS], personalNotes: "" };
  }
}

export async function saveReportPreferences(
  selectedMetrics: ReportMetricKey[],
  personalNotes: string,
): Promise<void> {
  await Promise.all([
    AsyncStorage.setItem(REPORT_METRICS_KEY, JSON.stringify(selectedMetrics)),
    AsyncStorage.setItem(REPORT_NOTES_KEY, personalNotes),
  ]);
}

// ── User Info Helper ──
async function getUserName(): Promise<string> {
  try {
    const raw = await AsyncStorage.getItem("@user_profile");
    if (raw) {
      const profile = JSON.parse(raw);
      return profile.name || profile.displayName || "PeakPulse User";
    }
  } catch {}
  return "PeakPulse User";
}

// ── Stats Calculation ──
interface MetricStats {
  avg: number;
  best: number;
  lowest: number;
  total: number;
  trendPct: number;
  trendDir: "up" | "down" | "flat";
}

function calcMetricStats(values: number[]): MetricStats {
  if (values.length === 0) return { avg: 0, best: 0, lowest: 0, total: 0, trendPct: 0, trendDir: "flat" };
  const total = values.reduce((a, b) => a + b, 0);
  const avg = Math.round(total / values.length);
  const best = Math.max(...values);
  const lowest = Math.min(...values);

  // Trend: compare last third vs first third
  const third = Math.max(1, Math.floor(values.length / 3));
  const recentAvg = values.slice(-third).reduce((a, b) => a + b, 0) / third;
  const earlyAvg = values.slice(0, third).reduce((a, b) => a + b, 0) / third;
  const pct = earlyAvg > 0 ? Math.round(((recentAvg - earlyAvg) / earlyAvg) * 100) : 0;

  return {
    avg,
    best,
    lowest,
    total,
    trendPct: Math.abs(pct),
    trendDir: Math.abs(pct) < 3 ? "flat" : pct > 0 ? "up" : "down",
  };
}

// ── HTML Helpers ──
function trendArrow(dir: "up" | "down" | "flat"): string {
  if (dir === "up") return "&#8593;";
  if (dir === "down") return "&#8595;";
  return "&#8594;";
}

function trendColor(dir: "up" | "down" | "flat", higherIsBetter: boolean): string {
  if (dir === "flat") return "#6B7280";
  if ((dir === "up" && higherIsBetter) || (dir === "down" && !higherIsBetter)) return "#22C55E";
  return "#EF4444";
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

function has(metrics: ReportMetricKey[], key: ReportMetricKey): boolean {
  return metrics.includes(key);
}

// ── HTML Report Builder ──
export function generateReportHTML(
  data: DailyHealthSummary[],
  config: ReportConfig,
  userName: string,
): string {
  const now = new Date();
  const reportDate = now.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
  const periodLabel = config.period === 7 ? "7-Day" : "30-Day";
  const metrics = config.selectedMetrics ?? DEFAULT_SELECTED_METRICS;

  // Calculate stats (only for selected metrics)
  const stepsStats = has(metrics, "steps") ? calcMetricStats(data.map((d) => d.steps)) : null;
  const hrStats = has(metrics, "heartRate") ? calcMetricStats(data.filter((d) => d.heartRate > 0).map((d) => d.heartRate)) : null;
  const calStats = has(metrics, "calories") ? calcMetricStats(data.map((d) => d.activeCalories)) : null;
  const sleepStats = has(metrics, "sleep") ? calcMetricStats(data.map((d) => Math.round(d.sleepHours * 10) / 10)) : null;
  const distStats = has(metrics, "distance") ? calcMetricStats(data.map((d) => Math.round(d.distance * 10) / 10)) : null;
  const hrvStats = has(metrics, "hrv") ? calcMetricStats(data.filter((d) => d.hrv !== null).map((d) => d.hrv ?? 0)) : null;

  // Generate insights (only for selected metrics)
  const insights: string[] = [];
  if (stepsStats) {
    if (stepsStats.avg >= 10000) insights.push("Excellent step count — exceeding the recommended 10,000 steps/day target.");
    else if (stepsStats.avg >= 7000) insights.push("Good activity level. Aim for 10,000+ steps/day for optimal cardiovascular health.");
    else insights.push("Step count is below recommended levels. Consider adding short walks throughout the day.");
  }
  if (sleepStats) {
    if (sleepStats.avg >= 7) insights.push("Sleep duration is within the healthy range of 7-9 hours.");
    else insights.push("Sleep duration is below the recommended 7-9 hours. Prioritise sleep hygiene for better recovery.");
  }
  if (hrStats) {
    if (hrStats.avg > 0 && hrStats.avg < 60) insights.push("Resting heart rate indicates excellent cardiovascular fitness.");
    else if (hrStats.avg >= 60 && hrStats.avg <= 80) insights.push("Heart rate is within normal range. Regular cardio can help lower it further.");
  }
  if (hrvStats && hrvStats.avg > 50) {
    insights.push("HRV indicates good autonomic nervous system balance and recovery capacity.");
  }
  if (calStats && calStats.avg > 300) {
    insights.push(`Averaging ${calStats.avg} kcal burned per day — maintaining an active lifestyle.`);
  }
  if (distStats && distStats.total > 20) {
    insights.push(`Total distance of ${distStats.total.toFixed(1)} km over the period shows consistent movement.`);
  }

  // Build stat cards HTML
  const statCards: string[] = [];
  if (stepsStats) {
    statCards.push(`<div class="stat-card">
      <div class="stat-label">Avg Daily Steps</div>
      <div class="stat-value">${stepsStats.avg.toLocaleString()}</div>
      <div class="stat-sub">Best: ${stepsStats.best.toLocaleString()}</div>
      <div class="stat-trend" style="color: ${trendColor(stepsStats.trendDir, true)}">
        ${trendArrow(stepsStats.trendDir)} ${stepsStats.trendPct}% trend
      </div>
    </div>`);
  }
  if (hrStats) {
    statCards.push(`<div class="stat-card">
      <div class="stat-label">Avg Heart Rate</div>
      <div class="stat-value">${hrStats.avg > 0 ? hrStats.avg : "—"} <span style="font-size:12px">bpm</span></div>
      <div class="stat-sub">Range: ${hrStats.lowest}–${hrStats.best} bpm</div>
      <div class="stat-trend" style="color: ${trendColor(hrStats.trendDir, false)}">
        ${trendArrow(hrStats.trendDir)} ${hrStats.trendPct}% trend
      </div>
    </div>`);
  }
  if (calStats) {
    statCards.push(`<div class="stat-card">
      <div class="stat-label">Avg Calories Burned</div>
      <div class="stat-value">${calStats.avg} <span style="font-size:12px">kcal</span></div>
      <div class="stat-sub">Total: ${calStats.total.toLocaleString()} kcal</div>
      <div class="stat-trend" style="color: ${trendColor(calStats.trendDir, true)}">
        ${trendArrow(calStats.trendDir)} ${calStats.trendPct}% trend
      </div>
    </div>`);
  }
  if (sleepStats) {
    statCards.push(`<div class="stat-card">
      <div class="stat-label">Avg Sleep</div>
      <div class="stat-value">${sleepStats.avg > 0 ? sleepStats.avg.toFixed(1) : "—"} <span style="font-size:12px">hrs</span></div>
      <div class="stat-sub">Best: ${sleepStats.best.toFixed(1)} hrs</div>
      <div class="stat-trend" style="color: ${trendColor(sleepStats.trendDir, true)}">
        ${trendArrow(sleepStats.trendDir)} ${sleepStats.trendPct}% trend
      </div>
    </div>`);
  }
  if (distStats) {
    statCards.push(`<div class="stat-card">
      <div class="stat-label">Total Distance</div>
      <div class="stat-value">${distStats.total.toFixed(1)} <span style="font-size:12px">km</span></div>
      <div class="stat-sub">Avg: ${distStats.avg.toFixed(1)} km/day</div>
      <div class="stat-trend" style="color: ${trendColor(distStats.trendDir, true)}">
        ${trendArrow(distStats.trendDir)} ${distStats.trendPct}% trend
      </div>
    </div>`);
  }
  if (hrvStats) {
    statCards.push(`<div class="stat-card">
      <div class="stat-label">Avg HRV</div>
      <div class="stat-value">${hrvStats.avg > 0 ? hrvStats.avg : "—"} <span style="font-size:12px">ms</span></div>
      <div class="stat-sub">${hrvStats.avg > 0 ? `Range: ${hrvStats.lowest}–${hrvStats.best} ms` : "No data"}</div>
      <div class="stat-trend" style="color: ${trendColor(hrvStats.trendDir, true)}">
        ${hrvStats.trendPct > 0 ? `${trendArrow(hrvStats.trendDir)} ${hrvStats.trendPct}% trend` : "—"}
      </div>
    </div>`);
  }

  // Grid columns based on card count
  const gridCols = statCards.length <= 2 ? 2 : statCards.length <= 4 ? 2 : 3;

  // Build table headers and rows
  const tableHeaders: string[] = ["<th>Date</th>"];
  if (has(metrics, "steps")) tableHeaders.push("<th>Steps</th>");
  if (has(metrics, "heartRate")) tableHeaders.push("<th>Heart Rate</th>");
  if (has(metrics, "calories")) tableHeaders.push("<th>Calories</th>");
  if (has(metrics, "sleep")) tableHeaders.push("<th>Sleep</th>");
  if (has(metrics, "distance")) tableHeaders.push("<th>Distance</th>");
  if (has(metrics, "hrv")) tableHeaders.push("<th>HRV</th>");

  const tableRows = data.map((d) => {
    const cells: string[] = [`<td>${formatShortDate(d.date)}</td>`];
    if (has(metrics, "steps")) cells.push(`<td>${d.steps.toLocaleString()}</td>`);
    if (has(metrics, "heartRate")) cells.push(`<td>${d.heartRate > 0 ? d.heartRate + " bpm" : "—"}</td>`);
    if (has(metrics, "calories")) cells.push(`<td>${d.activeCalories} kcal</td>`);
    if (has(metrics, "sleep")) cells.push(`<td>${d.sleepHours.toFixed(1)} hrs</td>`);
    if (has(metrics, "distance")) cells.push(`<td>${d.distance.toFixed(1)} km</td>`);
    if (has(metrics, "hrv")) cells.push(`<td>${d.hrv !== null ? d.hrv + " ms" : "—"}</td>`);
    return `<tr>${cells.join("")}</tr>`;
  }).join("");

  // Personal notes section
  const personalNotesHTML = config.personalNotes && config.personalNotes.trim()
    ? `<div class="section-title">Notes for Healthcare Provider</div>
    <div class="personal-notes">
      <div class="notes-icon">&#9998;</div>
      <div class="notes-content">${config.personalNotes.replace(/\n/g, "<br>")}</div>
    </div>`
    : "";

  // Metrics included label
  const metricsIncluded = metrics.map((m) => {
    const found = ALL_REPORT_METRICS.find((am) => am.key === m);
    return found?.label ?? m;
  }).join(", ");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    @page { margin: 20mm 15mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #1F2937; background: #FFFFFF; font-size: 11px; line-height: 1.5;
    }
    .header {
      background: linear-gradient(135deg, #0A0500 0%, #1A0F00 50%, #2D1800 100%);
      color: white; padding: 28px 24px; border-radius: 12px; margin-bottom: 20px;
    }
    .header-brand { color: #F59E0B; font-size: 10px; letter-spacing: 2px; text-transform: uppercase; font-weight: 700; }
    .header-title { font-size: 24px; font-weight: 800; margin: 4px 0; color: #FFF7ED; }
    .header-sub { color: #B45309; font-size: 11px; }
    .header-meta { display: flex; justify-content: space-between; margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(245,158,11,0.2); }
    .header-meta-item { color: #FDE68A; font-size: 10px; }
    .header-meta-label { color: #B45309; font-size: 9px; display: block; }

    .section-title {
      font-size: 14px; font-weight: 700; color: #1F2937; margin: 20px 0 10px;
      padding-bottom: 6px; border-bottom: 2px solid #F59E0B;
    }

    .stats-grid { display: grid; grid-template-columns: repeat(${gridCols}, 1fr); gap: 10px; margin-bottom: 16px; }
    .stat-card {
      background: #FFFBEB; border: 1px solid #FDE68A; border-radius: 10px; padding: 14px; text-align: center;
    }
    .stat-value { font-size: 22px; font-weight: 800; color: #92400E; }
    .stat-label { font-size: 9px; color: #B45309; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px; }
    .stat-sub { font-size: 9px; color: #78350F; margin-top: 2px; }
    .stat-trend { font-size: 10px; font-weight: 700; margin-top: 4px; }

    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 10px; }
    th {
      background: #0A0500; color: #FDE68A; padding: 8px 6px; text-align: center;
      font-weight: 700; font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px;
    }
    th:first-child { text-align: left; border-radius: 6px 0 0 0; }
    th:last-child { border-radius: 0 6px 0 0; }
    td { padding: 6px; text-align: center; border-bottom: 1px solid #F3F4F6; }
    tr:nth-child(even) { background: #FFFBEB; }
    tr:hover { background: #FEF3C7; }
    td:first-child { text-align: left; font-weight: 600; color: #374151; }

    .insights { background: #FFFBEB; border: 1px solid #FDE68A; border-radius: 10px; padding: 16px; margin-bottom: 16px; }
    .insight-item { padding: 6px 0; border-bottom: 1px solid #FEF3C7; color: #78350F; font-size: 11px; }
    .insight-item:last-child { border-bottom: none; }
    .insight-bullet { color: #F59E0B; font-weight: 700; margin-right: 6px; }

    .personal-notes {
      background: #F0F9FF; border: 1px solid #BAE6FD; border-radius: 10px; padding: 16px; margin-bottom: 16px;
      display: flex; gap: 12px; align-items: flex-start;
    }
    .notes-icon { font-size: 18px; color: #0284C7; flex-shrink: 0; margin-top: 2px; }
    .notes-content { color: #0C4A6E; font-size: 11px; line-height: 1.7; flex: 1; white-space: pre-wrap; }

    .metrics-tag {
      display: inline-block; background: #FEF3C7; color: #92400E; font-size: 9px;
      padding: 2px 8px; border-radius: 4px; margin-right: 4px; margin-bottom: 4px;
    }

    .footer {
      margin-top: 24px; padding-top: 12px; border-top: 1px solid #E5E7EB;
      text-align: center; color: #9CA3AF; font-size: 9px;
    }
    .footer-brand { color: #F59E0B; font-weight: 700; }

    .disclaimer {
      background: #FEF2F2; border: 1px solid #FECACA; border-radius: 8px;
      padding: 10px 14px; margin-top: 12px; font-size: 9px; color: #991B1B;
    }
  </style>
</head>
<body>
  <!-- Header -->
  <div class="header">
    <div class="header-brand">PEAKPULSE AI</div>
    <div class="header-title">${periodLabel} Health Report</div>
    <div class="header-sub">Comprehensive health metrics analysis</div>
    <div class="header-meta">
      <div class="header-meta-item">
        <span class="header-meta-label">Prepared for</span>
        ${userName}
      </div>
      <div class="header-meta-item">
        <span class="header-meta-label">Report Date</span>
        ${reportDate}
      </div>
      <div class="header-meta-item">
        <span class="header-meta-label">Period</span>
        ${data.length > 0 ? formatDate(data[0].date) : "N/A"} — ${data.length > 0 ? formatDate(data[data.length - 1].date) : "N/A"}
      </div>
      <div class="header-meta-item">
        <span class="header-meta-label">Days Tracked</span>
        ${data.length} days
      </div>
    </div>
  </div>

  <!-- Metrics Included -->
  <div style="margin-bottom: 8px; font-size: 10px; color: #6B7280;">
    <strong>Metrics included:</strong> ${metricsIncluded}
  </div>

  ${personalNotesHTML}

  <!-- Summary Stats -->
  ${statCards.length > 0 ? `
  <div class="section-title">Summary Overview</div>
  <div class="stats-grid">
    ${statCards.join("\n    ")}
  </div>` : ""}

  <!-- Health Insights -->
  ${insights.length > 0 ? `
  <div class="section-title">Health Insights</div>
  <div class="insights">
    ${insights.map((i) => `<div class="insight-item"><span class="insight-bullet">●</span>${i}</div>`).join("")}
  </div>` : ""}

  <!-- Daily Breakdown -->
  <div class="section-title">Daily Breakdown</div>
  <table>
    <thead>
      <tr>${tableHeaders.join("")}</tr>
    </thead>
    <tbody>
      ${tableRows}
    </tbody>
  </table>

  <!-- Disclaimer -->
  <div class="disclaimer">
    <strong>Disclaimer:</strong> This report is generated from wearable device data and is intended for informational purposes only.
    It is not a substitute for professional medical advice, diagnosis, or treatment. Always consult a qualified healthcare provider
    with any questions regarding your health or medical conditions.
  </div>

  <!-- Footer -->
  <div class="footer">
    <div class="footer-brand">PEAKPULSE AI</div>
    <div>Generated on ${reportDate} · ${periodLabel} Health Report</div>
    <div style="margin-top: 4px;">© ${now.getFullYear()} PeakPulse AI. All rights reserved.</div>
  </div>
</body>
</html>`;
}

// ── PDF Generation & Sharing ──

export async function generateHealthReport(config: ReportConfig): Promise<ReportResult> {
  try {
    // Fetch health data
    const data = await fetchHealthHistory(config.period);

    if (data.length === 0) {
      return { success: false, error: "No health data available for the selected period." };
    }

    // Get user name
    const userName = config.userName || (await getUserName());

    // Generate HTML
    const html = generateReportHTML(data, config, userName);

    // Generate PDF
    const { uri } = await Print.printToFileAsync({
      html,
      margins: Platform.OS === "ios" ? { left: 15, top: 20, right: 15, bottom: 20 } : undefined,
    });

    return { success: true, uri };
  } catch (e: any) {
    console.error("[HealthReport] Generation failed:", e);
    return { success: false, error: e?.message ?? "Failed to generate report" };
  }
}

export async function generateAndShareHealthReport(config: ReportConfig): Promise<ReportResult> {
  const result = await generateHealthReport(config);

  if (!result.success || !result.uri) {
    return result;
  }

  try {
    await shareAsync(result.uri, {
      mimeType: "application/pdf",
      dialogTitle: `PeakPulse ${config.period}-Day Health Report`,
      UTI: "com.adobe.pdf",
    });
    return result;
  } catch (e: any) {
    // User may have cancelled sharing — not an error
    if (e?.message?.includes("cancel") || e?.message?.includes("dismiss")) {
      return result; // Still successful, just not shared
    }
    return { success: false, error: e?.message ?? "Failed to share report" };
  }
}

export async function printHealthReport(config: ReportConfig): Promise<ReportResult> {
  try {
    const data = await fetchHealthHistory(config.period);
    if (data.length === 0) {
      return { success: false, error: "No health data available for the selected period." };
    }

    const userName = config.userName || (await getUserName());
    const html = generateReportHTML(data, config, userName);

    await Print.printAsync({ html });
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message ?? "Failed to print report" };
  }
}
