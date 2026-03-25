import { useState, useEffect, useCallback } from "react";
import {
  Text, View, TouchableOpacity, ScrollView, TextInput,
  Platform, Alert, ActivityIndicator, ImageBackground,
} from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import {
  getWeeklyGoals, saveWeeklyGoals, isGoalTrackingEnabled, setGoalTrackingEnabled,
  GOAL_PRESETS, type WeeklyGoals, type GoalPreset,
  getGoalHistory, type GoalHistory,
} from "@/lib/goal-tracking";

const DASHBOARD_BG = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/PZcnawJwIZkQHTEM.jpg";

const SF = {
  bg: "#0A0E14", surface: "#1A2030", border: "rgba(245,158,11,0.12)",
  border2: "rgba(245,158,11,0.20)", fg: "#F1F5F9", muted: "#B45309",
  gold: "#F59E0B", gold2: "#FBBF24", gold3: "#FDE68A",
};

export default function WeeklyGoalsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [goals, setGoals] = useState<WeeklyGoals>({ stepsTarget: 10000, caloriesTarget: 500, workoutsTarget: 4 });
  const [history, setHistory] = useState<GoalHistory[]>([]);

  useEffect(() => {
    (async () => {
      const [g, e, h] = await Promise.all([getWeeklyGoals(), isGoalTrackingEnabled(), getGoalHistory()]);
      setGoals(g);
      setEnabled(e);
      setHistory(h);
      setLoading(false);
    })();
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await saveWeeklyGoals(goals);
      await setGoalTrackingEnabled(enabled);
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Goals Saved", "Your weekly targets have been updated.");
    } catch (e) {
      Alert.alert("Error", "Failed to save goals.");
    } finally {
      setSaving(false);
    }
  }, [goals, enabled]);

  const applyPreset = useCallback((preset: GoalPreset) => {
    setGoals(preset.goals);
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const updateGoal = useCallback((key: keyof WeeklyGoals, value: string) => {
    const num = parseInt(value.replace(/[^0-9]/g, ""), 10);
    if (!isNaN(num)) {
      setGoals((prev) => ({ ...prev, [key]: num }));
    } else if (value === "") {
      setGoals((prev) => ({ ...prev, [key]: 0 }));
    }
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: SF.bg, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={SF.gold} size="large" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: SF.bg }}>
      <ImageBackground source={{ uri: DASHBOARD_BG }} style={{ flex: 1 }} imageStyle={{ opacity: 0.08 }}>
        <ScreenContainer edges={["top", "left", "right"]} className="flex-1">
          {/* Header */}
          <View style={{
            flexDirection: "row", alignItems: "center", paddingHorizontal: 16,
            paddingTop: 8, paddingBottom: 12, gap: 12,
          }}>
            <TouchableOpacity onPress={() => router.back()} style={{
              width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(245,158,11,0.10)",
              alignItems: "center", justifyContent: "center",
            }}>
              <MaterialIcons name="arrow-back" size={22} color={SF.gold3} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={{ color: SF.fg, fontFamily: "DMSans_700Bold", fontSize: 20 }}>Weekly Goals</Text>
              <Text style={{ color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 11 }}>Set your weekly fitness targets</Text>
            </View>
          </View>

          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>

            {/* Enable/Disable Toggle */}
            <View style={{
              flexDirection: "row", alignItems: "center", justifyContent: "space-between",
              backgroundColor: SF.surface, borderRadius: 16, padding: 16,
              borderWidth: 1, borderColor: SF.border2, marginBottom: 20,
            }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <MaterialIcons name="flag" size={20} color={SF.gold} />
                <View>
                  <Text style={{ color: SF.fg, fontFamily: "DMSans_700Bold", fontSize: 15 }}>Goal Tracking</Text>
                  <Text style={{ color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 11 }}>Show progress rings on dashboard</Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setEnabled(!enabled);
                  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                style={{
                  width: 52, height: 30, borderRadius: 15,
                  backgroundColor: enabled ? SF.gold : "rgba(245,158,11,0.15)",
                  justifyContent: "center", paddingHorizontal: 2,
                }}
              >
                <View style={{
                  width: 26, height: 26, borderRadius: 13,
                  backgroundColor: enabled ? SF.bg : "#B45309",
                  alignSelf: enabled ? "flex-end" : "flex-start",
                }} />
              </TouchableOpacity>
            </View>

            {/* Presets */}
            <Text style={{ color: SF.gold, fontFamily: "DMSans_700Bold", fontSize: 12, letterSpacing: 1, marginBottom: 10 }}>
              QUICK PRESETS
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 24 }}>
              {GOAL_PRESETS.map((preset) => {
                const isActive = preset.goals.stepsTarget === goals.stepsTarget
                  && preset.goals.caloriesTarget === goals.caloriesTarget
                  && preset.goals.workoutsTarget === goals.workoutsTarget;
                return (
                  <TouchableOpacity
                    key={preset.name}
                    onPress={() => applyPreset(preset)}
                    style={{
                      flex: 1, minWidth: "45%", backgroundColor: isActive ? "rgba(245,158,11,0.15)" : SF.surface,
                      borderRadius: 14, padding: 14, borderWidth: 1,
                      borderColor: isActive ? SF.gold : SF.border,
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <MaterialIcons name={preset.icon as any} size={18} color={isActive ? SF.gold : "#B45309"} />
                      <Text style={{ color: isActive ? SF.gold : SF.fg, fontFamily: "DMSans_700Bold", fontSize: 14 }}>
                        {preset.name}
                      </Text>
                    </View>
                    <Text style={{ color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 10 }}>
                      {preset.description}
                    </Text>
                    <Text style={{ color: "#B45309", fontFamily: "DMSans_400Regular", fontSize: 9, marginTop: 4 }}>
                      {preset.goals.stepsTarget.toLocaleString()} steps · {preset.goals.caloriesTarget} kcal · {preset.goals.workoutsTarget} workouts
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Custom Targets */}
            <Text style={{ color: SF.gold, fontFamily: "DMSans_700Bold", fontSize: 12, letterSpacing: 1, marginBottom: 10 }}>
              CUSTOM TARGETS
            </Text>
            <View style={{
              backgroundColor: SF.surface, borderRadius: 16, padding: 16,
              borderWidth: 1, borderColor: SF.border, marginBottom: 24,
            }}>
              {/* Steps */}
              <View style={{ marginBottom: 18 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <MaterialIcons name="directions-walk" size={18} color="#22C55E" />
                  <Text style={{ color: SF.fg, fontFamily: "DMSans_700Bold", fontSize: 14 }}>Daily Steps Target</Text>
                </View>
                <TextInput
                  value={String(goals.stepsTarget)}
                  onChangeText={(v) => updateGoal("stepsTarget", v)}
                  keyboardType="number-pad"
                  style={{
                    backgroundColor: SF.bg, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
                    color: SF.gold3, fontFamily: "DMSans_700Bold", fontSize: 18,
                    borderWidth: 1, borderColor: SF.border,
                  }}
                />
                <Text style={{ color: "#B45309", fontFamily: "DMSans_400Regular", fontSize: 10, marginTop: 4 }}>
                  Average: 7,000-12,000 steps/day is recommended
                </Text>
              </View>

              {/* Calories */}
              <View style={{ marginBottom: 18 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <MaterialIcons name="local-fire-department" size={18} color="#F59E0B" />
                  <Text style={{ color: SF.fg, fontFamily: "DMSans_700Bold", fontSize: 14 }}>Daily Calories Burned Target</Text>
                </View>
                <TextInput
                  value={String(goals.caloriesTarget)}
                  onChangeText={(v) => updateGoal("caloriesTarget", v)}
                  keyboardType="number-pad"
                  style={{
                    backgroundColor: SF.bg, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
                    color: SF.gold3, fontFamily: "DMSans_700Bold", fontSize: 18,
                    borderWidth: 1, borderColor: SF.border,
                  }}
                />
                <Text style={{ color: "#B45309", fontFamily: "DMSans_400Regular", fontSize: 10, marginTop: 4 }}>
                  Active calories burned through exercise
                </Text>
              </View>

              {/* Workouts */}
              <View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <MaterialIcons name="fitness-center" size={18} color="#EF4444" />
                  <Text style={{ color: SF.fg, fontFamily: "DMSans_700Bold", fontSize: 14 }}>Workouts Per Week</Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                    <TouchableOpacity
                      key={n}
                      onPress={() => setGoals((prev) => ({ ...prev, workoutsTarget: n }))}
                      style={{
                        flex: 1, height: 44, borderRadius: 10, alignItems: "center", justifyContent: "center",
                        backgroundColor: goals.workoutsTarget === n ? SF.gold : SF.bg,
                        borderWidth: 1, borderColor: goals.workoutsTarget === n ? SF.gold : SF.border,
                      }}
                    >
                      <Text style={{
                        color: goals.workoutsTarget === n ? SF.bg : SF.fg,
                        fontFamily: "DMSans_700Bold", fontSize: 16,
                      }}>
                        {n}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={{ color: "#B45309", fontFamily: "DMSans_400Regular", fontSize: 10, marginTop: 4 }}>
                  3-5 workouts/week is optimal for most people
                </Text>
              </View>
            </View>

            {/* Recent History */}
            {history.length > 0 && (
              <>
                <Text style={{ color: SF.gold, fontFamily: "DMSans_700Bold", fontSize: 12, letterSpacing: 1, marginBottom: 10 }}>
                  RECENT WEEKS
                </Text>
                <View style={{
                  backgroundColor: SF.surface, borderRadius: 16, padding: 14,
                  borderWidth: 1, borderColor: SF.border, marginBottom: 24,
                }}>
                  {history.slice(0, 4).map((h, i) => {
                    const overallPct = Math.round((h.progress.steps.percentage + h.progress.calories.percentage + h.progress.workouts.percentage) / 3);
                    return (
                      <View key={h.weekStart} style={{
                        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
                        paddingVertical: 10,
                        borderBottomWidth: i < Math.min(history.length, 4) - 1 ? 1 : 0,
                        borderBottomColor: SF.border,
                      }}>
                        <View>
                          <Text style={{ color: SF.fg, fontFamily: "DMSans_600SemiBold", fontSize: 13 }}>
                            Week of {h.weekStart}
                          </Text>
                          <Text style={{ color: "#B45309", fontFamily: "DMSans_400Regular", fontSize: 10, marginTop: 2 }}>
                            {h.progress.steps.current.toLocaleString()} steps · {h.progress.calories.current} kcal · {h.progress.workouts.current} workouts
                          </Text>
                        </View>
                        <View style={{
                          backgroundColor: overallPct >= 80 ? "#22C55E20" : overallPct >= 50 ? "#F59E0B20" : "#EF444420",
                          paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
                        }}>
                          <Text style={{
                            color: overallPct >= 80 ? "#22C55E" : overallPct >= 50 ? "#F59E0B" : "#EF4444",
                            fontFamily: "DMSans_700Bold", fontSize: 12,
                          }}>
                            {overallPct}%
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </>
            )}

            {/* Save Button */}
            <TouchableOpacity
              onPress={handleSave}
              disabled={saving}
              style={{
                backgroundColor: SF.gold, borderRadius: 16, paddingVertical: 16,
                flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? (
                <ActivityIndicator color={SF.bg} size="small" />
              ) : (
                <MaterialIcons name="check" size={20} color={SF.bg} />
              )}
              <Text style={{ color: SF.bg, fontFamily: "DMSans_700Bold", fontSize: 16 }}>
                {saving ? "Saving..." : "Save Goals"}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </ScreenContainer>
      </ImageBackground>
    </View>
  );
}
