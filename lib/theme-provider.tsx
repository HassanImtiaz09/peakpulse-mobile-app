import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Appearance, View, useColorScheme as useSystemColorScheme } from "react-native";
import { colorScheme as nativewindColorScheme, vars } from "nativewind";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { SchemeColors, type ColorScheme } from "@/constants/theme";
import { setUIColorScheme } from "@/constants/ui-colors";

export type ThemePreference = "light" | "dark" | "system";

const THEME_STORAGE_KEY = "@theme_preference";

type ThemeContextValue = {
  colorScheme: ColorScheme;
  themePreference: ThemePreference;
  setThemePreference: (pref: ThemePreference) => void;
  /** @deprecated Use setThemePreference instead */
  setColorScheme: (scheme: ColorScheme) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useSystemColorScheme() ?? "light";
  const [themePreference, setThemePrefState] = useState<ThemePreference>("system");
  const [loaded, setLoaded] = useState(false);

  const resolvedScheme: ColorScheme =
    themePreference === "system" ? systemScheme : themePreference;

  // Load persisted preference on mount
  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then((val) => {
        if (val === "light" || val === "dark" || val === "system") {
          setThemePrefState(val);
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  // Re-resolve when system scheme changes and preference is "system"
  const applyScheme = useCallback((scheme: ColorScheme) => {
    nativewindColorScheme.set(scheme);
    Appearance.setColorScheme?.(scheme);
    if (typeof document !== "undefined") {
      const root = document.documentElement;
      root.dataset.theme = scheme;
      root.classList.toggle("dark", scheme === "dark");
      const palette = SchemeColors[scheme];
      Object.entries(palette).forEach(([token, value]) => {
        root.style.setProperty(`--color-${token}`, value);
      });
    }
  }, []);

  // Apply whenever resolved scheme changes
  useEffect(() => {
    if (loaded) {
      applyScheme(resolvedScheme);
      // Sync the reactive UI/SF/C color proxy with the current scheme
      setUIColorScheme(resolvedScheme);
    }
  }, [applyScheme, resolvedScheme, loaded]);

  const setThemePreference = useCallback((pref: ThemePreference) => {
    setThemePrefState(pref);
    AsyncStorage.setItem(THEME_STORAGE_KEY, pref).catch(() => {});
  }, []);

  // Legacy compat
  const setColorScheme = useCallback((scheme: ColorScheme) => {
    setThemePreference(scheme);
  }, [setThemePreference]);

  const themeVariables = useMemo(
    () =>
      vars({
        "color-primary": SchemeColors[resolvedScheme].primary,
        "color-background": SchemeColors[resolvedScheme].background,
        "color-surface": SchemeColors[resolvedScheme].surface,
        "color-foreground": SchemeColors[resolvedScheme].foreground,
        "color-muted": SchemeColors[resolvedScheme].muted,
        "color-border": SchemeColors[resolvedScheme].border,
        "color-success": SchemeColors[resolvedScheme].success,
        "color-warning": SchemeColors[resolvedScheme].warning,
        "color-error": SchemeColors[resolvedScheme].error,
      }),
    [resolvedScheme],
  );

  const value = useMemo(
    () => ({
      colorScheme: resolvedScheme,
      themePreference,
      setThemePreference,
      setColorScheme,
    }),
    [resolvedScheme, themePreference, setThemePreference, setColorScheme],
  );

  return (
    <ThemeContext.Provider value={value}>
      <View style={[{ flex: 1 }, themeVariables]}>{children}</View>
    </ThemeContext.Provider>
  );
}

export function useThemeContext(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useThemeContext must be used within ThemeProvider");
  }
  return ctx;
}
