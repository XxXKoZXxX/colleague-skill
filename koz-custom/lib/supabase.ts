import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(url, key)

export type FacetCut = {
  id: string
  name: string
  difficulty_multiplier: number
}

// ---- Custom Fabrication domain ----

export type ProjectStatus =
  | 'inquiry'
  | 'deposit_pending'
  | 'design_phase'
  | 'fabrication'
  | 'final_payment'
  | 'ready_to_ship'
  | 'shipped'
  | 'archived'

export type StoneStatus = 'available' | 'reserved' | 'sold'

export type Project = {
  id: string
  client_name: string
  client_email: string
  title: string
  description: string | null
  status: ProjectStatus
  budget_min: number | null
  budget_max: number | null
  final_agreed_price: number | null
  facet_cut_id: string | null
  internal_notes: string | null
  created_at: string
  updated_at: string
}

export type Milestone = {
  id: string
  project_id: string
  name: string
  sort_order: number
  amount: number
  is_paid: boolean
  payment_method: string | null
  transaction_ref: string | null
  due_date: string | null
  paid_at: string | null
  created_at: string
}

export type DesignIteration = {
  id: string
  project_id: string
  version_number: number
  image_url: string | null
  gemologist_notes: string | null
  client_feedback: string | null
  is_approved: boolean
  approved_at: string | null
  created_at: string
}

export type Stone = {
  id: string
  type: string
  weight_carats: number | null
  dimensions: string | null
  origin: string | null
  purchase_cost: number | null
  retail_price: number | null
  status: StoneStatus
  certificate_url: string | null
  image_url: string | null
  notes: string | null
  reserved_project_id: string | null
  created_at: string
}
