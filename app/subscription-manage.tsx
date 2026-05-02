/**
 * Subscription Management Screen
 *
 * Shows current plan details, billing period, renewal date, and tier benefits.
 * Provides access to Stripe customer portal for payment method management,
 * plan changes, and invoice history. Includes cancel/reactivate actions with
 * confirmation dialogs.
 */
import React, { useState, useCallback, useEffect } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, Platform, RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { ScreenContainer } from "@/components/screen-container";
import { useSubscription } from "@/hooks/use-subscription";
import { useAuth } from "@/hooks/use-auth";
import { UI } from "@/constants/ui-colors";
import { ScreenErrorBoundary } from "@/components/error-boundary";

// ── Colors ──────────────────────────────────────────────────────
const BG = UI.bg;
const SURFACE = "#111827";
const SURFACE2 = UI.inactive;
const FG = UI.fg;
const MUTED = "#64748B";
const GOLD = UI.gold;
const ICE = "#06B6D4";
const GREEN = "#22C55E";
const RED = "#EF4444";
const BORDER = "rgba(30,41,59,0.6)";

// ── Plan benefit lists ──────────────────────────────────────────
const FREE_BENEFITS = [
  { icon: "smart-toy", label: "AI Workout Plans (2/month)" },
  { icon: "restaurant-menu", label: "AI Meal Plans (2/month)" },
  { icon: "fitness-center", label: "Basic Exercise Library" },
  { icon: "trending-up", label: "Basic Progress Tracking" },
];

const BASIC_BENEFITS = [
  { icon: "smart-toy", label: "AI Workout Plans (10/month)" },
  { icon: "restaurant-menu", label: "AI Meal Plans (10/month)" },
  { icon: "body", label: "Body Scan (20/month)" },
  { icon: "notifications", label: "Smart Notifications" },
  { icon: "watch", label: "Wearable Sync" },
  { icon: "card-giftcard", label: "Referral Rewards" },
];

const PRO_BENEFITS = [
  { icon: "all-inclusive", label: "Unlimited AI Plans" },
  { icon: "center-focus-strong", label: "AI Form Checker" },
  { icon: "record-voice-over", label: "Voice Coach (ElevenLabs)" },
  { icon: "body", label: "Unlimited Body Scans" },
  { icon: "analytics", label: "Advanced Analytics" },
  { icon: "group", label: "Social Feed & Challenges" },
  { icon: "bolt", label: "7-Day Challenges" },
  { icon: "auto-awesome", label: "Priority AI Processing" },
];

// ── Pricing info ────────────────────────────────────────────────
const PRICING = {
  basic: { monthly: "£5.99", annual: "£47.99", annualSaving: "Save 33%" },
  pro: { monthly: "£11.99", annual: "£95.99", annualSaving: "Save 33%" },
};

