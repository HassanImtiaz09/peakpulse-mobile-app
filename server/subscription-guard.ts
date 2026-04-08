/**
 * Server-side subscription verification for premium features.
 *
 * Validates that the user's subscription tier allows access to the
 * requested feature, preventing client-side bypass of paywalls.
 *
 * Updated to use centralized pricing constants and the new 4-tier
 * system: Free / Starter / Pro / Elite
 */

import { TRPCError } from "@trpc/server";
import {
  type SubscriptionTier,
  TIER_RANK,
  normalizeLegacyTier,
} from "@/constants/pricing";

// Re-export for server-side consumers
export type { SubscriptionTier };

/**
 * Server-side feature-to-minimum-tier mapping.
 * This may differ slightly from the client FEATURE_TIERS
 * because the server enforces stricter access for sensitive operations.
 */
export const FEATURE_REQUIREMENTS: Record<string, SubscriptionTier> = {
  // Free features
  basic_tracking: "free",
  workout_log: "free",
  meal_log: "free",

  // Starter tier (formerly "basic")
  ai_coach_basic: "starter",
  wearable_sync: "starter",
  social_feed: "starter",
  custom_meals: "starter",
  streak_freeze: "starter",
  achievements: "starter",
  weekly_challenges: "starter",

  // Pro tier
  ai_plan_generation: "pro",
  body_scan: "pro",
  advanced_analytics: "pro",
  nutrition_insights: "pro",
  workout_ai_suggestions: "pro",
  form_checker: "pro",
  ai_coaching: "pro",

  // Elite tier
  unlimited_ai: "elite",
  personal_coaching: "elite",
  priority_support: "elite",
  body_scan_unlimited: "elite",
  custom_programs: "elite",
};

/**
 * Check if a subscription tier has access to a feature.
 */
export function tierHasAccess(
  userTier: SubscriptionTier,
  feature: string,
): boolean {
  const requiredTier = FEATURE_REQUIREMENTS[feature];
  if (!requiredTier) {
    // Unknown features default to requiring pro tier for safety
    console.warn(`[SubscriptionGuard] Unknown feature: ${feature}, defaulting to pro`);
    return TIER_RANK[userTier] >= TIER_RANK.pro;
  }
  return TIER_RANK[userTier] >= TIER_RANK[requiredTier];
}

/**
 * tRPC guard — throws if user lacks the required subscription tier.
 *
 * Usage in a tRPC procedure:
 *   assertSubscription(ctx.userTier, 'ai_plan_generation');
 */
export function assertSubscription(
  userTier: SubscriptionTier | string | undefined,
  feature: string,
): void {
  // Normalize legacy "basic" tier to "starter"
  const tier = normalizeLegacyTier(userTier ?? "free");

  if (!tierHasAccess(tier, feature)) {
    const required = FEATURE_REQUIREMENTS[feature] ?? "pro";
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `This feature requires a ${required} subscription or higher.`,
    });
  }
}

/**
 * Verify subscription status from the store receipt (Apple/Google).
 *
 * In production, this should validate the receipt with Apple's /verifyReceipt
 * or Google Play Developer API. For now, this trusts the database tier
 * and logs a warning — replace with real validation before store launch.
 *
 * @param userId - The user ID to verify
 * @param dbTier - The tier stored in the database
 * @returns The verified and normalized tier
 */
export async function verifySubscriptionReceipt(
  userId: string,
  dbTier: string,
): Promise<SubscriptionTier> {
  // Normalize legacy tier names (basic → starter)
  const normalizedTier = normalizeLegacyTier(dbTier);

  // TODO: Implement real receipt validation with Apple/Google APIs
  // For now, trust the database but log for audit trail
  if (normalizedTier !== "free") {
    console.info(
      `[SubscriptionGuard] User ${userId} has ${normalizedTier} tier — receipt validation pending store integration`,
    );
  }

  return normalizedTier;
}

/**
 * Middleware-style guard for Express routes (non-tRPC).
 */
export function requireSubscription(feature: string) {
  return (req: any, res: any, next: any) => {
    // Normalize legacy tier names
    const userTier = normalizeLegacyTier(req.userTier ?? "free");

    if (!tierHasAccess(userTier, feature)) {
      const required = FEATURE_REQUIREMENTS[feature] ?? "pro";
      return res.status(403).json({
        error: "Subscription required",
        requiredTier: required,
        currentTier: userTier,
      });
    }
    next();
  };
}

