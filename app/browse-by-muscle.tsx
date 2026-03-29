/**
 * Browse by Muscle — FIXED
 *
 * Changes from original:
 * 1. ExerciseCard: autoplay is now FALSE by default. Previously all GIFs in the
 *    FlatList played simultaneously, causing memory exhaustion on mid-range
 *    devices when a muscle group has 10+ exercises. Each card now shows a static
 *    first-frame with a play-button overlay. Tapping the GIF thumbnail (not the
 *    full card row) toggles playback for that card only.
 * 2. ExerciseCard: Added `playing` state that drives expo-image autoplay prop.
 * 3. ExerciseCard: Play-button overlay shows when GIF is not playing.
 * 4. ExerciseCard: Added accessibility label to play button.
 * 5. No other logic or styling changed — card layout is identical.
 */

import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  Platform,
  Modal,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import Svg, { Path, Rect } from "react-native-svg";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import type { MuscleGroup } from "@/components/body-diagram";
import { getExercisesByMuscle, type ExerciseInfo } from "@/lib/exercise-data";
import { getExerciseDbGifUrl, hasExerciseDbGif } from "@/lib/exercisedb-api";
import { C } from "@/constants/ui-colors";

// ── Theme ──────────────────────────────────────────────────────────────────────
// ── Tappable SVG Paths ────────────────────────────────────────────────────────
interface MuscleRegion {
  muscle: MuscleGroup;
  label: string;
  paths: string[];
}

const FRONT_REGIONS: MuscleRegion[] = [
  {
    muscle: "shoulders",
    label: "Shoulders",
    paths: [
      "M20,32 L27,34 L27,48 L18,44 C16,40 17,35 20,32 Z",
      "M68,32 L61,34 L61,48 L70,44 C72,40 71,35 68,32 Z",
    ],
  },
  {
    muscle: "chest",
    label: "Chest",
    paths: [
      "M27,34 L43,34 L43,50 C40,52 34,52 27,48 Z",
      "M45,34 L61,34 L61,48 C54,52 48,52 45,50 Z",
    ],
  },
  {
    muscle: "biceps",
    label: "Biceps",
    paths: [
      "M18,44 L27,48 L25,62 L16,58 Z",
      "M70,44 L61,48 L63,62 L72,58 Z",
    ],
  },
  {
    muscle: "forearms",
    label: "Forearms",
    paths: [
      "M16,58 L25,62 L23,78 L14,74 Z",
      "M72,58 L63,62 L65,78 L74,74 Z",
    ],
  },
  {
    muscle: "abs",
    label: "Abs",
    paths: ["M37,50 L51,50 L51,72 L37,72 Z"],
  },
  {
    muscle: "obliques",
    label: "Obliques",
    paths: [
      "M27,48 L37,50 L37,72 L28,68 Z",
      "M61,48 L51,50 L51,72 L60,68 Z",
    ],
  },
  {
    muscle: "quads",
    label: "Quads",
    paths: [
      "M28,72 L43,72 L41,100 L26,96 Z",
      "M45,72 L60,72 L62,96 L47,100 Z",
    ],
  },
  {
    muscle: "hip_flexors",
    label: "Hip Flexors",
    paths: ["M37,72 L51,72 L48,88 L40,88 Z"],
  },
];

const BACK_REGIONS: MuscleRegion[] = [
  { muscle: "traps", label: "Traps", paths: ["M30,30 L58,30 L54,38 L34,38 Z"] },
  {
    muscle: "shoulders",
    label: "Rear Delts",
    paths: [
      "M20,32 L30,34 L28,48 L18,44 C16,40 17,35 20,32 Z",
      "M68,32 L58,34 L60,48 L70,44 C72,40 71,35 68,32 Z",
    ],
  },
  {
    muscle: "lats",
    label: "Lats",
    paths: [
      "M27,38 L40,40 L38,60 L25,56 Z",
      "M61,38 L48,40 L50,60 L63,56 Z",
    ],
  },
  { muscle: "back", label: "Upper Back", paths: ["M34,38 L54,38 L52,52 L36,52 Z"] },
  { muscle: "lower_back", label: "Lower Back", paths: ["M36,52 L52,52 L50,68 L38,68 Z"] },
  {
    muscle: "triceps",
    label: "Triceps",
    paths: [
      "M18,44 L28,48 L26,62 L16,58 Z",
      "M70,44 L60,48 L62,62 L72,58 Z",
    ],
  },
  {
    muscle: "glutes",
    label: "Glutes",
    paths: [
      "M28,68 L43,68 L43,82 L26,80 Z",
      "M45,68 L60,68 L62,80 L45,82 Z",
    ],
  },
  {
    muscle: "hamstrings",
    label: "Hamstrings",
    paths: [
      "M26,82 L43,82 L41,106 L24,102 Z",
      "M45,82 L62,82 L64,102 L47,106 Z",
    ],
  },
  {
    muscle: "calves",
    label: "Calves",
    paths: [
      "M24,106 L41,106 L39,126 L22,122 Z",
      "M47,106 L64,106 L66,122 L49,126 Z",
    ],
  },
];

