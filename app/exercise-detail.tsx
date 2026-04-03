/**
 * Exercise Detail Screen Ã¢ÂÂ FIXED
 *
 * Changes from original:
 * 1. Alternative exercise GIF thumbnails now have onError handlers.
 *    Previously a broken/missing GIF URL rendered a blank 56ÃÂ56 box.
 *    Now they fall back to a dumbbell placeholder icon.
 * 2. Added `altGifErrors` state (Set<string>) so each card tracks its own
 *    broken-image state independently.
 * 3. The `useState` import is added (was missing Ã¢ÂÂ original used only `useMemo`).
 * 4. No other logic or styling changed.
 */

import React, { useMemo, useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Platform,
  ImageBackground,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { ExerciseDemoPlayer } from "@/components/exercise-demo-player";
import { BodyDiagramInteractive } from "@/components/body-diagram";
import { useFavorites } from "@/lib/favorites-context";
import { getExerciseInfo, getAlternativeExercises } from "@/lib/exercise-data";
import { Image } from "expo-image";
import { getExerciseDemo, getRegistryKeyForExercise } from "@/lib/exercise-demos";
import {
  GOLDEN_WORKOUT,
  GOLDEN_OVERLAY_STYLE,
} from "@/constants/golden-backgrounds";
import { C } from "@/constants/ui-colors";
import { a11yButton, a11yHeader, a11yImage, a11yProgress, a11ySwitch, A11Y_LABELS } from "@/lib/accessibility";
import { searchExercisesByName, type ExerciseDBExercise } from "@/lib/exercisedb";
import { ActivityIndicator } from "react-native";
import { getExerciseInstructions } from "@/lib/exercise-instructions";

export default function ExerciseDetailScreen() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isFavorite, toggleFavorite } = useFavorites();
  const exercise = useMemo(() => getExerciseInfo(name || ""), [name]);
  const favorited = isFavorite(name || "");
  const alternatives = useMemo(
    () => getAlternativeExercises(name || "", 5),
    [name]
  );

  // Get exercise instructions for the HOW TO PERFORM section
  const instructions = useMemo(
    () => (name ? getExerciseInstructions(name) : null),
    [name]
  );

  // FIX: Track which alternative GIF thumbnails failed to load.
  // Previously a broken URL rendered a blank box Ã¢ÂÂ now shows a fallback icon.
  const [altGifErrors, setAltGifErrors] = useState<Set<string>>(new Set());

  // ExerciseDB API fallback Ã¢ÂÂ fetch exercise data when not in local DB
  const [apiExercise, setApiExercise] = useState<ExerciseDBExercise | null>(null);
  const [apiLoading, setApiLoading] = useState(false);

  useEffect(() => {
    if (!exercise && name) {
      setApiLoading(true);
      searchExercisesByName(name, 1)
        .then((results) => {
          if (results.length > 0) setApiExercise(results[0]);
        })
        .catch(() => {})
        .finally(() => setApiLoading(false));
    }
  }, [exercise, name]);

  if (!exercise && apiLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.headerButton, pressed && { opacity: 0.7 }]}>
            <MaterialIcons name="arrow-back" size={22} color={C.gold} />
          </Pressable>
          <Text style={styles.headerTitle}>Loading...</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={C.gold} size="large" />
          <Text style={{ color: C.muted, fontFamily: "DMSans_400Regular", fontSize: 13, marginTop: 12 }}>Fetching from ExerciseDB...</Text>
        </View>
      </View>
    );
  }

  // Show API exercise detail when local exercise is not found but API returned data
  if (!exercise && apiExercise) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.headerButton, pressed && { opacity: 0.7 }]}>
            <MaterialIcons name="arrow-back" size={22} color={C.gold} />
          </Pressable>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {apiExercise.name.replace(/\b\w/g, c => c.toUpperCase())}
          </Text>
          <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: "rgba(245,158,11,0.15)" }}>
            <Text style={{ color: C.gold, fontFamily: "DMSans_600SemiBold", fontSize: 9 }}>API</Text>
          </View>
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={{ paddingBottom: insets.bottom + 24 }} showsVerticalScrollIndicator={false}>
          {/* Exercise Visual */}
          <View style={{ marginHorizontal: 16, marginTop: 12, height: 200, backgroundColor: "#1a1a2e", borderRadius: 12, alignItems: "center", justifyContent: "center" }}>
            <MaterialIcons name="fitness-center" size={48} color="#666" />
            <Text style={{ color: "#666", marginTop: 8, fontSize: 14 }}>No demo video available</Text>
          </View>

          {/* Quick Info */}
          <View style={[styles.quickInfoCard, { marginHorizontal: 16, marginTop: 12 }]}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>BODY PART</Text>
              <Text style={styles.infoValue}>{apiExercise.bodyPart}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>EQUIPMENT</Text>
              <Text style={styles.infoValue}>{apiExercise.equipment}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>TARGET MUSCLE</Text>
              <View style={styles.muscleChips}>
                <View style={styles.muscleChip}>
                  <Text style={styles.muscleChipText}>{apiExercise.target}</Text>
                </View>
              </View>
            </View>
            {apiExercise.secondaryMuscles.length > 0 && (
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>SECONDARY MUSCLES</Text>
                <View style={styles.muscleChips}>
                  {apiExercise.secondaryMuscles.map((m) => (
                    <View key={m} style={[styles.muscleChip, styles.muscleChipSecondary]}>
                      <Text style={[styles.muscleChipText, styles.muscleChipTextSecondary]}>{m}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>

          {/* Instructions */}
          {apiExercise.instructions.length > 0 && (
            <View style={[styles.cueCard, { marginHorizontal: 16, marginTop: 12 }]}>
              <View style={styles.cueHeader}>
                <MaterialIcons name="format-list-numbered" size={16} color={C.gold} />
                <Text style={styles.cueTitle}>INSTRUCTIONS</Text>
              </View>
              {apiExercise.instructions.map((step, i) => (
                <View key={i} style={{ flexDirection: "row", gap: 8, marginTop: i === 0 ? 0 : 8 }}>
                  <Text style={{ color: C.gold, fontFamily: "DMSans_700Bold", fontSize: 12, minWidth: 18 }}>{i + 1}.</Text>
                  <Text style={{ color: C.fg, fontFamily: "DMSans_400Regular", fontSize: 13, lineHeight: 20, flex: 1 }}>{step}</Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  if (!exercise) {
    return (
      <ImageBackground
        source={{ uri: GOLDEN_WORKOUT }}
        style={{ flex: 1 }}
        resizeMode="cover"
      >
        <ScreenContainer className="flex-1 items-center justify-center bg-background">
          <Text style={styles.errorText}>Exercise not found</Text>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.backButton,
              pressed && { opacity: 0.7 },
            ]}
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
          style={({ pressed }) => [
            styles.headerButton,
            pressed && { opacity: 0.7 },
          ]}
        >
          <MaterialIcons name="arrow-back" size={22} color={C.gold} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {exercise.name}
        </Text>
        <Pressable
          onPress={handleFavorite}
          style={({ pressed }) => [
            styles.headerButton,
            pressed && { opacity: 0.7 },
          ]}
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
          {/* Exercise Demo - MuscleWiki Video */}
          <View style={styles.section}>
            <ExerciseDemoPlayer
              gifAsset={exercise.angleViews[0]?.gifUrl}
              cue={exercise.cue}
              height={260}
              exerciseName={exercise.name}

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
              <Text style={styles.infoValue}>
                {formatCategory(exercise.category)}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>DIFFICULTY</Text>
              <View style={styles.difficultyRow}>
                {[1, 2, 3].map((level) => (
                  <View
                    key={level}
                    style={[
                      styles.difficultyDot,
                      level <= getDifficultyLevel(exercise.difficulty) &&
                        styles.difficultyDotActive,
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
                    <View
                      key={m}
                      style={[styles.muscleChip, styles.muscleChipSecondary]}
                    >
                      <Text
                        style={[
                          styles.muscleChipText,
                          styles.muscleChipTextSecondary,
                        ]}
                      >
                        {formatMuscle(m)}
                      </Text>
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

        {/* HOW TO PERFORM Ã¢ÂÂ Step-by-step instructions */}
        {instructions && (
          <View style={styles.instructionsCard}>
            <View style={styles.cueHeader}>
              <MaterialIcons name="format-list-numbered" size={16} color={C.gold} />
              <Text style={styles.cueTitle}>HOW TO PERFORM</Text>
            </View>
            {instructions.steps.map((step, i) => (
              <View key={i} style={styles.instructionStep}>
                <View style={styles.stepNumberCircle}>
                  <Text style={styles.stepNumber}>{i + 1}</Text>
                </View>
                <Text style={styles.stepText}>{step}</Text>
              </View>
            ))}

            {/* Common Mistakes */}
            <View style={styles.instructionDivider} />
            <View style={styles.cueHeader}>
              <MaterialIcons name="warning" size={14} color={C.red} />
              <Text style={[styles.cueTitle, { color: C.red, fontSize: 11 }]}>AVOID</Text>
            </View>
            {instructions.avoid.map((item, i) => (
              <View key={i} style={styles.avoidItem}>
                <Text style={styles.avoidBullet}>{"\u2022"}</Text>
                <Text style={styles.avoidText}>{item}</Text>
              </View>
            ))}

            {/* Breathing */}
            <View style={styles.instructionDivider} />
            <View style={styles.breathingRow}>
              <MaterialIcons name="air" size={14} color={C.gold} />
              <Text style={styles.breathingText}>{instructions.breathing}</Text>
            </View>
          </View>
        )}

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
              const gifUrl = alt.angleViews[0]?.gifUrl || altDemo.gifUrl;
              const hasGifError = altGifErrors.has(alt.key);

              return (
                <Pressable
                  key={alt.key}
                  onPress={() => {
                    if (Platform.OS !== "web") {
                      Haptics.impactAsync(
                        Haptics.ImpactFeedbackStyle.Light
                      ).catch(() => {});
                    }
                    router.push({
                      pathname: "/exercise-detail" as any,
                      params: { name: alt.name },
                    });
                  }}
                  style={({ pressed }) => [
                    styles.altCard,
                    pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] },
                  ]}
                >
                  <View style={styles.altGifWrap}>
                    {/* FIX: onError handler added. Previously a broken URL
                        rendered an invisible blank box; now shows a fallback
                        dumbbell icon so the card layout is never broken. */}
                    {!hasGifError && gifUrl ? (
                      <Image
                        source={{ uri: gifUrl }}
                        style={styles.altGif}
                        contentFit="contain"
                        cachePolicy="disk"
                        onError={() => {
                          setAltGifErrors((prev) => {
                            const next = new Set(prev);
                            next.add(alt.key);
                            return next;
                          });
                        }}
                      />
                    ) : (
                      // FIX: Fallback when GIF URL is missing or returns 404
                      <View style={styles.altGifFallback}>
                        <MaterialIcons
                          name="fitness-center"
                          size={22}
                          color={C.muted}
                        />
                      </View>
                    )}
                  </View>

                  <View style={styles.altInfo}>
                    <Text style={styles.altName} numberOfLines={1}>
                      {alt.name}
                    </Text>
                    <Text style={styles.altCue} numberOfLines={2}>
                      {alt.cue}
                    </Text>
                    <View style={styles.altMeta}>
                      <View style={styles.altChip}>
                        <Text style={styles.altChipText}>
                          {formatCategory(alt.category)}
                        </Text>
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
  container: { flex: 1, backgroundColor: C.bg },
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
  scrollView: { flex: 1 },
  section: { paddingHorizontal: 16, paddingTop: 16 },
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
  infoItem: { gap: 3 },
  infoLabel: {
    color: C.muted,
    fontFamily: "DMSans_700Bold",
    fontSize: 8,
    letterSpacing: 1.2,
  },
  infoValue: { color: C.fg, fontFamily: "DMSans_500Medium", fontSize: 12 },
  difficultyRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  difficultyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(245,158,11,0.15)",
    borderWidth: 1,
    borderColor: C.border,
  },
  difficultyDotActive: { backgroundColor: C.gold, borderColor: C.gold2 },
  difficultyText: {
    color: C.gold3,
    fontFamily: "DMSans_400Regular",
    fontSize: 10,
    marginLeft: 4,
    textTransform: "capitalize",
  },
  muscleChips: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
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
  muscleChipText: { color: C.gold, fontFamily: "DMSans_500Medium", fontSize: 9 },
  muscleChipTextSecondary: { color: C.muted },
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
  anglesSection: { paddingHorizontal: 16, paddingTop: 16 },
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
  alternativesSection: { paddingHorizontal: 16, paddingTop: 20 },
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
  altGif: { width: 56, height: 56 },
  // FIX: Fallback container shown when GIF URL is broken
  altGifFallback: {
    width: 56,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(30,41,59,0.5)",
  },
  altInfo: { flex: 1, gap: 2 },
  altName: { color: C.fg, fontFamily: "DMSans_600SemiBold", fontSize: 13 },
  altCue: {
    color: C.muted,
    fontFamily: "DMSans_400Regular",
    fontSize: 11,
    lineHeight: 15,
  },
  altMeta: { flexDirection: "row", gap: 4, marginTop: 3 },
  altChip: {
    backgroundColor: "rgba(245,158,11,0.1)",
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  altChipDifficulty: { backgroundColor: "rgba(245,158,11,0.06)" },
  altChipText: {
    color: C.gold,
    fontFamily: "DMSans_500Medium",
    fontSize: 9,
    textTransform: "capitalize",
  },
  // Ã¢ÂÂÃ¢ÂÂ HOW TO PERFORM styles Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
  instructionsCard: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: C.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
  },
  instructionStep: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    gap: 10,
    marginTop: 10,
  },
  stepNumberCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(245,158,11,0.15)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginTop: 1,
  },
  stepNumber: {
    color: C.gold,
    fontFamily: "DMSans_700Bold",
    fontSize: 11,
  },
  stepText: {
    flex: 1,
    color: C.fg,
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
    lineHeight: 20,
  },
  instructionDivider: {
    height: 1,
    backgroundColor: C.border,
    marginVertical: 12,
  },
  avoidItem: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    gap: 6,
    marginTop: 4,
  },
  avoidBullet: {
    color: C.red,
    fontSize: 14,
    lineHeight: 20,
  },
  avoidText: {
    flex: 1,
    color: C.muted,
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    lineHeight: 18,
  },
  breathingRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
  },
  breathingText: {
    flex: 1,
    color: C.gold3 || C.muted,
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    lineHeight: 18,
    fontStyle: "italic" as const,
  },
  videoCredit: {
    color: C.muted,
    fontSize: 11,
    textAlign: "center",
    marginTop: 6,
    fontFamily: "DMSans_400Regular",
  },
});
