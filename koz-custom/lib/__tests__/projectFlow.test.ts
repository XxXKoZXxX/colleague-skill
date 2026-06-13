import { describe, it, expect } from 'vitest'
import { nextStatusForMilestone, progressPct, STATUS_LABELS, PROJECT_FLOW } from '../projectFlow'

describe('nextStatusForMilestone', () => {
  describe('deposit triggers design_phase', () => {
    it('advances inquiry -> design_phase on deposit', () => {
      expect(nextStatusForMilestone('inquiry', 'Design Deposit')).toBe('design_phase')
    })

    it('advances deposit_pending -> design_phase on deposit', () => {
      expect(nextStatusForMilestone('deposit_pending', 'Deposit')).toBe('design_phase')
    })

    it('is case-insensitive for milestone name', () => {
      expect(nextStatusForMilestone('inquiry', 'DESIGN DEPOSIT')).toBe('design_phase')
    })
  })

  describe('stone/material triggers fabrication', () => {
    it('advances design_phase -> fabrication on Stone Sourcing', () => {
      expect(nextStatusForMilestone('design_phase', 'Stone Sourcing')).toBe('fabrication')
    })

    it('advances design_phase -> fabrication on Materials', () => {
      expect(nextStatusForMilestone('design_phase', 'Materials')).toBe('fabrication')
    })

    it('advances design_phase -> fabrication on sourcing keyword', () => {
      expect(nextStatusForMilestone('design_phase', 'Sourcing')).toBe('fabrication')
    })
  })

  describe('final/balance triggers ready_to_ship', () => {
    it('advances fabrication -> ready_to_ship on Final Balance', () => {
      expect(nextStatusForMilestone('fabrication', 'Final Balance')).toBe('ready_to_ship')
    })

    it('advances fabrication -> ready_to_ship on "final" keyword', () => {
      expect(nextStatusForMilestone('fabrication', 'Final Payment')).toBe('ready_to_ship')
    })

    it('advances fabrication -> ready_to_ship on "balance" keyword', () => {
      expect(nextStatusForMilestone('fabrication', 'Balance Due')).toBe('ready_to_ship')
    })
  })

  describe('no-op cases', () => {
    it('returns null for wrong status/milestone combo', () => {
      expect(nextStatusForMilestone('inquiry', 'Final Balance')).toBeNull()
    })

    it('returns null when paying deposit on design_phase (already past)', () => {
      expect(nextStatusForMilestone('design_phase', 'Design Deposit')).toBeNull()
    })

    it('returns null for shipped status', () => {
      expect(nextStatusForMilestone('shipped', 'Final Balance')).toBeNull()
    })

    it('returns null for unknown milestone name', () => {
      expect(nextStatusForMilestone('design_phase', 'Random Fee')).toBeNull()
    })
  })
})

describe('progressPct', () => {
  it('returns 0 for inquiry (first step)', () => {
    expect(progressPct('inquiry')).toBe(0)
  })

  it('returns 100 for shipped (last step)', () => {
    expect(progressPct('shipped')).toBe(100)
  })

  it('returns 0 for archived (not in flow)', () => {
    expect(progressPct('archived')).toBe(0)
  })

  it('increases monotonically through the flow', () => {
    const pcts = PROJECT_FLOW.map(progressPct)
    for (let i = 1; i < pcts.length; i++) {
      expect(pcts[i]).toBeGreaterThan(pcts[i - 1])
    }
  })

  it('design_phase is between 0 and 100 exclusive', () => {
    const p = progressPct('design_phase')
    expect(p).toBeGreaterThan(0)
    expect(p).toBeLessThan(100)
  })
})

describe('STATUS_LABELS', () => {
  it('has a label for every status in PROJECT_FLOW', () => {
    for (const status of PROJECT_FLOW) {
      expect(STATUS_LABELS[status]).toBeTruthy()
    }
  })

  it('has a label for archived', () => {
    expect(STATUS_LABELS['archived']).toBeTruthy()
  })
})
