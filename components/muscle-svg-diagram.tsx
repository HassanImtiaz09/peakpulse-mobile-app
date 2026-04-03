/**
 * Muscle SVG Diagram — Pure SVG anatomical muscle diagrams
 *
 * High-quality, scalable vector muscle diagrams that highlight targeted muscles
 * for each exercise. Built with react-native-svg for crisp rendering at any size.
 *
 * Two variants:
 * - MuscleSvgDiagram: Full-size diagram with front/back toggle and labels
 * - MuscleSvgMini: Compact inline diagram for exercise cards (44×80)
 */
import React, { useMemo, useState, useCallback } from "react";
import { View, Text, StyleSheet, Pressable, Platform } from "react-native";
import Svg, { Path, G, Rect, Ellipse, Circle } from "react-native-svg";
import * as Haptics from "expo-haptics";
import type { MuscleGroup } from "@/components/body-diagram";
import { C } from "@/constants/ui-colors";

// Theme colors matching the app's gold/dark aesthetic
// ── SVG Path Data ────────────────────────────────────────────────────────────
// Simplified anatomical paths for front and back views.
// Each path represents a muscle group region.

const FRONT_PATHS: Record<string, string> = {
  // Head/neck (decorative)
  head: "M44,4 C48,4 52,6 52,12 L52,18 C52,22 48,26 44,26 C40,26 36,22 36,18 L36,12 C36,6 40,4 44,4 Z",
  neck: "M40,26 L48,26 L49,32 L39,32 Z",

  // Chest (pectorals)
  chest_l: "M27,34 L43,34 L43,50 C40,52 34,52 27,48 Z",
  chest_r: "M45,34 L61,34 L61,48 C54,52 48,52 45,50 Z",

  // Shoulders (deltoids)
  shoulders_l: "M20,32 L27,34 L27,48 L18,44 C16,40 17,35 20,32 Z",
  shoulders_r: "M68,32 L61,34 L61,48 L70,44 C72,40 71,35 68,32 Z",

  // Biceps
  biceps_l: "M18,44 L27,48 L25,62 L16,58 Z",
  biceps_r: "M70,44 L61,48 L63,62 L72,58 Z",

  // Forearms
  forearms_l: "M16,58 L25,62 L23,78 L14,74 Z",
  forearms_r: "M72,58 L63,62 L65,78 L74,74 Z",

  // Abs (rectus abdominis)
  abs: "M37,50 L51,50 L51,72 L37,72 Z",

  // Obliques
  obliques_l: "M27,48 L37,50 L37,72 L28,68 Z",
  obliques_r: "M61,48 L51,50 L51,72 L60,68 Z",

  // Quads
  quads_l: "M28,72 L43,72 L41,100 L26,96 Z",
  quads_r: "M45,72 L60,72 L62,96 L47,100 Z",

  // Tibialis / shins
  shins_l: "M26,100 L41,100 L39,124 L24,120 Z",
  shins_r: "M47,100 L62,100 L64,120 L49,124 Z",

  // Hip flexors / adductors
  hip_flexors: "M37,72 L51,72 L48,88 L40,88 Z",
};

const BACK_PATHS: Record<string, string> = {
  head: "M44,4 C48,4 52,6 52,12 L52,18 C52,22 48,26 44,26 C40,26 36,22 36,18 L36,12 C36,6 40,4 44,4 Z",
  neck: "M40,26 L48,26 L49,32 L39,32 Z",

  // Traps
  traps: "M30,30 L58,30 L54,38 L34,38 Z",

  // Rear delts
  shoulders_l: "M20,32 L30,34 L28,48 L18,44 C16,40 17,35 20,32 Z",
  shoulders_r: "M68,32 L58,34 L60,48 L70,44 C72,40 71,35 68,32 Z",

  // Lats
  lats_l: "M27,38 L40,40 L38,60 L25,56 Z",
  lats_r: "M61,38 L48,40 L50,60 L63,56 Z",

  // Upper back / rhomboids
  upper_back: "M34,38 L54,38 L52,52 L36,52 Z",

  // Lower back (erector spinae)
  lower_back: "M36,52 L52,52 L50,68 L38,68 Z",

  // Triceps
  triceps_l: "M18,44 L28,48 L26,62 L16,58 Z",
  triceps_r: "M70,44 L60,48 L62,62 L72,58 Z",

  // Forearms
  forearms_l: "M16,58 L26,62 L24,78 L14,74 Z",
  forearms_r: "M72,58 L62,62 L64,78 L74,74 Z",

  // Glutes
  glutes_l: "M28,68 L43,68 L43,82 L26,80 Z",
  glutes_r: "M45,68 L60,68 L62,80 L45,82 Z",

  // Hamstrings
  hamstrings_l: "M26,82 L43,82 L41,106 L24,102 Z",
  hamstrings_r: "M45,82 L62,82 L64,102 L47,106 Z",

  // Calves
  calves_l: "M24,106 L41,106 L39,126 L22,122 Z",
  calves_r: "M47,106 L64,106 L66,122 L49,126 Z",
};

