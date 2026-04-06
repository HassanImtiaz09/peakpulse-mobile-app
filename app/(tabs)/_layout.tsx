import { Tabs, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HapticTab } from "@/components/haptic-tab";
import { Platform, View, StyleSheet } from "react-native";
import { BlurView } from "expo-blur";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useEffect, useState } from "react";
import { CommandPalette } from "@/components/command-palette";
import { useAuth } from "@/hooks/use-auth";
import { useGuestAuth } from "@/lib/guest-auth";

// R4: Simplified 4-tab navigation — Home, Train, Nutrition, Profile
const TAB_ICONS: Record<string, { icon: keyof typeof MaterialIcons.glyphMap; label: string }> = {
  index: { icon: "dashboard", label: "Home" },
  plans: { icon: "fitness-center", label: "Train" },
  meals: { icon: "restaurant", label: "Nutrition" },
  profile: { icon: "person", label: "Profile" },
};

function TabIcon({ route, focused }: { route: string; focused: boolean }) {
  const def = TAB_ICONS[route] ?? { icon: "help-outline" as keyof typeof MaterialIcons.glyphMap, label: route };
  return (
    <View style={[styles.tabIconWrapper, focused && styles.tabIconWrapperActive]}>
      <MaterialIcons name={def.icon} size={22} color={focused ? "#F59E0B" : "#64748B"} />
      {focused && <View style={styles.activeGlow} />}
    </View>
  );
}

function TabBarBackground() {
  if (Platform.OS === "web") {
    return <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(10,14,20,0.95)" }]} />;
  }
  return (
    <BlurView
      intensity={60}
      tint="dark"
      style={StyleSheet.absoluteFill}
    />
  );
}

function useAuthGuard() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { isGuest, loading: guestLoading } = useGuestAuth();

  useEffect(() => {
    if (authLoading || guestLoading) return;
    if (!isAuthenticated && !isGuest) {
      router.replace("/login" as any);
    }
  }, [isAuthenticated, isGuest, authLoading, guestLoading, router]);
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  // Ensure the tab bar clears the system navigation bar on Android.
  // On iOS the safe-area inset already accounts for the home indicator.
  // On web we add a small fixed padding.
  const bottomPadding =
    Platform.OS === "web"
      ? 12
      : Math.max(insets.bottom, Platform.OS === "android" ? 16 : 8);
  const tabBarHeight = 64 + bottomPadding;

  useAuthGuard();
  const [cmdOpen, setCmdOpen] = useState(false);

  return (
    <>
    <CommandPalette visible={cmdOpen} onClose={() => setCmdOpen(false)} />
    <Tabs
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: "#F59E0B",
        tabBarInactiveTintColor: "#64748B",
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarIcon: ({ focused }) => <TabIcon route={route.name} focused={focused} />,
        tabBarBackground: () => <TabBarBackground />,
        tabBarStyle: {
          paddingTop: 6,
          paddingBottom: bottomPadding,
          height: tabBarHeight,
          backgroundColor: "transparent",
          borderTopColor: "rgba(30,41,59,0.6)",
          borderTopWidth: 1,
          position: "absolute",
        },
        tabBarLabelStyle: {
          fontFamily: "DMSans_500Medium",
          fontSize: 10,
          letterSpacing: 0.3,
          marginTop: 0,
        },
      })}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="plans" options={{ title: "Train" }} />
      <Tabs.Screen name="meals" options={{ title: "Nutrition" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
      {/* Hidden tabs — still routable but not shown in tab bar */}
      <Tabs.Screen name="scan" options={{ href: null }} />
      <Tabs.Screen name="ai-coach" options={{ href: null }} />
    </Tabs>
    <View style={styles.fabWrap} pointerEvents="box-none">
      <View style={styles.fab}>
        <MaterialIcons name="search" size={22} color="#F59E0B" onPress={() => setCmdOpen(true)} />
      </View>
    </View>
    </>
  );
}

const styles = StyleSheet.create({
  fabWrap: {
    position: "absolute",
    top: Platform.OS === "ios" ? 58 : 36,
    right: 16,
    zIndex: 999,
  },
  fab: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(245,158,11,0.12)",
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.25)",
    justifyContent: "center",
    alignItems: "center",
  },
  tabIconWrapper: { width: 40, height: 32, alignItems: "center", justifyContent: "center", borderRadius: 10 },
  tabIconWrapperActive: { backgroundColor: "rgba(245,158,11,0.10)", borderWidth: 1, borderColor: "rgba(245,158,11,0.20)" },
  activeGlow: { position: "absolute", bottom: -2, width: 16, height: 2, borderRadius: 1, backgroundColor: "#F59E0B", opacity: 0.8 },
});
