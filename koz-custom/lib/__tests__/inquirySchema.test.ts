import { describe, it, expect } from 'vitest'
import { inquirySchema } from '../inquirySchema'

const VALID_UUID = '123e4567-e89b-12d3-a456-426614174000'

// Minimum valid payload under the current schema (budget range + title).
const validBase = {
  name: 'Jane Smith',
  email: 'jane@example.com',
  title: 'Custom Opal Ring',
  budget_max: 500,
}

describe('inquirySchema', () => {
  describe('valid inputs', () => {
    it('accepts a minimal valid object', () => {
      expect(inquirySchema.safeParse(validBase).success).toBe(true)
    })

    it('accepts a fully populated object', () => {
      const result = inquirySchema.safeParse({
        ...validBase,
        budget_min: 300,
        description: 'A beautiful sapphire ring.',
        facet_cut_id: VALID_UUID,
      })
      expect(result.success).toBe(true)
    })

    it('accepts budget_max exactly at minimum (200)', () => {
      expect(inquirySchema.safeParse({ ...validBase, budget_max: 200 }).success).toBe(true)
    })

    it('accepts empty string for facet_cut_id', () => {
      expect(inquirySchema.safeParse({ ...validBase, facet_cut_id: '' }).success).toBe(true)
    })

    it('accepts a valid UUID for facet_cut_id', () => {
      expect(inquirySchema.safeParse({ ...validBase, facet_cut_id: VALID_UUID }).success).toBe(true)
    })

    it('accepts object without optional fields', () => {
      expect(inquirySchema.safeParse({ name: 'Bob', email: 'bob@test.com', title: 'Ring', budget_max: 300 }).success).toBe(true)
    })

    it('accepts an empty description', () => {
      expect(inquirySchema.safeParse({ ...validBase, description: '' }).success).toBe(true)
    })

    it('returns correct parsed data on success', () => {
      const result = inquirySchema.safeParse({ ...validBase, description: 'Custom piece' })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.name).toBe('Jane Smith')
        expect(result.data.email).toBe('jane@example.com')
        expect(result.data.title).toBe('Custom Opal Ring')
        expect(result.data.budget_max).toBe(500)
      }
    })
  })

  describe('name validation', () => {
    it('rejects empty name', () => {
      const result = inquirySchema.safeParse({ ...validBase, name: '' })
      expect(result.success).toBe(false)
      if (!result.success) {
        const errs = result.error.issues.filter((e) => e.path[0] === 'name')
        expect(errs[0].message).toBe('Name is required')
      }
    })

    it('rejects missing name', () => {
      const { name: _n, ...rest } = validBase
      expect(inquirySchema.safeParse(rest).success).toBe(false)
    })

    it('accepts a single-character name', () => {
      expect(inquirySchema.safeParse({ ...validBase, name: 'A' }).success).toBe(true)
    })
  })

  describe('title validation', () => {
    it('rejects empty title', () => {
      const result = inquirySchema.safeParse({ ...validBase, title: '' })
      expect(result.success).toBe(false)
      if (!result.success) {
        const errs = result.error.issues.filter((e) => e.path[0] === 'title')
        expect(errs.length).toBeGreaterThan(0)
      }
    })

    it('rejects missing title', () => {
      const { title: _t, ...rest } = validBase
      expect(inquirySchema.safeParse(rest).success).toBe(false)
    })
  })

  describe('email validation', () => {
    it('rejects an invalid email', () => {
      const result = inquirySchema.safeParse({ ...validBase, email: 'notanemail' })
      expect(result.success).toBe(false)
      if (!result.success) {
        const errs = result.error.issues.filter((e) => e.path[0] === 'email')
        expect(errs[0].message).toBe('Valid email required')
      }
    })

    it('rejects empty email', () => {
      expect(inquirySchema.safeParse({ ...validBase, email: '' }).success).toBe(false)
    })

    it('accepts email with subdomain', () => {
      expect(inquirySchema.safeParse({ ...validBase, email: 'user@mail.example.com' }).success).toBe(true)
    })
  })

  describe('budget_max validation ($200 rule)', () => {
    it('rejects budget_max below minimum (199)', () => {
      const result = inquirySchema.safeParse({ ...validBase, budget_max: 199 })
      expect(result.success).toBe(false)
      if (!result.success) {
        const errs = result.error.issues.filter((e) => e.path[0] === 'budget_max')
        expect(errs[0].message).toBe('Minimum custom order is $200.')
      }
    })

    it('rejects budget_max of 0', () => {
      expect(inquirySchema.safeParse({ ...validBase, budget_max: 0 }).success).toBe(false)
    })

    it('rejects negative budget_max', () => {
      expect(inquirySchema.safeParse({ ...validBase, budget_max: -100 }).success).toBe(false)
    })

    it('accepts large budget values', () => {
      expect(inquirySchema.safeParse({ ...validBase, budget_max: 100000 }).success).toBe(true)
    })

    it('accepts decimal budget above minimum', () => {
      expect(inquirySchema.safeParse({ ...validBase, budget_max: 200.50 }).success).toBe(true)
    })
  })

  describe('budget_min / budget_max cross-field validation', () => {
    it('rejects when budget_min exceeds budget_max', () => {
      const result = inquirySchema.safeParse({ ...validBase, budget_min: 600, budget_max: 500 })
      expect(result.success).toBe(false)
      if (!result.success) {
        const errs = result.error.issues.filter((e) => e.path[0] === 'budget_min')
        expect(errs.length).toBeGreaterThan(0)
      }
    })

    it('accepts when budget_min equals budget_max', () => {
      expect(inquirySchema.safeParse({ ...validBase, budget_min: 500, budget_max: 500 }).success).toBe(true)
    })

    it('accepts when budget_min is below budget_max', () => {
      expect(inquirySchema.safeParse({ ...validBase, budget_min: 300, budget_max: 500 }).success).toBe(true)
    })

    it('accepts when budget_min is absent', () => {
      expect(inquirySchema.safeParse({ ...validBase }).success).toBe(true)
    })
  })

  describe('facet_cut_id validation', () => {
    it('rejects a non-UUID non-empty string', () => {
      expect(inquirySchema.safeParse({ ...validBase, facet_cut_id: 'not-a-uuid' }).success).toBe(false)
    })

    it('accepts undefined facet_cut_id', () => {
      const result = inquirySchema.safeParse({ ...validBase })
      expect(result.success).toBe(true)
      if (result.success) expect(result.data.facet_cut_id).toBeUndefined()
    })
  })

  describe('multiple field errors', () => {
    it('reports all invalid fields simultaneously', () => {
      const result = inquirySchema.safeParse({ name: '', email: 'bad', title: '', budget_max: 100 })
      expect(result.success).toBe(false)
      if (!result.success) {
        const fields = result.error.issues.map((e) => e.path[0])
        expect(fields).toContain('name')
        expect(fields).toContain('email')
        expect(fields).toContain('title')
        expect(fields).toContain('budget_max')
      }
    })
  })
})
