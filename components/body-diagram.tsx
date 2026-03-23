/**
 * Body Diagram Component
 *
 * SVG-based human body diagram (front and back views) with muscle group highlighting.
 * Highlights primary and secondary muscle groups targeted by an exercise.
 */
import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Path, G, Rect } from "react-native-svg";

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
  /** Primary muscle groups (highlighted in gold) */
  primary: MuscleGroup[];
  /** Secondary muscle groups (highlighted in dim gold) */
  secondary?: MuscleGroup[];
  /** Width of the diagram */
  width?: number;
  /** Height of the diagram */
  height?: number;
  /** Whether to show labels */
  showLabels?: boolean;
  /** Whether to show both front and back views */
  showBothViews?: boolean;
}

// Colors
const C = {
  bg: "transparent",
  body: "#2A1A00",
  bodyStroke: "rgba(245,158,11,0.2)",
  primary: "#F59E0B",
  primaryGlow: "rgba(245,158,11,0.4)",
  secondary: "rgba(245,158,11,0.35)",
  secondaryGlow: "rgba(245,158,11,0.15)",
  label: "#FDE68A",
  muted: "#B45309",
};

// Muscle region SVG paths for FRONT view (simplified anatomical paths)
// Viewbox: 0 0 120 240
const FRONT_MUSCLES: Record<string, string> = {
  // Head/neck
  head: "M52,8 Q60,0 68,8 Q72,16 68,24 L52,24 Q48,16 52,8 Z",
  neck: "M54,24 L66,24 L64,32 L56,32 Z",
  // Chest (pectorals)
  chest: "M38,42 Q42,36 52,38 L60,38 Q68,36 72,38 Q82,42 82,52 Q78,56 72,56 L60,54 L48,56 Q42,56 38,52 Z",
  // Shoulders (deltoids)
  shoulders_l: "M28,36 Q32,32 38,36 L40,46 Q36,50 30,48 Q26,44 28,36 Z",
  shoulders_r: "M82,36 Q88,32 92,36 Q94,44 90,48 Q84,50 80,46 L82,36 Z",
  // Biceps
  biceps_l: "M28,50 Q32,48 34,52 L34,70 Q32,74 28,72 Q24,68 24,58 Z",
  biceps_r: "M86,52 Q88,48 92,50 Q96,58 96,68 Q92,72 88,70 L86,52 Z",
  // Forearms
  forearms_l: "M26,74 Q30,72 34,74 L32,96 Q28,98 26,96 L26,74 Z",
  forearms_r: "M86,74 Q90,72 94,74 L94,96 Q92,98 88,96 L86,74 Z",
  // Abs
  abs: "M48,56 L72,56 Q74,62 74,72 L74,88 Q72,94 68,96 L52,96 Q48,94 46,88 L46,72 Q46,62 48,56 Z",
  // Obliques
  obliques_l: "M38,56 L48,56 L46,88 L42,92 Q36,86 36,72 Z",
  obliques_r: "M72,56 L82,56 Q84,72 84,86 Q78,92 74,88 L72,56 Z",
  // Quads
  quads_l: "M42,98 Q46,96 52,98 L54,140 Q52,148 48,150 Q42,148 40,140 Z",
  quads_r: "M68,98 Q74,96 78,98 Q80,140 78,148 Q72,150 68,148 L66,140 Z",
  // Hip flexors
  hip_flexors: "M52,96 L68,96 L66,104 L54,104 Z",
  // Calves (front - tibialis)
  calves_l: "M42,154 Q46,150 50,154 L50,186 Q48,192 44,190 Q40,186 42,154 Z",
  calves_r: "M70,154 Q74,150 78,154 Q80,186 76,190 Q72,192 70,186 Z",
  // Feet
  feet_l: "M40,192 L52,192 L52,200 Q48,204 40,200 Z",
  feet_r: "M68,192 L80,192 Q80,200 72,204 Q68,200 68,192 Z",
};

