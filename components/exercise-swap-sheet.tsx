/**
 * Exercise Swap Sheet — Smart Substitution Modal
 *
 * Bottom sheet that shows smart exercise substitutions when a user
 * wants to swap an exercise in their workout plan. Suggestions are
 * ranked by muscle overlap, equipment match, and difficulty.
 */
import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  FlatList,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { getExerciseDbGifUrl } from "@/lib/exercisedb-api";
import {
  getSubstitutions,
  getFilteredSubstitutions,
  type SubstitutionResult,
} from "@/lib/exercise-substitution";
import { getExerciseInfo, type ExerciseInfo } from "@/lib/exercise-data";

// ── Theme ────────────────────────────────────────────────────────────────────
const C = {
  primary: "#F59E0B",
  primaryGlow: "#FBBF24",
  secondary: "#D97706",
  secondaryDim: "#92400E",
  bg: "#0A0E14",
  surface: "#111827",
  text: "#E2E8F0",
  muted: "#64748B",
  border: "#1E293B",
  success: "#22C55E",
  error: "#EF4444",
};

interface ExerciseSwapSheetProps {
  visible: boolean;
  exerciseName: string;
  onClose: () => void;
  onSwap: (newExercise: ExerciseInfo) => void;
}

// ── Filter Chips ────────────────────────────────────────────────────────────

type FilterType = "all" | "same_equipment" | "beginner" | "has_gif";

const FILTERS: { key: FilterType; label: string }[] = [
  { key: "all", label: "Best Match" },
  { key: "same_equipment", label: "Same Equipment" },
  { key: "beginner", label: "Beginner" },
  { key: "has_gif", label: "Has Demo" },
];

// ── Substitution Card ───────────────────────────────────────────────────────

function SubstitutionCard({
  result,
  onPress,
}: {
  result: SubstitutionResult;
  onPress: () => void;
}) {
  const gifUrl = getExerciseDbGifUrl(result.exercise.name);
  const [imgLoading, setImgLoading] = useState(true);
  const [imgError, setImgError] = useState(false);

  const scoreColor =
    result.matchScore >= 70
      ? C.success
      : result.matchScore >= 40
        ? C.primary
        : C.muted;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        pressed && { opacity: 0.7, transform: [{ scale: 0.98 }] },
      ]}
    >
      {/* GIF Preview */}
      <View style={styles.gifWrap}>
        {gifUrl && !imgError ? (
          <>
            <Image
              source={{ uri: gifUrl }}
              style={styles.gif}
              contentFit="contain"
              autoplay={true}
              onLoad={() => setImgLoading(false)}
              onError={() => setImgError(true)}
            />
            {imgLoading && (
              <View style={styles.gifLoading}>
                <ActivityIndicator size="small" color={C.primary} />
              </View>
            )}
          </>
        ) : (
          <View style={styles.gifPlaceholder}>
            <IconSymbol name="dumbbell.fill" size={18} color={C.muted} />
          </View>
        )}
        {result.hasGif && (
          <View style={styles.gifBadge}>
            <Text style={styles.gifBadgeText}>GIF</Text>
          </View>
        )}
      </View>

      {/* Info */}
      <View style={styles.cardInfo}>
        <Text style={styles.cardName} numberOfLines={1}>
          {result.exercise.name}
        </Text>
        <Text style={styles.cardMeta} numberOfLines={1}>
          {result.exercise.equipment} · {result.exercise.difficulty}
        </Text>
        <Text style={styles.cardReason} numberOfLines={2}>
          {result.reason}
        </Text>
      </View>

      {/* Score */}
      <View style={styles.scoreWrap}>
        <Text style={[styles.scoreText, { color: scoreColor }]}>
          {result.matchScore}%
        </Text>
        <Text style={styles.scoreLabel}>match</Text>
      </View>
    </Pressable>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────

