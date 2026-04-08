/**
 * PeakPulse AI - Pricing & Subscription Constants
 * 
 * Single source of truth for all subscription tier definitions,
 * pricing, feature access, and display metadata.
 * 
 * Tier Structure (from audit):
 *   Free    - $0/mo    - Basic features, 5 AI calls/day
 *   Starter - $4.99/mo - Extended features, 15 AI calls/day
 *   Pro     - $9.99/mo - Full features, 50 AI calls/day
 *   Elite   - $14.99/mo - Everything unlimited + priority
 */

// ─── Tier Type ───────────────────────────────────────────
export type SubscriptionTier = "free" | "starter" | "pro" | "elite";

export const TIER_ORDER: SubscriptionTier[] = ["free", "starter", "pro", "elite"];

export const TIER_RANK: Record<SubscriptionTier, number> = {
  free: 0,
  starter: 1,
  pro: 2,
  elite: 3,
};

// ─── Pricing ─────────────────────────────────────────────
export interface TierPricing {
  monthly: number;
  yearly: number;        // per month when billed yearly
  yearlyTotal: number;   // total yearly charge
  savingsPercent: number; // % saved vs monthly
}

export const TIER_PRICING: Record<SubscriptionTier, TierPricing> = {
  free: {
    monthly: 0,
    yearly: 0,
    yearlyTotal: 0,
    savingsPercent: 0,
  },
  starter: {
    monthly: 4.99,
    yearly: 3.99,
    yearlyTotal: 47.88,
    savingsPercent: 20,
  },
  pro: {
    monthly: 9.99,
    yearly: 7.99,
    yearlyTotal: 95.88,
    savingsPercent: 20,
  },
  elite: {
    monthly: 14.99,
    yearly: 11.99,
    yearlyTotal: 143.88,
    savingsPercent: 20,
  },
};

// ─── Store Product IDs ───────────────────────────────────
export const STORE_PRODUCT_IDS: Record<SubscriptionTier, { monthly: string; yearly: string } | null> = {
  free: null,
  starter: {
    monthly: "com.peakpulse.starter.monthly",
    yearly: "com.peakpulse.starter.yearly",
  },
  pro: {
    monthly: "com.peakpulse.pro.monthly",
    yearly: "com.peakpulse.pro.yearly",
  },
  elite: {
    monthly: "com.peakpulse.elite.monthly",
    yearly: "com.peakpulse.elite.yearly",
  },
};

// ─── AI Call Limits ──────────────────────────────────────
export const AI_CALL_LIMITS: Record<SubscriptionTier, { daily: number; isUnlimited: boolean }> = {
  free: { daily: 5, isUnlimited: false },
  starter: { daily: 15, isUnlimited: false },
  pro: { daily: 50, isUnlimited: false },
  elite: { daily: 999, isUnlimited: true },
};

// ─── Feature Definitions ─────────────────────────────────
export type FeatureKey =
  | "calorie_estimator"
  | "gym_finder"
  | "basic_tracking"
  | "community_feed"
  | "ai_meal_plans"
  | "body_scan"
  | "wearable_sync"
  | "social_feed"
  | "form_checker"
  | "challenges"
  | "ai_coaching"
  | "unlimited_history"
  | "advanced_analytics"
  | "priority_support"
  | "custom_programs"
  | "streak_freeze"
  | "achievements"
  | "weekly_challenges"
  | "comeback_notifications";

export const FEATURE_TIERS: Record<FeatureKey, SubscriptionTier> = {
  // Free tier features
  calorie_estimator: "free",
  gym_finder: "free",
  basic_tracking: "free",
  community_feed: "free",
  comeback_notifications: "free",

  // Starter tier features
  ai_meal_plans: "starter",
  body_scan: "starter",
  wearable_sync: "starter",
  social_feed: "starter",
  streak_freeze: "starter",
  achievements: "starter",
  weekly_challenges: "starter",

  // Pro tier features
  form_checker: "pro",
  challenges: "pro",
  ai_coaching: "pro",
  unlimited_history: "pro",

  // Elite tier features
  advanced_analytics: "elite",
  priority_support: "elite",
  custom_programs: "elite",
};

// ─── Display Metadata ────────────────────────────────────
export interface TierDisplayInfo {
  name: string;
  tagline: string;
  color: string;         // primary brand color
  badgeColor: string;    // background for tier badge
  icon: string;          // emoji icon
  features: string[];    // marketing feature list
  highlighted: boolean;  // show as "recommended"
}

