import React, { useState } from "react";
import { View, Text, TouchableOpacity, Modal, ActivityIndicator, Alert, Linking } from "react-native";
import { useRouter } from "expo-router";
import { useSubscription } from "@/hooks/use-subscription";
import { useGuestAuth } from "@/lib/guest-auth";
import { UI } from "@/constants/ui-colors";

interface PaywallModalProps {
  visible: boolean;
  onClose: () => void;
  featureName: string;
  featureIcon?: string;
  requiredTier: "basic" | "pro";
  description?: string;
}

const TIER_PRICES = {
  basic: { monthly: "£5.99", annual: "£4.19" },
  pro: { monthly: "£11.99", annual: "£8.49" },
};
const TIER_LABELS = { basic: "Basic", pro: "Pro" };
const TIER_COLORS = { basic: UI.gold, pro: UI.orange };

export function PaywallModal({
  visible,
  onClose,
  featureName,
  featureIcon = "⭐",
  requiredTier,
  description,
}: PaywallModalProps) {
  const router = useRouter();
  const subscription = useSubscription();
  const { isGuest, guestProfile } = useGuestAuth();
  const isAuthenticated = isGuest || !!guestProfile;
  const [trialLoading, setTrialLoading] = useState(false);
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("annual");

  const price = TIER_PRICES[requiredTier];
  const label = TIER_LABELS[requiredTier];
  const color = TIER_COLORS[requiredTier];

  // Show free trial CTA only for Pro features when trial not yet used and user not paid
  const showTrialCTA =
    requiredTier === "pro" &&
    !subscription.hasUsedTrial &&
    !subscription.isPaid;

  const handleStartTrial = async () => {
    setTrialLoading(true);
    try {
      await subscription.startTrial();
      onClose();
      Alert.alert(
        "🎉 Trial Started!",
        "Your 7-day free trial of Advanced is now active. Enjoy all premium features — no charge until you subscribe.",
        [{ text: "Let's Go!" }]
      );
    } catch {
      Alert.alert("Error", "Could not start trial. Please try again.");
    } finally {
      setTrialLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(10,5,0,0.88)", justifyContent: "center", alignItems: "center", paddingHorizontal: 24 }}>
        <View style={{ backgroundColor: UI.bg, borderRadius: 28, padding: 28, width: "100%", maxWidth: 380, borderWidth: 1, borderColor: UI.borderGold2 }}>

          {/* Icon + tier badge */}
          <View style={{ alignItems: "center", marginBottom: 16 }}>
            <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: `${color}18`, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: `${color}40`, marginBottom: 12 }}>
              <Text style={{ fontSize: 34 }}>{featureIcon}</Text>
            </View>
            <View style={{ backgroundColor: `${color}20`, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: `${color}40` }}>
              <Text style={{ color, fontSize: 11, fontFamily: "DMSans_700Bold", letterSpacing: 1.2 }}>
                {label.toUpperCase()} PLAN REQUIRED
              </Text>
            </View>
          </View>

          {/* Title */}
          <Text style={{ color: UI.fg, fontFamily: "BebasNeue_400Regular", fontSize: 22, textAlign: "center", marginBottom: 8 }}>
            Unlock {featureName}
          </Text>

          {/* Description */}
          <Text style={{ color: UI.secondaryLight, fontFamily: "DMSans_400Regular", fontSize: 14, textAlign: "center", lineHeight: 22, marginBottom: 20 }}>
            {description ?? `${featureName} is available on the ${label} plan and above. Upgrade to access this and many more premium features.`}
          </Text>

          {/* Free trial highlight — Advanced only, trial not yet used */}
          {showTrialCTA ? (
            <View style={{ backgroundColor: "#1c1000", borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: "#F59E0B40", alignItems: "center" }}>
              <Text style={{ fontSize: 28, marginBottom: 6 }}>🎁</Text>
              <Text style={{ color: UI.gold, fontFamily: "BebasNeue_400Regular", fontSize: 16, marginBottom: 4 }}>
                7-Day Free Trial
              </Text>
              <Text style={{ color: UI.secondaryLight, fontFamily: "DMSans_400Regular", fontSize: 12, textAlign: "center", lineHeight: 18 }}>
                Try all Pro features free for 7 days.{"\n"}No credit card required.
              </Text>
            </View>
          ) : (
            /* Price callout — shown when no trial available */
            <View style={{ backgroundColor: UI.surface, borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: UI.goldAlpha12 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <View>
                  <Text style={{ color: UI.secondaryLight, fontFamily: "DMSans_400Regular", fontSize: 12, marginBottom: 2 }}>Starting from</Text>
                  <Text style={{ color: UI.fg, fontFamily: "BebasNeue_400Regular", fontSize: 26 }}>
                    {price.annual}
                    <Text style={{ fontSize: 14, color: UI.secondaryLight, fontFamily: "DMSans_400Regular" }}>/mo</Text>
                  </Text>
                  <Text style={{ color: UI.secondaryLight, fontFamily: "DMSans_400Regular", fontSize: 11, marginTop: 2 }}>
                    billed annually · or {price.monthly}/mo
                  </Text>
                </View>
                <View style={{ backgroundColor: "#22C55E20", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: "#22C55E40" }}>
                  <Text style={{ color: UI.green, fontFamily: "DMSans_700Bold", fontSize: 12 }}>SAVE 30%</Text>
                  <Text style={{ color: UI.green, fontFamily: "DMSans_400Regular", fontSize: 10, textAlign: "center" }}>annual</Text>
                </View>
              </View>
            </View>
          )}

          {/* Billing cycle toggle */}
          {!showTrialCTA && (
            <View style={{ flexDirection: "row", backgroundColor: UI.surface, borderRadius: 10, padding: 3, marginBottom: 14 }}>
              <TouchableOpacity
                style={{ flex: 1, paddingVertical: 8, alignItems: "center", borderRadius: 8, backgroundColor: billingCycle === "monthly" ? color : "transparent" }}
                onPress={() => setBillingCycle("monthly")}
              >
                <Text style={{ color: billingCycle === "monthly" ? UI.fg : UI.secondaryLight, fontFamily: "DMSans_600SemiBold", fontSize: 12 }}>Monthly</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1, paddingVertical: 8, alignItems: "center", borderRadius: 8, backgroundColor: billingCycle === "annual" ? color : "transparent", flexDirection: "row", justifyContent: "center", gap: 4 }}
                onPress={() => setBillingCycle("annual")}
              >
                <Text style={{ color: billingCycle === "annual" ? UI.fg : UI.secondaryLight, fontFamily: "DMSans_600SemiBold", fontSize: 12 }}>Annual</Text>
                <View style={{ backgroundColor: "#22C55E30", borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1 }}>
                  <Text style={{ color: UI.green, fontFamily: "DMSans_700Bold", fontSize: 8 }}>-30%</Text>
                </View>
              </TouchableOpacity>
            </View>
          )}

          {/* Primary CTA */}
          {showTrialCTA ? (
            <TouchableOpacity
              style={{ backgroundColor: UI.gold, borderRadius: 16, paddingVertical: 16, alignItems: "center", marginBottom: 10, opacity: trialLoading ? 0.7 : 1 }}
              onPress={handleStartTrial}
              disabled={trialLoading}
            >
              {trialLoading ? (
                <ActivityIndicator color={UI.bg} />
              ) : (
                <Text style={{ color: UI.bg, fontFamily: "BebasNeue_400Regular", fontSize: 16 }}>
                  Start Free Trial 🎉
                </Text>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={{ backgroundColor: color, borderRadius: 16, paddingVertical: 16, alignItems: "center", marginBottom: 10, opacity: purchaseLoading ? 0.7 : 1 }}
              onPress={async () => {
                if (!isAuthenticated) {
                  Alert.alert("Sign In Required", "Please sign in or create an account to subscribe.", [
                    { text: "Cancel", style: "cancel" },
                    { text: "Sign In", onPress: () => { onClose(); router.push("/login" as any); } },
                  ]);
                  return;
                }
                setPurchaseLoading(true);
                try {
                  const stripeUrl = requiredTier === "basic"
                    ? (billingCycle === "monthly" ? process.env.EXPO_PUBLIC_STRIPE_BASIC_MONTHLY_URL : process.env.EXPO_PUBLIC_STRIPE_BASIC_ANNUAL_URL)
                    : (billingCycle === "monthly" ? process.env.EXPO_PUBLIC_STRIPE_ADVANCED_MONTHLY_URL : process.env.EXPO_PUBLIC_STRIPE_ADVANCED_ANNUAL_URL);
                  if (stripeUrl) {
                    await Linking.openURL(stripeUrl);
                    onClose();
                  } else {
                    onClose();
                    router.push("/subscription" as any);
                  }
                } catch {
                  Alert.alert("Error", "Could not open payment page. Please try again.");
                } finally {
                  setPurchaseLoading(false);
                }
              }}
              disabled={purchaseLoading}
            >
              {purchaseLoading ? (
                <ActivityIndicator color={UI.fg} />
              ) : (
                <>
                  <Text style={{ color: UI.fg, fontFamily: "BebasNeue_400Regular", fontSize: 16 }}>
                    Subscribe to {label} — {billingCycle === "annual" ? price.annual : price.monthly}/mo ⚡
                  </Text>
                  <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 10, marginTop: 2 }}>Secure payment via Stripe · Cancel anytime</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {/* Secondary CTA — view all plans */}
          <TouchableOpacity
            style={{ alignItems: "center", paddingVertical: 8, marginBottom: 4 }}
            onPress={() => { onClose(); router.push("/subscription" as any); }}
          >
            <Text style={{ color: UI.orange, fontFamily: "DMSans_600SemiBold", fontSize: 13 }}>
              {showTrialCTA ? "View all plans instead →" : "Compare all plans →"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={{ alignItems: "center", paddingVertical: 10 }} onPress={onClose}>
            <Text style={{ color: UI.secondaryLight, fontFamily: "DMSans_400Regular", fontSize: 14 }}>Maybe later</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
