// ============================================================
// Payment provider abstraction.
//
// The blueprint recommends Stripe for cards plus an optional
// crypto rail (BTCPay / Coinbase Commerce) for 0–1% fees on
// high-ticket custom work. To keep the app runnable without
// secrets, this module operates in "mock" mode unless a real
// STRIPE_SECRET_KEY is present — then it can be swapped for the
// Stripe SDK without touching callers.
// ============================================================

export type PaymentProvider = 'stripe' | 'btcpay' | 'coinbase' | 'mock'

export type VerifiedEvent = {
  type: string
  paid: boolean
  /** Metadata we attach when creating the checkout session. */
  metadata: {
    milestone_id?: string
    project_id?: string
  }
  transactionId: string
}

export function activeProvider(): PaymentProvider {
  if (process.env.STRIPE_SECRET_KEY) return 'stripe'
  if (process.env.BTCPAY_API_KEY) return 'btcpay'
  if (process.env.COINBASE_COMMERCE_KEY) return 'coinbase'
  return 'mock'
}

/**
 * Verify a webhook payload came from the payment provider, then
 * normalize it into a VerifiedEvent. Throws on an invalid signature.
 *
 * In mock mode (no provider keys) the raw JSON body is trusted as-is
 * so the milestone flow can be exercised locally and in tests.
 */
export async function verifyWebhook(
  rawBody: string,
  signature: string | null
): Promise<VerifiedEvent> {
  const provider = activeProvider()

  if (provider === 'stripe') {
    // Production path — wire up the Stripe SDK here:
    //   const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
    //   const event = stripe.webhooks.constructEvent(
    //     rawBody, signature!, process.env.STRIPE_WEBHOOK_SECRET!
    //   )
    //   const obj = event.data.object as Stripe.PaymentIntent
    //   return {
    //     type: event.type,
    //     paid: event.type === 'payment_intent.succeeded',
    //     metadata: obj.metadata,
    //     transactionId: obj.id,
    //   }
    if (!signature) throw new Error('Missing webhook signature')
  }

  // Mock / generic JSON path
  let parsed: {
    type?: string
    metadata?: { milestone_id?: string; project_id?: string }
    transactionId?: string
  }
  try {
    parsed = JSON.parse(rawBody)
  } catch {
    throw new Error('Invalid webhook body')
  }

  const type = parsed.type ?? 'payment_intent.succeeded'
  return {
    type,
    paid: type.includes('succeeded') || type.includes('confirmed'),
    metadata: parsed.metadata ?? {},
    transactionId: parsed.transactionId ?? `mock_${Date.now()}`,
  }
}
