/**
 * FeatureGate — Subscription-based feature gating component.
 *
 * Wraps premium content with a blur overlay and upgrade prompt when
 * the user's subscription tier is insufficient. Shows a teaser of the
 * content behind the gate to motivate upgrades.
 *
 * Usage:
 *   <FeatureGate feature="body_scan">
 *     <BodyScanContent />
 *   </FeatureGate>
 *
 * Or inline check:
 *   const { canAccess } = useFeatureAccess();
 *   if (!canAccess("form_checker")) showUpgradePrompt();
 */
import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  Modal,
  Dimensions,
} from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useSubscription, FEATURE_TIERS, type SubscriptionTier } from "@/hooks/use-subscription";

const { width: SCREEN_W } = Dimensions.get("window");

// NanoBanana design tokens
const C = {
  bg: "#0A0E14",
  surface: "#141A22",
  border: "rgba(245,158,11,0.15)",
  fg: "#F1F5F9",
  muted: "#94A3B8",
  gold: "#F59E0B",
  gold2: "#FBBF24",
  ice: "#38BDF8",
  error: "#F87171",
};

// Tier display info
const TIER_INFO: Record<SubscriptionTier, { label: string; color: string; price: string }> = {
  free: { label: "Free", color: C.muted, price: "$0" },
  basic: { label: "Basic", color: C.ice, price: "$139" },
  advanced: { label: "Advanced", color: C.gold, price: "$299" },
};

interface FeatureGateProps {
  /** Feature key from FEATURE_TIERS */
  feature: string;
  /** Children to render when access is granted */
  children: React.ReactNode;
  /** Optional custom message for the gate overlay */
  message?: string;
  /** If true, show a compact inline lock badge instead of full overlay */
  compact?: boolean;
  /** If true, completely hide the children (don't show teaser) */
  hideContent?: boolean;
  /** Callback when the gate blocks access (e.g., for analytics) */
  onBlocked?: () => void;
}

/**
 * FeatureGate wraps content that requires a specific subscription tier.
 * If the user has access, children render normally.
 * If not, shows a blur overlay with upgrade prompt.
 */
export function FeatureGate({
  feature,
  children,
  message,
  compact = false,
  hideContent = false,
  onBlocked,
}: FeatureGateProps) {
  const { canAccess, tier, isTrialActive } = useSubscription();
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);

  const hasAccess = canAccess(feature);
  const requiredTier = FEATURE_TIERS[feature] ?? "free";
  const requiredInfo = TIER_INFO[requiredTier];

  const handleUpgradePress = useCallback(() => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
    setShowModal(false);
    router.push("/subscription-plans" as any);
  }, [router]);

  const handleGateTap = useCallback(() => {
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    }
    onBlocked?.();
    setShowModal(true);
  }, [onBlocked]);

  // User has access — render children normally
  if (hasAccess) {
    return <>{children}</>;
  }

  // Compact mode — small lock badge
  if (compact) {
    return (
      <Pressable
        onPress={handleGateTap}
        style={({ pressed }) => [pressed && { opacity: 0.8 }]}
      >
        <View style={styles.compactContainer}>
          {children}
          <View style={styles.compactBadge}>
            <MaterialIcons name="lock" size={10} color="#fff" />
            <Text style={styles.compactBadgeText}>{requiredInfo.label}</Text>
          </View>
        </View>
        <UpgradeModal
          visible={showModal}
          onClose={() => setShowModal(false)}
          onUpgrade={handleUpgradePress}
          feature={feature}
          requiredTier={requiredTier}
          currentTier={tier}
          isTrialActive={isTrialActive}
          message={message}
        />
      </Pressable>
    );
  }

  // Full overlay mode
  return (
    <View style={styles.gateContainer}>
      {/* Teaser content (dimmed) */}
      {!hideContent && (
        <View style={styles.teaserContent} pointerEvents="none">
          {children}
        </View>
      )}

      {/* Gate overlay */}
      <Pressable
        onPress={handleGateTap}
        style={({ pressed }) => [
          styles.overlay,
          hideContent && styles.overlayFull,
          pressed && { opacity: 0.9 },
        ]}
      >
        <View style={styles.overlayContent}>
          <View style={[styles.lockCircle, { borderColor: requiredInfo.color }]}>
            <MaterialIcons name="lock" size={24} color={requiredInfo.color} />
          </View>
          <Text style={styles.overlayTitle}>
            {requiredInfo.label} Feature
          </Text>
          <Text style={styles.overlayMessage}>
            {message || `Upgrade to ${requiredInfo.label} to unlock this feature`}
          </Text>
          <View style={[styles.upgradeButton, { backgroundColor: requiredInfo.color }]}>
            <Text style={styles.upgradeButtonText}>Upgrade Now</Text>
          </View>
        </View>
      </Pressable>

      <UpgradeModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        onUpgrade={handleUpgradePress}
        feature={feature}
        requiredTier={requiredTier}
        currentTier={tier}
        isTrialActive={isTrialActive}
        message={message}
      />
    </View>
  );
}

/**
 * Inline hook for checking feature access without a wrapper component.
 * Returns canAccess function and a showUpgradePrompt helper.
 */
export function useFeatureAccess() {
  const sub = useSubscription();
  const router = useRouter();

  const showUpgradePrompt = useCallback((feature: string) => {
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    }
    router.push("/subscription-plans" as any);
  }, [router]);

  return {
    canAccess: sub.canAccess,
    tier: sub.tier,
    isPaid: sub.isPaid,
    isTrialActive: sub.isTrialActive,
    hasAdvancedAccess: sub.hasAdvancedAccess,
    showUpgradePrompt,
  };
}

// ── Upgrade Modal ──────────────────────────────────────────────────────────