export const TIER_DISPLAY: Record<SubscriptionTier, TierDisplayInfo> = {
  free: {
    name: "Free",
    tagline: "Get started with the basics",
    color: "#6B7280",
    badgeColor: "#F3F4F6",
    icon: "🏃",
    features: [
      "5 AI-powered calorie estimates per day",
      "Basic workout tracking",
      "Gym finder",
      "Community feed access",
    ],
    highlighted: false,
  },
  starter: {
    name: "Starter",
    tagline: "Level up your fitness journey",
    color: "#3B82F6",
    badgeColor: "#DBEAFE",
    icon: "⚡",
    features: [
      "15 AI calls per day",
      "AI meal plans & nutrition",
      "Body composition scan",
      "Wearable device sync",
      "Streak freeze protection",
      "Achievement badges",
      "Weekly challenges",
    ],
    highlighted: false,
  },
  pro: {
    name: "Pro",
    tagline: "Unlock your full potential",
    color: "#8B5CF6",
    badgeColor: "#EDE9FE",
    icon: "🔥",
    features: [
      "50 AI calls per day",
      "AI form checker with video",
      "Advanced challenges & competitions",
      "Personal AI coaching sessions",
      "Unlimited workout history",
      "Everything in Starter",
    ],
    highlighted: true,
  },
  elite: {
    name: "Elite",
    tagline: "The ultimate fitness experience",
    color: "#F59E0B",
    badgeColor: "#FEF3C7",
    icon: "👑",
    features: [
      "Unlimited AI calls",
      "Advanced analytics & insights",
      "Priority support",
      "Custom training programs",
      "Early access to new features",
      "Everything in Pro",
    ],
    highlighted: false,
  },
};

// ─── Helper Functions ────────────────────────────────────

/** Check if a tier has access to a feature */
export function tierHasAccess(userTier: SubscriptionTier, feature: FeatureKey): boolean {
  const requiredTier = FEATURE_TIERS[feature];
  return TIER_RANK[userTier] >= TIER_RANK[requiredTier];
}

/** Get the minimum tier required for a feature */
export function getRequiredTier(feature: FeatureKey): SubscriptionTier {
  return FEATURE_TIERS[feature];
}

/** Check if user can make more AI calls today */
export function canMakeAICall(tier: SubscriptionTier, callsMadeToday: number): boolean {
  const limits = AI_CALL_LIMITS[tier];
  if (limits.isUnlimited) return true;
  return callsMadeToday < limits.daily;
}

/** Get remaining AI calls for the day */
export function getRemainingAICalls(tier: SubscriptionTier, callsMadeToday: number): number | "unlimited" {
  const limits = AI_CALL_LIMITS[tier];
  if (limits.isUnlimited) return "unlimited";
  return Math.max(0, limits.daily - callsMadeToday);
}

/** Get formatted price string */
export function getFormattedPrice(tier: SubscriptionTier, billing: "monthly" | "yearly" = "monthly"): string {
  const pricing = TIER_PRICING[tier];
  if (tier === "free") return "Free";
  const price = billing === "monthly" ? pricing.monthly : pricing.yearly;
  return `$${price.toFixed(2)}/mo`;
}

/** Check if a tier is higher than another */
export function isHigherTier(tier: SubscriptionTier, thanTier: SubscriptionTier): boolean {
  return TIER_RANK[tier] > TIER_RANK[thanTier];
}

/** Get the next tier up (for upgrade prompts) */
export function getNextTier(currentTier: SubscriptionTier): SubscriptionTier | null {
  const currentIndex = TIER_ORDER.indexOf(currentTier);
  if (currentIndex >= TIER_ORDER.length - 1) return null;
  return TIER_ORDER[currentIndex + 1];
}

/** Get all features available at a given tier */
export function getFeaturesForTier(tier: SubscriptionTier): FeatureKey[] {
  return (Object.keys(FEATURE_TIERS) as FeatureKey[]).filter(
    (feature) => TIER_RANK[FEATURE_TIERS[feature]] <= TIER_RANK[tier]
  );
}

// ─── Trial Configuration ─────────────────────────────────
export const TRIAL_CONFIG = {
  durationDays: 7,
  trialTier: "pro" as SubscriptionTier,
  features: "Full Pro access for 7 days",
};

// ─── Legacy Tier Mapping (basic → starter) ───────────────
export function normalizeLegacyTier(tier: string): SubscriptionTier {
  if (tier === "basic") return "starter";
  if (TIER_ORDER.includes(tier as SubscriptionTier)) return tier as SubscriptionTier;
  return "free";
}
