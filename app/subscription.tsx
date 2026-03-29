import React, { useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, Linking, Alert,
  ActivityIndicator, ImageBackground, StyleSheet, Platform,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useRouter } from "expo-router";
import { useGuestAuth } from "@/lib/guest-auth";
import { useSubscription } from "@/hooks/use-subscription";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { a11yButton, a11yHeader, a11yImage, a11yProgress, a11ySwitch, A11Y_LABELS } from "@/lib/accessibility";

const HERO_BG = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/PZcnawJwIZkQHTEM.jpg";

const FREE_FEATURES = [
  { label: "Manual calorie & workout logging", included: true },
  { label: "Exercise library with demos", included: true },
  { label: "Basic calorie tracker", included: true },
  { label: "Workout timer", included: true },
  { label: "1 free AI-generated plan", included: true },
  { label: "3 calorie photo scans/day", included: true },
  { label: "Gym finder", included: true },
];

const BASIC_FEATURES = [
  { label: "Everything in Free", included: true, highlight: true },
  { label: "Unlimited AI workout plans", included: true },
  { label: "Unlimited AI meal plans", included: true },
  { label: "Unlimited calorie photo scans", included: true },
  { label: "Voice coaching & audio cues", included: true },
  { label: "Workout analytics & charts", included: true },
  { label: "Progress photos (5/month)", included: true },
  { label: "Basic body scan", included: true },
  { label: "Offline workout mode", included: true },
  { label: "Personal record tracking", included: true },
  { label: "Custom rest timer sounds", included: true },
];

const PRO_FEATURES = [
  { label: "Everything in Basic", included: true, highlight: true },
  { label: "Wearable device sync", included: true },
  { label: "AI coach chat", included: true },
  { label: "Exercise form checker", included: true },
  { label: "Social feed & challenges", included: true },
  { label: "Meal prep plans", included: true },
  { label: "Unlimited progress photos", included: true },
  { label: "Priority AI processing", included: true },
  { label: "Advanced AI body scan", included: true },
  { label: "Real-time form analysis", included: true },
];

