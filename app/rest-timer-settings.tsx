import { useState, useEffect } from "react";
import {
  ScrollView, Text, View, TouchableOpacity, Alert, Platform, ImageBackground} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Haptics from "expo-haptics";
import {
  type RestTimerSettings,
  type ExerciseType,
  DEFAULT_REST_TIMERS,
  loadRestTimerSettings,
  saveRestTimerSettings,
} from "@/lib/rest-timer-settings";
import { GOLDEN_WORKOUT, GOLDEN_OVERLAY_STYLE } from "@/constants/golden-backgrounds";
import { UI, SF } from "@/constants/ui-colors";
import { a11yButton, a11yHeader, a11yImage, a11yProgress, a11ySwitch, A11Y_LABELS } from "@/lib/accessibility";

interface TimerConfig {
  key: ExerciseType;
  label: string;
  icon: string;
  description: string;
  examples: string;
  min: number;
  max: number;
  step: number;
}

const TIMER_CONFIGS: TimerConfig[] = [
  {
    key: "compound",
    label: "Compound Exercises",
    icon: "🏋️",
    description: "Multi-joint movements that work multiple muscle groups",
    examples: "Squat, Bench Press, Deadlift, Overhead Press, Pull-ups",
    min: 30, max: 300, step: 15,
  },
  {
    key: "isolation",
    label: "Isolation Exercises",
    icon: "💪",
    description: "Single-joint movements targeting one muscle group",
    examples: "Bicep Curls, Tricep Extensions, Lateral Raises, Leg Curls",
    min: 15, max: 180, step: 15,
  },
  {
    key: "cardio",
    label: "Cardio / HIIT",
    icon: "🏃",
    description: "Cardiovascular and high-intensity interval exercises",
    examples: "Burpees, Jump Squats, Mountain Climbers, Sprints",
    min: 10, max: 120, step: 5,
  },
  {
    key: "stretching",
    label: "Stretching / Mobility",
    icon: "🧘",
    description: "Flexibility and mobility exercises",
    examples: "Yoga Poses, Foam Rolling, Dynamic Stretches",
    min: 10, max: 120, step: 5,
  },
  {
    key: "custom",
    label: "Other Exercises",
    icon: "⚡",
    description: "Default rest time for unclassified exercises",
    examples: "Any exercise not matching the categories above",
    min: 15, max: 300, step: 15,
  },
];

function formatSeconds(s: number): string {
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return rem > 0 ? `${m}m ${rem}s` : `${m}m`;
}

