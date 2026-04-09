/**
 * Body Heatmap Component
 *
 * Gender-aware SVG body diagram with heatmap coloring:
 * - Over-exercised: Red/warm tones
 * - Optimal: Green
 * - Under-exercised: Blue/cool tones
 * - Not tracked: Dim base color
 *
 * Supports both "target" mode (gold highlights for today's workout)
 * and "balance" mode (heatmap for muscle balance analysis).
 */
import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Path, G, Defs, LinearGradient, Stop } from "react-native-svg";
import type { MuscleGroup } from "@/components/body-diagram";
import type { MuscleStatus, MuscleBalanceEntry } from "@/lib/muscle-balance";
import { UI } from "@/constants/ui-colors";

// ── Types ────────────────────────────────────────────────────────────────────

type Gender = "male" | "female";
type HeatmapMode = "target" | "balance";

interface BodyHeatmapProps {
  /** Gender for body silhouette */
  gender?: Gender;
  /** Mode: "target" for today's workout, "balance" for muscle analysis */
  mode: HeatmapMode;
  /** For "target" mode: primary muscles to highlight */
  targetPrimary?: MuscleGroup[];
  /** For "target" mode: secondary muscles to highlight */
  targetSecondary?: MuscleGroup[];
  /** For "balance" mode: muscle balance entries with status */
  balanceEntries?: MuscleBalanceEntry[];
  /** Width of each body view */
  width?: number;
  /** Height of each body view */
  height?: number;
  /** Show labels */
  showLabels?: boolean;
  /** Show legend */
  showLegend?: boolean;
}

// ── Colors ───────────────────────────────────────────────────────────────────

const COLORS = {
  // Base body — MUCH lighter for visibility on dark backgrounds
  bodyMale: "#3D2E1A",            // Warm dark brown (visible against dark BG)
  bodyFemale: "#3A2428",          // Warm dark rose-brown
  bodyStroke: UI.bodyStroke, // Gold stroke at 45% opacity — clearly visible
  bodyOutline: "rgba(255,255,255,0.08)", // Subtle white outline for body edge
  // Target mode
  targetPrimary: UI.gold,
  targetSecondary: UI.goldAlpha50,  // Bumped from 0.35 to 0.50
  // Balance mode heatmap — boosted saturation and brightness
  over: "#FF5252",                // Brighter red
  overGlow: "rgba(255,82,82,0.4)", // Stronger glow
  optimal: "#4ADE80",             // Brighter green
  optimalGlow: "rgba(74,222,128,0.4)",
  under: UI.blue,               // Brighter blue
  underGlow: "rgba(96,165,250,0.4)",
  none: "#4A3520",                // Warm brown — visible but muted
  noneStroke: "rgba(245,178,50,0.20)", // Light gold outline for untracked muscles
  // Labels
  labelFg: UI.gold3,
  labelBg: "rgba(0,0,0,0.6)",     // Label background for readability
  labelMuted: UI.secondaryLight,
};

// ── Male Body Paths (Front) — broader shoulders, narrower hips ──────────────
// Viewbox: 0 0 120 240

