/**
 * Body Diagram Component — 3D Anatomical Model
 *
 * SVG-based human body diagram with 3D depth effects using gradients,
 * shadows, and anatomically detailed muscle group paths.
 * Supports front and back views with primary/secondary muscle highlighting.
 */
import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Path, G, Defs, LinearGradient, RadialGradient, Stop, Ellipse, Circle } from "react-native-svg";

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

// 3D Color palette with depth
const C = {
  bg: "transparent",
  // Body base colors (dark with subtle warmth for 3D effect)
  bodyBase: "#1A0F00",
  bodyMid: "#2A1800",
  bodyLight: "#3D2400",
  bodyStroke: "rgba(245,158,11,0.15)",
  // Highlighted muscle colors
  primary: "#F59E0B",
  primaryLight: "#FBBF24",
  primaryDark: "#D97706",
  primaryGlow: "rgba(245,158,11,0.5)",
  secondary: "rgba(245,158,11,0.4)",
  secondaryLight: "rgba(251,191,36,0.3)",
  secondaryDark: "rgba(217,119,6,0.3)",
  // Labels
  label: "#FDE68A",
  muted: "#B45309",
  // Outline / contour
  outline: "rgba(245,158,11,0.12)",
  contour: "rgba(245,158,11,0.08)",
};

// ─── FRONT VIEW MUSCLES ─── (viewBox: 0 0 200 380)
// More anatomically detailed paths with curves for 3D appearance
const FRONT_MUSCLES: Record<string, string> = {
  // Head
  head: "M86,14 Q100,2 114,14 Q120,28 114,42 L86,42 Q80,28 86,14 Z",
  neck: "M90,42 L110,42 L108,54 L92,54 Z",
  // Chest — two pec shapes with separation line
  chest_l: "M62,72 Q68,64 82,66 L96,68 L96,82 Q92,92 82,94 Q70,92 62,86 Z",
  chest_r: "M104,68 Q118,64 128,66 Q138,72 138,86 Q130,92 118,94 L104,82 L104,68 Z",
  // Shoulders (deltoids) — rounded cap shape
  shoulders_l: "M44,60 Q52,52 62,58 L66,72 Q62,80 54,78 Q42,74 40,66 Z",
  shoulders_r: "M138,58 Q148,52 156,60 Q160,66 158,74 Q150,80 142,78 Q138,74 134,72 Z",
  // Biceps — bulging shape
  biceps_l: "M42,80 Q48,76 54,80 L56,104 Q52,112 46,110 Q38,106 38,92 Z",
  biceps_r: "M146,80 Q152,76 158,80 Q162,92 162,106 Q156,110 150,108 L144,104 Z",
  // Forearms
  forearms_l: "M40,114 Q46,110 54,114 L52,158 Q46,162 42,160 L40,114 Z",
  forearms_r: "M146,114 Q154,110 160,114 L158,160 Q154,162 148,158 Z",
  // Abs — 6-pack segments
  abs_upper: "M82,94 L118,94 Q120,100 120,108 L80,108 Q80,100 82,94 Z",
  abs_mid: "M80,110 L120,110 L120,128 L80,128 Z",
  abs_lower: "M80,130 L120,130 Q122,142 118,152 L82,152 Q78,142 80,130 Z",
  // Obliques — side muscles
  obliques_l: "M62,88 L80,94 L78,148 Q72,154 66,148 Q58,132 58,108 Z",
  obliques_r: "M120,94 L138,88 Q142,108 142,132 Q136,148 130,154 Q122,148 122,148 Z",
  // Quads — inner/outer separation
  quads_l: "M68,158 Q78,152 88,158 L90,228 Q86,240 80,242 Q70,240 66,228 Z",
  quads_r: "M112,158 Q122,152 132,158 Q134,228 132,240 Q122,244 116,242 L110,228 Z",
  // Hip flexors
  hip_flexors: "M88,152 L112,152 L110,166 L90,166 Z",
  // Calves (tibialis anterior)
  calves_l: "M68,248 Q76,242 84,248 L84,302 Q80,310 74,308 Q66,304 68,248 Z",
  calves_r: "M116,248 Q124,242 132,248 Q134,304 128,308 Q122,310 118,302 Z",
  // Feet
  feet_l: "M64,312 L86,312 L86,326 Q80,332 64,326 Z",
  feet_r: "M114,312 L136,312 Q136,326 120,332 Q114,326 114,312 Z",
};

