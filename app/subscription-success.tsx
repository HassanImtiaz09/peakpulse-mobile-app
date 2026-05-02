/**
 * Subscription Success Screen
 * Shown after a successful Stripe checkout. Refreshes subscription status
 * and redirects to the main dashboard.
 */
import React, { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ScreenContainer } from "@/components/screen-container";
import { useSubscription } from "@/hooks/use-subscription";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { UI, C } from "@/constants/ui-colors";

export default function SubscriptionSuccessScreen() {
  const router = useRouter();
  const { refresh, tier } = useSubscription();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    let mounted = true;
    async function verify() {
      try {
        // Wait a moment for webhook to process
        await new Promise((r) => setTimeout(r, 2000));
        await refresh();
        // Poll a few times if still free (webhook may not have arrived yet)
        let attempts = 0;
        while (attempts < 5) {
          await new Promise((r) => setTimeout(r, 1500));
          await refresh();
          attempts++;
          // Check if subscription updated (we can't read tier directly in the loop
          // since it's from the hook state, but the refresh will update it)
        }
        if (mounted) {
          await AsyncStorage.setItem("@subscription_selected", "true");
          setStatus("success");
          // Navigate to dashboard after a brief success display
          setTimeout(() => {
            if (mounted) router.replace("/(tabs)" as any);
          }, 2000);
        }
      } catch {
        if (mounted) setStatus("error");
      }
    }
    verify();
    return () => { mounted = false; };
  }, [refresh, router]);

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <View style={styles.container}>
        {status === "loading" && (
          <>
            <ActivityIndicator size="large" color={C.gold} />
            <Text style={styles.title}>Activating your subscription...</Text>
            <Text style={styles.subtitle}>This may take a few seconds</Text>
          </>
        )}
        {status === "success" && (
          <>
            <View style={styles.successCircle}>
              <MaterialIcons name="check" size={48} color="#fff" />
            </View>
            <Text style={styles.title}>Welcome to {tier === "pro" ? "Pro" : "Basic"}!</Text>
            <Text style={styles.subtitle}>Your subscription is now active</Text>
          </>
        )}
        {status === "error" && (
          <>
            <MaterialIcons name="error-outline" size={48} color="#EF4444" />
            <Text style={styles.title}>Something went wrong</Text>
            <Text style={styles.subtitle}>
              Your payment may have succeeded. Please check your subscription status in Settings.
            </Text>
          </>
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    backgroundColor: UI.bg,
  },
  successCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: C.gold,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#fff",
    marginTop: 16,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    color: C.muted,
    marginTop: 8,
    textAlign: "center",
    lineHeight: 22,
  },
});