const MALE_FRONT: Record<string, string> = {
  head: "M52,6 Q60,-2 68,6 Q73,16 68,26 L52,26 Q47,16 52,6 Z",
  neck: "M54,26 L66,26 L64,34 L56,34 Z",
  chest: "M36,42 Q42,35 52,38 L68,38 Q78,35 84,42 Q86,52 82,56 L38,56 Q34,52 36,42 Z",
  shoulders_l: "M24,36 Q30,30 36,36 L38,48 Q34,52 28,50 Q22,46 24,36 Z",
  shoulders_r: "M84,36 Q90,30 96,36 Q98,46 92,50 Q86,52 82,48 L84,36 Z",
  biceps_l: "M24,52 Q28,50 32,54 L32,72 Q28,76 24,74 Q20,68 20,60 Z",
  biceps_r: "M88,54 Q92,50 96,52 Q100,60 100,68 Q96,74 92,72 L88,54 Z",
  forearms_l: "M22,76 Q26,74 30,76 L28,100 Q24,102 22,100 Z",
  forearms_r: "M90,76 Q94,74 98,76 L98,100 Q96,102 92,100 Z",
  abs: "M46,56 L74,56 Q76,64 76,74 L76,90 Q74,96 68,98 L52,98 Q46,96 44,90 L44,74 Q44,64 46,56 Z",
  obliques_l: "M36,56 L46,56 L44,90 L40,94 Q34,88 34,74 Z",
  obliques_r: "M74,56 L84,56 Q86,74 86,88 Q80,94 76,90 L74,56 Z",
  quads_l: "M40,100 Q44,98 52,100 L54,144 Q52,152 48,154 Q42,152 38,144 Z",
  quads_r: "M68,100 Q76,98 80,100 Q82,144 78,152 Q72,154 68,152 L66,144 Z",
  hip_flexors: "M52,98 L68,98 L66,106 L54,106 Z",
  calves_l: "M40,158 Q44,154 50,158 L50,190 Q48,196 44,194 Q38,190 40,158 Z",
  calves_r: "M70,158 Q76,154 80,158 Q82,190 76,194 Q72,196 70,190 Z",
  feet_l: "M38,196 L52,196 L52,206 Q48,210 38,206 Z",
  feet_r: "M68,196 L82,196 Q82,206 74,210 Q68,206 68,196 Z",
};

const MALE_BACK: Record<string, string> = {
  head: "M52,6 Q60,-2 68,6 Q73,16 68,26 L52,26 Q47,16 52,6 Z",
  neck: "M54,26 L66,26 L64,34 L56,34 Z",
  traps: "M40,32 Q50,28 60,28 Q70,28 80,32 L82,46 Q70,42 60,42 Q50,42 38,46 Z",
  lats_l: "M34,46 Q38,42 44,46 L44,74 Q40,80 34,76 Z",
  lats_r: "M76,46 Q82,42 86,46 L86,76 Q80,80 76,74 Z",
  back: "M44,46 L76,46 L76,74 L44,74 Z",
  lower_back: "M44,74 L76,74 L76,94 Q72,98 60,98 Q48,98 44,94 Z",
  shoulders_l: "M24,36 Q30,30 36,36 L38,48 Q34,52 28,50 Q22,46 24,36 Z",
  shoulders_r: "M84,36 Q90,30 96,36 Q98,46 92,50 Q86,52 82,48 L84,36 Z",
  triceps_l: "M24,52 Q28,50 32,54 L32,72 Q28,76 24,74 Q20,68 20,60 Z",
  triceps_r: "M88,54 Q92,50 96,52 Q100,60 100,68 Q96,74 92,72 L88,54 Z",
  forearms_l: "M22,76 Q26,74 30,76 L28,100 Q24,102 22,100 Z",
  forearms_r: "M90,76 Q94,74 98,76 L98,100 Q96,102 92,100 Z",
  glutes_l: "M40,96 Q48,94 56,98 L56,114 Q48,118 40,114 Z",
  glutes_r: "M64,98 Q72,94 80,96 L80,114 Q72,118 64,114 Z",
  hamstrings_l: "M40,116 Q44,114 52,116 L54,152 Q50,156 44,154 Q38,150 40,116 Z",
  hamstrings_r: "M68,116 Q76,114 80,116 Q82,150 76,154 Q70,156 66,152 Z",
  calves_l: "M40,158 Q44,154 50,158 L50,190 Q48,196 44,194 Q38,190 40,158 Z",
  calves_r: "M70,158 Q76,154 80,158 Q82,190 76,194 Q72,196 70,190 Z",
  feet_l: "M38,196 L52,196 L52,206 Q48,210 38,206 Z",
  feet_r: "M68,196 L82,196 Q82,206 74,210 Q68,206 68,196 Z",
};

// ── Female Body Paths (Front) — narrower shoulders, wider hips, curved waist ─

