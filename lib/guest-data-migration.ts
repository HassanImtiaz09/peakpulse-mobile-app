/**
 * Guest Data Migration Service
 * 
 * When a guest user signs up for a real account, this service collects
 * all locally-stored data from AsyncStorage and uploads it to the server
 * via tRPC, then cleans up the local storage.
 * 
 * Call `migrateGuestDataToAccount()` immediately after successful signup/login.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

// ── AsyncStorage keys used by guest mode ─────────────────────────────────────
const GUEST_STORAGE_KEYS = {
  profile:          "@peakpulse_guest_profile",
  onboardingData:   "@peakpulse_onboarding_data",
  workoutPlan:      "@peakpulse_workout_plan",
  mealPlan:         "@peakpulse_meal_plan",
  todayMeals:       "@peakpulse_today_meals",
  calorieGoal:      "@peakpulse_calorie_goal",
  macroTargets:     "@user_macro_targets",
  mealFavourites:   "@peakpulse_meal_favourites",
  progressPhotos:   "@peakpulse_progress_photos",
  workoutSessions:  "@peakpulse_workout_sessions",
  personalRecords:  "@peakpulse_personal_records",
  streakData:       "@peakpulse_streak",
  weeklyGoals:      "@peakpulse_weekly_goals",
  bodyScans:        "@peakpulse_body_scans",
  pantryItems:      "@peakpulse_pantry_items",
  profilePhoto:     "@peakpulse_profile_photo",
  displayName:      "@peakpulse_display_name",
  subscription:     "@peakpulse_subscription",
  preferences:      "@peakpulse_preferences",
} as const;

export interface MigrationResult {
  success: boolean;
  migratedItems: string[];
  failedItems: string[];
  totalItemsFound: number;
  errors: string[];
}

/**
 * Collect all guest data from AsyncStorage.
 * Returns a map of key → parsed JSON value for all non-null entries.
 */
export async function collectGuestData(): Promise<Record<string, unknown>> {
  const data: Record<string, unknown> = {};
  const keys = Object.values(GUEST_STORAGE_KEYS);

  const pairs = await AsyncStorage.multiGet(keys);
  for (const [key, value] of pairs) {
    if (value !== null) {
      try {
        data[key] = JSON.parse(value);
      } catch {
        data[key] = value; // Store as raw string if not JSON
      }
    }
  }

  return data;
}

/**
 * Check if there is any guest data worth migrating.
 */
export async function hasGuestDataToMigrate(): Promise<boolean> {
  const criticalKeys = [
    GUEST_STORAGE_KEYS.workoutSessions,
    GUEST_STORAGE_KEYS.todayMeals,
    GUEST_STORAGE_KEYS.progressPhotos,
    GUEST_STORAGE_KEYS.workoutPlan,
    GUEST_STORAGE_KEYS.mealPlan,
    GUEST_STORAGE_KEYS.bodyScans,
    GUEST_STORAGE_KEYS.personalRecords,
  ];

  const pairs = await AsyncStorage.multiGet(criticalKeys);
  return pairs.some(([, value]) => {
    if (!value) return false;
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.length > 0;
      if (typeof parsed === "object" && parsed !== null) return Object.keys(parsed).length > 0;
      return true;
    } catch {
      return false;
    }
  });
}

/**
 * Migrate all guest data to the authenticated user's server account.
 * 
 * @param uploadFn - The tRPC mutation function to upload data to server.
 *                   Signature: (key: string, data: unknown) => Promise<void>
 * @param cleanupAfter - Whether to delete local data after successful migration (default: true)
 */
export async function migrateGuestDataToAccount(
  uploadFn: (key: string, data: unknown) => Promise<void>,
  cleanupAfter = true,
): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: false,
    migratedItems: [],
    failedItems: [],
    totalItemsFound: 0,
    errors: [],
  };

  try {
    const guestData = await collectGuestData();
    const entries = Object.entries(guestData);
    result.totalItemsFound = entries.length;

    if (entries.length === 0) {
      result.success = true;
      return result;
    }

    // Upload each data type to the server
    for (const [key, value] of entries) {
      try {
        await uploadFn(key, value);
        result.migratedItems.push(key);
      } catch (err: any) {
        result.failedItems.push(key);
        result.errors.push(`${key}: ${err?.message ?? "Unknown error"}`);
      }
    }

    // Clean up local storage if all critical items succeeded
    if (cleanupAfter && result.failedItems.length === 0) {
      await AsyncStorage.multiRemove(Object.values(GUEST_STORAGE_KEYS));
    }

    result.success = result.failedItems.length === 0;
  } catch (err: any) {
    result.errors.push(`Migration failed: ${err?.message ?? "Unknown error"}`);
  }

  return result;
}

/**
 * Show a migration prompt to the user after they sign up.
 * Returns true if user wants to migrate, false if they want fresh start.
 */
export function getMigrationPromptConfig() {
  return {
    title: "Import Your Data?",
    message:
      "We found workout sessions, meal logs, and other data from your guest account. " +
      "Would you like to import it into your new account?",
    confirmLabel: "Import My Data",
    cancelLabel: "Start Fresh",
  };
}