export default function RestTimerSettingsScreen() {
  const router = useRouter();
  const [settings, setSettings] = useState<RestTimerSettings>(DEFAULT_REST_TIMERS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadRestTimerSettings().then((s) => {
      setSettings(s);
      setLoaded(true);
    });
  }, []);

  function adjustTimer(key: ExerciseType, delta: number, config: TimerConfig) {
    const newVal = Math.max(config.min, Math.min(config.max, settings[key] + delta));
    if (newVal === settings[key]) return;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const updated = { ...settings, [key]: newVal };
    setSettings(updated);
    saveRestTimerSettings(updated);
  }

  function resetDefaults() {
    Alert.alert(
      "Reset to Defaults",
      "This will reset all rest timers to their default values.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: () => {
            setSettings({ ...DEFAULT_REST_TIMERS });
            saveRestTimerSettings({ ...DEFAULT_REST_TIMERS });
            if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  }

  return (
    <ImageBackground source={{ uri: GOLDEN_WORKOUT }} style={{ flex: 1 }} resizeMode="cover">
    <ScreenContainer edges={["top", "left", "right"]} containerClassName="bg-background">
      <ScrollView style={{ flex: 1, backgroundColor: SF.bg }} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Header */}
        <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
              <MaterialIcons name="arrow-back" size={24} color={SF.gold} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={{ color: SF.fg, fontFamily: "DMSans_700Bold", fontSize: 22 }}>Rest Timer Settings</Text>
              <Text style={{ color: SF.muted, fontSize: 12, marginTop: 2 }}>Customise rest intervals per exercise type</Text>
            </View>
            <TouchableOpacity onPress={resetDefaults} style={{ padding: 8 }}>
              <MaterialIcons name="restore" size={22} color={SF.muted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Info card */}
        <View style={{
          marginHorizontal: 20, marginBottom: 16,
          backgroundColor: UI.goldAlpha6, borderRadius: 16,
          padding: 14, borderWidth: 1, borderColor: SF.border,
        }}>
          <Text style={{ color: SF.gold3, fontSize: 12, lineHeight: 18 }}>
            The app automatically classifies each exercise and applies the matching rest timer during your workout. Adjust the times below to match your training style.
          </Text>
        </View>

        {/* Timer cards */}
        {TIMER_CONFIGS.map((config) => (
          <View
            key={config.key}
            style={{
              marginHorizontal: 20, marginBottom: 12,
              backgroundColor: SF.surface, borderRadius: 18,
              padding: 16, borderWidth: 1, borderColor: SF.border,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <Text style={{ fontSize: 22 }}>{config.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: SF.fg, fontFamily: "DMSans_700Bold", fontSize: 15 }}>{config.label}</Text>
                <Text style={{ color: SF.muted, fontSize: 11, marginTop: 1 }}>{config.description}</Text>
              </View>
            </View>

            <Text style={{ color: SF.muted, fontSize: 10, marginBottom: 12, fontStyle: "italic" }}>
              e.g. {config.examples}
            </Text>

            {/* Timer control */}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 16 }}>
              <TouchableOpacity
                onPress={() => adjustTimer(config.key, -config.step, config)}
                style={{
                  width: 44, height: 44, borderRadius: 22,
                  backgroundColor: SF.surface2, alignItems: "center", justifyContent: "center",
                  borderWidth: 1, borderColor: SF.border2,
                  opacity: settings[config.key] <= config.min ? 0.3 : 1,
                }}
                disabled={settings[config.key] <= config.min}
              >
                <MaterialIcons name="remove" size={22} color={SF.gold} />
              </TouchableOpacity>

              <View style={{ alignItems: "center", minWidth: 90 }}>
                <Text style={{ color: SF.gold, fontFamily: "BebasNeue_400Regular", fontSize: 32 }}>
                  {formatSeconds(settings[config.key])}
                </Text>
                {settings[config.key] !== DEFAULT_REST_TIMERS[config.key] && (
                  <Text style={{ color: SF.muted, fontSize: 9, marginTop: 2 }}>
                    default: {formatSeconds(DEFAULT_REST_TIMERS[config.key])}
                  </Text>
                )}
              </View>

              <TouchableOpacity
                onPress={() => adjustTimer(config.key, config.step, config)}
                style={{
                  width: 44, height: 44, borderRadius: 22,
                  backgroundColor: SF.surface2, alignItems: "center", justifyContent: "center",
                  borderWidth: 1, borderColor: SF.border2,
                  opacity: settings[config.key] >= config.max ? 0.3 : 1,
                }}
                disabled={settings[config.key] >= config.max}
              >
                <MaterialIcons name="add" size={22} color={SF.gold} />
              </TouchableOpacity>
            </View>

            {/* Range indicator */}
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
              <Text style={{ color: SF.muted, fontSize: 9 }}>{formatSeconds(config.min)}</Text>
              <View style={{ flex: 1, height: 3, backgroundColor: SF.surface2, borderRadius: 2, marginHorizontal: 12, alignSelf: "center", overflow: "hidden" }}>
                <View style={{
                  height: 3, borderRadius: 2, backgroundColor: SF.gold,
                  width: `${((settings[config.key] - config.min) / (config.max - config.min)) * 100}%`,
                }} />
              </View>
              <Text style={{ color: SF.muted, fontSize: 9 }}>{formatSeconds(config.max)}</Text>
            </View>
          </View>
        ))}

        {/* Tip */}
        <View style={{
          marginHorizontal: 20, marginTop: 8,
          backgroundColor: UI.goldAlpha6, borderRadius: 16,
          padding: 14, borderWidth: 1, borderColor: SF.border,
        }}>
          <Text style={{ color: SF.gold3, fontSize: 12, lineHeight: 18 }}>
            {"💡 "}
            <Text style={{ fontFamily: "DMSans_700Bold" }}>Pro tip:</Text>
            {" Longer rest (2-3 min) for heavy compound lifts maximises strength gains. Shorter rest (30-60s) for isolation work keeps intensity high and improves muscular endurance."}
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
    </ImageBackground>
  );
}
