import React, { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/hooks/use-auth";

export default function LogoutScreen() {
  const router = useRouter();
  const { logout } = useAuth();

  useEffect(() => {
    logout().then(() => router.replace("/(tabs)" as any));
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: "#0D0D18", alignItems: "center", justifyContent: "center" }}>
      <ActivityIndicator size="large" color="#7C3AED" />
    </View>
  );
}
