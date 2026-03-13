import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
  ActivityIndicator,
  ImageBackground,
  StyleSheet,
  Platform,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useRouter } from "expo-router";
import { trpc } from "@/lib/trpc";
import { useGuestAuth } from "@/lib/guest-auth";

const HERO_BG = "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80";

const BASIC_FEATURES = [
  { label: "AI Meal Plans", included: true },
  { label: "AI Workout Plans", included: true },
  { label: "Calorie Estimator (Photo)", included: true },
  { label: "Progress Photos (5/month)", included: true },
  { label: "Gym Finder", included: true },
  { label: "Basic Body Scan", included: true },
  { label: "Exercise Form Checker", included: false },
  { label: "Social Feed & Challenges", included: false },
  { label: "Unlimited Progress Photos", included: false },
  { label: "Priority AI Processing", included: false },
  { label: "Personalised AI Coaching", included: false },
];

const ADVANCED_FEATURES = [
  { label: "Everything in Basic", included: true },
  { label: "Exercise Form Checker", included: true },
  { label: "Social Feed & Challenges", included: true },
  { label: "Unlimited Progress Photos", included: true },
  { label: "Advanced AI Body Scan", included: true },
  { label: "Real-time Form Analysis", included: true },
  { label: "Priority AI Processing", included: true },
  { label: "Wearable Sync", included: true },
  { label: "Personalised AI Coaching", included: true },
  { label: "Meal Prep Plans", included: true },
];

