'use server'

import { supabase } from '@/lib/supabase'
import { inquirySchema } from '@/lib/inquirySchema'
import { revalidatePath } from 'next/cache'

export type ActionState = {
  success: boolean
  error?: string
  fieldErrors?: Record<string, string[]>
  projectId?: string
}

/**
 * Public inquiry form. Creates a `koz_projects` row in the `inquiry`
 * state — a qualified lead, not just an email in the inbox.
 */
export async function submitInquiry(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const budgetMinRaw = formData.get('budget_min')
  const raw = {
    name: formData.get('name') as string,
    email: formData.get('email') as string,
    title: formData.get('title') as string,
    budget_min:
      budgetMinRaw && String(budgetMinRaw).trim() !== ''
        ? Number(budgetMinRaw)
        : undefined,
    budget_max: Number(formData.get('budget_max')),
    description: formData.get('description') as string | undefined,
    facet_cut_id: formData.get('facet_cut_id') as string | undefined,
  }

  const result = inquirySchema.safeParse(raw)
  if (!result.success) {
    const fieldErrors: Record<string, string[]> = {}
    result.error.issues.forEach((e) => {
      const key = e.path[0] as string
      fieldErrors[key] = [...(fieldErrors[key] ?? []), e.message]
    })
    return { success: false, fieldErrors }
  }

  const { data } = result
  const { data: inserted, error } = await supabase
    .from('koz_projects')
    .insert({
      client_name: data.name,
      client_email: data.email,
      title: data.title,
      description: data.description ?? null,
      budget_min: data.budget_min ?? null,
      budget_max: data.budget_max,
      facet_cut_id: data.facet_cut_id || null,
      status: 'inquiry',
    })
    .select('id')
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/admin')
  return { success: true, projectId: inserted?.id }
}

/**
 * Admin: record a milestone payment manually (cash, wire, etc.) and
 * advance the project through the state machine — the same logic the
 * payment webhook runs, exposed for off-platform payments.
 */
export async function markMilestonePaid(
  milestoneId: string,
  projectId: string,
  method: string,
  transactionRef?: string
): Promise<{ ok: boolean; error?: string }> {
  // Settlement runs through a SECURITY DEFINER RPC so the milestone/project
  // tables stay locked to clients while the state transition stays atomic.
  const { error } = await supabase.rpc('koz_settle_milestone', {
    p_milestone_id: milestoneId,
    p_project_id: projectId,
    p_method: method,
    p_txn: transactionRef ?? null,
  })

  if (error) return { ok: false, error: error.message }

  revalidatePath('/admin')
  revalidatePath(`/projects/${projectId}`)
  return { ok: true }
}

/**
 * Client-facing milestone payment.
 *
 * Production: create a Stripe Checkout Session (with milestone_id and
 * project_id in metadata) and return its URL for the client to redirect
 * to — the webhook then confirms payment and advances the project.
 *
 * Mock mode (no provider keys): settle immediately so the milestone
 * flow can be demonstrated end to end.
 */
export async function payMilestone(
  milestoneId: string,
  projectId: string
): Promise<{ ok: boolean; error?: string }> {
  // In mock mode we reuse the same idempotent settle logic.
  return markMilestonePaid(milestoneId, projectId, 'Mock Checkout')
}
