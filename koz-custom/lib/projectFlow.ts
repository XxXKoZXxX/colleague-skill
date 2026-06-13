import type { ProjectStatus } from '@/lib/supabase'

// Ordered lifecycle of a custom fabrication project.
export const PROJECT_FLOW: ProjectStatus[] = [
  'inquiry',
  'deposit_pending',
  'design_phase',
  'fabrication',
  'final_payment',
  'ready_to_ship',
  'shipped',
]

export const STATUS_LABELS: Record<ProjectStatus, string> = {
  inquiry: 'Inquiry',
  deposit_pending: 'Deposit Pending',
  design_phase: 'Design Phase',
  fabrication: 'Fabrication',
  final_payment: 'Final Payment',
  ready_to_ship: 'Ready to Ship',
  shipped: 'Shipped',
  archived: 'Archived',
}

// Maps a paid milestone name to the project status it unlocks.
// This is the "state machine" the payment webhook drives.
export function nextStatusForMilestone(
  current: ProjectStatus,
  milestoneName: string
): ProjectStatus | null {
  const name = milestoneName.toLowerCase()

  if ((current === 'inquiry' || current === 'deposit_pending') && name.includes('deposit')) {
    return 'design_phase'
  }
  if (current === 'design_phase' && (name.includes('stone') || name.includes('material') || name.includes('sourcing'))) {
    return 'fabrication'
  }
  if (current === 'fabrication' && (name.includes('final') || name.includes('balance'))) {
    return 'ready_to_ship'
  }
  return null
}

export function progressPct(status: ProjectStatus): number {
  const idx = PROJECT_FLOW.indexOf(status)
  if (idx < 0) return 0
  return Math.round((idx / (PROJECT_FLOW.length - 1)) * 100)
}
