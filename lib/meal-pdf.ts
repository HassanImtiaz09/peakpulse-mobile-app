/**
 * Meal Log PDF Export — generates a branded PDF of the user's weekly meal log
 * with nutrition breakdown, macro charts, and daily summaries.
 */
import * as Print from "expo-print";
import { shareAsync } from "expo-sharing";
import { Platform, Alert } from "react-native";
import { UI } from "@/constants/ui-colors";

// ─── Types ──────────────────────────────────────────────────────────────────

interface MealEntry {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  mealType: string;
  loggedAt: string;
  photoUri?: string;
}

interface DayMeals {
  date: string;
  dayLabel: string;
  meals: MealEntry[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
}

interface MealLogExportData {
  days: DayMeals[];
  calorieGoal: number;
  macroTargets?: { protein: number; carbs: number; fat: number };
  userName?: string;
}

// ─── Meal type badge colors ─────────────────────────────────────────────────

const MEAL_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  breakfast: { bg: "#FEF3C7", text: UI.secondaryDim, label: "Breakfast" },
  lunch:     { bg: "#DBEAFE", text: "#1E40AF", label: "Lunch" },
  dinner:    { bg: "#FCE7F3", text: "#9D174D", label: "Dinner" },
  snack:     { bg: "#D1FAE5", text: "#065F46", label: "Snack" },
  other:     { bg: "#F3F4F6", text: "#374151", label: "Other" },
};

// ─── Helper ─────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
}

function formatTime(isoStr: string): string {
  const d = new Date(isoStr);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function pct(value: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.round((value / total) * 100));
}

// ─── HTML Template ──────────────────────────────────────────────────────────

