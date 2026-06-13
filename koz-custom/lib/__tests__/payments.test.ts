import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { activeProvider, verifyWebhook } from '../payments'

describe('activeProvider', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns "mock" when no provider keys are set', () => {
    vi.stubEnv('STRIPE_SECRET_KEY', '')
    vi.stubEnv('BTCPAY_API_KEY', '')
    vi.stubEnv('COINBASE_COMMERCE_KEY', '')
    expect(activeProvider()).toBe('mock')
  })

  it('returns "stripe" when STRIPE_SECRET_KEY is set', () => {
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_abc123')
    vi.stubEnv('BTCPAY_API_KEY', '')
    vi.stubEnv('COINBASE_COMMERCE_KEY', '')
    expect(activeProvider()).toBe('stripe')
  })

  it('returns "btcpay" when only BTCPAY_API_KEY is set', () => {
    vi.stubEnv('STRIPE_SECRET_KEY', '')
    vi.stubEnv('BTCPAY_API_KEY', 'btcpay-token')
    vi.stubEnv('COINBASE_COMMERCE_KEY', '')
    expect(activeProvider()).toBe('btcpay')
  })

  it('returns "coinbase" when only COINBASE_COMMERCE_KEY is set', () => {
    vi.stubEnv('STRIPE_SECRET_KEY', '')
    vi.stubEnv('BTCPAY_API_KEY', '')
    vi.stubEnv('COINBASE_COMMERCE_KEY', 'cbkey')
    expect(activeProvider()).toBe('coinbase')
  })

  it('stripe takes priority over btcpay when both are set', () => {
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test')
    vi.stubEnv('BTCPAY_API_KEY', 'btcpay-key')
    vi.stubEnv('COINBASE_COMMERCE_KEY', '')
    expect(activeProvider()).toBe('stripe')
  })

  it('stripe takes priority over coinbase when both are set', () => {
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test')
    vi.stubEnv('BTCPAY_API_KEY', '')
    vi.stubEnv('COINBASE_COMMERCE_KEY', 'cbkey')
    expect(activeProvider()).toBe('stripe')
  })

  it('btcpay takes priority over coinbase when both are set (no stripe)', () => {
    vi.stubEnv('STRIPE_SECRET_KEY', '')
    vi.stubEnv('BTCPAY_API_KEY', 'btcpay-key')
    vi.stubEnv('COINBASE_COMMERCE_KEY', 'cbkey')
    expect(activeProvider()).toBe('btcpay')
  })

  it('returns "mock" when all env vars are empty strings', () => {
    vi.stubEnv('STRIPE_SECRET_KEY', '')
    vi.stubEnv('BTCPAY_API_KEY', '')
    vi.stubEnv('COINBASE_COMMERCE_KEY', '')
    expect(activeProvider()).toBe('mock')
  })
})

