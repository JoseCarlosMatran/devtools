
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { stripe, PLANS } from "@/lib/stripe";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "No autenticado" },
        { status: 401 }
      );
    }

    const { plan } = await request.json();
    
    if (!plan || !PLANS[plan as keyof typeof PLANS]) {
      return NextResponse.json(
        { error: "Plan inválido" },
        { status: 400 }
      );
    }

    const selectedPlan = PLANS[plan as keyof typeof PLANS];
    const origin = request.headers.get("origin") || "";

    // Check if user already has a subscription
    const existingSubscription = await prisma.subscription.findUnique({
      where: { userId: session.user.id },
    });

    if (existingSubscription?.status === "active") {
      return NextResponse.json(
        { error: "Ya tienes una suscripción activa" },
        { status: 400 }
      );
    }

    // Create or get Stripe customer
    let stripeCustomerId = existingSubscription?.stripeCustomerId;
    
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: session.user.email!,
        metadata: {
          userId: session.user.id,
        },
      });
      stripeCustomerId = customer.id;
    }

    // Create checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: selectedPlan.priceId,
          quantity: 1,
        },
      ],
      success_url: `${origin}/dashboard?success=true`,
      cancel_url: `${origin}/pricing?canceled=true`,
      metadata: {
        userId: session.user.id,
        plan,
      },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return NextResponse.json(
      { error: "Error al crear sesión de pago" },
      { status: 500 }
    );
  }
}
