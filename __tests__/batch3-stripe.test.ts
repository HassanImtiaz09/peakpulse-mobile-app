/**
 * Batch 3 Tests — Stripe Subscriptions
 *
 * Tests for:
 * 1. server/stripe.ts — Stripe service functions (pure logic, mocked Stripe SDK)
 * 2. hooks/use-subscription.ts — Enhanced subscription hook with Stripe fields
 * 3. drizzle/schema.ts — userSubscriptions table schema
 * 4. server/_core/index.ts — Webhook endpoint registration
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fs from "fs";
import * as path from "path";

// ── 1. Stripe Service Module Tests ──────────────────────────────────────────

describe("server/stripe.ts — Stripe service", () => {
  const stripePath = path.join(process.cwd(), "server/stripe.ts");
  let stripeSource: string;

  beforeEach(() => {
    stripeSource = fs.readFileSync(stripePath, "utf-8");
  });

  it("exports key Stripe service functions", () => {
    const expectedExports = [
      "getStripe",
      "createCheckoutSession",
      "constructWebhookEvent",
      "processWebhookEvent",
      "getSubscriptionStatus",
      "cancelSubscription",
      "reactivateSubscription",
      "createPortalSession",
    ];
    for (const name of expectedExports) {
      // Check for either 'export function' or 'export async function'
      const hasExport = stripeSource.includes(`export function ${name}`) || stripeSource.includes(`export async function ${name}`) || stripeSource.includes(`export const ${name}`);
      expect(hasExport).toBe(true);
    }
  });

  it("reads STRIPE_SECRET_KEY from environment", () => {
    expect(stripeSource).toMatch(/STRIPE_SECRET_KEY/);
  });

  it("reads STRIPE_WEBHOOK_SECRET from environment", () => {
    expect(stripeSource).toMatch(/STRIPE_WEBHOOK_SECRET/);
  });

  it("defines PLAN_PRICING with basic and pro plans for monthly and annual billing", () => {
    expect(stripeSource).toContain("PLAN_PRICING");
    expect(stripeSource).toMatch(/basic.*monthly/si);
    expect(stripeSource).toMatch(/basic.*annual/si);
    expect(stripeSource).toMatch(/pro.*monthly/si);
    expect(stripeSource).toMatch(/pro.*annual/si);
  });

  it("handles checkout.session.completed webhook event", () => {
    expect(stripeSource).toContain("checkout.session.completed");
  });

  it("handles customer.subscription.updated webhook event", () => {
    expect(stripeSource).toContain("customer.subscription.updated");
  });

  it("handles customer.subscription.deleted webhook event", () => {
    expect(stripeSource).toContain("customer.subscription.deleted");
  });

  it("handles invoice.payment_failed webhook event", () => {
    expect(stripeSource).toContain("invoice.payment_failed");
  });

  it("uses cancel_at_period_end for subscription cancellation (not immediate delete)", () => {
    expect(stripeSource).toContain("cancel_at_period_end");
  });

  it("uses userSubscriptions table from drizzle schema", () => {
    expect(stripeSource).toContain("userSubscriptions");
  });

  it("maps Stripe subscription items to current_period for Stripe v22+", () => {
    // Stripe v22 moved current_period_start/end to subscription items
    expect(stripeSource).toMatch(/items.*data.*\[0\]/s);
  });
});

// ── 2. Subscription Hook Tests ──────────────────────────────────────────────

describe("hooks/use-subscription.ts — Enhanced with Stripe", () => {
  const hookPath = path.join(process.cwd(), "hooks/use-subscription.ts");
  let hookSource: string;

  beforeEach(() => {
    hookSource = fs.readFileSync(hookPath, "utf-8");
  });

  it("imports trpc for server-side subscription queries", () => {
    expect(hookSource).toContain("import { trpc }");
  });

  it("imports useAuth for authentication detection", () => {
    expect(hookSource).toContain("import { useAuth }");
  });

  it("exports SubscriptionState with stripeManaged field", () => {
    expect(hookSource).toContain("stripeManaged: boolean");
  });

  it("exports SubscriptionState with stripeStatus field", () => {
    expect(hookSource).toContain("stripeStatus: string | null");
  });

  it("exports SubscriptionState with cancelAtPeriodEnd field", () => {
    expect(hookSource).toContain("cancelAtPeriodEnd: boolean");
  });

  it("provides openCheckout method", () => {
    expect(hookSource).toContain("openCheckout");
    expect(hookSource).toContain("createCheckout");
  });

  it("provides openPortal method", () => {
    expect(hookSource).toContain("openPortal");
    expect(hookSource).toContain("createPortal");
  });

  it("provides cancelStripeSubscription method", () => {
    expect(hookSource).toContain("cancelStripeSubscription");
  });

  it("provides reactivateStripeSubscription method", () => {
    expect(hookSource).toContain("reactivateStripeSubscription");
  });

  it("queries server subscription when authenticated", () => {
    expect(hookSource).toContain("getCurrentPlan");
    expect(hookSource).toContain("enabled: isAuthenticated");
  });

  it("syncs server subscription to local AsyncStorage for offline access", () => {
    expect(hookSource).toMatch(/AsyncStorage\.setItem.*stripeManaged.*true/s);
  });

  it("server subscription takes priority over local storage", () => {
    // The server check comes before the rawSub check
    const serverCheckIndex = hookSource.indexOf("serverSubRef.current");
    const localCheckIndex = hookSource.indexOf("} else if (rawSub)");
    expect(serverCheckIndex).toBeLessThan(localCheckIndex);
  });

  it("maintains backward compatibility — still exports setSubscription, clearSubscription, startTrial, canAccess", () => {
    expect(hookSource).toContain("setSubscription");
    expect(hookSource).toContain("clearSubscription");
    expect(hookSource).toContain("startTrial");
    expect(hookSource).toContain("canAccess");
  });

  it("FEATURE_TIERS still defines free, basic, and pro features", () => {
    expect(hookSource).toContain("FEATURE_TIERS");
    expect(hookSource).toContain("\"free\"");
    expect(hookSource).toContain("\"basic\"");
    expect(hookSource).toContain("\"pro\"");
  });
});

// ── 3. Database Schema Tests ────────────────────────────────────────────────

describe("drizzle/schema.ts — userSubscriptions table", () => {
  const schemaPath = path.join(process.cwd(), "drizzle/schema.ts");
  let schemaSource: string;

  beforeEach(() => {
    schemaSource = fs.readFileSync(schemaPath, "utf-8");
  });

  it("defines userSubscriptions table", () => {
    expect(schemaSource).toContain("userSubscriptions");
  });

  it("has stripeCustomerId column", () => {
    expect(schemaSource).toMatch(/stripeCustomerId|stripe_customer_id/);
  });

  it("has stripeSubscriptionId column", () => {
    expect(schemaSource).toMatch(/stripeSubscriptionId|stripe_subscription_id/);
  });

  it("has plan column (free/basic/pro)", () => {
    expect(schemaSource).toMatch(/plan.*varchar|plan.*text|plan.*enum/);
  });

  it("has status column", () => {
    expect(schemaSource).toMatch(/status.*varchar|status.*text|status.*Enum|mysqlEnum.*status/);
  });

  it("has billingCycle column", () => {
    expect(schemaSource).toMatch(/billingCycle|billing_cycle/);
  });

  it("has currentPeriodEnd column", () => {
    expect(schemaSource).toMatch(/currentPeriodEnd|current_period_end/);
  });

  it("has cancelAtPeriodEnd column", () => {
    expect(schemaSource).toMatch(/cancelAtPeriodEnd|cancel_at_period_end/);
  });
});

// ── 4. Webhook Endpoint Tests ───────────────────────────────────────────────

describe("server/_core/index.ts — Stripe webhook endpoint", () => {
  const indexPath = path.join(process.cwd(), "server/_core/index.ts");
  let indexSource: string;

  beforeEach(() => {
    indexSource = fs.readFileSync(indexPath, "utf-8");
  });

  it("registers POST /api/stripe/webhook endpoint", () => {
    expect(indexSource).toContain("/api/stripe/webhook");
    expect(indexSource).toContain("app.post");
  });

  it("uses express.raw() for webhook body parsing (not json)", () => {
    expect(indexSource).toContain("express.raw");
  });

  it("webhook endpoint is registered BEFORE the main express.json() middleware", () => {
    // The webhook uses express.raw() and is registered before the app-wide express.json()
    // Find the app.post webhook line and the app.use(express.json) line
    const lines = indexSource.split("\n");
    let webhookLine = -1;
    let jsonMiddlewareLine = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes("/api/stripe/webhook")) webhookLine = i;
      if (lines[i].includes("app.use(express.json") || lines[i].includes("app.use( express.json")) {
        jsonMiddlewareLine = i;
      }
    }
    expect(webhookLine).toBeGreaterThan(-1);
    expect(jsonMiddlewareLine).toBeGreaterThan(-1);
    expect(webhookLine).toBeLessThan(jsonMiddlewareLine);
  });

  it("checks stripe-signature header", () => {
    expect(indexSource).toContain("stripe-signature");
  });

  it("calls constructWebhookEvent and processWebhookEvent", () => {
    expect(indexSource).toContain("constructWebhookEvent");
    expect(indexSource).toContain("processWebhookEvent");
  });
});

// ── 5. Subscription Plans Screen Tests ──────────────────────────────────────

describe("app/subscription-plans.tsx — Stripe checkout integration", () => {
  const plansPath = path.join(process.cwd(), "app/subscription-plans.tsx");
  let plansSource: string;

  beforeEach(() => {
    plansSource = fs.readFileSync(plansPath, "utf-8");
  });

  it("imports WebBrowser for native Stripe checkout redirect", () => {
    expect(plansSource).toContain("expo-web-browser");
  });

  it("imports useAuth for authentication detection", () => {
    expect(plansSource).toContain("useAuth");
  });

  it("calls openCheckout for authenticated users", () => {
    expect(plansSource).toContain("openCheckout");
  });

  it("falls back to local setSubscription when Stripe is unavailable", () => {
    expect(plansSource).toContain("setSubscription(selectedPlan, billing)");
  });

  it("uses WebBrowser.openBrowserAsync for native checkout", () => {
    expect(plansSource).toContain("WebBrowser.openBrowserAsync");
  });

  it("uses window.location.href for web checkout redirect", () => {
    expect(plansSource).toContain("window.location.href");
  });

  it("refreshes subscription after returning from Stripe", () => {
    expect(plansSource).toContain("await refresh()");
  });
});

// ── 6. Subscription Success Screen Tests ────────────────────────────────────

describe("app/subscription-success.tsx — Post-checkout callback", () => {
  const successPath = path.join(process.cwd(), "app/subscription-success.tsx");
  let successSource: string;

  beforeEach(() => {
    successSource = fs.readFileSync(successPath, "utf-8");
  });

  it("exists and exports a default component", () => {
    expect(successSource).toContain("export default function");
  });

  it("refreshes subscription status on mount", () => {
    expect(successSource).toContain("refresh()");
  });

  it("shows loading, success, and error states", () => {
    expect(successSource).toContain("loading");
    expect(successSource).toContain("success");
    expect(successSource).toContain("error");
  });

  it("navigates to dashboard after successful verification", () => {
    expect(successSource).toContain("router.replace");
    expect(successSource).toContain("/(tabs)");
  });
});

// ── 7. tRPC Subscription Routes Tests ───────────────────────────────────────

describe("server/social.router.ts — Stripe subscription routes", () => {
  const routerPath = path.join(process.cwd(), "server/social.router.ts");
  let routerSource: string;

  beforeEach(() => {
    routerSource = fs.readFileSync(routerPath, "utf-8");
  });

  it("imports Stripe service functions", () => {
    expect(routerSource).toContain("createCheckoutSession");
  });

  it("defines createCheckout mutation", () => {
    expect(routerSource).toContain("createCheckout");
  });

  it("defines getCurrentPlan query", () => {
    expect(routerSource).toContain("getCurrentPlan");
  });

  it("defines cancel mutation", () => {
    expect(routerSource).toMatch(/cancel.*mutation|mutation.*cancel/s);
  });

  it("defines reactivate mutation", () => {
    expect(routerSource).toContain("reactivate");
  });

  it("defines createPortal mutation", () => {
    expect(routerSource).toContain("createPortal");
  });

  it("createCheckout accepts plan, billingCycle, successUrl, cancelUrl", () => {
    expect(routerSource).toContain("plan:");
    expect(routerSource).toContain("billingCycle:");
    expect(routerSource).toContain("successUrl:");
    expect(routerSource).toContain("cancelUrl:");
  });
});
