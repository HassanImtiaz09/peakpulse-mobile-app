/**
 * Subscription Plans Screen (post-onboarding)
 * Shown once after the onboarding summary. Lets the user choose:
 *  - Free Trial (14 days of Pro access, no card required)
 *  - Basic plan
 *  - Pro plan
 * After selection, navigates to the main dashboard.
 */
import React, { useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Dimensions, ActivityIndicator, ImageBackground} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ScreenContainer } from "@/components/screen-container";
import { useSubscription } from "@/hooks/use-subscription";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

import { GOLDEN_PRIMARY, GOLDEN_OVERLAY_STYLE } from "@/constants/golden-backgrounds";
import { UI as SF } from "@/constants/ui-colors";
import { a11yButton, a11yHeader, a11yImage, a11yProgress, a11ySwitch, A11Y_LABELS } from "@/lib/accessibility";
import { ScreenErrorBoundary } from "@/components/error-boundary";
const { width: W } = Dimensions.get("window");

const FREE_FEATURES = [
  "AI Workout Plans (2 per month)",
  "AI Meal Plans (2 per month)",
  "Basic Body Scan (5 per month)",
  "Progress Photos (4 per month)",
  "Calorie Tracker",
];

const BASIC_FEATURES = [
  "Everything in Free",
  "Unlimited AI Meal Plans",
  "Unlimited AI Workout Plans",
  "Progress Photos (20/month)",
  "Gym Finder",
  "Meal Swap AI",
  "Basic Body Scan (unlimited)",
  "Wearable Sync",
  "Social Feed (read-only)",
];

const ADVANCED_FEATURES = [
  "Everything in Basic",
  "AI Form Checker (unlimited)",
  "AI Coach — personalised insights",
  "Unlimited Progress Photos",
  "Advanced Body Scan + BF% tracking",
  "Real-time Form Analysis",
  "Priority AI Processing",
  "Challenges & Leaderboards",
];

const PRICES = {
  basic: { monthly: 5.99, annual: 4.19 },
  pro:   { monthly: 11.99, annual: 8.49 },
};

