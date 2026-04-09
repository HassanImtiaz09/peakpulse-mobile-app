/**
 * Theme-aware UI color hook.
 *
 * Returns the same shape as the old static `SF`/`UI`/`C` constants
 * from `@/constants/ui-colors`, but resolves colors based on the
 * current light/dark theme.
 *
 * Usage (drop-in replacement):
 *   // Before: import { UI as SF } from "@/constants/ui-colors";
 *   // After:  const SF = useUI();
 */
import { useMemo } from "react";
import { useThemeContext } from "@/lib/theme-provider";

// ── Dark palette (original) ────────────────────────────────────
const DARK = {
  bg:             "#0A0E14",
  surface:        "#141A22",
  surface2:       "#1A2030",
  surfacePrimary: "#141A22",
  border:         "rgba(30,41,59,0.6)",
  border2:        "rgba(30,41,59,0.8)",
  borderPrimary:  "rgba(30,41,59,0.9)",
  borderGold:     "rgba(245,158,11,0.15)",
  borderGold2:    "rgba(245,158,11,0.25)",
  borderGold3:    "rgba(245,158,11,0.18)",
  borderGold4:    "rgba(245,158,11,0.35)",
  fg:             "#F1F5F9",
  muted:          "#94A3B8",
  mutedGold:      "#D97706",
  gold:           "#F59E0B",
  gold2:          "#FBBF24",
  gold3:          "#FDE68A",
  orange:         "#EA580C",
  orange2:        "#F97316",
  red:            "#EF4444",
  red2:           "#DC2626",
  green:          "#22C55E",
  emerald:        "#10B981",
  teal:           "#14B8A6",
  blue:           "#60A5FA",
  purple:         "#A78BFA",
  ice:            "#22D3EE",
  mint:           "#10B981",
  rose:           "#F472B6",
  macroProtein:   "#60A5FA",
  macroCarbs:     "#FBBF24",
  macroFat:       "#FB923C",
  chartLine:      "#F59E0B",
  chartFill:      "rgba(245,158,11,0.15)",
  chartGrid:      "rgba(100,116,139,0.2)",
  bodyStroke:     "rgba(245,178,50,0.45)",
  borderBright:   "rgba(245,158,11,0.18)",
  card:           "#141A22",
  cream:          "#FDE68A",
  emerald2:       "#FBBF24",
  emerald3:       "#FDE68A",
  cyan:           "#22D3EE",
  dim:            "rgba(245,158,11,0.08)",
  gold1:          "#FBBF24",
  goldDim:        "rgba(245,158,11,0.10)",
  inactive:       "#1E293B",
  label:          "#FDE68A",
  mutedBright:    "#B45309",
  myBubble:       "rgba(245,158,11,0.18)",
  otherBubble:    "rgba(20,26,34,0.90)",
  outline:        "rgba(245,158,11,0.15)",
  primary:        "#F59E0B",
  primaryGlow:    "#FBBF24",
  searchActive:   "rgba(245,158,11,0.70)",
  searchHighlight:"rgba(245,158,11,0.40)",
  secondary:      "#D97706",
  secondaryDim:   "#92400E",
  secondaryLight: "#B45309",
  success:        "#22C55E",
  surfaceBright:  "rgba(245,158,11,0.08)",
  systemBg:       "rgba(245,158,11,0.08)",
  text:           "#E2E8F0",
} as const;

// ── Light palette ──────────────────────────────────────────────
const LIGHT = {
  bg:             "#F8FAFC",
  surface:        "#FFFFFF",
  surface2:       "#F1F5F9",
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
  mutedGold:      "#B45309",
  gold:           "#D97706",
  gold2:          "#B45309",
  gold3:          "#92400E",
  orange:         "#C2410C",
  orange2:        "#EA580C",
  red:            "#DC2626",
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
  macroCarbs:     "#D97706",
  macroFat:       "#EA580C",
  chartLine:      "#D97706",
  chartFill:      "rgba(217,119,6,0.12)",
  chartGrid:      "rgba(100,116,139,0.15)",
  bodyStroke:     "rgba(217,119,6,0.45)",
  borderBright:   "rgba(217,119,6,0.18)",
  card:           "#FFFFFF",
  cream:          "#92400E",
  emerald2:       "#B45309",
  emerald3:       "#92400E",
  cyan:           "#0891B2",
  dim:            "rgba(217,119,6,0.06)",
  gold1:          "#B45309",
  goldDim:        "rgba(217,119,6,0.08)",
  inactive:       "#E2E8F0",
  label:          "#92400E",
  mutedBright:    "#D97706",
  myBubble:       "rgba(217,119,6,0.12)",
  otherBubble:    "rgba(241,245,249,0.90)",
  outline:        "rgba(217,119,6,0.15)",
  primary:        "#D97706",
  primaryGlow:    "#B45309",
  searchActive:   "rgba(217,119,6,0.70)",
  searchHighlight:"rgba(217,119,6,0.30)",
  secondary:      "#B45309",
  secondaryDim:   "#FDE68A",
  secondaryLight: "#D97706",
  success:        "#16A34A",
  surfaceBright:  "rgba(217,119,6,0.06)",
  systemBg:       "rgba(217,119,6,0.06)",
  text:           "#1E293B",
} as const;

export type UIColors = { [K in keyof typeof DARK]: string };

/**
 * Returns theme-aware UI colors. Drop-in replacement for the static SF/UI/C imports.
 */
export function useUI(): UIColors {
  const { colorScheme } = useThemeContext();
  return useMemo(() => (colorScheme === "light" ? LIGHT : DARK) as UIColors, [colorScheme]);
}
