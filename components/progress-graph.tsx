/**
 * ProgressGraph – dual-axis line chart for weight & body-fat over time.
 *
 * Renders an SVG chart using react-native-svg with:
 *  - Left Y-axis  → weight (kg)  – blue line
 *  - Right Y-axis → body-fat (%) – amber line
 *  - Shared X-axis with date labels
 *  - Dot markers for each data-point
 *  - Optional goal body-fat dashed line
 */

import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import Svg, { Line, Polyline, Circle, Text as SvgText, Rect, Defs, LinearGradient, Stop } from "react-native-svg";
import { UI, SF } from "@/constants/ui-colors";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/use-auth";

// ── Colours ──────────────────────────────────────────────────────────────────
const WEIGHT_COLOR = "#3B82F6"; // blue-500
const BF_COLOR = "#F59E0B"; // amber-500
const GRID_COLOR = "rgba(255,255,255,0.08)";
const LABEL_COLOR = "rgba(255,255,255,0.50)";

// ── Layout ───────────────────────────────────────────────────────────────────
const SCREEN_W = Dimensions.get("window").width;
const CHART_W = SCREEN_W - 48; // horizontal page margin
const CHART_H = 220;
const PAD = { top: 16, right: 48, bottom: 32, left: 48 };
const PLOT_W = CHART_W - PAD.left - PAD.right;
const PLOT_H = CHART_H - PAD.top - PAD.bottom;

// ── Types ────────────────────────────────────────────────────────────────────
type TimelinePoint = {
  date: string | Date;
  weightKg: number | null;
  bodyFatPercent: number | null;
  source: string;
};

