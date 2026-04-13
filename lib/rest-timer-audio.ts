/**
 * Rest Timer Audio Cue
 *
 * Plays a short bell chime when the rest timer completes.
 * Uses expo-audio's createAudioPlayer for imperative playback
 * outside of React component lifecycle.
 *
 * Features:
 * - Preloads the chime on first call for instant playback
 * - Plays in iOS silent mode (setAudioModeAsync)
 * - Gracefully degrades on web or if audio fails
 * - User-configurable enable/disable via AsyncStorage
 */

import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "@rest_timer_sound_enabled";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const chimeSource = require("@/assets/audio/rest-timer-chime.mp3");

let player: ReturnType<typeof import("expo-audio").createAudioPlayer> | null = null;
let audioModeSet = false;

/**
 * Ensure the global audio mode allows playback in iOS silent mode.
 * Called once before the first playback.
 */
async function ensureAudioMode(): Promise<void> {
  if (audioModeSet) return;
  try {
    const { setAudioModeAsync } = await import("expo-audio");
    await setAudioModeAsync({ playsInSilentMode: true });
    audioModeSet = true;
  } catch {
    // expo-audio may not be available on web
  }
}

/**
 * Get or create the audio player instance (singleton).
 * The player is created lazily on first use and reused thereafter.
 */
async function getPlayer() {
  if (player) return player;
  try {
    const { createAudioPlayer } = await import("expo-audio");
    player = createAudioPlayer(chimeSource);
    return player;
  } catch {
    return null;
  }
}

/**
 * Play the rest timer completion chime.
 * Safe to call from any context — silently no-ops on failure.
 */
export async function playRestTimerChime(): Promise<void> {
  if (Platform.OS === "web") return; // skip on web
  try {
    await ensureAudioMode();
    const p = await getPlayer();
    if (!p) return;
    // Reset to start in case it was played before
    p.seekTo(0);
    p.play();
  } catch {
    // Silently ignore — haptics will still fire as fallback
  }
}

/**
 * Release the audio player to free resources.
 * Call when the workout screen unmounts.
 */
export function releaseRestTimerAudio(): void {
  if (player) {
    try {
      player.remove();
    } catch {
      // ignore
    }
    player = null;
    audioModeSet = false;
  }
}

// ─── User preference: sound enabled/disabled ────────────────────────────────

/**
 * Check if the rest timer sound is enabled (default: true).
 */
export async function isRestTimerSoundEnabled(): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(STORAGE_KEY);
    if (val === null) return true; // enabled by default
    return val === "true";
  } catch {
    return true;
  }
}

/**
 * Set the rest timer sound enabled/disabled preference.
 */
export async function setRestTimerSoundEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, enabled ? "true" : "false");
}
