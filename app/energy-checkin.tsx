/**
 * Pre-Workout Energy Check-In Screen
 *
 * Shows 3 energy level options before starting a workout.
 * Adjusts the workout based on the selected energy level:
 *   - Low:      Fewer exercises (max 3), fewer sets, lighter notes
 *   - Normal:   Standard plan as generated
 *   - Fired Up: Extra set per exercise, superset suggestion
 *
 * Receives dayData as a route param, modifies it, then navigates
 * to active-workout with the adjusted data.
 */
import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { UI } from "@/constants/ui-colors";
import Animated, {
  FadeInDown,
  FadeInUp,
} from "react-native-reanimated";

// ── Types ────────────────────────────────────────────────────
import {
  adjustWorkoutForEnergy,
  saveEnergyCheckin,
  type EnergyLevel,
  type EnergyOption,
} from "@/lib/energy-checkin";

const ENERGY_OPTIONS: EnergyOption[] = [
  {
    level: "low",
    icon: "battery-2-bar",
    title: "Low Energy",
    subtitle: "Keep it light today",
    description:
      "Reduce to 3 key exercises with fewer sets. Perfect for days when you're tired but still want to move.",
    color: UI.blue,
    bgColor: "rgba(96,165,250,0.10)",
    borderColor: "rgba(96,165,250,0.25)",
    adjustment: "3 exercises · fewer sets · lighter intensity",
  },
  {
    level: "normal",
    icon: "battery-4-bar",
    title: "Normal",
    subtitle: "Standard workout",
    description:
      "Follow your plan as designed. All exercises, standard sets and reps.",
    color: UI.gold,
    bgColor: "rgba(245,158,11,0.10)",
    borderColor: "rgba(245,158,11,0.25)",
    adjustment: "Full plan · standard sets · regular intensity",
  },
  {
    level: "high",
    icon: "battery-full",
    title: "Fired Up",
    subtitle: "Push harder today",
    description:
      "Add an extra set to each exercise and increase intensity. Make the most of your energy.",
    color: UI.green,
    bgColor: "rgba(34,197,94,0.10)",
    borderColor: "rgba(34,197,94,0.25)",
    adjustment: "+1 set per exercise · higher intensity",
  },
];

// Logic imported from @/lib/energy-checkin

