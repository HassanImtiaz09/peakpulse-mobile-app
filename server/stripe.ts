/**
 * server/stripe.ts — Stripe integration service for FytNova subscriptions.
 *
 * Handles:
 * - Checkout session creation for Basic/Pro plans
 * - Webhook event verification and processing
 * - Subscription status queries and management
 * - Customer portal session creation
 *
 * Requires env vars: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
 */
import Stripe from "stripe";
import { eq, and } from "drizzle-orm";
import { getDb } from "./db";
import { userSubscriptions } from "../drizzle/schema";

/**
 * Helper: extract current_period_start/end from a Stripe Subscription.
 * In Stripe v22+ (2025 API), these fields moved from Subscription to SubscriptionItem.
 */
function getSubscriptionPeriod(subscription: Stripe.Subscription): { start: Date; end: Date } {
  const item = subscription.items?.data?.[0];
  if (item) {
    return {
      start: new Date(item.current_period_start * 1000),
      end: new Date(item.current_period_end * 1000),
    };
  }
  // Fallback: use created timestamp
  return { start: new Date(subscription.created * 1000), end: new Date(subscription.created * 1000) };
}

/**
 * Helper: extract subscription ID from a Stripe Invoice.
 * In Stripe v22+ (2025 API), Invoice.subscription was replaced by Invoice.parent.subscription_details.
 */
function getInvoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  // New API: parent.subscription_details.subscription
  const parentSub = invoice.parent?.subscription_details?.subscription;
  if (parentSub) {
    return typeof parentSub === "string" ? parentSub : parentSub.id;
  }
  return null;
}

// ── Stripe client (lazy init) ───────────────────────────────────────────────

let _stripe: Stripe | null = null;

export function getStripe(): Stripe | null {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    console.warn("[Stripe] STRIPE_SECRET_KEY not set — Stripe features disabled");
    return null;
  }
  _stripe = new Stripe(key, { apiVersion: "2025-04-30.basil" as any });
  return _stripe;
}

export function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

// ── Price configuration ─────────────────────────────────────────────────────

export interface PlanPricing {
  planId: "basic" | "pro";
  name: string;
  monthlyPriceId: string;
  annualPriceId: string;
  monthlyAmount: number; // in pence/cents
  annualAmount: number;
  currency: string;
}

/**
 * Plan pricing configuration.
 * Price IDs should be set via env vars or configured in Stripe Dashboard.
 * These defaults use placeholder IDs — replace with real Stripe Price IDs.
 */
export const PLAN_PRICING: Record<string, PlanPricing> = {
  basic: {
    planId: "basic",
    name: "Basic",
    monthlyPriceId: process.env.STRIPE_BASIC_MONTHLY_PRICE_ID || "price_basic_monthly",
    annualPriceId: process.env.STRIPE_BASIC_ANNUAL_PRICE_ID || "price_basic_annual",
    monthlyAmount: 599, // £5.99
    annualAmount: 4799, // £47.99 (save 33%)
    currency: "gbp",
  },
  pro: {
    planId: "pro",
    name: "Pro",
    monthlyPriceId: process.env.STRIPE_PRO_MONTHLY_PRICE_ID || "price_pro_monthly",
    annualPriceId: process.env.STRIPE_PRO_ANNUAL_PRICE_ID || "price_pro_annual",
    monthlyAmount: 1199, // £11.99
    annualAmount: 9599, // £95.99 (save 33%)
    currency: "gbp",
  },
};

// ── Customer management ─────────────────────────────────────────────────────

/**
 * Get or create a Stripe customer for the given user.
 */
export async function getOrCreateCustomer(
  userId: number,
  email?: string | null,
  name?: string | null,
): Promise<string | null> {
  const stripe = getStripe();
  if (!stripe) return null;

  const db = await getDb();
  if (!db) return null;

  // Check if user already has a Stripe customer ID
  const [existing] = await db
    .select({ stripeCustomerId: userSubscriptions.stripeCustomerId })
    .from(userSubscriptions)
    .where(eq(userSubscriptions.userId, userId))
    .limit(1);

  if (existing?.stripeCustomerId) return existing.stripeCustomerId;

  // Create a new Stripe customer
  const customer = await stripe.customers.create({
    metadata: { fytnova_user_id: String(userId) },
    ...(email ? { email } : {}),
    ...(name ? { name } : {}),
  });

  // Upsert the subscription record with the customer ID
  await db.insert(userSubscriptions).values({
    userId,
    stripeCustomerId: customer.id,
    plan: "free",
    status: "active",
  });

  return customer.id;
}

// ── Checkout session ────────────────────────────────────────────────────────

