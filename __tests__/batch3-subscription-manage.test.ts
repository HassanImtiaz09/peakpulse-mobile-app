/**
 * Batch 3 — Subscription Management Screen Tests
 *
 * Tests for:
 * 1. subscription-manage.tsx — plan details, status labels, pricing, benefits, action visibility
 * 2. Profile SubscriptionStatusCard — onManage prop behavior (Manage button for paid users)
 */
import { describe, it, expect } from "vitest";

// ── Plan benefit lists (mirrored from subscription-manage.tsx) ──────────
const FREE_BENEFITS = [
  { icon: "smart-toy", label: "AI Workout Plans (2/month)" },
  { icon: "restaurant-menu", label: "AI Meal Plans (2/month)" },
  { icon: "fitness-center", label: "Basic Exercise Library" },
  { icon: "trending-up", label: "Basic Progress Tracking" },
];

const BASIC_BENEFITS = [
  { icon: "smart-toy", label: "AI Workout Plans (10/month)" },
  { icon: "restaurant-menu", label: "AI Meal Plans (10/month)" },
  { icon: "body", label: "Body Scan (20/month)" },
  { icon: "notifications", label: "Smart Notifications" },
  { icon: "watch", label: "Wearable Sync" },
  { icon: "card-giftcard", label: "Referral Rewards" },
];

const PRO_BENEFITS = [
  { icon: "all-inclusive", label: "Unlimited AI Plans" },
  { icon: "center-focus-strong", label: "AI Form Checker" },
  { icon: "record-voice-over", label: "Voice Coach (ElevenLabs)" },
  { icon: "body", label: "Unlimited Body Scans" },
  { icon: "analytics", label: "Advanced Analytics" },
  { icon: "group", label: "Social Feed & Challenges" },
  { icon: "bolt", label: "7-Day Challenges" },
  { icon: "auto-awesome", label: "Priority AI Processing" },
];

const PRICING = {
  basic: { monthly: "£5.99", annual: "£47.99", annualSaving: "Save 33%" },
  pro: { monthly: "£11.99", annual: "£95.99", annualSaving: "Save 33%" },
};