export function ExerciseSwapSheet({
  visible,
  exerciseName,
  onClose,
  onSwap,
}: ExerciseSwapSheetProps) {
  const [filter, setFilter] = useState<FilterType>("all");

  const originalExercise = useMemo(
    () => getExerciseInfo(exerciseName),
    [exerciseName]
  );

  const substitutions = useMemo(() => {
    if (!originalExercise) return [];

    switch (filter) {
      case "same_equipment":
        return getFilteredSubstitutions(exerciseName, {
          equipment: originalExercise.equipment,
          limit: 10,
        });
      case "beginner":
        return getFilteredSubstitutions(exerciseName, {
          difficulty: "beginner",
          limit: 10,
        });
      case "has_gif":
        return getSubstitutions(exerciseName, 20).filter((r) => r.hasGif);
      default:
        return getSubstitutions(exerciseName, 10);
    }
  }, [exerciseName, filter, originalExercise]);

  const handleSwap = useCallback(
    (result: SubstitutionResult) => {
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success
        ).catch(() => {});
      }
      onSwap(result.exercise);
    },
    [onSwap]
  );

  const handleFilterChange = useCallback((f: FilterType) => {
    setFilter(f);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  }, []);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.headerTitle}>Swap Exercise</Text>
              {originalExercise && (
                <Text style={styles.headerSubtitle} numberOfLines={1}>
                  Replacing: {originalExercise.name}
                </Text>
              )}
            </View>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [
                styles.closeBtn,
                pressed && { opacity: 0.6 },
              ]}
            >
              <IconSymbol name="xmark" size={18} color={C.text} />
            </Pressable>
          </View>

          {/* Original exercise muscles */}
          {originalExercise && (
            <View style={styles.muscleRow}>
              <Text style={styles.muscleLabel}>Targeting:</Text>
              {originalExercise.primaryMuscles.map((m) => (
                <View key={m} style={styles.muscleChip}>
                  <Text style={styles.muscleChipText}>
                    {m.replace(/_/g, " ")}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Filter Chips */}
          <View style={styles.filterRow}>
            {FILTERS.map((f) => (
              <Pressable
                key={f.key}
                onPress={() => handleFilterChange(f.key)}
                style={[
                  styles.filterChip,
                  filter === f.key && styles.filterChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    filter === f.key && styles.filterChipTextActive,
                  ]}
                >
                  {f.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Results */}
          <FlatList
            data={substitutions}
            keyExtractor={(item) => item.exercise.key}
            renderItem={({ item }) => (
              <SubstitutionCard
                result={item}
                onPress={() => handleSwap(item)}
              />
            )}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <IconSymbol name="magnifyingglass" size={32} color={C.muted} />
                <Text style={styles.emptyText}>
                  No substitutions found with this filter
                </Text>
                <Pressable
                  onPress={() => setFilter("all")}
                  style={styles.emptyBtn}
                >
                  <Text style={styles.emptyBtnText}>Show All</Text>
                </Pressable>
              </View>
            }
          />
        </View>
      </View>
    </Modal>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "80%",
    minHeight: 400,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignSelf: "center",
    marginTop: 8,
    marginBottom: 8,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: C.primary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: C.muted,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  muscleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
    flexWrap: "wrap",
  },
  muscleLabel: {
    fontSize: 11,
    color: C.muted,
    fontWeight: "600",
  },
  muscleChip: {
    backgroundColor: "rgba(245,158,11,0.12)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.2)",
  },
  muscleChipText: {
    color: C.primary,
    fontSize: 10,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  filterRow: {
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "rgba(30,41,59,0.6)",
    borderWidth: 1,
    borderColor: "transparent",
  },
  filterChipActive: {
    backgroundColor: "rgba(245,158,11,0.15)",
    borderColor: "rgba(245,158,11,0.3)",
  },
  filterChipText: {
    color: C.muted,
    fontSize: 11,
    fontWeight: "600",
  },
  filterChipTextActive: {
    color: C.primary,
  },
  listContent: {
    padding: 16,
    gap: 8,
    paddingBottom: 40,
  },
  // Card
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: C.border,
    gap: 10,
  },
  gifWrap: {
    width: 56,
    height: 56,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  gif: {
    width: 56,
    height: 56,
  },
  gifLoading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  gifPlaceholder: {
    width: 56,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(30,41,59,0.5)",
  },
  gifBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    backgroundColor: "rgba(245,158,11,0.9)",
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  gifBadgeText: {
    color: "#000",
    fontSize: 7,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  cardInfo: {
    flex: 1,
    gap: 2,
  },
  cardName: {
    fontSize: 14,
    fontWeight: "600",
    color: C.text,
  },
  cardMeta: {
    fontSize: 11,
    color: C.muted,
  },
  cardReason: {
    fontSize: 10,
    color: C.secondary,
    marginTop: 2,
  },
  scoreWrap: {
    alignItems: "center",
    minWidth: 44,
  },
  scoreText: {
    fontSize: 16,
    fontWeight: "800",
  },
  scoreLabel: {
    fontSize: 8,
    color: C.muted,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    color: C.muted,
    textAlign: "center",
  },
  emptyBtn: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "rgba(245,158,11,0.12)",
  },
  emptyBtnText: {
    color: C.primary,
    fontSize: 12,
    fontWeight: "600",
  },
});
