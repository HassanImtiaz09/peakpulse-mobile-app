/**
 * Focus Mode — Distraction-Free Workout View
 *
 * Shows only the current exercise with large, clear typography.
 * Designed for neurodivergent users who find the full workout screen overwhelming.
 *
 * Features:
 * - Single exercise view with large text
 * - Set tracker with simple Done buttons
 * - Previous/Next navigation with progress dots
 * - Auto-advance when all sets are completed
 * - Swipe left/right for navigation
 * - Minimal visual noise — no alternatives, no AI coach, no demo videos
 */

import React, { useCallback, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Dimensions,
  TextInput,
  Platform,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  runOnJS,
  FadeIn,
  FadeOut,
  Easing,
} from "react-native-reanimated";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Haptics from "expo-haptics";
import { UI, SF } from "@/constants/ui-colors";

const { width: SCREEN_W } = Dimensions.get("window");

// ── Types ────────────────────────────────────────────────────
interface SetLog {
  weight: string;
  reps: string;
  completed: boolean;
}

interface Exercise {
  name: string;
  sets: number;
  reps: string;
  rest: string;
  notes?: string;
  muscleGroup?: string;
}

interface FocusModeProps {
  visible: boolean;
  exercises: Exercise[];
  currentExercise: number;
  setLogs: Record<number, SetLog[]>;
  elapsedSeconds: number;
  onClose: () => void;
  onSetCurrentExercise: (index: number) => void;
  onCompleteSet: (exerciseIndex: number, setIndex: number) => void;
  onUpdateSetLog: (
    exerciseIndex: number,
    setIndex: number,
    field: keyof SetLog,
    value: any
  ) => void;
  onFinishWorkout: () => void;
  getSetLogs: (exerciseIndex: number) => SetLog[];
  formatTime: (seconds: number) => string;
}

// ── Pure Logic (imported from lib for testability) ──────────
import {
  getProgressPercentage,
  shouldAutoAdvance,
  getMotivationalMessage,
} from "@/lib/focus-mode-logic";
export { getProgressPercentage, shouldAutoAdvance, getMotivationalMessage };

