/**
 * ShareMilestoneButton — Reusable share button for milestones.
 * Used in XP Rewards screen badge cards and confetti celebration.
 */
import React, { useState } from "react";
import { Pressable, Text, StyleSheet, Platform, Alert } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Haptics from "expo-haptics";
import {
  shareMilestone,
  shareMilestoneAsText,
  type MilestoneShareData,
} from "@/lib/milestone-share";

interface ShareMilestoneButtonProps {
  data: MilestoneShareData;
  /** Compact mode for inline use */
  compact?: boolean;
  /** Custom label */
  label?: string;
  /** Custom color */
  color?: string;
}

export function ShareMilestoneButton({
  data,
  compact = false,
  label = "Share",
  color = "#F59E0B",
}: ShareMilestoneButtonProps) {
  const [sharing, setSharing] = useState(false);

  const handleShare = async () => {
    if (sharing) return;
    setSharing(true);

    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    try {
      // Try SVG share first, fall back to text
      const success = await shareMilestone(data);
      if (!success) {
        const textSuccess = await shareMilestoneAsText(data);
        if (!textSuccess) {
          Alert.alert(
            "Sharing Unavailable",
            "Sharing is not available on this device.",
          );
        }
      }
    } catch {
      // Sharing was cancelled or failed silently
    } finally {
      setSharing(false);
    }
  };

  if (compact) {
    return (
      <Pressable
        onPress={handleShare}
        style={({ pressed }) => [
          styles.compactButton,
          { borderColor: `${color}40` },
          pressed && { opacity: 0.7 },
        ]}
      >
        <MaterialIcons name="share" size={14} color={color} />
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={handleShare}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: `${color}15`, borderColor: `${color}30` },
        pressed && { opacity: 0.7, transform: [{ scale: 0.97 }] },
      ]}
    >
      <MaterialIcons name="share" size={16} color={color} />
      <Text style={[styles.label, { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  label: {
    fontSize: 13,
    fontFamily: "DMSans_600SemiBold",
  },
  compactButton: {
    width: 30,
    height: 30,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
