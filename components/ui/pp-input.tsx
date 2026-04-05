/**
 * PPInput — Shared text input component with consistent styling.
 *
 * Variants:
 *   - default:  Standard input with surface background
 *   - filled:   Slightly elevated background
 *   - outlined: Transparent with visible border
 *
 * Usage:
 *   <PPInput placeholder="Enter weight" keyboardType="decimal-pad" />
 *   <PPInput label="Email" icon="email" value={email} onChangeText={setEmail} />
 *   <PPInput variant="filled" multiline numberOfLines={4} />
 */
import React from "react";
import { View, TextInput, Text, StyleSheet, type TextInputProps, type ViewStyle } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { UI } from "@/constants/ui-colors";

type Variant = "default" | "filled" | "outlined";

interface PPInputProps extends Omit<TextInputProps, "style"> {
  variant?: Variant;
  label?: string;
  icon?: keyof typeof MaterialIcons.glyphMap;
  error?: string;
  containerStyle?: ViewStyle;
}

const VARIANT_BG: Record<Variant, string> = {
  default: UI.surface,
  filled: UI.surface2,
  outlined: "transparent",
};

export function PPInput({
  variant = "default",
  label,
  icon,
  error,
  containerStyle,
  ...textInputProps
}: PPInputProps) {
  const isOutlined = variant === "outlined";

  return (
    <View style={containerStyle}>
      {label && (
        <Text style={styles.label}>{label}</Text>
      )}
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: VARIANT_BG[variant],
            borderColor: error ? "#EF4444" : isOutlined ? "rgba(255,255,255,0.15)" : UI.border,
          },
        ]}
      >
        {icon && (
          <MaterialIcons name={icon} size={18} color={UI.muted} style={{ marginRight: 10 }} />
        )}
        <TextInput
          placeholderTextColor={UI.muted}
          {...textInputProps}
          style={[
            styles.input,
            textInputProps.multiline ? { minHeight: 80, textAlignVertical: "top" as any } : {},
          ]}
        />
      </View>
      {error && (
        <Text style={styles.error}>{error}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    color: UI.fg,
    fontSize: 13,
    fontWeight: "600",
    fontFamily: "DMSans_600SemiBold",
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    minHeight: 48,
  },
  input: {
    flex: 1,
    color: UI.fg,
    fontSize: 15,
    fontFamily: "DMSans_400Regular",
    paddingVertical: 12,
  },
  error: {
    color: "#EF4444",
    fontSize: 12,
    marginTop: 4,
  },
});