const FEMALE_FRONT: Record<string, string> = {
  head: "M52,6 Q60,-2 68,6 Q72,16 68,26 L52,26 Q48,16 52,6 Z",
  neck: "M55,26 L65,26 L63,34 L57,34 Z",
  chest: "M40,42 Q44,36 52,38 L68,38 Q76,36 80,42 Q82,50 78,54 L42,54 Q38,50 40,42 Z",
  shoulders_l: "M28,36 Q33,31 38,36 L40,46 Q36,50 31,48 Q26,44 28,36 Z",
  shoulders_r: "M82,36 Q87,31 92,36 Q94,44 89,48 Q84,50 80,46 L82,36 Z",
  biceps_l: "M26,50 Q30,48 33,52 L33,70 Q30,74 26,72 Q22,66 22,58 Z",
  biceps_r: "M87,52 Q90,48 94,50 Q98,58 98,66 Q94,72 90,70 L87,52 Z",
  forearms_l: "M24,74 Q28,72 32,74 L30,98 Q26,100 24,98 Z",
  forearms_r: "M88,74 Q92,72 96,74 L96,98 Q94,100 90,98 Z",
  abs: "M48,54 L72,54 Q74,62 74,72 L74,88 Q72,94 68,96 L52,96 Q48,94 46,88 L46,72 Q46,62 48,54 Z",
  obliques_l: "M38,54 L48,54 L46,88 Q44,92 40,90 Q36,84 36,72 Z",
  obliques_r: "M72,54 L82,54 Q84,72 84,84 Q80,90 76,92 Q74,88 72,54 Z",
  quads_l: "M40,100 Q46,96 54,100 L56,144 Q54,152 48,154 Q42,152 38,144 Z",
  quads_r: "M66,100 Q74,96 80,100 Q82,144 78,152 Q72,154 66,152 L64,144 Z",
  hip_flexors: "M54,96 L66,96 L64,106 L56,106 Z",
  calves_l: "M40,158 Q44,154 50,158 L50,190 Q48,196 44,194 Q38,190 40,158 Z",
  calves_r: "M70,158 Q76,154 80,158 Q82,190 76,194 Q72,196 70,190 Z",
  feet_l: "M38,196 L52,196 L52,206 Q48,210 38,206 Z",
  feet_r: "M68,196 L82,196 Q82,206 74,210 Q68,206 68,196 Z",
};

const FEMALE_BACK: Record<string, string> = {
  head: "M52,6 Q60,-2 68,6 Q72,16 68,26 L52,26 Q48,16 52,6 Z",
  neck: "M55,26 L65,26 L63,34 L57,34 Z",
  traps: "M42,32 Q50,28 60,28 Q70,28 78,32 L80,44 Q70,40 60,40 Q50,40 40,44 Z",
  lats_l: "M36,44 Q40,40 46,44 L46,72 Q42,78 36,74 Z",
  lats_r: "M74,44 Q80,40 84,44 L84,74 Q78,78 74,72 Z",
  back: "M46,44 L74,44 L74,72 L46,72 Z",
  lower_back: "M46,72 L74,72 L74,92 Q70,96 60,96 Q50,96 46,92 Z",
  shoulders_l: "M28,36 Q33,31 38,36 L40,46 Q36,50 31,48 Q26,44 28,36 Z",
  shoulders_r: "M82,36 Q87,31 92,36 Q94,44 89,48 Q84,50 80,46 L82,36 Z",
  triceps_l: "M26,50 Q30,48 33,52 L33,70 Q30,74 26,72 Q22,66 22,58 Z",
  triceps_r: "M87,52 Q90,48 94,50 Q98,58 98,66 Q94,72 90,70 L87,52 Z",
  forearms_l: "M24,74 Q28,72 32,74 L30,98 Q26,100 24,98 Z",
  forearms_r: "M88,74 Q92,72 96,74 L96,98 Q94,100 90,98 Z",
  glutes_l: "M38,96 Q48,92 56,98 L56,116 Q48,120 38,116 Z",
  glutes_r: "M64,98 Q72,92 82,96 L82,116 Q72,120 64,116 Z",
  hamstrings_l: "M40,118 Q44,116 52,118 L54,152 Q50,156 44,154 Q38,150 40,118 Z",
  hamstrings_r: "M68,118 Q76,116 80,118 Q82,150 76,154 Q70,156 66,152 Z",
  calves_l: "M40,158 Q44,154 50,158 L50,190 Q48,196 44,194 Q38,190 40,158 Z",
  calves_r: "M70,158 Q76,154 80,158 Q82,190 76,194 Q72,196 70,190 Z",
  feet_l: "M38,196 L52,196 L52,206 Q48,210 38,206 Z",
  feet_r: "M68,196 L82,196 Q82,206 74,210 Q68,206 68,196 Z",
};

