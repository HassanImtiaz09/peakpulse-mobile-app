import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  Platform, Switch, Alert, ActivityIndicator,
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
  muted: "#92400E",
  gold: "#F59E0B",
  gold2: "#FBBF24",
  gold3: "#FDE68A",
  green: "#22C55E",
  red: "#EF4444",
  blue: "#3B82F6",
  border: "rgba(245,158,11,0.12)",
  border2: "rgba(245,158,11,0.25)",
};

interface ToggleRowProps {
  icon: string;
  iconColor: string;
  label: string;
  description: string;
  value: boolean;
  onToggle: (v: boolean) => void;
  timeLabel?: string;
}

function ToggleRow({ icon, iconColor, label, description, value, onToggle, timeLabel }: ToggleRowProps) {
  return (
    <View style={styles.row}>
      <View style={[styles.iconCircle, { backgroundColor: iconColor + "15" }]}>
        <MaterialIcons name={icon as any} size={20} color={iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowDesc}>{description}</Text>
        {timeLabel && value ? (
          <Text style={styles.timeLabel}>{timeLabel}</Text>
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

function formatTime(h: number, m: number): string {
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, "0")} ${ampm}`;
}

export default function NotificationSettingsScreen() {
  const router = useRouter();
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [scheduledCount, setScheduledCount] = useState(0);
  const [permGranted, setPermGranted] = useState(false);

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
    const updated = { ...prefs, [key]: value };
    setPrefs(updated);
    await saveNotificationPreferences({ [key]: value });
  }, [prefs]);

  const handleSaveAndSchedule = useCallback(async () => {
    setSaving(true);
    try {
      // Request permissions if not granted
      if (!permGranted) {
        const granted = await requestNotificationPermissions();
        setPermGranted(granted);
        if (!granted) {
          Alert.alert("Permission Required", "Please enable notifications in your device settings to receive reminders.");
          setSaving(false);
          return;
        }
      }

      await scheduleAllAINotifications();
      const count = await getScheduledAINotificationCount();
      setScheduledCount(count);
      Alert.alert("Notifications Updated", `${count} AI reminder${count !== 1 ? "s" : ""} scheduled. You'll receive personalised notifications at the times you've set.`);
    } catch (err) {
      Alert.alert("Error", "Failed to schedule notifications. Please try again.");
    } finally {
      setSaving(false);
    }
  }, [permGranted]);

  const handleDisableAll = useCallback(async () => {
    Alert.alert(
      "Disable All Reminders?",
      "This will cancel all scheduled AI notifications. You can re-enable them anytime.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Disable All",
          style: "destructive",
          onPress: async () => {
            await cancelAllAINotifications();
            if (prefs) {
              const allOff: Partial<NotificationPreferences> = {
                mealReminders: false,
                workoutNudges: false,
                morningMotivation: false,
                eveningRecap: false,
                pantryAlerts: false,
                snackReminder: false,
              };
              const updated = { ...prefs, ...allOff };
              setPrefs(updated);
              await saveNotificationPreferences(allOff);
            }
            setScheduledCount(0);
          },
        },
      ],
    );
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
        {/* Status Card */}
        <View style={styles.statusCard}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <MaterialIcons name="notifications-active" size={24} color={permGranted ? SF.green : SF.red} />
            <View>
              <Text style={styles.statusTitle}>
                {permGranted ? `${scheduledCount} Active Reminder${scheduledCount !== 1 ? "s" : ""}` : "Notifications Disabled"}
              </Text>
              <Text style={styles.statusDesc}>
                {permGranted
                  ? "AI-powered reminders personalised to your routine"
                  : "Enable notifications to receive meal and workout reminders"}
              </Text>
            </View>
          </View>
        </View>

        {/* Meal Reminders Section */}
        <Text style={styles.sectionTitle}>Meal Reminders</Text>
        <View style={styles.section}>
          <ToggleRow
            icon="restaurant"
            iconColor={SF.gold}
            label="Meal Reminders"
            description="Breakfast, lunch, and dinner notifications"
            value={prefs.mealReminders}
            onToggle={(v) => handleToggle("mealReminders", v)}
            timeLabel={`🍳 ${formatTime(prefs.breakfastHour, prefs.breakfastMinute)}  🥗 ${formatTime(prefs.lunchHour, prefs.lunchMinute)}  🍽️ ${formatTime(prefs.dinnerHour, prefs.dinnerMinute)}`}
          />
          <View style={styles.divider} />
          <ToggleRow
            icon="apple"
            iconColor="#22C55E"
            label="Snack Reminder"
            description="Afternoon snack at 3:00 PM"
            value={prefs.snackReminder}
            onToggle={(v) => handleToggle("snackReminder", v)}
            timeLabel="🍎 3:00 PM"
          />
        </View>

        {/* Workout Section */}
        <Text style={styles.sectionTitle}>Workout & Activity</Text>
        <View style={styles.section}>
          <ToggleRow
            icon="fitness-center"
            iconColor="#EF4444"
            label="Workout Nudges"
            description="Daily workout reminder with streak motivation"
            value={prefs.workoutNudges}
            onToggle={(v) => handleToggle("workoutNudges", v)}
            timeLabel={`💪 ${formatTime(prefs.workoutHour, prefs.workoutMinute)}`}
          />
        </View>

        {/* Motivation & Recap */}
        <Text style={styles.sectionTitle}>Motivation & Insights</Text>
        <View style={styles.section}>
          <ToggleRow
            icon="wb-sunny"
            iconColor="#FBBF24"
            label="Morning Motivation"
            description="Start your day with an AI-powered motivational message"
            value={prefs.morningMotivation}
            onToggle={(v) => handleToggle("morningMotivation", v)}
            timeLabel={`☀️ ${formatTime(prefs.morningHour, prefs.morningMinute)}`}
          />
          <View style={styles.divider} />
          <ToggleRow
            icon="insights"
            iconColor="#8B5CF6"
            label="Evening Recap"
            description="Daily summary of calories, workouts, and streak"
            value={prefs.eveningRecap}
            onToggle={(v) => handleToggle("eveningRecap", v)}
            timeLabel={`🌙 ${formatTime(prefs.eveningHour, prefs.eveningMinute)}`}
          />
        </View>

        {/* Pantry */}
        <Text style={styles.sectionTitle}>Pantry & Nutrition</Text>
        <View style={styles.section}>
          <ToggleRow
            icon="kitchen"
            iconColor="#3B82F6"
            label="Pantry Expiry Alerts"
            description="Get notified when pantry items are about to expire"
            value={prefs.pantryAlerts}
            onToggle={(v) => handleToggle("pantryAlerts", v)}
            timeLabel="⚠️ 6:00 PM daily"
          />
        </View>

        {/* Action Buttons */}
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
          <Text style={styles.saveBtnText}>{saving ? "Scheduling..." : "Save & Schedule Notifications"}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.disableBtn} onPress={handleDisableAll}>
          <MaterialIcons name="notifications-off" size={18} color={SF.red} />
          <Text style={styles.disableBtnText}>Disable All Reminders</Text>
        </TouchableOpacity>

        {/* Info */}
        <View style={styles.infoCard}>
          <MaterialIcons name="info-outline" size={16} color={SF.muted} />
          <Text style={styles.infoText}>
            AI reminders are personalised based on your name, streak, goals, and pantry data. Messages rotate daily to keep things fresh. Notifications work even when the app is closed.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SF.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: Platform.OS === "ios" ? 60 : 44,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: SF.border,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "rgba(245,158,11,0.10)",
    alignItems: "center", justifyContent: "center",
  },
  headerTitle: { color: SF.fg, fontFamily: "Outfit_700Bold", fontSize: 20 },
  statusCard: {
    backgroundColor: SF.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: SF.border,
  },
  statusTitle: { color: SF.fg, fontFamily: "Outfit_700Bold", fontSize: 16 },
  statusDesc: { color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 12, marginTop: 2 },
  sectionTitle: {
    color: SF.gold3,
    fontFamily: "Outfit_700Bold",
    fontSize: 13,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 10,
    marginTop: 4,
  },
  section: {
    backgroundColor: SF.surface,
    borderRadius: 16,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: SF.border,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
  },
  iconCircle: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: "center", justifyContent: "center",
  },
  rowLabel: { color: SF.fg, fontFamily: "Outfit_700Bold", fontSize: 15 },
  rowDesc: { color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 12, marginTop: 1 },
  timeLabel: { color: SF.gold2, fontFamily: "DMSans_600SemiBold", fontSize: 11, marginTop: 4 },
  divider: { height: 1, backgroundColor: SF.border, marginHorizontal: 14 },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: SF.gold,
    borderRadius: 16,
    paddingVertical: 16,
    marginTop: 8,
  },
  saveBtnText: { color: SF.bg, fontFamily: "Outfit_700Bold", fontSize: 16 },
  disableBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "rgba(239,68,68,0.08)",
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.15)",
  },
  disableBtnText: { color: SF.red, fontFamily: "DMSans_600SemiBold", fontSize: 14 },
  infoCard: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: "rgba(245,158,11,0.04)",
    borderRadius: 12,
    padding: 14,
    marginTop: 20,
    borderWidth: 1,
    borderColor: SF.border,
  },
  infoText: { color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 12, lineHeight: 18, flex: 1 },
});