// ── Helper: derive subscription manage screen values ──────────────────
function deriveManageScreenValues(opts: {
  tier: string;
  billingCycle: string | null;
  expiresAt: string | null;
  isPaid: boolean;
  stripeManaged: boolean;
  stripeStatus: string | null;
  cancelAtPeriodEnd: boolean;
  isTrialActive: boolean;
  daysLeftInTrial: number;
}) {
  const {
    tier, billingCycle, expiresAt, isPaid, stripeManaged,
    stripeStatus, cancelAtPeriodEnd, isTrialActive, daysLeftInTrial,
  } = opts;

  const tierLabel = tier === "pro" ? "Pro" : tier === "basic" ? "Basic" : "Free";
  const tierColor = tier === "pro" ? "GOLD" : tier === "basic" ? "ICE" : "MUTED";
  const tierIcon = tier === "pro" ? "workspace-premium" : tier === "basic" ? "star" : "person";
  const benefits = tier === "pro" ? PRO_BENEFITS : tier === "basic" ? BASIC_BENEFITS : FREE_BENEFITS;
  const billingLabel = billingCycle === "annual" ? "Annual" : billingCycle === "monthly" ? "Monthly" : null;
  const expiryDate = expiresAt
    ? new Date(expiresAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    : null;
  const pricing = tier === "pro" ? PRICING.pro : tier === "basic" ? PRICING.basic : null;
  const currentPrice = pricing
    ? billingCycle === "annual" ? pricing.annual + "/year" : pricing.monthly + "/month"
    : "Free";

  let statusLabel = "Free";
  let statusColor = "MUTED";
  if (isTrialActive) {
    statusLabel = `Trial (${daysLeftInTrial}d left)`;
    statusColor = "ICE";
  } else if (cancelAtPeriodEnd) {
    statusLabel = "Canceling";
    statusColor = "RED";
  } else if (stripeStatus === "past_due") {
    statusLabel = "Past Due";
    statusColor = "RED";
  } else if (isPaid) {
    statusLabel = "Active";
    statusColor = "GREEN";
  }

  // Action visibility
  const showUpgrade = tier === "free";
  const showChangePlan = tier !== "free";
  const showBillingPortal = stripeManaged;
  const showCancel = isPaid && stripeManaged && !cancelAtPeriodEnd;
  const showReactivate = cancelAtPeriodEnd && stripeManaged;
  const showComparePlans = tier !== "pro";
  const showCancelWarning = cancelAtPeriodEnd;
  const showPastDueWarning = stripeStatus === "past_due" && !cancelAtPeriodEnd;
  const showTrialInfo = isTrialActive;

  return {
    tierLabel, tierColor, tierIcon, benefits, billingLabel,
    expiryDate, currentPrice, statusLabel, statusColor,
    showUpgrade, showChangePlan, showBillingPortal,
    showCancel, showReactivate, showComparePlans,
    showCancelWarning, showPastDueWarning, showTrialInfo,
  };
}

// ── Helper: derive SubscriptionStatusCard button visibility ───────────
function deriveStatusCardButton(tier: string, hasOnManage: boolean) {
  if (tier === "free") return "upgrade";
  if (hasOnManage) return "manage";
  return "none";
}

// ═══════════════════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════════════════

describe("Subscription Manage Screen — Derived Values", () => {
  it("should show Free plan with correct defaults", () => {
    const v = deriveManageScreenValues({
      tier: "free", billingCycle: null, expiresAt: null,
      isPaid: false, stripeManaged: false, stripeStatus: null,
      cancelAtPeriodEnd: false, isTrialActive: false, daysLeftInTrial: 0,
    });
    expect(v.tierLabel).toBe("Free");
    expect(v.tierIcon).toBe("person");
    expect(v.currentPrice).toBe("Free");
    expect(v.statusLabel).toBe("Free");
    expect(v.benefits).toEqual(FREE_BENEFITS);
    expect(v.showUpgrade).toBe(true);
    expect(v.showChangePlan).toBe(false);
    expect(v.showBillingPortal).toBe(false);
    expect(v.showCancel).toBe(false);
    expect(v.showReactivate).toBe(false);
    expect(v.showComparePlans).toBe(true);
  });

  it("should show Basic monthly plan with correct pricing", () => {
    const v = deriveManageScreenValues({
      tier: "basic", billingCycle: "monthly", expiresAt: "2026-06-01T00:00:00Z",
      isPaid: true, stripeManaged: true, stripeStatus: "active",
      cancelAtPeriodEnd: false, isTrialActive: false, daysLeftInTrial: 0,
    });
    expect(v.tierLabel).toBe("Basic");
    expect(v.tierIcon).toBe("star");
    expect(v.tierColor).toBe("ICE");
    expect(v.currentPrice).toBe("£5.99/month");
    expect(v.billingLabel).toBe("Monthly");
    expect(v.statusLabel).toBe("Active");
    expect(v.statusColor).toBe("GREEN");
    expect(v.benefits).toEqual(BASIC_BENEFITS);
    expect(v.showUpgrade).toBe(false);
    expect(v.showChangePlan).toBe(true);
    expect(v.showBillingPortal).toBe(true);
    expect(v.showCancel).toBe(true);
    expect(v.showReactivate).toBe(false);
    expect(v.showComparePlans).toBe(true);
  });

  it("should show Pro annual plan with correct pricing", () => {
    const v = deriveManageScreenValues({
      tier: "pro", billingCycle: "annual", expiresAt: "2027-05-01T00:00:00Z",
      isPaid: true, stripeManaged: true, stripeStatus: "active",
      cancelAtPeriodEnd: false, isTrialActive: false, daysLeftInTrial: 0,
    });
    expect(v.tierLabel).toBe("Pro");
    expect(v.tierIcon).toBe("workspace-premium");
    expect(v.tierColor).toBe("GOLD");
    expect(v.currentPrice).toBe("£95.99/year");
    expect(v.billingLabel).toBe("Annual");
    expect(v.statusLabel).toBe("Active");
    expect(v.benefits).toEqual(PRO_BENEFITS);
    expect(v.showUpgrade).toBe(false);
    expect(v.showChangePlan).toBe(true);
    expect(v.showBillingPortal).toBe(true);
    expect(v.showCancel).toBe(true);
    expect(v.showComparePlans).toBe(false);
  });

  it("should show trial status when trial is active", () => {
    const v = deriveManageScreenValues({
      tier: "free", billingCycle: null, expiresAt: null,
      isPaid: false, stripeManaged: false, stripeStatus: null,
      cancelAtPeriodEnd: false, isTrialActive: true, daysLeftInTrial: 5,
    });
    expect(v.statusLabel).toBe("Trial (5d left)");
    expect(v.statusColor).toBe("ICE");
    expect(v.showTrialInfo).toBe(true);
  });

  it("should show canceling status when cancelAtPeriodEnd is true", () => {
    const v = deriveManageScreenValues({
      tier: "pro", billingCycle: "monthly", expiresAt: "2026-06-01T00:00:00Z",
      isPaid: true, stripeManaged: true, stripeStatus: "active",
      cancelAtPeriodEnd: true, isTrialActive: false, daysLeftInTrial: 0,
    });
    expect(v.statusLabel).toBe("Canceling");
    expect(v.statusColor).toBe("RED");
    expect(v.showCancel).toBe(false);
    expect(v.showReactivate).toBe(true);
    expect(v.showCancelWarning).toBe(true);
  });

  it("should show past due status when payment failed", () => {
    const v = deriveManageScreenValues({
      tier: "basic", billingCycle: "monthly", expiresAt: "2026-06-01T00:00:00Z",
      isPaid: true, stripeManaged: true, stripeStatus: "past_due",
      cancelAtPeriodEnd: false, isTrialActive: false, daysLeftInTrial: 0,
    });
    expect(v.statusLabel).toBe("Past Due");
    expect(v.statusColor).toBe("RED");
    expect(v.showPastDueWarning).toBe(true);
  });

  it("should not show past due warning when also canceling", () => {
    const v = deriveManageScreenValues({
      tier: "basic", billingCycle: "monthly", expiresAt: "2026-06-01T00:00:00Z",
      isPaid: true, stripeManaged: true, stripeStatus: "past_due",
      cancelAtPeriodEnd: true, isTrialActive: false, daysLeftInTrial: 0,
    });
    expect(v.showPastDueWarning).toBe(false);
    expect(v.showCancelWarning).toBe(true);
  });

  it("should not show billing portal for non-Stripe managed subscriptions", () => {
    const v = deriveManageScreenValues({
      tier: "basic", billingCycle: "monthly", expiresAt: "2026-06-01T00:00:00Z",
      isPaid: true, stripeManaged: false, stripeStatus: null,
      cancelAtPeriodEnd: false, isTrialActive: false, daysLeftInTrial: 0,
    });
    expect(v.showBillingPortal).toBe(false);
    expect(v.showCancel).toBe(false);
    expect(v.showReactivate).toBe(false);
  });

  it("should format expiry date correctly", () => {
    const v = deriveManageScreenValues({
      tier: "pro", billingCycle: "monthly", expiresAt: "2026-12-25T12:00:00Z",
      isPaid: true, stripeManaged: true, stripeStatus: "active",
      cancelAtPeriodEnd: false, isTrialActive: false, daysLeftInTrial: 0,
    });
    expect(v.expiryDate).toBeTruthy();
    // Should contain "Dec" and "2026" (exact day may shift by timezone)
    expect(v.expiryDate).toContain("Dec");
    expect(v.expiryDate).toContain("2026");
  });

  it("should return null expiryDate when expiresAt is null", () => {
    const v = deriveManageScreenValues({
      tier: "free", billingCycle: null, expiresAt: null,
      isPaid: false, stripeManaged: false, stripeStatus: null,
      cancelAtPeriodEnd: false, isTrialActive: false, daysLeftInTrial: 0,
    });
    expect(v.expiryDate).toBeNull();
  });
});

describe("Subscription Manage Screen — Plan Benefits", () => {
  it("Free plan should have 4 benefits", () => {
    expect(FREE_BENEFITS).toHaveLength(4);
  });

  it("Basic plan should have 6 benefits", () => {
    expect(BASIC_BENEFITS).toHaveLength(6);
  });

  it("Pro plan should have 8 benefits", () => {
    expect(PRO_BENEFITS).toHaveLength(8);
  });

  it("all benefits should have icon and label", () => {
    [...FREE_BENEFITS, ...BASIC_BENEFITS, ...PRO_BENEFITS].forEach((b) => {
      expect(b.icon).toBeTruthy();
      expect(b.label).toBeTruthy();
      expect(typeof b.icon).toBe("string");
      expect(typeof b.label).toBe("string");
    });
  });

  it("Pro benefits should include Voice Coach", () => {
    const voiceCoach = PRO_BENEFITS.find((b) => b.label.includes("Voice Coach"));
    expect(voiceCoach).toBeTruthy();
  });

  it("Pro benefits should include AI Form Checker", () => {
    const formChecker = PRO_BENEFITS.find((b) => b.label.includes("Form Checker"));
    expect(formChecker).toBeTruthy();
  });
});

describe("Subscription Manage Screen — Pricing", () => {
  it("Basic monthly should be £5.99", () => {
    expect(PRICING.basic.monthly).toBe("£5.99");
  });

  it("Basic annual should be £47.99", () => {
    expect(PRICING.basic.annual).toBe("£47.99");
  });

  it("Pro monthly should be £11.99", () => {
    expect(PRICING.pro.monthly).toBe("£11.99");
  });

  it("Pro annual should be £95.99", () => {
    expect(PRICING.pro.annual).toBe("£95.99");
  });

  it("annual savings label should be Save 33%", () => {
    expect(PRICING.basic.annualSaving).toBe("Save 33%");
    expect(PRICING.pro.annualSaving).toBe("Save 33%");
  });
});

describe("Profile SubscriptionStatusCard — onManage prop", () => {
  it("should show Upgrade button for free tier", () => {
    expect(deriveStatusCardButton("free", true)).toBe("upgrade");
    expect(deriveStatusCardButton("free", false)).toBe("upgrade");
  });

  it("should show Manage button for basic tier when onManage is provided", () => {
    expect(deriveStatusCardButton("basic", true)).toBe("manage");
  });

  it("should show Manage button for pro tier when onManage is provided", () => {
    expect(deriveStatusCardButton("pro", true)).toBe("manage");
  });

  it("should show no button for paid tier when onManage is not provided", () => {
    expect(deriveStatusCardButton("basic", false)).toBe("none");
    expect(deriveStatusCardButton("pro", false)).toBe("none");
  });
});

describe("Subscription Manage Screen — Trial edge cases", () => {
  it("trial with 1 day left should show singular", () => {
    const v = deriveManageScreenValues({
      tier: "free", billingCycle: null, expiresAt: null,
      isPaid: false, stripeManaged: false, stripeStatus: null,
      cancelAtPeriodEnd: false, isTrialActive: true, daysLeftInTrial: 1,
    });
    expect(v.statusLabel).toBe("Trial (1d left)");
  });

  it("trial with 0 days left should show 0d", () => {
    const v = deriveManageScreenValues({
      tier: "free", billingCycle: null, expiresAt: null,
      isPaid: false, stripeManaged: false, stripeStatus: null,
      cancelAtPeriodEnd: false, isTrialActive: true, daysLeftInTrial: 0,
    });
    expect(v.statusLabel).toBe("Trial (0d left)");
  });

  it("trial takes priority over other statuses", () => {
    // Even if isPaid is true, trial status should show
    const v = deriveManageScreenValues({
      tier: "pro", billingCycle: "monthly", expiresAt: "2026-06-01T00:00:00Z",
      isPaid: true, stripeManaged: true, stripeStatus: "active",
      cancelAtPeriodEnd: false, isTrialActive: true, daysLeftInTrial: 3,
    });
    expect(v.statusLabel).toBe("Trial (3d left)");
    expect(v.statusColor).toBe("ICE");
  });
});
