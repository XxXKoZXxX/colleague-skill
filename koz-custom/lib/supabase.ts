import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(url, key)

export type FacetCut = {
  id: string
  name: string
  difficulty_multiplier: number
}

export type RoughStone = {
  id: string
  image_url: string | null
  weight_carats: number
  origin: string
  estimated_yield_pct: number | null
  created_at: string
}

export type Inquiry = {
  id: string
  name: string
  email: string
  budget_usd: number
  description: string | null
  facet_cut_id: string | null
  status: string
  quote_usd: number | null
  created_at: string
}