export interface CreateCheckoutParams {
  userId: number;
  plan: "basic" | "pro";
  billingCycle: "monthly" | "annual";
  email?: string | null;
  name?: string | null;
  successUrl: string;
  cancelUrl: string;
}

/**
 * Create a Stripe Checkout Session for subscription purchase.
 * Returns the checkout URL to redirect the user to.
 */
export async function createCheckoutSession(
  params: CreateCheckoutParams,
): Promise<{ url: string; sessionId: string } | null> {
  const stripe = getStripe();
  if (!stripe) return null;

  const pricing = PLAN_PRICING[params.plan];
  if (!pricing) throw new Error(`Unknown plan: ${params.plan}`);

  const customerId = await getOrCreateCustomer(params.userId, params.email, params.name);
  if (!customerId) throw new Error("Failed to create Stripe customer");

  const priceId =
    params.billingCycle === "annual" ? pricing.annualPriceId : pricing.monthlyPriceId;

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    subscription_data: {
      metadata: {
        fytnova_user_id: String(params.userId),
        plan: params.plan,
        billing_cycle: params.billingCycle,
      },
    },
    metadata: {
      fytnova_user_id: String(params.userId),
      plan: params.plan,
      billing_cycle: params.billingCycle,
    },
  });

  return { url: session.url!, sessionId: session.id };
}

// ── Customer portal ─────────────────────────────────────────────────────────

/**
 * Create a Stripe Customer Portal session for managing subscriptions.
 */
export async function createPortalSession(
  userId: number,
  returnUrl: string,
): Promise<string | null> {
  const stripe = getStripe();
  if (!stripe) return null;

  const db = await getDb();
  if (!db) return null;

  const [sub] = await db
    .select({ stripeCustomerId: userSubscriptions.stripeCustomerId })
    .from(userSubscriptions)
    .where(eq(userSubscriptions.userId, userId))
    .limit(1);

  if (!sub?.stripeCustomerId) return null;

  const session = await stripe.billingPortal.sessions.create({
    customer: sub.stripeCustomerId,
    return_url: returnUrl,
  });

  return session.url;
}

// ── Subscription queries ────────────────────────────────────────────────────

export interface SubscriptionStatus {
  plan: "free" | "basic" | "pro";
  status: string;
  billingCycle: "monthly" | "annual";
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
}

/**
 * Get the current subscription status for a user from the database.
 */
export async function getSubscriptionStatus(userId: number): Promise<SubscriptionStatus> {
  const db = await getDb();
  if (!db) return { plan: "free", status: "active", billingCycle: "monthly", currentPeriodEnd: null, cancelAtPeriodEnd: false, stripeCustomerId: null, stripeSubscriptionId: null };

  const [sub] = await db
    .select()
    .from(userSubscriptions)
    .where(eq(userSubscriptions.userId, userId))
    .limit(1);

  if (!sub || sub.plan === "free") {
    return { plan: "free", status: "active", billingCycle: "monthly", currentPeriodEnd: null, cancelAtPeriodEnd: false, stripeCustomerId: sub?.stripeCustomerId ?? null, stripeSubscriptionId: sub?.stripeSubscriptionId ?? null };
  }

  // Check if subscription has expired
  if (sub.currentPeriodEnd && new Date(sub.currentPeriodEnd) < new Date() && sub.status !== "active") {
    return { plan: "free", status: "expired", billingCycle: sub.billingCycle, currentPeriodEnd: sub.currentPeriodEnd?.toISOString() ?? null, cancelAtPeriodEnd: sub.cancelAtPeriodEnd, stripeCustomerId: sub.stripeCustomerId, stripeSubscriptionId: sub.stripeSubscriptionId };
  }

  return {
    plan: sub.plan as "free" | "basic" | "pro",
    status: sub.status,
    billingCycle: sub.billingCycle as "monthly" | "annual",
    currentPeriodEnd: sub.currentPeriodEnd?.toISOString() ?? null,
    cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
    stripeCustomerId: sub.stripeCustomerId ?? null,
    stripeSubscriptionId: sub.stripeSubscriptionId ?? null,
  };
}

/**
 * Cancel a subscription at the end of the current billing period.
 */
export async function cancelSubscription(userId: number): Promise<boolean> {
  const stripe = getStripe();
  if (!stripe) return false;

  const db = await getDb();
  if (!db) return false;

  const [sub] = await db
    .select()
    .from(userSubscriptions)
    .where(eq(userSubscriptions.userId, userId))
    .limit(1);

  if (!sub?.stripeSubscriptionId) return false;

  // Cancel at period end (not immediately)
  await stripe.subscriptions.update(sub.stripeSubscriptionId, {
    cancel_at_period_end: true,
  });

  await db
    .update(userSubscriptions)
    .set({ cancelAtPeriodEnd: true })
    .where(eq(userSubscriptions.userId, userId));

  return true;
}

