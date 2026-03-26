/**
 * Voice Coach Settings
 *
 * Persists voice coaching preferences to AsyncStorage.
 * Controls voice mode, auto-play, and countdown behavior.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "@voice_coach_settings";

export type VoiceCoachMode = "full" | "cues_only" | "countdown_only" | "off";

export interface VoiceCoachSettings {
  /** Voice coaching mode */
  mode: VoiceCoachMode;
  /** Auto-play form cues when set starts */
  autoPlayCues: boolean;
  /** Voice countdown during rest periods */
  voiceCountdown: boolean;
  /** Announce exercise transitions */
  announceTransitions: boolean;
  /** Speech rate multiplier (0.5 – 1.5) */
  speechRate: number;
}

export const DEFAULT_VOICE_COACH_SETTINGS: VoiceCoachSettings = {
  mode: "full",
  autoPlayCues: true,
  voiceCountdown: true,
  announceTransitions: true,
  speechRate: 1.0,
};

/**
 * Load voice coach settings from AsyncStorage.
 */
export async function loadVoiceCoachSettings(): Promise<VoiceCoachSettings> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_VOICE_COACH_SETTINGS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_VOICE_COACH_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_VOICE_COACH_SETTINGS;
  }
}

/**
 * Save voice coach settings to AsyncStorage.
 */
export async function saveVoiceCoachSettings(settings: VoiceCoachSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Silently fail
  }
}

/**
 * Update a single voice coach setting.
 */
export async function updateVoiceCoachSetting<K extends keyof VoiceCoachSettings>(
  key: K,
  value: VoiceCoachSettings[K]
): Promise<VoiceCoachSettings> {
  const current = await loadVoiceCoachSettings();
  const updated = { ...current, [key]: value };
  await saveVoiceCoachSettings(updated);
  return updated;
}

/**
 * Reset voice coach settings to defaults.
 */
export async function resetVoiceCoachSettings(): Promise<VoiceCoachSettings> {
  await saveVoiceCoachSettings(DEFAULT_VOICE_COACH_SETTINGS);
  return DEFAULT_VOICE_COACH_SETTINGS;
}

/**
 * Get the voice mode label for display.
 */
export function getVoiceModeName(mode: VoiceCoachMode): string {
  switch (mode) {
    case "full": return "Full Coach";
    case "cues_only": return "Form Cues Only";
    case "countdown_only": return "Countdown Only";
    case "off": return "Muted";
  }
}

/**
 * Get the voice mode description for settings UI.
 */
export function getVoiceModeDescription(mode: VoiceCoachMode): string {
  switch (mode) {
    case "full": return "Form cues, rest countdown, and exercise announcements";
    case "cues_only": return "Only form cues during sets (no countdown or announcements)";
    case "countdown_only": return "Only rest countdown and exercise announcements (no form cues)";
    case "off": return "All voice coaching disabled";
  }
}
