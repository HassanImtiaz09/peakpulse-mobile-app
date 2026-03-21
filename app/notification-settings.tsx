import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  Platform, Switch, Alert, ActivityIndicator, Modal,
} from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import * as Notifications from "expo-notifications";
import {
  getNotificationPreferences,
  saveNotificationPreferences,
  scheduleAllAINotifications,
  cancelAllAINotifications,
  getScheduledAINotificationCount,
  type NotificationPreferences,
} from "@/lib/ai-notification-scheduler";
import { requestNotificationPermissions } from "@/lib/notifications";

const SF = {
  bg: "#0A0500",
  surface: "#150A00",
  fg: "#FFF7ED",
  muted: "#B45309",
  mutedBright: "#B45309",
  gold: "#F59E0B",
  gold2: "#FBBF24",
  gold3: "#FDE68A",
  green: "#22C55E",
  red: "#EF4444",
  blue: "#3B82F6",
  border: "rgba(245,158,11,0.12)",
};

// ── Time Picker Modal ──

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

function fmt(h: number, m: number): string {
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${m.toString().padStart(2, "0")} ${ampm}`;
}

interface TimePickerModalProps {
  visible: boolean;
  title: string;
  hour: number;
  minute: number;
  onConfirm: (h: number, m: number) => void;
  onCancel: () => void;
}

function TimePickerModal({ visible, title, hour, minute, onConfirm, onCancel }: TimePickerModalProps) {
  const [h, setH] = useState(hour);
  const [m, setM] = useState(minute);

  useEffect(() => { setH(hour); setM(minute); }, [hour, minute]);

  // Snap to nearest valid minute
  const snapMinute = (val: number) => MINUTES.reduce((prev, curr) => Math.abs(curr - val) < Math.abs(prev - val) ? curr : prev, 0);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={tpStyles.overlay}>
        <View style={tpStyles.card}>
          <Text style={tpStyles.title}>{title}</Text>
          <Text style={tpStyles.preview}>{fmt(h, m)}</Text>

          {/* Hour selector */}
          <Text style={tpStyles.label}>Hour</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={tpStyles.scroll} contentContainerStyle={tpStyles.scrollContent}>
            {HOURS.map(hr => (
              <TouchableOpacity
                key={hr}
                onPress={() => setH(hr)}
                style={[tpStyles.chip, h === hr && tpStyles.chipActive]}
              >
                <Text style={[tpStyles.chipText, h === hr && tpStyles.chipTextActive]}>
                  {hr % 12 || 12}{hr < 12 ? "a" : "p"}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Minute selector */}
          <Text style={tpStyles.label}>Minute</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={tpStyles.scroll} contentContainerStyle={tpStyles.scrollContent}>
            {MINUTES.map(mn => (
              <TouchableOpacity
                key={mn}
                onPress={() => setM(mn)}
                style={[tpStyles.chip, m === mn && tpStyles.chipActive]}
              >
                <Text style={[tpStyles.chipText, m === mn && tpStyles.chipTextActive]}>
                  :{mn.toString().padStart(2, "0")}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={tpStyles.actions}>
            <TouchableOpacity onPress={onCancel} style={tpStyles.cancelBtn}>
              <Text style={tpStyles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onConfirm(h, snapMinute(m))} style={tpStyles.confirmBtn}>
              <Text style={tpStyles.confirmText}>Set Time</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const tpStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center", padding: 24 },
  card: { backgroundColor: "#1A0F00", borderRadius: 20, padding: 24, borderWidth: 1, borderColor: "rgba(245,158,11,0.20)" },
  title: { color: "#FFF7ED", fontFamily: "Outfit_700Bold", fontSize: 18, textAlign: "center" },
  preview: { color: "#F59E0B", fontFamily: "Outfit_800ExtraBold", fontSize: 32, textAlign: "center", marginTop: 8, marginBottom: 16 },
  label: { color: "#FBBF24", fontFamily: "DMSans_600SemiBold", fontSize: 12, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8, marginTop: 4 },
  scroll: { maxHeight: 44, marginBottom: 12 },
  scrollContent: { gap: 6, paddingRight: 8 },
  chip: { height: 36, minWidth: 44, borderRadius: 18, backgroundColor: "rgba(245,158,11,0.08)", alignItems: "center", justifyContent: "center", paddingHorizontal: 12, borderWidth: 1, borderColor: "rgba(245,158,11,0.10)" },
  chipActive: { backgroundColor: "#F59E0B", borderColor: "#F59E0B" },
  chipText: { color: "#B45309", fontFamily: "DMSans_600SemiBold", fontSize: 14 },
  chipTextActive: { color: "#0A0500" },
  actions: { flexDirection: "row", gap: 12, marginTop: 8 },
  cancelBtn: { flex: 1, alignItems: "center", paddingVertical: 14, borderRadius: 14, backgroundColor: "rgba(245,158,11,0.06)", borderWidth: 1, borderColor: "rgba(245,158,11,0.12)" },
  cancelText: { color: "#B45309", fontFamily: "DMSans_600SemiBold", fontSize: 15 },
  confirmBtn: { flex: 1, alignItems: "center", paddingVertical: 14, borderRadius: 14, backgroundColor: "#F59E0B" },
  confirmText: { color: "#0A0500", fontFamily: "Outfit_700Bold", fontSize: 15 },
});

// ── Toggle Row with optional time picker ──

interface ToggleRowProps {
  icon: string;
  iconColor: string;
  label: string;
  desc: string;
  value: boolean;
  onToggle: (v: boolean) => void;
  timeLabel?: string;
  onTimePress?: () => void;
}

function ToggleRow({ icon, iconColor, label, desc, value, onToggle, timeLabel, onTimePress }: ToggleRowProps) {
  return (
    <View style={styles.row}>
      <View style={[styles.iconCircle, { backgroundColor: iconColor + "15" }]}>
        <MaterialIcons name={icon as any} size={20} color={iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowDesc}>{desc}</Text>
        {timeLabel && value ? (
          <TouchableOpacity
            onPress={onTimePress}
            style={styles.timePill}
            disabled={!onTimePress}
          >
            <MaterialIcons name="schedule" size={12} color={SF.gold2} />
            <Text style={styles.timeLabel}>{timeLabel}</Text>
            {onTimePress ? <MaterialIcons name="edit" size={11} color={SF.mutedBright} /> : null}
          </TouchableOpacity>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: "rgba(245,158,11,0.10)", true: SF.gold + "60" }}
        thumbColor={value ? SF.gold : "#555"}
        ios_backgroundColor="rgba(245,158,11,0.10)"
      />
    </View>
  );
}

// ── Main Screen ──

export default function NotificationSettingsScreen() {
  const router = useRouter();
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [scheduledCount, setScheduledCount] = useState(0);
  const [permGranted, setPermGranted] = useState(false);

  // Time picker state
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerTitle, setPickerTitle] = useState("");
  const [pickerHour, setPickerHour] = useState(8);
  const [pickerMinute, setPickerMinute] = useState(0);
  const [pickerKey, setPickerKey] = useState<{ h: keyof NotificationPreferences; m: keyof NotificationPreferences } | null>(null);

  useEffect(() => {
    (async () => {
      const p = await getNotificationPreferences();
      setPrefs(p);
      const count = await getScheduledAINotificationCount();
      setScheduledCount(count);
      if (Platform.OS !== "web") {
        const { status } = await Notifications.getPermissionsAsync();
        setPermGranted(status === "granted");
      }
      setLoading(false);
    })();
  }, []);

  const handleToggle = useCallback(async (key: keyof NotificationPreferences, value: boolean) => {
    if (!prefs) return;
    setPrefs({ ...prefs, [key]: value });
    await saveNotificationPreferences({ [key]: value });
  }, [prefs]);

  const openTimePicker = (title: string, hKey: keyof NotificationPreferences, mKey: keyof NotificationPreferences) => {
    if (!prefs) return;
    setPickerTitle(title);
    setPickerHour(prefs[hKey] as number);
    setPickerMinute(prefs[mKey] as number);
    setPickerKey({ h: hKey, m: mKey });
    setPickerVisible(true);
  };

  const handleTimeConfirm = useCallback(async (h: number, m: number) => {
    if (!prefs || !pickerKey) return;
    const updated = { ...prefs, [pickerKey.h]: h, [pickerKey.m]: m };
    setPrefs(updated);
    await saveNotificationPreferences({ [pickerKey.h]: h, [pickerKey.m]: m });
    setPickerVisible(false);
  }, [prefs, pickerKey]);

  const handleSaveAndSchedule = useCallback(async () => {
    setSaving(true);
    try {
      if (!permGranted) {
        const granted = await requestNotificationPermissions();
        setPermGranted(granted);
        if (!granted) {
          Alert.alert("Permission Required", "Enable notifications in device settings.");
          setSaving(false);
          return;
        }
      }
      await scheduleAllAINotifications();
      const count = await getScheduledAINotificationCount();
      setScheduledCount(count);
      Alert.alert("Done", `${count} reminder${count !== 1 ? "s" : ""} scheduled.`);
    } catch {
      Alert.alert("Error", "Failed to schedule. Try again.");
    } finally {
      setSaving(false);
    }
  }, [permGranted]);

  const handleDisableAll = useCallback(async () => {
    Alert.alert("Disable All?", "All scheduled reminders will be cancelled.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Disable",
        style: "destructive",
        onPress: async () => {
          await cancelAllAINotifications();
          if (prefs) {
            const allOff: Partial<NotificationPreferences> = {
              mealReminders: false, workoutNudges: false, morningMotivation: false,
              eveningRecap: false, pantryAlerts: false, snackReminder: false,
            };
            setPrefs({ ...prefs, ...allOff });
            await saveNotificationPreferences(allOff);
          }
          setScheduledCount(0);
        },
      },
    ]);
  }, [prefs]);

  if (loading || !prefs) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator color={SF.gold} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color={SF.fg} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>AI Reminders</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        {/* Status */}
        <View style={styles.statusCard}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <MaterialIcons name="notifications-active" size={22} color={permGranted ? SF.green : SF.red} />
            <View>
              <Text style={styles.statusTitle}>
                {permGranted ? `${scheduledCount} Active` : "Notifications Off"}
              </Text>
              <Text style={styles.statusDesc}>
                {permGranted ? "Tap times to customise" : "Enable to receive reminders"}
              </Text>
            </View>
          </View>
        </View>

        {/* Meals */}
        <Text style={styles.sectionTitle}>Meals</Text>
        <View style={styles.section}>
          <ToggleRow
            icon="restaurant"
            iconColor={SF.gold}
            label="Breakfast"
            desc="Morning meal reminder"
            value={prefs.mealReminders}
            onToggle={(v) => handleToggle("mealReminders", v)}
            timeLabel={fmt(prefs.breakfastHour, prefs.breakfastMinute)}
            onTimePress={() => openTimePicker("Breakfast Time", "breakfastHour", "breakfastMinute")}
          />
          <View style={styles.divider} />
          <ToggleRow
            icon="lunch-dining"
            iconColor="#F97316"
            label="Lunch"
            desc="Midday meal reminder"
            value={prefs.mealReminders}
            onToggle={(v) => handleToggle("mealReminders", v)}
            timeLabel={fmt(prefs.lunchHour, prefs.lunchMinute)}
            onTimePress={() => openTimePicker("Lunch Time", "lunchHour", "lunchMinute")}
          />
          <View style={styles.divider} />
          <ToggleRow
            icon="dinner-dining"
            iconColor="#EF4444"
            label="Dinner"
            desc="Evening meal reminder"
            value={prefs.mealReminders}
            onToggle={(v) => handleToggle("mealReminders", v)}
            timeLabel={fmt(prefs.dinnerHour, prefs.dinnerMinute)}
            onTimePress={() => openTimePicker("Dinner Time", "dinnerHour", "dinnerMinute")}
          />
          <View style={styles.divider} />
          <ToggleRow
            icon="apple"
            iconColor="#22C55E"
            label="Snack"
            desc="Afternoon snack nudge"
            value={prefs.snackReminder}
            onToggle={(v) => handleToggle("snackReminder", v)}
            timeLabel="3:00 PM"
          />
        </View>

        {/* Workout */}
        <Text style={styles.sectionTitle}>Workout</Text>
        <View style={styles.section}>
          <ToggleRow
            icon="fitness-center"
            iconColor="#EF4444"
            label="Workout Nudge"
            desc="Daily training reminder"
            value={prefs.workoutNudges}
            onToggle={(v) => handleToggle("workoutNudges", v)}
            timeLabel={fmt(prefs.workoutHour, prefs.workoutMinute)}
            onTimePress={() => openTimePicker("Workout Time", "workoutHour", "workoutMinute")}
          />
        </View>

        {/* Motivation */}
        <Text style={styles.sectionTitle}>Motivation</Text>
        <View style={styles.section}>
          <ToggleRow
            icon="wb-sunny"
            iconColor="#FBBF24"
            label="Morning Boost"
            desc="Start your day motivated"
            value={prefs.morningMotivation}
            onToggle={(v) => handleToggle("morningMotivation", v)}
            timeLabel={fmt(prefs.morningHour, prefs.morningMinute)}
            onTimePress={() => openTimePicker("Morning Motivation", "morningHour", "morningMinute")}
          />
          <View style={styles.divider} />
          <ToggleRow
            icon="insights"
            iconColor="#8B5CF6"
            label="Evening Recap"
            desc="Daily progress summary"
            value={prefs.eveningRecap}
            onToggle={(v) => handleToggle("eveningRecap", v)}
            timeLabel={fmt(prefs.eveningHour, prefs.eveningMinute)}
            onTimePress={() => openTimePicker("Evening Recap", "eveningHour", "eveningMinute")}
          />
        </View>

        {/* Pantry & Weekly */}
        <Text style={styles.sectionTitle}>Nutrition</Text>
        <View style={styles.section}>
          <ToggleRow
            icon="kitchen"
            iconColor="#3B82F6"
            label="Pantry Expiry"
            desc="Items expiring soon"
            value={prefs.pantryAlerts}
            onToggle={(v) => handleToggle("pantryAlerts", v)}
            timeLabel="6:00 PM"
          />
          <View style={styles.divider} />
          <ToggleRow
            icon="bar-chart"
            iconColor="#10B981"
            label="Weekly Summary"
            desc="Sunday calorie & macro recap"
            value={(prefs as any).weeklySummary ?? true}
            onToggle={(v) => handleToggle("weeklySummary" as any, v)}
            timeLabel="Sun 7:00 PM"
          />
        </View>

        {/* Actions */}
        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.7 }]}
          onPress={handleSaveAndSchedule}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={SF.bg} size="small" />
          ) : (
            <MaterialIcons name="schedule" size={20} color={SF.bg} />
          )}
          <Text style={styles.saveBtnText}>{saving ? "Scheduling..." : "Save & Schedule"}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.disableBtn} onPress={handleDisableAll}>
          <MaterialIcons name="notifications-off" size={16} color={SF.red} />
          <Text style={styles.disableBtnText}>Disable All</Text>
        </TouchableOpacity>

        <View style={styles.infoCard}>
          <MaterialIcons name="info-outline" size={14} color={SF.mutedBright} />
          <Text style={styles.infoText}>
            Messages rotate daily and personalise based on your streak, goals, and activity.
          </Text>
        </View>
      </ScrollView>

      {/* Time Picker Modal */}
      <TimePickerModal
        visible={pickerVisible}
        title={pickerTitle}
        hour={pickerHour}
        minute={pickerMinute}
        onConfirm={handleTimeConfirm}
        onCancel={() => setPickerVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SF.bg },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingTop: Platform.OS === "ios" ? 60 : 44, paddingHorizontal: 16, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: SF.border,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "rgba(245,158,11,0.10)", alignItems: "center", justifyContent: "center",
  },
  headerTitle: { color: SF.fg, fontFamily: "Outfit_700Bold", fontSize: 20 },
  statusCard: {
    backgroundColor: SF.surface, borderRadius: 16, padding: 14, marginBottom: 20,
    borderWidth: 1, borderColor: SF.border,
  },
  statusTitle: { color: SF.fg, fontFamily: "Outfit_700Bold", fontSize: 15 },
  statusDesc: { color: SF.mutedBright, fontFamily: "DMSans_500Medium", fontSize: 12, marginTop: 1 },
  sectionTitle: {
    color: SF.gold3, fontFamily: "Outfit_700Bold", fontSize: 12,
    textTransform: "uppercase", letterSpacing: 1, marginBottom: 8, marginTop: 4,
  },
  section: {
    backgroundColor: SF.surface, borderRadius: 16, padding: 4, marginBottom: 16,
    borderWidth: 1, borderColor: SF.border,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12 },
  iconCircle: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  rowLabel: { color: SF.fg, fontFamily: "Outfit_700Bold", fontSize: 15 },
  rowDesc: { color: SF.mutedBright, fontFamily: "DMSans_400Regular", fontSize: 12, marginTop: 1 },
  timePill: {
    flexDirection: "row", alignItems: "center", gap: 5, marginTop: 5,
    backgroundColor: "rgba(245,158,11,0.08)", borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 3, alignSelf: "flex-start",
    borderWidth: 1, borderColor: "rgba(245,158,11,0.12)",
  },
  timeLabel: { color: SF.gold2, fontFamily: "DMSans_600SemiBold", fontSize: 12 },
  divider: { height: 1, backgroundColor: SF.border, marginHorizontal: 14 },
  saveBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    backgroundColor: SF.gold, borderRadius: 16, paddingVertical: 16, marginTop: 8,
  },
  saveBtnText: { color: SF.bg, fontFamily: "Outfit_700Bold", fontSize: 16 },
  disableBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: "rgba(239,68,68,0.08)", borderRadius: 14, paddingVertical: 14, marginTop: 12,
    borderWidth: 1, borderColor: "rgba(239,68,68,0.15)",
  },
  disableBtnText: { color: SF.red, fontFamily: "DMSans_600SemiBold", fontSize: 14 },
  infoCard: {
    flexDirection: "row", gap: 8, backgroundColor: "rgba(245,158,11,0.04)",
    borderRadius: 12, padding: 12, marginTop: 16, borderWidth: 1, borderColor: SF.border,
  },
  infoText: { color: SF.mutedBright, fontFamily: "DMSans_400Regular", fontSize: 12, lineHeight: 18, flex: 1 },
});
