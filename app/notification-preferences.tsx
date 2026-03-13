import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  StyleSheet,
  Platform,
  Modal,
} from "react-native";
import * as Notifications from "expo-notifications";
import { ScreenContainer } from "@/components/screen-container";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  requestNotificationPermissions,
  scheduleWorkoutReminder,
  scheduleMealLogReminder,
  scheduleDailyCheckInReminder,
  cancelAllReminders,
} from "@/lib/notifications";

const PREF_KEY = "@notif_preferences";

interface NotifPrefs {
  workoutEnabled: boolean;
  workoutHour: number;
  workoutMinute: number;
  mealEnabled: boolean;
  mealHour: number;
  mealMinute: number;
  checkinEnabled: boolean;
  checkinHour: number;
  checkinMinute: number;
}

const DEFAULT_PREFS: NotifPrefs = {
  workoutEnabled: true,
  workoutHour: 8,
  workoutMinute: 0,
  mealEnabled: true,
  mealHour: 12,
  mealMinute: 30,
  checkinEnabled: true,
  checkinHour: 7,
  checkinMinute: 0,
};

function formatTime(hour: number, minute: number): string {
  const h = hour % 12 === 0 ? 12 : hour % 12;
  const m = minute.toString().padStart(2, "0");
  const ampm = hour < 12 ? "AM" : "PM";
  return `${h}:${m} ${ampm}`;
}

interface TimePickerModalProps {
  visible: boolean;
  hour: number;
  minute: number;
  title: string;
  onConfirm: (hour: number, minute: number) => void;
  onCancel: () => void;
}

