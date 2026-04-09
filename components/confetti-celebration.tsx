/**
 * ConfettiCelebration — Full-screen confetti burst animation.
 * Triggered on level-ups, streak milestones, and badge unlocks.
 * Uses react-native-reanimated for smooth 60fps animation.
 */
import React, { useEffect, useMemo } from "react";
import { Dimensions, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  Easing,
  runOnJS,
} from "react-native-reanimated";
import { UI } from "@/constants/ui-colors";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

const CONFETTI_COLORS = [
  UI.gold, UI.red, "#3B82F6", UI.emerald, "#8B5CF6",
  "#EC4899", UI.teal, UI.gold3, "#F87171", UI.blue,
];

const PARTICLE_COUNT = 40;

interface ConfettiParticleProps {
  index: number;
  onComplete?: () => void;
  isLast: boolean;
}

function ConfettiParticle({ index, onComplete, isLast }: ConfettiParticleProps) {
  const translateY = useSharedValue(-50);
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);
  const rotate = useSharedValue(0);
  const scale = useSharedValue(1);

  const startX = useMemo(() => Math.random() * SCREEN_W, []);
  const color = useMemo(() => CONFETTI_COLORS[index % CONFETTI_COLORS.length], [index]);
  const size = useMemo(() => 6 + Math.random() * 8, []);
  const isSquare = useMemo(() => Math.random() > 0.5, []);
  const delay = useMemo(() => Math.random() * 400, []);
  const drift = useMemo(() => (Math.random() - 0.5) * 120, []);
  const duration = useMemo(() => 1800 + Math.random() * 1200, []);

  useEffect(() => {
    translateY.value = withDelay(
      delay,
      withTiming(SCREEN_H + 50, { duration, easing: Easing.in(Easing.quad) }),
    );
    translateX.value = withDelay(
      delay,
      withTiming(drift, { duration, easing: Easing.inOut(Easing.sin) }),
    );
    rotate.value = withDelay(
      delay,
      withTiming(360 * (Math.random() > 0.5 ? 1 : -1), { duration }),
    );
    opacity.value = withDelay(
      delay + duration * 0.7,
      withTiming(0, { duration: duration * 0.3 }),
    );
    scale.value = withDelay(
      delay,
      withSequence(
        withTiming(1.3, { duration: 200 }),
        withTiming(0.8, { duration: duration - 200 }),
      ),
    );

    if (isLast && onComplete) {
      const timer = setTimeout(onComplete, delay + duration + 100);
      return () => clearTimeout(timer);
    }
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { translateX: translateX.value },
      { rotate: `${rotate.value}deg` },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left: startX,
          top: -20,
          width: size,
          height: isSquare ? size : size * 2,
          backgroundColor: color,
          borderRadius: isSquare ? 2 : size / 2,
        },
        style,
      ]}
    />
  );
}

interface ConfettiCelebrationProps {
  visible: boolean;
  onComplete?: () => void;
}

export function ConfettiCelebration({ visible, onComplete }: ConfettiCelebrationProps) {
  if (!visible) return null;

  return (
    <>
      {Array.from({ length: PARTICLE_COUNT }).map((_, i) => (
        <ConfettiParticle
          key={i}
          index={i}
          isLast={i === PARTICLE_COUNT - 1}
          onComplete={onComplete}
        />
      ))}
    </>
  );
}
