/**
 * Rest Timer Sounds Service
 *
 * Provides audio chime/beep options for rest timer completion alongside voice coaching.
 * Uses expo-speech for generated tones and voice announcements.
 * Persists sound preferences to AsyncStorage.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Speech from "expo-speech";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

// ── Types ────────────────────────────────────────────────────────────────────

export type SoundType = "none" | "beep" | "chime" | "bell" | "voice" | "double_beep" | "triple_chime";

export interface RestTimerSoundSettings {
  /** Sound to play when rest timer completes */
  completionSound: SoundType;
  /** Sound to play at countdown milestones (10s, 5s) */
  countdownSound: SoundType;
  /** Whether to play haptic feedback alongside sounds */
  hapticFeedback: boolean;
  /** Volume level 0-1 (controls speech rate as proxy) */
  volume: number;
  /** Whether to play a warning sound at halfway point */
  halfwayWarning: boolean;
}

export interface SoundOption {
  type: SoundType;
  label: string;
  description: string;
  icon: string;
}

// ── Constants ───────────────────────────────────────────────────────────────

const STORAGE_KEY = "@rest_timer_sound_settings";

export const SOUND_OPTIONS: SoundOption[] = [
  { type: "none", label: "Silent", description: "No sound", icon: "volume-off" },
  { type: "beep", label: "Beep", description: "Short beep tone", icon: "volume-up" },
  { type: "double_beep", label: "Double Beep", description: "Two quick beeps", icon: "volume-up" },
  { type: "chime", label: "Chime", description: "Gentle chime tone", icon: "music-note" },
  { type: "triple_chime", label: "Triple Chime", description: "Three ascending chimes", icon: "music-note" },
  { type: "bell", label: "Bell", description: "Ring bell sound", icon: "notifications" },
  { type: "voice", label: "Voice", description: "Spoken announcement", icon: "record-voice-over" },
];

export const DEFAULT_SOUND_SETTINGS: RestTimerSoundSettings = {
  completionSound: "voice",
  countdownSound: "beep",
  hapticFeedback: true,
  volume: 0.8,
  halfwayWarning: false,
};

// ── Storage ─────────────────────────────────────────────────────────────────

export async function loadSoundSettings(): Promise<RestTimerSoundSettings> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_SOUND_SETTINGS, ...parsed };
    }
  } catch {}
  return { ...DEFAULT_SOUND_SETTINGS };
}

export async function saveSoundSettings(settings: RestTimerSoundSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {}
}

// ── Sound Playback ──────────────────────────────────────────────────────────

/**
 * Play a sound effect using Speech synthesis (since we can't bundle audio files easily).
 * Different "sounds" are simulated with different speech patterns.
 */
export async function playSound(type: SoundType, message?: string): Promise<void> {
  if (type === "none") return;

  // Haptic feedback
  if (Platform.OS !== "web") {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
  }

  switch (type) {
    case "beep":
      await speakTone("beep", 1.8);
      break;
    case "double_beep":
      await speakTone("beep", 1.8);
      await delay(200);
      await speakTone("beep", 2.0);
      break;
    case "chime":
      await speakTone("ding", 1.2);
      break;
    case "triple_chime":
      await speakTone("ding", 1.0);
      await delay(300);
      await speakTone("ding", 1.2);
      await delay(300);
      await speakTone("ding", 1.5);
      break;
    case "bell":
      await speakTone("dong", 0.8);
      break;
    case "voice":
      await speakMessage(message || "Time's up! Let's go!");
      break;
  }
}

/**
 * Play the rest timer completion sound.
 */
export async function playCompletionSound(settings: RestTimerSoundSettings, exerciseName?: string): Promise<void> {
  if (settings.hapticFeedback && Platform.OS !== "web") {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
  }

  const message = exerciseName
    ? `Rest complete! Time for ${exerciseName}.`
    : "Rest complete! Let's go!";

  await playSound(settings.completionSound, message);
}

/**
 * Play the countdown milestone sound.
 */
export async function playCountdownSound(settings: RestTimerSoundSettings, secondsLeft: number): Promise<void> {
  if (settings.countdownSound === "none") return;

  if (settings.hapticFeedback && Platform.OS !== "web") {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
  }

  if (settings.countdownSound === "voice") {
    await speakMessage(`${secondsLeft}`);
  } else {
    await speakTone("tick", 2.0);
  }
}

/**
 * Play the halfway warning sound.
 */
export async function playHalfwaySound(settings: RestTimerSoundSettings): Promise<void> {
  if (!settings.halfwayWarning) return;

  if (settings.hapticFeedback && Platform.OS !== "web") {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
  }

  if (settings.completionSound === "voice") {
    await speakMessage("Halfway there");
  } else {
    await speakTone("tick", 1.5);
  }
}

// ── Internal Helpers ────────────────────────────────────────────────────────

function speakTone(word: string, rate: number): Promise<void> {
  return new Promise((resolve) => {
    try {
      Speech.speak(word, {
        language: "en-US",
        rate,
        pitch: 1.2,
        onDone: resolve,
        onError: () => resolve(),
        onStopped: () => resolve(),
      });
    } catch {
      resolve();
    }
  });
}

function speakMessage(text: string): Promise<void> {
  return new Promise((resolve) => {
    try {
      Speech.speak(text, {
        language: "en-US",
        rate: 1.0,
        pitch: 1.0,
        onDone: resolve,
        onError: () => resolve(),
        onStopped: () => resolve(),
      });
    } catch {
      resolve();
    }
  });
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