function buildMealPdfHtml(data: MealLogExportData): string {
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  // Weekly totals
  const totalCals = data.days.reduce((s, d) => s + d.totalCalories, 0);
  const totalProtein = data.days.reduce((s, d) => s + d.totalProtein, 0);
  const totalCarbs = data.days.reduce((s, d) => s + d.totalCarbs, 0);
  const totalFat = data.days.reduce((s, d) => s + d.totalFat, 0);
  const totalMeals = data.days.reduce((s, d) => s + d.meals.length, 0);
  const avgCals = data.days.length > 0 ? Math.round(totalCals / data.days.length) : 0;

  // Day sections
  const daySections = data.days.map((day) => {
    if (day.meals.length === 0) {
      return `
        <div class="day-card rest-card">
          <div class="day-header rest-header">
            <div class="day-name">${day.dayLabel}</div>
            <div class="day-focus">No meals logged</div>
          </div>
        </div>
      `;
    }

    const calPct = pct(day.totalCalories, data.calorieGoal);
    const protPct = data.macroTargets ? pct(day.totalProtein, data.macroTargets.protein) : 0;
    const carbPct = data.macroTargets ? pct(day.totalCarbs, data.macroTargets.carbs) : 0;
    const fatPct = data.macroTargets ? pct(day.totalFat, data.macroTargets.fat) : 0;

    const mealRows = day.meals.map((m) => {
      const badge = MEAL_COLORS[m.mealType] || MEAL_COLORS.other;
      return `
        <tr>
          <td class="meal-time">${formatTime(m.loggedAt)}</td>
          <td class="meal-name">
            ${m.name}
            <span class="meal-badge" style="background:${badge.bg};color:${badge.text}">${badge.label}</span>
          </td>
          <td class="meal-cal">${m.calories}</td>
          <td class="meal-prot">${m.protein}g</td>
          <td class="meal-carb">${m.carbs}g</td>
          <td class="meal-fat">${m.fat}g</td>
        </tr>
      `;
    }).join("");

    return `
      <div class="day-card">
        <div class="day-header">
          <div class="day-name">${day.dayLabel}</div>
          <div class="day-focus">${day.meals.length} meal${day.meals.length !== 1 ? "s" : ""}</div>
          <div class="day-count">${day.totalCalories} kcal</div>
        </div>

        <!-- Daily progress bars -->
        <div class="progress-row">
          <div class="progress-item">
            <div class="progress-label">Calories <span class="progress-val">${day.totalCalories}/${data.calorieGoal}</span></div>
            <div class="progress-bar"><div class="progress-fill cal-fill" style="width:${calPct}%"></div></div>
          </div>
          ${data.macroTargets ? `
          <div class="progress-item">
            <div class="progress-label">Protein <span class="progress-val">${day.totalProtein}g/${data.macroTargets.protein}g</span></div>
            <div class="progress-bar"><div class="progress-fill prot-fill" style="width:${protPct}%"></div></div>
          </div>
          <div class="progress-item">
            <div class="progress-label">Carbs <span class="progress-val">${day.totalCarbs}g/${data.macroTargets.carbs}g</span></div>
            <div class="progress-bar"><div class="progress-fill carb-fill" style="width:${carbPct}%"></div></div>
          </div>
          <div class="progress-item">
            <div class="progress-label">Fat <span class="progress-val">${day.totalFat}g/${data.macroTargets.fat}g</span></div>
            <div class="progress-bar"><div class="progress-fill fat-fill" style="width:${fatPct}%"></div></div>
          </div>
          ` : ""}
        </div>

        <table class="meal-table">
          <thead>
            <tr>
              <th class="th-time">Time</th>
              <th class="th-name">Meal</th>
              <th class="th-cal">Cal</th>
              <th class="th-prot">Prot</th>
              <th class="th-carb">Carbs</th>
              <th class="th-fat">Fat</th>
            </tr>
          </thead>
          <tbody>
            ${mealRows}
          </tbody>
        </table>
      </div>
    `;
  }).join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    @page { margin: 24px; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #1a1a1a;
      background: #fff;
      font-size: 11px;
      line-height: 1.5;
    }

    /* ─── Header ─── */
    .header {
      background: linear-gradient(135deg, #1C0A00 0%, #2D1600 50%, #1C0A00 100%);
      color: #F1F5F9;
      padding: 28px 24px;
      border-radius: 12px;
      margin-bottom: 16px;
      position: relative;
      overflow: hidden;
    }
    .header::before {
      content: "";
      position: absolute;
      top: -50%;
      right: -20%;
      width: 200px;
      height: 200px;
      background: radial-gradient(circle, rgba(245,158,11,0.15) 0%, transparent 70%);
      border-radius: 50%;
    }
    .header-brand {
      font-size: 28px;
      font-weight: 800;
      letter-spacing: -0.5px;
      color: #F59E0B;
      margin-bottom: 2px;
    }
    .header-subtitle {
      font-size: 13px;
      color: #FBBF24;
      opacity: 0.8;
      margin-bottom: 12px;
    }
    .header-meta {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .header-user {
      font-size: 14px;
      font-weight: 600;
      color: #FDE68A;
    }
    .header-date {
      font-size: 11px;
      color: #D97706;
    }

    /* ─── Summary Stats ─── */
    .summary {
      display: flex;
      gap: 10px;
      margin-bottom: 16px;
    }
    .stat-card {
      flex: 1;
      background: #FFFBEB;
      border: 1px solid #FDE68A;
      border-radius: 10px;
      padding: 10px;
      text-align: center;
    }
    .stat-value {
      font-size: 20px;
      font-weight: 800;
      color: #92400E;
    }
    .stat-label {
      font-size: 9px;
      color: #B45309;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-top: 2px;
    }

    /* ─── Day Cards ─── */
    .day-card {
      border: 1px solid #E5E7EB;
      border-radius: 10px;
      margin-bottom: 14px;
      overflow: hidden;
    }
    .day-header {
      background: linear-gradient(135deg, #1C0A00, #2D1600);
      padding: 10px 14px;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .rest-header {
      background: linear-gradient(135deg, #1E293B, #334155);
    }
    .day-name {
      font-size: 14px;
      font-weight: 700;
      color: #F59E0B;
      min-width: 100px;
    }
    .day-focus {
      font-size: 12px;
      color: #FDE68A;
      flex: 1;
    }
    .day-count {
      font-size: 11px;
      color: #D97706;
      font-weight: 700;
      white-space: nowrap;
    }

    /* ─── Progress Bars ─── */
    .progress-row {
      display: flex;
      gap: 8px;
      padding: 10px 14px;
      background: #FAFAFA;
      border-bottom: 1px solid #F3F4F6;
    }
    .progress-item { flex: 1; }
    .progress-label {
      font-size: 9px;
      font-weight: 600;
      color: #6B7280;
      display: flex;
      justify-content: space-between;
      margin-bottom: 3px;
    }
    .progress-val { color: #9CA3AF; font-weight: 400; }
    .progress-bar {
      height: 6px;
      background: #E5E7EB;
      border-radius: 3px;
      overflow: hidden;
    }
    .progress-fill {
      height: 100%;
      border-radius: 3px;
      transition: width 0.3s;
    }
    .cal-fill { background: #F59E0B; }
    .prot-fill { background: #3B82F6; }
    .carb-fill { background: #F59E0B; }
    .fat-fill { background: #EF4444; }

    /* ─── Meal Table ─── */
    .meal-table {
      width: 100%;
      border-collapse: collapse;
    }
    .meal-table thead {
      background: #F9FAFB;
    }
    .meal-table th {
      padding: 8px 10px;
      text-align: left;
      font-size: 9px;
      font-weight: 600;
      color: #6B7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1px solid #E5E7EB;
    }
    .meal-table td {
      padding: 8px 10px;
      border-bottom: 1px solid #F3F4F6;
      vertical-align: top;
    }
    .th-time { width: 60px; }
    .th-cal, .th-prot, .th-carb, .th-fat { width: 50px; text-align: center; }
    .meal-time {
      color: #9CA3AF;
      font-size: 10px;
      font-weight: 500;
    }
    .meal-name {
      font-weight: 600;
      color: #1F2937;
      font-size: 11px;
    }
    .meal-cal, .meal-prot, .meal-carb, .meal-fat {
      text-align: center;
      color: #4B5563;
      font-size: 11px;
    }

    /* ─── Badges ─── */
    .meal-badge {
      display: inline-block;
      font-size: 8px;
      font-weight: 600;
      padding: 1px 6px;
      border-radius: 4px;
      margin-left: 6px;
      vertical-align: middle;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    /* ─── Footer ─── */
    .footer {
      margin-top: 20px;
      padding-top: 12px;
      border-top: 1px solid #E5E7EB;
      text-align: center;
      font-size: 9px;
      color: #9CA3AF;
    }
    .footer-brand {
      color: #F59E0B;
      font-weight: 700;
    }
  </style>
</head>
<body>
  <!-- Header -->
  <div class="header">
    <div class="header-brand">FytNova</div>
    <div class="header-subtitle">Weekly Meal Log Report</div>
    <div class="header-meta">
      <div>
        ${data.userName ? `<div class="header-user">${data.userName}</div>` : ""}
        <div class="header-date">${dateStr}</div>
      </div>
    </div>
  </div>

  <!-- Summary Stats -->
  <div class="summary">
    <div class="stat-card">
      <div class="stat-value">${totalMeals}</div>
      <div class="stat-label">Meals Logged</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${avgCals}</div>
      <div class="stat-label">Avg Daily Cal</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${totalProtein}g</div>
      <div class="stat-label">Total Protein</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${data.days.length}</div>
      <div class="stat-label">Days Tracked</div>
    </div>
  </div>

  <!-- Day Cards -->
  ${daySections}

  <!-- Footer -->
  <div class="footer">
    Generated by <span class="footer-brand">FytNova</span> &mdash; Your AI-Powered Fitness Companion
  </div>
</body>
</html>`;
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Generate a PDF from the meal log data and open the share sheet.
 */
export async function exportMealLogPdf(data: MealLogExportData): Promise<void> {
  try {
    const html = buildMealPdfHtml(data);

    if (Platform.OS === "web") {
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
      }
      return;
    }

    const { uri } = await Print.printToFileAsync({
      html,
      margins: { left: 20, top: 20, right: 20, bottom: 20 },
    });

    await shareAsync(uri, {
      mimeType: "application/pdf",
      dialogTitle: "Share Meal Log",
      UTI: "com.adobe.pdf",
    });
  } catch (error: any) {
    console.error("Meal PDF export error:", error);
    Alert.alert("Export Failed", "Could not generate the meal log PDF. Please try again.");
  }
}

/**
 * Generate a PDF and open the native print dialog.
 */
export async function printMealLog(data: MealLogExportData): Promise<void> {
  try {
    const html = buildMealPdfHtml(data);
    await Print.printAsync({ html });
  } catch (error: any) {
    console.error("Meal print error:", error);
    Alert.alert("Print Failed", "Could not print the meal log. Please try again.");
  }
}