// ── Muscle to Path Mapping ───────────────────────────────────────────────────

const MUSCLE_TO_FRONT: Record<MuscleGroup, string[]> = {
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

const MUSCLE_TO_BACK: Record<MuscleGroup, string[]> = {
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

// ── Helper: Get color for a path based on mode ──────────────────────────────

function getPathColor(
  pathKey: string,
  view: "front" | "back",
  mode: HeatmapMode,
  targetPrimaryPaths: Set<string>,
  targetSecondaryPaths: Set<string>,
  balanceMap: Map<string, MuscleStatus>,
  gender: Gender,
): { fill: string; stroke: string; strokeWidth: number; opacity: number } {
  const baseColor = gender === "female" ? COLORS.bodyFemale : COLORS.bodyMale;

  if (mode === "target") {
    if (targetPrimaryPaths.has(pathKey)) {
      return { fill: COLORS.targetPrimary, stroke: COLORS.targetPrimary, strokeWidth: 1.5, opacity: 1 };
    }
    if (targetSecondaryPaths.has(pathKey)) {
      return { fill: COLORS.targetSecondary, stroke: UI.goldAlpha20, strokeWidth: 1, opacity: 0.8 };
    }
    return { fill: baseColor, stroke: COLORS.bodyStroke, strokeWidth: 0.8, opacity: 0.6 };
  }

  // Balance mode
  const status = balanceMap.get(pathKey);
  switch (status) {
    case "over":
      return { fill: COLORS.over, stroke: COLORS.overGlow, strokeWidth: 1.5, opacity: 0.9 };
    case "optimal":
      return { fill: COLORS.optimal, stroke: COLORS.optimalGlow, strokeWidth: 1.2, opacity: 0.85 };
    case "under":
      return { fill: COLORS.under, stroke: COLORS.underGlow, strokeWidth: 1.2, opacity: 0.85 };
    default:
      return { fill: COLORS.none, stroke: COLORS.noneStroke, strokeWidth: 0.5, opacity: 0.7 };
  }
}

// ── Body View Renderer ───────────────────────────────────────────────────────

function HeatmapBodyView({
  view,
  gender,
  mode,
  targetPrimaryPaths,
  targetSecondaryPaths,
  balanceMap,
  width,
  height,
}: {
  view: "front" | "back";
  gender: Gender;
  mode: HeatmapMode;
  targetPrimaryPaths: Set<string>;
  targetSecondaryPaths: Set<string>;
  balanceMap: Map<string, MuscleStatus>;
  width: number;
  height: number;
}) {
  const paths = view === "front"
    ? (gender === "female" ? FEMALE_FRONT : MALE_FRONT)
    : (gender === "female" ? FEMALE_BACK : MALE_BACK);

  return (
    <View style={{ alignItems: "center" }}>
      <Svg width={width} height={height} viewBox="0 0 120 214">
        <G>
          {Object.entries(paths).map(([key, path]) => {
            const style = getPathColor(key, view, mode, targetPrimaryPaths, targetSecondaryPaths, balanceMap, gender);
            return (
              <Path
                key={key}
                d={path}
                fill={style.fill}
                stroke={style.stroke}
                strokeWidth={style.strokeWidth}
                opacity={style.opacity}
              />
            );
          })}
        </G>
      </Svg>
      <Text style={styles.viewLabel}>{view === "front" ? "Front" : "Back"}</Text>
    </View>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export function BodyHeatmap({
  gender = "male",
  mode,
  targetPrimary = [],
  targetSecondary = [],
  balanceEntries = [],
  width = 80,
  height = 160,
  showLabels = true,
  showLegend = true,
}: BodyHeatmapProps) {
  // Compute target path sets
  const { targetPrimaryPaths, targetSecondaryPaths } = useMemo(() => {
    const pp = new Set<string>();
    const sp = new Set<string>();
    for (const m of targetPrimary) {
      for (const p of (MUSCLE_TO_FRONT[m] || [])) pp.add(p);
      for (const p of (MUSCLE_TO_BACK[m] || [])) pp.add(p);
    }
    for (const m of targetSecondary) {
      for (const p of (MUSCLE_TO_FRONT[m] || [])) { if (!pp.has(p)) sp.add(p); }
      for (const p of (MUSCLE_TO_BACK[m] || [])) { if (!pp.has(p)) sp.add(p); }
    }
    return { targetPrimaryPaths: pp, targetSecondaryPaths: sp };
  }, [targetPrimary, targetSecondary]);

  // Compute balance path map
  const balanceMap = useMemo(() => {
    const map = new Map<string, MuscleStatus>();
    for (const entry of balanceEntries) {
      const frontPaths = MUSCLE_TO_FRONT[entry.muscle] || [];
      const backPaths = MUSCLE_TO_BACK[entry.muscle] || [];
      for (const p of [...frontPaths, ...backPaths]) {
        // If already set to a higher priority status, don't overwrite
        const existing = map.get(p);
        if (!existing || statusPriority(entry.status) > statusPriority(existing)) {
          map.set(p, entry.status);
        }
      }
    }
    return map;
  }, [balanceEntries]);

  const viewWidth = Math.floor(width * 0.48);

  return (
    <View style={styles.container}>
      <View style={styles.diagramRow}>
        <HeatmapBodyView
          view="front"
          gender={gender}
          mode={mode}
          targetPrimaryPaths={targetPrimaryPaths}
          targetSecondaryPaths={targetSecondaryPaths}
          balanceMap={balanceMap}
          width={viewWidth}
          height={height}
        />
        <HeatmapBodyView
          view="back"
          gender={gender}
          mode={mode}
          targetPrimaryPaths={targetPrimaryPaths}
          targetSecondaryPaths={targetSecondaryPaths}
          balanceMap={balanceMap}
          width={viewWidth}
          height={height}
        />
      </View>

      {/* Labels for target mode */}
      {showLabels && mode === "target" && targetPrimary.length > 0 && (
        <View style={styles.labelRow}>
          {targetPrimary.map((m) => (
            <View key={m} style={styles.labelChip}>
              <View style={[styles.labelDot, { backgroundColor: COLORS.targetPrimary }]} />
              <Text style={styles.labelText}>{formatMuscle(m)}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Legend for balance mode */}
      {showLegend && mode === "balance" && (
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: COLORS.over }]} />
            <Text style={styles.legendText}>Over</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: COLORS.optimal }]} />
            <Text style={styles.legendText}>Optimal</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: COLORS.under }]} />
            <Text style={styles.legendText}>Under</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: COLORS.none }]} />
            <Text style={styles.legendText}>None</Text>
          </View>
        </View>
      )}
    </View>
  );
}

