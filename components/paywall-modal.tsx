import React from "react";
import { View, Text, TouchableOpacity, Modal } from "react-native";
import { useRouter } from "expo-router";

interface PaywallModalProps {
  visible: boolean;
  onClose: () => void;
  featureName: string;
  featureIcon?: string;
  requiredTier: "basic" | "advanced";
  description?: string;
}

const TIER_PRICES = {
  basic: { monthly: "£4.99", annual: "£3.49" },
  advanced: { monthly: "£9.99", annual: "£6.99" },
};

const TIER_LABELS = {
  basic: "Basic",
  advanced: "Advanced",
};

const TIER_COLORS = {
  basic: "#F59E0B",
  advanced: "#EA580C",
};

export function PaywallModal({ visible, onClose, featureName, featureIcon = "⭐", requiredTier, description }: PaywallModalProps) {
  const router = useRouter();
  const price = TIER_PRICES[requiredTier];
  const label = TIER_LABELS[requiredTier];
  const color = TIER_COLORS[requiredTier];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(10,5,0,0.88)", justifyContent: "center", alignItems: "center", paddingHorizontal: 24 }}>
        <View style={{ backgroundColor: "#0A0500", borderRadius: 28, padding: 28, width: "100%", maxWidth: 380, borderWidth: 1, borderColor: "rgba(245,158,11,0.25)" }}>
          {/* Icon */}
          <View style={{ alignItems: "center", marginBottom: 16 }}>
            <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: `${color}18`, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: `${color}40`, marginBottom: 12 }}>
              <Text style={{ fontSize: 34 }}>{featureIcon}</Text>
            </View>
            <View style={{ backgroundColor: `${color}20`, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: `${color}40` }}>
              <Text style={{ color, fontSize: 11, fontFamily: "Outfit_700Bold", letterSpacing: 1.2 }}>
                {label.toUpperCase()} PLAN REQUIRED
              </Text>
            </View>
          </View>

          {/* Title */}
          <Text style={{ color: "#FFF7ED", fontFamily: "Outfit_800ExtraBold", fontSize: 22, textAlign: "center", marginBottom: 8 }}>
            Unlock {featureName}
          </Text>

          {/* Description */}
          <Text style={{ color: "#92400E", fontFamily: "DMSans_400Regular", fontSize: 14, textAlign: "center", lineHeight: 22, marginBottom: 20 }}>
            {description ?? `${featureName} is available on the ${label} plan and above. Upgrade to access this and many more premium features.`}
          </Text>

          {/* Price callout */}
          <View style={{ backgroundColor: "#150A00", borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: "rgba(245,158,11,0.12)" }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View>
                <Text style={{ color: "#78350F", fontFamily: "DMSans_400Regular", fontSize: 12, marginBottom: 2 }}>Starting from</Text>
                <Text style={{ color: "#FFF7ED", fontFamily: "Outfit_800ExtraBold", fontSize: 26 }}>
                  {price.annual}
                  <Text style={{ fontSize: 14, color: "#92400E", fontFamily: "DMSans_400Regular" }}>/mo</Text>
                </Text>
                <Text style={{ color: "#78350F", fontFamily: "DMSans_400Regular", fontSize: 11, marginTop: 2 }}>
                  billed annually · or {price.monthly}/mo
                </Text>
              </View>
              <View style={{ backgroundColor: "#22C55E20", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: "#22C55E40" }}>
                <Text style={{ color: "#22C55E", fontFamily: "Outfit_700Bold", fontSize: 12 }}>SAVE 30%</Text>
                <Text style={{ color: "#22C55E", fontFamily: "DMSans_400Regular", fontSize: 10, textAlign: "center" }}>annual</Text>
              </View>
            </View>
          </View>

          {/* CTA */}
          <TouchableOpacity
            style={{ backgroundColor: color, borderRadius: 16, paddingVertical: 16, alignItems: "center", marginBottom: 10 }}
            onPress={() => {
              onClose();
              router.push("/subscription" as any);
            }}
          >
            <Text style={{ color: "#FFF7ED", fontFamily: "Outfit_800ExtraBold", fontSize: 16 }}>
              Upgrade to {label} ⚡
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={{ alignItems: "center", paddingVertical: 10 }} onPress={onClose}>
            <Text style={{ color: "#78350F", fontFamily: "DMSans_400Regular", fontSize: 14 }}>Maybe later</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
