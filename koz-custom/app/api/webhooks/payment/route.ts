import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyWebhook } from '@/lib/payments'

// Webhooks must never be cached.
export const dynamic = 'force-dynamic'

/**
 * Milestone payment webhook.
 *
 * Flow: Payment provider -> this route -> verify signature ->
 * mark milestone paid (idempotently) -> advance project status
 * via the state machine.
 */
export async function POST(req: Request) {
  const rawBody = await req.text()
  // Next.js 16: headers() is async and must be awaited.
  const headerStore = await headers()
  const signature =
    headerStore.get('stripe-signature') ??
    headerStore.get('x-cc-webhook-signature')

  let event
  try {
    event = await verifyWebhook(rawBody, signature)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'invalid webhook'
    return new NextResponse(`Webhook Error: ${message}`, { status: 400 })
  }

  if (!event.paid) {
    return NextResponse.json({ received: true, ignored: 'not a paid event' })
  }

  const { milestone_id, project_id } = event.metadata
  if (!milestone_id || !project_id) {
    return new NextResponse('Webhook Error: missing metadata', { status: 400 })
  }

  // Settle idempotently and advance the project state in one atomic,
  // privileged call. Duplicate deliveries return { updated: false }.
  // A production build would enqueue a status-update email on a real advance.
  const { data, error } = await supabase.rpc('koz_settle_milestone', {
    p_milestone_id: milestone_id,
    p_project_id: project_id,
    p_method: 'Webhook',
    p_txn: event.transactionId,
  })

  if (error) {
    return new NextResponse(`DB Error: ${error.message}`, { status: 500 })
  }

  return NextResponse.json({ received: true, result: data })
}
