/**
 * Health Report PDF Generator
 *
 * Generates a branded PeakPulse health report as a PDF using expo-print.
 * Supports 7-day and 30-day reports with daily breakdown tables,
 * summary stats, trend indicators, and health insights.
 *
 * Uses expo-sharing to let users share the PDF with trainers, physios, or doctors.
 */

import * as Print from "expo-print";
import { shareAsync } from "expo-sharing";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fetchHealthHistory, type DailyHealthSummary } from "./health-service";

// ── Types ──
export interface ReportConfig {
  period: 7 | 30;
  userName?: string;
  userAge?: number;
  userGoal?: string;
}

export interface ReportResult {
  success: boolean;
  uri?: string;
  error?: string;
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

// ── HTML Report Builder ──
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

export function generateReportHTML(
  data: DailyHealthSummary[],
  config: ReportConfig,
  userName: string,
): string {
  const now = new Date();
  const reportDate = now.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
  const periodLabel = config.period === 7 ? "7-Day" : "30-Day";

  // Calculate stats
  const stepsStats = calcMetricStats(data.map((d) => d.steps));
  const hrStats = calcMetricStats(data.filter((d) => d.heartRate > 0).map((d) => d.heartRate));
  const calStats = calcMetricStats(data.map((d) => d.activeCalories));
  const sleepStats = calcMetricStats(data.map((d) => Math.round(d.sleepHours * 10) / 10));
  const distStats = calcMetricStats(data.map((d) => Math.round(d.distance * 10) / 10));
  const hrvStats = calcMetricStats(data.filter((d) => d.hrv !== null).map((d) => d.hrv ?? 0));

  // Generate insights
  const insights: string[] = [];
  if (stepsStats.avg >= 10000) insights.push("Excellent step count — exceeding the recommended 10,000 steps/day target.");
  else if (stepsStats.avg >= 7000) insights.push("Good activity level. Aim for 10,000+ steps/day for optimal cardiovascular health.");
  else insights.push("Step count is below recommended levels. Consider adding short walks throughout the day.");

  if (sleepStats.avg >= 7) insights.push("Sleep duration is within the healthy range of 7-9 hours.");
  else insights.push("Sleep duration is below the recommended 7-9 hours. Prioritise sleep hygiene for better recovery.");

  if (hrStats.avg > 0 && hrStats.avg < 60) insights.push("Resting heart rate indicates excellent cardiovascular fitness.");
  else if (hrStats.avg >= 60 && hrStats.avg <= 80) insights.push("Heart rate is within normal range. Regular cardio can help lower it further.");

  if (hrvStats.avg > 50) insights.push("HRV indicates good autonomic nervous system balance and recovery capacity.");

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

    .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 16px; }
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

  <!-- Summary Stats -->
  <div class="section-title">Summary Overview</div>
  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-label">Avg Daily Steps</div>
      <div class="stat-value">${stepsStats.avg.toLocaleString()}</div>
      <div class="stat-sub">Best: ${stepsStats.best.toLocaleString()}</div>
      <div class="stat-trend" style="color: ${trendColor(stepsStats.trendDir, true)}">
        ${trendArrow(stepsStats.trendDir)} ${stepsStats.trendPct}% trend
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Avg Heart Rate</div>
      <div class="stat-value">${hrStats.avg > 0 ? hrStats.avg : "—"} <span style="font-size:12px">bpm</span></div>
      <div class="stat-sub">Range: ${hrStats.lowest}–${hrStats.best} bpm</div>
      <div class="stat-trend" style="color: ${trendColor(hrStats.trendDir, false)}">
        ${trendArrow(hrStats.trendDir)} ${hrStats.trendPct}% trend
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Avg Calories Burned</div>
      <div class="stat-value">${calStats.avg} <span style="font-size:12px">kcal</span></div>
      <div class="stat-sub">Total: ${calStats.total.toLocaleString()} kcal</div>
      <div class="stat-trend" style="color: ${trendColor(calStats.trendDir, true)}">
        ${trendArrow(calStats.trendDir)} ${calStats.trendPct}% trend
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Avg Sleep</div>
      <div class="stat-value">${sleepStats.avg > 0 ? (sleepStats.avg).toFixed(1) : "—"} <span style="font-size:12px">hrs</span></div>
      <div class="stat-sub">Best: ${sleepStats.best.toFixed(1)} hrs</div>
      <div class="stat-trend" style="color: ${trendColor(sleepStats.trendDir, true)}">
        ${trendArrow(sleepStats.trendDir)} ${sleepStats.trendPct}% trend
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Total Distance</div>
      <div class="stat-value">${distStats.total.toFixed(1)} <span style="font-size:12px">km</span></div>
      <div class="stat-sub">Avg: ${distStats.avg.toFixed(1)} km/day</div>
      <div class="stat-trend" style="color: ${trendColor(distStats.trendDir, true)}">
        ${trendArrow(distStats.trendDir)} ${distStats.trendPct}% trend
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Avg HRV</div>
      <div class="stat-value">${hrvStats.avg > 0 ? hrvStats.avg : "—"} <span style="font-size:12px">ms</span></div>
      <div class="stat-sub">${hrvStats.avg > 0 ? `Range: ${hrvStats.lowest}–${hrvStats.best} ms` : "No data"}</div>
      <div class="stat-trend" style="color: ${trendColor(hrvStats.trendDir, true)}">
        ${hrvStats.trendPct > 0 ? `${trendArrow(hrvStats.trendDir)} ${hrvStats.trendPct}% trend` : "—"}
      </div>
    </div>
  </div>

  <!-- Health Insights -->
  <div class="section-title">Health Insights</div>
  <div class="insights">
    ${insights.map((i) => `<div class="insight-item"><span class="insight-bullet">●</span>${i}</div>`).join("")}
  </div>

  <!-- Daily Breakdown -->
  <div class="section-title">Daily Breakdown</div>
  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Steps</th>
        <th>Heart Rate</th>
        <th>Calories</th>
        <th>Sleep</th>
        <th>Distance</th>
        <th>HRV</th>
      </tr>
    </thead>
    <tbody>
      ${data
        .map(
          (d) => `<tr>
        <td>${formatShortDate(d.date)}</td>
        <td>${d.steps.toLocaleString()}</td>
        <td>${d.heartRate > 0 ? d.heartRate + " bpm" : "—"}</td>
        <td>${d.activeCalories} kcal</td>
        <td>${d.sleepHours.toFixed(1)} hrs</td>
        <td>${d.distance.toFixed(1)} km</td>
        <td>${d.hrv !== null ? d.hrv + " ms" : "—"}</td>
      </tr>`,
        )
        .join("")}
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
