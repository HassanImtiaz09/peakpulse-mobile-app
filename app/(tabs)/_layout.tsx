import { Tabs } from "expo-router";
import { Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HapticTab } from "@/components/haptic-tab";

/**
 * Tab Navigation — 4-Tab Structure
 *
 * Redesigned from 6 tabs → 4 tabs:
 *   Before: Home | Scan | Plans | AI Coach | Meals | Profile
 *   After:  Today | Train | Eat | Me
 *
 * Changes:
 * - "Scan" (Body Scan) moved into "Me" tab → accessible via Me > Body Scan
 * - "AI Coach" removed as a tab; accessible via floating assistant on Today tab
 * - "Plans" renamed "Train" — verb-first, action-oriented
 * - "Meals" renamed "Eat"  — consistent verb tone
 * - "Profile" renamed "Me" — personal, concise
 * - Tab icons updated to match new naming
 */

const GOLD = "#F59E0B";
const INACTIVE = "#6B7280";
const BG = "#0D1117";
const BORDER = "#1F2937";

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  // Ensure the tab bar clears the system navigation bar on Android.
  // On iOS the safe-area inset already accounts for the home indicator.
  // On web we add a small fixed padding.
  const bottomPadding =
    Platform.OS === "web"
      ? 12
      : Math.max(insets.bottom, Platform.OS === "android" ? 16 : 24);

  const tabBarHeight = 56 + bottomPadding;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: GOLD,
        tabBarInactiveTintColor: INACTIVE,
        tabBarStyle: {
          backgroundColor: BG,
          borderTopColor: BORDER,
          borderTopWidth: 1,
          height: tabBarHeight,
          paddingBottom: bottomPadding,
          paddingTop: 10,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontFamily: "DMSans_500Medium",
          letterSpacing: 0.2,
        },
        tabBarButton: HapticTab,
        headerShown: false,
      }}
    >
      {/* ── Tab 1: TODAY (was Home) ─────────────────────────────────── */}
      <Tabs.Screen
        name="index"
        options={{
          title: "Today",
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons
              name={focused ? "sunny" : "sunny-outline"}
              color={color}
              size={size}
            />
          ),
          tabBarAccessibilityLabel: "Today tab — dashboard and daily overview",
        }}
      />

      {/* ── Tab 2: TRAIN (was Plans) ────────────────────────────────── */}
      <Tabs.Screen
        name="plans"
        options={{
          title: "Train",
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons
              name={focused ? "barbell" : "barbell-outline"}
              color={color}
              size={size}
            />
          ),
          tabBarAccessibilityLabel: "Train tab — workout plans and exercises",
        }}
      />

      {/* ── Tab 3: EAT (was Meals) ──────────────────────────────────── */}
      <Tabs.Screen
        name="meals"
        options={{
          title: "Eat",
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons
              name={focused ? "nutrition" : "nutrition-outline"}
              color={color}
              size={size}
            />
          ),
          tabBarAccessibilityLabel: "Eat tab — meal plans and nutrition tracking",
        }}
      />

      {/* ── Tab 4: ME (was Profile) ─────────────────────────────────── */}
      <Tabs.Screen
        name="profile"
        options={{
          title: "Me",
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons
              name={focused ? "person-circle" : "person-circle-outline"}
              color={color}
              size={size}
            />
          ),
          tabBarAccessibilityLabel: "Me tab — profile, progress, and settings",
        }}
      />

      {/* ── Hidden screens (navigable via links, not tab bar) ───────── */}
      {/* AI Coach: accessible from Today dashboard quick-actions */}
      <Tabs.Screen name="ai-coach" options={{ href: null }} />
      {/* Scan: accessible from Me tab > Body Scan */}
      <Tabs.Screen name="scan" options={{ href: null }} />
    </Tabs>
  );
}
