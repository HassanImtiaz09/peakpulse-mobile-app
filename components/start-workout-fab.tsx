/**
 * StartWorkoutFAB — Persistent floating "Start Workout" button
 *
 * Renders a gold pill-shaped FAB that hovers above the tab bar on
 * Today and Train tabs. Tapping it navigates to /active-workout and
 * fires a medium haptic impact so the tap feels purposeful.
 *
 * Usage (add to Today tab and Train tab screen roots):
 *   import { StartWorkoutFAB } from "@/components/start-workout-fab";
 *   ...
 *   <StartWorkoutFAB />
 */

import React, { useEffect, useRef } from "react";
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { UI } from "@/constants/ui-colors";

/* ── Design tokens ───────────────────────────────────────────────── */
const GOLD       = UI.gold;
const GOLD_PRESS = UI.secondary;
const LABEL      = "#0D1117";   // near-black label on gold bg
const SHADOW     = "#000";

/* ─────────────────────────────────────────────────────────────────── */

export function StartWorkoutFAB() {
  const insets = useSafeAreaInsets();

  /* Compute tab bar height to match _layout.tsx logic */
  const bottomPadding =
    Platform.OS === "web"
      ? 12
      : Math.max(insets.bottom, Platform.OS === "android" ? 16 : 24);
  const tabBarHeight = 56 + bottomPadding;
  const BOTTOM = tabBarHeight + 12; // 12px gap above tab bar

  /* Entrance animation — slide up + fade in */
  const slideAnim = useRef(new Animated.Value(40)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 10,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  /* Press handler */
  const handlePress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push("/active-workout" as never);
  };

  return (
    <Animated.View
      style={[
        styles.wrapper,
        {
          transform: [{ translateY: slideAnim }],
          opacity: fadeAnim,
          bottom: BOTTOM,
        },
      ]}
      pointerEvents="box-none"
    >
      <Pressable
        onPress={handlePress}
        android_ripple={{ color: GOLD_PRESS, borderless: false, radius: 28 }}
        style={({ pressed }) => [
          styles.pill,
          pressed && styles.pillPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Start today's workout"
        accessibilityHint="Opens the active workout screen"
      >
        <Ionicons name="flash" size={18} color={LABEL} style={styles.icon} />
        <Text style={styles.label}>Start Workout</Text>
      </Pressable>
    </Animated.View>
  );
}

/* ── Styles ─────────────────────────────────────────────────────── */
const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    alignSelf: "center",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 999,
    /* pointer-events set above via Animated.View prop */
  },

  pill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: GOLD,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 999,
    /* Shadow */
    shadowColor: SHADOW,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 10,
    gap: 8,
  },

  pillPressed: {
    backgroundColor: GOLD_PRESS,
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },

  icon: {
    marginRight: 2,
  },

  label: {
    color: LABEL,
    fontSize: 16,
    fontFamily: "DMSans_700Bold",
    letterSpacing: 0.3,
  },
});