function TimePickerModal({ visible, hour, minute, title, onConfirm, onCancel }: TimePickerModalProps) {
  const [selectedHour, setSelectedHour] = useState(hour);
  const [selectedMinute, setSelectedMinute] = useState(minute);

  useEffect(() => {
    setSelectedHour(hour);
    setSelectedMinute(minute);
  }, [hour, minute, visible]);

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = [0, 15, 30, 45];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>{title}</Text>

          <View style={styles.pickerRow}>
            {/* Hour picker */}
            <View style={styles.pickerCol}>
              <Text style={styles.pickerLabel}>Hour</Text>
              <ScrollView style={styles.pickerScroll} showsVerticalScrollIndicator={false}>
                {hours.map((h) => (
                  <TouchableOpacity
                    key={h}
                    style={[styles.pickerItem, selectedHour === h && styles.pickerItemActive]}
                    onPress={() => setSelectedHour(h)}
                  >
                    <Text style={[styles.pickerItemText, selectedHour === h && styles.pickerItemTextActive]}>
                      {h === 0 ? "12 AM" : h < 12 ? `${h} AM` : h === 12 ? "12 PM" : `${h - 12} PM`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Minute picker */}
            <View style={styles.pickerCol}>
              <Text style={styles.pickerLabel}>Minute</Text>
              <ScrollView style={styles.pickerScroll} showsVerticalScrollIndicator={false}>
                {minutes.map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[styles.pickerItem, selectedMinute === m && styles.pickerItemActive]}
                    onPress={() => setSelectedMinute(m)}
                  >
                    <Text style={[styles.pickerItemText, selectedMinute === m && styles.pickerItemTextActive]}>
                      :{m.toString().padStart(2, "0")}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>

          <Text style={styles.previewTime}>
            Selected: {formatTime(selectedHour, selectedMinute)}
          </Text>

          <View style={styles.modalBtns}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={() => onConfirm(selectedHour, selectedMinute)}
            >
              <Text style={styles.confirmBtnText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function NotificationPreferencesScreen() {
  const router = useRouter();
  const [prefs, setPrefs] = useState<NotifPrefs>(DEFAULT_PREFS);
  const [saving, setSaving] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [activePicker, setActivePicker] = useState<"workout" | "meal" | "checkin" | null>(null);

  useEffect(() => {
    loadPrefs();
    checkPermission();
  }, []);

  const checkPermission = async () => {
    if (Platform.OS === "web") return;
    const { status } = await Notifications.getPermissionsAsync();
    setHasPermission(status === "granted");
  };

  const loadPrefs = async () => {
    try {
      const stored = await AsyncStorage.getItem(PREF_KEY);
      if (stored) setPrefs(JSON.parse(stored));
    } catch {}
  };

  const savePrefs = async (newPrefs: NotifPrefs) => {
    setSaving(true);
    try {
      await AsyncStorage.setItem(PREF_KEY, JSON.stringify(newPrefs));

      if (!hasPermission) {
        const granted = await requestNotificationPermissions();
        setHasPermission(granted);
        if (!granted) {
          Alert.alert(
            "Notifications Disabled",
            "Please enable notifications in your device settings to receive reminders.",
            [{ text: "OK" }]
          );
          setSaving(false);
          return;
        }
      }

      // Reschedule based on new preferences
      if (newPrefs.workoutEnabled) {
        await scheduleWorkoutReminder(newPrefs.workoutHour, newPrefs.workoutMinute);
      }
      if (newPrefs.mealEnabled) {
        await scheduleMealLogReminder(newPrefs.mealHour, newPrefs.mealMinute);
      }
      if (newPrefs.checkinEnabled) {
        await scheduleDailyCheckInReminder(newPrefs.checkinHour, newPrefs.checkinMinute);
      }

      Alert.alert("✅ Saved", "Your notification preferences have been updated.");
    } catch (e) {
      Alert.alert("Error", "Could not save preferences. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const toggleNotif = async (type: "workout" | "meal" | "checkin") => {
    const updated = { ...prefs };
    if (type === "workout") updated.workoutEnabled = !prefs.workoutEnabled;
    if (type === "meal") updated.mealEnabled = !prefs.mealEnabled;
    if (type === "checkin") updated.checkinEnabled = !prefs.checkinEnabled;
    setPrefs(updated);
    await savePrefs(updated);
  };

  const handleTimeConfirm = async (hour: number, minute: number) => {
    const updated = { ...prefs };
    if (activePicker === "workout") {
      updated.workoutHour = hour;
      updated.workoutMinute = minute;
    } else if (activePicker === "meal") {
      updated.mealHour = hour;
      updated.mealMinute = minute;
    } else if (activePicker === "checkin") {
      updated.checkinHour = hour;
      updated.checkinMinute = minute;
    }
    setPrefs(updated);
    setActivePicker(null);
    await savePrefs(updated);
  };

  const handleRequestPermission = async () => {
    const granted = await requestNotificationPermissions();
    setHasPermission(granted);
    if (granted) {
      Alert.alert("✅ Notifications Enabled", "You'll now receive reminders from PeakPulse AI.");
    } else {
      Alert.alert(
        "Permission Required",
        "Please go to Settings → Notifications → PeakPulse AI and enable notifications.",
        [{ text: "OK" }]
      );
    }
  };

  return (
    <ScreenContainer edges={["top", "left", "right"]} containerClassName="bg-black">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notification Preferences</Text>
          <Text style={styles.headerSub}>Choose when PeakPulse AI reminds you</Text>
        </View>

        {/* Permission Banner */}
        {!hasPermission && Platform.OS !== "web" && (
          <TouchableOpacity style={styles.permBanner} onPress={handleRequestPermission}>
            <Text style={styles.permBannerIcon}>🔔</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.permBannerTitle}>Enable Notifications</Text>
              <Text style={styles.permBannerSub}>Tap to allow PeakPulse AI to send you reminders</Text>
            </View>
            <Text style={styles.permBannerArrow}>→</Text>
          </TouchableOpacity>
        )}

        {/* Workout Reminder */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>💪</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>Workout Reminder</Text>
              <Text style={styles.sectionSub}>Daily nudge to complete your workout</Text>
            </View>
            <Switch
              value={prefs.workoutEnabled}
              onValueChange={() => toggleNotif("workout")}
              trackColor={{ false: "#333", true: "#10B981" }}
              thumbColor={prefs.workoutEnabled ? "#fff" : "#888"}
            />
          </View>
          {prefs.workoutEnabled && (
            <TouchableOpacity
              style={styles.timeRow}
              onPress={() => setActivePicker("workout")}
            >
              <Text style={styles.timeLabel}>Reminder Time</Text>
              <View style={styles.timeValue}>
                <Text style={styles.timeValueText}>
                  {formatTime(prefs.workoutHour, prefs.workoutMinute)}
                </Text>
                <Text style={styles.timeEditIcon}>✏️</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* Meal Log Reminder */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>🥗</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>Meal Log Reminder</Text>
              <Text style={styles.sectionSub}>Nudge to log your meals and track nutrition</Text>
            </View>
            <Switch
              value={prefs.mealEnabled}
              onValueChange={() => toggleNotif("meal")}
              trackColor={{ false: "#333", true: "#10B981" }}
              thumbColor={prefs.mealEnabled ? "#fff" : "#888"}
            />
          </View>
          {prefs.mealEnabled && (
            <TouchableOpacity
              style={styles.timeRow}
              onPress={() => setActivePicker("meal")}
            >
              <Text style={styles.timeLabel}>Reminder Time</Text>
              <View style={styles.timeValue}>
                <Text style={styles.timeValueText}>
                  {formatTime(prefs.mealHour, prefs.mealMinute)}
                </Text>
                <Text style={styles.timeEditIcon}>✏️</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* Daily Check-In Reminder */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>📸</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>Daily Check-In</Text>
              <Text style={styles.sectionSub}>Reminder to take your daily progress photo</Text>
            </View>
            <Switch
              value={prefs.checkinEnabled}
              onValueChange={() => toggleNotif("checkin")}
              trackColor={{ false: "#333", true: "#10B981" }}
              thumbColor={prefs.checkinEnabled ? "#fff" : "#888"}
            />
          </View>
          {prefs.checkinEnabled && (
            <TouchableOpacity
              style={styles.timeRow}
              onPress={() => setActivePicker("checkin")}
            >
              <Text style={styles.timeLabel}>Reminder Time</Text>
              <View style={styles.timeValue}>
                <Text style={styles.timeValueText}>
                  {formatTime(prefs.checkinHour, prefs.checkinMinute)}
                </Text>
                <Text style={styles.timeEditIcon}>✏️</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* Summary card */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>📅 Your Schedule</Text>
          {prefs.workoutEnabled && (
            <Text style={styles.summaryItem}>
              💪 Workout reminder at {formatTime(prefs.workoutHour, prefs.workoutMinute)} daily
            </Text>
          )}
          {prefs.mealEnabled && (
            <Text style={styles.summaryItem}>
              🥗 Meal log nudge at {formatTime(prefs.mealHour, prefs.mealMinute)} daily
            </Text>
          )}
          {prefs.checkinEnabled && (
            <Text style={styles.summaryItem}>
              📸 Check-in reminder at {formatTime(prefs.checkinHour, prefs.checkinMinute)} daily
            </Text>
          )}
          {!prefs.workoutEnabled && !prefs.mealEnabled && !prefs.checkinEnabled && (
            <Text style={styles.summaryItem}>All reminders are currently off.</Text>
          )}
        </View>

        {/* Tip */}
        <View style={styles.tipCard}>
          <Text style={styles.tipText}>
            💡 <Text style={{ fontFamily: "Outfit_700Bold" }}>Pro tip:</Text> Users who receive daily reminders are 3× more likely to hit their fitness goals. Keep at least one reminder on!
          </Text>
        </View>
      </ScrollView>

      {/* Time Picker Modal */}
      <TimePickerModal
        visible={activePicker !== null}
        hour={
          activePicker === "workout" ? prefs.workoutHour :
          activePicker === "meal" ? prefs.mealHour :
          prefs.checkinHour
        }
        minute={
          activePicker === "workout" ? prefs.workoutMinute :
          activePicker === "meal" ? prefs.mealMinute :
          prefs.checkinMinute
        }
        title={
          activePicker === "workout" ? "Set Workout Reminder" :
          activePicker === "meal" ? "Set Meal Log Reminder" :
          "Set Check-In Reminder"
        }
        onConfirm={handleTimeConfirm}
        onCancel={() => setActivePicker(null)}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    padding: 20,
    paddingTop: 8,
    backgroundColor: "#0a0a0a",
    borderBottomWidth: 1,
    borderBottomColor: "#1a1a2e",
  },
  backBtn: {
    marginBottom: 12,
  },
  backText: {
    color: "#10B981",
    fontSize: 16,
    fontFamily: "DMSans_600SemiBold",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 26,
    fontFamily: "Outfit_800ExtraBold",
    marginBottom: 4,
  },
  headerSub: {
    color: "#888",
    fontSize: 14,
  },
  permBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1a1a2e",
    margin: 16,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#10B981",
    gap: 12,
  },
  permBannerIcon: {
    fontSize: 24,
  },
  permBannerTitle: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Outfit_700Bold",
  },
  permBannerSub: {
    color: "#888",
    fontSize: 13,
    marginTop: 2,
  },
  permBannerArrow: {
    color: "#10B981",
    fontSize: 18,
    fontFamily: "Outfit_700Bold",
  },
  section: {
    backgroundColor: "#111",
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#1e1e3a",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  sectionIcon: {
    fontSize: 24,
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Outfit_700Bold",
  },
  sectionSub: {
    color: "#888",
    fontSize: 13,
    marginTop: 2,
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: "#1e1e3a",
    backgroundColor: "#0d0d1a",
  },
  timeLabel: {
    color: "#aaa",
    fontSize: 14,
  },
  timeValue: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  timeValueText: {
    color: "#10B981",
    fontSize: 16,
    fontFamily: "Outfit_700Bold",
  },
  timeEditIcon: {
    fontSize: 14,
  },
  summaryCard: {
    backgroundColor: "#111",
    marginHorizontal: 16,
    marginTop: 20,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#1e1e3a",
  },
  summaryTitle: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Outfit_700Bold",
    marginBottom: 10,
  },
  summaryItem: {
    color: "#ccc",
    fontSize: 14,
    marginBottom: 6,
    lineHeight: 20,
  },
  tipCard: {
    backgroundColor: "#0d1117",
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 3,
    borderLeftColor: "#10B981",
  },
  tipText: {
    color: "#aaa",
    fontSize: 13,
    lineHeight: 20,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#111",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    borderTopWidth: 1,
    borderColor: "#1e1e3a",
  },
  modalTitle: {
    color: "#fff",
    fontSize: 18,
    fontFamily: "Outfit_800ExtraBold",
    textAlign: "center",
    marginBottom: 20,
  },
  pickerRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 16,
  },
  pickerCol: {
    flex: 1,
  },
  pickerLabel: {
    color: "#888",
    fontSize: 12,
    fontFamily: "DMSans_600SemiBold",
    textAlign: "center",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  pickerScroll: {
    height: 200,
    backgroundColor: "#0d0d1a",
    borderRadius: 12,
  },
  pickerItem: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: "center",
  },
  pickerItemActive: {
    backgroundColor: "#7C3AED22",
    borderRadius: 8,
  },
  pickerItemText: {
    color: "#888",
    fontSize: 15,
  },
  pickerItemTextActive: {
    color: "#10B981",
    fontFamily: "Outfit_700Bold",
  },
  previewTime: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Outfit_700Bold",
    textAlign: "center",
    marginBottom: 20,
  },
  modalBtns: {
    flexDirection: "row",
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: "#1e1e3a",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  cancelBtnText: {
    color: "#aaa",
    fontSize: 15,
    fontFamily: "DMSans_600SemiBold",
  },
  confirmBtn: {
    flex: 1,
    backgroundColor: "#10B981",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  confirmBtnText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Outfit_700Bold",
  },
});
