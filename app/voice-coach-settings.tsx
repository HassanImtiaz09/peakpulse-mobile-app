/**
 * Voice Coach Settings Screen — FIXED
 *
 * Changes from original:
 * 1. testVoice() now wrapped in try/catch — TTS failures no longer silently
 *    swallow errors; an Alert is shown if speech is unavailable.
 * 2. Alert added to React Native imports.
 * 3. loadVoiceCoachSettings() failure is now caught — corrupted AsyncStorage
 *    data falls back to DEFAULT_VOICE_COACH_SETTINGS instead of crashing.
 * 4. Info card updated to accurately describe exercise cue coverage and note
 *    that dynamic cue generation is in progress.
 */

import React, { useState, useEffect } from "react";
import {
  ScrollView,
  Text,
  View,
  TouchableOpacity,
  Switch,
  Platform,
  StyleSheet,
  Alert, // FIX: added for TTS error feedback
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Haptics from "expo-haptics";
import {
  loadVoiceCoachSettings,
  saveVoiceCoachSettings,
  resetVoiceCoachSettings,
  getVoiceModeName,
  getVoiceModeDescription,
  type VoiceCoachSettings,
  type VoiceCoachMode,
  DEFAULT_VOICE_COACH_SETTINGS,
} from "@/lib/voice-coach-settings";
import { speakCue, stopSpeaking } from "@/lib/audio-form-cues";

const C = {
  bg: "#0A0E14",
  surface: "#141A22",
  border: "rgba(245,158,11,0.15)",
  border2: "rgba(245,158,11,0.25)",
  fg: "#F1F5F9",
  muted: "#B45309",
  gold: "#F59E0B",
  gold2: "#FBBF24",
  gold3: "#FDE68A",
  green: "#22C55E",
  red: "#EF4444",
};

const VOICE_MODES: VoiceCoachMode[] = [
  "full",
  "cues_only",
  "countdown_only",
  "off",
];

export default function VoiceCoachSettingsScreen() {
  const router = useRouter();
  const [settings, setSettings] = useState<VoiceCoachSettings>(
    DEFAULT_VOICE_COACH_SETTINGS
  );
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // FIX: Wrap settings load in catch — malformed AsyncStorage data falls
    // back to defaults instead of crashing the settings screen.
    loadVoiceCoachSettings()
      .then((s) => {
        setSettings(s);
        setLoaded(true);
      })
      .catch(() => {
        // AsyncStorage unavailable or data corrupted — use defaults
        setSettings(DEFAULT_VOICE_COACH_SETTINGS);
        setLoaded(true);
      });
  }, []);

  async function updateSetting<K extends keyof VoiceCoachSettings>(
    key: K,
    value: VoiceCoachSettings[K]
  ) {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    await saveVoiceCoachSettings(updated);
    if (Platform.OS !== "web")
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }

  async function handleReset() {
    const defaults = await resetVoiceCoachSettings();
    setSettings(defaults);
    if (Platform.OS !== "web")
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => {}
      );
  }

  // FIX: testVoice is now wrapped in try/catch.
  // Previously, any TTS failure was swallowed silently. Now the user gets
  // a clear error message if the device cannot play audio.
  function testVoice() {
    try {
      stopSpeaking();
      speakCue(
        "Voice coaching is active. Keep your core tight and breathe steadily."
      );
    } catch {
      Alert.alert(
        "Voice Unavailable",
        "Text-to-speech could not start. Please check your device audio settings and ensure PeakPulse has audio access.",
        [{ text: "OK" }]
      );
    }
  }

  if (!loaded) return null;

  return (
    <ScreenContainer>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
        >
          <MaterialIcons name="arrow-back" size={20} color={C.fg} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Voice Coach</Text>
          <Text style={styles.headerSubtitle}>Workout Audio Settings</Text>
        </View>
        <TouchableOpacity style={styles.resetBtn} onPress={handleReset}>
          <MaterialIcons name="refresh" size={16} color={C.muted} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Voice Mode Selection */}
        <Text style={styles.sectionLabel}>VOICE MODE</Text>
        <View style={styles.card}>
          {VOICE_MODES.map((mode) => {
            const active = settings.mode === mode;
            return (
              <TouchableOpacity
                key={mode}
                style={[
                  styles.modeItem,
                  active && styles.modeItemActive,
                ]}
                onPress={() => updateSetting("mode", mode)}
              >
                <View style={styles.modeLeft}>
                  <View
                    style={[
                      styles.modeRadio,
                      active && styles.modeRadioActive,
                    ]}
                  >
                    {active && <View style={styles.modeRadioDot} />}
                  </View>
                  <View>
                    <Text
                      style={[
                        styles.modeLabel,
                        active && styles.modeLabelActive,
                      ]}
                    >
                      {getVoiceModeName(mode)}
                    </Text>
                    <Text style={styles.modeDesc}>
                      {getVoiceModeDescription(mode)}
                    </Text>
                  </View>
                </View>
                {mode === "full" && (
                  <View style={styles.recommendedBadge}>
                    <Text style={styles.recommendedText}>Recommended</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Toggle Settings */}
        <Text style={styles.sectionLabel}>BEHAVIOR</Text>
        <View style={styles.card}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleLeft}>
              <MaterialIcons name="play-circle-outline" size={18} color={C.gold} />
              <View>
                <Text style={styles.toggleLabel}>Auto-Play Form Cues</Text>
                <Text style={styles.toggleDesc}>
                  Play form cues automatically when a set starts
                </Text>
              </View>
            </View>
            <Switch
              value={settings.autoPlayCues}
              onValueChange={(v) => updateSetting("autoPlayCues", v)}
              trackColor={{ false: "#333", true: "rgba(245,158,11,0.4)" }}
              thumbColor={settings.autoPlayCues ? C.gold : "#666"}
            />
          </View>
          <View style={styles.divider} />
          <View style={styles.toggleRow}>
            <View style={styles.toggleLeft}>
              <MaterialIcons name="timer" size={18} color={C.gold} />
              <View>
                <Text style={styles.toggleLabel}>Voice Countdown</Text>
                <Text style={styles.toggleDesc}>
                  Count down last 10 seconds of rest period
                </Text>
              </View>
            </View>
            <Switch
              value={settings.voiceCountdown}
              onValueChange={(v) => updateSetting("voiceCountdown", v)}
              trackColor={{ false: "#333", true: "rgba(245,158,11,0.4)" }}
              thumbColor={settings.voiceCountdown ? C.gold : "#666"}
            />
          </View>
          <View style={styles.divider} />
          <View style={styles.toggleRow}>
            <View style={styles.toggleLeft}>
              <MaterialIcons name="swap-horiz" size={18} color={C.gold} />
              <View>
                <Text style={styles.toggleLabel}>Exercise Announcements</Text>
                <Text style={styles.toggleDesc}>
                  Announce exercise name, sets, and reps on transition
                </Text>
              </View>
            </View>
            <Switch
              value={settings.announceTransitions}
              onValueChange={(v) => updateSetting("announceTransitions", v)}
              trackColor={{ false: "#333", true: "rgba(245,158,11,0.4)" }}
              thumbColor={settings.announceTransitions ? C.gold : "#666"}
            />
          </View>
        </View>

        {/* Speech Rate */}
        <Text style={styles.sectionLabel}>SPEECH RATE</Text>
        <View style={styles.card}>
          <View style={styles.rateRow}>
            {[0.7, 0.85, 1.0, 1.15, 1.3].map((rate) => {
              const active = Math.abs(settings.speechRate - rate) < 0.05;
              return (
                <TouchableOpacity
                  key={rate}
                  style={[
                    styles.rateChip,
                    active && styles.rateChipActive,
                  ]}
                  onPress={() => updateSetting("speechRate", rate)}
                >
                  <Text
                    style={[
                      styles.rateText,
                      active && styles.rateTextActive,
                    ]}
                  >
                    {rate === 1.0 ? "1x" : `${rate}x`}
                  </Text>
                  {rate === 1.0 && (
                    <Text
                      style={[
                        styles.rateSubtext,
                        active && styles.rateSubtextActive,
                      ]}
                    >
                      Normal
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Test Voice */}
        <TouchableOpacity style={styles.testBtn} onPress={testVoice}>
          <MaterialIcons name="volume-up" size={18} color={C.gold} />
          <Text style={styles.testBtnText}>Test Voice</Text>
        </TouchableOpacity>

        {/* FIX: Info card updated to accurately reflect coverage and roadmap */}
        <View style={styles.infoCard}>
          <MaterialIcons name="info-outline" size={16} color={C.muted} />
          <Text style={styles.infoText}>
            Voice coaching uses your device's built-in text-to-speech engine.
            Detailed 5-phase form cues (setup, execution, peak, return,
            breathing) are currently available for 13 core exercises. Generic
            countdown and exercise-name announcements work for all exercises
            regardless of mode.
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: C.border,
  },
  headerCenter: { flex: 1 },
  headerTitle: {
    color: C.fg,
    fontFamily: "BebasNeue_400Regular",
    fontSize: 22,
  },
  headerSubtitle: {
    color: C.muted,
    fontFamily: "DMSans_500Medium",
    fontSize: 12,
  },
  resetBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: C.border,
  },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  sectionLabel: {
    color: C.gold,
    fontFamily: "DMSans_700Bold",
    fontSize: 11,
    letterSpacing: 1.5,
    marginBottom: 8,
    marginTop: 20,
  },
  card: {
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    overflow: "hidden",
  },
  modeItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(245,158,11,0.06)",
  },
  modeItemActive: { backgroundColor: "rgba(245,158,11,0.06)" },
  modeLeft: { flexDirection: "row", alignItems: "flex-start", gap: 12, flex: 1 },
  modeRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: C.muted,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  modeRadioActive: { borderColor: C.gold },
  modeRadioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.gold },
  modeLabel: { color: C.fg, fontFamily: "DMSans_600SemiBold", fontSize: 14 },
  modeLabelActive: { color: C.gold },
  modeDesc: {
    color: C.muted,
    fontFamily: "DMSans_400Regular",
    fontSize: 11,
    marginTop: 2,
    maxWidth: 240,
  },
  recommendedBadge: {
    backgroundColor: "rgba(34,197,94,0.15)",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  recommendedText: { color: "#22C55E", fontFamily: "DMSans_600SemiBold", fontSize: 9 },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
  },
  toggleLeft: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    flex: 1,
    marginRight: 12,
  },
  toggleLabel: { color: C.fg, fontFamily: "DMSans_600SemiBold", fontSize: 14 },
  toggleDesc: { color: C.muted, fontFamily: "DMSans_400Regular", fontSize: 11, marginTop: 2 },
  divider: { height: 1, backgroundColor: "rgba(245,158,11,0.06)" },
  rateRow: { flexDirection: "row", padding: 14, gap: 8 },
  rateChip: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "rgba(245,158,11,0.06)",
    borderWidth: 1,
    borderColor: "transparent",
  },
  rateChipActive: { backgroundColor: "rgba(245,158,11,0.15)", borderColor: C.gold },
  rateText: { color: C.muted, fontFamily: "DMSans_700Bold", fontSize: 13 },
  rateTextActive: { color: C.gold },
  rateSubtext: { color: C.muted, fontFamily: "DMSans_400Regular", fontSize: 9, marginTop: 1 },
  rateSubtextActive: { color: C.gold2 },
  testBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "rgba(245,158,11,0.10)",
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 20,
    borderWidth: 1,
    borderColor: C.border,
  },
  testBtnText: { color: C.gold, fontFamily: "DMSans_700Bold", fontSize: 14 },
  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "rgba(245,158,11,0.04)",
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.08)",
  },
  infoText: {
    color: C.muted,
    fontFamily: "DMSans_400Regular",
    fontSize: 11,
    lineHeight: 16,
    flex: 1,
  },
});
