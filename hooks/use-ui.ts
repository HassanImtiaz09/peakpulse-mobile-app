/**
 * Theme-aware UI color hook.
 *
 * Returns the same shape as the old static `SF`/`UI`/`C` constants
 * from `@/constants/ui-colors`, but resolves colors based on the
 * current light/dark theme.
 *
 * Usage (drop-in replacement):
 *   // Before: import { UI, SF } from "@/constants/ui-colors";
 *   // After:  const SF = useUI();
 */
import { useMemo } from "react";
import { useThemeContext } from "@/lib/theme-provider";
import { UI } from "@/constants/ui-colors";

// ── Dark palette (original) ────────────────────────────────────
const DARK = {
  bg:             UI.bg,
  surface:        UI.surface,
  surface2:       UI.surface2,
  surfacePrimary: UI.surface,
  border:         UI.border,
  border2:        UI.border2,
  borderPrimary:  UI.borderPrimary,
  borderGold:     UI.borderGold,
  borderGold2:    UI.borderGold2,
  borderGold3:    UI.borderGold3,
  borderGold4:    UI.borderGold4,
  fg:             UI.fg,
  muted:          UI.muted,
  mutedGold:      UI.secondary,
  gold:           UI.gold,
  gold2:          UI.gold2,
  gold3:          UI.gold3,
  orange:         UI.orange,
  orange2:        UI.orange2,
  red:            UI.red,
  red2:           UI.red2,
  green:          UI.green,
  emerald:        UI.emerald,
  teal:           UI.teal,
  blue:           UI.blue,
  purple:         UI.purple,
  ice:            UI.ice,
  mint:           UI.emerald,
  rose:           UI.rose,
  macroProtein:   UI.blue,
  macroCarbs:     UI.gold2,
  macroFat:       UI.macroFat,
  chartLine:      UI.gold,
  chartFill:      UI.borderGold,
  chartGrid:      UI.chartGrid,
  bodyStroke:     UI.bodyStroke,
  borderBright:   UI.borderGold3,
  card:           UI.surface,
  cream:          UI.gold3,
  emerald2:       UI.gold2,
  emerald3:       UI.gold3,
  cyan:           UI.ice,
  dim:            UI.dim,
  gold1:          UI.gold2,
  goldDim:        UI.goldAlpha10,
  inactive:       UI.inactive,
  label:          UI.gold3,
  mutedBright:    UI.secondaryLight,
  myBubble:       UI.borderGold3,
  otherBubble:    "rgba(20,26,34,0.90)",
  outline:        UI.borderGold,
  primary:        UI.gold,
  primaryGlow:    UI.gold2,
  searchActive:   UI.searchActive,
  searchHighlight:UI.goldAlpha40,
  secondary:      UI.secondary,
  secondaryDim:   UI.secondaryDim,
  secondaryLight: UI.secondaryLight,
  success:        UI.green,
  surfaceBright:  UI.dim,
  systemBg:       UI.dim,
  text:           UI.text,
} as const;

// ── Light palette ──────────────────────────────────────────────
const LIGHT = {
  bg:             "#F8FAFC",
  surface:        "#FFFFFF",
  surface2:       UI.fg,
  surfacePrimary: "#FFFFFF",
  border:         "rgba(226,232,240,0.8)",
  border2:        "rgba(203,213,225,0.8)",
  borderPrimary:  "rgba(203,213,225,0.9)",
  borderGold:     "rgba(217,119,6,0.15)",
  borderGold2:    "rgba(217,119,6,0.25)",
  borderGold3:    "rgba(217,119,6,0.18)",
  borderGold4:    "rgba(217,119,6,0.35)",
  fg:             "#0F172A",
  muted:          "#64748B",
  mutedGold:      UI.secondaryLight,
  gold:           UI.secondary,
  gold2:          UI.secondaryLight,
  gold3:          UI.secondaryDim,
  orange:         "#C2410C",
  orange2:        UI.orange,
  red:            UI.red2,
  red2:           "#B91C1C",
  green:          "#16A34A",
  emerald:        "#059669",
  teal:           "#0D9488",
  blue:           "#3B82F6",
  purple:         "#7C3AED",
  ice:            "#0891B2",
  mint:           "#059669",
  rose:           "#DB2777",
  macroProtein:   "#3B82F6",
  macroCarbs:     UI.secondary,
  macroFat:       UI.orange,
  chartLine:      UI.secondary,
  chartFill:      "rgba(217,119,6,0.12)",
  chartGrid:      "rgba(100,116,139,0.15)",
  bodyStroke:     "rgba(217,119,6,0.45)",
  borderBright:   "rgba(217,119,6,0.18)",
  card:           "#FFFFFF",
  cream:          UI.secondaryDim,
  emerald2:       UI.secondaryLight,
  emerald3:       UI.secondaryDim,
  cyan:           "#0891B2",
  dim:            "rgba(217,119,6,0.06)",
  gold1:          UI.secondaryLight,
  goldDim:        "rgba(217,119,6,0.08)",
  inactive:       UI.text,
  label:          UI.secondaryDim,
  mutedBright:    UI.secondary,
  myBubble:       "rgba(217,119,6,0.12)",
  otherBubble:    "rgba(241,245,249,0.90)",
  outline:        "rgba(217,119,6,0.15)",
  primary:        UI.secondary,
  primaryGlow:    UI.secondaryLight,
  searchActive:   "rgba(217,119,6,0.70)",
  searchHighlight:"rgba(217,119,6,0.30)",
  secondary:      UI.secondaryLight,
  secondaryDim:   UI.gold3,
  secondaryLight: UI.secondary,
  success:        "#16A34A",
  surfaceBright:  "rgba(217,119,6,0.06)",
  systemBg:       "rgba(217,119,6,0.06)",
  text:           UI.inactive,
} as const;

export type UIColors = { [K in keyof typeof DARK]: string };

/**
 * Returns theme-aware UI colors. Drop-in replacement for the static SF/UI/C imports.
 */
export function useUI(): UIColors {
  const { colorScheme } = useThemeContext();
  return useMemo(() => (colorScheme === "light" ? LIGHT : DARK) as UIColors, [colorScheme]);
}