// ── Muscle Group → SVG Path Mapping ──────────────────────────────────────────

const MUSCLE_TO_FRONT_PATHS: Record<MuscleGroup, string[]> = {
  chest:       ["chest_l", "chest_r"],
  shoulders:   ["shoulders_l", "shoulders_r"],
  biceps:      ["biceps_l", "biceps_r"],
  forearms:    ["forearms_l", "forearms_r"],
  abs:         ["abs"],
  obliques:    ["obliques_l", "obliques_r"],
  quads:       ["quads_l", "quads_r"],
  hip_flexors: ["hip_flexors"],
  // These don't show on front
  back: [], lats: [], traps: [], lower_back: [],
  triceps: [], hamstrings: [], glutes: [], calves: [],
  full_body: ["chest_l", "chest_r", "shoulders_l", "shoulders_r", "biceps_l", "biceps_r", "abs", "obliques_l", "obliques_r", "quads_l", "quads_r"],
};

const MUSCLE_TO_BACK_PATHS: Record<MuscleGroup, string[]> = {
  back:        ["upper_back"],
  lats:        ["lats_l", "lats_r"],
  traps:       ["traps"],
  lower_back:  ["lower_back"],
  shoulders:   ["shoulders_l", "shoulders_r"],
  triceps:     ["triceps_l", "triceps_r"],
  forearms:    ["forearms_l", "forearms_r"],
  glutes:      ["glutes_l", "glutes_r"],
  hamstrings:  ["hamstrings_l", "hamstrings_r"],
  calves:      ["calves_l", "calves_r"],
  // These don't show on back
  chest: [], biceps: [], abs: [], obliques: [], quads: [], hip_flexors: [],
  full_body: ["traps", "upper_back", "lats_l", "lats_r", "lower_back", "shoulders_l", "shoulders_r", "triceps_l", "triceps_r", "glutes_l", "glutes_r", "hamstrings_l", "hamstrings_r", "calves_l", "calves_r"],
};

function hasFrontMuscles(muscles: MuscleGroup[]): boolean {
  return muscles.some((m) => (MUSCLE_TO_FRONT_PATHS[m]?.length ?? 0) > 0);
}

function hasBackMuscles(muscles: MuscleGroup[]): boolean {
  return muscles.some((m) => (MUSCLE_TO_BACK_PATHS[m]?.length ?? 0) > 0);
}

function getHighlightedPaths(
  primary: MuscleGroup[],
  secondary: MuscleGroup[],
  side: "front" | "back"
): { primary: Set<string>; secondary: Set<string> } {
  const map = side === "front" ? MUSCLE_TO_FRONT_PATHS : MUSCLE_TO_BACK_PATHS;
  const pSet = new Set<string>();
  const sSet = new Set<string>();

  for (const m of primary) {
    for (const p of map[m] ?? []) pSet.add(p);
  }
  for (const m of secondary) {
    for (const p of map[m] ?? []) {
      if (!pSet.has(p)) sSet.add(p);
    }
  }
  return { primary: pSet, secondary: sSet };
}

// ── SVG Body Renderer ────────────────────────────────────────────────────────

function SvgBody({
  side,
  primary,
  secondary,
  width,
  height,
}: {
  side: "front" | "back";
  primary: MuscleGroup[];
  secondary: MuscleGroup[];
  width: number;
  height: number;
}) {
  const paths = side === "front" ? FRONT_PATHS : BACK_PATHS;
  const highlighted = useMemo(
    () => getHighlightedPaths(primary, secondary, side),
    [primary, secondary, side]
  );

  return (
    <Svg width={width} height={height} viewBox="0 0 88 130">
      {/* Body outline background */}
      <Rect x="0" y="0" width="88" height="130" fill="transparent" />

      {/* Render all muscle paths */}
      {Object.entries(paths).map(([key, d]) => {
        const isPrimary = highlighted.primary.has(key);
        const isSecondary = highlighted.secondary.has(key);
        const fill = isPrimary
          ? C.primary
          : isSecondary
          ? C.secondaryDim
          : C.inactive;
        const opacity = isPrimary ? 1 : isSecondary ? 0.7 : 0.3;
        const strokeColor = isPrimary
          ? C.primaryGlow
          : isSecondary
          ? C.secondary
          : C.outline;
        const strokeWidth = isPrimary ? 1.2 : 0.6;

        return (
          <Path
            key={key}
            d={d}
            fill={fill}
            opacity={opacity}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
        );
      })}
    </Svg>
  );
}

