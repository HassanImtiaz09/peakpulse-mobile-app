/**
 * XPToast — Floating "+XP" toast notification.
 * Appears briefly when user earns XP, then fades out.
 * Shows XP amount, action label, and optional level-up indicator.
 */
import React, { useEffect } from "react";
import { StyleSheet, Text, View, Platform } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  Easing,
  runOnJS,
} from "react-native-reanimated";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Haptics from "expo-haptics";
import { UI } from "@/constants/ui-colors";

const AMBER = UI.gold;
const GREEN = UI.green;
const PURPLE = "#8B5CF6";

interface XPToastProps {
  visible: boolean;
  xp: number;
  label: string;
  levelUp?: boolean;
  newLevel?: number;
  onDismiss: () => void;
}

export function XPToast({
  visible,
  xp,
  label,
  levelUp,
  newLevel,
  onDismiss,
}: XPToastProps) {
  const translateY = useSharedValue(-80);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.8);

  useEffect(() => {
    if (visible) {
      // Haptic feedback
      if (Platform.OS !== "web") {
        if (levelUp) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      }

      // Animate in
      translateY.value = withTiming(0, { duration: 300, easing: Easing.out(Easing.back(1.2)) });
      opacity.value = withTiming(1, { duration: 200 });
      scale.value = withSequence(
        withTiming(1.05, { duration: 200 }),
        withTiming(1, { duration: 150 }),
      );

      // Auto-dismiss after 2.5s
      const timer = setTimeout(() => {
        translateY.value = withTiming(-80, { duration: 300 });
        opacity.value = withTiming(0, { duration: 300 });
        setTimeout(onDismiss, 350);
      }, 2500);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  if (!visible) return null;

  const bgColor = levelUp ? PURPLE : AMBER;

  return (
    <Animated.View
      style={[styles.container, { backgroundColor: `${bgColor}18`, borderColor: `${bgColor}40` }, animStyle]}
      pointerEvents="none"
    >
      <View style={[styles.iconCircle, { backgroundColor: `${bgColor}25` }]}>
        <MaterialIcons
          name={levelUp ? "arrow-upward" : "star"}
          size={18}
          color={bgColor}
        />
      </View>
      <View style={styles.content}>
        <Text style={[styles.xpText, { color: bgColor }]}>
          +{xp} XP
        </Text>
        <Text style={styles.label}>
          {levelUp ? `Level Up! Level ${newLevel}` : label}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 60,
    left: 20,
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    zIndex: 9999,
    elevation: 10,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
    gap: 1,
  },
  xpText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 16,
  },
  label: {
    color: UI.muted,
    fontSize: 12,
    fontFamily: "DMSans_500Medium",
  },
});
