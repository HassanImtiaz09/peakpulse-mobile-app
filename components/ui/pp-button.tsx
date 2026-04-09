/**
 * PPButton — Shared button component with consistent variants.
 *
 * Variants:
 *   - primary:  Gold background, dark text (main CTAs)
 *   - secondary: Surface background, white text (secondary actions)
 *   - outline:  Transparent with border, white text (tertiary actions)
 *   - ghost:    Transparent, muted text (minimal emphasis)
 *   - danger:   Red background, white text (destructive actions)
 *
 * Sizes: sm, md, lg
 *
 * Usage:
 *   <PPButton variant="primary" onPress={handlePress}>Get Started</PPButton>
 *   <PPButton variant="outline" size="sm" icon="refresh" loading>Retry</PPButton>
 */
import React from "react";
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  type ViewStyle,
  type TextStyle,
} from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { UI } from "@/constants/ui-colors";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface PPButtonProps {
  children: string;
  variant?: Variant;
  size?: Size;
  icon?: keyof typeof MaterialIcons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
}

const VARIANT_STYLES: Record<Variant, { bg: string; text: string; border?: string }> = {
  primary:   { bg: UI.gold, text: UI.bg },
  secondary: { bg: UI.surface, text: UI.fg, border: UI.border },
  outline:   { bg: "transparent", text: UI.fg, border: "rgba(255,255,255,0.15)" },
  ghost:     { bg: "transparent", text: UI.muted },
  danger:    { bg: UI.red, text: "#fff" },
};

const SIZE_STYLES: Record<Size, { h: number; px: number; fontSize: number; iconSize: number; radius: number }> = {
  sm: { h: 36, px: 16, fontSize: 13, iconSize: 14, radius: 10 },
  md: { h: 48, px: 24, fontSize: 15, iconSize: 18, radius: 14 },
  lg: { h: 56, px: 32, fontSize: 17, iconSize: 20, radius: 16 },
};

export function PPButton({
  children,
  variant = "primary",
  size = "md",
  icon,
  loading = false,
  disabled = false,
  fullWidth = false,
  onPress,
  style,
}: PPButtonProps) {
  const v = VARIANT_STYLES[variant];
  const s = SIZE_STYLES[size];
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.85}
      accessibilityRole="button"
      style={[
        {
          height: s.h,
          paddingHorizontal: s.px,
          borderRadius: s.radius,
          backgroundColor: v.bg,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          opacity: isDisabled ? 0.5 : 1,
          ...(v.border ? { borderWidth: 1, borderColor: v.border } : {}),
          ...(fullWidth ? { width: "100%" as any } : {}),
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={v.text} />
      ) : icon ? (
        <MaterialIcons name={icon} size={s.iconSize} color={v.text} />
      ) : null}
      <Text
        style={{
          color: v.text,
          fontSize: s.fontSize,
          fontWeight: "700",
          fontFamily: "DMSans_700Bold",
        }}
      >
        {children}
      </Text>
    </TouchableOpacity>
  );
}
