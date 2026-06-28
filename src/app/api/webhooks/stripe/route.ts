import { createAdminClient } from "@/infrastructure/database/admin";
import Stripe from "stripe";

const stripeSecret = process.env.STRIPE_SECRET_KEY;

// Lazy client — only throws if called without key (keeps build-time happy)
function getStripe(): Stripe | null {
  if (!stripeSecret) {
    console.warn("[Stripe] STRIPE_SECRET_KEY not configured");
    return null;
  }
  if (!(getStripe as any)._client) {
    (getStripe as any)._client = new Stripe(stripeSecret, {
      apiVersion: "2025-02-24.acacia",
    });
  }
  return (getStripe as any)._client;
}

export async function POST(req: Request) {
  const stripe = getStripe();
  if (!stripe) {
    return new Response("Stripe not configured", { status: 503 });
  }

  const rawBody = Buffer.from(await req.arrayBuffer());
  const sig = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return new Response("Missing signature or webhook secret", { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error("[Stripe Webhook] Signature verification failed:", err);
    return new Response("Webhook signature verification failed", { status: 400 });
  }

  const supabase = createAdminClient();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const stripeCustomerId = session.customer as string;
        const stripeSubscriptionId = session.subscription as string;
        const tier = session.metadata?.tier || "essential";

        if (!userId) {
          console.error("[Stripe Webhook] Missing userId in session metadata");
          break;
        }

        await supabase.from("user_purchases").insert({
          user_id: userId,
          tier,
          stripe_customer_id: stripeCustomerId,
          stripe_subscription_id: stripeSubscriptionId,
          payment_method: "stripe",
          amount_cents: session.amount_total || 0,
          status: "active",
        });

        console.log(`[Stripe Webhook] Checkout completed for user ${userId}, tier: ${tier}`);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const stripeSubscriptionId = subscription.id;

        await supabase
          .from("user_purchases")
          .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
          .eq("stripe_subscription_id", stripeSubscriptionId);

        console.log(`[Stripe Webhook] Subscription cancelled: ${stripeSubscriptionId}`);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const stripeSubscriptionId = invoice.subscription as string;

        await supabase
          .from("user_purchases")
          .update({ status: "past_due" })
          .eq("stripe_subscription_id", stripeSubscriptionId);

        console.log(`[Stripe Webhook] Payment failed for subscription: ${stripeSubscriptionId}`);
        break;
      }

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }
  } catch (err) {
    console.error("[Stripe Webhook] Error processing event:", err);
    return new Response("Webhook handler failed", { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