// Muscle region SVG paths for BACK view
const BACK_MUSCLES: Record<string, string> = {
  head: "M52,8 Q60,0 68,8 Q72,16 68,24 L52,24 Q48,16 52,8 Z",
  neck: "M54,24 L66,24 L64,32 L56,32 Z",
  // Traps
  traps: "M42,32 Q50,28 60,28 Q70,28 78,32 L80,44 Q70,40 60,40 Q50,40 40,44 Z",
  // Lats
  lats_l: "M36,44 Q40,40 46,44 L46,72 Q42,78 36,74 Z",
  lats_r: "M74,44 Q80,40 84,44 L84,74 Q78,78 74,72 Z",
  // Back (mid back / rhomboids)
  back: "M46,44 L74,44 L74,72 L46,72 Z",
  // Lower back
  lower_back: "M46,72 L74,72 L74,92 Q70,96 60,96 Q50,96 46,92 Z",
  // Rear delts
  shoulders_l: "M28,36 Q32,32 38,36 L40,46 Q36,50 30,48 Q26,44 28,36 Z",
  shoulders_r: "M82,36 Q88,32 92,36 Q94,44 90,48 Q84,50 80,46 L82,36 Z",
  // Triceps
  triceps_l: "M28,50 Q32,48 34,52 L34,70 Q32,74 28,72 Q24,68 24,58 Z",
  triceps_r: "M86,52 Q88,48 92,50 Q96,58 96,68 Q92,72 88,70 L86,52 Z",
  // Forearms
  forearms_l: "M26,74 Q30,72 34,74 L32,96 Q28,98 26,96 L26,74 Z",
  forearms_r: "M86,74 Q90,72 94,74 L94,96 Q92,98 88,96 L86,74 Z",
  // Glutes
  glutes_l: "M42,94 Q50,92 56,96 L56,112 Q50,116 42,112 Z",
  glutes_r: "M64,96 Q70,92 78,94 L78,112 Q70,116 64,112 Z",
  // Hamstrings
  hamstrings_l: "M42,114 Q46,112 52,114 L54,148 Q50,152 44,150 Q40,146 42,114 Z",
  hamstrings_r: "M68,114 Q74,112 78,114 Q80,146 76,150 Q70,152 66,148 Z",
  // Calves
  calves_l: "M42,154 Q46,150 50,154 L50,186 Q48,192 44,190 Q40,186 42,154 Z",
  calves_r: "M70,154 Q74,150 78,154 Q80,186 76,190 Q72,192 70,186 Z",
  feet_l: "M40,192 L52,192 L52,200 Q48,204 40,200 Z",
  feet_r: "M68,192 L80,192 Q80,200 72,204 Q68,200 68,192 Z",
};

// Map MuscleGroup to SVG path keys
const MUSCLE_TO_FRONT_PATHS: Record<MuscleGroup, string[]> = {
  chest: ["chest"],
  back: [],
  shoulders: ["shoulders_l", "shoulders_r"],
  biceps: ["biceps_l", "biceps_r"],
  triceps: [],
  forearms: ["forearms_l", "forearms_r"],
  abs: ["abs"],
  obliques: ["obliques_l", "obliques_r"],
  quads: ["quads_l", "quads_r"],
  hamstrings: [],
  glutes: [],
  calves: ["calves_l", "calves_r"],
  traps: [],
  lats: [],
  lower_back: [],
  hip_flexors: ["hip_flexors"],
  full_body: ["chest", "shoulders_l", "shoulders_r", "biceps_l", "biceps_r", "abs", "quads_l", "quads_r", "calves_l", "calves_r"],
};

const MUSCLE_TO_BACK_PATHS: Record<MuscleGroup, string[]> = {
  chest: [],
  back: ["back"],
  shoulders: ["shoulders_l", "shoulders_r"],
  biceps: [],
  triceps: ["triceps_l", "triceps_r"],
  forearms: ["forearms_l", "forearms_r"],
  abs: [],
  obliques: [],
  quads: [],
  hamstrings: ["hamstrings_l", "hamstrings_r"],
  glutes: ["glutes_l", "glutes_r"],
  calves: ["calves_l", "calves_r"],
  traps: ["traps"],
  lats: ["lats_l", "lats_r"],
  lower_back: ["lower_back"],
  hip_flexors: [],
  full_body: ["back", "traps", "lats_l", "lats_r", "shoulders_l", "shoulders_r", "triceps_l", "triceps_r", "glutes_l", "glutes_r", "hamstrings_l", "hamstrings_r", "calves_l", "calves_r"],
};

// Determine which view to show based on muscle groups
function needsFrontView(muscles: MuscleGroup[]): boolean {
  return muscles.some(m => MUSCLE_TO_FRONT_PATHS[m]?.length > 0);
}

