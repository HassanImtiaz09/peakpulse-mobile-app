/**
 * Body Diagram Component — Detailed Anatomical Model
 *
 * Uses react-native-body-highlighter for professional anatomical SVG body diagrams
 * with accurate muscle group highlighting. Supports front and back views,
 * primary/secondary muscle highlighting with intensity-based colors.
 *
 * Themed to match the app's gold/dark aesthetic.
 */
import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, Pressable, Platform } from "react-native";
import Body, { type Slug, type ExtendedBodyPart } from "react-native-body-highlighter";
import * as Haptics from "expo-haptics";

export type MuscleGroup =
  | "chest"
  | "back"
  | "shoulders"
  | "biceps"
  | "triceps"
  | "forearms"
  | "abs"
  | "obliques"
  | "quads"
  | "hamstrings"
  | "glutes"
  | "calves"
  | "traps"
  | "lats"
  | "lower_back"
  | "hip_flexors"
  | "full_body";

interface BodyDiagramProps {
  primary: MuscleGroup[];
  secondary?: MuscleGroup[];
  width?: number;
  height?: number;
  showLabels?: boolean;
  showBothViews?: boolean;
}

// Theme colors
const C = {
  primary: "#F59E0B",
  primaryLight: "#FBBF24",
  secondary: "#D97706",
  secondaryLight: "#B45309",
  label: "#FDE68A",
  muted: "#B45309",
  bg: "#0A0500",
  surface: "#150A00",
  border: "rgba(245,158,11,0.15)",
  bodyDefault: "#1A1A2E",
  bodyStroke: "rgba(245,158,11,0.08)",
};

/**
 * Map our MuscleGroup type to react-native-body-highlighter slug(s).
 *
 * The library uses these slugs:
 * Front: chest, biceps, abs, obliques, quadriceps, tibialis, deltoids, forearm,
 *        adductors, neck, hands, feet, head, knees
 * Back:  upper-back, lower-back, hamstring, gluteal, trapezius, triceps,
 *        forearm, calves, deltoids, neck, hands, feet, head, abductors
 * Both:  trapezius, triceps, forearm, adductors, calves, hair, neck,
 *        deltoids, hands, feet, head, ankles
 */
const MUSCLE_TO_SLUGS: Record<MuscleGroup, { front: Slug[]; back: Slug[] }> = {
  chest:       { front: ["chest"],                          back: [] },
  back:        { front: [],                                 back: ["upper-back"] },
  shoulders:   { front: ["deltoids"],                       back: ["deltoids"] },
  biceps:      { front: ["biceps"],                         back: [] },
  triceps:     { front: [],                                 back: ["triceps"] },
  forearms:    { front: ["forearm"],                         back: ["forearm"] },
  abs:         { front: ["abs"],                            back: [] },
  obliques:    { front: ["obliques"],                       back: [] },
  quads:       { front: ["quadriceps"],                     back: [] },
  hamstrings:  { front: [],                                 back: ["hamstring"] },
  glutes:      { front: [],                                 back: ["gluteal"] },
  calves:      { front: ["tibialis"],                       back: ["calves"] },
  traps:       { front: ["trapezius"],                      back: ["trapezius"] },
  lats:        { front: [],                                 back: ["upper-back"] },
  lower_back:  { front: [],                                 back: ["lower-back"] },
  hip_flexors: { front: ["adductors"],                      back: [] },
  full_body:   {
    front: ["chest", "biceps", "abs", "obliques", "quadriceps", "deltoids", "forearm", "tibialis"],
    back: ["upper-back", "lower-back", "hamstring", "gluteal", "trapezius", "triceps", "calves", "deltoids"],
  },
};

/** Check if any muscles need the front view */
function needsFrontView(muscles: MuscleGroup[]): boolean {
  return muscles.some((m) => MUSCLE_TO_SLUGS[m]?.front.length > 0);
}

/** Check if any muscles need the back view */
function needsBackView(muscles: MuscleGroup[]): boolean {
  return muscles.some((m) => MUSCLE_TO_SLUGS[m]?.back.length > 0);
}