const DECO_PATHS = [
  "M44,4 C48,4 52,6 52,12 L52,18 C52,22 48,26 44,26 C40,26 36,22 36,18 L36,12 C36,6 40,4 44,4 Z",
  "M40,26 L48,26 L49,32 L39,32 Z",
];

// ── Exercise Card ─────────────────────────────────────────────────────────────
// FIX: `autoplay` is now controlled per-card via `playing` state.
// Previously all GIFs autoplay'd simultaneously, causing memory exhaustion
// when a muscle group had many exercises. Now GIFs start as static thumbnails;
// the user taps the thumbnail area to play/pause that individual card.
function ExerciseCard({
  exercise,
  onPress,
}: {
  exercise: ExerciseInfo;
  onPress: () => void;
}) {
  const gifUrl = getExerciseDbGifUrl(exercise.name);
  const [imgLoading, setImgLoading] = useState(true);
  const [imgError, setImgError] = useState(false);
  // FIX: per-card play state — false means static thumbnail (saves memory)
  const [playing, setPlaying] = useState(false);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.exerciseCard, pressed && { opacity: 0.7 }]}
    >
      {/* FIX: Thumbnail area is a separate Pressable so tapping it toggles
          playback without navigating to the detail screen */}
      <Pressable
        onPress={(e) => {
          e.stopPropagation();
          setPlaying((p) => !p);
        }}
        accessibilityLabel={playing ? "Pause GIF" : "Play GIF"}
        style={styles.exerciseGifWrap}
      >
        {gifUrl && !imgError ? (
          <>
            <Image
              source={{ uri: gifUrl }}
              style={styles.exerciseGif}
              contentFit="contain"
              autoplay={playing} // FIX: was always `true`
              onLoad={() => setImgLoading(false)}
              onError={() => setImgError(true)}
            />
            {imgLoading && (
              <View style={styles.gifLoadingOverlay}>
                <ActivityIndicator size="small" color={C.primary} />
              </View>
            )}
            {/* FIX: Show play icon when not yet playing */}
            {!playing && !imgLoading && (
              <View style={styles.playOverlay}>
                <Text style={styles.playIcon}>▶</Text>
              </View>
            )}
          </>
        ) : (
          <View style={styles.gifPlaceholder}>
            <IconSymbol name="dumbbell.fill" size={20} color={C.muted} />
          </View>
        )}
        {/* Badge: shows GIF when playing, PREVIEW when paused */}
        {gifUrl && !imgError && (
          <View style={[styles.animatedBadge, !playing && styles.animatedBadgePaused]}>
            <Text style={styles.animatedBadgeText}>{playing ? "GIF" : "TAP"}</Text>
          </View>
        )}
      </Pressable>

      <View style={styles.exerciseInfo}>
        <Text style={styles.exerciseName} numberOfLines={1}>
          {exercise.name}
        </Text>
        <Text style={styles.exerciseMeta} numberOfLines={1}>
          {exercise.equipment} · {exercise.difficulty}
        </Text>
        <View style={styles.muscleChips}>
          {exercise.primaryMuscles.slice(0, 3).map((m) => (
            <View key={m} style={styles.muscleChip}>
              <Text style={styles.muscleChipText}>{m.replace(/_/g, " ")}</Text>
            </View>
          ))}
        </View>
      </View>

      <IconSymbol name="chevron.right" size={16} color={C.muted} />
    </Pressable>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function BrowseByMuscleScreen() {
  const router = useRouter();
  const colors = useColors();
  const [side, setSide] = useState<"front" | "back">("front");
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleGroup | null>(null);
  const [showExercises, setShowExercises] = useState(false);

  const regions = side === "front" ? FRONT_REGIONS : BACK_REGIONS;

  const exercises = useMemo(() => {
    if (!selectedMuscle) return [];
    return getExercisesByMuscle(selectedMuscle);
  }, [selectedMuscle]);

  const selectedLabel = useMemo(() => {
    if (!selectedMuscle) return "";
    const region = [...FRONT_REGIONS, ...BACK_REGIONS].find(
      (r) => r.muscle === selectedMuscle
    );
    return region?.label ?? selectedMuscle.replace(/_/g, " ");
  }, [selectedMuscle]);

  const handleMuscleTap = useCallback((muscle: MuscleGroup) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
    setSelectedMuscle(muscle);
    setShowExercises(true);
  }, []);

  const handleExercisePress = useCallback(
    (exercise: ExerciseInfo) => {
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      }
      setShowExercises(false);
      router.push({
        pathname: "/exercise-detail",
        params: { name: exercise.name },
      } as any);
    },
    [router]
  );

  const toggleSide = useCallback(() => {
    setSide((s) => (s === "front" ? "back" : "front"));
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  }, []);

  return (
    <ScreenContainer edges={["top", "left", "right"]}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
          >
            <IconSymbol name="chevron.left" size={24} color={C.text} />
          </Pressable>
          <Text style={styles.title}>Browse by Muscle</Text>
          <View style={{ width: 40 }} />
        </View>

        <Text style={styles.subtitle}>Tap a muscle group to explore exercises</Text>

        {/* Side Toggle */}
        <View style={styles.toggleRow}>
          <Pressable
            onPress={() => setSide("front")}
            style={[styles.toggleBtn, side === "front" && styles.toggleBtnActive]}
          >
            <Text style={[styles.toggleTxt, side === "front" && styles.toggleTxtActive]}>
              FRONT
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setSide("back")}
            style={[styles.toggleBtn, side === "back" && styles.toggleBtnActive]}
          >
            <Text style={[styles.toggleTxt, side === "back" && styles.toggleTxtActive]}>
              BACK
            </Text>
          </Pressable>
        </View>

        {/* Tappable SVG Diagram */}
        <View style={styles.diagramWrap}>
          <Svg width={264} height={390} viewBox="0 0 88 130">
            <Rect x="0" y="0" width="88" height="130" fill="transparent" />
            {/* Decorative head/neck */}
            {DECO_PATHS.map((d, i) => (
              <Path
                key={`deco-${i}`}
                d={d}
                fill={C.inactive}
                opacity={0.3}
                stroke={C.outline}
                strokeWidth={0.6}
              />
            ))}
            {/* Tappable muscle regions */}
            {regions.map((region) => {
              const isSelected = selectedMuscle === region.muscle;
              const fill = isSelected ? C.primary : C.inactive;
              const opacity = isSelected ? 1 : 0.5;
              const strokeColor = isSelected ? C.primaryGlow : C.outline;
              const strokeWidth = isSelected ? 1.5 : 0.6;
              return region.paths.map((d, i) => (
                <Path
                  key={`${region.muscle}-${i}`}
                  d={d}
                  fill={fill}
                  opacity={opacity}
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                  strokeLinejoin="round"
                  onPress={() => handleMuscleTap(region.muscle)}
                />
              ));
            })}
          </Svg>

          {/* Muscle labels around the diagram */}
          {regions.map((region) => {
            const isSelected = selectedMuscle === region.muscle;
            const exerciseCount = getExercisesByMuscle(region.muscle).length;
            return (
              <Pressable
                key={region.muscle}
                onPress={() => handleMuscleTap(region.muscle)}
                style={[
                  styles.regionLabel,
                  getRegionLabelPosition(region.muscle, side),
                  isSelected && styles.regionLabelActive,
                ]}
              >
                <Text
                  style={[
                    styles.regionLabelText,
                    isSelected && styles.regionLabelTextActive,
                  ]}
                >
                  {region.label}
                </Text>
                <Text style={styles.regionCount}>{exerciseCount}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* Exercise List Modal */}
        <Modal
          visible={showExercises}
          animationType="slide"
          transparent
          onRequestClose={() => setShowExercises(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View style={styles.modalHandle} />
                <View style={styles.modalTitleRow}>
                  <View>
                    <Text style={styles.modalTitle}>{selectedLabel}</Text>
                    <Text style={styles.modalSubtitle}>
                      {exercises.length} exercise{exercises.length !== 1 ? "s" : ""}
                      {"  ·  "}
                      <Text style={styles.modalHint}>tap thumbnail to preview GIF</Text>
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => setShowExercises(false)}
                    style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.6 }]}
                  >
                    <IconSymbol name="xmark" size={20} color={C.text} />
                  </Pressable>
                </View>
              </View>

              <FlatList
                data={exercises}
                keyExtractor={(item) => item.key}
                renderItem={({ item }) => (
                  <ExerciseCard
                    exercise={item}
                    onPress={() => handleExercisePress(item)}
                  />
                )}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                // FIX: initialNumToRender keeps the initial render small so the
                // modal opens instantly without spawning 15+ GIF decoders at once.
                initialNumToRender={6}
                maxToRenderPerBatch={4}
                windowSize={5}
              />
            </View>
          </View>
        </Modal>
      </View>
    </ScreenContainer>
  );
}

