/**
 * MissedWorkoutBanner — Shows when the user has missed planned workout days.
 * Offers to redistribute missed exercises across remaining days.
 */
import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, TouchableOpacity, Modal, ScrollView, Platform,
} from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import {
  detectMissedDays,
  generateReschedulePreview,
  applyReschedule,
  getRescheduleSummary,
  getWeekId,
  STORAGE_KEYS,
  type WorkoutDay,
  type MissedDay,
  type ReschedulePreview,
} from "@/lib/missed-workout-detection";

// Design tokens (matching Plans tab)
const GOLD = "#F59E0B";
const GOLD_DIM = "rgba(245,158,11,0.12)";
const GOLD_BORDER = "rgba(245,158,11,0.20)";
const BG = "#0A0E14";
const SURFACE = "#141A22";
const FG = "#F1F5F9";
const MUTED = "#64748B";
const CREAM = "#FDE68A";
const AMBER = "#F59E0B";
const AMBER_DIM = "rgba(245,158,11,0.15)";

interface MissedWorkoutBannerProps {
  schedule: WorkoutDay[];
  completedDays: Record<string, boolean>;
  onReschedule: (updatedSchedule: WorkoutDay[]) => void;
}

export function MissedWorkoutBanner({
  schedule,
  completedDays,
  onReschedule,
}: MissedWorkoutBannerProps) {
  const [dismissedDays, setDismissedDays] = useState<string[]>([]);
  const [missedDays, setMissedDays] = useState<MissedDay[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [preview, setPreview] = useState<ReschedulePreview | null>(null);

  // Load dismissed days from storage
  useEffect(() => {
    (async () => {
      try {
        const weekId = getWeekId();
        const raw = await AsyncStorage.getItem(STORAGE_KEYS.DISMISSED_MISSED_DAYS);
        if (raw) {
          const parsed = JSON.parse(raw);
          // Only use dismissals from the current week
          if (parsed.weekId === weekId) {
            setDismissedDays(parsed.days ?? []);
          }
        }
      } catch {}
    })();
  }, []);

  // Detect missed days whenever schedule/completedDays/dismissedDays change
  useEffect(() => {
    if (!schedule || schedule.length === 0) return;
    const missed = detectMissedDays(schedule, completedDays, dismissedDays);
    setMissedDays(missed);
  }, [schedule, completedDays, dismissedDays]);

  const handleDismiss = useCallback(async () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const allMissedNames = missedDays.map(d => d.day);
    const newDismissed = [...dismissedDays, ...allMissedNames];
    setDismissedDays(newDismissed);
    await AsyncStorage.setItem(
      STORAGE_KEYS.DISMISSED_MISSED_DAYS,
      JSON.stringify({ weekId: getWeekId(), days: newDismissed })
    );
  }, [missedDays, dismissedDays]);

  const handleShowReschedule = useCallback(() => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const p = generateReschedulePreview(schedule, missedDays);
    setPreview(p);
    setShowModal(true);
  }, [schedule, missedDays]);

  const handleApplyReschedule = useCallback(async () => {
    if (!preview) return;
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const updatedSchedule = applyReschedule(schedule, preview);
    onReschedule(updatedSchedule);

    // Dismiss the missed days after rescheduling
    const allMissedNames = missedDays.map(d => d.day);
    const newDismissed = [...dismissedDays, ...allMissedNames];
    setDismissedDays(newDismissed);
    await AsyncStorage.setItem(
      STORAGE_KEYS.DISMISSED_MISSED_DAYS,
      JSON.stringify({ weekId: getWeekId(), days: newDismissed })
    );

    setShowModal(false);
    setPreview(null);
  }, [preview, schedule, missedDays, dismissedDays, onReschedule]);

  // Don't render if no missed days
  if (missedDays.length === 0) return null;

  const totalMissedExercises = missedDays.reduce((sum, d) => sum + d.exercises.length, 0);

  return (
    <>
      {/* Banner */}
      <View style={{
        backgroundColor: AMBER_DIM,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: GOLD_BORDER,
        padding: 14,
        marginBottom: 12,
      }}>
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
          <View style={{
            width: 32, height: 32, borderRadius: 10,
            backgroundColor: GOLD_DIM, alignItems: "center", justifyContent: "center",
          }}>
            <MaterialIcons name="event-busy" size={18} color={AMBER} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: FG, fontFamily: "DMSans_700Bold", fontSize: 14 }}>
              {missedDays.length === 1
                ? `Missed: ${missedDays[0].day}`
                : `${missedDays.length} Missed Workouts`}
            </Text>
            <Text style={{ color: MUTED, fontSize: 12, marginTop: 2, lineHeight: 16 }}>
              {missedDays.map(d => d.focus).join(", ")} — {totalMissedExercises} exercise{totalMissedExercises !== 1 ? "s" : ""} can be redistributed
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
          <TouchableOpacity
            style={{
              flex: 1, backgroundColor: GOLD, borderRadius: 10,
              paddingVertical: 10, alignItems: "center",
              flexDirection: "row", justifyContent: "center", gap: 6,
            }}
            onPress={handleShowReschedule}
          >
            <MaterialIcons name="auto-fix-high" size={14} color={BG} />
            <Text style={{ color: BG, fontFamily: "DMSans_700Bold", fontSize: 12 }}>Redistribute</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              paddingHorizontal: 16, paddingVertical: 10,
              borderRadius: 10, backgroundColor: SURFACE,
              borderWidth: 1, borderColor: "rgba(30,41,59,0.6)",
              alignItems: "center", justifyContent: "center",
            }}
            onPress={handleDismiss}
          >
            <Text style={{ color: MUTED, fontFamily: "DMSans_600SemiBold", fontSize: 12 }}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Rescheduling Preview Modal */}
      <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => setShowModal(false)} statusBarTranslucent>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "flex-end" }}>
          <View style={{
            backgroundColor: SURFACE,
            borderTopLeftRadius: 24, borderTopRightRadius: 24,
            maxHeight: "85%", paddingBottom: 40,
          }}>
            {/* Header */}
            <View style={{
              flexDirection: "row", justifyContent: "space-between", alignItems: "center",
              padding: 20, borderBottomWidth: 1, borderBottomColor: "rgba(30,41,59,0.6)",
            }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: AMBER, fontFamily: "DMSans_700Bold", fontSize: 12, letterSpacing: 1 }}>
                  SMART RESCHEDULE
                </Text>
                <Text style={{ color: FG, fontFamily: "DMSans_700Bold", fontSize: 16, marginTop: 2 }}>
                  Redistribute Missed Exercises
                </Text>
                {preview && (
                  <Text style={{ color: MUTED, fontSize: 12, marginTop: 4 }}>
                    {getRescheduleSummary(preview)}
                  </Text>
                )}
              </View>
              <TouchableOpacity onPress={() => setShowModal(false)} style={{ padding: 8 }}>
                <MaterialIcons name="close" size={22} color={MUTED} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: 16 }} showsVerticalScrollIndicator={false}>
              {/* Missed Days Summary */}
              <Text style={{ color: MUTED, fontFamily: "DMSans_700Bold", fontSize: 11, letterSpacing: 1, marginBottom: 8, textTransform: "uppercase" }}>
                Missed Days
              </Text>
              {missedDays.map((day, i) => (
                <View key={i} style={{
                  backgroundColor: "rgba(239,68,68,0.08)", borderRadius: 10,
                  padding: 10, marginBottom: 6,
                  borderWidth: 1, borderColor: "rgba(239,68,68,0.2)",
                }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <MaterialIcons name="event-busy" size={14} color="#EF4444" />
                    <Text style={{ color: "#F87171", fontFamily: "DMSans_700Bold", fontSize: 13 }}>{day.day}</Text>
                    <Text style={{ color: MUTED, fontSize: 11 }}>— {day.focus}</Text>
                  </View>
                  <Text style={{ color: MUTED, fontSize: 11, marginTop: 4, marginLeft: 22 }}>
                    {day.exercises.map(e => e.name).join(", ")}
                  </Text>
                </View>
              ))}

              {/* Redistribution Preview */}
              {preview && preview.updatedDays.filter(d => d.addedExercises.length > 0).length > 0 && (
                <>
                  <Text style={{ color: MUTED, fontFamily: "DMSans_700Bold", fontSize: 11, letterSpacing: 1, marginTop: 16, marginBottom: 8, textTransform: "uppercase" }}>
                    Updated Schedule
                  </Text>
                  {preview.updatedDays.filter(d => d.addedExercises.length > 0).map((day, i) => (
                    <View key={i} style={{
                      backgroundColor: BG, borderRadius: 12,
                      padding: 12, marginBottom: 8,
                      borderWidth: 1, borderColor: GOLD_BORDER,
                    }}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                          <MaterialIcons name="fitness-center" size={14} color={GOLD} />
                          <Text style={{ color: FG, fontFamily: "DMSans_700Bold", fontSize: 13 }}>{day.day}</Text>
                        </View>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <Text style={{ color: MUTED, fontSize: 11 }}>{day.originalCount} exercises</Text>
                          <MaterialIcons name="arrow-forward" size={12} color={GOLD} />
                          <Text style={{ color: GOLD, fontFamily: "DMSans_700Bold", fontSize: 11 }}>
                            {day.originalCount + day.addedExercises.length} exercises
                          </Text>
                        </View>
                      </View>

                      {/* Added exercises */}
                      <View style={{ marginTop: 8, paddingLeft: 22 }}>
                        {day.addedExercises.map((ex, j) => (
                          <View key={j} style={{
                            flexDirection: "row", alignItems: "center", gap: 6,
                            paddingVertical: 4,
                          }}>
                            <MaterialIcons name="add-circle" size={12} color="#22C55E" />
                            <Text style={{ color: "#4ADE80", fontSize: 12 }}>{ex.name}</Text>
                            <Text style={{ color: MUTED, fontSize: 10 }}>
                              {ex.sets} × {ex.reps}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  ))}
                </>
              )}

              {preview && preview.totalRedistributed === 0 && (
                <View style={{ padding: 20, alignItems: "center" }}>
                  <MaterialIcons name="info-outline" size={24} color={MUTED} />
                  <Text style={{ color: MUTED, fontSize: 13, marginTop: 8, textAlign: "center" }}>
                    No remaining workout days this week to redistribute to.
                  </Text>
                </View>
              )}
            </ScrollView>

            {/* Action Buttons */}
            <View style={{ flexDirection: "row", gap: 10, paddingHorizontal: 16, paddingTop: 12 }}>
              <TouchableOpacity
                style={{
                  flex: 1, backgroundColor: SURFACE, borderRadius: 12,
                  paddingVertical: 12, alignItems: "center",
                  borderWidth: 1, borderColor: "rgba(30,41,59,0.6)",
                }}
                onPress={() => setShowModal(false)}
              >
                <Text style={{ color: MUTED, fontFamily: "DMSans_700Bold", fontSize: 13 }}>Cancel</Text>
              </TouchableOpacity>
              {preview && preview.totalRedistributed > 0 && (
                <TouchableOpacity
                  style={{
                    flex: 2, backgroundColor: GOLD, borderRadius: 12,
                    paddingVertical: 12, alignItems: "center",
                    flexDirection: "row", justifyContent: "center", gap: 6,
                  }}
                  onPress={handleApplyReschedule}
                >
                  <MaterialIcons name="check" size={16} color={BG} />
                  <Text style={{ color: BG, fontFamily: "DMSans_700Bold", fontSize: 13 }}>
                    Apply Changes
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
