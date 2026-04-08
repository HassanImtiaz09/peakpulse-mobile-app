import "@/global.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import "@/lib/_core/nativewind-pressable";
import { ThemeProvider } from "@/lib/theme-provider";
import { GuestAuthProvider } from "@/lib/guest-auth";
import { CalorieProvider } from "@/lib/calorie-context";
import { PantryProvider } from "@/lib/pantry-context";
import { WearableProvider } from "@/lib/wearable-context";
import {
  SafeAreaFrameContext,
  SafeAreaInsetsContext,
  SafeAreaProvider,
  initialWindowMetrics,
} from "react-native-safe-area-context";
import type { EdgeInsets, Metrics, Rect } from "react-native-safe-area-context";

import { trpc, createTRPCClient } from "@/lib/trpc";
import { initManusRuntime, subscribeSafeAreaInsets } from "@/lib/_core/manus-runtime";
import * as SplashScreen from "expo-splash-screen";
import * as Notifications from "expo-notifications";
import * as Linking from "expo-linking";
import { useFonts } from "expo-font";
import { useRouter } from "expo-router";
import { extractReferralCodeFromUrl, storePendingReferralCode } from "@/lib/referral";
import { FloatingAssistant } from "@/components/floating-assistant";
import { AiLimitProvider } from "@/components/ai-limit-modal";
import { ErrorBoundary } from "@/components/error-boundary";
import { scheduleAllAINotifications } from "@/lib/ai-notification-scheduler";
import { evaluateAndScheduleSmartReminders } from "@/lib/smart-reminders";
import { defineBackgroundHealthSyncTask, registerBackgroundHealthSync } from "@/lib/background-health-sync";
import { initWeeklyDigest } from "@/lib/weekly-health-digest";

import { FavoritesProvider } from "@/lib/favorites-context";
import { UserProfileProvider } from "@/lib/user-profile-context";
import { ExerciseCompletionProvider } from "@/lib/exercise-completion-context";

// Define background task in global scope (required by expo-task-manager)
defineBackgroundHealthSyncTask();
import {
  DMSans_300Light,
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
  DMSans_800ExtraBold,
  DMSans_900Black,
} from "@expo-google-fonts/dm-sans";
import { BebasNeue_400Regular } from "@expo-google-fonts/bebas-neue";

SplashScreen.preventAutoHideAsync();

const DEFAULT_WEB_INSETS: EdgeInsets = { top: 0, right: 0, bottom: 0, left: 0 };
const DEFAULT_WEB_FRAME: Rect = { x: 0, y: 0, width: 0, height: 0 };

export const unstable_settings = {
  anchor: "(tabs)",
};

/**
 * Listens for notification taps and deep-links to the URL stored in notification data.
 * Handles both cold-start (app launched from notification) and foreground tap scenarios.
 */
/** Find today's workout from a schedule array based on current day of week */
function findTodayWorkout(schedule: any[]): any | null {
  if (!schedule?.length) return null;
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const todayName = dayNames[new Date().getDay()];
  const match = schedule.find((d: any) => {
    const dayStr = (d.day ?? "").toLowerCase();
    return dayStr === todayName.toLowerCase() || dayStr.startsWith(todayName.toLowerCase().slice(0, 3));
  });
  return match ?? schedule[0];
}

/** Load workout plan from AsyncStorage and return today's workout day data */
async function loadTodayWorkoutData(): Promise<any | null> {
  try {
    const [cached, guest] = await Promise.all([
      AsyncStorage.getItem("@cached_workout_plan"),
      AsyncStorage.getItem("@guest_workout_plan"),
    ]);
    const raw = cached || guest;
    if (!raw) return null;
    const plan = JSON.parse(raw);
    return findTodayWorkout(plan?.schedule);
  } catch {
    return null;
  }
}

function useNotificationDeepLink(ready: boolean) {
  const router = useRouter();

  /** Handle a notification response — navigate based on type or url */
  const handleNotificationResponse = useCallback(async (data: Record<string, any> | undefined, delay = 0) => {
    if (!data) return;
    // Explicit URL takes priority
    if (typeof data.url === "string") {
      if (delay > 0) setTimeout(() => router.push(data.url as any), delay);
      else router.push(data.url as any);
      return;
    }
    // Workout reminder: load today's workout and deep-link to active-workout
    if (data.type === "workout_reminder") {
      const todayData = await loadTodayWorkoutData();
      const nav = () => {
        if (todayData) {
          router.push({ pathname: "/energy-checkin", params: { dayData: JSON.stringify(todayData) } } as any);
        } else {
          // No plan found — go to plans tab
          router.push("/(tabs)/plans" as any);
        }
      };
      if (delay > 0) setTimeout(nav, delay);
      else nav();
      return;
    }
    // Meal reminder: go to meals tab
    if (data.type === "meal_reminder" || data.type === "meal_plan_renewal") {
      const nav = () => router.push("/(tabs)/meals" as any);
      if (delay > 0) setTimeout(nav, delay);
      else nav();
      return;
    }
  }, [router]);

  useEffect(() => {
    if (Platform.OS === "web" || !ready) return;
    // Handle notification that launched the app from a closed/background state
    (async () => {
      try {
        const lastResponse = await Notifications.getLastNotificationResponseAsync();
        if (lastResponse) {
          await handleNotificationResponse(lastResponse.notification.request.content.data, 400);
        }
      } catch (_) { /* cold-start: navigator may not be ready */ }
    })();
    // Handle notification taps while the app is already running
    const subscription = Notifications.addNotificationResponseReceivedListener(async (response) => {
      await handleNotificationResponse(response.notification.request.content.data);
    });
    return () => subscription.remove();
  }, [router, ready, handleNotificationResponse]);
}

