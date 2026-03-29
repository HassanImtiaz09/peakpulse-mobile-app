/**
 * Smart Reminders Settings Screen
 *
 * Allows users to configure intelligent push notifications that adapt to their
 * workout schedule and streak status.
 */
import React, { useEffect, useState, useCallback } from "react";
import {
  Text, View, TouchableOpacity, ScrollView, StyleSheet,
  Switch, ActivityIndicator, Alert, Platform,
} from "react-native";
import { useRouter } from "expo-router";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import {
  getSmartReminderSettings,
  saveSmartReminderSettings,
  evaluateAndScheduleSmartReminders,
  getLastEvaluationTime,
  type SmartReminderSettings,
  DEFAULT_SETTINGS,
} from "@/lib/smart-reminders";
import { a11yButton, a11yHeader, a11yImage, a11yProgress, a11ySwitch, A11Y_LABELS } from "@/lib/accessibility";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function SmartRemindersScreen() {
  const router = useRouter();
  const colors = useColors();
  const [settings, setSettings] = useState<SmartReminderSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastEval, setLastEval] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const s = await getSmartReminderSettings();
      setSettings(s);
      const evalTime = await getLastEvaluationTime();
      setLastEval(evalTime);
      setLoading(false);
    })();
  }, []);

  const updateSetting = useCallback(async (key: keyof SmartReminderSettings, value: any) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    setSaving(true);
    await saveSmartReminderSettings({ [key]: value });
    await evaluateAndScheduleSmartReminders();
    setSaving(false);
  }, [settings]);

  const toggleWorkoutDay = useCallback(async (day: number) => {
    const current = settings.workoutDays;
    const updated = current.includes(day)
      ? current.filter(d => d !== day)
      : [...current, day].sort();
    await updateSetting("workoutDays", updated);
  }, [settings, updateSetting]);

  const adjustHour = useCallback(async (key: "preferredWorkoutHour" | "quietStart" | "quietEnd", delta: number) => {
    const current = settings[key];
    const newVal = (current + delta + 24) % 24;
    await updateSetting(key, newVal);
  }, [settings, updateSetting]);

  if (loading) {
    return (
      <ScreenContainer edges={["top", "left", "right", "bottom"]}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </ScreenContainer>
    );
  }

  const formatHour = (h: number) => {
    const ampm = h >= 12 ? "PM" : "AM";
    const hr = h % 12 || 12;
    return `${hr}:00 ${ampm}`;
  };

  return (
    <ScreenContainer edges={["top", "left", "right", "bottom"]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <MaterialIcons name="arrow-back" size={24} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Smart Reminders</Text>
          {saving && <ActivityIndicator size="small" color={colors.primary} />}
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={[styles.description, { color: colors.muted }]}>
            Smart reminders adapt to your workout schedule and streak. They know when to nudge you, when to celebrate, and when to let you rest.
          </Text>
        </View>

        {/* Master Toggle */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.toggleLabel, { color: colors.foreground }]}>Smart Reminders</Text>
              <Text style={[styles.toggleDesc, { color: colors.muted }]}>Enable intelligent notifications</Text>
            </View>
            <Switch
              value={settings.enabled}
              onValueChange={v => updateSetting("enabled", v)}
              trackColor={{ true: colors.primary }}
            />
          </View>
        </View>

        {settings.enabled && (
          <>
            {/* Workout Days */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Workout Days</Text>
              <Text style={[styles.sectionDesc, { color: colors.muted }]}>
                Select which days you typically train. Reminders adapt based on this schedule.
              </Text>
              <View style={styles.daysRow}>
                {DAY_LABELS.map((label, i) => {
                  const active = settings.workoutDays.includes(i);
                  return (
                    <TouchableOpacity
                      key={i}
                      onPress={() => toggleWorkoutDay(i)}
                      style={[
                        styles.dayChip,
                        { borderColor: active ? colors.primary : colors.border },
                        active && { backgroundColor: colors.primary + "22" },
                      ]}
                    >
                      <Text style={[styles.dayChipText, { color: active ? colors.primary : colors.muted }]}>
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Preferred Workout Time */}
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.toggleLabel, { color: colors.foreground }]}>Preferred Workout Time</Text>
              <Text style={[styles.toggleDesc, { color: colors.muted, marginBottom: 8 }]}>
                Streak protection fires 2 hours after this time.
              </Text>
              <View style={styles.timeAdjust}>
                <TouchableOpacity onPress={() => adjustHour("preferredWorkoutHour", -1)} style={[styles.timeBtn, { borderColor: colors.border }]}>
                  <MaterialIcons name="remove" size={20} color={colors.foreground} />
                </TouchableOpacity>
                <Text style={[styles.timeValue, { color: colors.primary }]}>
                  {formatHour(settings.preferredWorkoutHour)}
                </Text>
                <TouchableOpacity onPress={() => adjustHour("preferredWorkoutHour", 1)} style={[styles.timeBtn, { borderColor: colors.border }]}>
                  <MaterialIcons name="add" size={20} color={colors.foreground} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Quiet Hours */}
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.toggleLabel, { color: colors.foreground }]}>Quiet Hours</Text>
              <Text style={[styles.toggleDesc, { color: colors.muted, marginBottom: 8 }]}>
                No notifications during these hours.
              </Text>
              <View style={styles.quietRow}>
                <View style={styles.quietItem}>
                  <Text style={[styles.quietLabel, { color: colors.muted }]}>From</Text>
                  <View style={styles.timeAdjust}>
                    <TouchableOpacity onPress={() => adjustHour("quietStart", -1)} style={[styles.timeBtnSmall, { borderColor: colors.border }]}>
                      <MaterialIcons name="remove" size={16} color={colors.foreground} />
                    </TouchableOpacity>
                    <Text style={[styles.timeValueSmall, { color: colors.foreground }]}>
                      {formatHour(settings.quietStart)}
                    </Text>
                    <TouchableOpacity onPress={() => adjustHour("quietStart", 1)} style={[styles.timeBtnSmall, { borderColor: colors.border }]}>
                      <MaterialIcons name="add" size={16} color={colors.foreground} />
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.quietItem}>
                  <Text style={[styles.quietLabel, { color: colors.muted }]}>To</Text>
                  <View style={styles.timeAdjust}>
                    <TouchableOpacity onPress={() => adjustHour("quietEnd", -1)} style={[styles.timeBtnSmall, { borderColor: colors.border }]}>
                      <MaterialIcons name="remove" size={16} color={colors.foreground} />
                    </TouchableOpacity>
                    <Text style={[styles.timeValueSmall, { color: colors.foreground }]}>
                      {formatHour(settings.quietEnd)}
                    </Text>
                    <TouchableOpacity onPress={() => adjustHour("quietEnd", 1)} style={[styles.timeBtnSmall, { borderColor: colors.border }]}>
                      <MaterialIcons name="add" size={16} color={colors.foreground} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>

            {/* Reminder Types */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Reminder Types</Text>
            </View>

            {/* Streak Protection */}
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.toggleRow}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <MaterialIcons name="local-fire-department" size={18} color="#EF4444" />
                    <Text style={[styles.toggleLabel, { color: colors.foreground }]}>Streak Protection</Text>
                  </View>
                  <Text style={[styles.toggleDesc, { color: colors.muted }]}>
                    Nudge when your streak is at risk (no workout yet on a training day)
                  </Text>
                </View>
                <Switch
                  value={settings.streakProtection}
                  onValueChange={v => updateSetting("streakProtection", v)}
                  trackColor={{ true: colors.primary }}
                />
              </View>
            </View>

            {/* Comeback Nudges */}
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.toggleRow}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <MaterialIcons name="emoji-people" size={18} color="#3B82F6" />
                    <Text style={[styles.toggleLabel, { color: colors.foreground }]}>Comeback Nudges</Text>
                  </View>
                  <Text style={[styles.toggleDesc, { color: colors.muted }]}>
                    Encouraging message after 2+ days without a workout
                  </Text>
                </View>
                <Switch
                  value={settings.comebackNudges}
                  onValueChange={v => updateSetting("comebackNudges", v)}
                  trackColor={{ true: colors.primary }}
                />
              </View>
            </View>

            {/* Milestone Celebrations */}
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.toggleRow}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <MaterialIcons name="emoji-events" size={18} color="#F59E0B" />
                    <Text style={[styles.toggleLabel, { color: colors.foreground }]}>Milestone Celebrations</Text>
                  </View>
                  <Text style={[styles.toggleDesc, { color: colors.muted }]}>
                    Celebrate streak milestones (3, 7, 14, 30, 50, 100 days)
                  </Text>
                </View>
                <Switch
                  value={settings.milestoneCelebrations}
                  onValueChange={v => updateSetting("milestoneCelebrations", v)}
                  trackColor={{ true: colors.primary }}
                />
              </View>
            </View>

            {/* Rest Day Reminders */}
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.toggleRow}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <MaterialIcons name="self-improvement" size={18} color="#10B981" />
                    <Text style={[styles.toggleLabel, { color: colors.foreground }]}>Rest Day Reminders</Text>
                  </View>
                  <Text style={[styles.toggleDesc, { color: colors.muted }]}>
                    Recovery-focused messages on your off days
                  </Text>
                </View>
                <Switch
                  value={settings.restDayReminders}
                  onValueChange={v => updateSetting("restDayReminders", v)}
                  trackColor={{ true: colors.primary }}
                />
              </View>
            </View>

            {/* Morning Boost */}
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.toggleRow}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <MaterialIcons name="wb-sunny" size={18} color="#FBBF24" />
                    <Text style={[styles.toggleLabel, { color: colors.foreground }]}>Morning Boost</Text>
                  </View>
                  <Text style={[styles.toggleDesc, { color: colors.muted }]}>
                    Daily morning motivation with your plan for the day
                  </Text>
                </View>
                <Switch
                  value={settings.morningBoost}
                  onValueChange={v => updateSetting("morningBoost", v)}
                  trackColor={{ true: colors.primary }}
                />
              </View>
            </View>

            {/* Evening Push */}
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.toggleRow}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <MaterialIcons name="nightlight" size={18} color="#8B5CF6" />
                    <Text style={[styles.toggleLabel, { color: colors.foreground }]}>Evening Push</Text>
                  </View>
                  <Text style={[styles.toggleDesc, { color: colors.muted }]}>
                    Last-chance reminder if you haven't trained on a workout day
                  </Text>
                </View>
                <Switch
                  value={settings.eveningPush}
                  onValueChange={v => updateSetting("eveningPush", v)}
                  trackColor={{ true: colors.primary }}
                />
              </View>
            </View>

            {/* Last Evaluated */}
            {lastEval && (
              <View style={styles.section}>
                <Text style={[styles.footerText, { color: colors.muted }]}>
                  Last evaluated: {new Date(lastEval).toLocaleString()}
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5, gap: 12 },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: "700", flex: 1 },
  section: { paddingHorizontal: 16, marginTop: 16 },
  description: { fontSize: 14, lineHeight: 20 },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 4 },
  sectionDesc: { fontSize: 13, lineHeight: 18, marginBottom: 12 },
  card: { marginHorizontal: 16, marginTop: 10, borderRadius: 14, padding: 14, borderWidth: 1 },
  toggleRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  toggleLabel: { fontSize: 15, fontWeight: "600" },
  toggleDesc: { fontSize: 12, lineHeight: 16, marginTop: 2 },
  daysRow: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  dayChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5 },
  dayChipText: { fontSize: 13, fontWeight: "600" },
  timeAdjust: { flexDirection: "row", alignItems: "center", gap: 12 },
  timeBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  timeBtnSmall: { width: 28, height: 28, borderRadius: 8, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  timeValue: { fontSize: 18, fontWeight: "700", minWidth: 80, textAlign: "center" },
  timeValueSmall: { fontSize: 14, fontWeight: "600", minWidth: 70, textAlign: "center" },
  quietRow: { flexDirection: "row", gap: 16 },
  quietItem: { flex: 1 },
  quietLabel: { fontSize: 12, fontWeight: "500", marginBottom: 6 },
  footerText: { fontSize: 12, textAlign: "center", marginTop: 8 },
});
