/**
 * Muscle Balance Trend Chart
 *
 * Renders weekly/monthly trend lines for muscle balance evolution.
 * Uses react-native-svg for chart rendering (no native chart library needed).
 */
import React, { useMemo, useState } from "react";
import { Text, View, TouchableOpacity, ScrollView } from "react-native";
import Svg, { Path, Circle, Line, Rect, G } from "react-native-svg";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import type { MuscleGroup } from "@/components/body-diagram";
import { UI, SF } from "@/constants/ui-colors";

// ── Theme ────────────────────────────────────────────────────────────────────
// ── Types ────────────────────────────────────────────────────────────────────

export interface TrendDataPoint {
  date: string; // ISO date string
  label: string; // Display label (e.g. "Week 1", "Jan")
  overCount: number;
  optimalCount: number;
  underCount: number;
  overallScore: number; // 0-100
  muscleScores: Partial<Record<MuscleGroup, number>>; // 0-100 per muscle
}

interface TrendChartProps {
  data: TrendDataPoint[];
  title?: string;
  height?: number;
  showMuscleDetail?: boolean;
}

// ── Chart Helpers ────────────────────────────────────────────────────────────

function buildPath(points: { x: number; y: number }[], smooth: boolean = true): string {
  if (points.length < 2) return "";
  if (!smooth) {
    return points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  }

  // Catmull-Rom to cubic Bezier conversion for smooth curves
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

// ── Main Component ───────────────────────────────────────────────────────────

export function TrendChart({ data, title = "Muscle Balance Trend", height = 200, showMuscleDetail = true }: TrendChartProps) {
  const [selectedPoint, setSelectedPoint] = useState<number | null>(null);
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleGroup | null>(null);

  const chartWidth = Math.max(300, data.length * 60);
  const padding = { top: 20, right: 20, bottom: 30, left: 35 };
  const innerW = chartWidth - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  // Build chart paths
  const { overallPath, overPath, optimalPath, underPath, points } = useMemo(() => {
    if (data.length === 0) return { overallPath: "", overPath: "", optimalPath: "", underPath: "", points: [] };

    const maxCount = Math.max(...data.map(d => Math.max(d.overCount, d.optimalCount, d.underCount, 1)));
    const pts = data.map((d, i) => ({
      x: padding.left + (i / Math.max(1, data.length - 1)) * innerW,
      y: padding.top + (1 - d.overallScore / 100) * innerH,
      overY: padding.top + (1 - d.overCount / maxCount) * innerH,
      optimalY: padding.top + (1 - d.optimalCount / maxCount) * innerH,
      underY: padding.top + (1 - d.underCount / maxCount) * innerH,
    }));

    return {
      overallPath: buildPath(pts.map(p => ({ x: p.x, y: p.y }))),
      overPath: buildPath(pts.map(p => ({ x: p.x, y: p.overY }))),
      optimalPath: buildPath(pts.map(p => ({ x: p.x, y: p.optimalY }))),
      underPath: buildPath(pts.map(p => ({ x: p.x, y: p.underY }))),
      points: pts,
    };
  }, [data, innerW, innerH, padding.left, padding.top]);

  // Muscle-specific path
  const musclePath = useMemo(() => {
    if (!selectedMuscle || data.length < 2) return "";
    const scores = data.map(d => d.muscleScores[selectedMuscle] ?? 50);
    const pts = data.map((_, i) => ({
      x: padding.left + (i / Math.max(1, data.length - 1)) * innerW,
      y: padding.top + (1 - (scores[i] ?? 50) / 100) * innerH,
    }));
    return buildPath(pts);
  }, [selectedMuscle, data, innerW, innerH, padding.left, padding.top]);

  const muscleGroups: MuscleGroup[] = ["chest", "back", "shoulders", "biceps", "triceps", "quads", "hamstrings", "glutes", "calves", "abs"];

  if (data.length === 0) {
    return (
      <View style={{ backgroundColor: SF.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: SF.border }}>
        <Text style={{ color: SF.cream, fontFamily: "DMSans_700Bold", fontSize: 14, marginBottom: 8 }}>{title}</Text>
        <View style={{ alignItems: "center", paddingVertical: 30 }}>
          <MaterialIcons name="show-chart" size={32} color={SF.muted} />
          <Text style={{ color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 12, marginTop: 8 }}>
            Complete more workouts to see trends
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ backgroundColor: SF.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: SF.border }}>
      <Text style={{ color: SF.cream, fontFamily: "DMSans_700Bold", fontSize: 14, marginBottom: 4 }}>{title}</Text>

      {/* Legend */}
      <View style={{ flexDirection: "row", gap: 12, marginBottom: 8, flexWrap: "wrap" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <View style={{ width: 8, height: 3, borderRadius: 1, backgroundColor: SF.gold1 }} />
          <Text style={{ color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 9 }}>Overall</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <View style={{ width: 8, height: 3, borderRadius: 1, backgroundColor: SF.green }} />
          <Text style={{ color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 9 }}>Optimal</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <View style={{ width: 8, height: 3, borderRadius: 1, backgroundColor: SF.red }} />
          <Text style={{ color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 9 }}>Over</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <View style={{ width: 8, height: 3, borderRadius: 1, backgroundColor: SF.blue }} />
          <Text style={{ color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 9 }}>Under</Text>
        </View>
        {selectedMuscle && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <View style={{ width: 8, height: 3, borderRadius: 1, backgroundColor: "#A855F7" }} />
            <Text style={{ color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 9 }}>{selectedMuscle.replace(/_/g, " ")}</Text>
          </View>
        )}
      </View>

      {/* Chart */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <Svg width={chartWidth} height={height}>
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map(v => {
            const y = padding.top + (1 - v / 100) * innerH;
            return (
              <G key={v}>
                <Line x1={padding.left} y1={y} x2={chartWidth - padding.right} y2={y} stroke={SF.border} strokeWidth={0.5} />
                <Rect x={0} y={y - 6} width={30} height={12} fill={SF.bg} />
                <text x={2} y={y + 3} fill={SF.muted} fontSize={8}>{v}</text>
              </G>
            );
          })}

          {/* X-axis labels */}
          {data.map((d, i) => {
            const x = padding.left + (i / Math.max(1, data.length - 1)) * innerW;
            return (
              <G key={i}>
                <Line x1={x} y1={padding.top} x2={x} y2={height - padding.bottom} stroke={SF.border} strokeWidth={0.3} />
              </G>
            );
          })}

          {/* Over line */}
          {overPath && <Path d={overPath} stroke={SF.red} strokeWidth={1.5} fill="none" opacity={0.6} />}
          {/* Optimal line */}
          {optimalPath && <Path d={optimalPath} stroke={SF.green} strokeWidth={1.5} fill="none" opacity={0.6} />}
          {/* Under line */}
          {underPath && <Path d={underPath} stroke={SF.blue} strokeWidth={1.5} fill="none" opacity={0.6} />}
          {/* Overall score line */}
          {overallPath && <Path d={overallPath} stroke={SF.gold1} strokeWidth={2.5} fill="none" />}
          {/* Muscle-specific line */}
          {musclePath && <Path d={musclePath} stroke="#A855F7" strokeWidth={2} fill="none" strokeDasharray="4,2" />}

          {/* Data points */}
          {points.map((p, i) => (
            <Circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={selectedPoint === i ? 5 : 3}
              fill={selectedPoint === i ? SF.gold1 : SF.gold2}
              stroke={SF.bg}
              strokeWidth={1.5}
              onPress={() => setSelectedPoint(selectedPoint === i ? null : i)}
            />
          ))}
        </Svg>
      </ScrollView>

      {/* X-axis labels below chart */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ width: chartWidth, flexDirection: "row", paddingLeft: padding.left }}>
          {data.map((d, i) => (
            <Text
              key={i}
              style={{
                position: "absolute",
                left: padding.left + (i / Math.max(1, data.length - 1)) * innerW - 15,
                color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 8,
                width: 30, textAlign: "center",
              }}
            >
              {d.label}
            </Text>
          ))}
        </View>
      </ScrollView>

      {/* Selected Point Detail */}
      {selectedPoint !== null && data[selectedPoint] && (
        <View style={{
          backgroundColor: SF.surfaceBright, borderRadius: 10, padding: 10, marginTop: 8,
          borderWidth: 1, borderColor: SF.borderBright,
        }}>
          <Text style={{ color: SF.cream, fontFamily: "DMSans_700Bold", fontSize: 11, marginBottom: 4 }}>
            {data[selectedPoint].label}
          </Text>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <View>
              <Text style={{ color: SF.gold1, fontFamily: "DMSans_700Bold", fontSize: 16 }}>{data[selectedPoint].overallScore}</Text>
              <Text style={{ color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 8 }}>Score</Text>
            </View>
            <View>
              <Text style={{ color: SF.green, fontFamily: "DMSans_700Bold", fontSize: 16 }}>{data[selectedPoint].optimalCount}</Text>
              <Text style={{ color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 8 }}>Optimal</Text>
            </View>
            <View>
              <Text style={{ color: SF.red, fontFamily: "DMSans_700Bold", fontSize: 16 }}>{data[selectedPoint].overCount}</Text>
              <Text style={{ color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 8 }}>Over</Text>
            </View>
            <View>
              <Text style={{ color: SF.blue, fontFamily: "DMSans_700Bold", fontSize: 16 }}>{data[selectedPoint].underCount}</Text>
              <Text style={{ color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 8 }}>Under</Text>
            </View>
          </View>
        </View>
      )}

      {/* Muscle Group Filter */}
      {showMuscleDetail && (
        <View style={{ marginTop: 10 }}>
          <Text style={{ color: SF.muted, fontFamily: "DMSans_600SemiBold", fontSize: 9, marginBottom: 6 }}>TRACK SPECIFIC MUSCLE</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 4 }}>
            <TouchableOpacity
              onPress={() => setSelectedMuscle(null)}
              style={{
                paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6,
                backgroundColor: !selectedMuscle ? UI.borderGold : SF.surface,
                borderWidth: 1, borderColor: !selectedMuscle ? SF.gold3 : SF.border,
              }}
            >
              <Text style={{ color: !selectedMuscle ? SF.gold1 : SF.muted, fontFamily: "DMSans_600SemiBold", fontSize: 9 }}>All</Text>
            </TouchableOpacity>
            {muscleGroups.map(m => (
              <TouchableOpacity
                key={m}
                onPress={() => setSelectedMuscle(selectedMuscle === m ? null : m)}
                style={{
                  paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6,
                  backgroundColor: selectedMuscle === m ? "rgba(168,85,247,0.15)" : SF.surface,
                  borderWidth: 1, borderColor: selectedMuscle === m ? "#A855F7" : SF.border,
                }}
              >
                <Text style={{
                  color: selectedMuscle === m ? "#A855F7" : SF.muted,
                  fontFamily: "DMSans_600SemiBold", fontSize: 9,
                }}>{m.replace(/_/g, " ")}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

// ── PR Progress Chart ────────────────────────────────────────────────────────

interface PRChartProps {
  data: { date: string; value: number }[];
  title: string;
  unit: string;
  color?: string;
  height?: number;
}

export function PRProgressChart({ data, title, unit, color = SF.gold1, height = 160 }: PRChartProps) {
  if (data.length === 0) {
    return (
      <View style={{ backgroundColor: SF.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: SF.border }}>
        <Text style={{ color: SF.cream, fontFamily: "DMSans_700Bold", fontSize: 13, marginBottom: 8 }}>{title}</Text>
        <View style={{ alignItems: "center", paddingVertical: 20 }}>
          <MaterialIcons name="show-chart" size={24} color={SF.muted} />
          <Text style={{ color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 11, marginTop: 6 }}>
            No data yet. Complete workouts to track progress.
          </Text>
        </View>
      </View>
    );
  }

  const chartWidth = Math.max(280, data.length * 40);
  const padding = { top: 15, right: 15, bottom: 25, left: 35 };
  const innerW = chartWidth - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const maxVal = Math.max(...data.map(d => d.value), 1);
  const minVal = Math.min(...data.map(d => d.value), 0);
  const range = maxVal - minVal || 1;

  const pts = data.map((d, i) => ({
    x: padding.left + (i / Math.max(1, data.length - 1)) * innerW,
    y: padding.top + (1 - (d.value - minVal) / range) * innerH,
  }));

  const linePath = buildPath(pts);

  // Area fill path
  const areaPath = linePath
    ? `${linePath} L ${pts[pts.length - 1].x} ${height - padding.bottom} L ${pts[0].x} ${height - padding.bottom} Z`
    : "";

  // Trend direction
  const firstVal = data[0]?.value ?? 0;
  const lastVal = data[data.length - 1]?.value ?? 0;
  const trendUp = lastVal > firstVal;
  const trendPct = firstVal > 0 ? Math.round(((lastVal - firstVal) / firstVal) * 100) : 0;

  return (
    <View style={{ backgroundColor: SF.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: SF.border }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <Text style={{ color: SF.cream, fontFamily: "DMSans_700Bold", fontSize: 13 }}>{title}</Text>
        {data.length >= 2 && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
            <MaterialIcons name={trendUp ? "trending-up" : "trending-down"} size={14} color={trendUp ? SF.green : SF.red} />
            <Text style={{ color: trendUp ? SF.green : SF.red, fontFamily: "DMSans_600SemiBold", fontSize: 10 }}>
              {trendUp ? "+" : ""}{trendPct}%
            </Text>
          </View>
        )}
      </View>

      {/* Current best */}
      <View style={{ flexDirection: "row", alignItems: "baseline", gap: 4, marginBottom: 8 }}>
        <Text style={{ color, fontFamily: "DMSans_700Bold", fontSize: 22 }}>{lastVal}</Text>
        <Text style={{ color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 11 }}>{unit}</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <Svg width={chartWidth} height={height}>
          {/* Grid */}
          {[0, 0.25, 0.5, 0.75, 1].map(pct => {
            const y = padding.top + (1 - pct) * innerH;
            const val = Math.round(minVal + pct * range);
            return (
              <G key={pct}>
                <Line x1={padding.left} y1={y} x2={chartWidth - padding.right} y2={y} stroke={SF.border} strokeWidth={0.5} />
              </G>
            );
          })}

          {/* Area fill */}
          {areaPath && <Path d={areaPath} fill={color} opacity={0.08} />}

          {/* Line */}
          {linePath && <Path d={linePath} stroke={color} strokeWidth={2} fill="none" />}

          {/* Points */}
          {pts.map((p, i) => (
            <Circle key={i} cx={p.x} cy={p.y} r={3} fill={color} stroke={SF.bg} strokeWidth={1.5} />
          ))}
        </Svg>
      </ScrollView>

      {/* Date labels */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ width: chartWidth, flexDirection: "row" }}>
          {data.map((d, i) => {
            const dateStr = new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
            return (
              <Text
                key={i}
                style={{
                  position: "absolute",
                  left: padding.left + (i / Math.max(1, data.length - 1)) * innerW - 18,
                  color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 7,
                  width: 36, textAlign: "center",
                }}
              >
                {dateStr}
              </Text>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
