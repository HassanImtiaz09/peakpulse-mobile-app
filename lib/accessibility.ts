/**
 * Accessibility utilities for PeakPulse.
 * 
 * Provides helpers for generating consistent accessibility props,
 * checking contrast ratios, and ensuring WCAG AA compliance.
 */

import { AccessibilityProps, Platform } from "react-native";

/**
 * Generate accessibility props for a button/touchable.
 */
export function a11yButton(label: string, hint?: string): AccessibilityProps {
  return {
    accessible: true,
    accessibilityRole: "button",
    accessibilityLabel: label,
    ...(hint ? { accessibilityHint: hint } : {}),
  };
}

/**
 * Generate accessibility props for a header/title.
 */
export function a11yHeader(label: string): AccessibilityProps {
  return {
    accessible: true,
    accessibilityRole: "header",
    accessibilityLabel: label,
  };
}

/**
 * Generate accessibility props for an image.
 */
export function a11yImage(label: string): AccessibilityProps {
  return {
    accessible: true,
    accessibilityRole: "image",
    accessibilityLabel: label,
  };
}

/**
 * Generate accessibility props for a tab bar item.
 */
export function a11yTab(label: string, selected: boolean): AccessibilityProps {
  return {
    accessible: true,
    accessibilityRole: "tab",
    accessibilityLabel: label,
    accessibilityState: { selected },
  };
}

/**
 * Generate accessibility props for a progress indicator.
 */
export function a11yProgress(label: string, current: number, max: number): AccessibilityProps {
  const percentage = Math.round((current / max) * 100);
  return {
    accessible: true,
    accessibilityRole: "progressbar",
    accessibilityLabel: `${label}: ${percentage}%`,
    accessibilityValue: {
      min: 0,
      max,
      now: current,
      text: `${percentage}%`,
    },
  };
}

/**
 * Generate accessibility props for a toggle/switch.
 */
export function a11ySwitch(label: string, isOn: boolean): AccessibilityProps {
  return {
    accessible: true,
    accessibilityRole: "switch",
    accessibilityLabel: label,
    accessibilityState: { checked: isOn },
  };
}

/**
 * Announce a message to screen readers (e.g., after an async action completes).
 */
export function announceForAccessibility(message: string) {
  if (Platform.OS === "ios" || Platform.OS === "android") {
    const { AccessibilityInfo } = require("react-native");
    AccessibilityInfo.announceForAccessibility(message);
  }
}

/**
 * Common accessibility labels for PeakPulse screens.
 * Use these for consistency across the app.
 */
export const A11Y_LABELS = {
  // Navigation
  backButton: "Go back",
  closeButton: "Close",
  menuButton: "Open menu",
  settingsButton: "Open settings",
  
  // Dashboard
  streakBadge: (count: number) => `${count} week streak`,
  calorieProgress: (eaten: number, goal: number) => 
    `${eaten} of ${goal} calories consumed today`,
  macroProgress: (name: string, current: number, target: number) =>
    `${name}: ${current} of ${target} grams`,
  
  // Workout
  startWorkout: "Start workout",
  completeSet: (set: number, total: number) => `Complete set ${set} of ${total}`,
  restTimer: (seconds: number) => `Rest timer: ${seconds} seconds remaining`,
  
  // Meals
  logMeal: "Log a meal",
  scanFood: "Scan food with camera",
  
  // Stats
  statCard: (label: string, value: string) => `${label}: ${value}`,
} as const;
