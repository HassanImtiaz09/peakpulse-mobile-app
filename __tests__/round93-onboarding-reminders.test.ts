/**
 * Round 93 Tests — First-Launch Onboarding Walkthrough & Smart Reminders
 *
 * Tests cover:
 * 1. Smart reminders settings persistence
 * 2. Smart reminders context evaluation and reminder type determination
 * 3. Tutorial overlay slide content for 4-tab layout
 * 4. Feature discovery integration
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

// ── Mock AsyncStorage ──
let mockStore: Record<string, string> = {};
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async (key: string) => mockStore[key] ?? null),
    setItem: vi.fn(async (key: string, val: string) => { mockStore[key] = val; }),
    removeItem: vi.fn(async (key: string) => { delete mockStore[key]; }),
    multiGet: vi.fn(async (keys: string[]) => keys.map(k => [k, mockStore[k] ?? null])),
    multiSet: vi.fn(async (pairs: [string, string][]) => { pairs.forEach(([k, v]) => { mockStore[k] = v; }); }),
    multiRemove: vi.fn(async (keys: string[]) => { keys.forEach(k => { delete mockStore[k]; }); }),
    getAllKeys: vi.fn(async () => Object.keys(mockStore)),
    clear: vi.fn(async () => { mockStore = {}; }),
  },
}));

// ── Mock expo-notifications ──
vi.mock("expo-notifications", () => ({
  scheduleNotificationAsync: vi.fn(async () => "mock-notif-id"),
  cancelScheduledNotificationAsync: vi.fn(async () => {}),
  setNotificationChannelAsync: vi.fn(async () => {}),
  AndroidImportance: { HIGH: 4 },
  SchedulableTriggerInputTypes: { DAILY: "daily", CALENDAR: "calendar" },
}));

// ── Mock react-native ──
vi.mock("react-native", () => ({
  Platform: { OS: "ios" },
}));

// ── Mock expo-speech ──
vi.mock("expo-speech", () => ({
  speak: vi.fn(),
  stop: vi.fn(),
  isSpeakingAsync: vi.fn(async () => false),
}));

beforeEach(() => {
  mockStore = {};
  vi.clearAllMocks();
});

// ═══════════════════════════════════════════════════════════════
// 1. SMART REMINDERS — Settings Persistence
// ═══════════════════════════════════════════════════════════════

describe("Smart Reminders — Settings", () => {
  it("returns default settings when none saved", async () => {
    const { getSmartReminderSettings, DEFAULT_SETTINGS } = await import("@/lib/smart-reminders");
    const settings = await getSmartReminderSettings();
    expect(settings.enabled).toBe(true);
    expect(settings.streakProtection).toBe(true);
    expect(settings.comebackNudges).toBe(true);
    expect(settings.milestoneCelebrations).toBe(true);
    expect(settings.restDayReminders).toBe(true);
    expect(settings.morningBoost).toBe(true);
    expect(settings.eveningPush).toBe(true);
    expect(settings.preferredWorkoutHour).toBe(8);
    expect(settings.workoutDays).toEqual([1, 2, 3, 4, 5]);
    expect(settings.quietStart).toBe(22);
    expect(settings.quietEnd).toBe(7);
  });

  it("saves and retrieves updated settings", async () => {
    const { getSmartReminderSettings, saveSmartReminderSettings } = await import("@/lib/smart-reminders");
    await saveSmartReminderSettings({ enabled: false, preferredWorkoutHour: 17 });
    const settings = await getSmartReminderSettings();
    expect(settings.enabled).toBe(false);
    expect(settings.preferredWorkoutHour).toBe(17);
    // Other defaults should remain
    expect(settings.streakProtection).toBe(true);
  });

  it("merges partial updates with existing settings", async () => {
    const { getSmartReminderSettings, saveSmartReminderSettings } = await import("@/lib/smart-reminders");
    await saveSmartReminderSettings({ workoutDays: [1, 3, 5] });
    await saveSmartReminderSettings({ quietStart: 21 });
    const settings = await getSmartReminderSettings();
    expect(settings.workoutDays).toEqual([1, 3, 5]);
    expect(settings.quietStart).toBe(21);
    expect(settings.enabled).toBe(true);
  });

  it("handles corrupted storage gracefully", async () => {
    const { getSmartReminderSettings } = await import("@/lib/smart-reminders");
    mockStore["@smart_remind_settings"] = "not-json";
    const settings = await getSmartReminderSettings();
    // Should return defaults on parse error
    expect(settings.enabled).toBe(true);
    expect(settings.preferredWorkoutHour).toBe(8);
  });

  it("saves workout days correctly when toggling", async () => {
    const { saveSmartReminderSettings, getSmartReminderSettings } = await import("@/lib/smart-reminders");
    // Add Saturday and Sunday
    await saveSmartReminderSettings({ workoutDays: [0, 1, 2, 3, 4, 5, 6] });
    const settings = await getSmartReminderSettings();
    expect(settings.workoutDays).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(settings.workoutDays.length).toBe(7);
  });

  it("saves quiet hours correctly", async () => {
    const { saveSmartReminderSettings, getSmartReminderSettings } = await import("@/lib/smart-reminders");
    await saveSmartReminderSettings({ quietStart: 23, quietEnd: 6 });
    const settings = await getSmartReminderSettings();
    expect(settings.quietStart).toBe(23);
    expect(settings.quietEnd).toBe(6);
  });
});

// ═══════════════════════════════════════════════════════════════
// 2. SMART REMINDERS — Reminder Type Determination
// ═══════════════════════════════════════════════════════════════

describe("Smart Reminders — Reminder Type Logic", () => {
  it("returns milestone for streak milestones when worked out today", async () => {
    const { determineNextReminder, DEFAULT_SETTINGS } = await import("@/lib/smart-reminders");
    const result = determineNextReminder({
      streakDays: 7,
      daysSinceLastWorkout: 0,
      workoutsThisWeek: 5,
      workedOutToday: true,
      userName: "Alex",
      todayDayOfWeek: 1, // Monday
      currentHour: 10,
    }, DEFAULT_SETTINGS);
    expect(result).toBe("milestone");
  });

  it("returns streak_protection on workout day with active streak and no workout", async () => {
    const { determineNextReminder, DEFAULT_SETTINGS } = await import("@/lib/smart-reminders");
    const result = determineNextReminder({
      streakDays: 5,
      daysSinceLastWorkout: 1,
      workoutsThisWeek: 4,
      workedOutToday: false,
      userName: "Alex",
      todayDayOfWeek: 3, // Wednesday (workout day)
      currentHour: 14,
    }, DEFAULT_SETTINGS);
    expect(result).toBe("streak_protection");
  });

  it("returns comeback when 2+ days since last workout", async () => {
    const { determineNextReminder, DEFAULT_SETTINGS } = await import("@/lib/smart-reminders");
    const result = determineNextReminder({
      streakDays: 0,
      daysSinceLastWorkout: 3,
      workoutsThisWeek: 1,
      workedOutToday: false,
      userName: "Alex",
      todayDayOfWeek: 0, // Sunday (not a workout day by default)
      currentHour: 10,
    }, DEFAULT_SETTINGS);
    expect(result).toBe("comeback");
  });

  it("returns rest_day on non-workout day with no comeback needed", async () => {
    const { determineNextReminder, DEFAULT_SETTINGS } = await import("@/lib/smart-reminders");
    const result = determineNextReminder({
      streakDays: 5,
      daysSinceLastWorkout: 0,
      workoutsThisWeek: 5,
      workedOutToday: true,
      userName: "Alex",
      todayDayOfWeek: 6, // Saturday (not a workout day by default)
      currentHour: 10,
    }, DEFAULT_SETTINGS);
    // Not a milestone (streak 5 isn't a milestone), not streak protection (worked out), not comeback (0 days)
    // Saturday is not a workout day, so rest_day
    expect(result).toBe("rest_day");
  });

  it("returns morning_boost as fallback when no other conditions met", async () => {
    const { determineNextReminder, DEFAULT_SETTINGS } = await import("@/lib/smart-reminders");
    const result = determineNextReminder({
      streakDays: 2,
      daysSinceLastWorkout: 0,
      workoutsThisWeek: 3,
      workedOutToday: true,
      userName: "Alex",
      todayDayOfWeek: 1, // Monday (workout day)
      currentHour: 10,
    }, DEFAULT_SETTINGS);
    // Streak 2 is not a milestone, worked out today so no streak protection, 0 days since last so no comeback
    // Monday is a workout day so no rest_day
    expect(result).toBe("morning_boost");
  });

  it("returns evening_push on workout day evening with no workout", async () => {
    const { determineNextReminder, DEFAULT_SETTINGS } = await import("@/lib/smart-reminders");
    // streak_protection takes priority over evening_push when streak > 0
    // So test with streak = 0 and streakProtection disabled
    const settings = { ...DEFAULT_SETTINGS, streakProtection: false, comebackNudges: false };
    const result = determineNextReminder({
      streakDays: 0,
      daysSinceLastWorkout: 1,
      workoutsThisWeek: 2,
      workedOutToday: false,
      userName: "Alex",
      todayDayOfWeek: 2, // Tuesday (workout day)
      currentHour: 19, // Evening
    }, settings);
    expect(result).toBe("evening_push");
  });

  it("returns null when all reminders disabled", async () => {
    const { determineNextReminder } = await import("@/lib/smart-reminders");
    const settings = {
      enabled: false,
      streakProtection: false,
      comebackNudges: false,
      milestoneCelebrations: false,
      restDayReminders: false,
      morningBoost: false,
      eveningPush: false,
      preferredWorkoutHour: 8,
      workoutDays: [1, 2, 3, 4, 5],
      quietStart: 22,
      quietEnd: 7,
    };
    const result = determineNextReminder({
      streakDays: 7,
      daysSinceLastWorkout: 0,
      workoutsThisWeek: 5,
      workedOutToday: true,
      userName: "Alex",
      todayDayOfWeek: 1,
      currentHour: 10,
    }, settings);
    expect(result).toBeNull();
  });

  it("prioritises milestone over streak_protection", async () => {
    const { determineNextReminder, DEFAULT_SETTINGS } = await import("@/lib/smart-reminders");
    // 7-day streak, worked out today → milestone should fire even on a workout day
    const result = determineNextReminder({
      streakDays: 14,
      daysSinceLastWorkout: 0,
      workoutsThisWeek: 5,
      workedOutToday: true,
      userName: "Alex",
      todayDayOfWeek: 3, // Wednesday
      currentHour: 10,
    }, DEFAULT_SETTINGS);
    expect(result).toBe("milestone");
  });

  it("does not trigger milestone for non-milestone streak values", async () => {
    const { determineNextReminder, DEFAULT_SETTINGS } = await import("@/lib/smart-reminders");
    const result = determineNextReminder({
      streakDays: 5, // Not a milestone (3, 7, 14, 30, 50, 100)
      daysSinceLastWorkout: 0,
      workoutsThisWeek: 5,
      workedOutToday: true,
      userName: "Alex",
      todayDayOfWeek: 1,
      currentHour: 10,
    }, DEFAULT_SETTINGS);
    expect(result).not.toBe("milestone");
  });

  it("handles custom workout days correctly", async () => {
    const { determineNextReminder, DEFAULT_SETTINGS } = await import("@/lib/smart-reminders");
    // Weekend warrior: only Sat/Sun
    const settings = { ...DEFAULT_SETTINGS, workoutDays: [0, 6] };
    const result = determineNextReminder({
      streakDays: 2,
      daysSinceLastWorkout: 0,
      workoutsThisWeek: 2,
      workedOutToday: true,
      userName: "Alex",
      todayDayOfWeek: 3, // Wednesday — not a workout day
      currentHour: 10,
    }, settings);
    // Wednesday is a rest day for this user
    expect(result).toBe("rest_day");
  });
});

// ═══════════════════════════════════════════════════════════════
// 3. SMART REMINDERS — Workout Context
// ═══════════════════════════════════════════════════════════════

describe("Smart Reminders — Workout Context", () => {
  it("returns default context when no data exists", async () => {
    const { getWorkoutContext } = await import("@/lib/smart-reminders");
    const ctx = await getWorkoutContext();
    expect(ctx.streakDays).toBe(0);
    expect(ctx.daysSinceLastWorkout).toBe(999);
    expect(ctx.workoutsThisWeek).toBe(0);
    expect(ctx.workedOutToday).toBe(false);
    expect(ctx.userName).toBe("there");
    expect(typeof ctx.todayDayOfWeek).toBe("number");
    expect(typeof ctx.currentHour).toBe("number");
  });

  it("calculates streak from workout sessions", async () => {
    const { getWorkoutContext } = await import("@/lib/smart-reminders");
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const twoDaysAgo = new Date(today);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    mockStore["@workout_sessions_local"] = JSON.stringify([
      { completedAt: today.toISOString() },
      { completedAt: yesterday.toISOString() },
      { completedAt: twoDaysAgo.toISOString() },
    ]);

    const ctx = await getWorkoutContext();
    expect(ctx.streakDays).toBe(3);
    expect(ctx.workedOutToday).toBe(true);
    expect(ctx.daysSinceLastWorkout).toBe(0);
  });

  it("uses user name from profile", async () => {
    const { getWorkoutContext } = await import("@/lib/smart-reminders");
    mockStore["@user_profile"] = JSON.stringify({ name: "Jordan" });
    const ctx = await getWorkoutContext();
    expect(ctx.userName).toBe("Jordan");
  });

  it("counts workouts this week correctly", async () => {
    const { getWorkoutContext } = await import("@/lib/smart-reminders");
    const now = new Date();
    const sessions = [];
    for (let i = 0; i < 4; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      sessions.push({ completedAt: d.toISOString() });
    }
    // Add one from 10 days ago (should not count)
    const old = new Date(now);
    old.setDate(old.getDate() - 10);
    sessions.push({ completedAt: old.toISOString() });

    mockStore["@workout_sessions_local"] = JSON.stringify(sessions);
    const ctx = await getWorkoutContext();
    expect(ctx.workoutsThisWeek).toBe(4);
  });

  it("handles broken streak correctly", async () => {
    const { getWorkoutContext } = await import("@/lib/smart-reminders");
    const today = new Date();
    // Worked out 3 days ago and 4 days ago, but not yesterday or today
    const threeDaysAgo = new Date(today);
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const fourDaysAgo = new Date(today);
    fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);

    mockStore["@workout_sessions_local"] = JSON.stringify([
      { completedAt: threeDaysAgo.toISOString() },
      { completedAt: fourDaysAgo.toISOString() },
    ]);

    const ctx = await getWorkoutContext();
    expect(ctx.streakDays).toBe(0); // Streak broken — gap of 2 days
    expect(ctx.workedOutToday).toBe(false);
    expect(ctx.daysSinceLastWorkout).toBe(3);
  });
});

// ═══════════════════════════════════════════════════════════════
// 4. TUTORIAL OVERLAY — Slide Content
// ═══════════════════════════════════════════════════════════════

describe("Tutorial Overlay — Content Verification", () => {
  it("tutorial-overlay.tsx file exists", async () => {
    const fs = await import("fs");
    const exists = fs.existsSync("/home/ubuntu/peakpulse-mobile/components/tutorial-overlay.tsx");
    expect(exists).toBe(true);
  });

  it("smart-reminders.tsx screen file exists", async () => {
    const fs = await import("fs");
    const exists = fs.existsSync("/home/ubuntu/peakpulse-mobile/app/smart-reminders.tsx");
    expect(exists).toBe(true);
  });

  it("smart-reminders.ts service file exists", async () => {
    const fs = await import("fs");
    const exists = fs.existsSync("/home/ubuntu/peakpulse-mobile/lib/smart-reminders.ts");
    expect(exists).toBe(true);
  });

  it("tutorial overlay contains 4-tab references", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("/home/ubuntu/peakpulse-mobile/components/tutorial-overlay.tsx", "utf-8");
    // Should reference the 4 tabs: Home, Train, Nutrition, Profile
    expect(content).toContain("Home");
    expect(content).toContain("Train");
    expect(content).toContain("Nutrition");
    expect(content).toContain("Profile");
  });

  it("tutorial overlay describes the 4-tab navigation structure", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("/home/ubuntu/peakpulse-mobile/components/tutorial-overlay.tsx", "utf-8");
    // Should describe the 4 tabs, not the old 6-tab layout
    // The file should contain references to the current tab structure
    expect(content).toContain("Home");
    expect(content).toContain("Train");
    expect(content).toContain("Nutrition");
    expect(content).toContain("Profile");
    // Should have tutorial slides defined
    expect(content.length).toBeGreaterThan(500);
  });

  it("smart reminders service exports all required functions", async () => {
    const mod = await import("@/lib/smart-reminders");
    expect(typeof mod.getSmartReminderSettings).toBe("function");
    expect(typeof mod.saveSmartReminderSettings).toBe("function");
    expect(typeof mod.evaluateAndScheduleSmartReminders).toBe("function");
    expect(typeof mod.cancelAllSmartReminders).toBe("function");
    expect(typeof mod.getLastEvaluationTime).toBe("function");
    expect(typeof mod.determineNextReminder).toBe("function");
    expect(typeof mod.getWorkoutContext).toBe("function");
    expect(mod.DEFAULT_SETTINGS).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════
// 5. SMART REMINDERS — Scheduling Integration
// ═══════════════════════════════════════════════════════════════

describe("Smart Reminders — Scheduling", () => {
  it("evaluateAndScheduleSmartReminders runs without error", async () => {
    const { evaluateAndScheduleSmartReminders } = await import("@/lib/smart-reminders");
    // Should not throw even with no data
    await expect(evaluateAndScheduleSmartReminders()).resolves.not.toThrow();
  });

  it("cancelAllSmartReminders runs without error", async () => {
    const { cancelAllSmartReminders } = await import("@/lib/smart-reminders");
    await expect(cancelAllSmartReminders()).resolves.not.toThrow();
  });

  it("records last evaluation time", async () => {
    const { evaluateAndScheduleSmartReminders, getLastEvaluationTime } = await import("@/lib/smart-reminders");
    await evaluateAndScheduleSmartReminders();
    const lastEval = await getLastEvaluationTime();
    expect(lastEval).toBeTruthy();
    // Should be a valid ISO date
    const date = new Date(lastEval!);
    expect(date.getTime()).toBeGreaterThan(0);
  });

  it("does not schedule when disabled", async () => {
    const { saveSmartReminderSettings, evaluateAndScheduleSmartReminders } = await import("@/lib/smart-reminders");
    const Notifications = await import("expo-notifications");
    await saveSmartReminderSettings({ enabled: false });
    vi.clearAllMocks();
    await evaluateAndScheduleSmartReminders();
    // Should have cancelled all but not scheduled new ones
    // The scheduleNotificationAsync should not have been called for new reminders
    // (cancelScheduledNotificationAsync may be called for cleanup)
    const scheduleCalls = (Notifications.scheduleNotificationAsync as any).mock.calls;
    // When disabled, no new notifications should be scheduled
    expect(scheduleCalls.length).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════
// 6. INTEGRATION — App Layout Wiring
// ═══════════════════════════════════════════════════════════════

describe("Integration — Wiring Verification", () => {
  it("app/_layout.tsx imports smart reminders", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("/home/ubuntu/peakpulse-mobile/app/_layout.tsx", "utf-8");
    expect(content).toContain("evaluateAndScheduleSmartReminders");
    expect(content).toContain("smart-reminders");
  });

  it("active-workout.tsx triggers smart reminders after workout completion", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("/home/ubuntu/peakpulse-mobile/app/active-workout.tsx", "utf-8");
    expect(content).toContain("evaluateAndScheduleSmartReminders");
  });

  it("profile.tsx has Smart Reminders link", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("/home/ubuntu/peakpulse-mobile/app/(tabs)/profile.tsx", "utf-8");
    expect(content).toContain("Smart Reminders");
    expect(content).toContain("/smart-reminders");
  });

  it("home screen imports TutorialOverlay", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("/home/ubuntu/peakpulse-mobile/app/(tabs)/index.tsx", "utf-8");
    expect(content).toContain("TutorialOverlay");
    expect(content).toContain("useTutorial");
  });
});

// ═══════════════════════════════════════════════════════════════
// 7. EDGE CASES
// ═══════════════════════════════════════════════════════════════

describe("Smart Reminders — Edge Cases", () => {
  it("handles empty workout days array", async () => {
    const { determineNextReminder, DEFAULT_SETTINGS } = await import("@/lib/smart-reminders");
    const settings = { ...DEFAULT_SETTINGS, workoutDays: [] as number[] };
    const result = determineNextReminder({
      streakDays: 0,
      daysSinceLastWorkout: 1,
      workoutsThisWeek: 0,
      workedOutToday: false,
      userName: "Alex",
      todayDayOfWeek: 1,
      currentHour: 10,
    }, settings);
    // Every day is a rest day when no workout days are set
    expect(result).toBe("rest_day");
  });

  it("handles all milestone values", async () => {
    const { determineNextReminder, DEFAULT_SETTINGS } = await import("@/lib/smart-reminders");
    const milestones = [3, 7, 14, 30, 50, 100];
    for (const streak of milestones) {
      const result = determineNextReminder({
        streakDays: streak,
        daysSinceLastWorkout: 0,
        workoutsThisWeek: 5,
        workedOutToday: true,
        userName: "Alex",
        todayDayOfWeek: 1,
        currentHour: 10,
      }, DEFAULT_SETTINGS);
      expect(result).toBe("milestone");
    }
  });

  it("streak protection requires active streak (streakDays > 0)", async () => {
    const { determineNextReminder, DEFAULT_SETTINGS } = await import("@/lib/smart-reminders");
    const result = determineNextReminder({
      streakDays: 0, // No streak
      daysSinceLastWorkout: 1,
      workoutsThisWeek: 2,
      workedOutToday: false,
      userName: "Alex",
      todayDayOfWeek: 1, // Monday (workout day)
      currentHour: 14,
    }, DEFAULT_SETTINGS);
    // No streak to protect, so should not be streak_protection
    expect(result).not.toBe("streak_protection");
  });

  it("comeback only triggers at 2+ days", async () => {
    const { determineNextReminder, DEFAULT_SETTINGS } = await import("@/lib/smart-reminders");
    const result1 = determineNextReminder({
      streakDays: 0,
      daysSinceLastWorkout: 1, // Only 1 day
      workoutsThisWeek: 3,
      workedOutToday: false,
      userName: "Alex",
      todayDayOfWeek: 0, // Sunday (not workout day)
      currentHour: 10,
    }, DEFAULT_SETTINGS);
    expect(result1).not.toBe("comeback");

    const result2 = determineNextReminder({
      streakDays: 0,
      daysSinceLastWorkout: 2, // 2 days
      workoutsThisWeek: 1,
      workedOutToday: false,
      userName: "Alex",
      todayDayOfWeek: 0,
      currentHour: 10,
    }, DEFAULT_SETTINGS);
    expect(result2).toBe("comeback");
  });
});