export default function SubscriptionScreen() {
  const router = useRouter();
  const { isGuest, guestProfile } = useGuestAuth();
  const isAuthenticated = isGuest || !!guestProfile;
  const [selectedPlan, setSelectedPlan] = useState<"basic" | "pro">("pro");
  const [loading, setLoading] = useState(false);
  const [trialLoading, setTrialLoading] = useState(false);
  const [billingCycle, setBillingCycle] = useState<"annual" | "monthly">("annual");
  const subscription = useSubscription();

  const monthlyPrices = { basic: 5.99, pro: 11.99 };
  const annualPrices = { basic: 4.19, pro: 8.49 };
  const annualTotals = { basic: 50.28, pro: 101.88 };
  const annualSavings = { basic: 21.60, pro: 41.88 };
  const prices = billingCycle === "monthly" ? monthlyPrices : annualPrices;

  const handleSubscribe = async () => {
    if (!isAuthenticated) {
      Alert.alert("Sign In Required", "Please sign in or create an account to subscribe.", [
        { text: "Cancel", style: "cancel" },
        { text: "Sign In", onPress: () => router.push("/login") },
      ]);
      return;
    }
    setLoading(true);
    try {
      const stripeUrl = selectedPlan === "basic"
        ? (billingCycle === "monthly" ? process.env.EXPO_PUBLIC_STRIPE_BASIC_MONTHLY_URL : process.env.EXPO_PUBLIC_STRIPE_BASIC_ANNUAL_URL)
        : (billingCycle === "monthly" ? process.env.EXPO_PUBLIC_STRIPE_PRO_MONTHLY_URL : process.env.EXPO_PUBLIC_STRIPE_PRO_ANNUAL_URL);
      if (stripeUrl) {
        await Linking.openURL(stripeUrl);
      } else {
        Alert.alert("Stripe Not Configured", "Payment links are not yet configured. Please add your Stripe payment link URLs in the app settings.\n\nContact support to set up Stripe integration.", [{ text: "OK" }]);
      }
    } catch {
      Alert.alert("Error", "Could not open payment page. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleStartTrial = async () => {
    if (subscription.hasUsedTrial) return;
    setTrialLoading(true);
    try {
      await subscription.startTrial();
      Alert.alert("Trial Started!", "Your 7-day free trial of Pro is now active. Enjoy all premium features \u2014 no charge until you subscribe.", [{ text: "Let's Go!", onPress: () => router.back() }]);
    } catch {
      Alert.alert("Error", "Could not start trial. Please try again.");
    } finally {
      setTrialLoading(false);
    }
  };

  const features = selectedPlan === "basic" ? BASIC_FEATURES : PRO_FEATURES;

  return (
    <ScreenContainer edges={["top", "left", "right"]} containerClassName="bg-black">
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <ImageBackground source={{ uri: HERO_BG }} style={styles.hero}>
          <View style={styles.heroOverlay}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} {...a11yButton(A11Y_LABELS.backButton)}>
              <MaterialIcons name="arrow-back" size={20} color="#F1F5F9" />
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
            <View style={styles.heroContent}>
              <Text style={styles.heroLabel}>PEAKPULSE AI</Text>
              <Text style={styles.heroTitle}>Unlock Your{"\n"}Full Potential</Text>
              <Text style={styles.heroSub}>Join thousands transforming their bodies with AI-powered coaching</Text>
            </View>
          </View>
        </ImageBackground>

        <View style={styles.body}>
          {/* Trial Status Banner */}
          {subscription.isTrialActive && (
            <View style={styles.trialBanner}>
              <MaterialIcons name="hourglass-top" size={22} color="#F59E0B" />
              <View style={{ flex: 1 }}>
                <Text style={styles.trialBannerTitle}>Pro Trial Active</Text>
                <Text style={styles.trialBannerSub}>
                  {subscription.daysLeftInTrial} day{subscription.daysLeftInTrial !== 1 ? "s" : ""} remaining \u2014 subscribe before it ends
                </Text>
              </View>
            </View>
          )}
          {subscription.hasUsedTrial && !subscription.isTrialActive && !subscription.isPaid && (
            <View style={[styles.trialBanner, styles.trialBannerExpired]}>
              <MaterialIcons name="warning" size={22} color="#ef4444" />
              <View style={{ flex: 1 }}>
                <Text style={[styles.trialBannerTitle, { color: "#ef4444" }]}>Trial Expired</Text>
                <Text style={styles.trialBannerSub}>Subscribe now to restore Pro access</Text>
              </View>
            </View>
          )}

          {/* Billing Toggle */}
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[styles.toggleBtn, billingCycle === "monthly" && styles.toggleActive]}
              onPress={() => setBillingCycle("monthly")}
            >
              <Text style={[styles.toggleText, billingCycle === "monthly" && styles.toggleTextActive]}>Monthly</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, billingCycle === "annual" && styles.toggleActive]}
              onPress={() => setBillingCycle("annual")}
            >
              <Text style={[styles.toggleText, billingCycle === "annual" && styles.toggleTextActive]}>Annual</Text>
              <View style={styles.saveBadge}><Text style={styles.saveBadgeText}>Save 30%</Text></View>
            </TouchableOpacity>
          </View>

          {/* Plan Cards */}
          <View style={styles.plansRow}>
            {/* Basic Plan */}
            <TouchableOpacity
              style={[styles.planCard, selectedPlan === "basic" && styles.planCardSelected]}
              onPress={() => setSelectedPlan("basic")}
            >
              <Text style={styles.planName}>Basic</Text>
              <View style={styles.priceRow}>
                <Text style={styles.currency}>\u00a3</Text>
                <Text style={styles.price}>{prices.basic.toFixed(2)}</Text>
              </View>
              <Text style={styles.perMonth}>/ month</Text>
              {billingCycle === "annual" && (
                <>
                  <Text style={styles.annualNote}>\u00a3{annualTotals.basic.toFixed(2)}/yr \u00b7 save \u00a3{annualSavings.basic.toFixed(2)}/yr</Text>
                  <View style={styles.savingsChip}><Text style={styles.savingsChipText}>30% OFF</Text></View>
                </>
              )}
              <View style={[styles.selectIndicator, selectedPlan === "basic" && styles.selectIndicatorActive]}>
                <Text style={styles.selectIndicatorText}>{selectedPlan === "basic" ? "\u2713 Selected" : "Select"}</Text>
              </View>
            </TouchableOpacity>

            {/* Pro Plan */}
            <TouchableOpacity
              style={[styles.planCard, styles.planCardPro, selectedPlan === "pro" && styles.planCardSelected]}
              onPress={() => setSelectedPlan("pro")}
            >
              <View style={styles.popularBadge}>
                <Text style={styles.popularText}>MOST POPULAR</Text>
              </View>
              <Text style={[styles.planName, styles.planNamePro]}>Pro</Text>
              <View style={styles.priceRow}>
                <Text style={[styles.currency, styles.currencyPro]}>\u00a3</Text>
                <Text style={[styles.price, styles.pricePro]}>{prices.pro.toFixed(2)}</Text>
              </View>
              <Text style={[styles.perMonth, styles.perMonthPro]}>/ month</Text>
              {billingCycle === "annual" && (
                <>
                  <Text style={[styles.annualNote, { color: "#F59E0B" }]}>\u00a3{annualTotals.pro.toFixed(2)}/yr \u00b7 save \u00a3{annualSavings.pro.toFixed(2)}/yr</Text>
                  <View style={[styles.savingsChip, { backgroundColor: "#EA580C20", borderColor: "#EA580C40" }]}><Text style={[styles.savingsChipText, { color: "#EA580C" }]}>30% OFF</Text></View>
                </>
              )}
              <View style={[styles.selectIndicator, styles.selectIndicatorPro, selectedPlan === "pro" && styles.selectIndicatorActive]}>
                <Text style={styles.selectIndicatorText}>{selectedPlan === "pro" ? "\u2713 Selected" : "Select"}</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Free Tier Callout */}
          <View style={styles.freeCallout}>
            <MaterialIcons name="check-circle" size={18} color="#22C55E" />
            <Text style={styles.freeCalloutText}>Free tier includes manual logging, exercise library, basic calorie tracker, timer, and 1 free AI plan</Text>
          </View>

          {/* Feature Comparison */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {selectedPlan === "basic" ? "Basic" : "Pro"} Plan Includes
            </Text>
            {features.map((f, i) => (
              <View key={i} style={styles.featureRow}>
                <MaterialIcons
                  name={f.included ? "check-circle" : "cancel"}
                  size={18}
                  color={f.included ? "#F59E0B" : "#ef4444"}
                />
                <Text style={[styles.featureLabel, !f.included && styles.featureLabelExcluded, (f as any).highlight && { color: "#FBBF24", fontFamily: "DMSans_700Bold" }]}>
                  {f.label}
                </Text>
              </View>
            ))}
          </View>

          {/* Competitor Comparison */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>How We Compare</Text>
            <View style={styles.compareTable}>
              <View style={styles.compareHeader}>
                <Text style={[styles.compareCell, styles.compareHeaderText, { flex: 2 }]}>App</Text>
                <Text style={[styles.compareCell, styles.compareHeaderText]}>Price/mo</Text>
                <Text style={[styles.compareCell, styles.compareHeaderText]}>AI Plans</Text>
                <Text style={[styles.compareCell, styles.compareHeaderText]}>Form AI</Text>
              </View>
              {[
                { name: "PeakPulse", price: "\u00a35.99", aiPlans: "\u2713", formAI: "\u2713", highlight: true },
                { name: "MyFitnessPal", price: "\u00a317.99", aiPlans: "\u2717", formAI: "\u2717", highlight: false },
                { name: "Caliber", price: "\u00a329.99", aiPlans: "~", formAI: "\u2717", highlight: false },
                { name: "Future", price: "\u00a3149", aiPlans: "\u2713", formAI: "\u2717", highlight: false },
                { name: "Freeletics", price: "\u00a38.99", aiPlans: "~", formAI: "\u2717", highlight: false },
              ].map((row, i) => (
                <View key={i} style={[styles.compareRow, row.highlight && styles.compareRowHighlight]}>
                  <Text style={[styles.compareCell, { flex: 2 }, row.highlight && styles.compareHighlightText]}>{row.name}</Text>
                  <Text style={[styles.compareCell, row.highlight && styles.compareHighlightText]}>{row.price}</Text>
                  <Text style={[styles.compareCell, row.highlight && styles.compareHighlightText]}>{row.aiPlans}</Text>
                  <Text style={[styles.compareCell, row.highlight && styles.compareHighlightText]}>{row.formAI}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.compareNote}>PeakPulse offers more AI features than competitors at a fraction of the price.</Text>
          </View>

          {/* Free Trial CTA */}
          {selectedPlan === "pro" && !subscription.hasUsedTrial && !subscription.isPaid && (
            <TouchableOpacity
              style={[styles.trialBtn, trialLoading && { opacity: 0.7 }]}
              onPress={handleStartTrial}
              disabled={trialLoading}
            >
              {trialLoading ? (
                <ActivityIndicator color="#0A0E14" />
              ) : (
                <>
                  <Text style={styles.trialBtnText}>Start 7-Day Free Trial</Text>
                  <Text style={styles.trialBtnSub}>No credit card required \u00b7 Full Pro access</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {/* CTA */}
          <TouchableOpacity
            style={[styles.ctaBtn, loading && { opacity: 0.7 }]}
            onPress={handleSubscribe} {...a11yButton("Subscribe")}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#F1F5F9" />
            ) : (
              <>
                <Text style={styles.ctaBtnText}>
                  Start {selectedPlan === "basic" ? "Basic" : "Pro"} \u2014 \u00a3{prices[selectedPlan].toFixed(2)}/mo
                </Text>
                <Text style={styles.ctaSubText}>Cancel anytime \u00b7 Secure payment via Stripe</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Stripe Setup Note */}
          <View style={styles.stripeNote}>
            <Text style={styles.stripeNoteTitle}>Stripe Integration</Text>
            <Text style={styles.stripeNoteText}>
              To collect payments, add your Stripe Payment Link URLs in the app settings (Secrets panel). Set:{"\n"}
              \u2022 EXPO_PUBLIC_STRIPE_BASIC_MONTHLY_URL{"\n"}
              \u2022 EXPO_PUBLIC_STRIPE_PRO_MONTHLY_URL{"\n"}
              \u2022 EXPO_PUBLIC_STRIPE_BASIC_ANNUAL_URL{"\n"}
              \u2022 EXPO_PUBLIC_STRIPE_PRO_ANNUAL_URL{"\n\n"}
              Create payment links at stripe.com/payment-links and all revenue goes directly to your Stripe account.
            </Text>
          </View>

          <Text style={styles.legalText}>
            By subscribing you agree to our Terms of Service. Subscriptions auto-renew unless cancelled at least 24 hours before the renewal date. Manage subscriptions in your account settings.
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  hero: { height: 280 },
  heroOverlay: { flex: 1, backgroundColor: "rgba(10,5,0,0.65)", padding: 20, justifyContent: "space-between" },
  backBtn: { alignSelf: "flex-start", paddingVertical: 8, paddingHorizontal: 4, flexDirection: "row", alignItems: "center", gap: 6 },
  backText: { color: "#F1F5F9", fontSize: 16, fontFamily: "DMSans_500Medium" },
  heroContent: { paddingBottom: 20 },
  heroLabel: { color: "#F59E0B", fontSize: 12, fontFamily: "DMSans_700Bold", letterSpacing: 2, marginBottom: 8 },
  heroTitle: { color: "#F1F5F9", fontSize: 32, fontFamily: "BebasNeue_400Regular", lineHeight: 40, marginBottom: 8 },
  heroSub: { color: "rgba(255,255,255,0.8)", fontSize: 15, lineHeight: 22 },
  body: { backgroundColor: "#0A0E14", padding: 20, paddingBottom: 60 },
  toggleRow: { flexDirection: "row", backgroundColor: "#141A22", borderRadius: 12, padding: 4, marginBottom: 24 },
  toggleBtn: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 10, flexDirection: "row", justifyContent: "center", gap: 6 },
  toggleActive: { backgroundColor: "#EA580C" },
  toggleText: { color: "#B45309", fontSize: 14, fontFamily: "DMSans_600SemiBold" },
  toggleTextActive: { color: "#F1F5F9" },
  saveBadge: { backgroundColor: "#F59E0B", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  saveBadgeText: { color: "#F1F5F9", fontSize: 10, fontFamily: "DMSans_700Bold" },
  plansRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
  planCard: { flex: 1, backgroundColor: "#141A22", borderRadius: 16, padding: 16, borderWidth: 2, borderColor: "#2A1200", alignItems: "center" },
  planCardPro: { backgroundColor: "#1F0D00" },
  planCardSelected: { borderColor: "#EA580C" },
  popularBadge: { backgroundColor: "#EA580C", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 8 },
  popularText: { color: "#F1F5F9", fontSize: 9, fontFamily: "BebasNeue_400Regular", letterSpacing: 1 },
  planName: { color: "#B45309", fontSize: 14, fontFamily: "DMSans_700Bold", marginBottom: 8 },
  planNamePro: { color: "#FBBF24" },
  priceRow: { flexDirection: "row", alignItems: "flex-start" },
  currency: { color: "#F1F5F9", fontSize: 18, fontFamily: "DMSans_700Bold", marginTop: 6 },
  currencyPro: { color: "#F59E0B" },
  price: { color: "#F1F5F9", fontSize: 36, fontFamily: "BebasNeue_400Regular", lineHeight: 44 },
  pricePro: { color: "#F59E0B" },
  perMonth: { color: "#B45309", fontSize: 12, marginBottom: 4 },
  perMonthPro: { color: "#EA580C" },
  annualNote: { color: "#B45309", fontSize: 10, marginBottom: 4 },
  savingsChip: { backgroundColor: "#22C55E20", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: "#22C55E40", marginBottom: 8 },
  savingsChipText: { color: "#22C55E", fontFamily: "DMSans_700Bold", fontSize: 9, letterSpacing: 0.5 },
  selectIndicator: { marginTop: 8, backgroundColor: "#2A1200", borderRadius: 8, paddingVertical: 6, paddingHorizontal: 12 },
  selectIndicatorPro: { backgroundColor: "#3D1A00" },
  selectIndicatorActive: { backgroundColor: "#EA580C" },
  selectIndicatorText: { color: "#F1F5F9", fontSize: 12, fontFamily: "DMSans_600SemiBold" },
  freeCallout: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#0f1f0f", borderRadius: 12, padding: 14, marginBottom: 24, borderWidth: 1, borderColor: "#22C55E30" },
  freeCalloutText: { color: "#86efac", fontFamily: "DMSans_400Regular", fontSize: 12, flex: 1, lineHeight: 18 },
  section: { marginBottom: 28 },
  sectionTitle: { color: "#F1F5F9", fontSize: 18, fontFamily: "DMSans_700Bold", marginBottom: 14 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#141A22" },
  featureLabel: { color: "#e5e7eb", fontSize: 14, flex: 1 },
  featureLabelExcluded: { color: "#B45309" },
  compareTable: { borderRadius: 12, overflow: "hidden", borderWidth: 1, borderColor: "#2A1200" },
  compareHeader: { flexDirection: "row", backgroundColor: "#141A22", paddingVertical: 10, paddingHorizontal: 12 },
  compareHeaderText: { color: "#B45309", fontSize: 12, fontFamily: "DMSans_700Bold" },
  compareRow: { flexDirection: "row", paddingVertical: 10, paddingHorizontal: 12, borderTopWidth: 1, borderTopColor: "#141A22" },
  compareRowHighlight: { backgroundColor: "#1F0D00" },
  compareCell: { flex: 1, color: "#e5e7eb", fontSize: 13, textAlign: "center" },
  compareHighlightText: { color: "#F59E0B", fontFamily: "DMSans_700Bold" },
  compareNote: { color: "#B45309", fontSize: 12, marginTop: 10, textAlign: "center", lineHeight: 18 },
  ctaBtn: { backgroundColor: "#EA580C", borderRadius: 16, paddingVertical: 18, alignItems: "center", marginBottom: 20 },
  ctaBtnText: { color: "#F1F5F9", fontSize: 17, fontFamily: "BebasNeue_400Regular" },
  ctaSubText: { color: "rgba(255,255,255,0.7)", fontSize: 12, marginTop: 4 },
  stripeNote: { backgroundColor: "#0f172a", borderRadius: 12, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: "#1e3a5f" },
  stripeNoteTitle: { color: "#60a5fa", fontSize: 14, fontFamily: "DMSans_700Bold", marginBottom: 8 },
  stripeNoteText: { color: "#B45309", fontSize: 12, lineHeight: 20 },
  legalText: { color: "#4b5563", fontSize: 11, textAlign: "center", lineHeight: 18 },
  trialBanner: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#1c1000", borderRadius: 14, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: "#F59E0B40" },
  trialBannerExpired: { backgroundColor: "#1a0000", borderColor: "#ef444440" },
  trialBannerTitle: { color: "#F59E0B", fontFamily: "DMSans_700Bold", fontSize: 14, marginBottom: 2 },
  trialBannerSub: { color: "#B45309", fontFamily: "DMSans_400Regular", fontSize: 12, lineHeight: 17 },
  trialBtn: { backgroundColor: "#F59E0B", borderRadius: 16, paddingVertical: 18, alignItems: "center", marginBottom: 12 },
  trialBtnText: { color: "#0A0E14", fontSize: 17, fontFamily: "BebasNeue_400Regular" },
  trialBtnSub: { color: "rgba(10,5,0,0.65)", fontSize: 12, marginTop: 3 },
});
