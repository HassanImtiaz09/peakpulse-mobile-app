import { Tabs, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HapticTab } from "@/components/haptic-tab";
import { Platform, View, StyleSheet } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useGuestAuth } from "@/lib/guest-auth";

// Aurora Titan tab icon definitions
const TAB_ICONS: Record<string, { icon: keyof typeof MaterialIcons.glyphMap; label: string }> = {
  index: { icon: "speed", label: "Dashboard" },
  scan: { icon: "document-scanner", label: "Body Scan" },
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
 * Auth guard: if a previously-authenticated session has expired (user is no longer
 * authenticated and is not in guest mode) redirect to /login so the user is never
 * stuck on a blank or broken tab screen.
 *
 * We wait until both auth hooks have finished loading before evaluating, which
 * prevents a flash-redirect on cold start before the token is read.
 */
function useAuthGuard() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { isGuest, loading: guestLoading } = useGuestAuth();

  useEffect(() => {
    // Don't act until both hooks have resolved
    if (authLoading || guestLoading) return;
    // If the user is neither authenticated nor in guest mode, their session
    // has expired (or they were never logged in) — send them to login.
    if (!isAuthenticated && !isGuest) {
      router.replace("/login" as any);
    }
  }, [isAuthenticated, isGuest, authLoading, guestLoading, router]);
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === "web" ? 12 : Math.max(insets.bottom, 8);
  const tabBarHeight = 64 + bottomPadding;

  // Redirect to /login if session has expired
  useAuthGuard();

  return (
    <Tabs
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: "#F59E0B",
        tabBarInactiveTintColor: "#78350F",
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarIcon: ({ focused }) => <AuroraTabIcon route={route.name} focused={focused} />,
        tabBarStyle: {
          paddingTop: 6,
          paddingBottom: bottomPadding,
          height: tabBarHeight,
          backgroundColor: "rgba(10,5,0,0.97)",
          borderTopColor: "rgba(245,158,11,0.15)",
          borderTopWidth: 1,
          ...(Platform.OS === "ios" && { position: "absolute" }),
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
