
import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-10-29.clover",
  typescript: true,
});

export const PLANS = {
  monthly: {
    priceId: process.env.STRIPE_MONTHLY_PRICE_ID || "",
    price: 9.99,
    interval: "month" as const,
  },
  annual: {
    priceId: process.env.STRIPE_ANNUAL_PRICE_ID || "",
    price: 108,
    interval: "year" as const,
  },
};
