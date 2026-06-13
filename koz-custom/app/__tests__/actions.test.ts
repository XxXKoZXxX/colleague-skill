import { describe, it, expect, vi, beforeEach } from 'vitest'

// Use vi.hoisted so these mocks are available inside the vi.mock() factory
const { insertMock, fromMock } = vi.hoisted(() => {
  const insertMock = vi.fn()
  const fromMock = vi.fn(() => ({ insert: insertMock }))
  return { insertMock, fromMock }
})

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: { from: fromMock },
}))

import { submitInquiry } from '../actions'
import { revalidatePath } from 'next/cache'

const VALID_UUID = '123e4567-e89b-12d3-a456-426614174000'

// Helper to build a FormData. Empty-string values are included so formData.get()
// returns '' (not null) which passes Zod's optional string checks.
function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData()
  for (const [key, value] of Object.entries(fields)) {
    fd.append(key, value)
  }
  return fd
}

// Base set of valid fields — always include description and facet_cut_id to
// avoid formData.get() returning null (which Zod rejects for z.string() fields).
const validFields = {
  name: 'Jane Smith',
  email: 'jane@example.com',
  budget_usd: '500',
  description: '',
  facet_cut_id: '',
}

describe('submitInquiry', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fromMock.mockImplementation(() => ({ insert: insertMock }))
    // Default: insert succeeds (no error)
    insertMock.mockResolvedValue({ error: null })
  })

  describe('validation failures', () => {
    it('returns fieldErrors when name is empty', async () => {
      const fd = makeFormData({ ...validFields, name: '' })
      const result = await submitInquiry({ success: false }, fd)

      expect(result.success).toBe(false)
      expect(result.fieldErrors?.name).toBeDefined()
      expect(result.fieldErrors?.name).toContain('Name is required')
    })

    it('returns fieldErrors when email is invalid', async () => {
      const fd = makeFormData({ ...validFields, email: 'not-an-email' })
      const result = await submitInquiry({ success: false }, fd)

      expect(result.success).toBe(false)
      expect(result.fieldErrors?.email).toBeDefined()
      expect(result.fieldErrors?.email).toContain('Valid email required')
    })

    it('returns fieldErrors when budget_usd is below minimum', async () => {
      const fd = makeFormData({ ...validFields, budget_usd: '199' })
      const result = await submitInquiry({ success: false }, fd)

      expect(result.success).toBe(false)
      expect(result.fieldErrors?.budget_usd).toBeDefined()
      expect(result.fieldErrors?.budget_usd).toContain('Minimum custom order is $200.')
    })

    it('aggregates fieldErrors for multiple invalid fields simultaneously', async () => {
      const fd = makeFormData({ name: '', email: 'bad', budget_usd: '50', description: '', facet_cut_id: '' })
      const result = await submitInquiry({ success: false }, fd)

      expect(result.success).toBe(false)
      expect(result.fieldErrors?.name).toBeDefined()
      expect(result.fieldErrors?.email).toBeDefined()
      expect(result.fieldErrors?.budget_usd).toBeDefined()
    })

    it('does not call supabase insert when validation fails', async () => {
      const fd = makeFormData({ ...validFields, name: '' })
      await submitInquiry({ success: false }, fd)

      expect(insertMock).not.toHaveBeenCalled()
    })

    it('does not call revalidatePath when validation fails', async () => {
      const fd = makeFormData({ ...validFields, email: 'bad' })
      await submitInquiry({ success: false }, fd)

      expect(revalidatePath).not.toHaveBeenCalled()
    })
  })

  describe('successful submission', () => {
    it('returns { success: true } when formData is valid and insert succeeds', async () => {
      const fd = makeFormData(validFields)
      const result = await submitInquiry({ success: false }, fd)

      expect(result.success).toBe(true)
      expect(result.error).toBeUndefined()
      expect(result.fieldErrors).toBeUndefined()
    })

    it('calls supabase from("inquiries").insert with correct data', async () => {
      const fd = makeFormData({
        ...validFields,
        description: 'A sapphire ring',
        facet_cut_id: VALID_UUID,
      })
      await submitInquiry({ success: false }, fd)

      expect(fromMock).toHaveBeenCalledWith('inquiries')
      expect(insertMock).toHaveBeenCalledWith({
        name: 'Jane Smith',
        email: 'jane@example.com',
        budget_usd: 500,
        description: 'A sapphire ring',
        facet_cut_id: VALID_UUID,
      })
    })

    it('calls revalidatePath("/admin") on success', async () => {
      const fd = makeFormData(validFields)
      await submitInquiry({ success: false }, fd)

      expect(revalidatePath).toHaveBeenCalledWith('/admin')
    })

    it('stores null for facet_cut_id when provided as empty string (|| null coercion)', async () => {
      // Empty string facet_cut_id → '' || null = null in the insert
      const fd = makeFormData({ ...validFields, facet_cut_id: '' })
      await submitInquiry({ success: false }, fd)

      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({ facet_cut_id: null })
      )
    })

    it('stores the UUID for facet_cut_id when a valid UUID is provided', async () => {
      const fd = makeFormData({ ...validFields, facet_cut_id: VALID_UUID })
      await submitInquiry({ success: false }, fd)

      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({ facet_cut_id: VALID_UUID })
      )
    })

    it('accepts budget_usd exactly at the minimum (200)', async () => {
      const fd = makeFormData({ ...validFields, budget_usd: '200' })
      const result = await submitInquiry({ success: false }, fd)

      expect(result.success).toBe(true)
    })

    it('converts budget_usd string from FormData to a number before inserting', async () => {
      const fd = makeFormData({ ...validFields, budget_usd: '750' })
      await submitInquiry({ success: false }, fd)

      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({ budget_usd: 750 })
      )
    })

    it('preserves non-empty description string in the insert payload', async () => {
      const fd = makeFormData({ ...validFields, description: 'Custom emerald necklace' })
      await submitInquiry({ success: false }, fd)

      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({ description: 'Custom emerald necklace' })
      )
    })
  })

  describe('database error handling', () => {
    it('returns { success: false, error } when supabase insert fails', async () => {
      insertMock.mockResolvedValue({ error: { message: 'duplicate key value' } })

      const fd = makeFormData(validFields)
      const result = await submitInquiry({ success: false }, fd)

      expect(result.success).toBe(false)
      expect(result.error).toBe('duplicate key value')
    })

    it('does not call revalidatePath when supabase insert fails', async () => {
      insertMock.mockResolvedValue({ error: { message: 'connection refused' } })

      const fd = makeFormData(validFields)
      await submitInquiry({ success: false }, fd)

      expect(revalidatePath).not.toHaveBeenCalled()
    })

    it('returns no fieldErrors on a DB-level error (it is not a validation error)', async () => {
      insertMock.mockResolvedValue({ error: { message: 'db error' } })

      const fd = makeFormData(validFields)
      const result = await submitInquiry({ success: false }, fd)

      expect(result.fieldErrors).toBeUndefined()
    })

    it('surfaces only the error message string, not the full supabase error object', async () => {
      insertMock.mockResolvedValue({ error: { message: 'row-level security violation', code: '42501' } })

      const fd = makeFormData(validFields)
      const result = await submitInquiry({ success: false }, fd)

      expect(result.error).toBe('row-level security violation')
    })
  })
})