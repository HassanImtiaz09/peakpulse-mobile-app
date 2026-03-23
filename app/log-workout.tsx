import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Text, View, TouchableOpacity, ScrollView, TextInput, Alert,
  ImageBackground, Platform, ActivityIndicator, KeyboardAvoidingView,
} from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter, useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { useWearable } from "@/lib/wearable-context";
import type { WorkoutType, WorkoutData } from "@/lib/health-service";
import { saveTemplate, type CreateTemplateInput } from "@/lib/workout-templates";
import { shareWorkoutCard, type WorkoutCardData } from "@/lib/social-card-generator";

const DASHBOARD_BG = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/PZcnawJwIZkQHTEM.jpg";

// ── Workout Type Configuration ──────────────────────────────────
interface WorkoutTypeConfig {
  type: WorkoutType;
  label: string;
  icon: string;
  color: string;
  caloriesPerMin: number; // rough estimate for auto-calculation
  hasDistance: boolean;
}

const WORKOUT_TYPES: WorkoutTypeConfig[] = [
  { type: "running", label: "Running", icon: "directions-run", color: "#22C55E", caloriesPerMin: 11, hasDistance: true },
  { type: "walking", label: "Walking", icon: "directions-walk", color: "#3B82F6", caloriesPerMin: 5, hasDistance: true },
  { type: "cycling", label: "Cycling", icon: "pedal-bike", color: "#F59E0B", caloriesPerMin: 9, hasDistance: true },
  { type: "swimming", label: "Swimming", icon: "pool", color: "#06B6D4", caloriesPerMin: 10, hasDistance: true },
  { type: "strength_training", label: "Strength", icon: "fitness-center", color: "#EF4444", caloriesPerMin: 7, hasDistance: false },
  { type: "hiit", label: "HIIT", icon: "bolt", color: "#F97316", caloriesPerMin: 13, hasDistance: false },
  { type: "yoga", label: "Yoga", icon: "self-improvement", color: "#8B5CF6", caloriesPerMin: 4, hasDistance: false },
  { type: "pilates", label: "Pilates", icon: "accessibility", color: "#EC4899", caloriesPerMin: 5, hasDistance: false },
  { type: "dance", label: "Dance", icon: "music-note", color: "#A78BFA", caloriesPerMin: 8, hasDistance: false },
  { type: "elliptical", label: "Elliptical", icon: "directions-run", color: "#14B8A6", caloriesPerMin: 9, hasDistance: true },
  { type: "rowing", label: "Rowing", icon: "rowing", color: "#0EA5E9", caloriesPerMin: 10, hasDistance: true },
  { type: "stair_climbing", label: "Stairs", icon: "stairs", color: "#FBBF24", caloriesPerMin: 11, hasDistance: false },
  { type: "other", label: "Other", icon: "sports", color: "#9CA3AF", caloriesPerMin: 6, hasDistance: false },
];

// ── Calorie Auto-Estimate ──────────────────────────────────────
function estimateCalories(type: WorkoutType, durationMin: number): number {
  const config = WORKOUT_TYPES.find((w) => w.type === type);
  return Math.round((config?.caloriesPerMin ?? 6) * durationMin);
}

// ── Workout History Storage ──────────────────────────────────────
const WORKOUT_HISTORY_KEY = "@workout_log_history";

interface WorkoutLogEntry {
  id: string;
  workout: WorkoutData;
  savedToHealthPlatform: boolean;
  platform: string;
  loggedAt: string;
}

async function saveWorkoutToHistory(entry: WorkoutLogEntry): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(WORKOUT_HISTORY_KEY);
    const history: WorkoutLogEntry[] = raw ? JSON.parse(raw) : [];
    history.unshift(entry); // newest first
    // Keep last 100 entries
    const trimmed = history.slice(0, 100);
    await AsyncStorage.setItem(WORKOUT_HISTORY_KEY, JSON.stringify(trimmed));
  } catch (e) {
    console.warn("[LogWorkout] Failed to save history:", e);
  }
}

