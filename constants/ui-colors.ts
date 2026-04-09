/**
 * Centralized UI color constants for all screens.
 *
 * Uses a Proxy so that `UI.bg`, `SF.surface`, `C.fg` etc. resolve to the
 * current theme's palette at read-time. This allows StyleSheet.create() to
 * reference these values at module level while still getting theme-aware colors
 * on each render cycle.
 *
 * The active palette is updated by ThemeProvider via `setUIColorScheme()`.
 *
 * Usage (unchanged from before):
 *   import { UI } from "@/constants/ui-colors";
 *   // UI.bg, UI.fg, etc. resolve to the active theme's colors
 */

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
  // Alpha-blended decorative overlays
  goldAlpha4:     "rgba(245,158,11,0.04)",
  goldAlpha5:     "rgba(245,158,11,0.05)",
  goldAlpha6:     "rgba(245,158,11,0.06)",
  goldAlpha10:    "rgba(245,158,11,0.10)",
  goldAlpha12:    "rgba(245,158,11,0.12)",
  goldAlpha20:    "rgba(245,158,11,0.20)",
  goldAlpha30:    "rgba(245,158,11,0.30)",
  goldAlpha40:    "rgba(245,158,11,0.40)",
  goldAlpha50:    "rgba(245,158,11,0.50)",
  goldAlpha85:    "rgba(245,158,11,0.85)",
  slateAlpha25:   "rgba(30,41,59,0.25)",
  slateAlpha40:   "rgba(30,41,59,0.40)",
  slateAlpha50:   "rgba(30,41,59,0.50)",
} as const;

// ── Light palette (warm cream/amber — NOT plain white) ────────
const LIGHT = {
  bg:             "#FFF8F0",          // Warm cream background
  surface:        "#FFF1E0",          // Warm peach surface
  surface2:       "#FFE8CC",          // Slightly deeper warm surface
  surfacePrimary: "#FFF5E6",          // Warm white-gold surface
  border:         "rgba(180,83,9,0.15)",   // Warm amber border
  border2:        "rgba(180,83,9,0.22)",
  borderPrimary:  "rgba(180,83,9,0.28)",
  borderGold:     "rgba(180,83,9,0.12)",
  borderGold2:    "rgba(180,83,9,0.20)",
  borderGold3:    "rgba(180,83,9,0.16)",
  borderGold4:    "rgba(180,83,9,0.30)",
  fg:             "#1C1917",          // Warm black text
  muted:          "#78716C",          // Warm stone muted
  mutedGold:      "#92400E",          // Deep amber muted
  gold:           "#B45309",          // Rich amber gold
  gold2:          "#92400E",          // Deep amber
  gold3:          "#78350F",          // Darkest amber
  orange:         "#C2410C",          // Deep orange
  orange2:        "#EA580C",          // Bright orange
  red:            "#DC2626",
  red2:           "#B91C1C",
  green:          "#16A34A",
  emerald:        "#059669",
  teal:           "#0D9488",
  blue:           "#2563EB",          // Deeper blue for contrast on warm bg
  purple:         "#7C3AED",
  ice:            "#0891B2",
  mint:           "#059669",
  rose:           "#DB2777",
  macroProtein:   "#2563EB",
  macroCarbs:     "#B45309",
  macroFat:       "#EA580C",
  chartLine:      "#B45309",
  chartFill:      "rgba(180,83,9,0.10)",
  chartGrid:      "rgba(120,113,108,0.15)",
  bodyStroke:     "rgba(180,83,9,0.40)",
  borderBright:   "rgba(180,83,9,0.16)",
  card:           "#FFF1E0",
  cream:          "#78350F",          // Deep amber (inverted for light)
  emerald2:       "#92400E",
  emerald3:       "#78350F",
  cyan:           "#0891B2",
  dim:            "rgba(180,83,9,0.05)",
  gold1:          "#92400E",
  goldDim:        "rgba(180,83,9,0.06)",
  inactive:       "#E7D5C0",          // Warm tan inactive
  label:          "#78350F",
  mutedBright:    "#B45309",
  myBubble:       "rgba(180,83,9,0.10)",
  otherBubble:    "rgba(255,241,224,0.90)",
  outline:        "rgba(180,83,9,0.12)",
  primary:        "#B45309",
  primaryGlow:    "#92400E",
  searchActive:   "rgba(180,83,9,0.60)",
  searchHighlight:"rgba(180,83,9,0.25)",
  secondary:      "#92400E",
  secondaryDim:   "#FDE68A",
  secondaryLight: "#B45309",
  success:        "#16A34A",
  surfaceBright:  "rgba(180,83,9,0.05)",
  systemBg:       "rgba(180,83,9,0.05)",
  text:           "#292524",          // Warm dark text
  // Alpha-blended decorative overlays (warm amber for light mode)
  goldAlpha4:     "rgba(180,83,9,0.04)",
  goldAlpha5:     "rgba(180,83,9,0.05)",
  goldAlpha6:     "rgba(180,83,9,0.05)",
  goldAlpha10:    "rgba(180,83,9,0.08)",
  goldAlpha12:    "rgba(180,83,9,0.08)",
  goldAlpha20:    "rgba(180,83,9,0.14)",
  goldAlpha30:    "rgba(180,83,9,0.20)",
  goldAlpha40:    "rgba(180,83,9,0.28)",
  goldAlpha50:    "rgba(180,83,9,0.35)",
  goldAlpha85:    "rgba(180,83,9,0.75)",
  slateAlpha25:   "rgba(120,113,108,0.12)",
  slateAlpha40:   "rgba(120,113,108,0.18)",
  slateAlpha50:   "rgba(120,113,108,0.22)",
} as const;

// ── Reactive color store ───────────────────────────────────────
type UIColorKey = keyof typeof DARK;
type UIColorMap = Record<UIColorKey, string>;

let _activeScheme: "light" | "dark" = "dark";

/**
 * Called by ThemeProvider whenever the resolved color scheme changes.
 * This updates which palette the Proxy-based UI/SF/C objects read from.
 */
export function setUIColorScheme(scheme: "light" | "dark") {
  _activeScheme = scheme;
}

/** Get the current active scheme (for tests or debugging). */
export function getUIColorScheme(): "light" | "dark" {
  return _activeScheme;
}

function createReactiveProxy(): UIColorMap {
  return new Proxy({} as UIColorMap, {
    get(_target, prop: string) {
      const palette = _activeScheme === "light" ? LIGHT : DARK;
      return (palette as any)[prop];
    },
    ownKeys() {
      return Object.keys(DARK);
    },
    getOwnPropertyDescriptor(_target, prop: string) {
      const palette = _activeScheme === "light" ? LIGHT : DARK;
      if (prop in palette) {
        return { configurable: true, enumerable: true, value: (palette as any)[prop] };
      }
      return undefined;
    },
  });
}

/**
 * Primary reactive color object. All property reads resolve to the
 * current theme's palette at access time.
 */
export const UI = createReactiveProxy();

/**
 * Legacy aliases for backward compatibility.
 */
export const SF = UI;

/**
 * Shorter alias used by some screens (workout-analytics, workout-timer-coach).
 */
export const C = UI;

export type { UIColorKey };