/** Compact version for inline use */
export function BodyHeatmapCompact({
  gender = "male",
  mode,
  targetPrimary = [],
  targetSecondary = [],
  balanceEntries = [],
}: {
  gender?: Gender;
  mode: HeatmapMode;
  targetPrimary?: MuscleGroup[];
  targetSecondary?: MuscleGroup[];
  balanceEntries?: MuscleBalanceEntry[];
}) {
  return (
    <BodyHeatmap
      gender={gender}
      mode={mode}
      targetPrimary={targetPrimary}
      targetSecondary={targetSecondary}
      balanceEntries={balanceEntries}
      width={100}
      height={100}
      showLabels={false}
      showLegend={false}
    />
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function statusPriority(s: MuscleStatus): number {
  switch (s) {
    case "over": return 3;
    case "under": return 2;
    case "optimal": return 1;
    default: return 0;
  }
}

function formatMuscle(m: string): string {
  return m.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
  },
  diagramRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  viewLabel: {
    color: UI.secondaryLight,
    fontFamily: "DMSans_400Regular",
    fontSize: 9,
    marginTop: 2,
    textAlign: "center",
    letterSpacing: 0.5,
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
    gap: 3,
  },
  labelDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  labelText: {
    color: UI.gold3,
    fontFamily: "DMSans_500Medium",
    fontSize: 9,
    letterSpacing: 0.3,
  },
  legendRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
    justifyContent: "center",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    color: UI.secondaryLight,
    fontFamily: "DMSans_500Medium",
    fontSize: 9,
    letterSpacing: 0.3,
  },
});
