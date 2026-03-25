/**
 * PremiumFeatureBanner — Reusable promotional banner for premium features.
 * Shows a visually appealing card that highlights a premium feature and
 * encourages users to upgrade. Used throughout the app to drive conversions.
 */
import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Haptics from "expo-haptics";
import { useSubscription } from "@/hooks/use-subscription";
import { PaywallModal } from "@/components/paywall-modal";

const BG = "#0A0E14";
const SURFACE = "#141A22";
const FG = "#F1F5F9";
const MUTED = "#64748B";
const GOLD = "#F59E0B";
const GOLD_DIM = "rgba(245,158,11,0.12)";
const GOLD_BORDER = "rgba(245,158,11,0.20)";

interface PremiumFeatureBannerProps {
  /** Feature key from FEATURE_TIERS */
  feature: string;
  /** Display name of the feature */
  title: string;
  /** Short description of the feature benefit */
  description: string;
  /** MaterialIcons icon name */
  icon: string;
  /** Accent color for the banner */
  accentColor?: string;
  /** Required tier for the feature */
  requiredTier?: "basic" | "advanced";
  /** Compact mode for inline banners */
  compact?: boolean;
  /** Optional CTA text override */
  ctaText?: string;
}

export function PremiumFeatureBanner({
  feature,
  title,
  description,
  icon,
  accentColor = GOLD,
  requiredTier = "basic",
  compact = false,
  ctaText,
}: PremiumFeatureBannerProps) {
  const { canAccess, isPaid, hasAdvancedAccess } = useSubscription();
  const [showPaywall, setShowPaywall] = useState(false);

  // Don't show banner if user already has access
  if (canAccess(feature)) return null;

  const handlePress = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowPaywall(true);
  };

  const accentDim = accentColor + "18";
  const accentBorder = accentColor + "30";

  if (compact) {
    return (
      <>
        <TouchableOpacity
          onPress={handlePress}
          style={[styles.compactContainer, { borderColor: accentBorder, backgroundColor: accentDim }]}
        >
          <View style={[styles.compactIconWrap, { backgroundColor: accentColor + "25" }]}>
            <MaterialIcons name={icon as any} size={16} color={accentColor} />
          </View>
          <View style={styles.compactTextWrap}>
            <Text style={[styles.compactTitle, { color: accentColor }]}>{title}</Text>
            <Text style={styles.compactDesc} numberOfLines={1}>{description}</Text>
          </View>
          <View style={[styles.compactCta, { backgroundColor: accentColor }]}>
            <Text style={styles.compactCtaText}>{ctaText ?? "Unlock"}</Text>
          </View>
        </TouchableOpacity>
        <PaywallModal
          visible={showPaywall}
          onClose={() => setShowPaywall(false)}
          featureName={title}
          requiredTier={requiredTier}
          description={description}
        />
      </>
    );
  }

  return (
    <>
      <TouchableOpacity
        onPress={handlePress}
        style={[styles.container, { borderColor: accentBorder }]}
        activeOpacity={0.85}
      >
        {/* Gradient-like top accent */}
        <View style={[styles.accentBar, { backgroundColor: accentColor }]} />
        <View style={styles.content}>
          <View style={styles.headerRow}>
            <View style={[styles.iconWrap, { backgroundColor: accentDim }]}>
              <MaterialIcons name={icon as any} size={22} color={accentColor} />
            </View>
            <View style={styles.badgeWrap}>
              <MaterialIcons name="workspace-premium" size={10} color={GOLD} />
              <Text style={styles.badgeText}>PREMIUM</Text>
            </View>
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>
          <View style={[styles.ctaButton, { backgroundColor: accentColor }]}>
            <MaterialIcons name="lock-open" size={14} color={BG} />
            <Text style={styles.ctaButtonText}>{ctaText ?? `Unlock with ${requiredTier === "advanced" ? "Advanced" : "Basic"}`}</Text>
          </View>
        </View>
      </TouchableOpacity>
      <PaywallModal
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        featureName={title}
        requiredTier={requiredTier}
        description={description}
      />
    </>
  );
}

/**
 * PremiumFeatureTeaser — A small inline teaser that appears within content
 * to hint at premium features. Less intrusive than the full banner.
 */
export function PremiumFeatureTeaser({
  text,
  feature,
  requiredTier = "basic",
}: {
  text: string;
  feature: string;
  requiredTier?: "basic" | "advanced";
}) {
  const { canAccess } = useSubscription();
  const [showPaywall, setShowPaywall] = useState(false);

  if (canAccess(feature)) return null;

  return (
    <>
      <TouchableOpacity
        onPress={() => {
          if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setShowPaywall(true);
        }}
        style={styles.teaserContainer}
      >
        <MaterialIcons name="auto-awesome" size={14} color={GOLD} />
        <Text style={styles.teaserText}>{text}</Text>
        <MaterialIcons name="chevron-right" size={14} color={GOLD} />
      </TouchableOpacity>
      <PaywallModal
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        featureName={text}
        requiredTier={requiredTier}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: SURFACE,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
  },
  accentBar: {
    height: 3,
    width: "100%",
  },
  content: {
    padding: 16,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: GOLD_DIM,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: GOLD_BORDER,
  },
  badgeText: {
    color: GOLD,
    fontSize: 9,
    fontFamily: "DMSans_700Bold",
    letterSpacing: 1,
  },
  title: {
    color: FG,
    fontFamily: "DMSans_700Bold",
    fontSize: 16,
    marginBottom: 4,
  },
  description: {
    color: MUTED,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  ctaButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 12,
    paddingVertical: 12,
  },
  ctaButtonText: {
    color: BG,
    fontFamily: "DMSans_700Bold",
    fontSize: 13,
  },
  // Compact styles
  compactContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    gap: 10,
  },
  compactIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  compactTextWrap: {
    flex: 1,
  },
  compactTitle: {
    fontFamily: "DMSans_700Bold",
    fontSize: 12,
  },
  compactDesc: {
    color: MUTED,
    fontSize: 11,
    lineHeight: 15,
  },
  compactCta: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  compactCtaText: {
    color: BG,
    fontFamily: "DMSans_700Bold",
    fontSize: 11,
  },
  // Teaser styles
  teaserContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: GOLD_DIM,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: GOLD_BORDER,
  },
  teaserText: {
    color: GOLD,
    fontSize: 12,
    fontFamily: "DMSans_600SemiBold",
    flex: 1,
  },
});
