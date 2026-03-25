import * as Print from "expo-print";
import { shareAsync } from "expo-sharing";
import { Platform, Alert } from "react-native";
import { classifyExercise } from "./rest-timer-settings";

// ─── Types ──────────────────────────────────────────────────────────────────

interface Exercise {
  name: string;
  sets: string;
  reps?: string;
  rest?: string;
  notes?: string;
  muscleGroup?: string;
}

interface WorkoutDay {
  day: string;
  focus: string;
  isRest: boolean;
  exercises?: Exercise[];
}

interface WorkoutPlan {
  schedule: WorkoutDay[];
  insight?: string;
}

// ─── Exercise type badge colors ─────────────────────────────────────────────

const TYPE_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  compound:   { bg: "#FEF3C7", text: "#92400E", label: "Compound" },
  isolation:  { bg: "#DBEAFE", text: "#1E40AF", label: "Isolation" },
  cardio:     { bg: "#D1FAE5", text: "#065F46", label: "Cardio" },
  stretching: { bg: "#EDE9FE", text: "#5B21B6", label: "Stretching" },
  custom:     { bg: "#F3F4F6", text: "#374151", label: "General" },
};

// ─── HTML Template ──────────────────────────────────────────────────────────

function buildWorkoutPdfHtml(
  plan: WorkoutPlan,
  userName?: string,
): string {
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  // Calculate summary stats
  const workoutDays = plan.schedule.filter(d => !d.isRest);
  const restDays = plan.schedule.filter(d => d.isRest);
  const totalExercises = workoutDays.reduce((sum, d) => sum + (d.exercises?.length ?? 0), 0);
  const totalSets = workoutDays.reduce((sum, d) => {
    return sum + (d.exercises ?? []).reduce((s, ex) => {
      const match = ex.sets.match(/^(\d+)/);
      return s + (match ? parseInt(match[1], 10) : 0);
    }, 0);
  }, 0);

  // Build day sections
  const daySections = plan.schedule.map((day, idx) => {
    if (day.isRest) {
      return `
        <div class="day-card rest-card">
          <div class="day-header rest-header">
            <div class="day-name">${day.day}</div>
            <div class="day-focus">Rest Day</div>
          </div>
          <div class="rest-body">
            <p>Focus on recovery, stretching, and light movement. Your muscles grow during rest!</p>
          </div>
        </div>
      `;
    }

    const exerciseRows = (day.exercises ?? []).map((ex, i) => {
      const type = classifyExercise(ex.name);
      const badge = TYPE_COLORS[type];
      return `
        <tr>
          <td class="ex-num">${i + 1}</td>
          <td class="ex-name">
            ${ex.name}
            <span class="type-badge" style="background:${badge.bg};color:${badge.text}">${badge.label}</span>
            ${ex.muscleGroup ? `<span class="muscle-tag">${ex.muscleGroup}</span>` : ""}
          </td>
          <td class="ex-sets">${ex.sets}</td>
          <td class="ex-reps">${ex.reps ?? "—"}</td>
          <td class="ex-rest">${ex.rest ?? "—"}</td>
        </tr>
        ${ex.notes ? `<tr><td></td><td colspan="4" class="ex-notes">${ex.notes}</td></tr>` : ""}
      `;
    }).join("");

    return `
      <div class="day-card" ${idx > 0 ? 'style="page-break-before: auto;"' : ""}>
        <div class="day-header">
          <div class="day-name">${day.day}</div>
          <div class="day-focus">${day.focus}</div>
          <div class="day-count">${day.exercises?.length ?? 0} exercises</div>
        </div>
        <table class="exercise-table">
          <thead>
            <tr>
              <th class="th-num">#</th>
              <th class="th-name">Exercise</th>
              <th class="th-sets">Sets</th>
              <th class="th-reps">Reps</th>
              <th class="th-rest">Rest</th>
            </tr>
          </thead>
          <tbody>
            ${exerciseRows}
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
      gap: 12px;
      margin-bottom: 16px;
    }
    .stat-card {
      flex: 1;
      background: #FFFBEB;
      border: 1px solid #FDE68A;
      border-radius: 10px;
      padding: 12px;
      text-align: center;
    }
    .stat-value {
      font-size: 22px;
      font-weight: 800;
      color: #92400E;
    }
    .stat-label {
      font-size: 10px;
      color: #B45309;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-top: 2px;
    }

    /* ─── Insight ─── */
    .insight {
      background: #FEF3C7;
      border-left: 4px solid #F59E0B;
      border-radius: 0 8px 8px 0;
      padding: 10px 14px;
      margin-bottom: 16px;
      font-size: 12px;
      color: #78350F;
      font-style: italic;
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
      min-width: 80px;
    }
    .day-focus {
      font-size: 12px;
      color: #FDE68A;
      flex: 1;
    }
    .day-count {
      font-size: 10px;
      color: #D97706;
      white-space: nowrap;
    }
    .rest-body {
      padding: 14px;
      background: #F8FAFC;
      color: #64748B;
      font-size: 12px;
    }

    /* ─── Exercise Table ─── */
    .exercise-table {
      width: 100%;
      border-collapse: collapse;
    }
    .exercise-table thead {
      background: #F9FAFB;
    }
    .exercise-table th {
      padding: 8px 10px;
      text-align: left;
      font-size: 9px;
      font-weight: 600;
      color: #6B7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1px solid #E5E7EB;
    }
    .exercise-table td {
      padding: 8px 10px;
      border-bottom: 1px solid #F3F4F6;
      vertical-align: top;
    }
    .th-num { width: 30px; }
    .th-name { }
    .th-sets { width: 60px; text-align: center; }
    .th-reps { width: 60px; text-align: center; }
    .th-rest { width: 60px; text-align: center; }
    .ex-num {
      color: #9CA3AF;
      font-weight: 600;
      font-size: 10px;
    }
    .ex-name {
      font-weight: 600;
      color: #1F2937;
      font-size: 11px;
    }
    .ex-sets, .ex-reps, .ex-rest {
      text-align: center;
      color: #4B5563;
      font-size: 11px;
    }
    .ex-notes {
      font-size: 10px;
      color: #6B7280;
      font-style: italic;
      padding-top: 2px;
      padding-bottom: 8px;
    }

    /* ─── Badges ─── */
    .type-badge {
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
    .muscle-tag {
      display: inline-block;
      font-size: 8px;
      font-weight: 500;
      padding: 1px 5px;
      border-radius: 3px;
      margin-left: 4px;
      background: #F3F4F6;
      color: #6B7280;
      vertical-align: middle;
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
    <div class="header-brand">PeakPulse AI</div>
    <div class="header-subtitle">Your Personal Workout Plan</div>
    <div class="header-meta">
      <div>
        ${userName ? `<div class="header-user">${userName}</div>` : ""}
        <div class="header-date">${dateStr}</div>
      </div>
    </div>
  </div>

  <!-- Summary Stats -->
  <div class="summary">
    <div class="stat-card">
      <div class="stat-value">${workoutDays.length}</div>
      <div class="stat-label">Workout Days</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${restDays.length}</div>
      <div class="stat-label">Rest Days</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${totalExercises}</div>
      <div class="stat-label">Total Exercises</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${totalSets}</div>
      <div class="stat-label">Total Sets</div>
    </div>
  </div>

  ${plan.insight ? `<div class="insight">💡 ${plan.insight}</div>` : ""}

  <!-- Day Cards -->
  ${daySections}

  <!-- Footer -->
  <div class="footer">
    Generated by <span class="footer-brand">PeakPulse AI</span> &mdash; Your AI-Powered Fitness Companion
  </div>
</body>
</html>`;
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Generate a PDF from the workout plan and open the share sheet.
 */
export async function exportWorkoutPlanPdf(
  plan: WorkoutPlan,
  userName?: string,
): Promise<void> {
  try {
    const html = buildWorkoutPdfHtml(plan, userName);

    if (Platform.OS === "web") {
      // On web, open a new window with the HTML and trigger print
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
      }
      return;
    }

    // On native, generate PDF file and share
    const { uri } = await Print.printToFileAsync({
      html,
      margins: { left: 20, top: 20, right: 20, bottom: 20 },
    });

    await shareAsync(uri, {
      mimeType: "application/pdf",
      dialogTitle: "Share Workout Plan",
      UTI: "com.adobe.pdf",
    });
  } catch (error: any) {
    console.error("PDF export error:", error);
    Alert.alert("Export Failed", "Could not generate the PDF. Please try again.");
  }
}

/**
 * Generate a PDF and open the native print dialog.
 */
export async function printWorkoutPlan(
  plan: WorkoutPlan,
  userName?: string,
): Promise<void> {
  try {
    const html = buildWorkoutPdfHtml(plan, userName);
    await Print.printAsync({ html });
  } catch (error: any) {
    console.error("Print error:", error);
    Alert.alert("Print Failed", "Could not print the workout plan. Please try again.");
  }
}