// ── Public Components ────────────────────────────────────────────────────────

interface MuscleSvgDiagramProps {
  primary: MuscleGroup[];
  secondary?: MuscleGroup[];
  width?: number;
  height?: number;
  showLabels?: boolean;
  showToggle?: boolean;
}

/**
 * Full-size SVG anatomical muscle diagram with front/back toggle.
 * Use in exercise detail screens and workout day summaries.
 */
export function MuscleSvgDiagram({
  primary,
  secondary = [],
  width = 120,
  height = 180,
  showLabels = true,
  showToggle = true,
}: MuscleSvgDiagramProps) {
  const allMuscles = [...primary, ...secondary];
  const showFront = hasFrontMuscles(allMuscles);
  const showBack = hasBackMuscles(allMuscles);
  const [side, setSide] = useState<"front" | "back">(showFront ? "front" : "back");

  const toggleSide = useCallback(() => {
    setSide((s) => (s === "front" ? "back" : "front"));
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  }, []);

  return (
    <View style={styles.container}>
      <SvgBody
        side={side}
        primary={primary}
        secondary={secondary}
        width={width}
        height={height}
      />

      {showToggle && showFront && showBack && (
        <View style={styles.toggleRow}>
          <Pressable
            onPress={() => setSide("front")}
            style={[styles.toggleBtn, side === "front" && styles.toggleBtnActive]}
          >
            <Text style={[styles.toggleTxt, side === "front" && styles.toggleTxtActive]}>Front</Text>
          </Pressable>
          <Pressable
            onPress={() => setSide("back")}
            style={[styles.toggleBtn, side === "back" && styles.toggleBtnActive]}
          >
            <Text style={[styles.toggleTxt, side === "back" && styles.toggleTxtActive]}>Back</Text>
          </Pressable>
        </View>
      )}

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
              <View style={[styles.labelDot, { backgroundColor: C.secondaryDim }]} />
              <Text style={[styles.labelText, { color: C.muted }]}>{formatMuscle(m)}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

/**
 * Compact inline SVG muscle diagram for exercise cards.
 * Shows a small body silhouette with highlighted muscles.
 * Automatically picks front or back view based on targeted muscles.
 */
export function MuscleSvgMini({
  primary,
  secondary = [],
  width = 40,
  height = 60,
}: {
  primary: MuscleGroup[];
  secondary?: MuscleGroup[];
  width?: number;
  height?: number;
}) {
  const allMuscles = [...primary, ...secondary];
  const side = hasFrontMuscles(allMuscles) ? "front" : "back";

  return (
    <View style={styles.miniWrap}>
      <SvgBody
        side={side}
        primary={primary}
        secondary={secondary}
        width={width}
        height={height}
      />
    </View>
  );
}

/**
 * Dual-view SVG muscle diagram showing both front and back side by side.
 * Use in workout day summary cards.
 */
export function MuscleSvgDual({
  primary,
  secondary = [],
  width = 80,
  height = 120,
}: {
  primary: MuscleGroup[];
  secondary?: MuscleGroup[];
  width?: number;
  height?: number;
}) {
  return (
    <View style={styles.dualRow}>
      <View style={styles.dualView}>
        <SvgBody side="front" primary={primary} secondary={secondary} width={width} height={height} />
        <Text style={styles.dualLabel}>FRONT</Text>
      </View>
      <View style={styles.dualView}>
        <SvgBody side="back" primary={primary} secondary={secondary} width={width} height={height} />
        <Text style={styles.dualLabel}>BACK</Text>
      </View>
    </View>
  );
}

function formatMuscle(m: MuscleGroup): string {
  return m.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: 8,
  },
  toggleRow: {
    flexDirection: "row",
    gap: 4,
  },
  toggleBtn: {
    paddingHorizontal: 14,
    paddingVertical: 5,
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
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  toggleTxtActive: {
    color: C.primary,
  },
  labelRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    justifyContent: "center",
  },
  labelChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(245,158,11,0.06)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.12)",
  },
  labelDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  labelText: {
    color: C.label,
    fontSize: 9,
    fontWeight: "500",
    letterSpacing: 0.2,
  },
  miniWrap: {
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    width: 44,
    height: 64,
  },
  dualRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
  },
  dualView: {
    alignItems: "center",
  },
  dualLabel: {
    color: C.muted,
    fontSize: 7,
    fontWeight: "600",
    marginTop: 2,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
});