// ── Component ────────────────────────────────────────────────
export function FocusMode({
  visible,
  exercises,
  currentExercise,
  setLogs,
  elapsedSeconds,
  onClose,
  onSetCurrentExercise,
  onCompleteSet,
  onUpdateSetLog,
  onFinishWorkout,
  getSetLogs,
  formatTime,
}: FocusModeProps) {
  const exercise = exercises[currentExercise];
  const logs = exercise ? getSetLogs(currentExercise) : [];
  const completedSets = logs.filter((s) => s.completed).length;
  const allSetsDone = logs.length > 0 && logs.every((s) => s.completed);
  const isLastExercise = currentExercise === exercises.length - 1;

  // Auto-advance after a short delay when all sets are done
  const autoAdvanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (allSetsDone && !isLastExercise) {
      autoAdvanceTimer.current = setTimeout(() => {
        onSetCurrentExercise(currentExercise + 1);
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Success
          ).catch(() => {});
        }
      }, 1500);
    }
    return () => {
      if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
    };
  }, [allSetsDone, isLastExercise, currentExercise]);

  // Swipe gesture
  const translateX = useSharedValue(0);

  const goNext = useCallback(() => {
    if (currentExercise < exercises.length - 1) {
      onSetCurrentExercise(currentExercise + 1);
      if (Platform.OS !== "web")
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  }, [currentExercise, exercises.length]);

  const goPrev = useCallback(() => {
    if (currentExercise > 0) {
      onSetCurrentExercise(currentExercise - 1);
      if (Platform.OS !== "web")
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  }, [currentExercise]);

  const swipeGesture = Gesture.Pan()
    .activeOffsetX([-30, 30])
    .onUpdate((e) => {
      translateX.value = e.translationX * 0.3;
    })
    .onEnd((e) => {
      if (e.translationX < -80) {
        runOnJS(goNext)();
      } else if (e.translationX > 80) {
        runOnJS(goPrev)();
      }
      translateX.value = withTiming(0, { duration: 200 });
    })
    .runOnJS(true);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  // Celebration pulse when set is completed
  const pulseScale = useSharedValue(1);
  const handleCompleteSet = useCallback(
    (exIdx: number, setIdx: number) => {
      onCompleteSet(exIdx, setIdx);
      pulseScale.value = withSequence(
        withTiming(1.05, { duration: 100 }),
        withTiming(1, { duration: 150 })
      );
    },
    [onCompleteSet]
  );

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const progress = getProgressPercentage(
    currentExercise,
    exercises.length,
    completedSets,
    logs.length
  );

  const motivationalMsg = getMotivationalMessage(
    currentExercise,
    exercises.length,
    allSetsDone
  );

  if (!exercise) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: UI.bg,
          paddingTop: Platform.OS === "ios" ? 60 : 40,
        }}
      >
        {/* Header — minimal */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 24,
            marginBottom: 8,
          }}
        >
          <TouchableOpacity
            onPress={onClose}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: "rgba(255,255,255,0.06)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <MaterialIcons name="close" size={20} color="#9BA1A6" />
          </TouchableOpacity>

          <View style={{ alignItems: "center" }}>
            <Text
              style={{
                color: "#9BA1A6",
                fontSize: 12,
                fontFamily: "DMSans_600SemiBold",
              }}
            >
              FOCUS MODE
            </Text>
            <Text
              style={{
                color: SF.gold2,
                fontSize: 16,
                fontFamily: "BebasNeue_400Regular",
                marginTop: 2,
              }}
            >
              {formatTime(elapsedSeconds)}
            </Text>
          </View>

          <View style={{ width: 40 }} />
        </View>

        {/* Progress bar */}
        <View style={{ paddingHorizontal: 24, marginBottom: 24 }}>
          <View
            style={{
              height: 3,
              backgroundColor: "rgba(255,255,255,0.06)",
              borderRadius: 2,
            }}
          >
            <Animated.View
              style={{
                height: 3,
                backgroundColor: SF.gold,
                borderRadius: 2,
                width: `${progress}%`,
              }}
            />
          </View>
          <Text
            style={{
              color: "#687076",
              fontSize: 11,
              textAlign: "center",
              marginTop: 6,
            }}
          >
            {motivationalMsg}
          </Text>
        </View>

        {/* Main content — swipeable */}
        <GestureDetector gesture={swipeGesture}>
          <Animated.View style={[{ flex: 1, paddingHorizontal: 24 }, animatedStyle]}>
            {/* Exercise counter */}
            <Animated.View entering={FadeIn.duration(200)}>
              <Text
                style={{
                  color: SF.gold,
                  fontSize: 13,
                  fontFamily: "DMSans_700Bold",
                  letterSpacing: 2,
                  textAlign: "center",
                  marginBottom: 8,
                }}
              >
                {currentExercise + 1} OF {exercises.length}
              </Text>

              {/* Exercise name — large and clear */}
              <Text
                style={{
                  color: "#ECEDEE",
                  fontSize: 32,
                  fontFamily: "BebasNeue_400Regular",
                  textAlign: "center",
                  lineHeight: 38,
                  marginBottom: 4,
                }}
              >
                {exercise.name}
              </Text>

              {/* Muscle group */}
              {exercise.muscleGroup && (
                <Text
                  style={{
                    color: "#687076",
                    fontSize: 13,
                    textAlign: "center",
                    marginBottom: 4,
                  }}
                >
                  {exercise.muscleGroup}
                </Text>
              )}

              {/* Sets × Reps — prominent */}
              <Text
                style={{
                  color: SF.gold2,
                  fontSize: 20,
                  fontFamily: "BebasNeue_400Regular",
                  textAlign: "center",
                  marginBottom: 16,
                }}
              >
                {exercise.sets} sets × {exercise.reps}
              </Text>

              {/* Notes */}
              {exercise.notes && (
                <View
                  style={{
                    backgroundColor: UI.goldAlpha6,
                    borderRadius: 12,
                    padding: 12,
                    marginBottom: 16,
                  }}
                >
                  <Text
                    style={{
                      color: "#9BA1A6",
                      fontSize: 13,
                      textAlign: "center",
                      lineHeight: 18,
                    }}
                  >
                    {exercise.notes}
                  </Text>
                </View>
              )}
            </Animated.View>

            {/* Set Tracker — clean and simple */}
            <Animated.View style={pulseStyle}>
              <View
                style={{
                  backgroundColor: "rgba(255,255,255,0.03)",
                  borderRadius: 20,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.06)",
                }}
              >
                {/* Header row */}
                <View
                  style={{
                    flexDirection: "row",
                    marginBottom: 12,
                    paddingHorizontal: 4,
                  }}
                >
                  <Text
                    style={{
                      color: "#687076",
                      fontSize: 11,
                      fontFamily: "DMSans_700Bold",
                      width: 36,
                    }}
                  >
                    SET
                  </Text>
                  <Text
                    style={{
                      color: "#687076",
                      fontSize: 11,
                      fontFamily: "DMSans_700Bold",
                      flex: 1,
                      textAlign: "center",
                    }}
                  >
                    KG
                  </Text>
                  <Text
                    style={{
                      color: "#687076",
                      fontSize: 11,
                      fontFamily: "DMSans_700Bold",
                      flex: 1,
                      textAlign: "center",
                    }}
                  >
                    REPS
                  </Text>
                  <View style={{ width: 64 }} />
                </View>

                {/* Set rows */}
                {logs.map((log, setIdx) => (
                  <View
                    key={setIdx}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginBottom: 10,
                      opacity: log.completed ? 0.5 : 1,
                    }}
                  >
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        backgroundColor: log.completed
                          ? UI.borderGold
                          : "rgba(255,255,255,0.04)",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text
                        style={{
                          color: log.completed ? SF.gold : "#9BA1A6",
                          fontFamily: "DMSans_700Bold",
                          fontSize: 14,
                        }}
                      >
                        {log.completed ? "✓" : String(setIdx + 1)}
                      </Text>
                    </View>

                    <TextInput
                      value={log.weight}
                      onChangeText={(v) =>
                        onUpdateSetLog(currentExercise, setIdx, "weight", v)
                      }
                      placeholder="—"
                      placeholderTextColor="#451A03"
                      keyboardType="numeric"
                      editable={!log.completed}
                      returnKeyType="done"
                      style={{
                        flex: 1,
                        backgroundColor: "rgba(255,255,255,0.04)",
                        borderRadius: 10,
                        paddingVertical: 8,
                        color: "#ECEDEE",
                        fontSize: 16,
                        textAlign: "center",
                        marginHorizontal: 6,
                        fontFamily: "DMSans_600SemiBold",
                      }}
                    />

                    <TextInput
                      value={log.reps}
                      onChangeText={(v) =>
                        onUpdateSetLog(currentExercise, setIdx, "reps", v)
                      }
                      placeholder={exercise.reps}
                      placeholderTextColor="#451A03"
                      keyboardType="numeric"
                      editable={!log.completed}
                      returnKeyType="done"
                      style={{
                        flex: 1,
                        backgroundColor: "rgba(255,255,255,0.04)",
                        borderRadius: 10,
                        paddingVertical: 8,
                        color: "#ECEDEE",
                        fontSize: 16,
                        textAlign: "center",
                        marginHorizontal: 6,
                        fontFamily: "DMSans_600SemiBold",
                      }}
                    />

                    <TouchableOpacity
                      style={{
                        width: 64,
                        height: 36,
                        borderRadius: 10,
                        backgroundColor: log.completed
                          ? UI.goldAlpha20
                          : SF.gold,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                      onPress={() =>
                        !log.completed &&
                        handleCompleteSet(currentExercise, setIdx)
                      }
                      disabled={log.completed}
                    >
                      <Text
                        style={{
                          color: log.completed ? SF.gold : UI.bg,
                          fontFamily: "DMSans_700Bold",
                          fontSize: 13,
                        }}
                      >
                        {log.completed ? "Done" : "Log"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))}

                {/* Set progress */}
                <Text
                  style={{
                    color: "#687076",
                    fontSize: 12,
                    textAlign: "center",
                    marginTop: 4,
                  }}
                >
                  {completedSets} of {logs.length} sets completed
                </Text>
              </View>
            </Animated.View>
          </Animated.View>
        </GestureDetector>

        {/* Bottom navigation — large touch targets */}
        <View
          style={{
            paddingHorizontal: 24,
            paddingBottom: Platform.OS === "ios" ? 40 : 24,
            paddingTop: 16,
          }}
        >
          {/* Progress dots */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "center",
              gap: 6,
              marginBottom: 16,
            }}
          >
            {exercises.map((_, i) => {
              const iLogs = getSetLogs(i);
              const iDone =
                iLogs.length > 0 && iLogs.every((l) => l.completed);
              return (
                <TouchableOpacity
                  key={i}
                  onPress={() => onSetCurrentExercise(i)}
                  style={{
                    width: i === currentExercise ? 24 : 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor:
                      i === currentExercise
                        ? SF.gold
                        : iDone
                          ? UI.goldAlpha40
                          : "rgba(255,255,255,0.10)",
                  }}
                />
              );
            })}
          </View>

          {/* Nav buttons */}
          <View style={{ flexDirection: "row", gap: 12 }}>
            {currentExercise > 0 && (
              <TouchableOpacity
                onPress={goPrev}
                style={{
                  flex: 1,
                  height: 52,
                  borderRadius: 16,
                  backgroundColor: "rgba(255,255,255,0.06)",
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "row",
                  gap: 6,
                }}
              >
                <MaterialIcons name="chevron-left" size={20} color="#9BA1A6" />
                <Text
                  style={{
                    color: "#9BA1A6",
                    fontFamily: "DMSans_700Bold",
                    fontSize: 15,
                  }}
                >
                  Previous
                </Text>
              </TouchableOpacity>
            )}

            {isLastExercise ? (
              <TouchableOpacity
                onPress={onFinishWorkout}
                style={{
                  flex: 1,
                  height: 52,
                  borderRadius: 16,
                  backgroundColor: SF.gold,
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "row",
                  gap: 6,
                }}
              >
                <MaterialIcons name="flag" size={18} color={UI.bg} />
                <Text
                  style={{
                    color: UI.bg,
                    fontFamily: "DMSans_700Bold",
                    fontSize: 15,
                  }}
                >
                  Finish Workout
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={goNext}
                style={{
                  flex: 1,
                  height: 52,
                  borderRadius: 16,
                  backgroundColor: SF.gold,
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "row",
                  gap: 6,
                }}
              >
                <Text
                  style={{
                    color: UI.bg,
                    fontFamily: "DMSans_700Bold",
                    fontSize: 15,
                  }}
                >
                  Next Exercise
                </Text>
                <MaterialIcons
                  name="chevron-right"
                  size={20}
                  color={UI.bg}
                />
              </TouchableOpacity>
            )}
          </View>

          {/* Swipe hint */}
          <Text
            style={{
              color: "rgba(255,255,255,0.15)",
              fontSize: 11,
              textAlign: "center",
              marginTop: 8,
            }}
          >
            Swipe left or right to navigate
          </Text>
        </View>
      </View>
    </Modal>
  );
}
