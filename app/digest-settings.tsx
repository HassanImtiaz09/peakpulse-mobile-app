import { useState, useEffect, useCallback } from "react";
import {
  Text, View, TouchableOpacity, ScrollView, ImageBackground,
  Platform, Switch, Alert, ActivityIndicator, Modal, FlatList,
} from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import {
  getDigestPreferences,
  saveDigestPreferences,
  scheduleWeeklyDigest,
  cancelWeeklyDigest,
  sendImmediateDigest,
  getLastDigestDate,
  type DigestPreferences,
} from "@/lib/weekly-health-digest";
import { a11yButton, a11yHeader, a11yImage, a11yProgress, a11ySwitch, A11Y_LABELS } from "@/lib/accessibility";
import { UI } from "@/constants/ui-colors";

const DASHBOARD_BG = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/PZcnawJwIZkQHTEM.jpg";

// ── Day & Hour Options ──
const DAYS_OF_WEEK = [
  { value: 0, label: "Sunday", short: "Sun" },
  { value: 1, label: "Monday", short: "Mon" },
  { value: 2, label: "Tuesday", short: "Tue" },
  { value: 3, label: "Wednesday", short: "Wed" },
  { value: 4, label: "Thursday", short: "Thu" },
  { value: 5, label: "Friday", short: "Fri" },
  { value: 6, label: "Saturday", short: "Sat" },
];

const HOURS = Array.from({ length: 24 }, (_, i) => i);

