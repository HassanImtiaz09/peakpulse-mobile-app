/**
 * Workout Calendar Tests
 *
 * Tests for: workout-calendar.tsx helpers, streak calculation logic,
 * heatmap data builder, and date utilities.
 */
import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const ROOT = path.resolve(__dirname, "..");

function readFile(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), "utf-8");
}

function fileExists(relPath: string): boolean {
  return fs.existsSync(path.join(ROOT, relPath));
}

// ── File Structure ──────────────────────────────────────────────
describe("Workout Calendar Screen Structure", () => {
  it("workout-calendar.tsx exists", () => {
    expect(fileExists("app/workout-calendar.tsx")).toBe(true);
  });

  it("exports a default function component", () => {
    const src = readFile("app/workout-calendar.tsx");
    expect(src).toContain("export default function WorkoutCalendarScreen");
  });

  it("imports ScreenContainer for safe area handling", () => {
    const src = readFile("app/workout-calendar.tsx");
    expect(src).toContain("ScreenContainer");
    expect(src).toContain("@/components/screen-container");
  });

  it("imports AsyncStorage for local data persistence", () => {
    const src = readFile("app/workout-calendar.tsx");
    expect(src).toContain("AsyncStorage");
    expect(src).toContain("@react-native-async-storage/async-storage");
  });

  it("imports trpc for server data fetching", () => {
    const src = readFile("app/workout-calendar.tsx");
    expect(src).toContain("trpc");
    expect(src).toContain("@/lib/trpc");
  });

  it("imports Haptics for press feedback", () => {
    const src = readFile("app/workout-calendar.tsx");
    expect(src).toContain("expo-haptics");
  });

  it("imports Animated from reanimated for entrance animations", () => {
    const src = readFile("app/workout-calendar.tsx");
    expect(src).toContain("react-native-reanimated");
    expect(src).toContain("FadeIn");
    expect(src).toContain("FadeInDown");
  });
});

// ── Monthly Calendar View ───────────────────────────────────────
describe("Monthly Calendar View", () => {
  it("renders day-of-week headers (Mon through Sun)", () => {
    const src = readFile("app/workout-calendar.tsx");
    expect(src).toContain("DAYS_OF_WEEK");
    expect(src).toMatch(/\["Mon",\s*"Tue",\s*"Wed",\s*"Thu",\s*"Fri",\s*"Sat",\s*"Sun"\]/);
  });

  it("has month navigation with chevron buttons", () => {
    const src = readFile("app/workout-calendar.tsx");
    expect(src).toContain("navigateMonth(-1)");
    expect(src).toContain("navigateMonth(1)");
    expect(src).toContain("chevron-left");
    expect(src).toContain("chevron-right");
  });

  it("displays month name and year in header", () => {
    const src = readFile("app/workout-calendar.tsx");
    expect(src).toContain("MONTHS[currentMonth.month]");
    expect(src).toContain("currentMonth.year");
  });

  it("builds calendar grid with proper Monday start", () => {
    const src = readFile("app/workout-calendar.tsx");
    // Calendar starts on Monday (dow - 1, with Sunday wrapping to 6)
    expect(src).toContain("firstDay.getDay() - 1");
    expect(src).toContain("startDow < 0) startDow = 6");
  });

  it("highlights today with a border ring", () => {
    const src = readFile("app/workout-calendar.tsx");
    expect(src).toContain("cell.isToday");
    expect(src).toMatch(/borderWidth:.*cell\.isToday && !cell\.hasWorkout \? 1\.5 : 0/);
  });

  it("highlights workout days with gold fill", () => {
    const src = readFile("app/workout-calendar.tsx");
    expect(src).toContain("cell.hasWorkout");
    expect(src).toContain("SF.gold");
  });

  it("shows dots for multiple workouts on a single day", () => {
    const src = readFile("app/workout-calendar.tsx");
    expect(src).toContain("cell.workoutCount > 1");
    expect(src).toContain("Math.min(cell.workoutCount, 3)");
  });

  it("dims future dates", () => {
    const src = readFile("app/workout-calendar.tsx");
    expect(src).toContain("cell.isFuture");
    expect(src).toContain("opacity: cell.isFuture ? 0.3 : 1");
  });

  it("has a legend explaining the visual indicators", () => {
    const src = readFile("app/workout-calendar.tsx");
    expect(src).toContain("1 workout");
    expect(src).toContain("2+ workouts");
    expect(src).toContain("Today");
  });
});

