/**
 * Subscription Plans Screen (post-onboarding)
 * 
 * Updated to display the new 4-tier pricing structure:
 *   Free / Starter $4.99 / Pro $9.99 / Elite $14.99
 * 
 * Uses centralized pricing constants from @/constants/pricing.
 */

import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  ImageBackground,
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ScreenContainer } from "@/components/screen-container";
import { useSubscription } from "@/hooks/use-subscription";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { GOLDEN_PRIMARY } from "@/constants/golden-backgrounds";
import { UI as SF } from "@/constants/ui-colors";
import { ScreenErrorBoundary } from "@/components/error-boundary";
import {
  type SubscriptionTier,
  TIER_ORDER,
  TIER_PRICING,
  TIER_DISPLAY,
  TRIAL_CONFIG,
  getFormattedPrice,
} from "@/constants/pricing";

const { width: W } = Dimensions.get("window");

export default function SubscriptionPlansScreen() {
  const router = useRouter();
  const { startTrial, setSubscription, hasUsedTrial } = useSubscription();
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier>("pro");
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  const [loading, setLoading] = useState(false);

  async function handleContinue() {
    setLoading(true);
    try {
      if (selectedTier === "free") {
        if (!hasUsedTrial) {
          await startTrial(TRIAL_CONFIG.durationDays);
        }
      } else {
        await setSubscription(selectedTier, billing === "annual" ? "annual" : "monthly");
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

  const price = selectedTier !== "free"
    ? (billing === "monthly" ? TIER_PRICING[selectedTier].monthly : TIER_PRICING[selectedTier].yearly)
    : 0;

  return (
    <ScreenErrorBoundary screenName="subscription-plans">
      <ImageBackground
        source={{ uri: GOLDEN_PRIMARY }}
        style={{ flex: 1 }}
        resizeMode="cover"
      >
        <ScreenContainer containerClassName="bg-[#0A0500]" edges={["top", "left", "right"]}>
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.badge}>⚡ UNLOCK YOUR POTENTIAL</Text>
              <Text style={styles.title}>{"Choose Your\nPeakPulse Plan"}</Text>
              <Text style={styles.subtitle}>
                Start with a {TRIAL_CONFIG.durationDays}-day free trial — no credit card required.
              </Text>
            </View>

            {/* Billing toggle */}
            <View style={styles.billingRow}>
              <TouchableOpacity
                style={[styles.billingBtn, billing === "monthly" && styles.billingBtnActive]}
                onPress={() => setBilling("monthly")}
              >
                <Text style={[styles.billingBtnText, billing === "monthly" && styles.billingBtnTextActive]}>
                  Monthly
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.billingBtn, billing === "annual" && styles.billingBtnActive]}
                onPress={() => setBilling("annual")}
              >
                <Text style={[styles.billingBtnText, billing === "annual" && styles.billingBtnTextActive]}>
                  Annual
                </Text>
                <View style={styles.saveBadge}>
                  <Text style={styles.saveBadgeText}>Save 20%</Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Free Trial card */}
            {!hasUsedTrial && (
              <TouchableOpacity
                style={[styles.planCard, selectedTier === "free" && styles.planCardSelected]}
                onPress={() => setSelectedTier("free")}
                activeOpacity={0.85}
              >
                <View style={styles.planHeader}>
                  <View>
                    <Text style={styles.planName}>
                      {TIER_DISPLAY.free.icon} Free Trial
                    </Text>
                    <Text style={styles.planPrice}>{TRIAL_CONFIG.durationDays} days free</Text>
                    <Text style={styles.planPriceSub}>Full Pro access, no card needed</Text>
                  </View>
                  <View style={[styles.radio, selectedTier === "free" && styles.radioSelected]}>
                    {selectedTier === "free" && <View style={styles.radioDot} />}
                  </View>
                </View>
                <View style={styles.featureList}>
                  {TIER_DISPLAY.pro.features.slice(0, 4).map((f, i) => (
                    <View key={i} style={styles.featureRow}>
                      <MaterialIcons name="check-circle" size={16} color={SF.gold} />
                      <Text style={styles.featureText}>{f}</Text>
                    </View>
                  ))}
                  <Text style={styles.featureMore}>+ all Pro features for {TRIAL_CONFIG.durationDays} days</Text>
                </View>
                {selectedTier === "free" && (
                  <View style={styles.selectedBanner}>
                    <Text style={styles.selectedBannerText}>✓ Selected — No card required</Text>
                  </View>
                )}
              </TouchableOpacity>
            )}

            {/* Paid tier cards — Starter, Pro, Elite */}
            {(["starter", "pro", "elite"] as SubscriptionTier[]).map((tier) => {
              const display = TIER_DISPLAY[tier];
              const pricing = TIER_PRICING[tier];
              const isSelected = selectedTier === tier;
              const tierPrice = billing === "monthly" ? pricing.monthly : pricing.yearly;
              const isHighlighted = display.highlighted;

              return (
                <TouchableOpacity
                  key={tier}
                  style={[
                    styles.planCard,
                    isSelected && styles.planCardSelected,
                    isHighlighted && { borderColor: display.color + "60" },
                    isSelected && { borderColor: display.color },
                  ]}
                  onPress={() => setSelectedTier(tier)}
                  activeOpacity={0.85}
                >
                  {isHighlighted && (
                    <View style={[styles.popularBadge, { backgroundColor: display.color }]}>
                      <Text style={styles.popularBadgeText}>⭐ MOST POPULAR</Text>
                    </View>
                  )}
                  <View style={styles.planHeader}>
                    <View>
                      <Text style={[styles.planName, isHighlighted && { color: display.color }]}>
                        {display.icon} {display.name}
                      </Text>
                      <Text style={[styles.planPrice, isHighlighted && { color: display.color }]}>
                        ${tierPrice.toFixed(2)}
                        <Text style={[styles.planPricePer, isHighlighted && { color: display.color + "80" }]}>
                          /mo
                        </Text>
                      </Text>
                      {billing === "annual" && (
                        <Text style={styles.planPriceSub}>
                          Billed ${pricing.yearlyTotal.toFixed(2)}/year
                        </Text>
                      )}
                      <Text style={[styles.planTagline, { color: display.color }]}>{display.tagline}</Text>
                    </View>
                    <View
                      style={[
                        styles.radio,
                        isSelected && { borderColor: display.color },
                      ]}
                    >
                      {isSelected && (
                        <View style={[styles.radioDot, { backgroundColor: display.color }]} />
                      )}
                    </View>
                  </View>
                  <View style={styles.featureList}>
                    {display.features.map((f, i) => (
                      <View key={i} style={styles.featureRow}>
                        <MaterialIcons name="check-circle" size={16} color={display.color} />
                        <Text style={styles.featureText}>{f}</Text>
                      </View>
                    ))}
                  </View>
                  {isSelected && (
                    <View style={[styles.selectedBanner, { backgroundColor: display.color + "1A" }]}>
                      <Text style={[styles.selectedBannerText, { color: display.color }]}>
                        ✓ Selected{isHighlighted ? " — Best Value" : ""}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}

            {/* CTA */}
            <View style={styles.ctaContainer}>
              <TouchableOpacity
                style={styles.ctaBtn}
                onPress={handleContinue}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color={SF.bg} />
                ) : (
                  <Text style={styles.ctaBtnText}>
                    {selectedTier === "free"
                      ? `Start ${TRIAL_CONFIG.durationDays}-Day Free Trial →`
                      : `Subscribe to ${TIER_DISPLAY[selectedTier].name} →`}
                  </Text>
                )}
              </TouchableOpacity>
              {selectedTier !== "free" && (
                <Text style={styles.ctaNote}>
                  ${price.toFixed(2)}/mo · Cancel anytime · Secure payment
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
  planCardSelected: { borderWidth: 2 },
  planHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  planName: { color: SF.fg, fontFamily: "DMSans_700Bold", fontSize: 18, marginBottom: 4 },
  planPrice: { color: SF.fg, fontFamily: "BebasNeue_400Regular", fontSize: 28, lineHeight: 34 },
  planPricePer: { color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 14 },
  planPriceSub: { color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 12, marginTop: 2 },
  planTagline: { fontFamily: "DMSans_400Regular", fontSize: 12, marginTop: 4, fontStyle: "italic" },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: SF.muted, justifyContent: "center", alignItems: "center" },
  radioSelected: { borderColor: SF.teal },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: SF.teal },
  featureList: { gap: 8 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  featureText: { color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 13, flex: 1 },
  featureMore: { color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 12, marginTop: 4, fontStyle: "italic" },
  selectedBanner: { marginTop: 14, borderRadius: 10, paddingVertical: 8, alignItems: "center" },
  selectedBannerText: { fontFamily: "DMSans_700Bold", fontSize: 13 },
  popularBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, alignSelf: "flex-start", marginBottom: 12 },
  popularBadgeText: { color: SF.bg, fontFamily: "DMSans_700Bold", fontSize: 11, letterSpacing: 1 },
  ctaContainer: { marginHorizontal: 16, marginTop: 8, alignItems: "center" },
  ctaBtn: { backgroundColor: SF.gold, borderRadius: 16, paddingVertical: 18, paddingHorizontal: 32, width: "100%", alignItems: "center", marginBottom: 10 },
  ctaBtnText: { color: SF.bg, fontFamily: "DMSans_700Bold", fontSize: 17 },
  ctaNote: { color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 12, marginBottom: 12 },
  skipBtn: { paddingVertical: 12 },
  skipText: { color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 13, textDecorationLine: "underline" },
});