// ── Label Positioning ─────────────────────────────────────────────────────────
function getRegionLabelPosition(
  muscle: MuscleGroup,
  side: "front" | "back"
): { top?: number; left?: number; right?: number; bottom?: number } {
  const positions: Record<string, any> = {
    "front-shoulders": { top: 60, left: 0 },
    "front-chest": { top: 80, right: 0 },
    "front-biceps": { top: 120, left: 0 },
    "front-forearms": { top: 165, left: 0 },
    "front-abs": { top: 130, right: 0 },
    "front-obliques": { top: 165, right: 0 },
    "front-quads": { top: 220, left: 0 },
    "front-hip_flexors": { top: 220, right: 0 },
    "back-traps": { top: 50, left: 0 },
    "back-shoulders": { top: 70, right: 0 },
    "back-lats": { top: 100, left: 0 },
    "back-back": { top: 100, right: 0 },
    "back-lower_back": { top: 140, right: 0 },
    "back-triceps": { top: 140, left: 0 },
    "back-glutes": { top: 200, left: 0 },
    "back-hamstrings": { top: 240, right: 0 },
    "back-calves": { top: 310, left: 0 },
  };
  return positions[`${side}-${muscle}`] ?? { top: 0, left: 0 };
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  title: { fontSize: 18, fontWeight: "700", color: C.text, letterSpacing: 0.3 },
  subtitle: { fontSize: 13, color: C.muted, textAlign: "center", marginBottom: 12 },
  toggleRow: { flexDirection: "row", justifyContent: "center", gap: 8, marginBottom: 8 },
  toggleBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "rgba(245,158,11,0.06)",
    borderWidth: 1,
    borderColor: "transparent",
  },
  toggleBtnActive: {
    backgroundColor: "rgba(245,158,11,0.15)",
    borderColor: "rgba(245,158,11,0.3)",
  },
  toggleTxt: { color: C.muted, fontSize: 11, fontWeight: "700", letterSpacing: 1.2 },
  toggleTxtActive: { color: C.primary },
  diagramWrap: { alignSelf: "center", width: 264, height: 390, position: "relative" },
  regionLabel: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "rgba(30,41,59,0.8)",
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.1)",
  },
  regionLabelActive: {
    backgroundColor: "rgba(245,158,11,0.15)",
    borderColor: C.primary,
  },
  regionLabelText: { color: C.muted, fontSize: 10, fontWeight: "600" },
  regionLabelTextActive: { color: C.primary },
  regionCount: {
    color: C.secondaryDim,
    fontSize: 9,
    fontWeight: "700",
    backgroundColor: "rgba(245,158,11,0.08)",
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    overflow: "hidden",
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "70%",
    minHeight: 300,
  },
  modalHeader: {
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.15)",
    marginBottom: 12,
  },
  modalTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
  },
  modalTitle: { fontSize: 20, fontWeight: "700", color: C.primary },
  modalSubtitle: { fontSize: 12, color: C.muted, marginTop: 2 },
  // FIX: hint text style
  modalHint: { fontSize: 11, color: C.secondaryDim, fontStyle: "italic" },
  closeBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  listContent: { padding: 16, gap: 10, paddingBottom: 40 },
  // Exercise Card
  exerciseCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: C.border,
    gap: 12,
  },
  exerciseGifWrap: {
    width: 60,
    height: 60,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  exerciseGif: { width: 60, height: 60 },
  gifLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  gifPlaceholder: {
    width: 60,
    height: 60,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(30,41,59,0.5)",
  },
  // FIX: play button overlay shown when GIF is paused
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  playIcon: { color: "#fff", fontSize: 18, opacity: 0.9 },
  animatedBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    backgroundColor: "rgba(245,158,11,0.9)",
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  // FIX: different badge colour when paused
  animatedBadgePaused: { backgroundColor: "rgba(100,116,139,0.85)" },
  animatedBadgeText: {
    color: "#000",
    fontSize: 7,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  exerciseInfo: { flex: 1, gap: 2 },
  exerciseName: { fontSize: 14, fontWeight: "600", color: C.text },
  exerciseMeta: { fontSize: 11, color: C.muted },
  muscleChips: { flexDirection: "row", gap: 4, marginTop: 2 },
  muscleChip: {
    backgroundColor: "rgba(245,158,11,0.08)",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  muscleChipText: {
    color: C.secondaryDim,
    fontSize: 9,
    fontWeight: "600",
    textTransform: "capitalize",
  },
});