// ── Main Screen ──────────────────────────────────────────────────
export default function LogWorkoutScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    templateType?: string; templateDuration?: string; templateCalories?: string;
    templateDistance?: string; templateHR?: string; templateTitle?: string;
  }>();
  const { logWorkoutToHealthPlatform, healthSourceName, permissionStatus, isHealthPlatformAvailable } = useWearable();

  // Form state
  const [selectedType, setSelectedType] = useState<WorkoutType | null>(null);
  const [hours, setHours] = useState("");
  const [minutes, setMinutes] = useState("30");
  const [calories, setCalories] = useState("");
  const [distance, setDistance] = useState("");
  const [heartRate, setHeartRate] = useState("");
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [autoCalories, setAutoCalories] = useState(true);
  const [syncToHealth, setSyncToHealth] = useState(true);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [sharingCard, setSharingCard] = useState(false);

  // Pre-fill from template params
  useEffect(() => {
    if (params.templateType) {
      setSelectedType(params.templateType as WorkoutType);
      if (params.templateTitle) setTitle(params.templateTitle);
      if (params.templateDuration) {
        const dur = parseInt(params.templateDuration);
        if (dur >= 60) { setHours(String(Math.floor(dur / 60))); setMinutes(String(dur % 60)); }
        else setMinutes(String(dur));
      }
      if (params.templateCalories) { setCalories(params.templateCalories); setAutoCalories(false); }
      if (params.templateDistance) setDistance(params.templateDistance);
      if (params.templateHR) setHeartRate(params.templateHR);
    }
  }, [params.templateType]);

  // Date state (default: now)
  const [dateStr, setDateStr] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  });
  const [timeStr, setTimeStr] = useState(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  });

  const selectedConfig = useMemo(
    () => WORKOUT_TYPES.find((w) => w.type === selectedType),
    [selectedType],
  );

  const totalDurationMin = useMemo(() => {
    const h = parseInt(hours) || 0;
    const m = parseInt(minutes) || 0;
    return h * 60 + m;
  }, [hours, minutes]);

  const estimatedCalories = useMemo(() => {
    if (!selectedType || totalDurationMin <= 0) return 0;
    return estimateCalories(selectedType, totalDurationMin);
  }, [selectedType, totalDurationMin]);

  const effectiveCalories = autoCalories ? estimatedCalories : (parseInt(calories) || 0);

  const canSave = selectedType !== null && totalDurationMin > 0;

  const handleSave = useCallback(async () => {
    if (!canSave || !selectedType) return;
    setSaving(true);

    try {
      // Build start/end dates
      const [year, month, day] = dateStr.split("-").map(Number);
      const [hour, min] = timeStr.split(":").map(Number);
      const startDate = new Date(year, month - 1, day, hour, min);
      const endDate = new Date(startDate.getTime() + totalDurationMin * 60 * 1000);

      const workoutData: WorkoutData = {
        type: selectedType,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        durationMinutes: totalDurationMin,
        caloriesBurned: effectiveCalories,
        distanceKm: distance ? parseFloat(distance) : undefined,
        heartRateAvg: heartRate ? parseInt(heartRate) : undefined,
        title: title || `${selectedConfig?.label ?? "Workout"} Session`,
      };

      let savedToHealth = false;
      let platform = "local";

      // Write to health platform if enabled and available
      if (syncToHealth && isHealthPlatformAvailable && permissionStatus === "granted") {
        const result = await logWorkoutToHealthPlatform(workoutData);
        savedToHealth = result.success;
        platform = result.platform;
      }

      // Save to local history
      const entry: WorkoutLogEntry = {
        id: `workout_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        workout: workoutData,
        savedToHealthPlatform: savedToHealth,
        platform,
        loggedAt: new Date().toISOString(),
      };
      await saveWorkoutToHistory(entry);

      // Also update the workout sessions storage for streak tracking
      try {
        const sessionsRaw = await AsyncStorage.getItem("@workout_sessions_local");
        const sessions = sessionsRaw ? JSON.parse(sessionsRaw) : [];
        sessions.push({
          date: dateStr,
          type: selectedType,
          duration: totalDurationMin,
          calories: effectiveCalories,
        });
        await AsyncStorage.setItem("@workout_sessions_local", JSON.stringify(sessions));
      } catch {}

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      const healthMsg = savedToHealth
        ? `\n\nAlso saved to ${platform === "healthkit" ? "Apple Health" : platform === "healthconnect" ? "Health Connect" : healthSourceName}.`
        : syncToHealth && isHealthPlatformAvailable
        ? "\n\nNote: Could not sync to health platform. Check permissions in Wearable Sync."
        : "";

      Alert.alert(
        "Workout Logged",
        `${selectedConfig?.label ?? "Workout"} — ${totalDurationMin} min, ${effectiveCalories} kcal${healthMsg}`,
        [
          {
            text: "Save as Template",
            onPress: async () => {
              if (!selectedType || !selectedConfig) return;
              setSavingTemplate(true);
              try {
                await saveTemplate({
                  name: title || `${selectedConfig.label} ${totalDurationMin}min`,
                  type: selectedType,
                  durationMinutes: totalDurationMin,
                  estimatedCalories: effectiveCalories,
                  distanceKm: distance ? parseFloat(distance) : undefined,
                  heartRateAvg: heartRate ? parseInt(heartRate) : undefined,
                  color: selectedConfig.color,
                  icon: selectedConfig.icon,
                });
                Alert.alert("Template Saved", "You can use this template for quick logging next time.", [{ text: "Done", onPress: () => router.back() }]);
              } catch { Alert.alert("Error", "Failed to save template."); }
              finally { setSavingTemplate(false); }
            },
          },
          {
            text: "Share Card",
            onPress: async () => {
              if (!selectedType || !selectedConfig) return;
              setSharingCard(true);
              try {
                const cardData: WorkoutCardData = {
                  type: selectedType,
                  typeName: selectedConfig.label,
                  title: title || `${selectedConfig.label} Session`,
                  durationMinutes: totalDurationMin,
                  caloriesBurned: effectiveCalories,
                  distanceKm: distance ? parseFloat(distance) : undefined,
                  heartRateAvg: heartRate ? parseInt(heartRate) : undefined,
                  date: new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
                };
                await shareWorkoutCard(cardData);
              } catch {}
              finally { setSharingCard(false); }
            },
          },
          { text: "Done", onPress: () => router.back() },
        ],
      );
    } catch (e: any) {
      Alert.alert("Error", `Failed to save workout: ${e?.message ?? "Unknown error"}`);
    } finally {
      setSaving(false);
    }
  }, [canSave, selectedType, dateStr, timeStr, totalDurationMin, effectiveCalories, distance, heartRate, title, syncToHealth, isHealthPlatformAvailable, permissionStatus, logWorkoutToHealthPlatform, healthSourceName, selectedConfig, router]);

  return (
    <View style={{ flex: 1, backgroundColor: "#0A0500" }}>
      {/* Hero Header */}
      <ImageBackground source={{ uri: DASHBOARD_BG }} style={{ height: 140 }} resizeMode="cover">
        <View style={{ flex: 1, backgroundColor: "rgba(8,8,16,0.72)", justifyContent: "flex-end", padding: 20, paddingTop: 52 }}>
          <TouchableOpacity
            style={{
              position: "absolute", top: 52, left: 20, width: 36, height: 36, borderRadius: 10,
              backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center",
            }}
            onPress={() => router.back()}
          >
            <Text style={{ color: "#FFF7ED", fontSize: 18 }}>←</Text>
          </TouchableOpacity>
          <Text style={{ color: "#FBBF24", fontFamily: "Outfit_700Bold", fontSize: 12, letterSpacing: 1 }}>MANUAL ENTRY</Text>
          <Text style={{ color: "#FFF7ED", fontFamily: "Outfit_800ExtraBold", fontSize: 26, letterSpacing: -0.5 }}>Log Workout</Text>
        </View>
      </ImageBackground>

      {/* Quick Links */}
      <View style={{ flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "rgba(245,158,11,0.08)" }}>
        <TouchableOpacity
          onPress={() => router.push("/workout-history" as any)}
          style={{
            flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4,
            paddingVertical: 10, backgroundColor: "rgba(245,158,11,0.06)",
          }}
        >
          <MaterialIcons name="history" size={14} color="#F59E0B" />
          <Text style={{ color: "#F59E0B", fontFamily: "DMSans_600SemiBold", fontSize: 11 }}>History</Text>
        </TouchableOpacity>
        <View style={{ width: 1, backgroundColor: "rgba(245,158,11,0.08)" }} />
        <TouchableOpacity
          onPress={() => router.push("/workout-templates" as any)}
          style={{
            flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4,
            paddingVertical: 10, backgroundColor: "rgba(245,158,11,0.06)",
          }}
        >
          <MaterialIcons name="bookmark" size={14} color="#F59E0B" />
          <Text style={{ color: "#F59E0B", fontFamily: "DMSans_600SemiBold", fontSize: 11 }}>Templates</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

          {/* ═══ STEP 1: Workout Type ═══ */}
          <View style={{ marginBottom: 20 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: "#F59E0B", alignItems: "center", justifyContent: "center" }}>
                <Text style={{ color: "#0A0500", fontFamily: "Outfit_700Bold", fontSize: 12 }}>1</Text>
              </View>
              <Text style={{ color: "#FFF7ED", fontFamily: "Outfit_700Bold", fontSize: 16 }}>Workout Type</Text>
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {WORKOUT_TYPES.map((wt) => {
                const isSelected = selectedType === wt.type;
                return (
                  <TouchableOpacity
                    key={wt.type}
                    style={{
                      width: "31%",
                      backgroundColor: isSelected ? wt.color + "20" : "#150A00",
                      borderRadius: 14,
                      padding: 12,
                      alignItems: "center",
                      gap: 4,
                      borderWidth: 1.5,
                      borderColor: isSelected ? wt.color + "60" : "rgba(245,158,11,0.10)",
                    }}
                    onPress={() => {
                      setSelectedType(wt.type);
                      if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                  >
                    <MaterialIcons name={wt.icon as any} size={24} color={isSelected ? wt.color : "#B45309"} />
                    <Text style={{
                      color: isSelected ? wt.color : "#B45309",
                      fontFamily: isSelected ? "Outfit_700Bold" : "DMSans_500Medium",
                      fontSize: 11,
                    }}>
                      {wt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* ═══ STEP 2: Duration ═══ */}
          <View style={{ marginBottom: 20 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: "#F59E0B", alignItems: "center", justifyContent: "center" }}>
                <Text style={{ color: "#0A0500", fontFamily: "Outfit_700Bold", fontSize: 12 }}>2</Text>
              </View>
              <Text style={{ color: "#FFF7ED", fontFamily: "Outfit_700Bold", fontSize: 16 }}>Duration</Text>
            </View>
            <View style={{
              flexDirection: "row", gap: 12, backgroundColor: "#150A00", borderRadius: 16,
              padding: 16, borderWidth: 1, borderColor: "rgba(245,158,11,0.15)",
            }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: "#B45309", fontFamily: "DMSans_500Medium", fontSize: 11, marginBottom: 6 }}>Hours</Text>
                <TextInput
                  style={{
                    backgroundColor: "#0A0500", borderRadius: 12, padding: 12,
                    color: "#FFF7ED", fontFamily: "Outfit_700Bold", fontSize: 20, textAlign: "center",
                    borderWidth: 1, borderColor: "rgba(245,158,11,0.15)",
                  }}
                  value={hours}
                  onChangeText={setHours}
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor="#78350F"
                  maxLength={2}
                />
              </View>
              <View style={{ justifyContent: "flex-end", paddingBottom: 14 }}>
                <Text style={{ color: "#B45309", fontFamily: "Outfit_700Bold", fontSize: 20 }}>:</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: "#B45309", fontFamily: "DMSans_500Medium", fontSize: 11, marginBottom: 6 }}>Minutes</Text>
                <TextInput
                  style={{
                    backgroundColor: "#0A0500", borderRadius: 12, padding: 12,
                    color: "#FFF7ED", fontFamily: "Outfit_700Bold", fontSize: 20, textAlign: "center",
                    borderWidth: 1, borderColor: "rgba(245,158,11,0.15)",
                  }}
                  value={minutes}
                  onChangeText={setMinutes}
                  keyboardType="number-pad"
                  placeholder="30"
                  placeholderTextColor="#78350F"
                  maxLength={2}
                />
              </View>
              {totalDurationMin > 0 && (
                <View style={{ justifyContent: "flex-end", paddingBottom: 10 }}>
                  <Text style={{ color: "#F59E0B", fontFamily: "DMSans_600SemiBold", fontSize: 12 }}>
                    {totalDurationMin} min
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* ═══ STEP 3: Calories ═══ */}
          <View style={{ marginBottom: 20 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: "#F59E0B", alignItems: "center", justifyContent: "center" }}>
                <Text style={{ color: "#0A0500", fontFamily: "Outfit_700Bold", fontSize: 12 }}>3</Text>
              </View>
              <Text style={{ color: "#FFF7ED", fontFamily: "Outfit_700Bold", fontSize: 16 }}>Calories Burned</Text>
            </View>
            <View style={{
              backgroundColor: "#150A00", borderRadius: 16, padding: 16,
              borderWidth: 1, borderColor: "rgba(245,158,11,0.15)",
            }}>
              {/* Auto/Manual Toggle */}
              <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
                <TouchableOpacity
                  style={{
                    flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: "center",
                    backgroundColor: autoCalories ? "#F59E0B" : "transparent",
                    borderWidth: 1, borderColor: autoCalories ? "#F59E0B" : "rgba(245,158,11,0.20)",
                  }}
                  onPress={() => setAutoCalories(true)}
                >
                  <Text style={{ color: autoCalories ? "#0A0500" : "#B45309", fontFamily: "Outfit_700Bold", fontSize: 12 }}>
                    Auto-Estimate
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{
                    flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: "center",
                    backgroundColor: !autoCalories ? "#F59E0B" : "transparent",
                    borderWidth: 1, borderColor: !autoCalories ? "#F59E0B" : "rgba(245,158,11,0.20)",
                  }}
                  onPress={() => setAutoCalories(false)}
                >
                  <Text style={{ color: !autoCalories ? "#0A0500" : "#B45309", fontFamily: "Outfit_700Bold", fontSize: 12 }}>
                    Manual Entry
                  </Text>
                </TouchableOpacity>
              </View>

              {autoCalories ? (
                <View style={{ alignItems: "center", paddingVertical: 8 }}>
                  <Text style={{ color: "#F59E0B", fontFamily: "Outfit_700Bold", fontSize: 36 }}>
                    {estimatedCalories}
                  </Text>
                  <Text style={{ color: "#B45309", fontFamily: "DMSans_400Regular", fontSize: 12 }}>
                    estimated kcal
                  </Text>
                  {selectedConfig && (
                    <Text style={{ color: "#78350F", fontFamily: "DMSans_400Regular", fontSize: 10, marginTop: 4 }}>
                      Based on ~{selectedConfig.caloriesPerMin} kcal/min for {selectedConfig.label.toLowerCase()}
                    </Text>
                  )}
                </View>
              ) : (
                <TextInput
                  style={{
                    backgroundColor: "#0A0500", borderRadius: 12, padding: 12,
                    color: "#FFF7ED", fontFamily: "Outfit_700Bold", fontSize: 20, textAlign: "center",
                    borderWidth: 1, borderColor: "rgba(245,158,11,0.15)",
                  }}
                  value={calories}
                  onChangeText={setCalories}
                  keyboardType="number-pad"
                  placeholder="Enter calories"
                  placeholderTextColor="#78350F"
                />
              )}
            </View>
          </View>

          {/* ═══ STEP 4: Optional Fields ═══ */}
          <View style={{ marginBottom: 20 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: "rgba(245,158,11,0.20)", alignItems: "center", justifyContent: "center" }}>
                <Text style={{ color: "#F59E0B", fontFamily: "Outfit_700Bold", fontSize: 12 }}>4</Text>
              </View>
              <Text style={{ color: "#FFF7ED", fontFamily: "Outfit_700Bold", fontSize: 16 }}>Details</Text>
              <Text style={{ color: "#78350F", fontFamily: "DMSans_400Regular", fontSize: 11 }}>(optional)</Text>
            </View>
            <View style={{
              backgroundColor: "#150A00", borderRadius: 16, padding: 16, gap: 12,
              borderWidth: 1, borderColor: "rgba(245,158,11,0.15)",
            }}>
              {/* Distance (only for applicable types) */}
              {selectedConfig?.hasDistance && (
                <View>
                  <Text style={{ color: "#B45309", fontFamily: "DMSans_500Medium", fontSize: 11, marginBottom: 6 }}>
                    Distance (km)
                  </Text>
                  <TextInput
                    style={{
                      backgroundColor: "#0A0500", borderRadius: 12, padding: 12,
                      color: "#FFF7ED", fontFamily: "Outfit_700Bold", fontSize: 16,
                      borderWidth: 1, borderColor: "rgba(245,158,11,0.15)",
                    }}
                    value={distance}
                    onChangeText={setDistance}
                    keyboardType="decimal-pad"
                    placeholder="e.g. 5.2"
                    placeholderTextColor="#78350F"
                  />
                </View>
              )}

              {/* Heart Rate */}
              <View>
                <Text style={{ color: "#B45309", fontFamily: "DMSans_500Medium", fontSize: 11, marginBottom: 6 }}>
                  Avg Heart Rate (bpm)
                </Text>
                <TextInput
                  style={{
                    backgroundColor: "#0A0500", borderRadius: 12, padding: 12,
                    color: "#FFF7ED", fontFamily: "Outfit_700Bold", fontSize: 16,
                    borderWidth: 1, borderColor: "rgba(245,158,11,0.15)",
                  }}
                  value={heartRate}
                  onChangeText={setHeartRate}
                  keyboardType="number-pad"
                  placeholder="e.g. 145"
                  placeholderTextColor="#78350F"
                />
              </View>

              {/* Title / Notes */}
              <View>
                <Text style={{ color: "#B45309", fontFamily: "DMSans_500Medium", fontSize: 11, marginBottom: 6 }}>
                  Workout Title
                </Text>
                <TextInput
                  style={{
                    backgroundColor: "#0A0500", borderRadius: 12, padding: 12,
                    color: "#FFF7ED", fontFamily: "DMSans_500Medium", fontSize: 14,
                    borderWidth: 1, borderColor: "rgba(245,158,11,0.15)",
                  }}
                  value={title}
                  onChangeText={setTitle}
                  placeholder={`${selectedConfig?.label ?? "Workout"} Session`}
                  placeholderTextColor="#78350F"
                  returnKeyType="done"
                />
              </View>

              {/* Date & Time */}
              <View style={{ flexDirection: "row", gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: "#B45309", fontFamily: "DMSans_500Medium", fontSize: 11, marginBottom: 6 }}>
                    Date
                  </Text>
                  <TextInput
                    style={{
                      backgroundColor: "#0A0500", borderRadius: 12, padding: 12,
                      color: "#FFF7ED", fontFamily: "DMSans_500Medium", fontSize: 14,
                      borderWidth: 1, borderColor: "rgba(245,158,11,0.15)",
                    }}
                    value={dateStr}
                    onChangeText={setDateStr}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#78350F"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: "#B45309", fontFamily: "DMSans_500Medium", fontSize: 11, marginBottom: 6 }}>
                    Time
                  </Text>
                  <TextInput
                    style={{
                      backgroundColor: "#0A0500", borderRadius: 12, padding: 12,
                      color: "#FFF7ED", fontFamily: "DMSans_500Medium", fontSize: 14,
                      borderWidth: 1, borderColor: "rgba(245,158,11,0.15)",
                    }}
                    value={timeStr}
                    onChangeText={setTimeStr}
                    placeholder="HH:MM"
                    placeholderTextColor="#78350F"
                  />
                </View>
              </View>
            </View>
          </View>

          {/* ═══ Health Platform Sync Toggle ═══ */}
          {isHealthPlatformAvailable && (
            <TouchableOpacity
              style={{
                flexDirection: "row", alignItems: "center", gap: 12,
                backgroundColor: "#150A00", borderRadius: 16, padding: 16, marginBottom: 20,
                borderWidth: 1, borderColor: syncToHealth ? "rgba(34,197,94,0.25)" : "rgba(245,158,11,0.15)",
              }}
              onPress={() => setSyncToHealth(!syncToHealth)}
            >
              <View style={{
                width: 44, height: 44, borderRadius: 14,
                backgroundColor: syncToHealth ? "rgba(34,197,94,0.12)" : "rgba(245,158,11,0.08)",
                alignItems: "center", justifyContent: "center",
                borderWidth: 1, borderColor: syncToHealth ? "rgba(34,197,94,0.25)" : "rgba(245,158,11,0.15)",
              }}>
                <MaterialIcons
                  name={Platform.OS === "ios" ? "favorite" : "health-and-safety"}
                  size={22}
                  color={syncToHealth ? "#22C55E" : "#B45309"}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: "#FFF7ED", fontFamily: "Outfit_700Bold", fontSize: 14 }}>
                  Save to {healthSourceName}
                </Text>
                <Text style={{ color: "#B45309", fontFamily: "DMSans_400Regular", fontSize: 11 }}>
                  {permissionStatus === "granted"
                    ? "Workout will appear in your health app"
                    : "Grant permission in Wearable Sync first"}
                </Text>
              </View>
              <View style={{
                width: 48, height: 28, borderRadius: 14,
                backgroundColor: syncToHealth ? "#22C55E" : "rgba(245,158,11,0.15)",
                justifyContent: "center",
                paddingHorizontal: 3,
              }}>
                <View style={{
                  width: 22, height: 22, borderRadius: 11,
                  backgroundColor: "#FFF7ED",
                  alignSelf: syncToHealth ? "flex-end" : "flex-start",
                }} />
              </View>
            </TouchableOpacity>
          )}

          {/* ═══ Summary & Save Button ═══ */}
          {canSave && (
            <View style={{
              backgroundColor: "#150A00", borderRadius: 16, padding: 16, marginBottom: 16,
              borderWidth: 1, borderColor: "rgba(245,158,11,0.20)",
            }}>
              <Text style={{ color: "#FDE68A", fontFamily: "Outfit_700Bold", fontSize: 13, marginBottom: 10 }}>
                WORKOUT SUMMARY
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
                <View style={{ alignItems: "center", flex: 1 }}>
                  <MaterialIcons name={selectedConfig?.icon as any ?? "fitness-center"} size={20} color={selectedConfig?.color ?? "#F59E0B"} />
                  <Text style={{ color: "#FFF7ED", fontFamily: "Outfit_700Bold", fontSize: 14, marginTop: 2 }}>
                    {selectedConfig?.label}
                  </Text>
                  <Text style={{ color: "#B45309", fontFamily: "DMSans_400Regular", fontSize: 9 }}>Type</Text>
                </View>
                <View style={{ alignItems: "center", flex: 1 }}>
                  <MaterialIcons name="timer" size={20} color="#3B82F6" />
                  <Text style={{ color: "#FFF7ED", fontFamily: "Outfit_700Bold", fontSize: 14, marginTop: 2 }}>
                    {totalDurationMin} min
                  </Text>
                  <Text style={{ color: "#B45309", fontFamily: "DMSans_400Regular", fontSize: 9 }}>Duration</Text>
                </View>
                <View style={{ alignItems: "center", flex: 1 }}>
                  <MaterialIcons name="local-fire-department" size={20} color="#F59E0B" />
                  <Text style={{ color: "#FFF7ED", fontFamily: "Outfit_700Bold", fontSize: 14, marginTop: 2 }}>
                    {effectiveCalories}
                  </Text>
                  <Text style={{ color: "#B45309", fontFamily: "DMSans_400Regular", fontSize: 9 }}>kcal</Text>
                </View>
                {distance ? (
                  <View style={{ alignItems: "center", flex: 1 }}>
                    <MaterialIcons name="straighten" size={20} color="#22C55E" />
                    <Text style={{ color: "#FFF7ED", fontFamily: "Outfit_700Bold", fontSize: 14, marginTop: 2 }}>
                      {distance} km
                    </Text>
                    <Text style={{ color: "#B45309", fontFamily: "DMSans_400Regular", fontSize: 9 }}>Distance</Text>
                  </View>
                ) : null}
              </View>
            </View>
          )}

          <TouchableOpacity
            style={{
              backgroundColor: canSave ? "#F59E0B" : "rgba(245,158,11,0.20)",
              borderRadius: 16, paddingVertical: 16, alignItems: "center",
              flexDirection: "row", justifyContent: "center", gap: 8,
              opacity: saving ? 0.7 : 1,
              shadowColor: canSave ? "#F59E0B" : "transparent",
              shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8,
            }}
            onPress={handleSave}
            disabled={!canSave || saving}
          >
            {saving ? (
              <ActivityIndicator color="#0A0500" size="small" />
            ) : (
              <MaterialIcons name="check-circle" size={20} color={canSave ? "#0A0500" : "#78350F"} />
            )}
            <Text style={{
              color: canSave ? "#0A0500" : "#78350F",
              fontFamily: "Outfit_700Bold", fontSize: 16,
            }}>
              {saving ? "Saving..." : "Log Workout"}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