// ── Streak Tracking ─────────────────────────────────────────────
describe("Streak Tracking", () => {
  it("calculates currentStreak, longestStreak, totalWorkouts, thisMonthCount", () => {
    const src = readFile("app/workout-calendar.tsx");
    expect(src).toContain("currentStreak");
    expect(src).toContain("longestStreak");
    expect(src).toContain("totalWorkouts");
    expect(src).toContain("thisMonthCount");
  });

  it("current streak checks consecutive days ending today or yesterday", () => {
    const src = readFile("app/workout-calendar.tsx");
    // Streak starts from today, falls back to yesterday if no workout today
    expect(src).toContain("checkDate.getDate() - 1");
    expect(src).toContain("workoutDates.has(dateKey(checkDate))");
  });

  it("longest streak iterates sorted dates and tracks consecutive runs", () => {
    const src = readFile("app/workout-calendar.tsx");
    expect(src).toContain("sortedDates");
    expect(src).toContain("Math.abs(diff - 1) < 0.1");
  });

  it("displays streak stats in stat cards", () => {
    const src = readFile("app/workout-calendar.tsx");
    expect(src).toContain("StatCard");
    expect(src).toContain("local-fire-department");
    expect(src).toContain("emoji-events");
    expect(src).toContain("fitness-center");
    expect(src).toContain("calendar-today");
  });

  it("shows motivational streak message", () => {
    const src = readFile("app/workout-calendar.tsx");
    expect(src).toContain("streakMessage");
    expect(src).toContain("Start your streak today!");
    expect(src).toContain("building a habit");
  });
});

// ── Activity Heatmap ────────────────────────────────────────────
describe("Activity Heatmap", () => {
  it("has a tab switcher between Monthly and Activity views", () => {
    const src = readFile("app/workout-calendar.tsx");
    expect(src).toContain("activeTab");
    expect(src).toContain("\"calendar\"");
    expect(src).toContain("\"heatmap\"");
    expect(src).toContain("Monthly");
    expect(src).toContain("Activity");
  });

  it("builds heatmap data for 13 weeks (91 days)", () => {
    const src = readFile("app/workout-calendar.tsx");
    expect(src).toContain("buildHeatmapData");
    expect(src).toContain("startDate.getDate() - 90");
  });

  it("uses intensity-based coloring for heatmap cells", () => {
    const src = readFile("app/workout-calendar.tsx");
    expect(src).toContain("heatmapColor");
    // Should have different colors for 0, 1, 2, 3+ workouts
    expect(src).toContain("count === 0");
    expect(src).toContain("count === 1");
    expect(src).toContain("count === 2");
  });

  it("shows heatmap legend with Less/More labels", () => {
    const src = readFile("app/workout-calendar.tsx");
    expect(src).toContain("Less");
    expect(src).toContain("More");
  });

  it("shows activity summary with active days, workouts, and consistency percentage", () => {
    const src = readFile("app/workout-calendar.tsx");
    expect(src).toContain("LAST 13 WEEKS");
    expect(src).toContain("Active Days");
    expect(src).toContain("Consistency");
  });

  it("heatmap cells are tappable to show day details", () => {
    const src = readFile("app/workout-calendar.tsx");
    expect(src).toContain("handleDayPress(day.date)");
  });
});

