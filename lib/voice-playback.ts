/**
 * Voice Playback — Client-side audio player for ElevenLabs TTS responses.
 *
 * Uses expo-audio createAudioPlayer for URL-based playback of synthesized
 * coaching audio. Manages a singleton player instance to avoid resource leaks.
 *
 * Features:
 * - Play/pause/stop TTS audio from URL
 * - Singleton player management (one voice at a time)
 * - Playback state tracking
 * - Auto-cleanup on unmount
 * - Graceful fallback to expo-speech for offline/unavailable scenarios
 */

import { createAudioPlayer, setAudioModeAsync } from "expo-audio";
import type { AudioPlayer } from "expo-audio";
import * as Speech from "expo-speech";
import { Platform } from "react-native";

// ── Types ──────────────────────────────────────────────────────────────────────

export type VoicePlaybackState = "idle" | "loading" | "playing" | "paused" | "error";

export interface VoicePlaybackStatus {
  state: VoicePlaybackState;
  /** Current audio URL being played (null if idle) */
  currentUrl: string | null;
  /** Error message if state is "error" */
  error: string | null;
  /** Whether using fallback TTS (expo-speech) instead of ElevenLabs */
  isFallback: boolean;
}

export type VoicePlaybackListener = (status: VoicePlaybackStatus) => void;

// ── Singleton Player Manager ───────────────────────────────────────────────────

let _player: AudioPlayer | null = null;
let _currentUrl: string | null = null;
let _state: VoicePlaybackState = "idle";
let _error: string | null = null;
let _isFallback = false;
let _audioModeSet = false;
const _listeners = new Set<VoicePlaybackListener>();

function getStatus(): VoicePlaybackStatus {
  return {
    state: _state,
    currentUrl: _currentUrl,
    error: _error,
    isFallback: _isFallback,
  };
}

function emit(): void {
  const status = getStatus();
  for (const listener of _listeners) {
    try {
      listener(status);
    } catch {
      // Ignore listener errors
    }
  }
}

function setState(state: VoicePlaybackState, error?: string): void {
  _state = state;
  _error = error ?? null;
  emit();
}

async function ensureAudioMode(): Promise<void> {
  if (_audioModeSet) return;
  try {
    await setAudioModeAsync({ playsInSilentMode: true });
    _audioModeSet = true;
  } catch {
    // Silently fail — audio mode may not be available on web
  }
}

function cleanupPlayer(): void {
  if (_player) {
    try {
      _player.remove();
    } catch {
      // Ignore cleanup errors
    }
    _player = null;
  }
  _currentUrl = null;
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Play TTS audio from a URL (returned by voice.synthesize tRPC route).
 *
 * If another audio is already playing, it will be stopped first.
 * On failure, falls back to expo-speech with the original text.
 */
export async function playVoiceAudio(
  audioUrl: string,
  fallbackText?: string,
): Promise<void> {
  // Stop any current playback
  stopVoiceAudio();

  await ensureAudioMode();
  setState("loading");
  _currentUrl = audioUrl;
  _isFallback = false;

  try {
    _player = createAudioPlayer(audioUrl);

    // Listen for playback completion
    _player.addListener("playbackStatusUpdate", (status: any) => {
      if (status.didJustFinish) {
        setState("idle");
        cleanupPlayer();
      }
    });

    _player.play();
    setState("playing");
  } catch (err: any) {
    console.warn("[VoicePlayback] Audio playback failed, trying fallback:", err.message);
    cleanupPlayer();

    // Fallback to expo-speech
    if (fallbackText && Platform.OS !== "web") {
      _isFallback = true;
      setState("playing");
      Speech.speak(fallbackText, {
        rate: 1.0,
        onDone: () => {
          setState("idle");
          _isFallback = false;
        },
        onError: () => {
          setState("error", "Both ElevenLabs and device TTS failed");
          _isFallback = false;
        },
      });
    } else {
      setState("error", err.message ?? "Playback failed");
    }
  }
}

/**
 * Pause the current voice audio playback.
 */
export function pauseVoiceAudio(): void {
  if (_player && _state === "playing" && !_isFallback) {
    try {
      _player.pause();
      setState("paused");
    } catch {
      // Ignore
    }
  } else if (_isFallback) {
    Speech.stop();
    setState("paused");
  }
}

/**
 * Resume paused voice audio playback.
 */
export function resumeVoiceAudio(): void {
  if (_player && _state === "paused" && !_isFallback) {
    try {
      _player.play();
      setState("playing");
    } catch {
      // Ignore
    }
  }
}

/**
 * Stop and clean up voice audio playback.
 */
export function stopVoiceAudio(): void {
  if (_isFallback) {
    Speech.stop();
  }
  cleanupPlayer();
  _isFallback = false;
  setState("idle");
}

/**
 * Get the current playback status.
 */
export function getVoicePlaybackStatus(): VoicePlaybackStatus {
  return getStatus();
}

/**
 * Subscribe to playback status changes.
 * Returns an unsubscribe function.
 */
export function subscribeToVoicePlayback(listener: VoicePlaybackListener): () => void {
  _listeners.add(listener);
  // Immediately emit current status
  listener(getStatus());
  return () => {
    _listeners.delete(listener);
  };
}

/**
 * Check if voice playback is currently active.
 */
export function isVoicePlaying(): boolean {
  return _state === "playing";
}

/**
 * Check if voice playback is in fallback mode (using device TTS).
 */
export function isUsingFallback(): boolean {
  return _isFallback;
}
