/**
 * Exercise Detail Screen
 *
 * Shows full exercise info with multi-angle GIF player, body diagram,
 * form cues, and favorite toggle.
 */
import React, { useMemo } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet, Platform, ImageBackground} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { EnhancedGifPlayer } from "@/components/enhanced-gif-player";
import { BodyDiagramInteractive } from "@/components/body-diagram";
import { useFavorites } from "@/lib/favorites-context";
import { getExerciseInfo, getAlternativeExercises } from "@/lib/exercise-data";
import { Image } from "expo-image";
import { getExerciseDemo } from "@/lib/exercise-demos";

import { GOLDEN_WORKOUT, GOLDEN_OVERLAY_STYLE } from "@/constants/golden-backgrounds";
const C = {
  bg: "#0A0E14",
  surface: "#141A22",
  surface2: "#1A0F00",
  border: "rgba(245,158,11,0.15)",
  border2: "rgba(245,158,11,0.25)",
  fg: "#F1F5F9",
  muted: "#B45309",
  gold: "#F59E0B",
  gold2: "#FBBF24",
  gold3: "#FDE68A",
  dim: "rgba(245,158,11,0.08)",
};

export default function ExerciseDetailScreen() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isFavorite, toggleFavorite } = useFavorites();

  const exercise = useMemo(() => getExerciseInfo(name || ""), [name]);
  const favorited = isFavorite(name || "");
  const alternatives = useMemo(() => getAlternativeExercises(name || "", 5), [name]);

  if (!exercise) {
    return (
      <ImageBackground source={{ uri: GOLDEN_WORKOUT }} style={{ flex: 1 }} resizeMode="cover">
      <ScreenContainer className="flex-1 items-center justify-center bg-background">
        <Text style={styles.errorText}>Exercise not found</Text>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backButton, pressed && { opacity: 0.7 }]}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </Pressable>
      </ScreenContainer>
      </ImageBackground>
    );
  }

  const handleFavorite = () => {
    toggleFavorite(exercise.name);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.headerButton, pressed && { opacity: 0.7 }]}
        >
          <MaterialIcons name="arrow-back" size={22} color={C.gold} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>{exercise.name}</Text>
        <Pressable
          onPress={handleFavorite}
          style={({ pressed }) => [styles.headerButton, pressed && { opacity: 0.7 }]}
        >
          <MaterialIcons
            name={favorited ? "favorite" : "favorite-border"}
            size={22}
            color={favorited ? "#EF4444" : C.gold}
          />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Multi-Angle GIF Player */}
        <View style={styles.section}>
          <EnhancedGifPlayer
            angleViews={exercise.angleViews}
            exerciseName={exercise.name}
            height={240}
          />
        </View>

        {/* Body Diagram + Info Row */}
        <View style={styles.infoRow}>
          {/* Body Diagram */}
          <View style={styles.diagramCard}>
            <Text style={styles.sectionLabel}>MUSCLES TARGETED</Text>
            <BodyDiagramInteractive
              primary={exercise.primaryMuscles}
              secondary={exercise.secondaryMuscles}
            />
          </View>

          {/* Quick Info */}
          <View style={styles.quickInfoCard}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>CATEGORY</Text>
              <Text style={styles.infoValue}>{formatCategory(exercise.category)}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>DIFFICULTY</Text>
              <View style={styles.difficultyRow}>
                {[1, 2, 3].map((level) => (
                  <View
                    key={level}
                    style={[
                      styles.difficultyDot,
                      level <= getDifficultyLevel(exercise.difficulty) && styles.difficultyDotActive,
                    ]}
                  />
                ))}
                <Text style={styles.difficultyText}>{exercise.difficulty}</Text>
              </View>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>EQUIPMENT</Text>
              <Text style={styles.infoValue}>{exercise.equipment}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>PRIMARY</Text>
              <View style={styles.muscleChips}>
                {exercise.primaryMuscles.map((m) => (
                  <View key={m} style={styles.muscleChip}>
                    <Text style={styles.muscleChipText}>{formatMuscle(m)}</Text>
                  </View>
                ))}
              </View>
            </View>
            {exercise.secondaryMuscles.length > 0 && (
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>SECONDARY</Text>
                <View style={styles.muscleChips}>
                  {exercise.secondaryMuscles.map((m) => (
                    <View key={m} style={[styles.muscleChip, styles.muscleChipSecondary]}>
                      <Text style={[styles.muscleChipText, styles.muscleChipTextSecondary]}>{formatMuscle(m)}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Form Cue */}
        <View style={styles.cueCard}>
          <View style={styles.cueHeader}>
            <MaterialIcons name="lightbulb" size={16} color={C.gold} />
            <Text style={styles.cueTitle}>FORM CUE</Text>
          </View>
          <Text style={styles.cueText}>{exercise.cue}</Text>
        </View>

        {/* Angle Views Detail */}
        <View style={styles.anglesSection}>
          <Text style={styles.sectionTitle}>ANGLE FOCUS POINTS</Text>
          {exercise.angleViews.map((view, i) => (
            <View key={i} style={styles.angleCard}>
              <View style={styles.angleCardHeader}>
                <MaterialIcons name="visibility" size={14} color={C.gold} />
                <Text style={styles.angleCardTitle}>{view.label}</Text>
              </View>
              <Text style={styles.angleCardFocus}>{view.focus}</Text>
            </View>
          ))}
        </View>

        {/* Alternative Exercises */}
        {alternatives.length > 0 && (
          <View style={styles.alternativesSection}>
            <View style={styles.alternativesHeader}>
              <MaterialIcons name="swap-horiz" size={16} color={C.gold} />
              <Text style={styles.sectionTitle}>TRY INSTEAD</Text>
            </View>
            <Text style={styles.alternativesSubtitle}>
              Similar exercises targeting the same muscle groups
            </Text>
            {alternatives.map((alt) => {
              const altDemo = getExerciseDemo(alt.name);
              return (
                <Pressable
                  key={alt.key}
                  onPress={() => {
                    if (Platform.OS !== "web") {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                    }
                    router.push({ pathname: "/exercise-detail" as any, params: { name: alt.name } });
                  }}
                  style={({ pressed }) => [
                    styles.altCard,
                    pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] },
                  ]}
                >
                  <View style={styles.altGifWrap}>
                    <Image
                      source={{ uri: alt.angleViews[0]?.gifUrl || altDemo.gifUrl }}
                      style={styles.altGif}
                      contentFit="contain"
                      cachePolicy="disk"
                    />
                  </View>
                  <View style={styles.altInfo}>
                    <Text style={styles.altName} numberOfLines={1}>{alt.name}</Text>
                    <Text style={styles.altCue} numberOfLines={2}>{alt.cue}</Text>
                    <View style={styles.altMeta}>
                      <View style={styles.altChip}>
                        <Text style={styles.altChipText}>{formatCategory(alt.category)}</Text>
                      </View>
                      <View style={[styles.altChip, styles.altChipDifficulty]}>
                        <Text style={styles.altChipText}>{alt.difficulty}</Text>
                      </View>
                    </View>
                  </View>
                  <MaterialIcons name="chevron-right" size={18} color={C.muted} />
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function formatCategory(cat: string): string {
  return cat.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatMuscle(m: string): string {
  return m.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function getDifficultyLevel(d: string): number {
  if (d === "beginner") return 1;
  if (d === "intermediate") return 2;
  return 3;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.dim,
    borderWidth: 1,
    borderColor: C.border,
  },
  headerTitle: {
    flex: 1,
    color: C.fg,
    fontFamily: "DMSans_700Bold",
    fontSize: 18,
    textAlign: "center",
    marginHorizontal: 12,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  sectionLabel: {
    color: C.muted,
    fontFamily: "DMSans_700Bold",
    fontSize: 9,
    letterSpacing: 1.5,
    marginBottom: 8,
    textAlign: "center",
  },
  sectionTitle: {
    color: C.muted,
    fontFamily: "DMSans_700Bold",
    fontSize: 10,
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  diagramCard: {
    flex: 1,
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
  },
  quickInfoCard: {
    flex: 1.2,
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: C.border,
    gap: 10,
  },
  infoItem: {
    gap: 3,
  },
  infoLabel: {
    color: C.muted,
    fontFamily: "DMSans_700Bold",
    fontSize: 8,
    letterSpacing: 1.2,
  },
  infoValue: {
    color: C.fg,
    fontFamily: "DMSans_500Medium",
    fontSize: 12,
  },
  difficultyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  difficultyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(245,158,11,0.15)",
    borderWidth: 1,
    borderColor: C.border,
  },
  difficultyDotActive: {
    backgroundColor: C.gold,
    borderColor: C.gold2,
  },
  difficultyText: {
    color: C.gold3,
    fontFamily: "DMSans_400Regular",
    fontSize: 10,
    marginLeft: 4,
    textTransform: "capitalize",
  },
  muscleChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  muscleChip: {
    backgroundColor: "rgba(245,158,11,0.12)",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.25)",
  },
  muscleChipSecondary: {
    backgroundColor: "rgba(245,158,11,0.06)",
    borderColor: "rgba(245,158,11,0.12)",
  },
  muscleChipText: {
    color: C.gold,
    fontFamily: "DMSans_500Medium",
    fontSize: 9,
  },
  muscleChipTextSecondary: {
    color: C.muted,
  },
  cueCard: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
  },
  cueHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  cueTitle: {
    color: C.muted,
    fontFamily: "DMSans_700Bold",
    fontSize: 9,
    letterSpacing: 1.2,
  },
  cueText: {
    color: C.gold3,
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
    lineHeight: 20,
  },
  anglesSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  angleCard: {
    backgroundColor: C.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: C.border,
  },
  angleCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  angleCardTitle: {
    color: C.gold,
    fontFamily: "DMSans_600SemiBold",
    fontSize: 12,
  },
  angleCardFocus: {
    color: C.gold3,
    fontFamily: "DMSans_400Regular",
    fontSize: 11,
    lineHeight: 17,
  },
  errorText: {
    color: C.muted,
    fontFamily: "DMSans_500Medium",
    fontSize: 16,
    marginBottom: 16,
  },
  backButton: {
    backgroundColor: C.gold,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  backButtonText: {
    color: C.bg,
    fontFamily: "DMSans_600SemiBold",
    fontSize: 14,
  },
  alternativesSection: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  alternativesHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  alternativesSubtitle: {
    color: C.muted,
    fontFamily: "DMSans_400Regular",
    fontSize: 11,
    marginBottom: 12,
    marginTop: 2,
  },
  altCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.surface,
    borderRadius: 14,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: C.border,
    gap: 10,
  },
  altGifWrap: {
    width: 56,
    height: 56,
    borderRadius: 10,
    backgroundColor: C.bg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: C.border,
  },
  altGif: {
    width: 56,
    height: 56,
  },
  altInfo: {
    flex: 1,
    gap: 2,
  },
  altName: {
    color: C.fg,
    fontFamily: "DMSans_600SemiBold",
    fontSize: 13,
  },
  altCue: {
    color: C.muted,
    fontFamily: "DMSans_400Regular",
    fontSize: 11,
    lineHeight: 15,
  },
  altMeta: {
    flexDirection: "row",
    gap: 4,
    marginTop: 3,
  },
  altChip: {
    backgroundColor: "rgba(245,158,11,0.1)",
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  altChipDifficulty: {
    backgroundColor: "rgba(245,158,11,0.06)",
  },
  altChipText: {
    color: C.gold,
    fontFamily: "DMSans_500Medium",
    fontSize: 9,
    textTransform: "capitalize",
  },
});
