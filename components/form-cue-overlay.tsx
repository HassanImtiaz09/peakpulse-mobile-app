/**
 * FormCueOverlay
 *
 * A translucent overlay that appears when users tap the animated exercise GIF.
 * Shows key form tips, common mistakes, and breathing cues in a compact
 * card layout over the GIF. Tap again or swipe to dismiss.
 *
 * Features:
 * - Category-coded tips (form ✓, mistake ⚠, breathing 🌬, safety 🛡)
 * - Smooth fade-in/out animation
 * - Auto-dismiss after 8 seconds
 * - Works in both inline and fullscreen modes
 */

import React, { useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  Platform,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import {
  getFormTips,
  getTipCategoryIcon,
  getTipCategoryColor,
  type FormTip,
  type ExerciseFormTips,
} from "@/lib/form-cue-tips";

interface FormCueOverlayProps {
  /** Exercise name for tip lookup */
  exerciseName: string;
  /** Whether the overlay is visible */
  visible: boolean;
  /** Callback to dismiss the overlay */
  onDismiss: () => void;
  /** Whether this is in fullscreen mode (larger text) */
  fullscreen?: boolean;
}

const AUTO_DISMISS_MS = 8000;

export function FormCueOverlay({
  exerciseName,
  visible,
  onDismiss,
  fullscreen = false,
}: FormCueOverlayProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const tips = getFormTips(exerciseName);

  useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();

      // Auto-dismiss after timeout
      timerRef.current = setTimeout(() => {
        handleDismiss();
      }, AUTO_DISMISS_MS);
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [visible]);

  const handleDismiss = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      onDismiss();
    });
  }, [fadeAnim, onDismiss]);

  if (!tips || !visible) return null;

  const fontSize = fullscreen ? 14 : 12;
  const iconSize = fullscreen ? 16 : 14;
  const padding = fullscreen ? 16 : 10;

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        styles.overlay,
        { opacity: fadeAnim },
      ]}
      pointerEvents={visible ? "auto" : "none"}
    >
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={handleDismiss}
      >
        <View style={[styles.card, { padding }]}>
          {/* Header */}
          <View style={styles.header}>
            <MaterialIcons name="fitness-center" size={iconSize} color="#F59E0B" />
            <Text style={[styles.headerText, { fontSize: fontSize + 1 }]} numberOfLines={1}>
              Form Tips
            </Text>
            <Pressable
              onPress={handleDismiss}
              style={({ pressed }) => [
                styles.closeBtn,
                pressed && { opacity: 0.6 },
              ]}
            >
              <MaterialIcons name="close" size={16} color="rgba(255,255,255,0.6)" />
            </Pressable>
          </View>

          {/* Tips List */}
          <View style={styles.tipsList}>
            {tips.tips.map((tip, index) => (
              <TipRow
                key={index}
                tip={tip}
                fontSize={fontSize}
                iconSize={iconSize}
              />
            ))}
          </View>

          {/* Dismiss hint */}
          <Text style={styles.dismissHint}>Tap anywhere to dismiss</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

function TipRow({
  tip,
  fontSize,
  iconSize,
}: {
  tip: FormTip;
  fontSize: number;
  iconSize: number;
}) {
  const color = getTipCategoryColor(tip.category);
  const icon = getTipCategoryIcon(tip.category);

  return (
    <View style={styles.tipRow}>
      <MaterialIcons
        name={icon as any}
        size={iconSize}
        color={color}
        style={styles.tipIcon}
      />
      <Text style={[styles.tipText, { fontSize }]} numberOfLines={2}>
        {tip.text}
      </Text>
    </View>
  );
}

/**
 * Compact badge that shows tip count — used as a tap target
 * to trigger the overlay.
 */
export function FormCueBadge({
  exerciseName,
  onPress,
  active,
}: {
  exerciseName: string;
  onPress: () => void;
  active: boolean;
}) {
  const tips = getFormTips(exerciseName);
  if (!tips) return null;

  return (
    <Pressable
      onPress={() => {
        onPress();
        if (Platform.OS !== "web") {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        }
      }}
      style={({ pressed }) => [
        styles.badge,
        active && styles.badgeActive,
        pressed && { opacity: 0.7 },
      ]}
    >
      <MaterialIcons
        name="lightbulb"
        size={14}
        color={active ? "#0A0E14" : "#F59E0B"}
      />
      <Text style={[styles.badgeText, active && styles.badgeTextActive]}>
        {tips.tips.length} Tips
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: {
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 20,
    borderRadius: 12,
  },
  card: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  headerText: {
    color: "#F59E0B",
    fontWeight: "700",
    flex: 1,
    letterSpacing: 0.3,
  },
  closeBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  tipsList: {
    gap: 6,
  },
  tipRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  tipIcon: {
    marginTop: 1,
  },
  tipText: {
    color: "#E5E7EB",
    lineHeight: 18,
    flex: 1,
    fontWeight: "500",
  },
  dismissHint: {
    color: "rgba(255,255,255,0.35)",
    fontSize: 10,
    textAlign: "center",
    marginTop: 10,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: "rgba(245,158,11,0.08)",
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.2)",
  },
  badgeActive: {
    backgroundColor: "#F59E0B",
    borderColor: "#FBBF24",
  },
  badgeText: {
    color: "#F59E0B",
    fontSize: 11,
    fontWeight: "700",
  },
  badgeTextActive: {
    color: "#0A0E14",
  },
});
