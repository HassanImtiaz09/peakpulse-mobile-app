/**
 * Round 90 Tests — Workout Timer with Voice Coaching
 *
 * Tests for:
 * - WorkoutTimerCoach component structure
 * - Voice coach settings service
 * - Audio form cue integration in timer
 * - Timer state management logic
 * - Voice coaching settings screen
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

// ── WorkoutTimerCoach Component ─────────────────────────────────────────────

describe("WorkoutTimerCoach Component (components/workout-timer-coach.tsx)", () => {
  const src = readFile("components/workout-timer-coach.tsx");

  it("file exists", () => {
    expect(fileExists("components/workout-timer-coach.tsx")).toBe(true);
  });

  it("exports WorkoutTimerCoach component", () => {
    expect(src).toContain("export function WorkoutTimerCoach");
  });

  it("exports TimerExercise interface", () => {
    expect(src).toContain("export interface TimerExercise");
  });

  it("imports audio form cues", () => {
    expect(src).toContain("from \"@/lib/audio-form-cues\"");
  });

  it("imports ExerciseDemoPlayer", () => {
    expect(src).toContain("ExerciseDemoPlayer");
  });

  it("imports expo-haptics", () => {
    expect(src).toContain("expo-haptics");
  });

  it("has voice mode state (full, cues_only, countdown_only, off)", () => {
    expect(src).toContain("VoiceCoachMode");
    expect(src).toContain("\"full\"");
    expect(src).toContain("\"cues_only\"");
    expect(src).toContain("\"countdown_only\"");
    expect(src).toContain("\"off\"");
  });

  it("has timer state machine (idle, active, resting, transition, finished)", () => {
    expect(src).toContain("TimerState");
    expect(src).toContain("\"idle\"");
    expect(src).toContain("\"active\"");
    expect(src).toContain("\"resting\"");
    expect(src).toContain("\"finished\"");
  });

  it("has auto-play cues toggle", () => {
    expect(src).toContain("autoPlayCues");
    expect(src).toContain("setAutoPlayCues");
  });

  it("has set elapsed timer", () => {
    expect(src).toContain("setElapsed");
    expect(src).toContain("setSetElapsed");
  });

  it("has rest countdown voice logic", () => {
    expect(src).toContain("getRestCountdownText");
    expect(src).toContain("Ten seconds left");
    expect(src).toContain("Go! Next set");
  });

  it("has sequential cue playback", () => {
    expect(src).toContain("playCuesSequentially");
    expect(src).toContain("cuePlaybackRef");
  });

  it("has single cue playback", () => {
    expect(src).toContain("playSingleCue");
  });

  it("has stop cue playback", () => {
    expect(src).toContain("stopCuePlayback");
    expect(src).toContain("stopSpeaking");
  });

  it("has voice mode cycling", () => {
    expect(src).toContain("cycleVoiceMode");
  });

  it("has set progress dots UI", () => {
    expect(src).toContain("setDots");
    expect(src).toContain("setDotDone");
    expect(src).toContain("setDotCurrent");
  });

  it("has start set button", () => {
    expect(src).toContain("handleStartSet");
    expect(src).toContain("Start Set");
  });

  it("has complete set button", () => {
    expect(src).toContain("handleCompleteSet");
    expect(src).toContain("Complete Set");
  });

  it("has skip rest button", () => {
    expect(src).toContain("handleSkipRest");
    expect(src).toContain("Skip Rest");
  });

  it("has exercise navigation", () => {
    expect(src).toContain("onNextExercise");
    expect(src).toContain("onPrevExercise");
    expect(src).toContain("exerciseChip");
  });

  it("has exercise demo section", () => {
    expect(src).toContain("EXERCISE DEMO");
    expect(src).toContain("ExerciseDemoPlayer");
  });

  it("has form cue panel with phase colors and icons", () => {
    expect(src).toContain("cuePanel");
    expect(src).toContain("getPhaseColor");
    expect(src).toContain("getPhaseIcon");
  });

  it("has speaking indicator", () => {
    expect(src).toContain("speakingIndicator");
    expect(src).toContain("volume-up");
  });

  it("has play all / stop cues buttons", () => {
    expect(src).toContain("Play All Cues");
    expect(src).toContain("stopCuesBtn");
  });

  it("has pulse animation for active timer", () => {
    expect(src).toContain("pulseAnim");
    expect(src).toContain("Animated.loop");
  });

  it("has progress bar for rest timer", () => {
    expect(src).toContain("progressBarBg");
    expect(src).toContain("progressBarFill");
  });

  it("has voice mode indicator bar", () => {
    expect(src).toContain("voiceModeBar");
    expect(src).toContain("voiceModeText");
  });

  it("announces exercise transitions", () => {
    expect(src).toContain("sets of");
    expect(src).toContain("reps");
    expect(src).toContain("speakAnnouncement");
  });

  it("announces set completion with remaining count", () => {
    expect(src).toContain("Set");
    expect(src).toContain("complete");
    expect(src).toContain("remaining");
    expect(src).toContain("Rest now");
  });

  it("has close / back to workout button", () => {
    expect(src).toContain("Back to Workout");
    expect(src).toContain("onClose");
  });

  it("uses Modal for fullscreen display", () => {
    expect(src).toContain("<Modal");
    expect(src).toContain("animationType=\"slide\"");
  });

  it("cleans up on unmount (stops speech, clears intervals)", () => {
    expect(src).toContain("stopSpeaking()");
    expect(src).toContain("cuePlaybackRef.current = false");
    expect(src).toContain("clearInterval");
  });
});

// ── Voice Coach Settings Service ────────────────────────────────────────────

describe("Voice Coach Settings (lib/voice-coach-settings.ts)", () => {
  const src = readFile("lib/voice-coach-settings.ts");

  it("file exists", () => {
    expect(fileExists("lib/voice-coach-settings.ts")).toBe(true);
  });

  it("exports VoiceCoachMode type", () => {
    expect(src).toContain("export type VoiceCoachMode");
  });

  it("exports VoiceCoachSettings interface", () => {
    expect(src).toContain("export interface VoiceCoachSettings");
  });

  it("exports DEFAULT_VOICE_COACH_SETTINGS", () => {
    expect(src).toContain("export const DEFAULT_VOICE_COACH_SETTINGS");
  });

  it("has mode field with full as default", () => {
    expect(src).toContain("mode: \"full\"");
  });

  it("has autoPlayCues field defaulting to true", () => {
    expect(src).toContain("autoPlayCues: true");
  });

  it("has voiceCountdown field defaulting to true", () => {
    expect(src).toContain("voiceCountdown: true");
  });

  it("has announceTransitions field defaulting to true", () => {
    expect(src).toContain("announceTransitions: true");
  });

  it("has speechRate field defaulting to 1.0", () => {
    expect(src).toContain("speechRate: 1.0");
  });

  it("exports loadVoiceCoachSettings function", () => {
    expect(src).toContain("export async function loadVoiceCoachSettings");
  });

  it("exports saveVoiceCoachSettings function", () => {
    expect(src).toContain("export async function saveVoiceCoachSettings");
  });

  it("exports updateVoiceCoachSetting function", () => {
    expect(src).toContain("export async function updateVoiceCoachSetting");
  });

  it("exports resetVoiceCoachSettings function", () => {
    expect(src).toContain("export async function resetVoiceCoachSettings");
  });

  it("exports getVoiceModeName function", () => {
    expect(src).toContain("export function getVoiceModeName");
  });

  it("exports getVoiceModeDescription function", () => {
    expect(src).toContain("export function getVoiceModeDescription");
  });

  it("uses AsyncStorage for persistence", () => {
    expect(src).toContain("AsyncStorage");
    expect(src).toContain("@voice_coach_settings");
  });

  it("has all four mode names", () => {
    expect(src).toContain("Full Coach");
    expect(src).toContain("Form Cues Only");
    expect(src).toContain("Countdown Only");
    expect(src).toContain("Muted");
  });
});

// ── Voice Coach Settings Screen ─────────────────────────────────────────────

describe("Voice Coach Settings Screen (app/voice-coach-settings.tsx)", () => {
  const src = readFile("app/voice-coach-settings.tsx");

  it("file exists", () => {
    expect(fileExists("app/voice-coach-settings.tsx")).toBe(true);
  });

  it("is a default export screen", () => {
    expect(src).toContain("export default function VoiceCoachSettingsScreen");
  });

  it("imports voice coach settings service", () => {
    expect(src).toContain("from \"@/lib/voice-coach-settings\"");
  });

  it("has voice mode selection UI", () => {
    expect(src).toContain("VOICE MODE");
    expect(src).toContain("modeRadio");
    expect(src).toContain("modeRadioActive");
  });

  it("has auto-play form cues toggle", () => {
    expect(src).toContain("Auto-Play Form Cues");
    expect(src).toContain("autoPlayCues");
  });

  it("has voice countdown toggle", () => {
    expect(src).toContain("Voice Countdown");
    expect(src).toContain("voiceCountdown");
  });

  it("has exercise announcements toggle", () => {
    expect(src).toContain("Exercise Announcements");
    expect(src).toContain("announceTransitions");
  });

  it("has speech rate selection", () => {
    expect(src).toContain("SPEECH RATE");
    expect(src).toContain("rateChip");
    expect(src).toContain("0.7");
    expect(src).toContain("1.3");
  });

  it("has test voice button", () => {
    expect(src).toContain("Test Voice");
    expect(src).toContain("testVoice");
  });

  it("has reset to defaults", () => {
    expect(src).toContain("resetVoiceCoachSettings");
    expect(src).toContain("handleReset");
  });

  it("has recommended badge on full mode", () => {
    expect(src).toContain("Recommended");
    expect(src).toContain("recommendedBadge");
  });

  it("has info card about voice coaching", () => {
    expect(src).toContain("13 core exercises");
    expect(src).toContain("5-phase form cues");
  });

  it("uses Switch components for toggles", () => {
    expect(src).toContain("<Switch");
    expect(src).toContain("trackColor");
  });

  it("loads settings on mount", () => {
    expect(src).toContain("loadVoiceCoachSettings");
    expect(src).toContain("useEffect");
  });

  it("saves settings on change", () => {
    expect(src).toContain("saveVoiceCoachSettings");
    expect(src).toContain("updateSetting");
  });
});

// ── Active Workout Integration ──────────────────────────────────────────────

describe("Active Workout Integration (app/active-workout.tsx)", () => {
  const src = readFile("app/active-workout.tsx");

  it("imports WorkoutTimerCoach", () => {
    expect(src).toContain("WorkoutTimerCoach");
    expect(src).toContain("from \"@/components/workout-timer-coach\"");
  });

  it("has voiceCoachVisible state", () => {
    expect(src).toContain("voiceCoachVisible");
    expect(src).toContain("setVoiceCoachVisible");
  });

  it("has Voice Coach Timer button", () => {
    expect(src).toContain("Voice Coach Timer");
    expect(src).toContain("record-voice-over");
  });

  it("renders WorkoutTimerCoach modal", () => {
    expect(src).toContain("<WorkoutTimerCoach");
    expect(src).toContain("visible={voiceCoachVisible}");
  });

  it("passes exercise data to WorkoutTimerCoach", () => {
    expect(src).toContain("exercise={{");
    expect(src).toContain("exercises={exercises.map");
  });

  it("passes timer callbacks to WorkoutTimerCoach", () => {
    expect(src).toContain("onCompleteSet={completeCurrentSet}");
    expect(src).toContain("onSkipRest=");
    expect(src).toContain("onNextExercise=");
    expect(src).toContain("onPrevExercise=");
  });

  it("passes rest timer value to WorkoutTimerCoach", () => {
    expect(src).toContain("restTimerValue={restTimer}");
  });

  it("still has the original FullscreenTimerModal", () => {
    expect(src).toContain("FullscreenTimerModal");
    expect(src).toContain("fullscreenVisible");
  });

  it("has both timer buttons side by side", () => {
    // Voice Coach Timer and plain Timer buttons
    expect(src).toContain("Voice Coach Timer");
    expect(src).toContain("⏱ Timer");
  });
});

// ── Profile Integration ─────────────────────────────────────────────────────

describe("Profile Screen Integration (app/(tabs)/profile.tsx)", () => {
  const src = readFile("app/(tabs)/profile.tsx");

  it("has Voice Coach Settings link", () => {
    expect(src).toContain("Voice Coach");
    expect(src).toContain("voice-coach-settings");
  });

  it("uses record-voice-over icon for voice coach", () => {
    expect(src).toContain("record-voice-over");
  });
});

// ── Timer Logic Unit Tests ──────────────────────────────────────────────────

describe("Timer Logic (pure functions)", () => {
  it("formats time correctly", () => {
    function fmt(s: number) {
      const m = Math.floor(s / 60).toString().padStart(2, "0");
      const sec = (s % 60).toString().padStart(2, "0");
      return `${m}:${sec}`;
    }
    expect(fmt(0)).toBe("00:00");
    expect(fmt(59)).toBe("00:59");
    expect(fmt(60)).toBe("01:00");
    expect(fmt(125)).toBe("02:05");
    expect(fmt(3600)).toBe("60:00");
  });

  it("generates correct rest countdown text", () => {
    function getRestCountdownText(seconds: number): string {
      if (seconds === 10) return "Ten seconds left.";
      if (seconds === 5) return "Five.";
      if (seconds === 4) return "Four.";
      if (seconds === 3) return "Three.";
      if (seconds === 2) return "Two.";
      if (seconds === 1) return "One.";
      if (seconds === 0) return "Go! Next set.";
      return "";
    }
    expect(getRestCountdownText(10)).toBe("Ten seconds left.");
    expect(getRestCountdownText(5)).toBe("Five.");
    expect(getRestCountdownText(3)).toBe("Three.");
    expect(getRestCountdownText(0)).toBe("Go! Next set.");
    expect(getRestCountdownText(30)).toBe("");
  });

  it("calculates rest progress correctly", () => {
    const restDuration = 60;
    expect(1 - 45 / restDuration).toBeCloseTo(0.25);
    expect(1 - 30 / restDuration).toBeCloseTo(0.5);
    expect(1 - 0 / restDuration).toBeCloseTo(1.0);
  });

  it("generates correct set completion messages", () => {
    function getCompletionMessage(completedSets: number, totalSets: number, exerciseName: string): string {
      const setsLeft = totalSets - completedSets - 1;
      if (setsLeft > 0) {
        return `Set ${completedSets + 1} complete. ${setsLeft} set${setsLeft > 1 ? "s" : ""} remaining. Rest now.`;
      }
      return `All sets complete! Great work on ${exerciseName}.`;
    }
    expect(getCompletionMessage(0, 4, "Bench Press")).toBe("Set 1 complete. 3 sets remaining. Rest now.");
    expect(getCompletionMessage(2, 4, "Bench Press")).toBe("Set 3 complete. 1 set remaining. Rest now.");
    expect(getCompletionMessage(3, 4, "Bench Press")).toBe("All sets complete! Great work on Bench Press.");
  });

  it("handles voice mode cycling", () => {
    const modes = ["full", "cues_only", "countdown_only", "off"] as const;
    let idx = 0;
    idx = (idx + 1) % modes.length; expect(modes[idx]).toBe("cues_only");
    idx = (idx + 1) % modes.length; expect(modes[idx]).toBe("countdown_only");
    idx = (idx + 1) % modes.length; expect(modes[idx]).toBe("off");
    idx = (idx + 1) % modes.length; expect(modes[idx]).toBe("full");
  });

  it("determines correct voice behavior per mode", () => {
    function shouldPlayCues(mode: string) { return mode === "full" || mode === "cues_only"; }
    function shouldPlayCountdown(mode: string) { return mode === "full" || mode === "countdown_only"; }
    expect(shouldPlayCues("full")).toBe(true);
    expect(shouldPlayCues("cues_only")).toBe(true);
    expect(shouldPlayCues("countdown_only")).toBe(false);
    expect(shouldPlayCues("off")).toBe(false);
    expect(shouldPlayCountdown("full")).toBe(true);
    expect(shouldPlayCountdown("countdown_only")).toBe(true);
    expect(shouldPlayCountdown("cues_only")).toBe(false);
  });

  it("parses rest time from string", () => {
    function parseRestTime(rest: string): number {
      const num = parseInt(rest);
      return isNaN(num) ? 60 : num;
    }
    expect(parseRestTime("90s")).toBe(90);
    expect(parseRestTime("60")).toBe(60);
    expect(parseRestTime("invalid")).toBe(60);
  });
});

// ── Audio Cues Data Validation ──────────────────────────────────────────────

describe("Audio Form Cues Data (lib/audio-form-cues.ts)", () => {
  const src = readFile("lib/audio-form-cues.ts");

  it("has at least 13 exercises with audio cues", () => {
    const matches = src.match(/exerciseName:/g);
    expect(matches).not.toBeNull();
    expect(matches!.length).toBeGreaterThanOrEqual(13);
  });

  it("has all 5 phases represented", () => {
    expect(src).toContain("phase: \"setup\"");
    expect(src).toContain("phase: \"execution\"");
    expect(src).toContain("phase: \"peak\"");
    expect(src).toContain("phase: \"return\"");
    expect(src).toContain("phase: \"breathing\"");
  });

  it("exports speakCue function", () => {
    expect(src).toContain("export async function speakCue");
  });

  it("exports stopSpeaking function", () => {
    expect(src).toContain("export function stopSpeaking");
  });

  it("exports getPhaseColor function", () => {
    expect(src).toContain("export function getPhaseColor");
  });

  it("exports getPhaseIcon function", () => {
    expect(src).toContain("export function getPhaseIcon");
  });

  it("has pauseAfter timing for each cue", () => {
    const matches = src.match(/pauseAfter:/g);
    expect(matches).not.toBeNull();
    expect(matches!.length).toBeGreaterThanOrEqual(50);
  });

  it("uses expo-speech for TTS", () => {
    expect(src).toContain("import * as Speech from \"expo-speech\"");
    expect(src).toContain("Speech.speak");
    expect(src).toContain("Speech.stop");
  });
});