describe('verifyWebhook (mock provider)', () => {
  beforeEach(() => {
    // Ensure mock provider by clearing all provider keys
    vi.stubEnv('STRIPE_SECRET_KEY', '')
    vi.stubEnv('BTCPAY_API_KEY', '')
    vi.stubEnv('COINBASE_COMMERCE_KEY', '')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  describe('valid JSON body', () => {
    it('parses a standard succeeded event', async () => {
      const body = JSON.stringify({
        type: 'payment_intent.succeeded',
        metadata: { milestone_id: 'ms-1', project_id: 'proj-1' },
        transactionId: 'txn_abc',
      })
      const event = await verifyWebhook(body, null)
      expect(event.type).toBe('payment_intent.succeeded')
      expect(event.paid).toBe(true)
      expect(event.metadata.milestone_id).toBe('ms-1')
      expect(event.metadata.project_id).toBe('proj-1')
      expect(event.transactionId).toBe('txn_abc')
    })

    it('marks event as paid when type includes "succeeded"', async () => {
      const body = JSON.stringify({ type: 'payment_intent.succeeded' })
      const event = await verifyWebhook(body, null)
      expect(event.paid).toBe(true)
    })

    it('marks event as paid when type includes "confirmed"', async () => {
      const body = JSON.stringify({ type: 'charge.confirmed' })
      const event = await verifyWebhook(body, null)
      expect(event.paid).toBe(true)
    })

    it('marks event as NOT paid for unrelated event types', async () => {
      const body = JSON.stringify({ type: 'payment_intent.created' })
      const event = await verifyWebhook(body, null)
      expect(event.paid).toBe(false)
    })

    it('defaults type to "payment_intent.succeeded" when absent', async () => {
      const body = JSON.stringify({ metadata: { milestone_id: 'ms-1', project_id: 'p-1' } })
      const event = await verifyWebhook(body, null)
      expect(event.type).toBe('payment_intent.succeeded')
      expect(event.paid).toBe(true)
    })

    it('defaults metadata to empty object when absent', async () => {
      const body = JSON.stringify({ type: 'payment_intent.succeeded', transactionId: 'txn_x' })
      const event = await verifyWebhook(body, null)
      expect(event.metadata).toEqual({})
    })

    it('generates a mock transactionId when transactionId is absent', async () => {
      const body = JSON.stringify({ type: 'payment_intent.succeeded' })
      const event = await verifyWebhook(body, null)
      expect(event.transactionId).toMatch(/^mock_\d+$/)
    })

    it('uses provided transactionId over generated one', async () => {
      const body = JSON.stringify({ type: 'payment_intent.succeeded', transactionId: 'real_id_999' })
      const event = await verifyWebhook(body, null)
      expect(event.transactionId).toBe('real_id_999')
    })

    it('ignores signature in mock mode (does not throw)', async () => {
      const body = JSON.stringify({ type: 'payment_intent.succeeded' })
      await expect(verifyWebhook(body, 'some-sig')).resolves.not.toThrow()
    })

    it('returns a VerifiedEvent with all required fields', async () => {
      const body = JSON.stringify({ type: 'payment_intent.succeeded', transactionId: 'txn' })
      const event = await verifyWebhook(body, null)
      expect(event).toHaveProperty('type')
      expect(event).toHaveProperty('paid')
      expect(event).toHaveProperty('metadata')
      expect(event).toHaveProperty('transactionId')
    })

    it('handles empty metadata object', async () => {
      const body = JSON.stringify({ type: 'charge.confirmed', metadata: {} })
      const event = await verifyWebhook(body, null)
      expect(event.metadata).toEqual({})
      expect(event.paid).toBe(true)
    })
  })

  describe('invalid JSON body', () => {
    it('throws "Invalid webhook body" on non-JSON input', async () => {
      await expect(verifyWebhook('not-json', null)).rejects.toThrow('Invalid webhook body')
    })

    it('throws on empty string body', async () => {
      await expect(verifyWebhook('', null)).rejects.toThrow('Invalid webhook body')
    })

    it('throws on truncated JSON', async () => {
      await expect(verifyWebhook('{"type":', null)).rejects.toThrow('Invalid webhook body')
    })
  })
})

describe('verifyWebhook (stripe provider)', () => {
  beforeEach(() => {
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_stripe')
    vi.stubEnv('BTCPAY_API_KEY', '')
    vi.stubEnv('COINBASE_COMMERCE_KEY', '')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('throws "Missing webhook signature" when signature is null in stripe mode', async () => {
    const body = JSON.stringify({ type: 'payment_intent.succeeded' })
    await expect(verifyWebhook(body, null)).rejects.toThrow('Missing webhook signature')
  })

  it('falls through to JSON parsing when signature is provided in stripe mode', async () => {
    // Current stub implementation: with a signature, stripe provider falls through to JSON parse
    const body = JSON.stringify({
      type: 'payment_intent.succeeded',
      metadata: { milestone_id: 'ms-1', project_id: 'p-1' },
      transactionId: 'txn_stripe',
    })
    const event = await verifyWebhook(body, 'whsec_sig')
    expect(event.paid).toBe(true)
    expect(event.transactionId).toBe('txn_stripe')
  })

  it('throws on invalid JSON even when signature is present in stripe mode', async () => {
    await expect(verifyWebhook('bad-json', 'whsec_sig')).rejects.toThrow('Invalid webhook body')
  })
})
