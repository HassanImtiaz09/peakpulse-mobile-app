/**
 * PPCard — Shared card component with consistent styling.
 *
 * Variants:
 *   - default:  Standard card with surface background
 *   - elevated: Slightly brighter surface with stronger border
 *   - accent:   Top accent bar (colored stripe) for emphasis
 *   - premium:  Gold glow border for premium features
 *
 * Usage:
 *   <PPCard>Content here</PPCard>
 *   <PPCard variant="accent" accentColor="#8B5CF6" onPress={handleTap}>
 *     <Text>Tappable purple-accent card</Text>
 *   </PPCard>
 */
import React, { type ReactNode } from "react";
import { View, TouchableOpacity, StyleSheet, type ViewStyle } from "react-native";
import { UI } from "@/constants/ui-colors";

type Variant = "default" | "elevated" | "accent" | "premium";

interface PPCardProps {
  children: ReactNode;
  variant?: Variant;
  accentColor?: string;
  onPress?: () => void;
  style?: ViewStyle;
  noPadding?: boolean;
}

export function PPCard({
  children,
  variant = "default",
  accentColor = "#8B5CF6",
  onPress,
  style,
  noPadding = false,
}: PPCardProps) {
  const isElevated = variant === "elevated";
  const isPremium = variant === "premium";
  const hasAccent = variant === "accent";

  const cardStyle: ViewStyle = {
    borderRadius: 20,
    backgroundColor: isElevated ? UI.surface2 : UI.surface,
    borderWidth: 1,
    borderColor: isPremium ? UI.borderGold : UI.border,
    overflow: "hidden",
    ...(isPremium ? {
      shadowColor: UI.gold,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 4,
    } : {}),
  };

  const inner = (
    <View style={cardStyle}>
      {hasAccent && (
        <View style={{ height: 3, backgroundColor: accentColor }} />
      )}
      <View style={noPadding ? undefined : { padding: 20 }}>
        {children}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={style}>
        {inner}
      </TouchableOpacity>
    );
  }

  return <View style={style}>{inner}</View>;
}
