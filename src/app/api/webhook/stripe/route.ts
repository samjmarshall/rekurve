/* eslint-disable import/no-unused-modules */
import "source-map-support/register"

import { type NextRequest, NextResponse } from "next/server"
import logger from "~/server/logger"
import { stripe } from "~/server/stripe"
import { env } from "~/env"
import type Stripe from "stripe"
import { api } from "~/trpc/server"

export async function POST(request: NextRequest): Promise<NextResponse> {
  const data = await request.text()
  logger.debug({
    request: "POST /api/webhook/stripe",
    message: "Stripe webhook event",
    data,
  })

  const signature = request.headers.get("stripe-signature") ?? ""
  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      data,
      signature,
      env.STRIPE_WEBHOOK_SECRET,
    )
  } catch (error: unknown) {
    logger.error({
      request: "POST /api/webhook/stripe",
      message: error instanceof Error ? error.message : "Unknown error",
      data: error,
    })

    return NextResponse.json(
      { error: "Invalid Stripe webhook event" },
      { status: 400 },
    )
  }

  // See the 230+ Stripe event types: https://docs.stripe.com/api/events/types
  // Determine you use cases from the available events above and handle the events you need
  switch (event.type) {
    case "customer.deleted":
      await api.user.deleteStripeCustomerId({
        stripeCustomerId: event.data.object.id,
      })
      break
    case "checkout.session.completed":
    case "customer.subscription.created":
      // Handle subscription creation
      // Enable access to services, send a welcome email etc..
      const subscriptionCreated = event.data.object

      logger.info({
        request: "POST /api/webhook/stripe",
        message: event.type,
        data: subscriptionCreated,
      })

      break
    case "customer.subscription.deleted":
      // Handle subscription cancellation
      // Revoke access to services, send a goodbye email etc..
      const subscriptionDeleted = event.data.object

      logger.info({
        request: "POST /api/webhook/stripe",
        message: event.type,
        data: subscriptionDeleted,
      })
      break
    case "customer.subscription.trial_will_end":
      // Send an email to the customer when their trial is ending
      // Create push notifications in the web app etc..
      const subscriptionTrialEnd = event.data.object

      logger.info({
        request: "POST /api/webhook/stripe",
        message: event.type,
        data: subscriptionTrialEnd,
      })
      break
    case "invoice.payment_failed":
    case "invoice.overdue":
      // Handle failed and overdue payments, send an email to the customer for example.
      const invoicePaymentRequired = event.data.object

      logger.info({
        request: "POST /api/webhook/stripe",
        message: event.type,
        data: invoicePaymentRequired,
      })
      break
    default:
      logger.info({
        request: "POST /api/webhook/stripe",
        message: "Unhandled event type => " + event.type,
        data: event,
      })
  }

  // Return a 200 response to acknowledge receipt of the event
  return new NextResponse()
}