// ─── BACK VIEW MUSCLES ─── (viewBox: 0 0 200 380)
const BACK_MUSCLES: Record<string, string> = {
  head: "M86,14 Q100,2 114,14 Q120,28 114,42 L86,42 Q80,28 86,14 Z",
  neck: "M90,42 L110,42 L108,54 L92,54 Z",
  // Traps — diamond shape
  traps: "M68,52 Q84,46 100,46 Q116,46 132,52 L136,72 Q116,66 100,66 Q84,66 64,72 Z",
  // Lats — wide V-shape
  lats_l: "M56,74 Q64,68 76,74 L76,118 Q68,126 56,120 Z",
  lats_r: "M124,74 Q136,68 144,74 L144,120 Q132,126 124,118 Z",
  // Mid back (rhomboids)
  back: "M76,74 L124,74 L124,118 L76,118 Z",
  // Lower back (erector spinae)
  lower_back: "M76,120 L124,120 L124,148 Q118,156 100,156 Q82,156 76,148 Z",
  // Rear delts
  shoulders_l: "M44,60 Q52,52 62,58 L66,72 Q62,80 54,78 Q42,74 40,66 Z",
  shoulders_r: "M138,58 Q148,52 156,60 Q160,66 158,74 Q150,80 142,78 Q138,74 134,72 Z",
  // Triceps — horseshoe shape
  triceps_l: "M42,80 Q48,76 54,80 L56,104 Q52,112 46,110 Q38,106 38,92 Z",
  triceps_r: "M146,80 Q152,76 158,80 Q162,92 162,106 Q156,110 150,108 L144,104 Z",
  // Forearms
  forearms_l: "M40,114 Q46,110 54,114 L52,158 Q46,162 42,160 L40,114 Z",
  forearms_r: "M146,114 Q154,110 160,114 L158,160 Q154,162 148,158 Z",
  // Glutes
  glutes_l: "M68,150 Q82,146 94,152 L94,178 Q82,184 68,178 Z",
  glutes_r: "M106,152 Q118,146 132,150 L132,178 Q118,184 106,178 Z",
  // Hamstrings
  hamstrings_l: "M68,182 Q78,178 88,182 L90,238 Q84,244 76,242 Q66,238 68,182 Z",
  hamstrings_r: "M112,182 Q122,178 132,182 Q134,238 126,242 Q118,244 112,238 Z",
  // Calves (gastrocnemius — diamond shape)
  calves_l: "M68,248 Q76,242 84,248 L84,302 Q80,310 74,308 Q66,304 68,248 Z",
  calves_r: "M116,248 Q124,242 132,248 Q134,304 128,308 Q122,310 118,302 Z",
  feet_l: "M64,312 L86,312 L86,326 Q80,332 64,326 Z",
  feet_r: "M114,312 L136,312 Q136,326 120,332 Q114,326 114,312 Z",
};

// Body outline paths for 3D contour effect
const BODY_OUTLINE_FRONT = "M100,8 Q120,2 124,20 Q128,38 118,46 L114,54 Q126,56 140,60 Q162,68 164,82 Q166,100 162,116 L158,162 Q154,168 148,162 L146,114 Q140,108 134,112 L138,92 Q142,80 140,72 Q136,64 128,66 Q122,64 118,66 L104,68 L96,68 Q92,64 86,66 Q78,64 72,66 Q64,72 62,80 L66,92 L70,112 Q64,108 58,114 L56,162 Q50,168 46,162 L42,116 Q38,100 40,82 Q42,68 60,60 Q74,56 86,54 L82,46 Q72,38 76,20 Q80,2 100,8 Z M88,152 Q96,148 100,148 Q104,148 112,152 L116,158 Q124,152 134,158 Q138,228 136,244 Q128,252 118,248 L118,302 Q122,312 136,312 Q138,326 120,334 Q114,328 114,312 L112,248 Q108,244 100,244 Q92,244 88,248 L86,312 Q86,328 80,334 Q64,326 66,312 L86,312 Q78,312 82,302 L82,248 Q72,252 66,244 Q62,228 66,158 Q76,152 84,158 Z";
const BODY_OUTLINE_BACK = BODY_OUTLINE_FRONT; // Same silhouette