/**
 * Reactivate a subscription that was set to cancel at period end.
 */
export async function reactivateSubscription(userId: number): Promise<boolean> {
  const stripe = getStripe();
  if (!stripe) return false;

  const db = await getDb();
  if (!db) return false;

  const [sub] = await db
    .select()
    .from(userSubscriptions)
    .where(eq(userSubscriptions.userId, userId))
    .limit(1);

  if (!sub?.stripeSubscriptionId) return false;

  await stripe.subscriptions.update(sub.stripeSubscriptionId, {
    cancel_at_period_end: false,
  });

  await db
    .update(userSubscriptions)
    .set({ cancelAtPeriodEnd: false })
    .where(eq(userSubscriptions.userId, userId));

  return true;
}

// ── Webhook processing ──────────────────────────────────────────────────────

/**
 * Verify and construct a Stripe webhook event from the raw request body.
 */
export function constructWebhookEvent(
  rawBody: Buffer,
  signature: string,
): Stripe.Event | null {
  const stripe = getStripe();
  if (!stripe) return null;

  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.warn("[Stripe] STRIPE_WEBHOOK_SECRET not set — cannot verify webhooks");
    return null;
  }

  try {
    return stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch (err: any) {
    console.error("[Stripe] Webhook signature verification failed:", err.message);
    return null;
  }
}

/**
 * Process a verified Stripe webhook event and update the database accordingly.
 */
export async function processWebhookEvent(event: Stripe.Event): Promise<void> {
  const db = await getDb();
  if (!db) return;

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = parseInt(session.metadata?.fytnova_user_id ?? "0", 10);
      const plan = (session.metadata?.plan ?? "free") as "free" | "basic" | "pro";
      const billingCycle = (session.metadata?.billing_cycle ?? "monthly") as "monthly" | "annual";

      if (!userId) break;

      // Get the subscription details
      const subscriptionId = typeof session.subscription === "string"
        ? session.subscription
        : (session.subscription as any)?.id;

      if (subscriptionId) {
        const stripe = getStripe()!;
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const period = getSubscriptionPeriod(subscription);

        await db
          .update(userSubscriptions)
          .set({
            stripeSubscriptionId: subscriptionId,
            plan,
            billingCycle,
            status: "active",
            currentPeriodStart: period.start,
            currentPeriodEnd: period.end,
            cancelAtPeriodEnd: false,
          })
          .where(eq(userSubscriptions.userId, userId));
      }
      break;
    }

    case "invoice.paid": {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = getInvoiceSubscriptionId(invoice);

      if (!subscriptionId) break;

      const [sub] = await db
        .select()
        .from(userSubscriptions)
        .where(eq(userSubscriptions.stripeSubscriptionId, subscriptionId))
        .limit(1);

      if (sub) {
        const stripe = getStripe()!;
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const period = getSubscriptionPeriod(subscription);

        await db
          .update(userSubscriptions)
          .set({
            status: "active",
            currentPeriodStart: period.start,
            currentPeriodEnd: period.end,
          })
          .where(eq(userSubscriptions.stripeSubscriptionId, subscriptionId));
      }
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const subscriptionId = subscription.id;

      const [sub] = await db
        .select()
        .from(userSubscriptions)
        .where(eq(userSubscriptions.stripeSubscriptionId, subscriptionId))
        .limit(1);

      if (sub) {
        const statusMap: Record<string, string> = {
          active: "active",
          trialing: "trialing",
          past_due: "past_due",
          canceled: "canceled",
          incomplete: "incomplete",
          incomplete_expired: "incomplete_expired",
          unpaid: "unpaid",
        };

        const period = getSubscriptionPeriod(subscription);

        await db
          .update(userSubscriptions)
          .set({
            status: (statusMap[subscription.status] ?? "active") as any,
            currentPeriodStart: period.start,
            currentPeriodEnd: period.end,
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
          })
          .where(eq(userSubscriptions.stripeSubscriptionId, subscriptionId));
      }
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const subscriptionId = subscription.id;

      await db
        .update(userSubscriptions)
        .set({
          plan: "free",
          status: "canceled",
          cancelAtPeriodEnd: false,
          stripeSubscriptionId: null,
        })
        .where(eq(userSubscriptions.stripeSubscriptionId, subscriptionId));
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = getInvoiceSubscriptionId(invoice);

      if (subscriptionId) {
        await db
          .update(userSubscriptions)
          .set({ status: "past_due" })
          .where(eq(userSubscriptions.stripeSubscriptionId, subscriptionId));
      }
      break;
    }

    default:
      // Unhandled event type — log for debugging
      console.log(`[Stripe] Unhandled event type: ${event.type}`);
  }
}
