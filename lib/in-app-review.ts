/**
 * In-app review prompt manager.
 *
 * Uses expo-store-review to trigger the native review dialog
 * at strategic moments (after completing workouts, hitting milestones, etc.).
 *
 * Respects Apple & Google guidelines:
 * - Don't prompt too frequently
 * - Don't prompt on first launch
 * - Let the OS decide whether to actually show the dialog
 */

import * as StoreReview from "expo-store-review";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const STORAGE_KEYS = {
  lastPromptDate: "pp_review_last_prompt",
  promptCount: "pp_review_prompt_count",
  sessionActions: "pp_review_session_actions",
  installDate: "pp_review_install_date",
};

/** Minimum days between review prompts */
const MIN_DAYS_BETWEEN_PROMPTS = 45;

/** Minimum days after install before first prompt */
const MIN_DAYS_AFTER_INSTALL = 3;

/** Maximum number of lifetime prompts */
const MAX_LIFETIME_PROMPTS = 4;

/** Number of positive actions in a session before considering a prompt */
const ACTIONS_THRESHOLD = 3;

// ── Trigger Events ──

export type ReviewTrigger =
  | "workout_completed"
  | "goal_achieved"
  | "streak_milestone"
  | "plan_generated"
  | "body_scan_improved"
  | "weekly_summary_positive";

/**
 * Record a positive user action. When enough positive actions accumulate
 * in a session, the next call with shouldPrompt=true may trigger the dialog.
 */
export async function recordPositiveAction(trigger: ReviewTrigger): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.sessionActions);
    const count = raw ? parseInt(raw, 10) + 1 : 1;
    await AsyncStorage.setItem(STORAGE_KEYS.sessionActions, count.toString());
  } catch {
    // Non-critical — silently ignore
  }
}

/**
 * Attempt to show the native in-app review dialog.
 * Respects rate limits and guidelines. The OS may still decide not to show it.
 *
 * Call this after positive moments (workout completion, goal hit, etc.)
 */
export async function maybeRequestReview(trigger: ReviewTrigger): Promise<boolean> {
  try {
    // Check platform support
    if (Platform.OS === "web") return false;
    const isAvailable = await StoreReview.isAvailableAsync();
    if (!isAvailable) return false;

    // Record the action
    await recordPositiveAction(trigger);

    // Check if enough positive actions have occurred this session
    const actionsRaw = await AsyncStorage.getItem(STORAGE_KEYS.sessionActions);
    const sessionActions = actionsRaw ? parseInt(actionsRaw, 10) : 0;
    if (sessionActions < ACTIONS_THRESHOLD) return false;

    // Check install date (don't prompt new users)
    const installDateRaw = await AsyncStorage.getItem(STORAGE_KEYS.installDate);
    if (!installDateRaw) {
      // First time — record install date
      await AsyncStorage.setItem(STORAGE_KEYS.installDate, Date.now().toString());
      return false;
    }
    const daysSinceInstall = (Date.now() - parseInt(installDateRaw, 10)) / 86_400_000;
    if (daysSinceInstall < MIN_DAYS_AFTER_INSTALL) return false;

    // Check lifetime prompt count
    const countRaw = await AsyncStorage.getItem(STORAGE_KEYS.promptCount);
    const lifetimePrompts = countRaw ? parseInt(countRaw, 10) : 0;
    if (lifetimePrompts >= MAX_LIFETIME_PROMPTS) return false;

    // Check time since last prompt
    const lastRaw = await AsyncStorage.getItem(STORAGE_KEYS.lastPromptDate);
    if (lastRaw) {
      const daysSinceLastPrompt = (Date.now() - parseInt(lastRaw, 10)) / 86_400_000;
      if (daysSinceLastPrompt < MIN_DAYS_BETWEEN_PROMPTS) return false;
    }

    // All checks passed — request review
    await StoreReview.requestReview();

    // Update tracking
    await AsyncStorage.setItem(STORAGE_KEYS.lastPromptDate, Date.now().toString());
    await AsyncStorage.setItem(STORAGE_KEYS.promptCount, (lifetimePrompts + 1).toString());
    await AsyncStorage.setItem(STORAGE_KEYS.sessionActions, "0"); // Reset session counter

    return true;
  } catch {
    return false;
  }
}

/**
 * Record install date on first app launch.
 * Call this once in the root layout.
 */
export async function initReviewTracking(): Promise<void> {
  try {
    const existing = await AsyncStorage.getItem(STORAGE_KEYS.installDate);
    if (!existing) {
      await AsyncStorage.setItem(STORAGE_KEYS.installDate, Date.now().toString());
    }
    // Reset session action counter on each app launch
    await AsyncStorage.setItem(STORAGE_KEYS.sessionActions, "0");
  } catch {
    // Non-critical
  }
}

/**
 * Check if the app has a store page (useful for showing "Rate Us" in settings).
 */
export async function hasStoreReviewAction(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  return StoreReview.hasAction();
}

/**
 * Open the store page directly (for a "Rate Us" button in settings).
 */
export function openStoreListing(): void {
  const storeUrl = Platform.select({
    ios: "https://apps.apple.com/app/peakpulse-ai/id_PLACEHOLDER",
    android: "https://play.google.com/store/apps/details?id=com.peakpulseai.app",
  });
  if (storeUrl) {
    // Use Linking to open, imported lazily to keep this module lightweight
    const { Linking } = require("react-native");
    Linking.openURL(storeUrl);
  }
}
