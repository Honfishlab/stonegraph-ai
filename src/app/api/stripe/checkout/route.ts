import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/infrastructure/database/admin";
import { getServerUser } from "@/infrastructure/database/server";
import Stripe from "stripe";
import { TIERS, STRIPE_PRICE_IDS, type Tier } from "@/domain/entities/billing";

const stripeSecret = process.env.STRIPE_SECRET_KEY;

function getStripe(): Stripe | null {
  if (!stripeSecret) return null;
  if (!(getStripe as any)._client) {
    (getStripe as any)._client = new Stripe(stripeSecret, {
      apiVersion: "2025-02-24.acacia",
    });
  }
  return (getStripe as any)._client;
}

export async function POST(req: NextRequest) {
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  try {
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const tier = body.tier as Tier;

    if (!tier || !TIERS[tier]) {
      return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
    }

    if (tier === "free") {
      return NextResponse.json({ error: "Cannot checkout free tier" }, { status: 400 });
    }

    const stripePriceId = STRIPE_PRICE_IDS[tier];
    if (!stripePriceId) {
      return NextResponse.json(
        { error: `Stripe price ID not configured for tier '${tier}'. Set STRIPE_PRICE_${tier.toUpperCase()} env var.` },
        { status: 500 }
      );
    }

    // Look up or create Stripe customer
    const supabase = createAdminClient();
    const { data: existingPurchase } = await supabase
      .from("user_purchases")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .not("stripe_customer_id", "is", null)
      .limit(1)
      .maybeSingle();

    let customerId = existingPurchase?.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { userId: user.id },
      });
      customerId = customer.id;
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://stonegraph.ai";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: stripePriceId, quantity: 1 }],
      success_url: `${appUrl}/vault/billing?success=true`,
      cancel_url: `${appUrl}/vault/billing?canceled=true`,
      metadata: {
        userId: user.id,
        tier,
      },
      subscription_data: {
        metadata: {
          userId: user.id,
          tier,
        },
      },
    });

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (err) {
    console.error("[api/stripe/checkout] Error:", err);
    return NextResponse.json({ error: "Checkout failed" }, { status: 500 });
  }
}
