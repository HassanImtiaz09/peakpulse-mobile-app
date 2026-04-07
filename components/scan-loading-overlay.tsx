/**
 * ScanLoadingOverlay – multi-step loading animation for the AI body scan.
 *
 * Cycles through descriptive messages so the user knows what the AI is
 * working on, reducing perceived wait time.  Includes a pulsing ring
 * animation, a step progress indicator, and smooth crossfade between messages.
 */

import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
} from "react-native";
import { UI } from "@/constants/ui-colors";

// ── Step definitions ────────────────────────────────────────────────────────
const ANALYZE_STEPS = [
  { label: "Uploading your photo securely...", duration: 3000 },
  { label: "Detecting body landmarks...", duration: 4000 },
  { label: "Analysing your body composition...", duration: 5000 },
  { label: "Estimating body-fat percentage...", duration: 4000 },
  { label: "Mapping muscle distribution...", duration: 4000 },
  { label: "Preparing your results...", duration: 3000 },
];

const GENERATE_STEPS = [
  { label: "Understanding your target physique...", duration: 3000 },
  { label: "Generating transformation preview...", duration: 6000 },
  { label: "Rendering visualisations...", duration: 5000 },
  { label: "Finalising your transformation...", duration: 3000 },
];

type Props = {
  /** "analyzing" or "generating" */
  phase: "analyzing" | "generating";
  /** Overall progress 0-1 if available from server, otherwise auto-cycles */
  serverProgress?: number;
};

export default function ScanLoadingOverlay({ phase, serverProgress }: Props) {
  const steps = phase === "analyzing" ? ANALYZE_STEPS : GENERATE_STEPS;
  const [currentStep, setCurrentStep] = useState(0);

  // ── Pulse animation ──────────────────────────────────────────────────────
  const pulseAnim = useRef(new Animated.Value(0.4)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Pulsing ring
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.4,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    // Rotating ring
    const rotate = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 3000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );

    pulse.start();
    rotate.start();

    return () => {
      pulse.stop();
      rotate.stop();
    };
  }, []);

  // ── Auto-cycle through steps ─────────────────────────────────────────────
  useEffect(() => {
    if (currentStep >= steps.length - 1) return;

    const timer = setTimeout(() => {
      // Crossfade
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();

      setCurrentStep((s) => Math.min(s + 1, steps.length - 1));
    }, steps[currentStep].duration);

    return () => clearTimeout(timer);
  }, [currentStep, steps]);

  // Reset step when phase changes
  useEffect(() => {
    setCurrentStep(0);
  }, [phase]);

  // ── Derived values ───────────────────────────────────────────────────────
  const progress = serverProgress ?? (currentStep + 1) / steps.length;
  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <View style={styles.overlay}>
      {/* Pulsing + rotating ring */}
      <Animated.View
        style={[
          styles.ring,
          {
            opacity: pulseAnim,
            transform: [{ rotate: spin }, { scale: pulseAnim.interpolate({ inputRange: [0.4, 1], outputRange: [0.9, 1.1] }) }],
          },
        ]}
      />

      {/* Phase icon */}
      <View style={styles.iconCircle}>
        <Text style={styles.iconEmoji}>
          {phase === "analyzing" ? "\u{1F50D}" : "\u{2728}"}
        </Text>
      </View>

      {/* Phase title */}
      <Text style={styles.phaseTitle}>
        {phase === "analyzing" ? "AI Body Analysis" : "Generating Preview"}
      </Text>

      {/* Current step message with crossfade */}
      <Animated.Text style={[styles.stepMessage, { opacity: fadeAnim }]}>
        {steps[currentStep].label}
      </Animated.Text>

      {/* Step progress dots */}
      <View style={styles.dotsRow}>
        {steps.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i <= currentStep ? styles.dotActive : styles.dotInactive,
            ]}
          />
        ))}
      </View>

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
      </View>

      <Text style={styles.percentText}>{Math.round(progress * 100)}%</Text>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const SCREEN_W = Dimensions.get("window").width;

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.85)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
    paddingHorizontal: 32,
  },
  ring: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 3,
    borderColor: UI.lime400,
    borderTopColor: "transparent",
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  iconEmoji: {
    fontSize: 36,
  },
  phaseTitle: {
    fontFamily: "BebasNeue_400Regular",
    fontSize: 26,
    color: "#FFFFFF",
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  stepMessage: {
    fontFamily: "DMSans_400Regular",
    fontSize: 15,
    color: "rgba(255,255,255,0.7)",
    textAlign: "center",
    marginBottom: 24,
    minHeight: 22,
  },
  dotsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    backgroundColor: UI.lime400,
  },
  dotInactive: {
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  progressTrack: {
    width: SCREEN_W - 120,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.1)",
    overflow: "hidden",
    marginBottom: 8,
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
    backgroundColor: UI.lime400,
  },
  percentText: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 13,
    color: "rgba(255,255,255,0.5)",
  },
});