/**
 * Detects incoming referral deep-link URLs on app launch and stores the code
 * as a pending referral to be applied when the user completes onboarding.
 */
function useReferralDeepLink(ready: boolean) {
  useEffect(() => {
    if (Platform.OS === "web" || !ready) return;

    async function checkInitialUrl() {
      try {
        const initialUrl = await Linking.getInitialURL();
        if (initialUrl) {
          const code = extractReferralCodeFromUrl(initialUrl);
          if (code) {
            await storePendingReferralCode(code);
          }
        }
      } catch {}
    }

    checkInitialUrl();

    // Also listen for URLs while the app is running (e.g. user taps link while app is open)
    const subscription = Linking.addEventListener("url", ({ url }) => {
      const code = extractReferralCodeFromUrl(url);
      if (code) {
        storePendingReferralCode(code).catch(() => {});
      }
    });

    return () => subscription.remove();
  }, [ready]);
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    DMSans_300Light,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
    DMSans_800ExtraBold,
    DMSans_900Black,    BebasNeue_400Regular,  });

  const initialInsets = initialWindowMetrics?.insets ?? DEFAULT_WEB_INSETS;
  const initialFrame = initialWindowMetrics?.frame ?? DEFAULT_WEB_FRAME;

  const [insets, setInsets] = useState<EdgeInsets>(initialInsets);
  const [frame, setFrame] = useState<Rect>(initialFrame);

  // Initialize Manus runtime for cookie injection from parent container
  useEffect(() => {
    initManusRuntime();
  }, []);

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  const handleSafeAreaUpdate = useCallback((metrics: Metrics) => {
    setInsets(metrics.insets);
    setFrame(metrics.frame);
  }, []);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const unsubscribe = subscribeSafeAreaInsets(handleSafeAreaUpdate);
    return () => unsubscribe();
  }, [handleSafeAreaUpdate]);

  // Create clients once and reuse them
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Disable automatic refetching on window focus for mobile
            refetchOnWindowFocus: false,
            // Retry failed requests once
            retry: 1,
          },
        },
      }),
  );
  const [trpcClient] = useState(() => createTRPCClient());

  // Deep-link hooks run on every render (rules of hooks) but skip work until fonts are loaded
  useNotificationDeepLink(fontsLoaded);
  useReferralDeepLink(fontsLoaded);

  // Schedule AI-powered notifications on app launch (runs silently, no permission prompt)
  useEffect(() => {
    if (!fontsLoaded || Platform.OS === "web") return;
    // Delay slightly to avoid blocking initial render
    const timer = setTimeout(() => {
      scheduleAllAINotifications().catch(() => {});
      evaluateAndScheduleSmartReminders().catch(() => {});
    }, 3000);
    return () => clearTimeout(timer);
  }, [fontsLoaded]);

  // Register background health sync on native platforms
  useEffect(() => {
    if (!fontsLoaded || Platform.OS === "web") return;
    const timer = setTimeout(() => {
      registerBackgroundHealthSync().catch(() => {});
    }, 5000);
    return () => clearTimeout(timer);
  }, [fontsLoaded]);

  // Initialize weekly health digest notifications
  useEffect(() => {
    if (!fontsLoaded || Platform.OS === "web") return;
    const timer = setTimeout(() => {
      initWeeklyDigest().catch(() => {});
    }, 6000);
    return () => clearTimeout(timer);
  }, [fontsLoaded]);



  if (!fontsLoaded) return null;

  // Ensure minimum 8px padding for top and bottom on mobile
  const providerInitialMetrics = useMemo(() => {
    const metrics = initialWindowMetrics ?? { insets: initialInsets, frame: initialFrame };
    return {
      ...metrics,
      insets: {
        ...metrics.insets,
        top: Math.max(metrics.insets.top, 16),
        bottom: Math.max(metrics.insets.bottom, 12),
      },
    };
  }, [initialInsets, initialFrame]);

  const content = (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary fallbackScreen="app">
      <GuestAuthProvider>
      <UserProfileProvider>
      <FavoritesProvider>
      <CalorieProvider>
      <PantryProvider>
      <ExerciseCompletionProvider>
      <WearableProvider>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <AiLimitProvider>
          {/* Default to hiding native headers so raw route segments don't appear (e.g. "(tabs)", "products/[id]"). */}
          {/* If a screen needs the native header, explicitly enable it and set a human title via Stack.Screen options. */}
          {/* in order for ios apps tab switching to work properly, use presentation: "fullScreenModal" for login page, whenever you decide to use presentation: "modal*/}
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="oauth/callback" />
          </Stack>
          <FloatingAssistant />
          <StatusBar style="light" />
          </AiLimitProvider>
        </QueryClientProvider>
      </trpc.Provider>
      </WearableProvider>
      </ExerciseCompletionProvider>
      </PantryProvider>
      </CalorieProvider>
      </FavoritesProvider>
      </UserProfileProvider>
      </GuestAuthProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );

  const shouldOverrideSafeArea = Platform.OS === "web";

  if (shouldOverrideSafeArea) {
    return (
      <ThemeProvider>
        <SafeAreaProvider initialMetrics={providerInitialMetrics}>
          <SafeAreaFrameContext.Provider value={frame}>
            <SafeAreaInsetsContext.Provider value={insets}>
              {content}
            </SafeAreaInsetsContext.Provider>
          </SafeAreaFrameContext.Provider>
        </SafeAreaProvider>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <SafeAreaProvider initialMetrics={providerInitialMetrics}>{content}</SafeAreaProvider>
    </ThemeProvider>
  );
}
