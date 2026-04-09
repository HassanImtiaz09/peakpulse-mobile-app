import { UI } from "@/constants/ui-colors";
/**
 * Typography system — Bebas Neue + DM Sans + Space Mono
 *
 * Bebas Neue: All screen headings (DASHBOARD, BODY SCAN, NUTRITION) — bold, athletic, distinctive
 * DM Sans: All body text and UI labels — clean legibility
 * Space Mono: Numbers only (calories, weight, BF%, HRV) — technical, precise feel
 */

/** Font family names as loaded by expo-font / useFonts */
export const FontFamily = {
  // Headings — bold, athletic, uppercase feel
  heading: "BebasNeue_400Regular",
  // Body text — clean, legible
  body: "DMSans_400Regular",
  bodyLight: "DMSans_300Light",
  bodyMedium: "DMSans_500Medium",
  bodySemiBold: "DMSans_600SemiBold",
  bodyBold: "DMSans_700Bold",
  bodyExtraBold: "DMSans_800ExtraBold",
  bodyBlack: "DMSans_900Black",
  // Numbers — technical, monospaced precision
  mono: "SpaceMono_400Regular",
  monoBold: "SpaceMono_700Bold",
} as const;

/** Per-screen accent color mapping for visual wayfinding */
export const ScreenAccent = {
  dashboard: UI.gold,   // Gold — energy, workouts
  bodyScan: UI.ice,    // Ice blue — health data
  workout: UI.gold,     // Gold — exercise, energy
  meals: UI.emerald,       // Mint/teal — nutrition
  coach: UI.emerald,       // Mint/teal — AI coaching
  profile: UI.gold,     // Gold — personal
  rose: UI.rose,        // Rose — protein targets
} as const;

/** Reusable text style presets */
export const TextStyle = {
  screenTitle: {
    fontFamily: FontFamily.heading,
    fontSize: 32,
    letterSpacing: 2,
    textTransform: "uppercase" as const,
  },
  sectionTitle: {
    fontFamily: FontFamily.heading,
    fontSize: 22,
    letterSpacing: 1.5,
    textTransform: "uppercase" as const,
  },
  cardTitle: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 16,
  },
  body: {
    fontFamily: FontFamily.body,
    fontSize: 14,
  },
  bodySmall: {
    fontFamily: FontFamily.body,
    fontSize: 12,
  },
  label: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: 13,
  },
  number: {
    fontFamily: FontFamily.mono,
    fontSize: 18,
  },
  numberLarge: {
    fontFamily: FontFamily.monoBold,
    fontSize: 28,
  },
  numberSmall: {
    fontFamily: FontFamily.mono,
    fontSize: 13,
  },
} as const;
