/**
 * AchievementUnlock — Full-screen overlay animation when an achievement is unlocked.
 * Shows the achievement emoji, name, description, tier badge, and XP reward
 * with a scale-in + glow animation.
 */
import React, { useEffect, useRef, useCallback } from "react";
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, Animated,
  Easing, Platform, Dimensions,
} from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Haptics from "expo-haptics";
import { TIER_COLORS, TIER_LABELS, type AchievementDef, type AchievementTier } from "@/lib/achievements";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface AchievementUnlockProps {
  achievement: AchievementDef | null;
  visible: boolean;
  onDismiss: () => void;
}

export function AchievementUnlock({ achievement, visible, onDismiss }: AchievementUnlockProps) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const emojiScale = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    if (visible && achievement) {
      // Haptic burst
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 200);
      }

      // Animate in
      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          tension: 80,
          useNativeDriver: true,
        }),
        Animated.spring(emojiScale, {
          toValue: 1,
          friction: 4,
          tension: 60,
          delay: 150,
          useNativeDriver: true,
        }),
      ]).start();

      // Glow pulse
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ).start();
    } else {
      scaleAnim.setValue(0);
      opacityAnim.setValue(0);
      glowAnim.setValue(0);
      emojiScale.setValue(0.3);
    }
  }, [visible, achievement]);

  const handleDismiss = useCallback(() => {
    Animated.parallel([
      Animated.timing(opacityAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 0.8, duration: 200, useNativeDriver: true }),
    ]).start(() => onDismiss());
  }, [onDismiss]);

  if (!achievement) return null;

  const tierColor = TIER_COLORS[achievement.tier];
  const tierLabel = TIER_LABELS[achievement.tier];

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.8],
  });

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <Animated.View style={[styles.overlay, { opacity: opacityAnim }]}>
        <TouchableOpacity style={styles.dismissArea} activeOpacity={1} onPress={handleDismiss} />

        <Animated.View
          style={[
            styles.card,
            {
              transform: [{ scale: scaleAnim }],
              borderColor: tierColor,
            },
          ]}
        >
          {/* Glow ring */}
          <Animated.View
            style={[
              styles.glowRing,
              {
                opacity: glowOpacity,
                borderColor: tierColor,
                shadowColor: tierColor,
              },
            ]}
          />

          {/* Header */}
          <View style={styles.header}>
            <MaterialIcons name="emoji-events" size={16} color={tierColor} />
            <Text style={[styles.headerText, { color: tierColor }]}>ACHIEVEMENT UNLOCKED</Text>
          </View>

          {/* Emoji */}
          <Animated.View style={[styles.emojiContainer, { transform: [{ scale: emojiScale }] }]}>
            <Text style={styles.emoji}>{achievement.emoji}</Text>
          </Animated.View>

          {/* Name & Description */}
          <Text style={styles.name}>{achievement.name}</Text>
          <Text style={styles.description}>{achievement.description}</Text>

          {/* Tier Badge */}
          <View style={[styles.tierBadge, { backgroundColor: tierColor + "20", borderColor: tierColor + "40" }]}>
            <MaterialIcons name="shield" size={14} color={tierColor} />
            <Text style={[styles.tierText, { color: tierColor }]}>{tierLabel}</Text>
          </View>

          {/* XP Reward */}
          <View style={styles.xpRow}>
            <MaterialIcons name="bolt" size={18} color="#FBBF24" />
            <Text style={styles.xpText}>+{achievement.xpReward} XP</Text>
          </View>

          {/* Dismiss Button */}
          <TouchableOpacity style={[styles.dismissButton, { backgroundColor: tierColor }]} onPress={handleDismiss}>
            <Text style={styles.dismissButtonText}>Awesome!</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
  },
  dismissArea: {
    ...StyleSheet.absoluteFillObject,
  },
  card: {
    width: SCREEN_WIDTH * 0.82,
    backgroundColor: "#1A1D21",
    borderRadius: 24,
    borderWidth: 2,
    padding: 28,
    alignItems: "center",
    gap: 12,
    zIndex: 10,
  },
  glowRing: {
    position: "absolute",
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 28,
    borderWidth: 3,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  headerText: {
    fontSize: 11,
    fontFamily: "DMSans_700Bold",
    letterSpacing: 2,
  },
  emojiContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.05)",
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 4,
  },
  emoji: {
    fontSize: 44,
  },
  name: {
    fontSize: 22,
    fontFamily: "DMSans_700Bold",
    color: "#ECEDEE",
    textAlign: "center",
  },
  description: {
    fontSize: 14,
    fontFamily: "DMSans_400Regular",
    color: "#9BA1A6",
    textAlign: "center",
    lineHeight: 20,
  },
  tierBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
  },
  tierText: {
    fontSize: 12,
    fontFamily: "DMSans_600SemiBold",
  },
  xpRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  xpText: {
    fontSize: 18,
    fontFamily: "SpaceMono_700Bold",
    color: "#FBBF24",
  },
  dismissButton: {
    marginTop: 8,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 14,
  },
  dismissButtonText: {
    color: "#0A0E14",
    fontSize: 15,
    fontFamily: "DMSans_700Bold",
  },
});
