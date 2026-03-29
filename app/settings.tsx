/**
 * Settings Screen — App Settings
 * Theme toggle (light/dark/system), font size selector, push notification toggle.
 * Push notifications wired to expo-notifications via notification-service.
 */
import React, { useEffect, useState, useCallback } from "react";
import {
  ScrollView, Text, View, TouchableOpacity, Switch, Platform, StyleSheet, Alert,
  ActivityIndicator, ImageBackground, TextInput} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useThemeContext, type ThemePreference } from "@/lib/theme-provider";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import {
  setNotificationsEnabled,
  isNotificationsEnabled,
  getScheduledNotificationCount,
  requestNotificationPermissions,
} from "@/lib/notification-service";
import {
  clearVideoCache,
  getVideoCacheSize,
} from "@/lib/gif-cache";
import {
  ACTIVITY_LEVELS, GOAL_OPTIONS,
  calculateTDEEBreakdown, calculateMacros,
  saveTDEEBreakdown, loadTDEEBreakdown,
  type TDEEBreakdown,
} from "@/lib/tdee-calculator";
import { useCalories } from "@/lib/calorie-context";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
import { GOLDEN_PRIMARY, GOLDEN_OVERLAY_STYLE } from "@/constants/golden-backgrounds";

const SF = {
  bg: "#0A0E14", surface: "#141A22", border: "rgba(245,158,11,0.15)",
  fg: "#F1F5F9", muted: "#B45309", gold: "#F59E0B", gold2: "#FBBF24", gold3: "#FDE68A",
};

const FONT_SIZE_KEY = "@peakpulse_font_size";

const THEME_OPTIONS: Array<{ key: ThemePreference; label: string; icon: React.ComponentProps<typeof MaterialIcons>["name"]; desc: string }> = [
  { key: "system", label: "System", icon: "phone-iphone", desc: "Follow device setting" },
  { key: "light", label: "Light", icon: "light-mode", desc: "Always light mode" },
  { key: "dark", label: "Dark", icon: "dark-mode", desc: "Always dark mode" },
];

const FONT_SIZES = [
  { key: "small", label: "Small", scale: 0.85 },
  { key: "medium", label: "Medium", scale: 1.0 },
  { key: "large", label: "Large", scale: 1.15 },
  { key: "xlarge", label: "Extra Large", scale: 1.3 },
];

