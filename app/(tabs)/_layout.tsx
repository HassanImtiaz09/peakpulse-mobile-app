import { Tabs, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HapticTab } from "@/components/haptic-tab";
import { Platform, View, StyleSheet } from "react-native";
import { BlurView } from "expo-blur";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useGuestAuth } from "@/lib/guest-auth";

// Aurora Titan tab icon definitions (3B: uniform MaterialIcons)
const TAB_ICONS: Record<string, { icon: keyof typeof MaterialIcons.glyphMap; label: string }> = {
  index: { icon: "dashboard", label: "Dashboard" },
  scan: { icon: "camera-alt", label: "Body Scan" },
  plans: { icon: "fitness-center", label: "Plans" },
  meals: { icon: "restaurant", label: "Meals" },
  profile: { icon: "person", label: "Profile" },
};

function AuroraTabIcon({ route, focused }: { route: string; focused: boolean }) {
  const def = TAB_ICONS[route] ?? { icon: "help-outline" as keyof typeof MaterialIcons.glyphMap, label: route };
  return (
    <View style={[styles.tabIconWrapper, focused && styles.tabIconWrapperActive]}>
      <MaterialIcons name={def.icon} size={22} color={focused ? "#F59E0B" : "#78350F"} />
      {focused && <View style={styles.activeGlow} />}
    </View>
  );
}

/**
 * 6A: Frosted glass tab bar background — uses BlurView on iOS/Android,
 * falls back to a semi-transparent background on web.
 */
function TabBarBackground() {
  if (Platform.OS === "web") {
    return <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(10,5,0,0.92)" }]} />;
  }
  return (
    <BlurView
      intensity={60}
      tint="dark"
      style={StyleSheet.absoluteFill}
    />
  );
}

/**
 * Auth guard: if a previously-authenticated session has expired (user is no longer
 * authenticated and is not in guest mode) redirect to /login so the user is never
 * stuck on a blank or broken tab screen.
 */
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
  const bottomPadding = Platform.OS === "web" ? 12 : Math.max(insets.bottom, 8);
  const tabBarHeight = 64 + bottomPadding;

  useAuthGuard();

  return (
    <Tabs
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: "#F59E0B",
        tabBarInactiveTintColor: "#78350F",
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarIcon: ({ focused }) => <AuroraTabIcon route={route.name} focused={focused} />,
        tabBarBackground: () => <TabBarBackground />,
        tabBarStyle: {
          paddingTop: 6,
          paddingBottom: bottomPadding,
          height: tabBarHeight,
          // 6A: transparent background so BlurView shows through
          backgroundColor: "transparent",
          borderTopColor: "rgba(245,158,11,0.15)",
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
      <Tabs.Screen name="index" options={{ title: "Dashboard" }} />
      <Tabs.Screen name="scan" options={{ title: "Body Scan" }} />
      <Tabs.Screen name="plans" options={{ title: "Plans" }} />
      <Tabs.Screen name="meals" options={{ title: "Meals" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabIconWrapper: { width: 40, height: 32, alignItems: "center", justifyContent: "center", borderRadius: 10 },
  tabIconWrapperActive: { backgroundColor: "rgba(245,158,11,0.10)", borderWidth: 1, borderColor: "rgba(245,158,11,0.20)" },
  activeGlow: { position: "absolute", bottom: -2, width: 16, height: 2, borderRadius: 1, backgroundColor: "#F59E0B", opacity: 0.8 },
});
