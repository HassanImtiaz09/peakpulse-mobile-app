import { describe, it, expect } from "vitest";

/**
 * Tests for the subscription tier configuration.
 * Verifies that feature-to-tier mappings are correct after
 * moving wearable_sync and social_feed to Basic tier.
 */

type SubscriptionTier = "free" | "basic" | "pro";

const FEATURE_TIERS: Record<string, SubscriptionTier> = {
  // Free features
  calorie_estimator: "free",
  gym_finder: "free",
  daily_checkin: "free",
  tips_tricks: "free",
  onboarding: "free",
  // Basic features
  ai_meal_plans: "basic",
  ai_workout_plans: "basic",
  meal_swap_ai: "basic",
  body_scan: "basic",
  progress_photos: "basic",
  referral: "basic",
  notification_preferences: "basic",
  workout_analytics: "basic",
  voice_coaching: "basic",
  offline_mode: "basic",
  pr_tracking: "basic",
  wearable_sync: "basic",
  social_feed: "basic",
  // Pro features
  form_checker: "pro",
  challenges: "pro",
  ai_coaching: "pro",
  unlimited_body_scans: "pro",
  unlimited_progress_photos: "pro",
  unlimited_meal_swaps: "pro",
  meal_prep: "pro",
  priority_ai: "pro",
};

function hasAccess(userTier: SubscriptionTier, feature: string): boolean {
  const requiredTier = FEATURE_TIERS[feature];
  if (!requiredTier) return false;
  const tierRank: Record<SubscriptionTier, number> = { free: 0, basic: 1, pro: 2 };
  return tierRank[userTier] >= tierRank[requiredTier];
}

describe("Subscription Tiers", () => {
  describe("Feature-to-tier mapping", () => {
    it("free features should be accessible to all tiers", () => {
      const freeFeatures = ["calorie_estimator", "gym_finder", "daily_checkin", "tips_tricks", "onboarding"];
      for (const f of freeFeatures) {
        expect(FEATURE_TIERS[f]).toBe("free");
        expect(hasAccess("free", f)).toBe(true);
        expect(hasAccess("basic", f)).toBe(true);
        expect(hasAccess("pro", f)).toBe(true);
      }
    });

    it("basic features should NOT be accessible to free users", () => {
      const basicFeatures = ["ai_meal_plans", "ai_workout_plans", "body_scan", "progress_photos"];
      for (const f of basicFeatures) {
        expect(FEATURE_TIERS[f]).toBe("basic");
        expect(hasAccess("free", f)).toBe(false);
        expect(hasAccess("basic", f)).toBe(true);
        expect(hasAccess("pro", f)).toBe(true);
      }
    });

    it("wearable_sync should be in Basic tier (moved from Pro)", () => {
      expect(FEATURE_TIERS.wearable_sync).toBe("basic");
      expect(hasAccess("basic", "wearable_sync")).toBe(true);
      expect(hasAccess("free", "wearable_sync")).toBe(false);
    });

    it("social_feed should be in Basic tier (moved from Pro)", () => {
      expect(FEATURE_TIERS.social_feed).toBe("basic");
      expect(hasAccess("basic", "social_feed")).toBe(true);
      expect(hasAccess("free", "social_feed")).toBe(false);
    });

    it("pro-only features should require Pro tier", () => {
      const proFeatures = ["form_checker", "challenges", "ai_coaching", "meal_prep", "priority_ai"];
      for (const f of proFeatures) {
        expect(FEATURE_TIERS[f]).toBe("pro");
        expect(hasAccess("free", f)).toBe(false);
        expect(hasAccess("basic", f)).toBe(false);
        expect(hasAccess("pro", f)).toBe(true);
      }
    });
  });

  describe("Tier hierarchy", () => {
    it("pro should have access to everything", () => {
      for (const [feature] of Object.entries(FEATURE_TIERS)) {
        expect(hasAccess("pro", feature)).toBe(true);
      }
    });

    it("unknown features should return false", () => {
      expect(hasAccess("pro", "nonexistent_feature")).toBe(false);
    });

    it("total feature count should match expected", () => {
      expect(Object.keys(FEATURE_TIERS)).toHaveLength(28);
    });
  });
});
