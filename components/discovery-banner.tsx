/**
 * R2: Discovery Banner Component
 * A subtle, dismissible banner that surfaces features contextually.
 * Appears at the top of the dashboard when a milestone is reached.
 */
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import type { DiscoveryPrompt } from "@/lib/feature-discovery";
import { UI } from "@/constants/ui-colors";

interface DiscoveryBannerProps {
  prompt: DiscoveryPrompt;
  onDismiss: () => void;
}

export function DiscoveryBanner({ prompt, onDismiss }: DiscoveryBannerProps) {
  const router = useRouter();

  return (
    <View style={[styles.banner, { borderColor: prompt.accentColor + "30" }]}>
      <TouchableOpacity style={styles.dismissBtn} onPress={onDismiss}>
        <MaterialIcons name="close" size={14} color="#64748B" />
      </TouchableOpacity>
      <View style={styles.content}>
        <View style={[styles.iconCircle, { backgroundColor: prompt.accentColor + "15" }]}>
          <MaterialIcons name={prompt.icon as any} size={20} color={prompt.accentColor} />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title}>{prompt.title}</Text>
          <Text style={styles.message} numberOfLines={2}>{prompt.message}</Text>
        </View>
      </View>
      <TouchableOpacity
        style={[styles.ctaBtn, { backgroundColor: prompt.accentColor + "18", borderColor: prompt.accentColor + "35" }]}
        onPress={() => {
          onDismiss();
          router.push(prompt.route as any);
        }}
      >
        <Text style={[styles.ctaText, { color: prompt.accentColor }]}>{prompt.ctaText}</Text>
        <MaterialIcons name="arrow-forward" size={14} color={prompt.accentColor} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: "#111827",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    position: "relative",
  },
  dismissBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(100,116,139,0.15)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  content: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
    marginBottom: 10,
    paddingRight: 20,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    color: UI.fg,
    fontFamily: "DMSans_700Bold",
    fontSize: 14,
    marginBottom: 3,
  },
  message: {
    color: UI.muted,
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    lineHeight: 18,
  },
  ctaBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 10,
    paddingVertical: 8,
    borderWidth: 1,
  },
  ctaText: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 12,
  },
});
