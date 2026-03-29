/**
 * Rest Timer Sounds Settings Screen
 *
 * Configure audio chime/beep options for rest timer completion.
 */

import React, { useState, useEffect } from "react";
import {
  ScrollView, Text, View, TouchableOpacity, Switch,
  StyleSheet, Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Haptics from "expo-haptics";
import {
  loadSoundSettings, saveSoundSettings, playSound,
  SOUND_OPTIONS, DEFAULT_SOUND_SETTINGS,
  type RestTimerSoundSettings, type SoundType,
} from "@/lib/rest-timer-sounds";
import { C } from "@/constants/ui-colors";

export default function RestTimerSoundsScreen() {
  const router = useRouter();
  const [settings, setSettings] = useState<RestTimerSoundSettings>(DEFAULT_SOUND_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadSoundSettings().then((s) => {
      setSettings(s);
      setLoaded(true);
    });
  }, []);

  async function updateSetting(key: keyof RestTimerSoundSettings, value: any) {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    await saveSoundSettings(updated);
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }

  async function previewSound(type: SoundType) {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    await playSound(type, "Rest complete! Let's go!");
  }

  if (!loaded) return null;

  return (
    <ScreenContainer>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={20} color={C.fg} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>Timer Sounds</Text>
          <Text style={s.headerSub}>Rest Timer Audio Options</Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Completion Sound */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>COMPLETION SOUND</Text>
          <Text style={s.sectionDesc}>Sound when rest timer finishes</Text>
          <View style={s.optionsGrid}>
            {SOUND_OPTIONS.map((opt) => {
              const isActive = settings.completionSound === opt.type;
              return (
                <TouchableOpacity
                  key={opt.type}
                  style={[s.optionCard, isActive && s.optionCardActive]}
                  onPress={() => updateSetting("completionSound", opt.type)}
                >
                  <View style={s.optionRow}>
                    <MaterialIcons name={opt.icon as any} size={18} color={isActive ? C.gold : C.muted} />
                    <View style={s.optionContent}>
                      <Text style={[s.optionLabel, isActive && s.optionLabelActive]}>{opt.label}</Text>
                      <Text style={s.optionDesc}>{opt.description}</Text>
                    </View>
                    {isActive && <MaterialIcons name="check-circle" size={18} color={C.gold} />}
                  </View>
                  {isActive && opt.type !== "none" && (
                    <TouchableOpacity style={s.previewBtn} onPress={() => previewSound(opt.type)}>
                      <MaterialIcons name="play-arrow" size={14} color={C.gold} />
                      <Text style={s.previewText}>Preview</Text>
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Countdown Sound */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>COUNTDOWN SOUND</Text>
          <Text style={s.sectionDesc}>Sound at countdown milestones (10s, 5s)</Text>
          <View style={s.optionsGrid}>
            {SOUND_OPTIONS.filter((o) => ["none", "beep", "voice"].includes(o.type)).map((opt) => {
              const isActive = settings.countdownSound === opt.type;
              return (
                <TouchableOpacity
                  key={opt.type}
                  style={[s.optionCard, isActive && s.optionCardActive]}
                  onPress={() => updateSetting("countdownSound", opt.type)}
                >
                  <View style={s.optionRow}>
                    <MaterialIcons name={opt.icon as any} size={18} color={isActive ? C.gold : C.muted} />
                    <View style={s.optionContent}>
                      <Text style={[s.optionLabel, isActive && s.optionLabelActive]}>{opt.label}</Text>
                      <Text style={s.optionDesc}>{opt.description}</Text>
                    </View>
                    {isActive && <MaterialIcons name="check-circle" size={18} color={C.gold} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Toggles */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>OPTIONS</Text>

          <View style={s.toggleRow}>
            <View style={s.toggleInfo}>
              <MaterialIcons name="vibration" size={18} color={C.gold} />
              <View>
                <Text style={s.toggleLabel}>Haptic Feedback</Text>
                <Text style={s.toggleDesc}>Vibrate alongside sounds</Text>
              </View>
            </View>
            <Switch
              value={settings.hapticFeedback}
              onValueChange={(v) => updateSetting("hapticFeedback", v)}
              trackColor={{ false: C.surface, true: "rgba(245,158,11,0.3)" }}
              thumbColor={settings.hapticFeedback ? C.gold : C.muted}
            />
          </View>

          <View style={s.toggleRow}>
            <View style={s.toggleInfo}>
              <MaterialIcons name="hourglass-bottom" size={18} color={C.gold} />
              <View>
                <Text style={s.toggleLabel}>Halfway Warning</Text>
                <Text style={s.toggleDesc}>Alert at 50% of rest time</Text>
              </View>
            </View>
            <Switch
              value={settings.halfwayWarning}
              onValueChange={(v) => updateSetting("halfwayWarning", v)}
              trackColor={{ false: C.surface, true: "rgba(245,158,11,0.3)" }}
              thumbColor={settings.halfwayWarning ? C.gold : C.muted}
            />
          </View>
        </View>

        {/* Reset */}
        <TouchableOpacity
          style={s.resetBtn}
          onPress={() => {
            setSettings(DEFAULT_SOUND_SETTINGS);
            saveSoundSettings(DEFAULT_SOUND_SETTINGS);
          }}
        >
          <MaterialIcons name="restore" size={16} color={C.muted} />
          <Text style={s.resetText}>Reset to Defaults</Text>
        </TouchableOpacity>
      </ScrollView>
    </ScreenContainer>
  );
}

const s = StyleSheet.create({
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
  headerSub: {
    color: C.muted,
    fontFamily: "DMSans_500Medium",
    fontSize: 12,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: C.gold,
    fontFamily: "DMSans_700Bold",
    fontSize: 11,
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  sectionDesc: {
    color: C.muted,
    fontFamily: "DMSans_400Regular",
    fontSize: 11,
    marginBottom: 12,
  },
  optionsGrid: {
    gap: 8,
  },
  optionCard: {
    backgroundColor: C.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
  },
  optionCardActive: {
    borderColor: C.gold,
    backgroundColor: "rgba(245,158,11,0.06)",
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  optionContent: {
    flex: 1,
  },
  optionLabel: {
    color: C.fg,
    fontFamily: "DMSans_600SemiBold",
    fontSize: 14,
  },
  optionLabelActive: {
    color: C.gold,
  },
  optionDesc: {
    color: C.muted,
    fontFamily: "DMSans_400Regular",
    fontSize: 11,
  },
  previewBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
    alignSelf: "flex-start",
    backgroundColor: "rgba(245,158,11,0.10)",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  previewText: {
    color: C.gold,
    fontFamily: "DMSans_600SemiBold",
    fontSize: 11,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: C.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 8,
  },
  toggleInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  toggleLabel: {
    color: C.fg,
    fontFamily: "DMSans_600SemiBold",
    fontSize: 14,
  },
  toggleDesc: {
    color: C.muted,
    fontFamily: "DMSans_400Regular",
    fontSize: 11,
  },
  resetBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: C.surface,
    borderRadius: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: C.border,
  },
  resetText: {
    color: C.muted,
    fontFamily: "DMSans_700Bold",
    fontSize: 13,
  },
});
