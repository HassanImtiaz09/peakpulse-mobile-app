/**
 * FormAnnotationOverlay
 *
 * Renders visual form annotations on top of exercise images:
 * - Joint angle arcs with degree labels
 * - Body alignment lines (green for correct, amber for warning)
 * - Checkpoint markers with descriptions
 *
 * Uses absolute positioning with percentage-based coordinates
 * so annotations scale with the image container.
 */

import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Dimensions,
  Platform,
} from "react-native";
import Svg, { Line, Circle, Path, G, Text as SvgText } from "react-native-svg";
import * as Haptics from "expo-haptics";
import type {
  FormAnnotation,
  JointAngle,
  AlignmentLine,
  FormCheckpoint,
} from "@/lib/form-annotations";
import { UI } from "@/constants/ui-colors";

const { width: SCREEN_W } = Dimensions.get("window");

interface FormAnnotationOverlayProps {
  annotation: FormAnnotation;
  width: number;
  height: number;
  /** Show only checkpoints (simplified view) */
  simplified?: boolean;
}

/** Convert percentage coordinates to pixel values */
function pct(value: number, total: number): number {
  return (value / 100) * total;
}

/** Generate an arc path for joint angle visualization */
function arcPath(cx: number, cy: number, radius: number, startAngle: number, endAngle: number): string {
  const start = {
    x: cx + radius * Math.cos((startAngle * Math.PI) / 180),
    y: cy + radius * Math.sin((startAngle * Math.PI) / 180),
  };
  const end = {
    x: cx + radius * Math.cos((endAngle * Math.PI) / 180),
    y: cy + radius * Math.sin((endAngle * Math.PI) / 180),
  };
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

export function FormAnnotationOverlay({
  annotation,
  width,
  height,
  simplified = false,
}: FormAnnotationOverlayProps) {
  const [selectedCheckpoint, setSelectedCheckpoint] = useState<number | null>(null);

  const handleCheckpointPress = useCallback((index: number) => {
    setSelectedCheckpoint(prev => prev === index ? null : index);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  }, []);

  const arcRadius = Math.min(width, height) * 0.06;

  return (
    <View style={[StyleSheet.absoluteFill, { width, height }]} pointerEvents="box-none">
      {/* SVG layer for lines and arcs */}
      {!simplified && (
        <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
          {/* Alignment Lines */}
          {annotation.alignmentLines.map((line, i) => (
            <G key={`line-${i}`}>
              <Line
                x1={pct(line.x1, width)}
                y1={pct(line.y1, height)}
                x2={pct(line.x2, width)}
                y2={pct(line.y2, height)}
                stroke={line.type === "correct" ? UI.green : UI.gold}
                strokeWidth={2}
                strokeDasharray={line.type === "correct" ? "6,3" : "4,4"}
                opacity={0.8}
              />
              <SvgText
                x={pct((line.x1 + line.x2) / 2, width)}
                y={pct((line.y1 + line.y2) / 2, height) - 6}
                fill={line.type === "correct" ? UI.green : UI.gold}
                fontSize={9}
                fontWeight="600"
                textAnchor="middle"
              >
                {line.label}
              </SvgText>
            </G>
          ))}

          {/* Joint Angle Arcs */}
          {annotation.jointAngles.map((joint, i) => {
            const cx = pct(joint.x, width);
            const cy = pct(joint.y, height);
            const startDeg = joint.rotation;
            const endDeg = joint.rotation + joint.angle;
            return (
              <G key={`angle-${i}`}>
                <Circle cx={cx} cy={cy} r={3} fill="#D4AF37" opacity={0.9} />
                <Path
                  d={arcPath(cx, cy, arcRadius, startDeg, endDeg)}
                  stroke="#D4AF37"
                  strokeWidth={2}
                  fill="none"
                  opacity={0.85}
                />
                <SvgText
                  x={cx + arcRadius + 4}
                  y={cy - 4}
                  fill={UI.gold3}
                  fontSize={10}
                  fontWeight="700"
                >
                  {joint.angle}°
                </SvgText>
                <SvgText
                  x={cx + arcRadius + 4}
                  y={cy + 8}
                  fill="#D4AF37"
                  fontSize={8}
                  fontWeight="500"
                >
                  {joint.joint}
                </SvgText>
              </G>
            );
          })}
        </Svg>
      )}

      {/* Checkpoint markers (interactive) */}
      {annotation.checkpoints.map((cp, i) => (
        <View
          key={`cp-${i}`}
          style={[
            styles.checkpointContainer,
            {
              left: pct(cp.x, width) - 12,
              top: pct(cp.y, height) - 12,
            },
          ]}
        >
          <Pressable
            onPress={() => handleCheckpointPress(i)}
            style={({ pressed }) => [
              styles.checkpointMarker,
              cp.isWarning ? styles.checkpointWarning : styles.checkpointCorrect,
              pressed && { opacity: 0.7, transform: [{ scale: 1.2 }] },
              selectedCheckpoint === i && styles.checkpointSelected,
            ]}
          >
            <Text style={styles.checkpointIcon}>
              {cp.isWarning ? "!" : "✓"}
            </Text>
          </Pressable>

          {/* Tooltip */}
          {selectedCheckpoint === i && (
            <View style={[
              styles.tooltip,
              { left: cp.x > 60 ? -160 : 30 },
            ]}>
              <Text style={styles.tooltipTitle}>{cp.label}</Text>
              <Text style={styles.tooltipDesc}>{cp.description}</Text>
            </View>
          )}
        </View>
      ))}
    </View>
  );
}

/**
 * Compact annotation legend shown below the exercise image.
 */
export function AnnotationLegend() {
  return (
    <View style={styles.legend}>
      <View style={styles.legendItem}>
        <View style={[styles.legendDot, { backgroundColor: UI.green }]} />
        <Text style={styles.legendText}>Correct Form</Text>
      </View>
      <View style={styles.legendItem}>
        <View style={[styles.legendDot, { backgroundColor: UI.gold }]} />
        <Text style={styles.legendText}>Watch Out</Text>
      </View>
      <View style={styles.legendItem}>
        <View style={[styles.legendDot, { backgroundColor: "#D4AF37" }]} />
        <Text style={styles.legendText}>Joint Angle</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  checkpointContainer: {
    position: "absolute",
    zIndex: 10,
  },
  checkpointMarker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
  },
  checkpointCorrect: {
    backgroundColor: "rgba(34,197,94,0.85)",
    borderColor: UI.green,
  },
  checkpointWarning: {
    backgroundColor: UI.goldAlpha85,
    borderColor: UI.gold,
  },
  checkpointSelected: {
    transform: [{ scale: 1.15 }],
    borderWidth: 3,
    borderColor: "#fff",
  },
  checkpointIcon: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "800",
  },
  tooltip: {
    position: "absolute",
    top: -8,
    width: 170,
    backgroundColor: "rgba(10,14,20,0.95)",
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.3)",
    zIndex: 20,
  },
  tooltipTitle: {
    color: UI.gold3,
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 3,
  },
  tooltipDesc: {
    color: "#E5E7EB",
    fontSize: 11,
    lineHeight: 15,
  },
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
    paddingVertical: 8,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    color: "#9BA1A6",
    fontSize: 11,
    fontWeight: "500",
  },
});
