/**
 * Centralized UI color constants for all screens.
 * 
 * Previously, every screen file declared its own `SF` or `C` object with
 * identical hex values. This file consolidates them into a single source of truth.
 * 
 * Usage:
 *   import { UI } from "@/constants/ui-colors";
 *   // Then use UI.bg, UI.gold, UI.surface, etc.
 */

export const UI = {
  // ── Base surfaces ──────────────────────────────────────────
  bg:             "#0A0E14",    // Deep navy-black background
  surface:        "#141A22",    // Card/panel surface
  surface2:       "#1A2030",    // Elevated surface
  surfacePrimary: "#141A22",    // Primary surface (alias)

  // ── Borders ────────────────────────────────────────────────
  border:         "rgba(30,41,59,0.6)",
  border2:        "rgba(30,41,59,0.8)",
  borderPrimary:  "rgba(30,41,59,0.9)",
  borderGold:     "rgba(245,158,11,0.15)",
  borderGold2:    "rgba(245,158,11,0.25)",
  borderGold3:    "rgba(245,158,11,0.18)",
  borderGold4:    "rgba(245,158,11,0.35)",

  // ── Text ───────────────────────────────────────────────────
  fg:             "#F1F5F9",    // Primary text (cool white)
  muted:          "#94A3B8",    // Muted text (upgraded from #64748B for WCAG AA contrast 7.1:1)
  mutedGold:      "#D97706",    // Muted gold text (upgraded from #B45309 for contrast 5.2:1)

  // ── Brand / accent ────────────────────────────────────────
  gold:           "#F59E0B",    // Primary gold accent
  gold2:          "#FBBF24",    // Light gold
  gold3:          "#FDE68A",    // Pale gold
  orange:         "#EA580C",    // Deep orange accent
  orange2:        "#F97316",    // Medium orange

  // ── Semantic colors ────────────────────────────────────────
  red:            "#EF4444",    // Error / destructive
  red2:           "#DC2626",    // Darker red
  green:          "#22C55E",    // Success
  emerald:        "#10B981",    // Emerald (meals/nutrition)
  teal:           "#14B8A6",    // Teal accent
  blue:           "#60A5FA",    // Info blue
  purple:         "#A78BFA",    // Purple accent
  ice:            "#22D3EE",    // Ice blue (body scan)
  mint:           "#10B981",    // Mint (same as emerald)
  rose:           "#F472B6",    // Rose (protein)

  // ── Macro colors ───────────────────────────────────────────
  macroProtein:   "#60A5FA",
  macroCarbs:     "#FBBF24",
  macroFat:       "#FB923C",

  // ── Chart / data viz ───────────────────────────────────────
  chartLine:      "#F59E0B",
  chartFill:      "rgba(245,158,11,0.15)",
  chartGrid:      "rgba(100,116,139,0.2)",

  // ── Additional aliases (used by various screens) ────────
  bodyStroke:      "rgba(245,178,50,0.45)",
  borderBright:    "rgba(245,158,11,0.18)",
  card:            "#141A22",    // Alias for surface
  cream:           "#FDE68A",    // Pale gold / cream
  emerald2:        "#FBBF24",    // Legacy alias (gold redesign)
  emerald3:        "#FDE68A",    // Legacy alias (gold redesign)
  cyan:            "#22D3EE",    // Cyan accent
  dim:             "rgba(245,158,11,0.08)",
  gold1:           "#FBBF24",    // Alias for gold2
  goldDim:         "rgba(245,158,11,0.10)",
  inactive:        "#1E293B",    // Inactive/disabled surface
  label:           "#FDE68A",    // Label text (pale gold)
  mutedBright:     "#B45309",    // Brighter muted gold
  myBubble:        "rgba(245,158,11,0.18)",
  otherBubble:     "rgba(20,26,34,0.90)",
  outline:         "rgba(245,158,11,0.15)",
  primary:         "#F59E0B",    // Alias for gold
  primaryGlow:     "#FBBF24",    // Alias for gold2
  searchActive:    "rgba(245,158,11,0.70)",
  searchHighlight: "rgba(245,158,11,0.40)",
  secondary:       "#D97706",    // Alias for mutedGold
  secondaryDim:    "#92400E",    // Dim secondary
  secondaryLight:  "#B45309",    // Light secondary
  success:         "#22C55E",    // Alias for green
  surfaceBright:   "rgba(245,158,11,0.08)",
  systemBg:        "rgba(245,158,11,0.08)",
  text:            "#E2E8F0",    // Alias for fg (slightly warmer)
} as const;

export type UIColorKey = keyof typeof UI;

/**
 * Legacy aliases for backward compatibility.
 * If a screen used `SF.emerald2`, it maps to `UI.gold2` (the golden redesign
 * replaced emerald with gold but some screens kept the old property names).
 */
export const SF = {
  ...UI,
  emerald:  UI.gold,      // Legacy mapping
  emerald2: UI.gold2,
  emerald3: UI.gold3,
  teal2:    UI.orange2,
} as const;

/**
 * Shorter alias used by some screens (workout-analytics, workout-timer-coach).
 */
export const C = UI;
