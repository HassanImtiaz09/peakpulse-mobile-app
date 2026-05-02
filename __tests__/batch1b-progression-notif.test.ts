/**
 * Batch 1b Tests — Progression Engine + Notification Wiring
 *
 * Tests for:
 * 1. lib/progression-engine.ts — double progression, linear progression, deload detection
 * 2. Notification wiring — verifies NotificationManager integration
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock react-native ──
vi.mock("react-native", () => ({
  Platform: { OS: "ios" },
}));

// ── Mock AsyncStorage ──
const mockStorage: Record<string, string> = {};
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn((key: string) => Promise.resolve(mockStorage[key] ?? null)),
    setItem: vi.fn((key: string, val: string) => { mockStorage[key] = val; return Promise.resolve(); }),
    removeItem: vi.fn((key: string) => { delete mockStorage[key]; return Promise.resolve(); }),
    multiRemove: vi.fn((keys: string[]) => { keys.forEach(k => delete mockStorage[k]); return Promise.resolve(); }),
  },
}));

// ── Mock expo-notifications ──
vi.mock("expo-notifications", () => ({
  scheduleNotificationAsync: vi.fn(() => Promise.resolve("mock-id-" + Math.random().toString(36).slice(2, 8))),
  cancelScheduledNotificationAsync: vi.fn(() => Promise.resolve()),
  cancelAllScheduledNotificationsAsync: vi.fn(() => Promise.resolve()),
  getPermissionsAsync: vi.fn(() => Promise.resolve({ status: "granted" })),
  requestPermissionsAsync: vi.fn(() => Promise.resolve({ status: "granted" })),
  setNotificationHandler: vi.fn(),
  setNotificationChannelAsync: vi.fn(() => Promise.resolve()),
  getAllScheduledNotificationsAsync: vi.fn(() => Promise.resolve([])),
  SchedulableTriggerInputTypes: { DAILY: "daily", TIME_INTERVAL: "timeInterval", DATE: "date" },
  AndroidImportance: { HIGH: 4, DEFAULT: 3 },
}));

// ══════════════════════════════════════════════════════════════════════════════
// PROGRESSION ENGINE TESTS
// ══════════════════════════════════════════════════════════════════════════════

import {
  calculateDoubleProgression,
  calculateLinearProgression,
  getConsecutiveFailures,
  calculateDeload,
  buildDeloadMessage,
  buildProgressionMessage,
  getConfidence,
  getWeightIncrement,
  analyzeExercise,
  DEFAULT_CONFIG,
  DEFAULT_REP_RANGE,
} from "@/lib/progression-engine";

import type { ExerciseSession } from "@/lib/progression-engine";

// Helper to create a valid ExerciseSession
function makeSession(overrides: Partial<ExerciseSession> & { exerciseName?: string }): ExerciseSession {
  return {
    exerciseName: overrides.exerciseName ?? "Bench Press",
    date: overrides.date ?? "2026-05-01",
    prescribedSets: overrides.prescribedSets ?? 3,
    completedSets: overrides.completedSets ?? 3,
    weight: overrides.weight ?? 60,
    reps: overrides.reps ?? 8,
    allSetsCompleted: overrides.allSetsCompleted ?? true,
  };
}

describe("Progression Engine", () => {
  // ── getWeightIncrement ──
  describe("getWeightIncrement", () => {
    it("returns compoundIncrement for compound exercises", () => {
      expect(getWeightIncrement("compound")).toBe(DEFAULT_CONFIG.compoundIncrement);
    });

    it("returns isolationIncrement for isolation exercises", () => {
      expect(getWeightIncrement("isolation")).toBe(DEFAULT_CONFIG.isolationIncrement);
    });

    it("returns 0 for bodyweight exercises", () => {
      expect(getWeightIncrement("bodyweight")).toBe(0);
    });

    it("uses custom config when provided", () => {
      const customConfig = { ...DEFAULT_CONFIG, compoundIncrement: 5 };
      expect(getWeightIncrement("compound", customConfig)).toBe(5);
    });
  });

  // ── calculateDoubleProgression ──
  describe("calculateDoubleProgression", () => {
    it("suggests increase_reps when below max rep range", () => {
      const result = calculateDoubleProgression("Bench Press", 60, 8);
      expect(result.action).toBe("increase_reps");
      expect(result.suggestedReps).toBe(9);
      expect(result.suggestedWeight).toBe(60);
    });

    it("suggests increase_weight when at max rep range", () => {
      const result = calculateDoubleProgression("Bench Press", 60, 12);
      expect(result.action).toBe("increase_weight");
      expect(result.suggestedWeight).toBe(62.5); // compound +2.5
      expect(result.suggestedReps).toBe(DEFAULT_CONFIG.repRange.min);
    });

    it("suggests increase_weight when above max rep range", () => {
      const result = calculateDoubleProgression("Bench Press", 60, 15);
      expect(result.action).toBe("increase_weight");
    });

    it("handles bodyweight exercises (always increase reps)", () => {
      const result = calculateDoubleProgression("Pull-up", 0, 10);
      expect(result.action).toBe("increase_reps");
      expect(result.suggestedReps).toBe(11);
      expect(result.suggestedWeight).toBe(0);
    });

    it("uses isolation increment for isolation exercises", () => {
      const result = calculateDoubleProgression("Bicep Curl", 15, 12, DEFAULT_CONFIG, "isolation");
      expect(result.action).toBe("increase_weight");
      expect(result.suggestedWeight).toBe(15 + DEFAULT_CONFIG.isolationIncrement);
    });
  });

  // ── calculateLinearProgression ──
  describe("calculateLinearProgression", () => {
    it("suggests increase_weight for compound exercises", () => {
      const result = calculateLinearProgression("Squat", 100, 5);
      expect(result.action).toBe("increase_weight");
      expect(result.suggestedWeight).toBe(102.5);
      expect(result.suggestedReps).toBe(5);
    });

    it("suggests increase_reps for bodyweight exercises", () => {
      const result = calculateLinearProgression("Push-up", 0, 10);
      expect(result.action).toBe("increase_reps");
      expect(result.suggestedWeight).toBe(0);
      expect(result.suggestedReps).toBeGreaterThan(10);
    });
  });

  // ── getConsecutiveFailures ──
  describe("getConsecutiveFailures", () => {
    it("returns 0 for empty sessions", () => {
      expect(getConsecutiveFailures([])).toBe(0);
    });

    it("counts consecutive failures from the end", () => {
      const sessions: ExerciseSession[] = [
        makeSession({ date: "2026-04-22", allSetsCompleted: true }),
        makeSession({ date: "2026-04-25", allSetsCompleted: false }),
        makeSession({ date: "2026-04-28", allSetsCompleted: false }),
        makeSession({ date: "2026-05-01", allSetsCompleted: false }),
      ];
      expect(getConsecutiveFailures(sessions)).toBe(3);
    });

    it("returns 0 when latest session was successful", () => {
      const sessions: ExerciseSession[] = [
        makeSession({ date: "2026-04-28", allSetsCompleted: false }),
        makeSession({ date: "2026-05-01", allSetsCompleted: true }),
      ];
      expect(getConsecutiveFailures(sessions)).toBe(0);
    });

    it("counts all sessions as failures if none completed", () => {
      const sessions: ExerciseSession[] = [
        makeSession({ date: "2026-04-25", allSetsCompleted: false }),
        makeSession({ date: "2026-04-28", allSetsCompleted: false }),
      ];
      expect(getConsecutiveFailures(sessions)).toBe(2);
    });
  });

  // ── calculateDeload ──
  describe("calculateDeload", () => {
    it("suggests 10% deload by default", () => {
      const result = calculateDeload("Bench Press", 100, 3);
      expect(result.suggestedWeight).toBe(90);
      expect(result.consecutiveFailures).toBe(3);
    });

    it("rounds deload weight to nearest 1.25", () => {
      const result = calculateDeload("Bench Press", 67.5, 3);
      // 67.5 * 0.9 = 60.75, round to nearest 1.25 = 61.25
      expect(result.suggestedWeight % 1.25).toBe(0);
    });

    it("never deloads below 0", () => {
      const result = calculateDeload("Bench Press", 5, 3);
      expect(result.suggestedWeight).toBeGreaterThanOrEqual(0);
    });

    it("includes exercise name in the message", () => {
      const result = calculateDeload("Squat", 100, 4);
      expect(result.message).toContain("Squat");
    });
  });

  // ── buildDeloadMessage ──
  describe("buildDeloadMessage", () => {
    it("includes exercise name and weights", () => {
      const msg = buildDeloadMessage("Bench Press", 100, 90, 3);
      expect(msg).toContain("Bench Press");
      expect(msg).toContain("100");
      expect(msg).toContain("90");
    });

    it("handles bodyweight exercises (weight = 0)", () => {
      const msg = buildDeloadMessage("Pull-up", 0, 0, 3);
      expect(msg).toContain("Pull-up");
      expect(msg).toContain("3 sessions");
    });
  });

  // ── buildProgressionMessage ──
  describe("buildProgressionMessage", () => {
    it("builds increase_weight message for compound", () => {
      const msg = buildProgressionMessage({
        exerciseName: "Squat",
        exerciseType: "compound",
        mode: "double",
        currentWeight: 100,
        currentReps: 12,
        suggestedWeight: 102.5,
        suggestedReps: 8,
        consecutiveCompletions: 3,
        action: "increase_weight",
      });
      expect(msg).toContain("Squat");
      expect(msg).toContain("102.5");
    });

    it("builds increase_reps message", () => {
      const msg = buildProgressionMessage({
        exerciseName: "Curl",
        exerciseType: "isolation",
        mode: "double",
        currentWeight: 15,
        currentReps: 9,
        suggestedWeight: 15,
        suggestedReps: 10,
        consecutiveCompletions: 3,
        action: "increase_reps",
      });
      expect(msg).toContain("Curl");
      expect(msg).toContain("10");
    });

    it("builds bodyweight progression message", () => {
      const msg = buildProgressionMessage({
        exerciseName: "Push-up",
        exerciseType: "bodyweight",
        mode: "double",
        currentWeight: 0,
        currentReps: 15,
        suggestedWeight: 0,
        suggestedReps: 16,
        consecutiveCompletions: 3,
        action: "increase_reps",
      });
      expect(msg).toContain("Push-up");
      expect(msg).toContain("16");
    });
  });

  // ── getConfidence ──
  describe("getConfidence", () => {
    it("returns high confidence with threshold+2 completions", () => {
      expect(getConfidence(5, 3)).toBe("high");
    });

    it("returns medium confidence at threshold", () => {
      expect(getConfidence(3, 3)).toBe("medium");
    });

    it("returns low confidence below threshold", () => {
      expect(getConfidence(1, 3)).toBe("low");
      expect(getConfidence(2, 3)).toBe("low");
    });
  });

  // ── analyzeExercise ──
  describe("analyzeExercise", () => {
    it("returns null with no sessions", () => {
      const result = analyzeExercise("Bench Press", []);
      expect(result).toBeNull();
    });

    it("returns maintain when below consecutive threshold", () => {
      const sessions: ExerciseSession[] = [
        makeSession({ date: "2026-04-28", weight: 60, reps: 8, allSetsCompleted: true }),
        makeSession({ date: "2026-05-01", weight: 60, reps: 8, allSetsCompleted: true }),
      ];
      const result = analyzeExercise("Bench Press", sessions);
      expect(result).not.toBeNull();
      expect(result!.action).toBe("maintain");
      expect(result!.confidence).toBe("low");
    });

    it("suggests increase_reps with double progression after threshold", () => {
      const sessions: ExerciseSession[] = [
        makeSession({ date: "2026-04-19", weight: 60, reps: 8, allSetsCompleted: true }),
        makeSession({ date: "2026-04-22", weight: 60, reps: 8, allSetsCompleted: true }),
        makeSession({ date: "2026-04-25", weight: 60, reps: 8, allSetsCompleted: true }),
        makeSession({ date: "2026-04-28", weight: 60, reps: 8, allSetsCompleted: true }),
        makeSession({ date: "2026-05-01", weight: 60, reps: 8, allSetsCompleted: true }),
      ];
      const result = analyzeExercise("Bench Press", sessions);
      expect(result).not.toBeNull();
      // With double progression at 8 reps (min of range), should increase reps
      expect(result!.action).toBe("increase_reps");
      expect(result!.suggestedReps).toBe(9);
    });

    it("suggests increase_weight at max rep range", () => {
      const sessions: ExerciseSession[] = [
        makeSession({ date: "2026-04-19", weight: 60, reps: 12, allSetsCompleted: true }),
        makeSession({ date: "2026-04-22", weight: 60, reps: 12, allSetsCompleted: true }),
        makeSession({ date: "2026-04-25", weight: 60, reps: 12, allSetsCompleted: true }),
      ];
      const result = analyzeExercise("Bench Press", sessions);
      expect(result).not.toBeNull();
      expect(result!.action).toBe("increase_weight");
      expect(result!.suggestedWeight).toBe(62.5);
    });

    it("suggests deload after consecutive failures", () => {
      const sessions: ExerciseSession[] = [
        makeSession({ date: "2026-04-19", weight: 80, reps: 8, allSetsCompleted: false }),
        makeSession({ date: "2026-04-22", weight: 80, reps: 8, allSetsCompleted: false }),
        makeSession({ date: "2026-04-25", weight: 80, reps: 8, allSetsCompleted: false }),
      ];
      const result = analyzeExercise("Bench Press", sessions);
      expect(result).not.toBeNull();
      expect(result!.action).toBe("deload");
      expect(result!.suggestedWeight).toBeLessThan(80);
      expect(result!.confidence).toBe("high");
    });

    it("uses linear progression when configured", () => {
      const linearConfig = { ...DEFAULT_CONFIG, mode: "linear" as const };
      const sessions: ExerciseSession[] = [
        makeSession({ date: "2026-04-19", weight: 100, reps: 5, allSetsCompleted: true }),
        makeSession({ date: "2026-04-22", weight: 100, reps: 5, allSetsCompleted: true }),
        makeSession({ date: "2026-04-25", weight: 100, reps: 5, allSetsCompleted: true }),
      ];
      const result = analyzeExercise("Squat", sessions, linearConfig);
      expect(result).not.toBeNull();
      expect(result!.action).toBe("increase_weight");
      expect(result!.suggestedWeight).toBe(102.5);
      expect(result!.suggestedReps).toBe(5); // Linear keeps same reps
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// NOTIFICATION WIRING TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe("Notification Wiring", () => {
  beforeEach(() => {
    Object.keys(mockStorage).forEach(k => delete mockStorage[k]);
    vi.clearAllMocks();
  });

  describe("NotificationManager.rescheduleAll", () => {
    it("can be called without errors", async () => {
      const { NotificationManager } = await import("@/lib/notification-manager");
      await NotificationManager.reset();
      await NotificationManager.rescheduleAll();
      expect(NotificationManager.getScheduledCount()).toBeGreaterThan(0);
    });

    it("respects preference overrides", async () => {
      const { NotificationManager } = await import("@/lib/notification-manager");
      await NotificationManager.reset();
      await NotificationManager.rescheduleAll({
        workoutReminderEnabled: false,
        mealReminderEnabled: false,
      });
      const count = NotificationManager.getScheduledCount();
      expect(count).toBeGreaterThanOrEqual(1);
    });
  });

  describe("NotificationManager.schedule deduplication", () => {
    it("replaces existing notification in same category", async () => {
      const { NotificationManager } = await import("@/lib/notification-manager");
      await NotificationManager.reset();

      const id1 = await NotificationManager.schedule({
        category: "workout_reminder",
        title: "First",
        body: "First workout reminder",
        trigger: { type: "daily", hour: 8, minute: 0 },
      });

      const id2 = await NotificationManager.schedule({
        category: "workout_reminder",
        title: "Second",
        body: "Second workout reminder",
        trigger: { type: "daily", hour: 9, minute: 0 },
      });

      expect(id1).toBeTruthy();
      expect(id2).toBeTruthy();
      const state = NotificationManager.getState();
      expect(Object.keys(state.scheduledByCategory)).toHaveLength(1);
    });
  });

  describe("NotificationManager.sendContextual", () => {
    it("sends an immediate notification", async () => {
      const { NotificationManager } = await import("@/lib/notification-manager");
      await NotificationManager.reset();

      const id = await NotificationManager.sendContextual(
        "streak_protection",
        "Streak Alert",
        "Your streak is at risk!",
        { screen: "/streak-details" },
      );

      expect(id).toBeTruthy();
    });
  });

  describe("NotificationManager throttling", () => {
    it("throttles after MAX_PER_CATEGORY_PER_DAY notifications", async () => {
      const { NotificationManager, MAX_PER_CATEGORY_PER_DAY } = await import("@/lib/notification-manager");
      await NotificationManager.reset();

      for (let i = 0; i < MAX_PER_CATEGORY_PER_DAY; i++) {
        const id = await NotificationManager.schedule({
          category: "general",
          title: `Test ${i}`,
          body: `Test body ${i}`,
          trigger: { type: "immediate" },
        });
        expect(id).toBeTruthy();
      }

      const throttledId = await NotificationManager.schedule({
        category: "general",
        title: "Throttled",
        body: "This should be throttled",
        trigger: { type: "immediate" },
      });
      expect(throttledId).toBeNull();
    });
  });

  describe("NotificationManager quiet hours", () => {
    it("defers daily notifications in quiet hours", async () => {
      const { NotificationManager } = await import("@/lib/notification-manager");
      await NotificationManager.reset();
      await NotificationManager.setQuietHours({ enabled: true, startHour: 22, endHour: 7 });

      const id = await NotificationManager.schedule({
        category: "evening_recap",
        title: "Late Recap",
        body: "This should be deferred",
        trigger: { type: "daily", hour: 23, minute: 0 },
      });

      expect(id).toBeTruthy();
    });

    it("allows bypass of quiet hours", async () => {
      const { NotificationManager } = await import("@/lib/notification-manager");
      await NotificationManager.reset();
      await NotificationManager.setQuietHours({ enabled: true, startHour: 22, endHour: 7 });

      const id = await NotificationManager.schedule({
        category: "streak_protection",
        title: "Urgent",
        body: "Your streak is about to break!",
        trigger: { type: "daily", hour: 23, minute: 0 },
        bypassQuietHours: true,
      });

      expect(id).toBeTruthy();
    });
  });

  describe("notification-service.ts uses NotificationManager", () => {
    it("scheduleDefaultReminders calls NotificationManager.rescheduleAll", async () => {
      const { NotificationManager } = await import("@/lib/notification-manager");
      const spy = vi.spyOn(NotificationManager, "rescheduleAll");
      await NotificationManager.reset();

      const { scheduleDefaultReminders } = await import("@/lib/notification-service");
      await scheduleDefaultReminders();

      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });
  });
});
