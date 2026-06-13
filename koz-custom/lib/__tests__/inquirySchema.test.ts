import { describe, it, expect } from 'vitest'
import { inquirySchema } from '../inquirySchema'

const VALID_UUID = '123e4567-e89b-12d3-a456-426614174000'

const validBase = {
  name: 'Jane Smith',
  email: 'jane@example.com',
  budget_usd: 500,
}

describe('inquirySchema', () => {
  describe('valid inputs', () => {
    it('accepts a minimal valid object', () => {
      const result = inquirySchema.safeParse(validBase)
      expect(result.success).toBe(true)
    })

    it('accepts a fully populated valid object', () => {
      const result = inquirySchema.safeParse({
        ...validBase,
        description: 'A beautiful sapphire ring.',
        facet_cut_id: VALID_UUID,
      })
      expect(result.success).toBe(true)
    })

    it('accepts budget_usd exactly at minimum (200)', () => {
      const result = inquirySchema.safeParse({ ...validBase, budget_usd: 200 })
      expect(result.success).toBe(true)
    })

    it('accepts empty string for facet_cut_id', () => {
      const result = inquirySchema.safeParse({ ...validBase, facet_cut_id: '' })
      expect(result.success).toBe(true)
    })

    it('accepts a valid UUID for facet_cut_id', () => {
      const result = inquirySchema.safeParse({ ...validBase, facet_cut_id: VALID_UUID })
      expect(result.success).toBe(true)
    })

    it('accepts object without optional fields (description, facet_cut_id)', () => {
      const result = inquirySchema.safeParse({ name: 'Bob', email: 'bob@test.com', budget_usd: 300 })
      expect(result.success).toBe(true)
    })

    it('accepts an empty description string', () => {
      const result = inquirySchema.safeParse({ ...validBase, description: '' })
      expect(result.success).toBe(true)
    })

    it('returns parsed data with correct types on success', () => {
      const result = inquirySchema.safeParse({
        ...validBase,
        description: 'Custom piece',
        facet_cut_id: VALID_UUID,
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.name).toBe('Jane Smith')
        expect(result.data.email).toBe('jane@example.com')
        expect(result.data.budget_usd).toBe(500)
        expect(result.data.description).toBe('Custom piece')
        expect(result.data.facet_cut_id).toBe(VALID_UUID)
      }
    })
  })

  describe('name validation', () => {
    it('rejects empty name', () => {
      const result = inquirySchema.safeParse({ ...validBase, name: '' })
      expect(result.success).toBe(false)
      if (!result.success) {
        const nameErrors = result.error.issues.filter((e) => e.path[0] === 'name')
        expect(nameErrors.length).toBeGreaterThan(0)
        expect(nameErrors[0].message).toBe('Name is required')
      }
    })

    it('rejects missing name', () => {
      const { name: _name, ...withoutName } = validBase
      const result = inquirySchema.safeParse(withoutName)
      expect(result.success).toBe(false)
    })

    it('accepts a single-character name', () => {
      const result = inquirySchema.safeParse({ ...validBase, name: 'A' })
      expect(result.success).toBe(true)
    })
  })

  describe('email validation', () => {
    it('rejects an invalid email (no @)', () => {
      const result = inquirySchema.safeParse({ ...validBase, email: 'notanemail' })
      expect(result.success).toBe(false)
      if (!result.success) {
        const emailErrors = result.error.issues.filter((e) => e.path[0] === 'email')
        expect(emailErrors.length).toBeGreaterThan(0)
        expect(emailErrors[0].message).toBe('Valid email required')
      }
    })

    it('rejects email missing domain', () => {
      const result = inquirySchema.safeParse({ ...validBase, email: 'user@' })
      expect(result.success).toBe(false)
    })

    it('rejects empty email', () => {
      const result = inquirySchema.safeParse({ ...validBase, email: '' })
      expect(result.success).toBe(false)
    })

    it('accepts a valid email with subdomain', () => {
      const result = inquirySchema.safeParse({ ...validBase, email: 'user@mail.example.com' })
      expect(result.success).toBe(true)
    })
  })

  describe('budget_usd validation', () => {
    it('rejects budget below minimum (199)', () => {
      const result = inquirySchema.safeParse({ ...validBase, budget_usd: 199 })
      expect(result.success).toBe(false)
      if (!result.success) {
        const budgetErrors = result.error.issues.filter((e) => e.path[0] === 'budget_usd')
        expect(budgetErrors.length).toBeGreaterThan(0)
        expect(budgetErrors[0].message).toBe('Minimum custom order is $200.')
      }
    })

    it('rejects budget of 0', () => {
      const result = inquirySchema.safeParse({ ...validBase, budget_usd: 0 })
      expect(result.success).toBe(false)
    })

    it('rejects negative budget', () => {
      const result = inquirySchema.safeParse({ ...validBase, budget_usd: -100 })
      expect(result.success).toBe(false)
    })

    it('accepts large budget values', () => {
      const result = inquirySchema.safeParse({ ...validBase, budget_usd: 100000 })
      expect(result.success).toBe(true)
    })

    it('accepts a decimal budget above minimum', () => {
      const result = inquirySchema.safeParse({ ...validBase, budget_usd: 200.50 })
      expect(result.success).toBe(true)
    })
  })

  describe('facet_cut_id validation', () => {
    it('rejects a non-UUID non-empty string', () => {
      const result = inquirySchema.safeParse({ ...validBase, facet_cut_id: 'not-a-uuid' })
      expect(result.success).toBe(false)
    })

    it('rejects a numeric string as facet_cut_id', () => {
      const result = inquirySchema.safeParse({ ...validBase, facet_cut_id: '12345' })
      expect(result.success).toBe(false)
    })

    it('accepts undefined facet_cut_id (not provided)', () => {
      const result = inquirySchema.safeParse({ ...validBase })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.facet_cut_id).toBeUndefined()
      }
    })
  })

  describe('multiple field errors', () => {
    it('reports errors for all invalid fields simultaneously', () => {
      const result = inquirySchema.safeParse({
        name: '',
        email: 'bad-email',
        budget_usd: 100,
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        const fields = result.error.issues.map((e) => e.path[0])
        expect(fields).toContain('name')
        expect(fields).toContain('email')
        expect(fields).toContain('budget_usd')
      }
    })
  })
})