// ── Day Detail Modal ────────────────────────────────────────────
describe("Day Detail Modal", () => {
  it("shows a bottom sheet modal when tapping a workout day", () => {
    const src = readFile("app/workout-calendar.tsx");
    expect(src).toContain("detailModalVisible");
    expect(src).toContain("Modal");
    expect(src).toContain("animationType=\"slide\"");
  });

  it("displays the selected date in a readable format", () => {
    const src = readFile("app/workout-calendar.tsx");
    expect(src).toContain("formatDisplayDate");
    expect(src).toContain("weekday: \"long\"");
  });

  it("shows workout count for the selected day", () => {
    const src = readFile("app/workout-calendar.tsx");
    expect(src).toContain("selectedSessions.length");
  });

  it("renders session cards with exercise details in expanded mode", () => {
    const src = readFile("app/workout-calendar.tsx");
    expect(src).toContain("SessionCard");
    expect(src).toContain("expanded");
    expect(src).toContain("EXERCISES COMPLETED");
  });

  it("has a close button to dismiss the modal", () => {
    const src = readFile("app/workout-calendar.tsx");
    expect(src).toContain("setDetailModalVisible(false)");
    expect(src).toContain("\"close\"");
  });
});

// ── Data Sources ────────────────────────────────────────────────
describe("Data Sources", () => {
  it("reads from @workout_sessions_local for guest users", () => {
    const src = readFile("app/workout-calendar.tsx");
    expect(src).toContain("@workout_sessions_local");
  });

  it("reads from @workout_log_history for logged workouts", () => {
    const src = readFile("app/workout-calendar.tsx");
    expect(src).toContain("@workout_log_history");
  });

  it("fetches server sessions via trpc for authenticated users", () => {
    const src = readFile("app/workout-calendar.tsx");
    expect(src).toContain("trpc.workoutPlan.getAllSessions.useQuery");
    expect(src).toContain("enabled: isAuthenticated");
  });

  it("merges all data sources into a unified sessionsByDate map", () => {
    const src = readFile("app/workout-calendar.tsx");
    expect(src).toContain("sessionsByDate");
    expect(src).toContain("allSessions");
    expect(src).toContain("logEntries");
  });
});

// ── Sharing ─────────────────────────────────────────────────────
describe("Sharing", () => {
  it("has a share button in the header", () => {
    const src = readFile("app/workout-calendar.tsx");
    expect(src).toContain("handleShare");
    expect(src).toContain("captureRef");
  });

  it("generates a shareable summary card with stats", () => {
    const src = readFile("app/workout-calendar.tsx");
    expect(src).toContain("shareCardRef");
    expect(src).toContain("PEAKPULSE AI");
    expect(src).toContain("Summary");
  });

  it("links to the branded share-workout screen", () => {
    const src = readFile("app/workout-calendar.tsx");
    expect(src).toContain("share-workout");
    expect(src).toContain("Share Your Streak");
  });
});

// ── Navigation ──────────────────────────────────────────────────
describe("Navigation", () => {
  it("has a back button", () => {
    const src = readFile("app/workout-calendar.tsx");
    expect(src).toContain("router.back()");
    expect(src).toContain("arrow-back");
  });

  it("links to workout-history for full list view", () => {
    const src = readFile("app/workout-calendar.tsx");
    expect(src).toContain("workout-history");
    expect(src).toContain("See All");
  });

  it("links to log-workout from empty state", () => {
    const src = readFile("app/workout-calendar.tsx");
    expect(src).toContain("log-workout");
    expect(src).toContain("Log a Workout");
  });

  it("is accessible from profile screen", () => {
    const profileSrc = readFile("app/(tabs)/profile.tsx");
    expect(profileSrc).toContain("workout-calendar");
    expect(profileSrc).toContain("Workout History");
  });
});

// ── Accessibility ───────────────────────────────────────────────
describe("Accessibility", () => {
  it("uses a11yButton for the back button", () => {
    const src = readFile("app/workout-calendar.tsx");
    expect(src).toContain("a11yButton");
  });

  it("uses a11yHeader for the screen title", () => {
    const src = readFile("app/workout-calendar.tsx");
    expect(src).toContain("a11yHeader");
  });
});
