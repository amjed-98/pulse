import Stripe from "stripe";

import { getPlanDefinition } from "@/lib/billing";
import { getServerEnv } from "@/lib/env";
import type { Profile, WorkspaceBillingStatus, WorkspacePlan } from "@/lib/types";

let stripeClient: Stripe | null = null;

function getStripeEnv() {
  const env = getServerEnv();

  return {
    secretKey: env.STRIPE_SECRET_KEY,
    webhookSecret: env.STRIPE_WEBHOOK_SECRET,
    prices: {
      growth: env.STRIPE_PRICE_GROWTH_MONTHLY,
      scale: env.STRIPE_PRICE_SCALE_MONTHLY,
    },
  };
}

export function isStripeConfigured() {
  const env = getStripeEnv();

  return Boolean(env.secretKey && env.webhookSecret && env.prices.growth && env.prices.scale);
}

export function getStripeClient() {
  const env = getStripeEnv();

  if (!env.secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured.");
  }

  if (!stripeClient) {
    stripeClient = new Stripe(env.secretKey, {
      apiVersion: "2025-08-27.basil",
      typescript: true,
    });
  }

  return stripeClient;
}

export function getStripePriceIdForPlan(plan: WorkspacePlan) {
  const env = getStripeEnv();

  if (plan === "starter") {
    return null;
  }

  if (plan === "growth") {
    return env.prices.growth ?? null;
  }

  if (plan === "scale") {
    return env.prices.scale ?? null;
  }

  return null;
}

export function getWorkspacePlanFromPriceId(priceId: string | null): WorkspacePlan | null {
  const env = getStripeEnv();

  if (!priceId) {
    return null;
  }

  if (env.prices.growth === priceId) {
    return "growth";
  }

  if (env.prices.scale === priceId) {
    return "scale";
  }

  return null;
}

export function normalizeStripeSubscriptionStatus(status: Stripe.Subscription.Status): WorkspaceBillingStatus {
  if (status === "active") {
    return "active";
  }

  if (status === "trialing") {
    return "trialing";
  }

  if (status === "past_due" || status === "unpaid" || status === "paused") {
    return "past_due";
  }

  return "canceled";
}

export async function ensureStripeCustomer(params: {
  existingCustomerId: string | null;
  ownerId: string;
  profile: Profile;
}) {
  const stripe = getStripeClient();

  if (params.existingCustomerId) {
    return params.existingCustomerId;
  }

  const customer = await stripe.customers.create({
    email: params.profile.email ?? undefined,
    name: params.profile.full_name ?? undefined,
    metadata: {
      owner_id: params.ownerId,
      workspace_plan: "starter",
    },
  });

  return customer.id;
}

export function getCheckoutPlanCopy(plan: WorkspacePlan) {
  const definition = getPlanDefinition(plan);

  return {
    title: `${definition.name} plan`,
    description: definition.description,
  };
}

export function getStripeWebhookSecret() {
  return getStripeEnv().webhookSecret ?? null;
}