function formatHour(h: number): string {
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:00 ${ampm}`;
}

// ── Main Screen ──
export default function DigestSettingsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [prefs, setPrefs] = useState<DigestPreferences>({ enabled: true, dayOfWeek: 0, hour: 9 });
  const [lastDigestDate, setLastDigestDate] = useState<string | null>(null);
  const [showDayPicker, setShowDayPicker] = useState(false);
  const [showHourPicker, setShowHourPicker] = useState(false);

  // Load preferences
  useEffect(() => {
    (async () => {
      try {
        const [p, lastDate] = await Promise.all([
          getDigestPreferences(),
          getLastDigestDate(),
        ]);
        setPrefs(p);
        setLastDigestDate(lastDate);
      } catch (e) {
        console.warn("[DigestSettings] Failed to load prefs:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Save and reschedule
  const updatePreference = useCallback(async (updates: Partial<DigestPreferences>) => {
    setSaving(true);
    try {
      const updated = await saveDigestPreferences(updates);
      setPrefs(updated);

      if (updated.enabled) {
        await scheduleWeeklyDigest();
      } else {
        await cancelWeeklyDigest();
      }

      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (e) {
      console.warn("[DigestSettings] Save failed:", e);
      Alert.alert("Error", "Failed to save preferences. Please try again.");
    } finally {
      setSaving(false);
    }
  }, []);

  // Toggle enabled
  const toggleEnabled = useCallback(async (value: boolean) => {
    await updatePreference({ enabled: value });
  }, [updatePreference]);

  // Send test digest
  const handleSendTest = useCallback(async () => {
    setSendingTest(true);
    try {
      const id = await sendImmediateDigest();
      if (id) {
        const now = new Date().toISOString();
        setLastDigestDate(now);
        Alert.alert("Test Digest Sent", "Check your notification centre for the weekly health summary.");
      } else {
        Alert.alert("Not Available", "Digest notifications require a native device (iOS/Android).");
      }
    } catch (e) {
      Alert.alert("Error", "Failed to send test digest. Make sure notifications are enabled.");
    } finally {
      setSendingTest(false);
    }
  }, []);

  const selectedDay = DAYS_OF_WEEK.find((d) => d.value === prefs.dayOfWeek) ?? DAYS_OF_WEEK[0];

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: UI.bg, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={UI.gold} size="large" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: UI.bg }}>
      <ImageBackground source={{ uri: DASHBOARD_BG }} style={{ flex: 1 }} imageStyle={{ opacity: 0.10 }}>
        <ScreenContainer edges={["top", "left", "right"]} className="flex-1">
          {/* Header */}
          <View style={{
            flexDirection: "row", alignItems: "center", paddingHorizontal: 16,
            paddingTop: 8, paddingBottom: 12,
          }}>
            <TouchableOpacity onPress={() => router.back()} style={{ padding: 6, marginRight: 8 }}>
              <MaterialIcons name="arrow-back" size={22} color={UI.gold3} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={{ color: UI.fg, fontFamily: "DMSans_700Bold", fontSize: 18 }}>
                Weekly Digest Settings
              </Text>
              <Text style={{ color: UI.secondaryLight, fontFamily: "DMSans_400Regular", fontSize: 11 }}>
                Customise your weekly health summary
              </Text>
            </View>
          </View>

          <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}>
            {/* ═══ Enable/Disable Toggle ═══ */}
            <View style={{
              backgroundColor: UI.surface, borderRadius: 14, padding: 16, marginBottom: 12,
              borderWidth: 1, borderColor: UI.borderGold,
            }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
                  <View style={{
                    width: 40, height: 40, borderRadius: 10, backgroundColor: "#F59E0B20",
                    alignItems: "center", justifyContent: "center",
                  }}>
                    <MaterialIcons name="notifications-active" size={20} color={UI.gold} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: UI.fg, fontFamily: "DMSans_700Bold", fontSize: 14 }}>
                      Weekly Health Digest
                    </Text>
                    <Text style={{ color: UI.secondaryLight, fontFamily: "DMSans_400Regular", fontSize: 11, marginTop: 2 }}>
                      Receive a weekly summary of your health metrics
                    </Text>
                  </View>
                </View>
                <Switch
                  value={prefs.enabled}
                  onValueChange={toggleEnabled}
                  trackColor={{ false: "#333", true: "#F59E0B40" }}
                  thumbColor={prefs.enabled ? UI.gold : "#666"}
                  disabled={saving}
                />
              </View>
            </View>

            {/* ═══ Schedule Settings ═══ */}
            <View style={{
              backgroundColor: UI.surface, borderRadius: 14, padding: 16, marginBottom: 12,
              borderWidth: 1, borderColor: UI.goldAlpha12,
              opacity: prefs.enabled ? 1 : 0.5,
            }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <MaterialIcons name="schedule" size={16} color={UI.gold} />
                <Text style={{ color: UI.gold3, fontFamily: "DMSans_600SemiBold", fontSize: 13 }}>
                  Delivery Schedule
                </Text>
              </View>

              {/* Day Selector */}
              <TouchableOpacity
                onPress={() => prefs.enabled && setShowDayPicker(true)}
                disabled={!prefs.enabled || saving}
                style={{
                  flexDirection: "row", alignItems: "center", justifyContent: "space-between",
                  backgroundColor: UI.bg, borderRadius: 10, padding: 14, marginBottom: 10,
                  borderWidth: 1, borderColor: UI.goldAlpha10,
                }}
              >
                <View>
                  <Text style={{ color: UI.secondaryLight, fontFamily: "DMSans_400Regular", fontSize: 10 }}>Day of Week</Text>
                  <Text style={{ color: UI.fg, fontFamily: "DMSans_600SemiBold", fontSize: 14, marginTop: 2 }}>
                    {selectedDay.label}
                  </Text>
                </View>
                <MaterialIcons name="chevron-right" size={20} color={UI.secondaryLight} />
              </TouchableOpacity>

              {/* Hour Selector */}
              <TouchableOpacity
                onPress={() => prefs.enabled && setShowHourPicker(true)}
                disabled={!prefs.enabled || saving}
                style={{
                  flexDirection: "row", alignItems: "center", justifyContent: "space-between",
                  backgroundColor: UI.bg, borderRadius: 10, padding: 14,
                  borderWidth: 1, borderColor: UI.goldAlpha10,
                }}
              >
                <View>
                  <Text style={{ color: UI.secondaryLight, fontFamily: "DMSans_400Regular", fontSize: 10 }}>Delivery Time</Text>
                  <Text style={{ color: UI.fg, fontFamily: "DMSans_600SemiBold", fontSize: 14, marginTop: 2 }}>
                    {formatHour(prefs.hour)}
                  </Text>
                </View>
                <MaterialIcons name="chevron-right" size={20} color={UI.secondaryLight} />
              </TouchableOpacity>

              {/* Schedule Summary */}
              <View style={{
                marginTop: 12, paddingTop: 12, borderTopWidth: 1,
                borderTopColor: UI.dim,
              }}>
                <Text style={{ color: UI.secondaryLight, fontFamily: "DMSans_400Regular", fontSize: 11, textAlign: "center" }}>
                  Your digest will arrive every {selectedDay.label} at {formatHour(prefs.hour)}
                </Text>
              </View>
            </View>

            {/* ═══ What's Included ═══ */}
            <View style={{
              backgroundColor: UI.surface, borderRadius: 14, padding: 16, marginBottom: 12,
              borderWidth: 1, borderColor: UI.goldAlpha12,
            }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <MaterialIcons name="analytics" size={16} color={UI.gold} />
                <Text style={{ color: UI.gold3, fontFamily: "DMSans_600SemiBold", fontSize: 13 }}>
                  What's Included
                </Text>
              </View>
              {[
                { icon: "directions-walk", label: "Average daily steps", desc: "With week-over-week comparison" },
                { icon: "local-fire-department", label: "Calories burned", desc: "Daily average and trend direction" },
                { icon: "bedtime", label: "Sleep duration", desc: "Average hours and quality trend" },
                { icon: "favorite", label: "Heart rate", desc: "Average resting heart rate" },
                { icon: "straighten", label: "Total distance", desc: "Accumulated weekly distance" },
              ].map((item, i) => (
                <View key={i} style={{
                  flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8,
                  borderBottomWidth: i < 4 ? 1 : 0, borderBottomColor: UI.goldAlpha6,
                }}>
                  <MaterialIcons name={item.icon as any} size={16} color={UI.secondaryLight} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: UI.fg, fontFamily: "DMSans_500Medium", fontSize: 12 }}>{item.label}</Text>
                    <Text style={{ color: UI.secondaryLight, fontFamily: "DMSans_400Regular", fontSize: 10 }}>{item.desc}</Text>
                  </View>
                  <MaterialIcons name="check-circle" size={14} color={UI.green} />
                </View>
              ))}
            </View>

            {/* ═══ Test & Status ═══ */}
            <View style={{
              backgroundColor: UI.surface, borderRadius: 14, padding: 16, marginBottom: 12,
              borderWidth: 1, borderColor: UI.goldAlpha12,
            }}>
              {/* Last Digest */}
              {lastDigestDate && (
                <View style={{
                  flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14,
                  paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: UI.dim,
                }}>
                  <MaterialIcons name="history" size={16} color={UI.secondaryLight} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: UI.secondaryLight, fontFamily: "DMSans_400Regular", fontSize: 10 }}>Last Digest Sent</Text>
                    <Text style={{ color: UI.fg, fontFamily: "DMSans_500Medium", fontSize: 12 }}>
                      {new Date(lastDigestDate).toLocaleDateString("en-GB", {
                        day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
                      })}
                    </Text>
                  </View>
                </View>
              )}

              {/* Send Test Button */}
              <TouchableOpacity
                onPress={handleSendTest}
                disabled={sendingTest}
                style={{
                  backgroundColor: UI.gold, borderRadius: 12, paddingVertical: 14,
                  flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
                  opacity: sendingTest ? 0.6 : 1,
                }}
              >
                {sendingTest ? (
                  <ActivityIndicator color={UI.bg} size="small" />
                ) : (
                  <MaterialIcons name="send" size={16} color={UI.bg} />
                )}
                <Text style={{ color: UI.bg, fontFamily: "DMSans_700Bold", fontSize: 14 }}>
                  {sendingTest ? "Sending..." : "Send Test Digest Now"}
                </Text>
              </TouchableOpacity>
              <Text style={{ color: UI.secondaryLight, fontFamily: "DMSans_400Regular", fontSize: 10, textAlign: "center", marginTop: 8 }}>
                Sends an immediate digest notification with your current health data
              </Text>
            </View>

            {/* ═══ Info Note ═══ */}
            <View style={{
              backgroundColor: "rgba(59,130,246,0.08)", borderRadius: 12, padding: 14,
              borderWidth: 1, borderColor: "rgba(59,130,246,0.15)",
            }}>
              <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
                <MaterialIcons name="info" size={16} color="#3B82F6" style={{ marginTop: 2 }} />
                <Text style={{ color: "#93C5FD", fontFamily: "DMSans_400Regular", fontSize: 11, flex: 1, lineHeight: 18 }}>
                  Weekly digest notifications require a native device (iOS or Android). They won't appear in the web preview.
                  Make sure notifications are enabled in your device settings.
                </Text>
              </View>
            </View>
          </ScrollView>
        </ScreenContainer>
      </ImageBackground>

      {/* ═══ Day Picker Modal ═══ */}
      <Modal visible={showDayPicker} transparent animationType="fade">
        <View style={{
          flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center", alignItems: "center",
        }}>
          <View style={{
            backgroundColor: UI.surface, borderRadius: 16, width: 280, maxHeight: 400,
            borderWidth: 1, borderColor: UI.goldAlpha20,
          }}>
            <View style={{
              flexDirection: "row", alignItems: "center", justifyContent: "space-between",
              padding: 16, borderBottomWidth: 1, borderBottomColor: UI.goldAlpha10,
            }}>
              <Text style={{ color: UI.fg, fontFamily: "DMSans_700Bold", fontSize: 16 }}>Select Day</Text>
              <TouchableOpacity onPress={() => setShowDayPicker(false)}>
                <MaterialIcons name="close" size={20} color={UI.secondaryLight} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={DAYS_OF_WEEK}
              keyExtractor={(item) => String(item.value)}
              renderItem={({ item }) => {
                const active = item.value === prefs.dayOfWeek;
                return (
                  <TouchableOpacity
                    onPress={async () => {
                      setShowDayPicker(false);
                      await updatePreference({ dayOfWeek: item.value });
                    }}
                    style={{
                      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
                      paddingHorizontal: 16, paddingVertical: 14,
                      backgroundColor: active ? "#F59E0B15" : "transparent",
                      borderBottomWidth: 1, borderBottomColor: UI.goldAlpha6,
                    }}
                  >
                    <Text style={{
                      color: active ? UI.gold : UI.fg,
                      fontFamily: active ? "DMSans_700Bold" : "DMSans_400Regular", fontSize: 14,
                    }}>
                      {item.label}
                    </Text>
                    {active && <MaterialIcons name="check" size={18} color={UI.gold} />}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>

      {/* ═══ Hour Picker Modal ═══ */}
      <Modal visible={showHourPicker} transparent animationType="fade">
        <View style={{
          flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center", alignItems: "center",
        }}>
          <View style={{
            backgroundColor: UI.surface, borderRadius: 16, width: 280, maxHeight: 420,
            borderWidth: 1, borderColor: UI.goldAlpha20,
          }}>
            <View style={{
              flexDirection: "row", alignItems: "center", justifyContent: "space-between",
              padding: 16, borderBottomWidth: 1, borderBottomColor: UI.goldAlpha10,
            }}>
              <Text style={{ color: UI.fg, fontFamily: "DMSans_700Bold", fontSize: 16 }}>Select Time</Text>
              <TouchableOpacity onPress={() => setShowHourPicker(false)}>
                <MaterialIcons name="close" size={20} color={UI.secondaryLight} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={HOURS}
              keyExtractor={(item) => String(item)}
              renderItem={({ item }) => {
                const active = item === prefs.hour;
                return (
                  <TouchableOpacity
                    onPress={async () => {
                      setShowHourPicker(false);
                      await updatePreference({ hour: item });
                    }}
                    style={{
                      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
                      paddingHorizontal: 16, paddingVertical: 12,
                      backgroundColor: active ? "#F59E0B15" : "transparent",
                      borderBottomWidth: 1, borderBottomColor: UI.goldAlpha6,
                    }}
                  >
                    <Text style={{
                      color: active ? UI.gold : UI.fg,
                      fontFamily: active ? "DMSans_700Bold" : "DMSans_400Regular", fontSize: 14,
                    }}>
                      {formatHour(item)}
                    </Text>
                    {active && <MaterialIcons name="check" size={18} color={UI.gold} />}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}
