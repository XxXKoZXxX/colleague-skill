import { describe, it, expect, vi, beforeEach } from 'vitest'

// Build the mock chain: from('koz_projects').insert(...).select('id').single()
const { singleMock, selectMock, insertMock, fromMock } = vi.hoisted(() => {
  const singleMock = vi.fn()
  const selectMock = vi.fn(() => ({ single: singleMock }))
  const insertMock = vi.fn(() => ({ select: selectMock }))
  const fromMock = vi.fn(() => ({ insert: insertMock }))
  return { singleMock, selectMock, insertMock, fromMock }
})

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/supabase', () => ({ supabase: { from: fromMock } }))

import { submitInquiry } from '../actions'
import { revalidatePath } from 'next/cache'

const VALID_UUID = '123e4567-e89b-12d3-a456-426614174000'

function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData()
  for (const [k, v] of Object.entries(fields)) fd.append(k, v)
  return fd
}

const validFields = {
  name: 'Jane Smith',
  email: 'jane@example.com',
  title: 'Custom Opal Ring',
  budget_max: '500',
  description: '',
  facet_cut_id: '',
}

describe('submitInquiry', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fromMock.mockImplementation(() => ({ insert: insertMock }))
    insertMock.mockImplementation(() => ({ select: selectMock }))
    selectMock.mockImplementation(() => ({ single: singleMock }))
    // Default success: returns an id
    singleMock.mockResolvedValue({ data: { id: VALID_UUID }, error: null })
  })

  describe('validation failures', () => {
    it('returns fieldErrors when name is empty', async () => {
      const result = await submitInquiry({ success: false }, makeFormData({ ...validFields, name: '' }))
      expect(result.success).toBe(false)
      expect(result.fieldErrors?.name).toContain('Name is required')
    })

    it('returns fieldErrors when title is empty', async () => {
      const result = await submitInquiry({ success: false }, makeFormData({ ...validFields, title: '' }))
      expect(result.success).toBe(false)
      expect(result.fieldErrors?.title).toBeDefined()
    })

    it('returns fieldErrors when email is invalid', async () => {
      const result = await submitInquiry({ success: false }, makeFormData({ ...validFields, email: 'bad' }))
      expect(result.success).toBe(false)
      expect(result.fieldErrors?.email).toContain('Valid email required')
    })

    it('returns fieldErrors when budget_max is below $200', async () => {
      const result = await submitInquiry({ success: false }, makeFormData({ ...validFields, budget_max: '199' }))
      expect(result.success).toBe(false)
      expect(result.fieldErrors?.budget_max).toContain('Minimum custom order is $200.')
    })

    it('aggregates errors across all invalid fields', async () => {
      const result = await submitInquiry({ success: false }, makeFormData({
        name: '', email: 'bad', title: '', budget_max: '50', description: '', facet_cut_id: '',
      }))
      expect(result.success).toBe(false)
      expect(result.fieldErrors?.name).toBeDefined()
      expect(result.fieldErrors?.email).toBeDefined()
      expect(result.fieldErrors?.title).toBeDefined()
      expect(result.fieldErrors?.budget_max).toBeDefined()
    })

    it('does not call supabase when validation fails', async () => {
      await submitInquiry({ success: false }, makeFormData({ ...validFields, name: '' }))
      expect(insertMock).not.toHaveBeenCalled()
    })

    it('does not call revalidatePath when validation fails', async () => {
      await submitInquiry({ success: false }, makeFormData({ ...validFields, email: 'bad' }))
      expect(revalidatePath).not.toHaveBeenCalled()
    })
  })

  describe('successful submission', () => {
    it('returns { success: true } on valid input', async () => {
      const result = await submitInquiry({ success: false }, makeFormData(validFields))
      expect(result.success).toBe(true)
      expect(result.error).toBeUndefined()
      expect(result.fieldErrors).toBeUndefined()
    })

    it('returns the projectId from the inserted row', async () => {
      const result = await submitInquiry({ success: false }, makeFormData(validFields))
      expect(result.projectId).toBe(VALID_UUID)
    })

    it('inserts into koz_projects (not inquiries)', async () => {
      await submitInquiry({ success: false }, makeFormData(validFields))
      expect(fromMock).toHaveBeenCalledWith('koz_projects')
    })

    it('maps name -> client_name and email -> client_email', async () => {
      await submitInquiry({ success: false }, makeFormData(validFields))
      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({ client_name: 'Jane Smith', client_email: 'jane@example.com' })
      )
    })

    it('inserts with status "inquiry"', async () => {
      await submitInquiry({ success: false }, makeFormData(validFields))
      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'inquiry' })
      )
    })

    it('converts budget_max to a number', async () => {
      await submitInquiry({ success: false }, makeFormData({ ...validFields, budget_max: '750' }))
      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({ budget_max: 750 })
      )
    })

    it('stores null for facet_cut_id when empty string', async () => {
      await submitInquiry({ success: false }, makeFormData({ ...validFields, facet_cut_id: '' }))
      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({ facet_cut_id: null })
      )
    })

    it('stores the UUID for facet_cut_id when provided', async () => {
      await submitInquiry({ success: false }, makeFormData({ ...validFields, facet_cut_id: VALID_UUID }))
      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({ facet_cut_id: VALID_UUID })
      )
    })

    it('accepts budget_max exactly at the minimum (200)', async () => {
      const result = await submitInquiry({ success: false }, makeFormData({ ...validFields, budget_max: '200' }))
      expect(result.success).toBe(true)
    })

    it('calls revalidatePath("/admin") on success', async () => {
      await submitInquiry({ success: false }, makeFormData(validFields))
      expect(revalidatePath).toHaveBeenCalledWith('/admin')
    })
  })

  describe('database error handling', () => {
    it('returns { success: false, error } when supabase returns an error', async () => {
      singleMock.mockResolvedValue({ data: null, error: { message: 'duplicate key value' } })
      const result = await submitInquiry({ success: false }, makeFormData(validFields))
      expect(result.success).toBe(false)
      expect(result.error).toBe('duplicate key value')
    })

    it('does not call revalidatePath on DB error', async () => {
      singleMock.mockResolvedValue({ data: null, error: { message: 'connection refused' } })
      await submitInquiry({ success: false }, makeFormData(validFields))
      expect(revalidatePath).not.toHaveBeenCalled()
    })

    it('surfaces only the error message string', async () => {
      singleMock.mockResolvedValue({ data: null, error: { message: 'rls violation', code: '42501' } })
      const result = await submitInquiry({ success: false }, makeFormData(validFields))
      expect(result.error).toBe('rls violation')
    })

    it('returns no fieldErrors on a DB-level error', async () => {
      singleMock.mockResolvedValue({ data: null, error: { message: 'db error' } })
      const result = await submitInquiry({ success: false }, makeFormData(validFields))
      expect(result.fieldErrors).toBeUndefined()
    })
  })
})
