/**
 * Server-side subscription verification for premium features.
 *
 * Validates that the user's subscription tier allows access to the
 * requested feature, preventing client-side bypass of paywalls.
 */

import { TRPCError } from "@trpc/server";

// ── Tier definitions ──

export type SubscriptionTier = "free" | "basic" | "pro" | "elite";

const TIER_RANK: Record<SubscriptionTier, number> = {
  free: 0,
  basic: 1,
  pro: 2,
  elite: 3,
};

/**
 * Feature-to-minimum-tier mapping.
 * Update this when adding new premium features.
 */
export const FEATURE_REQUIREMENTS: Record<string, SubscriptionTier> = {
  // Free features
  basic_tracking: "free",
  workout_log: "free",
  meal_log: "free",

  // Basic tier
  ai_coach_basic: "basic",
  wearable_sync: "basic",
  social_feed: "basic",
  custom_meals: "basic",

  // Pro tier
  ai_plan_generation: "pro",
  body_scan: "pro",
  advanced_analytics: "pro",
  nutrition_insights: "pro",
  workout_ai_suggestions: "pro",

  // Elite tier
  unlimited_ai: "elite",
  personal_coaching: "elite",
  priority_support: "elite",
  body_scan_unlimited: "elite",
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
  userTier: SubscriptionTier | undefined,
  feature: string,
): void {
  const tier = userTier ?? "free";
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
 * @returns The verified tier (currently trusts DB, logs warning)
 */
export async function verifySubscriptionReceipt(
  userId: string,
  dbTier: SubscriptionTier,
): Promise<SubscriptionTier> {
  // TODO: Implement real receipt validation with Apple/Google APIs
  // For now, trust the database but log for audit trail
  if (dbTier !== "free") {
    console.info(
      `[SubscriptionGuard] User ${userId} has ${dbTier} tier — receipt validation pending store integration`,
    );
  }
  return dbTier;
}

/**
 * Middleware-style guard for Express routes (non-tRPC).
 */
export function requireSubscription(feature: string) {
  return (req: any, res: any, next: any) => {
    const userTier: SubscriptionTier = req.userTier ?? "free";
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
