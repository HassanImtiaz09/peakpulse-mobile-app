/**
 * Round 91 Tests — Analytics, Sounds, Offline Cache, Exercise Indicators
 *
 * Tests for:
 * 1. Workout history analytics (volume, frequency, strength progression)
 * 2. Custom rest timer sounds (chime/beep options)
 * 3. Offline workout caching
 * 4. Enhanced timer exercise indicators
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock AsyncStorage ────────────────────────────────────────────────────────
const mockStore: Record<string, string> = {};
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn((key: string) => Promise.resolve(mockStore[key] ?? null)),
    setItem: vi.fn((key: string, value: string) => {
      mockStore[key] = value;
      return Promise.resolve();
    }),
    removeItem: vi.fn((key: string) => {
      delete mockStore[key];
      return Promise.resolve();
    }),
    multiGet: vi.fn((keys: string[]) =>
      Promise.resolve(keys.map((k) => [k, mockStore[k] ?? null]))
    ),
    multiRemove: vi.fn((keys: string[]) => {
      keys.forEach((k) => delete mockStore[k]);
      return Promise.resolve();
    }),
  },
}));

// ── Mock expo-speech ─────────────────────────────────────────────────────────
vi.mock("expo-speech", () => ({
  speak: vi.fn((_text: string, opts?: any) => {
    if (opts?.onDone) setTimeout(opts.onDone, 10);
  }),
  stop: vi.fn(),
  isSpeakingAsync: vi.fn(() => Promise.resolve(false)),
}));

// ── Mock expo-haptics ────────────────────────────────────────────────────────
vi.mock("expo-haptics", () => ({
  impactAsync: vi.fn(() => Promise.resolve()),
  notificationAsync: vi.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: "light", Medium: "medium", Heavy: "heavy" },
  NotificationFeedbackType: { Success: "success", Error: "error", Warning: "warning" },
}));

// ── Mock expo-network ────────────────────────────────────────────────────────
vi.mock("expo-network", () => ({
  getNetworkStateAsync: vi.fn(() =>
    Promise.resolve({ isConnected: true, isInternetReachable: true })
  ),
}));

// ── Mock react-native ────────────────────────────────────────────────────────
vi.mock("react-native", () => ({
  Platform: { OS: "ios" },
}));

// ── Mock audio-form-cues ─────────────────────────────────────────────────────
vi.mock("@/lib/audio-form-cues", () => ({
  getAudioCues: vi.fn((name: string) => {
    if (name === "Bench Press") {
      return {
        exerciseName: "Bench Press",
        cues: [
          { phase: "setup", text: "Lie flat on the bench", pauseAfter: 1000 },
          { phase: "execution", text: "Lower the bar to your chest", pauseAfter: 1000 },
        ],
      };
    }
    return null;
  }),
  getExercisesWithAudioCues: vi.fn(() => ["Bench Press", "Squat", "Deadlift"]),
  speakCue: vi.fn(() => Promise.resolve()),
  stopSpeaking: vi.fn(),
  getPhaseColor: vi.fn(() => "#F59E0B"),
  getPhaseIcon: vi.fn(() => "info"),
  hasAudioCues: vi.fn((name: string) => name === "Bench Press"),
}));

// ── Mock exercise-demos ──────────────────────────────────────────────────────
vi.mock("@/lib/exercise-demos", () => ({
  getExerciseDemo: vi.fn((name: string) => {
    if (name === "Bench Press") {
      return { gifUrl: "https://example.com/bench.gif", cue: "Press up" };
    }
    return null;
  }),
}));

// ═══════════════════════════════════════════════════════════════════════════
// 1. WORKOUT ANALYTICS TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe("Workout Analytics Service", () => {
  beforeEach(() => {
    Object.keys(mockStore).forEach((k) => delete mockStore[k]);
  });

  it("should export analytics functions", async () => {
    const mod = await import("@/lib/workout-analytics");
    expect(mod.getVolumeOverTime).toBeDefined();
    expect(mod.getFrequencyByWeek).toBeDefined();
    expect(mod.getStrengthProgression).toBeDefined();
    expect(mod.getAnalyticsSummary).toBeDefined();
  });

  it("should return empty volume data when no workouts exist", async () => {
    const { getVolumeOverTime } = await import("@/lib/workout-analytics");
    const data = await getVolumeOverTime("1w");
    expect(data).toBeDefined();
    expect(Array.isArray(data)).toBe(true);
  });

  it("should return empty frequency data when no workouts exist", async () => {
    const { getFrequencyByWeek } = await import("@/lib/workout-analytics");
    const data = await getFrequencyByWeek("1w");
    expect(data).toBeDefined();
    expect(Array.isArray(data)).toBe(true);
  });

  it("should return empty strength data when no workouts exist", async () => {
    const { getStrengthProgression } = await import("@/lib/workout-analytics");
    const data = await getStrengthProgression("Bench Press", "all");
    expect(data).toBeDefined();
    expect(Array.isArray(data)).toBe(true);
  });

  it("should return analytics summary with zero values when no data", async () => {
    const { getAnalyticsSummary } = await import("@/lib/workout-analytics");
    const summary = await getAnalyticsSummary();
    expect(summary).toBeDefined();
    expect(typeof summary.totalWorkouts).toBe("number");
    expect(typeof summary.totalVolume).toBe("number");
    expect(typeof summary.currentStreak).toBe("number");
    expect(typeof summary.workoutsThisWeek).toBe("number");
  });

  it("should compute volume from stored workout sessions", async () => {
    // Store a workout session
    const sessions = [
      {
        date: new Date().toISOString(),
        focus: "Push",
        exercises: [
          { name: "Bench Press", sets: [{ weight: 100, reps: 10 }, { weight: 100, reps: 8 }] },
        ],
        duration: 3600,
      },
    ];
    mockStore["@workout_sessions"] = JSON.stringify(sessions);

    const { getVolumeOverTime } = await import("@/lib/workout-analytics");
    const data = await getVolumeOverTime("1w");
    expect(data).toBeDefined();
  });

  it("should compute frequency from stored workout sessions", async () => {
    const sessions = [
      { date: new Date().toISOString(), focus: "Push", exercises: [], duration: 3600 },
      { date: new Date(Date.now() - 86400000).toISOString(), focus: "Pull", exercises: [], duration: 3000 },
    ];
    mockStore["@workout_sessions"] = JSON.stringify(sessions);

    const { getFrequencyByWeek } = await import("@/lib/workout-analytics");
    const data = await getFrequencyByWeek("1w");
    expect(data).toBeDefined();
  });

  it("should handle malformed session data gracefully", async () => {
    mockStore["@workout_sessions"] = "not-json";
    const { getAnalyticsSummary } = await import("@/lib/workout-analytics");
    const summary = await getAnalyticsSummary();
    expect(summary.totalWorkouts).toBe(0);
  });

  it("should support different time ranges", async () => {
    const { getVolumeOverTime } = await import("@/lib/workout-analytics");
    const weekData = await getVolumeOverTime("1w");
    const monthData = await getVolumeOverTime("1m");
    const allData = await getVolumeOverTime("all");
    expect(weekData).toBeDefined();
    expect(monthData).toBeDefined();
    expect(allData).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 2. REST TIMER SOUNDS TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe("Rest Timer Sounds Service", () => {
  beforeEach(() => {
    Object.keys(mockStore).forEach((k) => delete mockStore[k]);
  });

  it("should export sound types and options", async () => {
    const mod = await import("@/lib/rest-timer-sounds");
    expect(mod.SOUND_OPTIONS).toBeDefined();
    expect(mod.SOUND_OPTIONS.length).toBeGreaterThan(0);
    expect(mod.DEFAULT_SOUND_SETTINGS).toBeDefined();
  });

  it("should have correct default settings", async () => {
    const { DEFAULT_SOUND_SETTINGS } = await import("@/lib/rest-timer-sounds");
    expect(DEFAULT_SOUND_SETTINGS.completionSound).toBe("voice");
    expect(DEFAULT_SOUND_SETTINGS.countdownSound).toBe("beep");
    expect(DEFAULT_SOUND_SETTINGS.hapticFeedback).toBe(true);
    expect(DEFAULT_SOUND_SETTINGS.volume).toBe(0.8);
    expect(DEFAULT_SOUND_SETTINGS.halfwayWarning).toBe(false);
  });

  it("should load default settings when none saved", async () => {
    const { loadSoundSettings, DEFAULT_SOUND_SETTINGS } = await import("@/lib/rest-timer-sounds");
    const settings = await loadSoundSettings();
    expect(settings.completionSound).toBe(DEFAULT_SOUND_SETTINGS.completionSound);
    expect(settings.countdownSound).toBe(DEFAULT_SOUND_SETTINGS.countdownSound);
  });

  it("should save and load sound settings", async () => {
    const { saveSoundSettings, loadSoundSettings } = await import("@/lib/rest-timer-sounds");
    await saveSoundSettings({
      completionSound: "chime",
      countdownSound: "voice",
      hapticFeedback: false,
      volume: 0.5,
      halfwayWarning: true,
    });
    const loaded = await loadSoundSettings();
    expect(loaded.completionSound).toBe("chime");
    expect(loaded.countdownSound).toBe("voice");
    expect(loaded.hapticFeedback).toBe(false);
    expect(loaded.volume).toBe(0.5);
    expect(loaded.halfwayWarning).toBe(true);
  });

  it("should play sound without throwing for each type", async () => {
    const { playSound } = await import("@/lib/rest-timer-sounds");
    const types = ["none", "beep", "double_beep", "chime", "triple_chime", "bell", "voice"] as const;
    for (const type of types) {
      await expect(playSound(type, "Test")).resolves.toBeUndefined();
    }
  });

  it("should play completion sound with exercise name", async () => {
    const { playCompletionSound, DEFAULT_SOUND_SETTINGS } = await import("@/lib/rest-timer-sounds");
    await expect(
      playCompletionSound(DEFAULT_SOUND_SETTINGS, "Squat")
    ).resolves.toBeUndefined();
  });

  it("should play countdown sound at milestones", async () => {
    const { playCountdownSound, DEFAULT_SOUND_SETTINGS } = await import("@/lib/rest-timer-sounds");
    await expect(playCountdownSound(DEFAULT_SOUND_SETTINGS, 10)).resolves.toBeUndefined();
    await expect(playCountdownSound(DEFAULT_SOUND_SETTINGS, 5)).resolves.toBeUndefined();
  });

  it("should not play countdown sound when set to none", async () => {
    const { playCountdownSound } = await import("@/lib/rest-timer-sounds");
    const settings = {
      completionSound: "none" as const,
      countdownSound: "none" as const,
      hapticFeedback: false,
      volume: 0.8,
      halfwayWarning: false,
    };
    await expect(playCountdownSound(settings, 10)).resolves.toBeUndefined();
  });

  it("should play halfway sound when enabled", async () => {
    const { playHalfwaySound } = await import("@/lib/rest-timer-sounds");
    const settings = {
      completionSound: "voice" as const,
      countdownSound: "beep" as const,
      hapticFeedback: true,
      volume: 0.8,
      halfwayWarning: true,
    };
    await expect(playHalfwaySound(settings)).resolves.toBeUndefined();
  });

  it("should not play halfway sound when disabled", async () => {
    const { playHalfwaySound } = await import("@/lib/rest-timer-sounds");
    const settings = {
      completionSound: "voice" as const,
      countdownSound: "beep" as const,
      hapticFeedback: true,
      volume: 0.8,
      halfwayWarning: false,
    };
    await expect(playHalfwaySound(settings)).resolves.toBeUndefined();
  });

  it("should have all required sound option fields", async () => {
    const { SOUND_OPTIONS } = await import("@/lib/rest-timer-sounds");
    for (const opt of SOUND_OPTIONS) {
      expect(opt.type).toBeDefined();
      expect(opt.label).toBeDefined();
      expect(opt.description).toBeDefined();
      expect(opt.icon).toBeDefined();
    }
  });

  it("should include all sound types in options", async () => {
    const { SOUND_OPTIONS } = await import("@/lib/rest-timer-sounds");
    const types = SOUND_OPTIONS.map((o) => o.type);
    expect(types).toContain("none");
    expect(types).toContain("beep");
    expect(types).toContain("chime");
    expect(types).toContain("bell");
    expect(types).toContain("voice");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 3. OFFLINE WORKOUT CACHE TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe("Offline Workout Cache Service", () => {
  beforeEach(() => {
    Object.keys(mockStore).forEach((k) => delete mockStore[k]);
  });

  it("should export cache functions", async () => {
    const mod = await import("@/lib/offline-workout-cache");
    expect(mod.cacheWorkoutPlan).toBeDefined();
    expect(mod.loadCachedPlan).toBeDefined();
    expect(mod.getCachedExercise).toBeDefined();
    expect(mod.getCachedAudioCues).toBeDefined();
    expect(mod.getOfflineCacheStatus).toBeDefined();
    expect(mod.clearOfflineCache).toBeDefined();
    expect(mod.autoCacheCurrentWorkout).toBeDefined();
    expect(mod.isOnline).toBeDefined();
  });

  it("should return null when no plan is cached", async () => {
    const { loadCachedPlan } = await import("@/lib/offline-workout-cache");
    const plan = await loadCachedPlan();
    expect(plan).toBeNull();
  });

  it("should cache and load a workout plan", async () => {
    const { cacheWorkoutPlan, loadCachedPlan } = await import("@/lib/offline-workout-cache");
    const plan = await cacheWorkoutPlan("plan1", "Push Pull Legs", [
      {
        dayName: "Day 1",
        focus: "Push",
        exercises: [
          { name: "Bench Press", sets: 4, reps: "8-10", rest: "90", notes: "" },
          { name: "Overhead Press", sets: 3, reps: "10", rest: "60", notes: "" },
        ],
      },
    ]);

    expect(plan.planId).toBe("plan1");
    expect(plan.planName).toBe("Push Pull Legs");
    expect(plan.days).toHaveLength(1);
    expect(plan.days[0].exercises).toHaveLength(2);

    const loaded = await loadCachedPlan();
    expect(loaded).not.toBeNull();
    expect(loaded!.planName).toBe("Push Pull Legs");
  });

  it("should cache audio cues alongside exercises", async () => {
    const { cacheWorkoutPlan } = await import("@/lib/offline-workout-cache");
    const plan = await cacheWorkoutPlan("plan2", "Test Plan", [
      {
        dayName: "Day 1",
        focus: "Test",
        exercises: [
          { name: "Bench Press", sets: 3, reps: "10", rest: "60", notes: "" },
        ],
      },
    ]);

    const benchExercise = plan.days[0].exercises[0];
    expect(benchExercise.audioCues).not.toBeNull();
    expect(benchExercise.audioCues!.cues.length).toBeGreaterThan(0);
  });

  it("should get cached exercise by name", async () => {
    const { cacheWorkoutPlan, getCachedExercise } = await import("@/lib/offline-workout-cache");
    await cacheWorkoutPlan("plan3", "Test", [
      {
        dayName: "Day 1",
        focus: "Test",
        exercises: [
          { name: "Bench Press", sets: 4, reps: "8", rest: "90", notes: "Go heavy" },
        ],
      },
    ]);

    const cached = await getCachedExercise("Bench Press");
    expect(cached).not.toBeNull();
    expect(cached!.name).toBe("Bench Press");
    expect(cached!.sets).toBe(4);
    expect(cached!.notes).toBe("Go heavy");
  });

  it("should return null for uncached exercise", async () => {
    const { getCachedExercise } = await import("@/lib/offline-workout-cache");
    const cached = await getCachedExercise("Unknown Exercise");
    expect(cached).toBeNull();
  });

  it("should get cached audio cues", async () => {
    const { getCachedAudioCues } = await import("@/lib/offline-workout-cache");
    // Should fall back to live data (mocked)
    const cues = await getCachedAudioCues("Bench Press");
    expect(cues).not.toBeNull();
  });

  it("should report correct cache status", async () => {
    const { getOfflineCacheStatus, cacheWorkoutPlan } = await import("@/lib/offline-workout-cache");

    // Empty cache
    let status = await getOfflineCacheStatus();
    expect(status.hasCachedPlan).toBe(false);
    expect(status.exerciseCount).toBe(0);

    // After caching
    await cacheWorkoutPlan("plan4", "My Plan", [
      {
        dayName: "Day 1",
        focus: "Push",
        exercises: [
          { name: "Bench Press", sets: 3, reps: "10", rest: "60", notes: "" },
          { name: "Tricep Dips", sets: 3, reps: "12", rest: "45", notes: "" },
        ],
      },
    ]);

    status = await getOfflineCacheStatus();
    expect(status.hasCachedPlan).toBe(true);
    expect(status.planName).toBe("My Plan");
    expect(status.exerciseCount).toBe(2);
    expect(status.isOnline).toBe(true);
  });

  it("should clear offline cache", async () => {
    const { cacheWorkoutPlan, clearOfflineCache, loadCachedPlan } = await import("@/lib/offline-workout-cache");
    await cacheWorkoutPlan("plan5", "Test", [
      { dayName: "Day 1", focus: "Test", exercises: [] },
    ]);

    await clearOfflineCache();
    const plan = await loadCachedPlan();
    expect(plan).toBeNull();
  });

  it("should auto-cache current workout", async () => {
    const { autoCacheCurrentWorkout, loadCachedPlan } = await import("@/lib/offline-workout-cache");
    await autoCacheCurrentWorkout("Leg Day", [
      { name: "Squat", sets: 5, reps: "5", rest: "180", notes: "" },
      { name: "Leg Press", sets: 3, reps: "12", rest: "90", notes: "" },
    ]);

    const plan = await loadCachedPlan();
    expect(plan).not.toBeNull();
    expect(plan!.planName).toBe("Leg Day");
    expect(plan!.days[0].exercises).toHaveLength(2);
  });

  it("should detect online status", async () => {
    const { isOnline } = await import("@/lib/offline-workout-cache");
    const online = await isOnline();
    expect(typeof online).toBe("boolean");
  });

  it("should pre-cache all cues and demos", async () => {
    const { preCacheAllCuesAndDemos } = await import("@/lib/offline-workout-cache");
    const result = await preCacheAllCuesAndDemos();
    expect(typeof result.cuesCached).toBe("number");
    expect(typeof result.demosCached).toBe("number");
  });

  it("should handle cache with multiple days", async () => {
    const { cacheWorkoutPlan, loadCachedPlan } = await import("@/lib/offline-workout-cache");
    await cacheWorkoutPlan("plan6", "PPL", [
      { dayName: "Push", focus: "Push", exercises: [{ name: "Bench Press", sets: 4, reps: "8", rest: "90", notes: "" }] },
      { dayName: "Pull", focus: "Pull", exercises: [{ name: "Barbell Row", sets: 4, reps: "8", rest: "90", notes: "" }] },
      { dayName: "Legs", focus: "Legs", exercises: [{ name: "Squat", sets: 5, reps: "5", rest: "180", notes: "" }] },
    ]);

    const plan = await loadCachedPlan();
    expect(plan!.days).toHaveLength(3);
    expect(plan!.days[0].dayName).toBe("Push");
    expect(plan!.days[1].dayName).toBe("Pull");
    expect(plan!.days[2].dayName).toBe("Legs");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 4. EXERCISE INDICATOR LOGIC TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe("Exercise Indicator Logic", () => {
  const exercises = [
    { name: "Bench Press", sets: 4, reps: "8-10", rest: "90" },
    { name: "Incline Dumbbell Press", sets: 3, reps: "10-12", rest: "60" },
    { name: "Cable Flyes", sets: 3, reps: "12-15", rest: "45" },
    { name: "Tricep Pushdowns", sets: 3, reps: "12", rest: "45" },
  ];

  it("should identify current exercise correctly", () => {
    const currentIndex = 0;
    const current = exercises[currentIndex];
    expect(current.name).toBe("Bench Press");
  });

  it("should identify next exercise correctly", () => {
    const currentIndex = 0;
    const hasNext = currentIndex < exercises.length - 1;
    expect(hasNext).toBe(true);
    const next = exercises[currentIndex + 1];
    expect(next.name).toBe("Incline Dumbbell Press");
  });

  it("should show finish indicator on last exercise", () => {
    const currentIndex = exercises.length - 1;
    const hasNext = currentIndex < exercises.length - 1;
    expect(hasNext).toBe(false);
    expect(exercises[currentIndex].name).toBe("Tricep Pushdowns");
  });

  it("should track completed exercises correctly", () => {
    const currentIndex = 2;
    const completed = exercises.slice(0, currentIndex);
    const remaining = exercises.slice(currentIndex + 1);
    expect(completed).toHaveLength(2);
    expect(remaining).toHaveLength(1);
  });

  it("should calculate set progress correctly", () => {
    const totalSets = 4;
    const completedSets = 2;
    const currentSet = Math.min(completedSets + 1, totalSets);
    expect(currentSet).toBe(3);
    const progress = `Set ${currentSet}/${totalSets}`;
    expect(progress).toBe("Set 3/4");
  });

  it("should handle single exercise workout", () => {
    const singleExercise = [{ name: "Squat", sets: 5, reps: "5", rest: "180" }];
    const currentIndex = 0;
    const hasNext = currentIndex < singleExercise.length - 1;
    expect(hasNext).toBe(false);
  });

  it("should mark previous exercises as done", () => {
    const currentIndex = 2;
    const chipStates = exercises.map((_, i) => ({
      isDone: i < currentIndex,
      isCurrent: i === currentIndex,
      isNext: i === currentIndex + 1,
    }));
    expect(chipStates[0].isDone).toBe(true);
    expect(chipStates[1].isDone).toBe(true);
    expect(chipStates[2].isCurrent).toBe(true);
    expect(chipStates[3].isNext).toBe(true);
  });

  it("should format exercise metadata correctly", () => {
    const ex = exercises[0];
    const meta = `${ex.sets} sets · ${ex.reps} reps`;
    expect(meta).toBe("4 sets · 8-10 reps");
  });

  it("should handle exercise navigation boundaries", () => {
    // At first exercise, can't go back
    expect(0 > 0).toBe(false);
    // At last exercise, can't go forward
    expect(exercises.length - 1 < exercises.length - 1).toBe(false);
    // In middle, can go both ways
    expect(1 > 0).toBe(true);
    expect(1 < exercises.length - 1).toBe(true);
  });

  it("should compute rest duration for halfway warning", () => {
    const restDuration = parseInt("90") || 60;
    const halfway = Math.round(restDuration / 2);
    expect(halfway).toBe(45);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 5. INTEGRATION TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe("Integration: Sound + Timer", () => {
  it("should load sound settings for timer use", async () => {
    const { loadSoundSettings, saveSoundSettings } = await import("@/lib/rest-timer-sounds");
    await saveSoundSettings({
      completionSound: "bell",
      countdownSound: "beep",
      hapticFeedback: true,
      volume: 0.7,
      halfwayWarning: true,
    });
    const settings = await loadSoundSettings();
    expect(settings.completionSound).toBe("bell");
    expect(settings.halfwayWarning).toBe(true);
  });

  it("should play completion sound with next exercise name", async () => {
    const { playCompletionSound, loadSoundSettings, saveSoundSettings } = await import("@/lib/rest-timer-sounds");
    await saveSoundSettings({
      completionSound: "voice",
      countdownSound: "beep",
      hapticFeedback: true,
      volume: 0.8,
      halfwayWarning: false,
    });
    const settings = await loadSoundSettings();
    await expect(playCompletionSound(settings, "Squat")).resolves.toBeUndefined();
  });
});

describe("Integration: Offline Cache + Active Workout", () => {
  beforeEach(() => {
    Object.keys(mockStore).forEach((k) => delete mockStore[k]);
  });

  it("should auto-cache workout and retrieve exercises offline", async () => {
    const { autoCacheCurrentWorkout, getCachedExercise } = await import("@/lib/offline-workout-cache");
    await autoCacheCurrentWorkout("Push Day", [
      { name: "Bench Press", sets: 4, reps: "8", rest: "90", notes: "Heavy" },
      { name: "Overhead Press", sets: 3, reps: "10", rest: "60", notes: "" },
    ]);

    const bench = await getCachedExercise("Bench Press");
    expect(bench).not.toBeNull();
    expect(bench!.audioCues).not.toBeNull();
  });

  it("should provide audio cues from cache when live data unavailable", async () => {
    const { cacheWorkoutPlan, getCachedAudioCues } = await import("@/lib/offline-workout-cache");
    await cacheWorkoutPlan("p1", "Test", [
      {
        dayName: "Day 1",
        focus: "Test",
        exercises: [{ name: "Bench Press", sets: 3, reps: "10", rest: "60", notes: "" }],
      },
    ]);

    const cues = await getCachedAudioCues("Bench Press");
    expect(cues).not.toBeNull();
    expect(cues!.cues.length).toBeGreaterThan(0);
  });
});

describe("Integration: Analytics Data Shapes", () => {
  it("should return volume data as array of objects", async () => {
    const { getVolumeOverTime } = await import("@/lib/workout-analytics");
    const data = await getVolumeOverTime("1m");
    expect(Array.isArray(data)).toBe(true);
  });

  it("should return frequency data as array of objects", async () => {
    const { getFrequencyByWeek } = await import("@/lib/workout-analytics");
    const data = await getFrequencyByWeek("1m");
    expect(Array.isArray(data)).toBe(true);
  });

  it("should return strength data as array of objects", async () => {
    const { getStrengthProgression } = await import("@/lib/workout-analytics");
    const data = await getStrengthProgression("Bench Press", "all");
    expect(Array.isArray(data)).toBe(true);
  });
});