function needsBackView(muscles: MuscleGroup[]): boolean {
  return muscles.some(m => MUSCLE_TO_BACK_PATHS[m]?.length > 0);
}

function BodyView({
  view,
  primaryPaths,
  secondaryPaths,
  width,
  height,
}: {
  view: "front" | "back";
  primaryPaths: Set<string>;
  secondaryPaths: Set<string>;
  width: number;
  height: number;
}) {
  const musclePaths = view === "front" ? FRONT_MUSCLES : BACK_MUSCLES;

  return (
    <View style={{ alignItems: "center" }}>
      <Svg width={width} height={height} viewBox="0 0 120 210">
        {/* Body outline */}
        <G>
          {Object.entries(musclePaths).map(([key, path]) => {
            const isPrimary = primaryPaths.has(key);
            const isSecondary = secondaryPaths.has(key);

            return (
              <Path
                key={key}
                d={path}
                fill={isPrimary ? C.primary : isSecondary ? C.secondary : C.body}
                stroke={isPrimary ? C.primary : isSecondary ? C.secondaryGlow : C.bodyStroke}
                strokeWidth={isPrimary ? 1.5 : 0.8}
                opacity={isPrimary ? 1 : isSecondary ? 0.8 : 0.5}
              />
            );
          })}
        </G>
      </Svg>
      <Text style={styles.viewLabel}>{view === "front" ? "Front" : "Back"}</Text>
    </View>
  );
}

export function BodyDiagram({
  primary,
  secondary = [],
  width = 60,
  height = 110,
  showLabels = false,
  showBothViews = false,
}: BodyDiagramProps) {
  const allMuscles = [...primary, ...secondary];

  // Compute which paths to highlight
  const { frontPrimary, frontSecondary, backPrimary, backSecondary } = useMemo(() => {
    const fp = new Set<string>();
    const fs = new Set<string>();
    const bp = new Set<string>();
    const bs = new Set<string>();

    for (const m of primary) {
      for (const p of (MUSCLE_TO_FRONT_PATHS[m] || [])) fp.add(p);
      for (const p of (MUSCLE_TO_BACK_PATHS[m] || [])) bp.add(p);
    }
    for (const m of secondary) {
      for (const p of (MUSCLE_TO_FRONT_PATHS[m] || [])) { if (!fp.has(p)) fs.add(p); }
      for (const p of (MUSCLE_TO_BACK_PATHS[m] || [])) { if (!bp.has(p)) bs.add(p); }
    }

    return { frontPrimary: fp, frontSecondary: fs, backPrimary: bp, backSecondary: bs };
  }, [primary, secondary]);

  const showFront = needsFrontView(allMuscles);
  const showBack = needsBackView(allMuscles);

  // If showBothViews, always show both
  const renderFront = showBothViews || showFront;
  const renderBack = showBothViews || showBack;

  // If only one view needed and not forcing both
  const singleView = !showBothViews && ((showFront && !showBack) || (!showFront && showBack));
  const viewWidth = singleView ? width : Math.floor(width * 0.48);
  const viewHeight = singleView ? height : height;

  return (
    <View style={styles.container}>
      <View style={styles.diagramRow}>
        {renderFront && (
          <BodyView
            view="front"
            primaryPaths={frontPrimary}
            secondaryPaths={frontSecondary}
            width={viewWidth}
            height={viewHeight}
          />
        )}
        {renderBack && (
          <BodyView
            view="back"
            primaryPaths={backPrimary}
            secondaryPaths={backSecondary}
            width={viewWidth}
            height={viewHeight}
          />
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
              <View style={[styles.labelDot, { backgroundColor: C.secondary }]} />
              <Text style={[styles.labelText, { color: C.muted }]}>{formatMuscle(m)}</Text>
            </View>
          ))}
        </View>
      )}
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
  return (
    <BodyDiagram
      primary={primary}
      secondary={secondary}
      width={44}
      height={80}
      showLabels={false}
      showBothViews={false}
    />
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
  viewLabel: {
    color: "#B45309",
    fontFamily: "DMSans_400Regular",
    fontSize: 8,
    marginTop: 2,
    textAlign: "center",
    letterSpacing: 0.5,
  },
  labelRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 6,
    justifyContent: "center",
  },
  labelChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  labelDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  labelText: {
    color: "#FDE68A",
    fontFamily: "DMSans_500Medium",
    fontSize: 9,
    letterSpacing: 0.3,
  },
});
