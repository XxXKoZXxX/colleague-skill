'use server'

import { supabase } from '@/lib/supabase'
import { inquirySchema } from '@/lib/inquirySchema'
import { revalidatePath } from 'next/cache'

export type ActionState = {
  success: boolean
  error?: string
  fieldErrors?: Record<string, string[]>
}

export async function submitInquiry(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const raw = {
    name: formData.get('name') as string,
    email: formData.get('email') as string,
    budget_usd: Number(formData.get('budget_usd')),
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
  const { error } = await supabase.from('inquiries').insert({
    name: data.name,
    email: data.email,
    budget_usd: data.budget_usd,
    description: data.description ?? null,
    facet_cut_id: data.facet_cut_id || null,
  })

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/admin')
  return { success: true }
}