export default function SubscriptionScreen() {
  const router = useRouter();
  const { isGuest, guestProfile } = useGuestAuth();
  const isAuthenticated = isGuest || !!guestProfile;
  const [selectedPlan, setSelectedPlan] = useState<"basic" | "advanced">("advanced");
  const [loading, setLoading] = useState(false);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");

  const monthlyPrices = { basic: 4.99, advanced: 9.99 };
  const annualPrices = { basic: 3.99, advanced: 7.99 };
  const prices = billingCycle === "monthly" ? monthlyPrices : annualPrices;

  const handleSubscribe = async () => {
    if (!isAuthenticated) {
      Alert.alert(
        "Sign In Required",
        "Please sign in or create an account to subscribe.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Sign In", onPress: () => router.push("/login") },
        ]
      );
      return;
    }
    setLoading(true);
    try {
      // Open Stripe checkout — URL is configured via STRIPE_PAYMENT_LINK env var
      const stripeUrl = selectedPlan === "basic"
        ? (billingCycle === "monthly"
          ? process.env.EXPO_PUBLIC_STRIPE_BASIC_MONTHLY_URL
          : process.env.EXPO_PUBLIC_STRIPE_BASIC_ANNUAL_URL)
        : (billingCycle === "monthly"
          ? process.env.EXPO_PUBLIC_STRIPE_ADVANCED_MONTHLY_URL
          : process.env.EXPO_PUBLIC_STRIPE_ADVANCED_ANNUAL_URL);

      if (stripeUrl) {
        await Linking.openURL(stripeUrl);
      } else {
        Alert.alert(
          "Stripe Not Configured",
          "Payment links are not yet configured. Please add your Stripe payment link URLs in the app settings.\n\nContact support to set up Stripe integration.",
          [{ text: "OK" }]
        );
      }
    } catch (e) {
      Alert.alert("Error", "Could not open payment page. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const annualSaving = Math.round(((monthlyPrices[selectedPlan] - annualPrices[selectedPlan]) / monthlyPrices[selectedPlan]) * 100);

  return (
    <ScreenContainer edges={["top", "left", "right"]} containerClassName="bg-black">
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <ImageBackground source={{ uri: HERO_BG }} style={styles.hero}>
          <View style={styles.heroOverlay}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
              <Text style={styles.backText}>← Back</Text>
            </TouchableOpacity>
            <View style={styles.heroContent}>
              <Text style={styles.heroLabel}>PEAKPULSE AI</Text>
              <Text style={styles.heroTitle}>Unlock Your{"\n"}Full Potential</Text>
              <Text style={styles.heroSub}>
                Join thousands transforming their bodies with AI-powered coaching
              </Text>
            </View>
          </View>
        </ImageBackground>

        <View style={styles.body}>
          {/* Billing Toggle */}
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[styles.toggleBtn, billingCycle === "monthly" && styles.toggleActive]}
              onPress={() => setBillingCycle("monthly")}
            >
              <Text style={[styles.toggleText, billingCycle === "monthly" && styles.toggleTextActive]}>
                Monthly
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, billingCycle === "annual" && styles.toggleActive]}
              onPress={() => setBillingCycle("annual")}
            >
              <Text style={[styles.toggleText, billingCycle === "annual" && styles.toggleTextActive]}>
                Annual
              </Text>
              <View style={styles.saveBadge}>
                <Text style={styles.saveBadgeText}>Save 20%</Text>
              </View>
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
                <Text style={styles.currency}>£</Text>
                <Text style={styles.price}>{prices.basic.toFixed(2)}</Text>
              </View>
              <Text style={styles.perMonth}>/ month</Text>
              {billingCycle === "annual" && (
                <Text style={styles.annualNote}>billed annually</Text>
              )}
              <View style={[styles.selectIndicator, selectedPlan === "basic" && styles.selectIndicatorActive]}>
                <Text style={styles.selectIndicatorText}>{selectedPlan === "basic" ? "✓ Selected" : "Select"}</Text>
              </View>
            </TouchableOpacity>

            {/* Advanced Plan */}
            <TouchableOpacity
              style={[styles.planCard, styles.planCardAdvanced, selectedPlan === "advanced" && styles.planCardSelected]}
              onPress={() => setSelectedPlan("advanced")}
            >
              <View style={styles.popularBadge}>
                <Text style={styles.popularText}>MOST POPULAR</Text>
              </View>
              <Text style={[styles.planName, styles.planNameAdvanced]}>Advanced</Text>
              <View style={styles.priceRow}>
                <Text style={[styles.currency, styles.currencyAdvanced]}>£</Text>
                <Text style={[styles.price, styles.priceAdvanced]}>{prices.advanced.toFixed(2)}</Text>
              </View>
              <Text style={[styles.perMonth, styles.perMonthAdvanced]}>/ month</Text>
              {billingCycle === "annual" && (
                <Text style={[styles.annualNote, { color: "#a78bfa" }]}>billed annually</Text>
              )}
              <View style={[styles.selectIndicator, styles.selectIndicatorAdvanced, selectedPlan === "advanced" && styles.selectIndicatorActive]}>
                <Text style={styles.selectIndicatorText}>{selectedPlan === "advanced" ? "✓ Selected" : "Select"}</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Feature Comparison */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {selectedPlan === "basic" ? "Basic" : "Advanced"} Plan Includes
            </Text>
            {(selectedPlan === "basic" ? BASIC_FEATURES : ADVANCED_FEATURES).map((f, i) => (
              <View key={i} style={styles.featureRow}>
                <Text style={[styles.featureIcon, f.included ? styles.featureIconIncluded : styles.featureIconExcluded]}>
                  {f.included ? "✓" : "✗"}
                </Text>
                <Text style={[styles.featureLabel, !f.included && styles.featureLabelExcluded]}>
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
                { name: "PeakPulse", price: "£4.99", aiPlans: "✓", formAI: "✓", highlight: true },
                { name: "MyFitnessPal", price: "£17.99", aiPlans: "✗", formAI: "✗", highlight: false },
                { name: "Caliber", price: "£29.99", aiPlans: "~", formAI: "✗", highlight: false },
                { name: "Future", price: "£149", aiPlans: "✓", formAI: "✗", highlight: false },
                { name: "Freeletics", price: "£8.99", aiPlans: "~", formAI: "✗", highlight: false },
              ].map((row, i) => (
                <View key={i} style={[styles.compareRow, row.highlight && styles.compareRowHighlight]}>
                  <Text style={[styles.compareCell, { flex: 2 }, row.highlight && styles.compareHighlightText]}>{row.name}</Text>
                  <Text style={[styles.compareCell, row.highlight && styles.compareHighlightText]}>{row.price}</Text>
                  <Text style={[styles.compareCell, row.highlight && styles.compareHighlightText]}>{row.aiPlans}</Text>
                  <Text style={[styles.compareCell, row.highlight && styles.compareHighlightText]}>{row.formAI}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.compareNote}>
              PeakPulse Advanced offers more AI features than competitors at a fraction of the price.
            </Text>
          </View>

          {/* CTA */}
          <TouchableOpacity
            style={[styles.ctaBtn, loading && { opacity: 0.7 }]}
            onPress={handleSubscribe}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.ctaBtnText}>
                  Start {selectedPlan === "basic" ? "Basic" : "Advanced"} — £{prices[selectedPlan].toFixed(2)}/mo
                </Text>
                <Text style={styles.ctaSubText}>Cancel anytime · Secure payment via Stripe</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Stripe Setup Note */}
          <View style={styles.stripeNote}>
            <Text style={styles.stripeNoteTitle}>💳 Stripe Integration</Text>
            <Text style={styles.stripeNoteText}>
              To collect payments, add your Stripe Payment Link URLs in the app settings (Secrets panel). Set:{"\n"}
              • EXPO_PUBLIC_STRIPE_BASIC_MONTHLY_URL{"\n"}
              • EXPO_PUBLIC_STRIPE_ADVANCED_MONTHLY_URL{"\n"}
              • EXPO_PUBLIC_STRIPE_BASIC_ANNUAL_URL{"\n"}
              • EXPO_PUBLIC_STRIPE_ADVANCED_ANNUAL_URL{"\n\n"}
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
  heroOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", padding: 20, justifyContent: "space-between" },
  backBtn: { alignSelf: "flex-start", paddingVertical: 8, paddingHorizontal: 4 },
  backText: { color: "#fff", fontSize: 16 },
  heroContent: { paddingBottom: 20 },
  heroLabel: { color: "#a78bfa", fontSize: 12, fontWeight: "700", letterSpacing: 2, marginBottom: 8 },
  heroTitle: { color: "#fff", fontSize: 32, fontWeight: "800", lineHeight: 40, marginBottom: 8 },
  heroSub: { color: "rgba(255,255,255,0.8)", fontSize: 15, lineHeight: 22 },
  body: { backgroundColor: "#0a0a0a", padding: 20, paddingBottom: 60 },
  toggleRow: { flexDirection: "row", backgroundColor: "#1a1a2e", borderRadius: 12, padding: 4, marginBottom: 24 },
  toggleBtn: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 10, flexDirection: "row", justifyContent: "center", gap: 6 },
  toggleActive: { backgroundColor: "#7c3aed" },
  toggleText: { color: "#9ca3af", fontSize: 14, fontWeight: "600" },
  toggleTextActive: { color: "#fff" },
  saveBadge: { backgroundColor: "#22c55e", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  saveBadgeText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  plansRow: { flexDirection: "row", gap: 12, marginBottom: 28 },
  planCard: { flex: 1, backgroundColor: "#1a1a2e", borderRadius: 16, padding: 16, borderWidth: 2, borderColor: "#2d2d4e", alignItems: "center" },
  planCardAdvanced: { backgroundColor: "#1e0a3c" },
  planCardSelected: { borderColor: "#7c3aed" },
  popularBadge: { backgroundColor: "#7c3aed", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 8 },
  popularText: { color: "#fff", fontSize: 9, fontWeight: "800", letterSpacing: 1 },
  planName: { color: "#9ca3af", fontSize: 14, fontWeight: "700", marginBottom: 8 },
  planNameAdvanced: { color: "#c4b5fd" },
  priceRow: { flexDirection: "row", alignItems: "flex-start" },
  currency: { color: "#fff", fontSize: 18, fontWeight: "700", marginTop: 6 },
  currencyAdvanced: { color: "#a78bfa" },
  price: { color: "#fff", fontSize: 36, fontWeight: "800", lineHeight: 44 },
  priceAdvanced: { color: "#a78bfa" },
  perMonth: { color: "#6b7280", fontSize: 12, marginBottom: 4 },
  perMonthAdvanced: { color: "#7c3aed" },
  annualNote: { color: "#6b7280", fontSize: 10, marginBottom: 8 },
  selectIndicator: { marginTop: 8, backgroundColor: "#2d2d4e", borderRadius: 8, paddingVertical: 6, paddingHorizontal: 12 },
  selectIndicatorAdvanced: { backgroundColor: "#2d1b69" },
  selectIndicatorActive: { backgroundColor: "#7c3aed" },
  selectIndicatorText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  section: { marginBottom: 28 },
  sectionTitle: { color: "#fff", fontSize: 18, fontWeight: "700", marginBottom: 14 },
  featureRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#1a1a2e" },
  featureIcon: { fontSize: 16, fontWeight: "700", width: 28 },
  featureIconIncluded: { color: "#22c55e" },
  featureIconExcluded: { color: "#ef4444" },
  featureLabel: { color: "#e5e7eb", fontSize: 14, flex: 1 },
  featureLabelExcluded: { color: "#6b7280" },
  compareTable: { borderRadius: 12, overflow: "hidden", borderWidth: 1, borderColor: "#2d2d4e" },
  compareHeader: { flexDirection: "row", backgroundColor: "#1a1a2e", paddingVertical: 10, paddingHorizontal: 12 },
  compareHeaderText: { color: "#9ca3af", fontSize: 12, fontWeight: "700" },
  compareRow: { flexDirection: "row", paddingVertical: 10, paddingHorizontal: 12, borderTopWidth: 1, borderTopColor: "#1a1a2e" },
  compareRowHighlight: { backgroundColor: "#1e0a3c" },
  compareCell: { flex: 1, color: "#e5e7eb", fontSize: 13, textAlign: "center" },
  compareHighlightText: { color: "#a78bfa", fontWeight: "700" },
  compareNote: { color: "#6b7280", fontSize: 12, marginTop: 10, textAlign: "center", lineHeight: 18 },
  ctaBtn: { backgroundColor: "#7c3aed", borderRadius: 16, paddingVertical: 18, alignItems: "center", marginBottom: 20 },
  ctaBtnText: { color: "#fff", fontSize: 17, fontWeight: "800" },
  ctaSubText: { color: "rgba(255,255,255,0.7)", fontSize: 12, marginTop: 4 },
  stripeNote: { backgroundColor: "#0f172a", borderRadius: 12, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: "#1e3a5f" },
  stripeNoteTitle: { color: "#60a5fa", fontSize: 14, fontWeight: "700", marginBottom: 8 },
  stripeNoteText: { color: "#9ca3af", fontSize: 12, lineHeight: 20 },
  legalText: { color: "#4b5563", fontSize: 11, textAlign: "center", lineHeight: 18 },
});
