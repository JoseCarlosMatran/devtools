
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "No signature" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET || ""
    );
  } catch (error) {
    console.error("Webhook signature verification failed:", error);
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const plan = session.metadata?.plan;

        if (!userId) break;

        await prisma.subscription.upsert({
          where: { userId },
          update: {
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: session.subscription as string,
            plan: plan || "monthly",
            status: "active",
          },
          create: {
            userId,
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: session.subscription as string,
            plan: plan || "monthly",
            status: "active",
          },
        });
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription & { current_period_end?: number };
        
        await prisma.subscription.update({
          where: { stripeSubscriptionId: subscription.id },
          data: {
            status: subscription.status,
            stripePriceId: subscription.items.data[0]?.price.id,
            stripeCurrentPeriodEnd: subscription.current_period_end 
              ? new Date(subscription.current_period_end * 1000)
              : undefined,
          },
        });
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        
        await prisma.subscription.update({
          where: { stripeSubscriptionId: subscription.id },
          data: {
            status: "canceled",
          },
        });
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice & { subscription?: string; period_end?: number };
        
        if (invoice.subscription) {
          await prisma.subscription.update({
            where: { stripeSubscriptionId: invoice.subscription as string },
            data: {
              status: "active",
              stripeCurrentPeriodEnd: invoice.period_end 
                ? new Date(invoice.period_end * 1000)
                : undefined,
            },
          });
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice & { subscription?: string };
        
        if (invoice.subscription) {
          await prisma.subscription.update({
            where: { stripeSubscriptionId: invoice.subscription as string },
            data: {
              status: "past_due",
            },
          });
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
