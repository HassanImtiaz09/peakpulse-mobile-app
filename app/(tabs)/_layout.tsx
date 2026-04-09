import { Tabs, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HapticTab } from "@/components/haptic-tab";
import { Platform, View, StyleSheet } from "react-native";
import { BlurView } from "expo-blur";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useEffect, useState } from "react";
import { CommandPalette } from "@/components/command-palette";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/hooks/use-auth";
import { useGuestAuth } from "@/lib/guest-auth";
import { useThemeContext } from "@/lib/theme-provider";
import { UI } from "@/constants/ui-colors";

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
    <View style={[styles.tabIconWrapper, focused && { backgroundColor: `${UI.gold}18`, borderWidth: 1, borderColor: `${UI.gold}33` }]}>
      <MaterialIcons name={def.icon} size={22} color={focused ? UI.gold : UI.muted} />
      {focused && <View style={[styles.activeGlow, { backgroundColor: UI.gold }]} />}
    </View>
  );
}

function TabBarBackground() {
  const { colorScheme } = useThemeContext();
  const bgColor = colorScheme === "dark" ? "rgba(10,14,20,0.95)" : "rgba(248,250,252,0.95)";

  if (Platform.OS === "web") {
    return <View style={[StyleSheet.absoluteFill, { backgroundColor: bgColor }]} />;
  }
  return (
    <BlurView
      intensity={60}
      tint={colorScheme === "dark" ? "dark" : "light"}
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
  const { colorScheme } = useThemeContext();
  const bottomPadding =
    Platform.OS === "web"
      ? 12
      : Math.max(insets.bottom, Platform.OS === "android" ? 16 : 8);
  const tabBarHeight = 64 + bottomPadding;

  useAuthGuard();
  const [cmdOpen, setCmdOpen] = useState(false);

  const borderTopColor = colorScheme === "dark" ? UI.border : "rgba(226,232,240,0.8)";

  return (
    <>
    <CommandPalette visible={cmdOpen} onClose={() => setCmdOpen(false)} />
    <Tabs
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: UI.gold,
        tabBarInactiveTintColor: UI.muted,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarIcon: ({ focused }) => <TabIcon route={route.name} focused={focused} />,
        tabBarBackground: () => <TabBarBackground />,
        tabBarStyle: {
          paddingTop: 6,
          paddingBottom: bottomPadding,
          height: tabBarHeight,
          backgroundColor: "transparent",
          borderTopColor,
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
      <ThemeToggle />
      <View style={{ height: 8 }} />
      <View style={[styles.fab, {
        backgroundColor: `${UI.gold}1F`,
        borderColor: `${UI.gold}40`,
      }]}>
        <MaterialIcons name="search" size={22} color={UI.gold} onPress={() => setCmdOpen(true)} />
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
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  tabIconWrapper: { width: 40, height: 32, alignItems: "center", justifyContent: "center", borderRadius: 10 },
  activeGlow: { position: "absolute", bottom: -2, width: 16, height: 2, borderRadius: 1, opacity: 0.8 },
});
