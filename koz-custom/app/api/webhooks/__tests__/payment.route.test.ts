import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---- Hoisted mocks ----

const { rpcMock, verifyWebhookMock, headerGetMock } = vi.hoisted(() => {
  const rpcMock = vi.fn()
  const verifyWebhookMock = vi.fn()
  const headerGetMock = vi.fn()
  return { rpcMock, verifyWebhookMock, headerGetMock }
})

vi.mock('@/lib/supabase', () => ({ supabase: { rpc: rpcMock } }))
vi.mock('@/lib/payments', () => ({ verifyWebhook: verifyWebhookMock }))
vi.mock('next/headers', () => ({
  headers: vi.fn(async () => ({ get: headerGetMock })),
}))

// Minimal NextResponse mock that lets us inspect status and body
vi.mock('next/server', () => {
  class MockNextResponse {
    _body: unknown
    status: number
    _isJson: boolean

    constructor(body: unknown, opts?: { status?: number }) {
      this._body = body
      this.status = opts?.status ?? 200
      this._isJson = false
    }

    static json(body: unknown, opts?: { status?: number }) {
      const r = new MockNextResponse(body, opts)
      r._isJson = true
      return r
    }

    async json() {
      return this._body
    }

    async text() {
      return String(this._body)
    }
  }

  return { NextResponse: MockNextResponse }
})

import { POST } from '../payment/route'

// Helper to build a minimal Request-like object
function makeRequest(body: string): Request {
  return { text: async () => body } as unknown as Request
}

// Default verified event
const PAID_EVENT = {
  type: 'payment_intent.succeeded',
  paid: true,
  metadata: { milestone_id: 'ms-001', project_id: 'proj-001' },
  transactionId: 'txn_test',
}