/** Build body-highlighter data array for a given side */
function buildBodyData(
  primary: MuscleGroup[],
  secondary: MuscleGroup[],
  side: "front" | "back"
): ExtendedBodyPart[] {
  const data: ExtendedBodyPart[] = [];
  const seen = new Set<Slug>();

  // Primary muscles — intensity 2 (brighter)
  for (const m of primary) {
    const slugs = side === "front" ? MUSCLE_TO_SLUGS[m]?.front : MUSCLE_TO_SLUGS[m]?.back;
    if (!slugs) continue;
    for (const slug of slugs) {
      if (!seen.has(slug)) {
        seen.add(slug);
        data.push({ slug, intensity: 2, color: C.primary });
      }
    }
  }

  // Secondary muscles — intensity 1 (dimmer)
  for (const m of secondary) {
    const slugs = side === "front" ? MUSCLE_TO_SLUGS[m]?.front : MUSCLE_TO_SLUGS[m]?.back;
    if (!slugs) continue;
    for (const slug of slugs) {
      if (!seen.has(slug)) {
        seen.add(slug);
        data.push({ slug, intensity: 1, color: C.secondaryLight });
      }
    }
  }

  return data;
}

/** Full body diagram with front/back views */
export function BodyDiagram({
  primary,
  secondary = [],
  width = 100,
  height = 160,
  showLabels = false,
  showBothViews = false,
}: BodyDiagramProps) {
  const allMuscles = [...primary, ...secondary];
  const showFront = showBothViews || needsFrontView(allMuscles);
  const showBack = showBothViews || needsBackView(allMuscles);
  const bothViews = showFront && showBack;

  const frontData = useMemo(() => buildBodyData(primary, secondary, "front"), [primary, secondary]);
  const backData = useMemo(() => buildBodyData(primary, secondary, "back"), [primary, secondary]);

  // Scale factor for the body highlighter
  const scale = bothViews ? (width * 0.48) / 80 : width / 80;

  return (
    <View style={styles.container}>
      <View style={styles.diagramRow}>
        {showFront && (
          <View style={styles.viewContainer}>
            <View style={styles.bodyWrap}>
              <Body
                data={frontData}
                gender="male"
                side="front"
                scale={scale}
                border={C.bodyStroke}
                colors={[C.secondaryLight, C.primary]}
              />
            </View>
            <Text style={styles.viewLabel}>FRONT</Text>
          </View>
        )}
        {showBack && (
          <View style={styles.viewContainer}>
            <View style={styles.bodyWrap}>
              <Body
                data={backData}
                gender="male"
                side="back"
                scale={scale}
                border={C.bodyStroke}
                colors={[C.secondaryLight, C.primary]}
              />
            </View>
            <Text style={styles.viewLabel}>BACK</Text>
          </View>
        )}
      </View>
      {showLabels && primary.length > 0 && (
        <View style={styles.labelRow}>
          {primary.map((m) => (
            <View key={m} style={styles.labelChip}>
              <View style={[styles.labelDot, { backgroundColor: C.primary }]} />
              <Text style={styles.labelText}>{formatMuscle(m)}</Text>
            </View>
          ))}
          {secondary.map((m) => (
            <View key={m} style={styles.labelChip}>
              <View style={[styles.labelDot, { backgroundColor: C.secondaryLight }]} />
              <Text style={[styles.labelText, { color: C.muted }]}>{formatMuscle(m)}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

/** Interactive body diagram with front/back toggle for exercise detail screen */
export function BodyDiagramInteractive({
  primary,
  secondary = [],
}: {
  primary: MuscleGroup[];
  secondary?: MuscleGroup[];
}) {
  const allMuscles = [...primary, ...secondary];
  const hasFront = needsFrontView(allMuscles);
  const hasBack = needsBackView(allMuscles);
  const [side, setSide] = useState<"front" | "back">(hasFront ? "front" : "back");

  const frontData = useMemo(() => buildBodyData(primary, secondary, "front"), [primary, secondary]);
  const backData = useMemo(() => buildBodyData(primary, secondary, "back"), [primary, secondary]);

  const toggleSide = () => {
    setSide((s) => (s === "front" ? "back" : "front"));
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  };

  return (
    <View style={styles.interactiveContainer}>
      <View style={styles.bodyWrapLarge}>
        <Body
          data={side === "front" ? frontData : backData}
          gender="male"
          side={side}
          scale={1.3}
          border={C.bodyStroke}
          colors={[C.secondaryLight, C.primary]}
        />
      </View>
      {hasFront && hasBack && (
        <View style={styles.toggleRow}>
          <Pressable
            onPress={() => { setSide("front"); if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); }}
            style={[styles.toggleBtn, side === "front" && styles.toggleBtnActive]}
          >
            <Text style={[styles.toggleTxt, side === "front" && styles.toggleTxtActive]}>Front</Text>
          </Pressable>
          <Pressable
            onPress={() => { setSide("back"); if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); }}
            style={[styles.toggleBtn, side === "back" && styles.toggleBtnActive]}
          >
            <Text style={[styles.toggleTxt, side === "back" && styles.toggleTxtActive]}>Back</Text>
          </Pressable>
        </View>
      )}
      {/* Muscle labels */}
      <View style={styles.labelRow}>
        {primary.map((m) => (
          <View key={m} style={styles.labelChip}>
            <View style={[styles.labelDot, { backgroundColor: C.primary }]} />
            <Text style={styles.labelText}>{formatMuscle(m)}</Text>
          </View>
        ))}
        {secondary.map((m) => (
          <View key={m} style={styles.labelChip}>
            <View style={[styles.labelDot, { backgroundColor: C.secondaryLight }]} />
            <Text style={[styles.labelText, { color: C.muted }]}>{formatMuscle(m)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/** Compact inline body diagram for exercise cards */
export function BodyDiagramInline({
  primary,
  secondary = [],
}: {
  primary: MuscleGroup[];
  secondary?: MuscleGroup[];
}) {
  const allMuscles = [...primary, ...secondary];
  const showFront = needsFrontView(allMuscles);

  const data = useMemo(
    () => buildBodyData(primary, secondary, showFront ? "front" : "back"),
    [primary, secondary, showFront]
  );

  return (
    <View style={styles.inlineWrap}>
      <Body
        data={data}
        gender="male"
        side={showFront ? "front" : "back"}
        scale={0.45}
        border={C.bodyStroke}
        colors={[C.secondaryLight, C.primary]}
      />
    </View>
  );
}

function formatMuscle(m: MuscleGroup): string {
  return m.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
  },
  diagramRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 4,
  },
  viewContainer: {
    alignItems: "center",
  },
  bodyWrap: {
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  bodyWrapLarge: {
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 200,
  },
  viewLabel: {
    color: C.muted,
    fontSize: 8,
    fontWeight: "600",
    marginTop: 4,
    textAlign: "center",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  labelRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
    justifyContent: "center",
  },
  labelChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(245,158,11,0.06)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.12)",
  },
  labelDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  labelText: {
    color: C.label,
    fontSize: 10,
    fontWeight: "500",
    letterSpacing: 0.3,
  },
  interactiveContainer: {
    alignItems: "center",
    gap: 8,
  },
  toggleRow: {
    flexDirection: "row",
    gap: 4,
    marginTop: 4,
  },
  toggleBtn: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "rgba(245,158,11,0.08)",
    borderWidth: 1,
    borderColor: "transparent",
  },
  toggleBtnActive: {
    backgroundColor: "rgba(245,158,11,0.15)",
    borderColor: "rgba(245,158,11,0.3)",
  },
  toggleTxt: {
    color: C.muted,
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  toggleTxtActive: {
    color: C.primary,
  },
  inlineWrap: {
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    width: 44,
    height: 80,
  },
});