export default function SettingsScreen() {
  const router = useRouter();
  const { themePreference, setThemePreference } = useThemeContext();
  const [fontSize, setFontSizeState] = useState("medium");
  const [pushEnabled, setPushEnabled] = useState(true);
  const [pushLoading, setPushLoading] = useState(false);
  const [scheduledCount, setScheduledCount] = useState(0);

  const [videoCacheSize, setVideoCacheSize] = useState("0 KB");
  const [clearingCache, setClearingCache] = useState(false);

  // TDEE Recalculate state
  const { setCalorieGoal } = useCalories();
  const [tdeeBreakdown, setTdeeBreakdown] = useState<TDEEBreakdown | null>(null);
  const [editWeight, setEditWeight] = useState("");
  const [editHeight, setEditHeight] = useState("");
  const [editAge, setEditAge] = useState("");
  const [editGender, setEditGender] = useState<"male" | "female">("male");
  const [editActivity, setEditActivity] = useState("moderate");
  const [editGoal, setEditGoal] = useState("maintain");
  const [recalculating, setRecalculating] = useState(false);

  const loadSettings = useCallback(async () => {
    const fontVal = await AsyncStorage.getItem(FONT_SIZE_KEY);
    if (fontVal) setFontSizeState(fontVal);

    const enabled = await isNotificationsEnabled();
    setPushEnabled(enabled);

    if (enabled) {
      const count = await getScheduledNotificationCount();
      setScheduledCount(count);
    }

    // Load video cache size
    try {
      const sizeBytes = await getVideoCacheSize();
      setVideoCacheSize(formatBytes(sizeBytes));
    } catch {}

    // Load TDEE breakdown for recalculate form
    const breakdown = await loadTDEEBreakdown();
    if (breakdown) {
      setTdeeBreakdown(breakdown);
      setEditWeight(String(breakdown.inputs.weightKg));
      setEditHeight(String(breakdown.inputs.heightCm));
      setEditAge(String(breakdown.inputs.age));
      setEditGender(breakdown.inputs.gender);
      setEditActivity(breakdown.inputs.activityKey);
      setEditGoal(breakdown.inputs.goal);
    }
  }, []);

  useEffect(() => { loadSettings(); }, [loadSettings]);

  async function setFontSize(key: string) {
    setFontSizeState(key);
    await AsyncStorage.setItem(FONT_SIZE_KEY, key);
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  async function togglePush(val: boolean) {
    if ((Platform.OS as string) === "web") {
      Alert.alert("Not Available", "Push notifications are only available on mobile devices.");
      return;
    }

    setPushLoading(true);
    try {
      if (val) {
        // Request permissions first
        const granted = await requestNotificationPermissions();
        if (!granted) {
          Alert.alert(
            "Permission Required",
            "Please enable notifications in your device settings to receive workout reminders and meal alerts.",
          );
          setPushLoading(false);
          return;
        }
      }

      const success = await setNotificationsEnabled(val);
      if (success) {
        setPushEnabled(val);
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(
            val ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning,
          );
        }

        if (val) {
          const count = await getScheduledNotificationCount();
          setScheduledCount(count);
        } else {
          setScheduledCount(0);
        }
      }
    } catch (err) {
      console.warn("[Settings] Push toggle error:", err);
      Alert.alert("Error", "Failed to update notification settings. Please try again.");
    }
    setPushLoading(false);
  }

  async function handleRecalculate() {
    const w = parseFloat(editWeight);
    const h = parseFloat(editHeight);
    const a = parseInt(editAge, 10);
    if (!w || !h || !a || w <= 0 || h <= 0 || a <= 0) {
      Alert.alert("Invalid Input", "Please enter valid weight, height, and age values.");
      return;
    }
    setRecalculating(true);
    try {
      const breakdown = calculateTDEEBreakdown(w, h, a, editGender, editActivity, editGoal);
      await saveTDEEBreakdown(breakdown);
      // Also update macro targets
      const macros = calculateMacros(breakdown.adjustedTdee, w, editGoal);
      await AsyncStorage.setItem("@user_macro_targets", JSON.stringify(macros));
      setTdeeBreakdown(breakdown);
      setCalorieGoal(breakdown.adjustedTdee);
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Updated", `Your daily calorie target is now ${breakdown.adjustedTdee} kcal.`);
    } catch (err) {
      Alert.alert("Error", "Failed to recalculate. Please try again.");
    }
    setRecalculating(false);
  }

  return (
    <ImageBackground source={{ uri: GOLDEN_PRIMARY }} style={{ flex: 1 }} resizeMode="cover">
    <ScreenContainer edges={["top", "left", "right"]} containerClassName="bg-background">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={22} color={SF.fg} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {/* ── Theme ── */}
        <Text style={styles.sectionLabel}>APPEARANCE</Text>
        <View style={styles.card}>
          {THEME_OPTIONS.map((opt) => {
            const active = themePreference === opt.key;
            return (
              <TouchableOpacity
                key={opt.key}
                style={[styles.optionRow, active && styles.optionRowActive]}
                onPress={() => {
                  setThemePreference(opt.key);
                  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <View style={[styles.optionIcon, active && styles.optionIconActive]}>
                  <MaterialIcons name={opt.icon} size={20} color={active ? SF.gold : SF.muted} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.optionLabel, active && { color: SF.gold }]}>{opt.label}</Text>
                  <Text style={styles.optionDesc}>{opt.desc}</Text>
                </View>
                {active && (
                  <View style={styles.checkCircle}>
                    <MaterialIcons name="check" size={14} color={SF.bg} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Font Size ── */}
        <Text style={styles.sectionLabel}>FONT SIZE</Text>
        <View style={styles.card}>
          <View style={styles.fontSizeRow}>
            {FONT_SIZES.map((fs) => {
              const active = fontSize === fs.key;
              return (
                <TouchableOpacity
                  key={fs.key}
                  style={[styles.fontSizeBtn, active && styles.fontSizeBtnActive]}
                  onPress={() => setFontSize(fs.key)}
                >
                  <Text style={[styles.fontSizePreview, { fontSize: 14 * fs.scale }]}>Aa</Text>
                  <Text style={[styles.fontSizeLabel, active && { color: SF.gold }]}>{fs.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={styles.previewBox}>
            <Text style={[styles.previewText, { fontSize: 14 * (FONT_SIZES.find(f => f.key === fontSize)?.scale ?? 1) }]}>
              This is how text will appear throughout the app.
            </Text>
          </View>
        </View>

        {/* ── Push Notifications ── */}
        <Text style={styles.sectionLabel}>NOTIFICATIONS</Text>
        <View style={styles.card}>
          <View style={styles.switchRow}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
              <View style={[styles.optionIcon, pushEnabled && styles.optionIconActive]}>
                <MaterialIcons name="notifications" size={20} color={pushEnabled ? SF.gold : SF.muted} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.optionLabel}>Push Notifications</Text>
                <Text style={styles.optionDesc}>
                  Workout reminders, meal alerts, and progress updates
                </Text>
              </View>
            </View>
            {pushLoading ? (
              <ActivityIndicator color={SF.gold} size="small" />
            ) : (
              <Switch
                value={pushEnabled}
                onValueChange={togglePush}
                trackColor={{ false: "#334155", true: "rgba(245,158,11,0.4)" }}
                thumbColor={pushEnabled ? SF.gold : "#687076"}
              />
            )}
          </View>

          {pushEnabled && scheduledCount > 0 && (
            <View style={styles.notifInfo}>
              <MaterialIcons name="check-circle" size={14} color="#22C55E" />
              <Text style={styles.notifInfoText}>
                {scheduledCount} daily reminder{scheduledCount !== 1 ? "s" : ""} scheduled
              </Text>
            </View>
          )}

          {pushEnabled && (
            <View style={styles.reminderList}>
              {[
                { icon: "fitness-center" as const, time: "8:00 AM", label: "Workout Reminder" },
                { icon: "restaurant" as const, time: "12:30 PM", label: "Meal Log Reminder" },
                { icon: "trending-up" as const, time: "8:00 PM", label: "Daily Check-In" },
              ].map((r) => (
                <View key={r.label} style={styles.reminderRow}>
                  <MaterialIcons name={r.icon} size={16} color={SF.muted} />
                  <Text style={styles.reminderLabel}>{r.label}</Text>
                  <Text style={styles.reminderTime}>{r.time}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* AI Reminders Settings Link */}
        {pushEnabled && (
          <TouchableOpacity
            onPress={() => router.push("/notification-settings" as any)}
            style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "rgba(245,158,11,0.06)", borderRadius: 14, padding: 14, marginTop: 8, borderWidth: 1, borderColor: "rgba(245,158,11,0.12)" }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <MaterialIcons name="smart-toy" size={20} color={SF.gold} />
              <View>
                <Text style={{ color: SF.fg, fontFamily: "DMSans_700Bold", fontSize: 14 }}>AI Reminder Settings</Text>
                <Text style={{ color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 11 }}>Customise meal, workout, and motivation notifications</Text>
              </View>
            </View>
            <MaterialIcons name="chevron-right" size={20} color={SF.muted} />
          </TouchableOpacity>
        )}

        {(Platform.OS as string) === "web" && (
          <View style={styles.webNote}>
            <MaterialIcons name="info-outline" size={14} color={SF.muted} />
            <Text style={styles.webNoteText}>
              Push notifications require a mobile device. Use the Expo Go app to test notifications.
            </Text>
          </View>
        )}

        {/* ── Offline GIF Cache ── */}
        <Text style={styles.sectionLabel}>OFFLINE CACHE</Text>
        <View style={styles.card}>
          <View style={{ padding: 14 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <View style={[styles.optionIcon, styles.optionIconActive]}>
                <MaterialIcons name="download-for-offline" size={20} color={SF.gold} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.optionLabel}>Exercise Video Cache</Text>
                <Text style={styles.optionDesc}>
                  Videos are automatically cached for your workout plan exercises
                </Text>
              </View>
            </View>

            {/* Cache stats */}
            <View style={{ backgroundColor: "rgba(245,158,11,0.06)", borderRadius: 10, padding: 12, gap: 6 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 12 }}>Cache Size</Text>
                <Text style={{ color: SF.fg, fontFamily: "DMSans_700Bold", fontSize: 12 }}>{videoCacheSize}</Text>
              </View>
            </View>

            {/* Clear cache button */}
            <TouchableOpacity
              style={{ marginTop: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "rgba(239,68,68,0.08)", borderRadius: 10, paddingVertical: 10, borderWidth: 1, borderColor: "rgba(239,68,68,0.15)" }}
              onPress={() => {
                Alert.alert("Clear Video Cache?", "Cached exercise videos will be removed. They will be re-downloaded when needed.", [
                  { text: "Cancel", style: "cancel" },
                  { text: "Clear", style: "destructive", onPress: async () => {
                    setClearingCache(true);
                    await clearVideoCache();
                    setVideoCacheSize("0 KB");
                    setClearingCache(false);
                    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  }},
                ]);
              }}
              disabled={clearingCache}
            >
              {clearingCache ? (
                <ActivityIndicator color="#EF4444" size="small" />
              ) : (
                <MaterialIcons name="delete-outline" size={18} color="#EF4444" />
              )}
              <Text style={{ color: "#EF4444", fontFamily: "DMSans_700Bold", fontSize: 13 }}>Clear Cache</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Recalculate TDEE ── */}
        <Text style={styles.sectionLabel}>CALORIE TARGET</Text>
        <View style={styles.card}>
          <View style={{ padding: 14 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 }}>
              <View style={[styles.optionIcon, styles.optionIconActive]}>
                <MaterialIcons name="calculate" size={20} color={SF.gold} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.optionLabel}>Recalculate TDEE</Text>
                <Text style={styles.optionDesc}>Update your metrics to get a new daily calorie target</Text>
              </View>
            </View>

            {/* Current target display */}
            {tdeeBreakdown && (
              <View style={{ backgroundColor: "rgba(245,158,11,0.06)", borderRadius: 10, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: SF.border }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={{ color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 11 }}>Current Target</Text>
                  <Text style={{ color: SF.gold, fontFamily: "DMSans_700Bold", fontSize: 16 }}>{tdeeBreakdown.adjustedTdee} kcal</Text>
                </View>
              </View>
            )}

            {/* Input fields */}
            <View style={{ gap: 10 }}>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text style={tdeeInputLabel}>Weight (kg)</Text>
                  <TextInput style={tdeeInputStyle} value={editWeight} onChangeText={setEditWeight} keyboardType="decimal-pad" placeholder="70" placeholderTextColor={SF.muted} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={tdeeInputLabel}>Height (cm)</Text>
                  <TextInput style={tdeeInputStyle} value={editHeight} onChangeText={setEditHeight} keyboardType="decimal-pad" placeholder="175" placeholderTextColor={SF.muted} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={tdeeInputLabel}>Age</Text>
                  <TextInput style={tdeeInputStyle} value={editAge} onChangeText={setEditAge} keyboardType="number-pad" placeholder="25" placeholderTextColor={SF.muted} />
                </View>
              </View>

              {/* Gender toggle */}
              <View>
                <Text style={tdeeInputLabel}>Gender</Text>
                <View style={{ flexDirection: "row", gap: 6 }}>
                  {(["male", "female"] as const).map(g => (
                    <TouchableOpacity
                      key={g}
                      onPress={() => setEditGender(g)}
                      style={[tdeeChipStyle, editGender === g && tdeeChipActiveStyle]}
                    >
                      <Text style={[tdeeChipText, editGender === g && { color: SF.gold }]}>{g === "male" ? "Male" : "Female"}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Activity level */}
              <View>
                <Text style={tdeeInputLabel}>Activity Level</Text>
                <View style={{ gap: 4 }}>
                  {ACTIVITY_LEVELS.map(a => (
                    <TouchableOpacity
                      key={a.key}
                      onPress={() => setEditActivity(a.key)}
                      style={[tdeeChipStyle, { paddingVertical: 8, paddingHorizontal: 12 }, editActivity === a.key && tdeeChipActiveStyle]}
                    >
                      <View style={{ flexDirection: "row", justifyContent: "space-between", flex: 1 }}>
                        <Text style={[tdeeChipText, editActivity === a.key && { color: SF.gold }]}>{a.label}</Text>
                        <Text style={{ color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 10 }}>{a.desc}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Goal */}
              <View>
                <Text style={tdeeInputLabel}>Fitness Goal</Text>
                <View style={{ gap: 4 }}>
                  {GOAL_OPTIONS.map(g => (
                    <TouchableOpacity
                      key={g.key}
                      onPress={() => setEditGoal(g.key)}
                      style={[tdeeChipStyle, { paddingVertical: 8, paddingHorizontal: 12 }, editGoal === g.key && tdeeChipActiveStyle]}
                    >
                      <View style={{ flexDirection: "row", justifyContent: "space-between", flex: 1 }}>
                        <Text style={[tdeeChipText, editGoal === g.key && { color: SF.gold }]}>{g.label}</Text>
                        <Text style={{ color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 10 }}>{g.desc}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            {/* Recalculate button */}
            <TouchableOpacity
              onPress={handleRecalculate}
              disabled={recalculating}
              style={{ marginTop: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "rgba(245,158,11,0.12)", borderRadius: 12, paddingVertical: 12, borderWidth: 1, borderColor: "rgba(245,158,11,0.30)" }}
            >
              {recalculating ? (
                <ActivityIndicator color={SF.gold} size="small" />
              ) : (
                <MaterialIcons name="refresh" size={18} color={SF.gold} />
              )}
              <Text style={{ color: SF.gold, fontFamily: "DMSans_700Bold", fontSize: 14 }}>Recalculate</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── About ── */}
        <Text style={styles.sectionLabel}>ABOUT</Text>
        <View style={styles.card}>
          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>Version</Text>
            <Text style={styles.aboutValue}>1.0.0</Text>
          </View>
          <View style={[styles.aboutRow, { borderTopWidth: 1, borderTopColor: SF.border }]}>
            <Text style={styles.aboutLabel}>Build</Text>
            <Text style={styles.aboutValue}>PeakPulse AI</Text>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
    </ImageBackground>
  );
}

// TDEE recalculate form inline styles
const tdeeInputLabel = { color: SF.muted, fontFamily: "DMSans_600SemiBold" as const, fontSize: 11, marginBottom: 4 };
const tdeeInputStyle = {
  backgroundColor: "rgba(245,158,11,0.06)", borderRadius: 10, borderWidth: 1, borderColor: SF.border,
  paddingHorizontal: 12, paddingVertical: 10, color: SF.fg, fontFamily: "DMSans_600SemiBold" as const, fontSize: 14,
};
const tdeeChipStyle = {
  flex: 1 as const, alignItems: "center" as const, paddingVertical: 8, borderRadius: 10,
  backgroundColor: "rgba(245,158,11,0.04)", borderWidth: 1, borderColor: SF.border,
};
const tdeeChipActiveStyle = {
  backgroundColor: "rgba(245,158,11,0.12)", borderColor: "rgba(245,158,11,0.30)",
};
const tdeeChipText = { color: SF.fg, fontFamily: "DMSans_600SemiBold" as const, fontSize: 12 };

const styles = StyleSheet.create({
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingVertical: 14,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(245,158,11,0.08)",
    alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: SF.border,
  },
  headerTitle: {
    color: SF.fg, fontFamily: "DMSans_700Bold", fontSize: 18,
  },
  sectionLabel: {
    color: SF.muted, fontSize: 11, fontFamily: "DMSans_700Bold", letterSpacing: 1.5,
    marginTop: 24, marginBottom: 10,
  },
  card: {
    backgroundColor: SF.surface, borderRadius: 16, padding: 4, borderWidth: 1, borderColor: SF.border,
    overflow: "hidden",
  },
  optionRow: {
    flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 12,
  },
  optionRowActive: {
    backgroundColor: "rgba(245,158,11,0.08)",
  },
  optionIcon: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(245,158,11,0.06)",
    alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: SF.border,
  },
  optionIconActive: {
    backgroundColor: "rgba(245,158,11,0.12)", borderColor: "rgba(245,158,11,0.25)",
  },
  optionLabel: {
    color: SF.fg, fontFamily: "DMSans_600SemiBold", fontSize: 14,
  },
  optionDesc: {
    color: SF.muted, fontSize: 11, marginTop: 1, fontFamily: "DMSans_400Regular",
  },
  checkCircle: {
    width: 22, height: 22, borderRadius: 11, backgroundColor: SF.gold,
    alignItems: "center", justifyContent: "center",
  },
  fontSizeRow: {
    flexDirection: "row", gap: 6, padding: 10,
  },
  fontSizeBtn: {
    flex: 1, alignItems: "center", paddingVertical: 12, borderRadius: 12,
    backgroundColor: "rgba(245,158,11,0.04)", borderWidth: 1, borderColor: SF.border,
  },
  fontSizeBtnActive: {
    backgroundColor: "rgba(245,158,11,0.12)", borderColor: "rgba(245,158,11,0.30)",
  },
  fontSizePreview: {
    color: SF.fg, fontFamily: "DMSans_700Bold", marginBottom: 4,
  },
  fontSizeLabel: {
    color: SF.muted, fontSize: 10, fontFamily: "DMSans_600SemiBold",
  },
  previewBox: {
    margin: 10, marginTop: 0, padding: 14, backgroundColor: "rgba(245,158,11,0.04)",
    borderRadius: 10, borderWidth: 1, borderColor: SF.border,
  },
  previewText: {
    color: SF.fg, fontFamily: "DMSans_400Regular", lineHeight: 22,
  },
  switchRow: {
    flexDirection: "row", alignItems: "center", padding: 14, gap: 12,
  },
  notifInfo: {
    flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14,
    paddingBottom: 8,
  },
  notifInfoText: {
    color: "#22C55E", fontSize: 11, fontFamily: "DMSans_600SemiBold",
  },
  reminderList: {
    marginHorizontal: 10, marginBottom: 10, padding: 10, borderRadius: 10,
    backgroundColor: "rgba(245,158,11,0.04)", borderWidth: 1, borderColor: SF.border,
    gap: 8,
  },
  reminderRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
  },
  reminderLabel: {
    flex: 1, color: SF.fg, fontSize: 12, fontFamily: "DMSans_400Regular",
  },
  reminderTime: {
    color: SF.gold, fontSize: 12, fontFamily: "DMSans_700Bold",
  },
  webNote: {
    flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12,
    padding: 12, backgroundColor: "rgba(245,158,11,0.04)", borderRadius: 10,
    borderWidth: 1, borderColor: SF.border,
  },
  webNoteText: {
    color: SF.muted, fontSize: 11, fontFamily: "DMSans_400Regular", flex: 1, lineHeight: 16,
  },
  aboutRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 14,
  },
  aboutLabel: {
    color: SF.fg, fontFamily: "DMSans_600SemiBold", fontSize: 14,
  },
  aboutValue: {
    color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 14,
  },
});
