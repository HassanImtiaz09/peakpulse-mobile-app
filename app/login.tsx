import React from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/hooks/use-auth";
import { startOAuthLogin } from "@/constants/oauth";

export default function LoginScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32 }}>
          {/* Logo */}
          <View style={{ width: 100, height: 100, borderRadius: 28, backgroundColor: "#7C3AED20", alignItems: "center", justifyContent: "center", marginBottom: 24, borderWidth: 2, borderColor: "#7C3AED40" }}>
            <Text style={{ fontSize: 48 }}>⚡</Text>
          </View>

          <Text style={{ color: "#FFFFFF", fontSize: 32, fontWeight: "800", marginBottom: 8, textAlign: "center" }}>PeakPulse AI</Text>
          <Text style={{ color: "#9CA3AF", fontSize: 15, textAlign: "center", lineHeight: 22, marginBottom: 48 }}>
            Your AI-powered fitness companion.{"\n"}Transform your body with personalized plans.
          </Text>

          {/* Features */}
          <View style={{ width: "100%", gap: 12, marginBottom: 48 }}>
            {[
              { icon: "📸", text: "AI Body Scan & Transformation Preview" },
              { icon: "🏋️", text: "Personalized Workout & Meal Plans" },
              { icon: "📊", text: "Progress Tracking with AI Analysis" },
              { icon: "🥗", text: "Calorie Estimation from Photos" },
              { icon: "⌚", text: "Wearable Device Sync" },
              { icon: "🗺️", text: "Find Nearby Gyms" },
            ].map((f, i) => (
              <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#13131F", borderRadius: 14, padding: 14, borderWidth: 1, borderColor: "#1F2937" }}>
                <Text style={{ fontSize: 20 }}>{f.icon}</Text>
                <Text style={{ color: "#E5E7EB", fontSize: 14 }}>{f.text}</Text>
              </View>
            ))}
          </View>

          {/* Sign In Button */}
          <TouchableOpacity
            style={{ width: "100%", backgroundColor: "#7C3AED", borderRadius: 16, paddingVertical: 16, alignItems: "center", marginBottom: 12 }}
            onPress={() => startOAuthLogin()}
          >
            <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 16 }}>Continue with Google</Text>
          </TouchableOpacity>

          <Text style={{ color: "#6B7280", fontSize: 11, textAlign: "center", lineHeight: 16 }}>
            By continuing, you agree to our Terms of Service and Privacy Policy
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