// ── Screen Component ─────────────────────────────────────────
export default function EnergyCheckinScreen() {
  const params = useLocalSearchParams<{ dayData: string }>();
  const router = useRouter();
  const [selected, setSelected] = useState<EnergyLevel | null>(null);

  let dayData: any = null;
  try {
    dayData = params.dayData ? JSON.parse(params.dayData) : null;
  } catch {
    dayData = null;
  }

  const handleSelect = useCallback(
    (level: EnergyLevel) => {
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      setSelected(level);
    },
    []
  );

  const handleStart = useCallback(async () => {
    if (!selected || !dayData) return;

    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    // Save check-in to history
    await saveEnergyCheckin(selected);

    // Adjust workout based on energy level
    const adjusted = adjustWorkoutForEnergy(dayData, selected);

    // Navigate to active workout with adjusted data
    router.replace({
      pathname: "/active-workout",
      params: { dayData: JSON.stringify(adjusted) },
    } as any);
  }, [selected, dayData, router]);

  const handleSkip = useCallback(() => {
    if (!dayData) return;
    // Skip check-in, go straight to workout with normal energy
    const adjusted = adjustWorkoutForEnergy(dayData, "normal");
    router.replace({
      pathname: "/active-workout",
      params: { dayData: JSON.stringify(adjusted) },
    } as any);
  }, [dayData, router]);

  if (!dayData) {
    return (
      <ScreenContainer edges={["top", "bottom", "left", "right"]}>
        <View style={s.center}>
          <Text style={s.errorText}>No workout data found.</Text>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Text style={s.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    );
  }

  const exerciseCount = dayData.exercises?.length ?? 0;

  return (
    <ScreenContainer
      edges={["top", "bottom", "left", "right"]}
      containerClassName="bg-background"
    >
      <ScrollView
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View entering={FadeInUp.duration(300)} style={s.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={s.headerBack}
          >
            <MaterialIcons name="arrow-back" size={22} color={UI.fg} />
          </TouchableOpacity>
          <View style={s.headerCenter}>
            <Text style={s.headerLabel}>PRE-WORKOUT CHECK-IN</Text>
            <Text style={s.headerTitle}>How's your energy?</Text>
            <Text style={s.headerSubtitle}>
              {dayData.focus ?? dayData.day} · {exerciseCount} exercises
            </Text>
          </View>
        </Animated.View>

        {/* Energy Options */}
        <View style={s.optionsContainer}>
          {ENERGY_OPTIONS.map((option, index) => {
            const isSelected = selected === option.level;
            return (
              <Animated.View
                key={option.level}
                entering={FadeInDown.delay(100 + index * 80).duration(300)}
              >
                <TouchableOpacity
                  onPress={() => handleSelect(option.level)}
                  activeOpacity={0.8}
                  style={[
                    s.optionCard,
                    {
                      backgroundColor: isSelected
                        ? option.bgColor
                        : UI.surface,
                      borderColor: isSelected
                        ? option.borderColor
                        : UI.border,
                      borderWidth: isSelected ? 2 : 1,
                    },
                  ]}
                >
                  <View style={s.optionHeader}>
                    <View
                      style={[
                        s.optionIconContainer,
                        {
                          backgroundColor: isSelected
                            ? option.bgColor
                            : "rgba(148,163,184,0.08)",
                        },
                      ]}
                    >
                      <MaterialIcons
                        name={option.icon as any}
                        size={28}
                        color={isSelected ? option.color : UI.muted}
                      />
                    </View>
                    <View style={s.optionTitleGroup}>
                      <Text
                        style={[
                          s.optionTitle,
                          { color: isSelected ? option.color : UI.fg },
                        ]}
                      >
                        {option.title}
                      </Text>
                      <Text style={s.optionSubtitle}>{option.subtitle}</Text>
                    </View>
                    {isSelected && (
                      <View
                        style={[
                          s.checkCircle,
                          { backgroundColor: option.color },
                        ]}
                      >
                        <MaterialIcons name="check" size={16} color="#fff" />
                      </View>
                    )}
                  </View>
                  <Text style={s.optionDescription}>{option.description}</Text>
                  <View
                    style={[
                      s.adjustmentBadge,
                      {
                        backgroundColor: isSelected
                          ? `${option.color}15`
                          : "rgba(148,163,184,0.06)",
                      },
                    ]}
                  >
                    <MaterialIcons
                      name="tune"
                      size={14}
                      color={isSelected ? option.color : UI.muted}
                    />
                    <Text
                      style={[
                        s.adjustmentText,
                        { color: isSelected ? option.color : UI.muted },
                      ]}
                    >
                      {option.adjustment}
                    </Text>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </View>

        {/* Start Button */}
        <Animated.View
          entering={FadeInDown.delay(400).duration(300)}
          style={s.bottomActions}
        >
          <TouchableOpacity
            onPress={handleStart}
            disabled={!selected}
            activeOpacity={0.85}
            style={[
              s.startButton,
              {
                backgroundColor: selected ? UI.gold : "rgba(148,163,184,0.15)",
                opacity: selected ? 1 : 0.5,
              },
            ]}
          >
            <MaterialIcons
              name="play-arrow"
              size={22}
              color={selected ? UI.bg : UI.muted}
            />
            <Text
              style={[
                s.startButtonText,
                { color: selected ? UI.bg : UI.muted },
              ]}
            >
              START WORKOUT
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleSkip} style={s.skipButton}>
            <Text style={s.skipText}>Skip check-in</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </ScreenContainer>
  );
}

// ── Styles ───────────────────────────────────────────────────
const s = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  errorText: {
    color: UI.muted,
    fontSize: 16,
    marginBottom: 16,
  },
  backBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: UI.surface,
    borderRadius: 12,
  },
  backBtnText: {
    color: UI.fg,
    fontFamily: "DMSans_600SemiBold",
    fontSize: 14,
  },
  // Header
  header: {
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 24,
  },
  headerBack: {
    position: "absolute",
    left: 0,
    top: 12,
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: UI.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: UI.border,
  },
  headerCenter: {
    alignItems: "center",
    paddingTop: 4,
  },
  headerLabel: {
    color: UI.gold,
    fontFamily: "DMSans_700Bold",
    fontSize: 11,
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  headerTitle: {
    color: UI.fg,
    fontFamily: "DMSans_700Bold",
    fontSize: 26,
    marginBottom: 4,
  },
  headerSubtitle: {
    color: UI.muted,
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
  },
  // Options
  optionsContainer: {
    gap: 12,
    marginBottom: 24,
  },
  optionCard: {
    borderRadius: 18,
    padding: 16,
  },
  optionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  optionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  optionTitleGroup: {
    flex: 1,
  },
  optionTitle: {
    fontFamily: "DMSans_700Bold",
    fontSize: 17,
  },
  optionSubtitle: {
    color: UI.muted,
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
    marginTop: 1,
  },
  checkCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  optionDescription: {
    color: UI.muted,
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 10,
    paddingLeft: 60,
  },
  adjustmentBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    marginLeft: 60,
    alignSelf: "flex-start",
  },
  adjustmentText: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 12,
  },
  // Bottom
  bottomActions: {
    alignItems: "center",
    gap: 12,
  },
  startButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    width: "100%",
    paddingVertical: 16,
    borderRadius: 16,
  },
  startButtonText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 15,
    letterSpacing: 0.5,
  },
  skipButton: {
    paddingVertical: 10,
  },
  skipText: {
    color: UI.muted,
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
    textDecorationLine: "underline",
  },
});