describe('POST /api/webhooks/payment', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: no signature headers
    headerGetMock.mockReturnValue(null)
    // Default: webhook verification succeeds with a paid event
    verifyWebhookMock.mockResolvedValue(PAID_EVENT)
    // Default: RPC succeeds
    rpcMock.mockResolvedValue({ data: { updated: true }, error: null })
  })

  describe('webhook verification failures', () => {
    it('returns 400 when verifyWebhook throws an Error', async () => {
      verifyWebhookMock.mockRejectedValue(new Error('Missing webhook signature'))
      const res = await POST(makeRequest('{}'))
      expect(res.status).toBe(400)
    })

    it('includes the error message in the 400 response body', async () => {
      verifyWebhookMock.mockRejectedValue(new Error('invalid signature'))
      const res = await POST(makeRequest('{}'))
      const text = await res.text()
      expect(text).toContain('invalid signature')
    })

    it('returns 400 with generic message when a non-Error is thrown', async () => {
      verifyWebhookMock.mockRejectedValue('string error')
      const res = await POST(makeRequest('{}'))
      expect(res.status).toBe(400)
      const text = await res.text()
      expect(text).toContain('invalid webhook')
    })

    it('includes "Webhook Error:" prefix in the error response', async () => {
      verifyWebhookMock.mockRejectedValue(new Error('bad body'))
      const res = await POST(makeRequest('{}'))
      const text = await res.text()
      expect(text).toContain('Webhook Error:')
    })
  })

  describe('non-paid events', () => {
    it('returns 200 with ignored flag for unpaid events', async () => {
      verifyWebhookMock.mockResolvedValue({ ...PAID_EVENT, paid: false })
      const res = await POST(makeRequest('{}'))
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.received).toBe(true)
      expect(body.ignored).toBe('not a paid event')
    })

    it('does not call supabase RPC for non-paid events', async () => {
      verifyWebhookMock.mockResolvedValue({ ...PAID_EVENT, paid: false })
      await POST(makeRequest('{}'))
      expect(rpcMock).not.toHaveBeenCalled()
    })
  })

  describe('missing metadata', () => {
    it('returns 400 when milestone_id is missing from metadata', async () => {
      verifyWebhookMock.mockResolvedValue({
        ...PAID_EVENT,
        metadata: { project_id: 'proj-001' },
      })
      const res = await POST(makeRequest('{}'))
      expect(res.status).toBe(400)
    })

    it('returns 400 when project_id is missing from metadata', async () => {
      verifyWebhookMock.mockResolvedValue({
        ...PAID_EVENT,
        metadata: { milestone_id: 'ms-001' },
      })
      const res = await POST(makeRequest('{}'))
      expect(res.status).toBe(400)
    })

    it('returns 400 when metadata is empty', async () => {
      verifyWebhookMock.mockResolvedValue({ ...PAID_EVENT, metadata: {} })
      const res = await POST(makeRequest('{}'))
      expect(res.status).toBe(400)
    })

    it('includes "missing metadata" in the 400 response for missing metadata', async () => {
      verifyWebhookMock.mockResolvedValue({ ...PAID_EVENT, metadata: {} })
      const res = await POST(makeRequest('{}'))
      const text = await res.text()
      expect(text).toContain('missing metadata')
    })

    it('does not call supabase RPC when metadata is missing', async () => {
      verifyWebhookMock.mockResolvedValue({ ...PAID_EVENT, metadata: {} })
      await POST(makeRequest('{}'))
      expect(rpcMock).not.toHaveBeenCalled()
    })
  })

  describe('successful webhook processing', () => {
    it('returns 200 with { received: true } on full success', async () => {
      const res = await POST(makeRequest('{}'))
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.received).toBe(true)
    })

    it('includes result data from the RPC in the response', async () => {
      rpcMock.mockResolvedValue({ data: { updated: true }, error: null })
      const res = await POST(makeRequest('{}'))
      const body = await res.json()
      expect(body.result).toEqual({ updated: true })
    })

    it('calls supabase.rpc with "koz_settle_milestone"', async () => {
      await POST(makeRequest('{}'))
      expect(rpcMock).toHaveBeenCalledWith('koz_settle_milestone', expect.any(Object))
    })

    it('passes p_milestone_id from the event metadata', async () => {
      await POST(makeRequest('{}'))
      expect(rpcMock).toHaveBeenCalledWith('koz_settle_milestone', expect.objectContaining({
        p_milestone_id: 'ms-001',
      }))
    })

    it('passes p_project_id from the event metadata', async () => {
      await POST(makeRequest('{}'))
      expect(rpcMock).toHaveBeenCalledWith('koz_settle_milestone', expect.objectContaining({
        p_project_id: 'proj-001',
      }))
    })

    it('passes "Webhook" as p_method', async () => {
      await POST(makeRequest('{}'))
      expect(rpcMock).toHaveBeenCalledWith('koz_settle_milestone', expect.objectContaining({
        p_method: 'Webhook',
      }))
    })

    it('passes the transactionId from the event as p_txn', async () => {
      await POST(makeRequest('{}'))
      expect(rpcMock).toHaveBeenCalledWith('koz_settle_milestone', expect.objectContaining({
        p_txn: 'txn_test',
      }))
    })
  })

  describe('database errors', () => {
    it('returns 500 when supabase RPC returns an error', async () => {
      rpcMock.mockResolvedValue({ data: null, error: { message: 'constraint violation' } })
      const res = await POST(makeRequest('{}'))
      expect(res.status).toBe(500)
    })

    it('includes "DB Error:" prefix in the 500 response', async () => {
      rpcMock.mockResolvedValue({ data: null, error: { message: 'deadlock' } })
      const res = await POST(makeRequest('{}'))
      const text = await res.text()
      expect(text).toContain('DB Error:')
    })

    it('includes the database error message in the 500 response', async () => {
      rpcMock.mockResolvedValue({ data: null, error: { message: 'unique violation' } })
      const res = await POST(makeRequest('{}'))
      const text = await res.text()
      expect(text).toContain('unique violation')
    })
  })

  describe('signature header extraction', () => {
    it('passes stripe-signature header to verifyWebhook', async () => {
      headerGetMock.mockImplementation((name: string) =>
        name === 'stripe-signature' ? 'stripe-sig-value' : null
      )
      await POST(makeRequest('{}'))
      expect(verifyWebhookMock).toHaveBeenCalledWith('{}', 'stripe-sig-value')
    })

    it('falls back to x-cc-webhook-signature when stripe-signature is absent', async () => {
      headerGetMock.mockImplementation((name: string) =>
        name === 'x-cc-webhook-signature' ? 'cc-sig-value' : null
      )
      await POST(makeRequest('{}'))
      expect(verifyWebhookMock).toHaveBeenCalledWith('{}', 'cc-sig-value')
    })

    it('passes null signature when neither header is present', async () => {
      headerGetMock.mockReturnValue(null)
      await POST(makeRequest('{}'))
      expect(verifyWebhookMock).toHaveBeenCalledWith('{}', null)
    })

    it('passes the raw request body to verifyWebhook', async () => {
      const rawBody = JSON.stringify({ type: 'payment_intent.succeeded' })
      await POST(makeRequest(rawBody))
      expect(verifyWebhookMock).toHaveBeenCalledWith(rawBody, null)
    })
  })
})