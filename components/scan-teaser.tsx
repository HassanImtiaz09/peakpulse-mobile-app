/**
 * ScanTeaser — shows a blurred/partial preview of what the AI body scan
 * can produce, motivating users to complete onboarding.
 *
 * Displays during onboarding setup steps (4-8) as a floating card
 * with a blurred sample transformation and enticing copy.
 */

import React, { useEffect, useRef } from "react";
import {
  View, Text, StyleSheet, Animated, Dimensions, Image, Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { SF } from "@/constants/ui-colors";

const { width: SCREEN_W } = Dimensions.get("window");

// Sample transformation preview (generic silhouette — not real user data)
const SAMPLE_BEFORE = "https://files.manuscdn.com/user_upload_by_me/user_upload_6801a1cfee1ca5.79453994.png";
const SAMPLE_AFTER = "https://files.manuscdn.com/user_upload_by_me/user_upload_6801a1cfee1ca5.79453994.png";

interface ScanTeaserProps {
  /** Which setup step the user is on (4-8) */
  currentStep: number;
  /** Total setup steps */
  totalSteps: number;
}

export function ScanTeaser({ currentStep, totalSteps }: ScanTeaserProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        delay: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        delay: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const stepsLeft = totalSteps - currentStep;
  const progressPct = Math.round((currentStep / totalSteps) * 100);

  return (
    <Animated.View
      style={[
        styles.container,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      <LinearGradient
        colors={["rgba(245,158,11,0.08)", "rgba(245,158,11,0.02)"] as const}
        style={styles.gradient}
      >
        {/* Blurred preview thumbnails */}
        <View style={styles.previewRow}>
          <View style={styles.previewBox}>
            <Image
              source={{ uri: SAMPLE_BEFORE }}
              style={styles.previewImg}
              blurRadius={Platform.OS === "ios" ? 20 : 10}
            />
            <View style={styles.previewOverlay}>
              <Ionicons name="lock-closed" size={16} color="#F59E0B" />
            </View>
            <Text style={styles.previewLabel}>Before</Text>
          </View>
          <View style={styles.arrowWrap}>
            <Ionicons name="arrow-forward" size={20} color="#F59E0B" />
          </View>
          <View style={styles.previewBox}>
            <Image
              source={{ uri: SAMPLE_AFTER }}
              style={styles.previewImg}
              blurRadius={Platform.OS === "ios" ? 20 : 10}
            />
            <View style={styles.previewOverlay}>
              <Ionicons name="lock-closed" size={16} color="#F59E0B" />
            </View>
            <Text style={styles.previewLabel}>After</Text>
          </View>
        </View>

        {/* Teaser copy */}
        <Text style={styles.title}>Your AI Transformation Preview</Text>
        <Text style={styles.subtitle}>
          Complete {stepsLeft} more step{stepsLeft !== 1 ? "s" : ""} to unlock your
          personalised body scan with AI-generated transformation previews
        </Text>

        {/* Mini progress bar */}
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progressPct}%` as any }]} />
        </View>
        <Text style={styles.progressText}>{progressPct}% complete</Text>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.15)",
  },
  gradient: {
    padding: 16,
    alignItems: "center",
  },
  previewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  previewBox: {
    width: 80,
    height: 100,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: SF.surface,
  },
  previewImg: {
    width: "100%",
    height: "100%",
  },
  previewOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(10,14,20,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  previewLabel: {
    position: "absolute",
    bottom: 4,
    left: 0,
    right: 0,
    textAlign: "center",
    fontSize: 9,
    fontFamily: "DMSans_600SemiBold",
    color: "rgba(255,255,255,0.6)",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  arrowWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(245,158,11,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 15,
    fontFamily: "DMSans_700Bold",
    color: SF.fg,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: "DMSans_400Regular",
    color: SF.muted,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  progressTrack: {
    width: "80%",
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#F59E0B",
    borderRadius: 2,
  },
  progressText: {
    fontSize: 11,
    fontFamily: "DMSans_600SemiBold",
    color: "#F59E0B",
    marginTop: 6,
  },
});