// Map MuscleGroup to SVG path keys
const MUSCLE_TO_FRONT_PATHS: Record<MuscleGroup, string[]> = {
  chest: ["chest_l", "chest_r"],
  back: [],
  shoulders: ["shoulders_l", "shoulders_r"],
  biceps: ["biceps_l", "biceps_r"],
  triceps: [],
  forearms: ["forearms_l", "forearms_r"],
  abs: ["abs_upper", "abs_mid", "abs_lower"],
  obliques: ["obliques_l", "obliques_r"],
  quads: ["quads_l", "quads_r"],
  hamstrings: [],
  glutes: [],
  calves: ["calves_l", "calves_r"],
  traps: [],
  lats: [],
  lower_back: [],
  hip_flexors: ["hip_flexors"],
  full_body: ["chest_l", "chest_r", "shoulders_l", "shoulders_r", "biceps_l", "biceps_r", "abs_upper", "abs_mid", "abs_lower", "quads_l", "quads_r", "calves_l", "calves_r"],
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

function needsFrontView(muscles: MuscleGroup[]): boolean {
  return muscles.some(m => MUSCLE_TO_FRONT_PATHS[m]?.length > 0);
}

function needsBackView(muscles: MuscleGroup[]): boolean {
  return muscles.some(m => MUSCLE_TO_BACK_PATHS[m]?.length > 0);
}

/** Render a single body view (front or back) with 3D gradient effects */
function BodyView3D({
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
      <Svg width={width} height={height} viewBox="0 0 200 340">
        <Defs>
          {/* 3D body gradient — top-lit for depth */}
          <LinearGradient id="bodyGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={C.bodyLight} stopOpacity="0.7" />
            <Stop offset="0.5" stopColor={C.bodyMid} stopOpacity="0.5" />
            <Stop offset="1" stopColor={C.bodyBase} stopOpacity="0.6" />
          </LinearGradient>
          {/* Primary muscle gradient — glowing 3D effect */}
          <RadialGradient id="primaryGrad" cx="0.5" cy="0.4" rx="0.6" ry="0.6">
            <Stop offset="0" stopColor={C.primaryLight} stopOpacity="1" />
            <Stop offset="0.6" stopColor={C.primary} stopOpacity="0.9" />
            <Stop offset="1" stopColor={C.primaryDark} stopOpacity="0.8" />
          </RadialGradient>
          {/* Secondary muscle gradient */}
          <RadialGradient id="secondaryGrad" cx="0.5" cy="0.4" rx="0.6" ry="0.6">
            <Stop offset="0" stopColor={C.secondaryLight} stopOpacity="0.6" />
            <Stop offset="0.6" stopColor={C.secondary} stopOpacity="0.5" />
            <Stop offset="1" stopColor={C.secondaryDark} stopOpacity="0.4" />
          </RadialGradient>
          {/* Ambient glow for highlighted muscles */}
          <RadialGradient id="glowGrad" cx="0.5" cy="0.5" rx="0.8" ry="0.8">
            <Stop offset="0" stopColor={C.primary} stopOpacity="0.3" />
            <Stop offset="1" stopColor={C.primary} stopOpacity="0" />
          </RadialGradient>
        </Defs>

        {/* Subtle ambient glow behind highlighted muscles */}
        {Array.from(primaryPaths).map((key) => {
          const path = musclePaths[key];
          if (!path) return null;
          return (
            <Path
              key={`glow-${key}`}
              d={path}
              fill="url(#glowGrad)"
              stroke="none"
              strokeWidth={0}
              transform="scale(1.08) translate(-8, -8)"
            />
          );
        })}

        {/* Body contour outline for 3D silhouette */}
        <Path
          d={view === "front" ? BODY_OUTLINE_FRONT : BODY_OUTLINE_BACK}
          fill="none"
          stroke={C.contour}
          strokeWidth={0.8}
          opacity={0.3}
        />

        {/* Muscle regions */}
        <G>
          {Object.entries(musclePaths).map(([key, path]) => {
            const isPrimary = primaryPaths.has(key);
            const isSecondary = secondaryPaths.has(key);

            let fill = "url(#bodyGrad)";
            let stroke = C.bodyStroke;
            let strokeWidth = 0.6;
            let opacity = 0.4;

            if (isPrimary) {
              fill = "url(#primaryGrad)";
              stroke = C.primaryLight;
              strokeWidth = 1.2;
              opacity = 1;
            } else if (isSecondary) {
              fill = "url(#secondaryGrad)";
              stroke = C.secondary;
              strokeWidth = 0.8;
              opacity = 0.85;
            }

            return (
              <G key={key}>
                {/* Shadow layer for 3D depth */}
                {(isPrimary || isSecondary) && (
                  <Path
                    d={path}
                    fill="none"
                    stroke={isPrimary ? C.primaryDark : C.secondaryDark}
                    strokeWidth={2.5}
                    opacity={0.3}
                  />
                )}
                {/* Main muscle shape */}
                <Path
                  d={path}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={strokeWidth}
                  opacity={opacity}
                  strokeLinejoin="round"
                />
                {/* Inner highlight for 3D bulge effect on primary muscles */}
                {isPrimary && (
                  <Path
                    d={path}
                    fill="none"
                    stroke={C.primaryLight}
                    strokeWidth={0.4}
                    opacity={0.5}
                    strokeDasharray="2,3"
                  />
                )}
              </G>
            );
          })}
        </G>

        {/* Center line for anatomical reference */}
        <Path
          d="M100,46 L100,156"
          stroke={C.outline}
          strokeWidth={0.4}
          opacity={0.2}
          strokeDasharray="3,4"
        />

        {/* Joint indicators for 3D depth */}
        {[
          [100, 46], // neck
          [54, 78], [146, 78], // shoulders
          [50, 112], [150, 112], // elbows
          [100, 152], // hips
          [82, 244], [118, 244], // knees
        ].map(([cx, cy], i) => (
          <Circle
            key={`joint-${i}`}
            cx={cx}
            cy={cy}
            r={2}
            fill={C.outline}
            opacity={0.15}
          />
        ))}
      </Svg>
      <Text style={styles.viewLabel}>{view === "front" ? "FRONT" : "BACK"}</Text>
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

  const renderFront = showBothViews || showFront;
  const renderBack = showBothViews || showBack;

  const singleView = !showBothViews && ((showFront && !showBack) || (!showFront && showBack));
  const viewWidth = singleView ? width : Math.floor(width * 0.48);
  const viewHeight = singleView ? height : height;

  return (
    <View style={styles.container}>
      <View style={styles.diagramRow}>
        {renderFront && (
          <BodyView3D
            view="front"
            primaryPaths={frontPrimary}
            secondaryPaths={frontSecondary}
            width={viewWidth}
            height={viewHeight}
          />
        )}
        {renderBack && (
          <BodyView3D
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

/** Compact inline body diagram for exercise cards — 3D mini version */
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
    fontFamily: "DMSans_600SemiBold",
    fontSize: 7,
    marginTop: 3,
    textAlign: "center",
    letterSpacing: 1.5,
    textTransform: "uppercase",
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
    color: "#FDE68A",
    fontFamily: "DMSans_500Medium",
    fontSize: 9,
    letterSpacing: 0.3,
  },
});