interface UpgradeModalProps {
  visible: boolean;
  onClose: () => void;
  onUpgrade: () => void;
  feature: string;
  requiredTier: SubscriptionTier;
  currentTier: SubscriptionTier;
  isTrialActive: boolean;
  message?: string;
}

function UpgradeModal({
  visible,
  onClose,
  onUpgrade,
  feature,
  requiredTier,
  currentTier,
  isTrialActive,
  message,
}: UpgradeModalProps) {
  const requiredInfo = TIER_INFO[requiredTier];
  const currentInfo = TIER_INFO[currentTier];

  // Feature descriptions for the modal
  const featureDescriptions: Record<string, string> = {
    body_scan: "AI-powered body composition analysis with progress tracking",
    progress_photos: "Track your transformation with side-by-side photo comparisons",
    form_checker: "Real-time AI form analysis to prevent injuries",
    ai_coaching: "Personalized AI coaching with contextual insights",
    social_feed: "Connect with friends and share your fitness journey",
    challenges: "Compete in fitness challenges with friends and the community",
    wearable_sync: "Sync data from Apple Watch, Fitbit, and other wearables",
    unlimited_body_scans: "Unlimited body scans with detailed analytics",
    unlimited_progress_photos: "Unlimited progress photo storage and comparisons",
    unlimited_meal_swaps: "Unlimited AI-powered meal swap suggestions",
    referral: "Invite friends and earn rewards",
    notification_preferences: "Customize your notification schedule and preferences",
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          {/* Close button */}
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [styles.modalClose, pressed && { opacity: 0.7 }]}
          >
            <MaterialIcons name="close" size={22} color={C.muted} />
          </Pressable>

          {/* Lock icon */}
          <View style={[styles.modalLockCircle, { borderColor: requiredInfo.color }]}>
            <MaterialIcons name="lock" size={32} color={requiredInfo.color} />
          </View>

          {/* Title */}
          <Text style={styles.modalTitle}>
            {requiredInfo.label} Feature
          </Text>

          {/* Description */}
          <Text style={styles.modalDescription}>
            {message || featureDescriptions[feature] || `This feature requires a ${requiredInfo.label} subscription.`}
          </Text>

          {/* Current vs Required tier */}
          <View style={styles.tierCompare}>
            <View style={styles.tierBox}>
              <Text style={[styles.tierLabel, { color: currentInfo.color }]}>Current</Text>
              <Text style={styles.tierName}>{currentInfo.label}</Text>
            </View>
            <MaterialIcons name="arrow-forward" size={20} color={C.muted} />
            <View style={styles.tierBox}>
              <Text style={[styles.tierLabel, { color: requiredInfo.color }]}>Required</Text>
              <Text style={[styles.tierName, { color: requiredInfo.color }]}>{requiredInfo.label}</Text>
            </View>
          </View>

          {/* Price */}
          <Text style={styles.modalPrice}>
            Starting at <Text style={{ color: requiredInfo.color, fontFamily: "SpaceMono_400Regular" }}>{requiredInfo.price}</Text>/year
          </Text>

          {/* CTA */}
          <Pressable
            onPress={onUpgrade}
            style={({ pressed }) => [
              styles.modalCTA,
              { backgroundColor: requiredInfo.color },
              pressed && { opacity: 0.9, transform: [{ scale: 0.97 }] },
            ]}
          >
            <Text style={styles.modalCTAText}>View Plans</Text>
          </Pressable>

          {/* Trial hint */}
          {!isTrialActive && (
            <Text style={styles.modalTrialHint}>
              Start a free 7-day trial to try all features
            </Text>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Gate container
  gateContainer: {
    position: "relative",
    overflow: "hidden",
  },
  teaserContent: {
    opacity: 0.3,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(10,14,20,0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  overlayFull: {
    position: "relative",
    minHeight: 200,
    borderRadius: 16,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
  },
  overlayContent: {
    alignItems: "center",
    gap: 12,
  },
  lockCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    backgroundColor: "rgba(10,14,20,0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  overlayTitle: {
    fontFamily: "BebasNeue_400Regular",
    fontSize: 22,
    color: C.fg,
    letterSpacing: 1,
  },
  overlayMessage: {
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
    color: C.muted,
    textAlign: "center",
    lineHeight: 20,
  },
  upgradeButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 4,
  },
  upgradeButtonText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 14,
    color: C.bg,
  },

  // Compact badge
  compactContainer: {
    position: "relative",
  },
  compactBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(10,14,20,0.85)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.3)",
  },
  compactBadgeText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 10,
    color: C.gold2,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalCard: {
    width: Math.min(SCREEN_W - 48, 360),
    backgroundColor: C.surface,
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.border,
  },
  modalClose: {
    position: "absolute",
    top: 12,
    right: 12,
    padding: 4,
  },
  modalLockCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    backgroundColor: "rgba(10,14,20,0.6)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  modalTitle: {
    fontFamily: "BebasNeue_400Regular",
    fontSize: 26,
    color: C.fg,
    letterSpacing: 1,
  },
  modalDescription: {
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
    color: C.muted,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 8,
  },
  tierCompare: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginVertical: 8,
  },
  tierBox: {
    alignItems: "center",
    gap: 2,
  },
  tierLabel: {
    fontFamily: "DMSans_400Regular",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tierName: {
    fontFamily: "DMSans_700Bold",
    fontSize: 16,
    color: C.fg,
  },
  modalPrice: {
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
    color: C.muted,
    marginVertical: 4,
  },
  modalCTA: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  modalCTAText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 16,
    color: C.bg,
  },
  modalTrialHint: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    color: C.muted,
    marginTop: 8,
    textAlign: "center",
  },
});