export default function SubscriptionPlansScreen() {
  const router = useRouter();
  const { startTrial, setSubscription, hasUsedTrial } = useSubscription();
  const [selectedPlan, setSelectedPlan] = useState<"free" | "basic" | "pro">("pro");
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  const [loading, setLoading] = useState(false);

  async function handleContinue() {
    setLoading(true);
    try {
      if (selectedPlan === "free") {
        // Start 14-day trial if not already used, otherwise just proceed free
        if (!hasUsedTrial) {
          await startTrial(14);
        }
      } else {
        await setSubscription(selectedPlan, billing);
      }
      await AsyncStorage.setItem("@subscription_selected", "true");
      router.replace("/(tabs)" as any);
    } catch {
      router.replace("/(tabs)" as any);
    } finally {
      setLoading(false);
    }
  }

  function handleSkip() {
    AsyncStorage.setItem("@subscription_selected", "true");
    router.replace("/(tabs)" as any);
  }

  const price = selectedPlan !== "free"
    ? (billing === "monthly" ? PRICES[selectedPlan].monthly : PRICES[selectedPlan].annual)
    : 0;

  return (
    <ScreenErrorBoundary screenName="subscription-plans">
    <ImageBackground source={{ uri: GOLDEN_PRIMARY }} style={{ flex: 1 }} resizeMode="cover">
    <ScreenContainer containerClassName="bg-[#0A0500]" edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.badge}>⚡ UNLOCK YOUR POTENTIAL</Text>
          <Text style={styles.title}>Choose Your{"\n"}PeakPulse Plan</Text>
          <Text style={styles.subtitle}>Start with a 14-day free trial — no credit card required.</Text>
        </View>

        {/* Billing toggle */}
        <View style={styles.billingRow}>
          <TouchableOpacity
            style={[styles.billingBtn, billing === "monthly" && styles.billingBtnActive]}
            onPress={() => setBilling("monthly")}
          >
            <Text style={[styles.billingBtnText, billing === "monthly" && styles.billingBtnTextActive]}>Monthly</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.billingBtn, billing === "annual" && styles.billingBtnActive]}
            onPress={() => setBilling("annual")}
          >
            <Text style={[styles.billingBtnText, billing === "annual" && styles.billingBtnTextActive]}>Annual</Text>
            <View style={styles.saveBadge}><Text style={styles.saveBadgeText}>Save 30%</Text></View>
          </TouchableOpacity>
        </View>

        {/* Free Trial card */}
        {!hasUsedTrial && (
          <TouchableOpacity
            style={[styles.planCard, selectedPlan === "free" && styles.planCardSelected]}
            onPress={() => setSelectedPlan("free")}
            activeOpacity={0.85}
          >
            <View style={styles.planHeader}>
              <View>
                <Text style={styles.planName}>🔥🎁 Free Trial</Text>
                <Text style={styles.planPrice}>14 days free</Text>
                <Text style={styles.planPriceSub}>Full Pro access, no card needed</Text>
              </View>
              <View style={[styles.radio, selectedPlan === "free" && styles.radioSelected]}>
                {selectedPlan === "free" && <View style={styles.radioDot} />}
              </View>
            </View>
            <View style={styles.featureList}>
              {ADVANCED_FEATURES.slice(0, 4).map((f, i) => (
                <View key={i} style={styles.featureRow}>
                  <MaterialIcons name="check-circle" size={16} color={SF.gold} />
                  <Text style={styles.featureText}>{f}</Text>
                </View>
              ))}
              <Text style={styles.featureMore}>+ all Pro features</Text>
            </View>
            {selectedPlan === "free" && (
              <View style={styles.selectedBanner}>
                <Text style={styles.selectedBannerText}>✓ Selected — No card required</Text>
              </View>
            )}
          </TouchableOpacity>
        )}

        {/* Basic card */}
        <TouchableOpacity
          style={[styles.planCard, selectedPlan === "basic" && styles.planCardSelected]}
          onPress={() => setSelectedPlan("basic")}
          activeOpacity={0.85}
        >
          <View style={styles.planHeader}>
            <View>
              <Text style={styles.planName}>🔥💪 Basic</Text>
              <Text style={styles.planPrice}>
                £{billing === "monthly" ? PRICES.basic.monthly : PRICES.basic.annual}
                <Text style={styles.planPricePer}>/mo</Text>
              </Text>
              {billing === "annual" && (
                <Text style={styles.planPriceSub}>Billed £{(PRICES.basic.annual * 12).toFixed(2)}/year</Text>
              )}
            </View>
            <View style={[styles.radio, selectedPlan === "basic" && styles.radioSelected]}>
              {selectedPlan === "basic" && <View style={styles.radioDot} />}
            </View>
          </View>
          <View style={styles.featureList}>
            {BASIC_FEATURES.map((f, i) => (
              <View key={i} style={styles.featureRow}>
                <MaterialIcons name="check-circle" size={16} color={SF.teal} />
                <Text style={styles.featureText}>{f}</Text>
              </View>
            ))}
          </View>
          {selectedPlan === "basic" && (
            <View style={[styles.selectedBanner, { backgroundColor: "rgba(20,184,166,0.15)" }]}>
              <Text style={[styles.selectedBannerText, { color: SF.teal }]}>✓ Selected</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Advanced card */}
        <TouchableOpacity
          style={[styles.planCard, selectedPlan === "pro" && styles.planCardSelected, styles.planCardAdvanced]}
          onPress={() => setSelectedPlan("pro")}
          activeOpacity={0.85}
        >
          <View style={styles.popularBadge}>
            <Text style={styles.popularBadgeText}>⭐ MOST POPULAR</Text>
          </View>
          <View style={styles.planHeader}>
            <View>
              <Text style={[styles.planName, { color: SF.gold }]}>⚡ Advanced</Text>
              <Text style={[styles.planPrice, { color: SF.gold }]}>
                £{billing === "monthly" ? PRICES.pro.monthly : PRICES.pro.annual}
                <Text style={[styles.planPricePer, { color: SF.gold2 }]}>/mo</Text>
              </Text>
              {billing === "annual" && (
                <Text style={styles.planPriceSub}>Billed £{(PRICES.pro.annual * 12).toFixed(2)}/year</Text>
              )}
            </View>
            <View style={[styles.radio, selectedPlan === "pro" && styles.radioSelectedGold]}>
              {selectedPlan === "pro" && <View style={[styles.radioDot, { backgroundColor: SF.gold }]} />}
            </View>
          </View>
          <View style={styles.featureList}>
            {ADVANCED_FEATURES.map((f, i) => (
              <View key={i} style={styles.featureRow}>
                <MaterialIcons name="check-circle" size={16} color={SF.gold} />
                <Text style={[styles.featureText, { color: SF.fg }]}>{f}</Text>
              </View>
            ))}
          </View>
          {selectedPlan === "pro" && (
            <View style={styles.selectedBanner}>
              <Text style={styles.selectedBannerText}>✓ Selected — Best Value</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* CTA */}
        <View style={styles.ctaContainer}>
          <TouchableOpacity style={styles.ctaBtn} onPress={handleContinue} disabled={loading} activeOpacity={0.85}>
            {loading ? (
              <ActivityIndicator color={SF.bg} />
            ) : (
              <Text style={styles.ctaBtnText}>
                {selectedPlan === "free"
                  ? "Start 14-Day Free Trial →"
                  : `Subscribe to ${selectedPlan === "basic" ? "Basic" : "Advanced"} →`}
              </Text>
            )}
          </TouchableOpacity>
          {selectedPlan !== "free" && (
            <Text style={styles.ctaNote}>
              £{price.toFixed(2)}/mo · Cancel anytime · Secure payment
            </Text>
          )}
          <TouchableOpacity onPress={handleSkip} style={styles.skipBtn}>
            <Text style={styles.skipText}>Skip for now — continue with free plan</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenContainer>
    </ImageBackground>
    </ScreenErrorBoundary>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 56 },
  header: { paddingHorizontal: 24, paddingTop: 32, paddingBottom: 20, alignItems: "center" },
  badge: { color: SF.gold, fontFamily: "DMSans_700Bold", fontSize: 11, letterSpacing: 2, marginBottom: 12 },
  title: { color: SF.fg, fontFamily: "BebasNeue_400Regular", fontSize: 30, textAlign: "center", lineHeight: 38, marginBottom: 10 },
  subtitle: { color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 14, textAlign: "center", lineHeight: 20 },
  billingRow: { flexDirection: "row", marginHorizontal: 16, marginBottom: 16, backgroundColor: SF.surface, borderRadius: 14, padding: 4, borderWidth: 1, borderColor: SF.border },
  billingBtn: { flex: 1, paddingVertical: 10, borderRadius: 11, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 6 },
  billingBtnActive: { backgroundColor: SF.gold },
  billingBtnText: { color: SF.muted, fontFamily: "DMSans_600SemiBold", fontSize: 14 },
  billingBtnTextActive: { color: SF.bg },
  saveBadge: { backgroundColor: SF.emerald, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  saveBadgeText: { color: "#fff", fontFamily: "DMSans_700Bold", fontSize: 10 },
  planCard: { marginHorizontal: 16, marginBottom: 12, backgroundColor: SF.surface, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: SF.border },
  planCardSelected: { borderColor: SF.gold, borderWidth: 2 },
  planCardAdvanced: { borderColor: "rgba(245,158,11,0.35)" },
  planHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  planName: { color: SF.fg, fontFamily: "DMSans_700Bold", fontSize: 18, marginBottom: 4 },
  planPrice: { color: SF.fg, fontFamily: "BebasNeue_400Regular", fontSize: 28, lineHeight: 34 },
  planPricePer: { color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 14 },
  planPriceSub: { color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 12, marginTop: 2 },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: SF.muted, justifyContent: "center", alignItems: "center" },
  radioSelected: { borderColor: SF.teal },
  radioSelectedGold: { borderColor: SF.gold },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: SF.teal },
  featureList: { gap: 8 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  featureText: { color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 13, flex: 1 },
  featureMore: { color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 12, marginTop: 4, fontStyle: "italic" },
  selectedBanner: { marginTop: 14, backgroundColor: "rgba(245,158,11,0.12)", borderRadius: 10, paddingVertical: 8, alignItems: "center" },
  selectedBannerText: { color: SF.gold, fontFamily: "DMSans_700Bold", fontSize: 13 },
  popularBadge: { backgroundColor: SF.gold, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, alignSelf: "flex-start", marginBottom: 12 },
  popularBadgeText: { color: SF.bg, fontFamily: "DMSans_700Bold", fontSize: 11, letterSpacing: 1 },
  ctaContainer: { marginHorizontal: 16, marginTop: 8, alignItems: "center" },
  ctaBtn: { backgroundColor: SF.gold, borderRadius: 16, paddingVertical: 18, paddingHorizontal: 32, width: "100%", alignItems: "center", marginBottom: 10 },
  ctaBtnText: { color: SF.bg, fontFamily: "DMSans_700Bold", fontSize: 17 },
  ctaNote: { color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 12, marginBottom: 12 },
  skipBtn: { paddingVertical: 12 },
  skipText: { color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 13, textDecorationLine: "underline" },
});
