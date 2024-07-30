import Stripe from "stripe"
import { env } from "~/env"

export const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
})

type StripePriceMap = Record<string, string>

// If plans/prices will be created in Stripe regularly (e.g. promotions), building a dynamic solution for returning price ID would be better.
export const stripePriceMap: StripePriceMap = {
  Basic: "price_1PhkZiFqfoPDomWjxaWrgW8R",
  Pro: "price_1Phkb4FqfoPDomWjwzIpaKFG",
  Enterprise: "price_1Phkb4FqfoPDomWjLwNtA8hh",
}