type Props = {
  /** Optional target body-fat line */
  targetBodyFat?: number;
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function niceRange(min: number, max: number, ticks: number) {
  if (min === max) {
    min -= 2;
    max += 2;
  }
  const range = max - min;
  const step = Math.ceil(range / ticks);
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const labels: number[] = [];
  for (let v = lo; v <= hi; v += step) labels.push(v);
  return { lo, hi, labels };
}

function formatDate(d: Date) {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[d.getMonth()]} ${d.getDate()}`;
}

// ── Component ────────────────────────────────────────────────────────────────
export default function ProgressGraph({ targetBodyFat }: Props) {
  const { isAuthenticated } = useAuth();

  const { data: timeline, isLoading } = trpc.progressTimeline.get.useQuery(
    { limit: 200 },
    { enabled: isAuthenticated },
  );

  // Massage data into plottable series
  const { weightPts, bfPts, wRange, bRange, dates } = useMemo(() => {
    if (!timeline || timeline.length === 0)
      return { weightPts: [], bfPts: [], wRange: niceRange(60, 80, 4), bRange: niceRange(10, 25, 4), dates: [] };

    const sorted = [...timeline].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

    const wRaw = sorted.filter((p) => p.weightKg != null).map((p) => ({
      t: new Date(p.date).getTime(),
      v: p.weightKg as number,
    }));

    const bRaw = sorted.filter((p) => p.bodyFatPercent != null).map((p) => ({
      t: new Date(p.date).getTime(),
      v: p.bodyFatPercent as number,
    }));

    const allT = sorted.map((p) => new Date(p.date).getTime());
    const tMin = Math.min(...allT);
    const tMax = Math.max(...allT);
    const tRange = tMax - tMin || 1;

    const toX = (t: number) => PAD.left + ((t - tMin) / tRange) * PLOT_W;

    const wVals = wRaw.map((p) => p.v);
    const bVals = bRaw.map((p) => p.v);
    if (targetBodyFat != null) bVals.push(targetBodyFat);

    const wr = niceRange(
      wVals.length ? Math.min(...wVals) : 60,
      wVals.length ? Math.max(...wVals) : 80,
      4,
    );
    const br = niceRange(
      bVals.length ? Math.min(...bVals) : 10,
      bVals.length ? Math.max(...bVals) : 25,
      4,
    );

    const toYw = (v: number) => PAD.top + PLOT_H - ((v - wr.lo) / (wr.hi - wr.lo)) * PLOT_H;
    const toYb = (v: number) => PAD.top + PLOT_H - ((v - br.lo) / (br.hi - br.lo)) * PLOT_H;

    const wp = wRaw.map((p) => ({ x: toX(p.t), y: toYw(p.v), v: p.v }));
    const bp = bRaw.map((p) => ({ x: toX(p.t), y: toYb(p.v), v: p.v }));

    // Pick ~5 evenly-spaced date labels
    const step = Math.max(1, Math.floor(sorted.length / 5));
    const dl = sorted.filter((_, i) => i % step === 0 || i === sorted.length - 1).map((p) => ({
      x: toX(new Date(p.date).getTime()),
      label: formatDate(new Date(p.date)),
    }));

    return { weightPts: wp, bfPts: bp, wRange: wr, bRange: br, dates: dl };
  }, [timeline, targetBodyFat]);

  // ── Empty / loading states ───────────────────────────────────────────────
  if (isLoading) {
    return (
      <View style={styles.card}>
        <ActivityIndicator color={UI.lime400} />
      </View>
    );
  }

  if (!timeline || timeline.length === 0) {
    return (
      <View style={styles.card}>
        <Text style={styles.emptyText}>
          No progress data yet. Log a check-in or add a manual entry to see your trends.
        </Text>
      </View>
    );
  }

  // ── Target BF line Y ────────────────────────────────────────────────────
  const targetY =
    targetBodyFat != null
      ? PAD.top + PLOT_H - ((targetBodyFat - bRange.lo) / (bRange.hi - bRange.lo)) * PLOT_H
      : null;

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <View style={styles.card}>
      {/* Legend */}
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: WEIGHT_COLOR }]} />
          <Text style={styles.legendLabel}>Weight (kg)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: BF_COLOR }]} />
          <Text style={styles.legendLabel}>Body Fat %</Text>
        </View>
      </View>

      <Svg width={CHART_W} height={CHART_H}>
        <Defs>
          <LinearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={WEIGHT_COLOR} stopOpacity="0.25" />
            <Stop offset="1" stopColor={WEIGHT_COLOR} stopOpacity="0" />
          </LinearGradient>
          <LinearGradient id="bfGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={BF_COLOR} stopOpacity="0.25" />
            <Stop offset="1" stopColor={BF_COLOR} stopOpacity="0" />
          </LinearGradient>
        </Defs>

        {/* Horizontal grid lines */}
        {wRange.labels.map((v) => {
          const y = PAD.top + PLOT_H - ((v - wRange.lo) / (wRange.hi - wRange.lo)) * PLOT_H;
          return (
            <Line key={`gw-${v}`} x1={PAD.left} x2={CHART_W - PAD.right} y1={y} y2={y} stroke={GRID_COLOR} strokeWidth={1} />
          );
        })}

        {/* Left Y-axis labels (weight) */}
        {wRange.labels.map((v) => {
          const y = PAD.top + PLOT_H - ((v - wRange.lo) / (wRange.hi - wRange.lo)) * PLOT_H;
          return (
            <SvgText key={`lw-${v}`} x={PAD.left - 6} y={y + 4} fontSize={10} fill={WEIGHT_COLOR} textAnchor="end" opacity={0.7}>
              {v}
            </SvgText>
          );
        })}

        {/* Right Y-axis labels (body-fat) */}
        {bRange.labels.map((v) => {
          const y = PAD.top + PLOT_H - ((v - bRange.lo) / (bRange.hi - bRange.lo)) * PLOT_H;
          return (
            <SvgText key={`lb-${v}`} x={CHART_W - PAD.right + 6} y={y + 4} fontSize={10} fill={BF_COLOR} textAnchor="start" opacity={0.7}>
              {v}%
            </SvgText>
          );
        })}

        {/* X-axis date labels */}
        {dates.map((d, i) => (
          <SvgText key={`xd-${i}`} x={d.x} y={CHART_H - 4} fontSize={9} fill={LABEL_COLOR} textAnchor="middle">
            {d.label}
          </SvgText>
        ))}

        {/* Target BF dashed line */}
        {targetY != null && (
          <>
            <Line
              x1={PAD.left}
              x2={CHART_W - PAD.right}
              y1={targetY}
              y2={targetY}
              stroke={BF_COLOR}
              strokeWidth={1}
              strokeDasharray="6,4"
              opacity={0.5}
            />
            <SvgText x={CHART_W - PAD.right + 6} y={targetY - 4} fontSize={8} fill={BF_COLOR} textAnchor="start" opacity={0.6}>
              Goal
            </SvgText>
          </>
        )}

        {/* Weight line */}
        {weightPts.length > 1 && (
          <Polyline
            points={weightPts.map((p) => `${p.x},${p.y}`).join(" ")}
            fill="none"
            stroke={WEIGHT_COLOR}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Body-fat line */}
        {bfPts.length > 1 && (
          <Polyline
            points={bfPts.map((p) => `${p.x},${p.y}`).join(" ")}
            fill="none"
            stroke={BF_COLOR}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Weight dots */}
        {weightPts.map((p, i) => (
          <Circle key={`wd-${i}`} cx={p.x} cy={p.y} r={3.5} fill={WEIGHT_COLOR} />
        ))}

        {/* Body-fat dots */}
        {bfPts.map((p, i) => (
          <Circle key={`bd-${i}`} cx={p.x} cy={p.y} r={3.5} fill={BF_COLOR} />
        ))}
      </Svg>

      {/* Summary strip */}
      <View style={styles.summaryStrip}>
        {weightPts.length > 0 && (
          <Text style={[styles.summaryText, { color: WEIGHT_COLOR }]}>
            Latest: {weightPts[weightPts.length - 1].v.toFixed(1)} kg
          </Text>
        )}
        {bfPts.length > 0 && (
          <Text style={[styles.summaryText, { color: BF_COLOR }]}>
            Latest: {bfPts[bfPts.length - 1].v.toFixed(1)}%
          </Text>
        )}
      </View>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  card: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  legendRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 20,
    marginBottom: 12,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
  },
  emptyText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
    color: "rgba(255,255,255,0.45)",
    textAlign: "center",
    paddingVertical: 32,
  },
  summaryStrip: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 8,
  },
  summaryText: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 13,
  },
});
