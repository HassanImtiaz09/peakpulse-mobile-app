/**
 * Batch 2 — Voice Coach Tests
 *
 * Tests for:
 * - Coach personality selection and prompt generation
 * - Morning briefing, post-workout, and re-engagement context building
 * - Workout data pipeline
 * - Voice playback module exports
 * - ElevenLabs server service exports
 * - Voice coach settings with new ElevenLabs fields
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ────────────────────────────────────────────────────────────────────
(globalThis as any).__DEV__ = false;

const mockStore: Record<string, string> = {};
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn((key: string) => Promise.resolve(mockStore[key] ?? null)),
    setItem: vi.fn((key: string, val: string) => { mockStore[key] = val; return Promise.resolve(); }),
    removeItem: vi.fn((key: string) => { delete mockStore[key]; return Promise.resolve(); }),
    multiRemove: vi.fn((keys: string[]) => { keys.forEach(k => delete mockStore[k]); return Promise.resolve(); }),
  },
}));

vi.mock("react-native", () => ({
  Platform: { OS: "ios" },
}));

vi.mock("expo-speech", () => ({
  speak: vi.fn(),
  stop: vi.fn(),
  isSpeakingAsync: vi.fn(() => Promise.resolve(false)),
}));

vi.mock("expo-audio", () => ({
  useAudioPlayer: vi.fn(() => ({
    play: vi.fn(),
    pause: vi.fn(),
    release: vi.fn(),
    currentTime: 0,
    duration: 0,
    playing: false,
  })),
  setAudioModeAsync: vi.fn(),
  createAudioPlayer: vi.fn(() => ({
    play: vi.fn(),
    pause: vi.fn(),
    release: vi.fn(),
    replace: vi.fn(),
    seekTo: vi.fn(),
    currentTime: 0,
    duration: 0,
    playing: false,
    addListener: vi.fn(() => ({ remove: vi.fn() })),
  })),
}));

vi.mock("expo-notifications", () => ({
  scheduleNotificationAsync: vi.fn(),
  cancelAllScheduledNotificationsAsync: vi.fn(),
  setNotificationHandler: vi.fn(),
  getPermissionsAsync: vi.fn(() => Promise.resolve({ status: "granted" })),
  requestPermissionsAsync: vi.fn(() => Promise.resolve({ status: "granted" })),
}));

beforeEach(() => {
  Object.keys(mockStore).forEach(k => delete mockStore[k]);
});

// ─── Coach Personality Tests ─────────────────────────────────────────────────
describe("Coach Personality Engine", () => {
  it("should export all required functions", async () => {
    const mod = await import("../lib/coach-personality");
    expect(mod.selectPersonality).toBeDefined();
    expect(mod.getPersonalityPrompt).toBeDefined();
    expect(mod.buildMorningBriefingContext).toBeDefined();
    expect(mod.buildPostWorkoutContext).toBeDefined();
    expect(mod.buildReEngagementContext).toBeDefined();
    expect(mod.buildWorkoutDataPipeline).toBeDefined();
    expect(mod.shouldShowReEngagement).toBeDefined();
    expect(mod.recordReEngagementNudge).toBeDefined();
  });

  it("should select motivator personality for morning hours (5-11)", async () => {
    const { selectPersonality } = await import("../lib/coach-personality");
    expect(selectPersonality(6)).toBe("motivator");
    expect(selectPersonality(8)).toBe("motivator");
    expect(selectPersonality(10)).toBe("motivator");
  });

  it("should select analyst personality for midday hours (11-17)", async () => {
    const { selectPersonality } = await import("../lib/coach-personality");
    expect(selectPersonality(11)).toBe("analyst");
    expect(selectPersonality(13)).toBe("analyst");
    expect(selectPersonality(16)).toBe("analyst");
  });

  it("should select mentor personality for evening/night hours (17+)", async () => {
    const { selectPersonality } = await import("../lib/coach-personality");
    expect(selectPersonality(18)).toBe("mentor");
    expect(selectPersonality(21)).toBe("mentor");
    expect(selectPersonality(23)).toBe("mentor");
    expect(selectPersonality(2)).toBe("mentor");
  });

  it("should return personality-specific prompts for all types", async () => {
    const { getPersonalityPrompt } = await import("../lib/coach-personality");
    const motivator = getPersonalityPrompt("motivator");
    const analyst = getPersonalityPrompt("analyst");
    const mentor = getPersonalityPrompt("mentor");

    expect(motivator).toContain("energetic");
    expect(analyst).toContain("data-driven");
    expect(mentor).toContain("wise");

    // All should be non-empty strings
    expect(motivator.length).toBeGreaterThan(50);
    expect(analyst.length).toBeGreaterThan(50);
    expect(mentor.length).toBeGreaterThan(50);
  });

  it("should build morning briefing context with daily state", async () => {
    const { buildMorningBriefingContext } = await import("../lib/coach-personality");
    const context = await buildMorningBriefingContext();

    expect(context.trigger).toBe("morning_briefing");
    expect(["motivator", "analyst", "mentor"]).toContain(context.personality);
    expect(context.contextData).toBeDefined();
    expect(context.systemPromptAdditions).toBeTruthy();
    expect(context.contextData.timeOfDay).toBeDefined();
    expect(context.contextData.workoutStatus).toBeDefined();
    expect(typeof context.contextData.mealsLogged).toBe("number");
  });

  it("should build post-workout context with workout data", async () => {
    const { buildPostWorkoutContext } = await import("../lib/coach-personality");
    const context = await buildPostWorkoutContext({
      exerciseCount: 5,
      totalSets: 15,
      totalVolume: 2500,
      duration: 45,
      muscleGroups: ["chest", "triceps"],
      personalRecords: ["Bench Press 100kg"],
      exerciseNames: ["Bench Press", "Incline DB Press", "Cable Fly", "Tricep Pushdown", "Overhead Extension"],
    });

    expect(context.trigger).toBe("post_workout");
    expect(context.contextData.exerciseCount).toBe(5);
    expect(context.contextData.totalSets).toBe(15);
    expect(context.contextData.totalVolume).toBe(2500);
    expect(context.contextData.durationMinutes).toBe(45);
    expect(context.contextData.personalRecords).toEqual(["Bench Press 100kg"]);
    expect(context.systemPromptAdditions).toContain("PERSONAL RECORDS HIT");
    expect(context.systemPromptAdditions).toContain("Bench Press 100kg");
  });

  it("should build post-workout context without PRs", async () => {
    const { buildPostWorkoutContext } = await import("../lib/coach-personality");
    const context = await buildPostWorkoutContext({
      exerciseCount: 3,
      totalSets: 9,
      totalVolume: 1200,
      duration: 30,
      muscleGroups: ["back"],
      exerciseNames: ["Pull-ups", "Rows", "Lat Pulldown"],
    });

    expect(context.systemPromptAdditions).toContain("No new PRs");
    expect(context.systemPromptAdditions).toContain("progressive overload");
  });

  it("should return null for re-engagement when no last workout date", async () => {
    const { buildReEngagementContext } = await import("../lib/coach-personality");
    const context = await buildReEngagementContext();
    expect(context).toBeNull();
  });

  it("should return null for re-engagement when last workout was recent", async () => {
    const { buildReEngagementContext } = await import("../lib/coach-personality");
    // Set last workout to yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    mockStore["@last_workout_date"] = yesterday.toISOString();

    const context = await buildReEngagementContext();
    expect(context).toBeNull();
  });

  it("should build re-engagement context after 3+ days of inactivity", async () => {
    const { buildReEngagementContext } = await import("../lib/coach-personality");
    // Set last workout to 4 days ago
    const fourDaysAgo = new Date();
    fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);
    mockStore["@last_workout_date"] = fourDaysAgo.toISOString();

    const context = await buildReEngagementContext();
    expect(context).not.toBeNull();
    expect(context!.trigger).toBe("re_engagement");
    expect(context!.personality).toBe("mentor");
    expect(context!.contextData.daysSinceLastWorkout).toBeGreaterThanOrEqual(3);
    expect(context!.systemPromptAdditions).toContain("almost a week");
  });

  it("should build re-engagement context with workout plan info", async () => {
    const { buildReEngagementContext } = await import("../lib/coach-personality");
    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
    mockStore["@last_workout_date"] = fiveDaysAgo.toISOString();
    mockStore["@workout_plan"] = JSON.stringify({ name: "PPL Split" });

    const context = await buildReEngagementContext();
    expect(context).not.toBeNull();
    expect(context!.contextData.hasWorkoutPlan).toBe(true);
    expect(context!.contextData.planName).toBe("PPL Split");
  });

  it("should build workout data pipeline with daily state", async () => {
    const { buildWorkoutDataPipeline } = await import("../lib/coach-personality");
    const pipeline = await buildWorkoutDataPipeline();

    expect(pipeline.daily).toBeDefined();
    const daily = pipeline.daily as any;
    expect(typeof daily.mealsLogged).toBe("number");
    expect(typeof daily.caloriesConsumed).toBe("number");
    expect(daily.workoutStatus).toBeDefined();
    expect(daily.timeOfDay).toBeDefined();
  });

  it("should include recent workouts in pipeline when available", async () => {
    const { buildWorkoutDataPipeline } = await import("../lib/coach-personality");
    mockStore["@workout_sessions"] = JSON.stringify([
      { date: "2026-05-01", duration: 45, exercises: [1, 2, 3], muscleGroups: ["chest"] },
      { date: "2026-04-30", duration: 50, exercises: [1, 2], muscleGroups: ["back"] },
    ]);

    const pipeline = await buildWorkoutDataPipeline();
    expect(pipeline.recentWorkouts).toBeDefined();
    expect(Array.isArray(pipeline.recentWorkouts)).toBe(true);
    expect((pipeline.recentWorkouts as any[]).length).toBe(2);
  });

  it("should check shouldShowReEngagement correctly", async () => {
    const { shouldShowReEngagement } = await import("../lib/coach-personality");
    // No last workout — should return false (no data)
    const result1 = await shouldShowReEngagement();
    expect(result1).toBe(false);

    // Recent workout — should return false
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    mockStore["@last_workout_date"] = yesterday.toISOString();
    const result2 = await shouldShowReEngagement();
    expect(result2).toBe(false);

    // Old workout — should return true
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    mockStore["@last_workout_date"] = weekAgo.toISOString();
    const result3 = await shouldShowReEngagement();
    expect(result3).toBe(true);
  });

  it("should respect daily nudge limit", async () => {
    const { shouldShowReEngagement, recordReEngagementNudge } = await import("../lib/coach-personality");
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    mockStore["@last_workout_date"] = weekAgo.toISOString();

    // First check — should show
    const result1 = await shouldShowReEngagement();
    expect(result1).toBe(true);

    // Record nudge
    await recordReEngagementNudge();

    // Second check — should not show (already nudged today)
    const result2 = await shouldShowReEngagement();
    expect(result2).toBe(false);
  });
});

// ─── Voice Coach Settings with ElevenLabs Fields ─────────────────────────────
describe("Voice Coach Settings (ElevenLabs fields)", () => {
  it("should include useElevenLabs and voiceId in defaults", async () => {
    const { DEFAULT_VOICE_COACH_SETTINGS } = await import("../lib/voice-coach-settings");
    expect(DEFAULT_VOICE_COACH_SETTINGS.useElevenLabs).toBe(false);
    expect(DEFAULT_VOICE_COACH_SETTINGS.voiceId).toBeNull();
  });

  it("should persist and load ElevenLabs settings", async () => {
    const { loadVoiceCoachSettings, saveVoiceCoachSettings } = await import("../lib/voice-coach-settings");
    await saveVoiceCoachSettings({
      mode: "full",
      autoPlayCues: true,
      voiceCountdown: true,
      announceTransitions: true,
      speechRate: 1.0,
      useElevenLabs: true,
      voiceId: "test-voice-id-123",
    });

    const loaded = await loadVoiceCoachSettings();
    expect(loaded.useElevenLabs).toBe(true);
    expect(loaded.voiceId).toBe("test-voice-id-123");
  });

  it("should merge defaults for old settings without ElevenLabs fields", async () => {
    const { loadVoiceCoachSettings } = await import("../lib/voice-coach-settings");
    // Simulate old settings without the new fields
    mockStore["@voice_coach_settings"] = JSON.stringify({
      mode: "cues_only",
      autoPlayCues: false,
      voiceCountdown: true,
      announceTransitions: true,
      speechRate: 1.2,
    });

    const loaded = await loadVoiceCoachSettings();
    expect(loaded.mode).toBe("cues_only");
    expect(loaded.speechRate).toBe(1.2);
    // New fields should have defaults
    expect(loaded.useElevenLabs).toBe(false);
    expect(loaded.voiceId).toBeNull();
  });
});

// ─── Voice Playback Module Exports ───────────────────────────────────────────
describe("Voice Playback Module", () => {
  it("should export all required functions", async () => {
    const mod = await import("../lib/voice-playback");
    expect(mod.playVoiceAudio).toBeDefined();
    expect(mod.stopVoiceAudio).toBeDefined();
    expect(mod.pauseVoiceAudio).toBeDefined();
    expect(mod.resumeVoiceAudio).toBeDefined();
    expect(mod.subscribeToVoicePlayback).toBeDefined();
    expect(typeof mod.playVoiceAudio).toBe("function");
    expect(typeof mod.stopVoiceAudio).toBe("function");
  });
});

// ─── ElevenLabs Server Service Exports ───────────────────────────────────────
describe("ElevenLabs Server Service", () => {
  it("should export all required functions", async () => {
    const mod = await import("../server/elevenlabs");
    expect(mod.synthesizeSpeech).toBeDefined();
    expect(mod.listVoices).toBeDefined();
    expect(mod.isElevenLabsAvailable).toBeDefined();
    expect(mod.COACHING_VOICES).toBeDefined();
    expect(mod.getCoachingVoice).toBeDefined();
    expect(mod.prepareTextForSpeech).toBeDefined();
    expect(mod.estimateAudioDuration).toBeDefined();
    expect(typeof mod.synthesizeSpeech).toBe("function");
    expect(typeof mod.isElevenLabsAvailable).toBe("function");
  });

  it("should report availability status based on env var", async () => {
    const { isElevenLabsAvailable } = await import("../server/elevenlabs");
    const result = isElevenLabsAvailable();
    expect(typeof result).toBe("boolean");
  });

  it("should have coaching voices list", async () => {
    const { COACHING_VOICES } = await import("../server/elevenlabs");
    expect(Array.isArray(COACHING_VOICES)).toBe(true);
    expect(COACHING_VOICES.length).toBeGreaterThan(0);
    COACHING_VOICES.forEach((v: any) => {
      expect(v.voiceId).toBeTruthy();
      expect(v.name).toBeTruthy();
      expect(v.description).toBeTruthy();
    });
  });

  it("should prepare text for speech by stripping markdown", async () => {
    const { prepareTextForSpeech } = await import("../server/elevenlabs");
    const result = prepareTextForSpeech("**Bold** and *italic* text");
    expect(result).not.toContain("**");
    expect(result).not.toContain("*");
  });

  it("should estimate audio duration from text length", async () => {
    const { estimateAudioDuration } = await import("../server/elevenlabs");
    const short = estimateAudioDuration("Hello");
    const long = estimateAudioDuration("This is a much longer sentence that should take more time to speak.");
    expect(short).toBeGreaterThan(0);
    expect(long).toBeGreaterThan(short);
  });

  it("should find coaching voice by ID", async () => {
    const { getCoachingVoice, COACHING_VOICES } = await import("../server/elevenlabs");
    const firstVoice = COACHING_VOICES[0];
    const found = getCoachingVoice(firstVoice.voiceId);
    expect(found).toBeDefined();
    expect(found?.name).toBe(firstVoice.name);

    const notFound = getCoachingVoice("nonexistent-id");
    expect(notFound).toBeUndefined();
  });
});