function SubscriptionManageContent() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const subscription = useSubscription();
  const {
    tier, billingCycle, expiresAt, isPaid, hasProAccess,
    stripeManaged, stripeStatus, cancelAtPeriodEnd,
    isTrialActive, daysLeftInTrial,
    openPortal, cancelStripeSubscription, reactivateStripeSubscription,
    refresh,
  } = subscription;

  const [loading, setLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // ── Derived values ──────────────────────────────────────────
  const tierLabel = tier === "pro" ? "Pro" : tier === "basic" ? "Basic" : "Free";
  const tierColor = tier === "pro" ? GOLD : tier === "basic" ? ICE : MUTED;
  const tierIcon = tier === "pro" ? "workspace-premium" : tier === "basic" ? "star" : "person";
  const benefits = tier === "pro" ? PRO_BENEFITS : tier === "basic" ? BASIC_BENEFITS : FREE_BENEFITS;
  const billingLabel = billingCycle === "annual" ? "Annual" : billingCycle === "monthly" ? "Monthly" : null;
  const expiryDate = expiresAt
    ? new Date(expiresAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    : null;
  const pricing = tier === "pro" ? PRICING.pro : tier === "basic" ? PRICING.basic : null;
  const currentPrice = pricing
    ? billingCycle === "annual" ? pricing.annual + "/year" : pricing.monthly + "/month"
    : "Free";

  // Status label and color
  let statusLabel = "Free";
  let statusColor = MUTED;
  if (isTrialActive) {
    statusLabel = `Trial (${daysLeftInTrial}d left)`;
    statusColor = ICE;
  } else if (cancelAtPeriodEnd) {
    statusLabel = "Canceling";
    statusColor = RED;
  } else if (stripeStatus === "past_due") {
    statusLabel = "Past Due";
    statusColor = RED;
  } else if (isPaid) {
    statusLabel = "Active";
    statusColor = GREEN;
  }

  // ── Handlers ────────────────────────────────────────────────
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const handleOpenPortal = useCallback(async () => {
    if (!isAuthenticated || !stripeManaged) return;
    setPortalLoading(true);
    try {
      await openPortal();
    } catch (e: any) {
      Alert.alert("Error", e.message || "Could not open billing portal.");
    } finally {
      setPortalLoading(false);
    }
  }, [isAuthenticated, stripeManaged, openPortal]);

  const handleCancel = useCallback(() => {
    Alert.alert(
      "Cancel Subscription",
      `Your ${tierLabel} plan will remain active until ${expiryDate || "the end of your billing period"}. After that, you'll be downgraded to the Free plan.\n\nAre you sure you want to cancel?`,
      [
        { text: "Keep Plan", style: "cancel" },
        {
          text: "Cancel Plan",
          style: "destructive",
          onPress: async () => {
            setLoading(true);
            try {
              await cancelStripeSubscription();
              await refresh();
              Alert.alert("Subscription Canceled", "Your plan will remain active until the end of the current billing period.");
            } catch (e: any) {
              Alert.alert("Error", e.message || "Could not cancel subscription.");
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  }, [tierLabel, expiryDate, cancelStripeSubscription, refresh]);

  const handleReactivate = useCallback(async () => {
    setLoading(true);
    try {
      await reactivateStripeSubscription();
      await refresh();
      Alert.alert("Subscription Reactivated", `Your ${tierLabel} plan has been reactivated and will continue to renew.`);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Could not reactivate subscription.");
    } finally {
      setLoading(false);
    }
  }, [tierLabel, reactivateStripeSubscription, refresh]);

  const handleUpgrade = useCallback(() => {
    router.push("/subscription-plans" as any);
  }, [router]);

  const handleChangePlan = useCallback(() => {
    if (stripeManaged) {
      handleOpenPortal();
    } else {
      router.push("/subscription-plans" as any);
    }
  }, [stripeManaged, handleOpenPortal, router]);

  return (
    <ScreenContainer edges={["top", "left", "right"]} containerClassName="bg-background">
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GOLD} />
        }
      >
        {/* ── Header ──────────────────────────────────────────── */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <MaterialIcons name="arrow-back" size={24} color={FG} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Manage Subscription</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* ── Plan Card ───────────────────────────────────────── */}
        <View style={[styles.planCard, { borderColor: tier === "free" ? BORDER : `${tierColor}33` }]}>
          {/* Tier badge */}
          <View style={styles.planCardHeader}>
            <View style={styles.tierBadgeRow}>
              <View style={[styles.tierIconBox, { backgroundColor: `${tierColor}15`, borderColor: `${tierColor}30` }]}>
                <MaterialIcons name={tierIcon as any} size={24} color={tierColor} />
              </View>
              <View>
                <Text style={styles.tierName}>{tierLabel} Plan</Text>
                {billingLabel && <Text style={styles.billingLabel}>{billingLabel} billing</Text>}
              </View>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: `${statusColor}15`, borderColor: `${statusColor}30` }]}>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
            </View>
          </View>

          {/* Price */}
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Current Price</Text>
            <Text style={[styles.priceValue, { color: tierColor }]}>{currentPrice}</Text>
          </View>

          {/* Info grid */}
          <View style={styles.infoGrid}>
            <View style={styles.infoCell}>
              <Text style={styles.infoCellLabel}>Status</Text>
              <Text style={[styles.infoCellValue, { color: statusColor }]}>{statusLabel}</Text>
            </View>
            {expiryDate && (
              <View style={styles.infoCell}>
                <Text style={styles.infoCellLabel}>{cancelAtPeriodEnd ? "Expires" : "Renews"}</Text>
                <Text style={styles.infoCellValue}>{expiryDate}</Text>
              </View>
            )}
            <View style={styles.infoCell}>
              <Text style={styles.infoCellLabel}>Features</Text>
              <Text style={[styles.infoCellValue, { color: tierColor }]}>
                {tier === "pro" ? "All" : tier === "basic" ? "Core" : isTrialActive ? "All (Trial)" : "Limited"}
              </Text>
            </View>
          </View>

          {/* Cancellation warning */}
          {cancelAtPeriodEnd && (
            <View style={[styles.warningBanner, { backgroundColor: `${RED}10`, borderColor: `${RED}25` }]}>
              <MaterialIcons name="warning" size={16} color={RED} />
              <Text style={[styles.warningText, { color: RED }]}>
                Your plan will be downgraded to Free on {expiryDate}.
              </Text>
            </View>
          )}

          {/* Past due warning */}
          {stripeStatus === "past_due" && !cancelAtPeriodEnd && (
            <View style={[styles.warningBanner, { backgroundColor: `${RED}10`, borderColor: `${RED}25` }]}>
              <MaterialIcons name="error-outline" size={16} color={RED} />
              <Text style={[styles.warningText, { color: RED }]}>
                Payment failed. Please update your payment method to keep your plan active.
              </Text>
            </View>
          )}

          {/* Trial info */}
          {isTrialActive && (
            <View style={[styles.warningBanner, { backgroundColor: `${ICE}10`, borderColor: `${ICE}25` }]}>
              <MaterialIcons name="timer" size={16} color={ICE} />
              <Text style={[styles.warningText, { color: ICE }]}>
                Free trial — {daysLeftInTrial} day{daysLeftInTrial !== 1 ? "s" : ""} remaining. Upgrade to keep Pro access.
              </Text>
            </View>
          )}
        </View>

        {/* ── Actions ─────────────────────────────────────────── */}
        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>Actions</Text>

          {/* Upgrade / Change Plan */}
          {tier === "free" ? (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: `${GOLD}15`, borderColor: `${GOLD}30` }]}
              onPress={handleUpgrade}
            >
              <MaterialIcons name="upgrade" size={20} color={GOLD} />
              <View style={styles.actionTextCol}>
                <Text style={[styles.actionLabel, { color: GOLD }]}>Upgrade Plan</Text>
                <Text style={styles.actionDesc}>Choose Basic or Pro to unlock more features</Text>
              </View>
              <MaterialIcons name="chevron-right" size={20} color={MUTED} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.actionButton, { borderColor: BORDER }]}
              onPress={handleChangePlan}
            >
              <MaterialIcons name="swap-horiz" size={20} color={ICE} />
              <View style={styles.actionTextCol}>
                <Text style={styles.actionLabel}>Change Plan</Text>
                <Text style={styles.actionDesc}>
                  {stripeManaged ? "Switch plans or billing cycle via Stripe" : "View available plans"}
                </Text>
              </View>
              <MaterialIcons name="chevron-right" size={20} color={MUTED} />
            </TouchableOpacity>
          )}

          {/* Stripe Portal — Payment Methods & Invoices */}
          {stripeManaged && (
            <TouchableOpacity
              style={[styles.actionButton, { borderColor: BORDER }]}
              onPress={handleOpenPortal}
              disabled={portalLoading}
            >
              <MaterialIcons name="credit-card" size={20} color={FG} />
              <View style={styles.actionTextCol}>
                <Text style={styles.actionLabel}>Billing & Payment</Text>
                <Text style={styles.actionDesc}>Update payment method, view invoices</Text>
              </View>
              {portalLoading ? (
                <ActivityIndicator size="small" color={GOLD} />
              ) : (
                <MaterialIcons name="open-in-new" size={18} color={MUTED} />
              )}
            </TouchableOpacity>
          )}

          {/* Cancel / Reactivate */}
          {isPaid && stripeManaged && !cancelAtPeriodEnd && (
            <TouchableOpacity
              style={[styles.actionButton, { borderColor: `${RED}25` }]}
              onPress={handleCancel}
              disabled={loading}
            >
              <MaterialIcons name="cancel" size={20} color={RED} />
              <View style={styles.actionTextCol}>
                <Text style={[styles.actionLabel, { color: RED }]}>Cancel Subscription</Text>
                <Text style={styles.actionDesc}>Access continues until end of billing period</Text>
              </View>
              {loading && <ActivityIndicator size="small" color={RED} />}
            </TouchableOpacity>
          )}

          {cancelAtPeriodEnd && stripeManaged && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: `${GREEN}10`, borderColor: `${GREEN}30` }]}
              onPress={handleReactivate}
              disabled={loading}
            >
              <MaterialIcons name="replay" size={20} color={GREEN} />
              <View style={styles.actionTextCol}>
                <Text style={[styles.actionLabel, { color: GREEN }]}>Reactivate Subscription</Text>
                <Text style={styles.actionDesc}>Resume your {tierLabel} plan before it expires</Text>
              </View>
              {loading && <ActivityIndicator size="small" color={GREEN} />}
            </TouchableOpacity>
          )}
        </View>

        {/* ── Plan Benefits ───────────────────────────────────── */}
        <View style={styles.benefitsSection}>
          <Text style={styles.sectionTitle}>Your Plan Includes</Text>
          <View style={styles.benefitsList}>
            {benefits.map((b, i) => (
              <View key={i} style={styles.benefitRow}>
                <View style={[styles.benefitIconBox, { backgroundColor: `${tierColor}12` }]}>
                  <MaterialIcons name={b.icon as any} size={16} color={tierColor} />
                </View>
                <Text style={styles.benefitLabel}>{b.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Compare Plans Link ──────────────────────────────── */}
        {tier !== "pro" && (
          <TouchableOpacity
            style={styles.comparePlansButton}
            onPress={() => router.push("/subscription-plans" as any)}
          >
            <MaterialIcons name="compare-arrows" size={18} color={GOLD} />
            <Text style={styles.comparePlansText}>Compare All Plans</Text>
          </TouchableOpacity>
        )}

        {/* ── Help ────────────────────────────────────────────── */}
        <View style={styles.helpSection}>
          <Text style={styles.helpText}>
            Need help with your subscription? Contact support at support@fytnova.app
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </ScreenContainer>
  );
}

export default function SubscriptionManageScreen() {
  return (
    <ScreenErrorBoundary screenName="subscription-manage">
      <SubscriptionManageContent />
    </ScreenErrorBoundary>
  );
}

// ── Styles ──────────────────────────────────────────────────────
const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 20 },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    marginBottom: 16,
  },
  backButton: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: SURFACE, alignItems: "center", justifyContent: "center",
  },
  headerTitle: {
    color: FG, fontSize: 18, fontWeight: "700",
  },

  // Plan Card
  planCard: {
    backgroundColor: SURFACE, borderRadius: 16, padding: 16,
    borderWidth: 1, marginBottom: 20,
  },
  planCardHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    marginBottom: 16,
  },
  tierBadgeRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
  },
  tierIconBox: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: "center", justifyContent: "center", borderWidth: 1,
  },
  tierName: {
    color: FG, fontSize: 18, fontWeight: "700",
  },
  billingLabel: {
    color: MUTED, fontSize: 12, marginTop: 1,
  },
  statusBadge: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1,
  },
  statusDot: {
    width: 6, height: 6, borderRadius: 3,
  },
  statusText: {
    fontSize: 11, fontWeight: "600",
  },

  // Price
  priceRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: "rgba(255,255,255,0.03)", borderRadius: 12,
    padding: 14, marginBottom: 12,
  },
  priceLabel: {
    color: MUTED, fontSize: 13,
  },
  priceValue: {
    fontSize: 20, fontWeight: "700",
  },

  // Info grid
  infoGrid: {
    flexDirection: "row", gap: 10,
  },
  infoCell: {
    flex: 1, backgroundColor: "rgba(255,255,255,0.03)", borderRadius: 10,
    padding: 10, alignItems: "center",
  },
  infoCellLabel: {
    color: MUTED, fontSize: 10, marginBottom: 3,
  },
  infoCellValue: {
    color: FG, fontSize: 12, fontWeight: "600",
  },

  // Warning banner
  warningBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    borderRadius: 10, padding: 10, marginTop: 12, borderWidth: 1,
  },
  warningText: {
    fontSize: 12, fontWeight: "500", flex: 1, lineHeight: 17,
  },

  // Actions
  actionsSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    color: FG, fontSize: 16, fontWeight: "700", marginBottom: 12,
  },
  actionButton: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: SURFACE, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: BORDER, marginBottom: 10,
  },
  actionTextCol: {
    flex: 1,
  },
  actionLabel: {
    color: FG, fontSize: 14, fontWeight: "600",
  },
  actionDesc: {
    color: MUTED, fontSize: 11, marginTop: 2, lineHeight: 15,
  },

  // Benefits
  benefitsSection: {
    marginBottom: 20,
  },
  benefitsList: {
    backgroundColor: SURFACE, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: BORDER,
  },
  benefitRow: {
    flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8,
  },
  benefitIconBox: {
    width: 30, height: 30, borderRadius: 8, alignItems: "center", justifyContent: "center",
  },
  benefitLabel: {
    color: FG, fontSize: 13, fontWeight: "500", flex: 1,
  },

  // Compare plans
  comparePlansButton: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: `${GOLD}10`, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: `${GOLD}25`, marginBottom: 20,
  },
  comparePlansText: {
    color: GOLD, fontSize: 14, fontWeight: "600",
  },

  // Help
  helpSection: {
    alignItems: "center", paddingVertical: 12,
  },
  helpText: {
    color: MUTED, fontSize: 11, textAlign: "center", lineHeight: 16,
  },
});
