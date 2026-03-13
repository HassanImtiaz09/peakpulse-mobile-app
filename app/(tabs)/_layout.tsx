import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HapticTab } from "@/components/haptic-tab";
import { Platform, View, Text, StyleSheet } from "react-native";
import { useColors } from "@/hooks/use-colors";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

// Platinum Pulse tab icon definitions
const TAB_ICONS: Record<string, { icon: keyof typeof MaterialIcons.glyphMap; label: string }> = {
  index:   { icon: "speed",           label: "Dashboard" },
  scan:    { icon: "document-scanner", label: "Body Scan" },
  plans:   { icon: "fitness-center",  label: "Plans" },
  meals:   { icon: "restaurant",      label: "Meals" },
  profile: { icon: "person",          label: "Profile" },
};

function PlatinumTabIcon({
  route,
  color,
  focused,
}: {
  route: string;
  color: string;
  focused: boolean;
}) {
  const def = TAB_ICONS[route] ?? { icon: "help-outline" as keyof typeof MaterialIcons.glyphMap, label: route };
  return (
    <View style={[styles.tabIconWrapper, focused && styles.tabIconWrapperActive]}>
      <MaterialIcons
        name={def.icon}
        size={22}
        color={focused ? "#E2E8F0" : "#475569"}
      />
    </View>
  );
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === "web" ? 12 : Math.max(insets.bottom, 8);
  const tabBarHeight = 64 + bottomPadding;

  return (
    <Tabs
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: "#E2E8F0",
        tabBarInactiveTintColor: "#475569",
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarIcon: ({ focused, color }) => (
          <PlatinumTabIcon route={route.name} color={color} focused={focused} />
        ),
        tabBarStyle: {
          paddingTop: 6,
          paddingBottom: bottomPadding,
          height: tabBarHeight,
          backgroundColor: "rgba(8,11,15,0.97)",
          borderTopColor: "rgba(226,232,240,0.06)",
          borderTopWidth: 1,
          // Subtle glass blur on iOS
          ...(Platform.OS === "ios" && { position: "absolute" }),
        },
        tabBarLabelStyle: {
          fontFamily: "Inter_500Medium",
          fontSize: 10,
          letterSpacing: 0.3,
          marginTop: 0,
        },
      })}
    >
      <Tabs.Screen name="index"   options={{ title: "Dashboard" }} />
      <Tabs.Screen name="scan"    options={{ title: "Body Scan" }} />
      <Tabs.Screen name="plans"   options={{ title: "Plans" }} />
      <Tabs.Screen name="meals"   options={{ title: "Meals" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabIconWrapper: {
    width: 40,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
  },
  tabIconWrapperActive: {
    backgroundColor: "rgba(226,232,240,0.08)",
    borderWidth: 1,
    borderColor: "rgba(226,232,240,0.12)",
  },
});
