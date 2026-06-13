import { describe, it, expect, vi, beforeEach } from 'vitest'

// Hoist the rpc mock so it is available before module imports
const { rpcMock } = vi.hoisted(() => {
  const rpcMock = vi.fn()
  return { rpcMock }
})

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/supabase', () => ({ supabase: { rpc: rpcMock } }))

import { markMilestonePaid, payMilestone } from '../actions'
import { revalidatePath } from 'next/cache'

const MILESTONE_ID = 'aaaa-1111'
const PROJECT_ID = 'bbbb-2222'

describe('markMilestonePaid', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: RPC succeeds
    rpcMock.mockResolvedValue({ data: { updated: true }, error: null })
  })

  describe('successful settlement', () => {
    it('returns { ok: true } on RPC success', async () => {
      const result = await markMilestonePaid(MILESTONE_ID, PROJECT_ID, 'Stripe')
      expect(result.ok).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('calls supabase.rpc with "koz_settle_milestone"', async () => {
      await markMilestonePaid(MILESTONE_ID, PROJECT_ID, 'Wire')
      expect(rpcMock).toHaveBeenCalledWith('koz_settle_milestone', expect.any(Object))
    })

    it('passes p_milestone_id correctly', async () => {
      await markMilestonePaid(MILESTONE_ID, PROJECT_ID, 'Cash')
      expect(rpcMock).toHaveBeenCalledWith('koz_settle_milestone', expect.objectContaining({
        p_milestone_id: MILESTONE_ID,
      }))
    })

    it('passes p_project_id correctly', async () => {
      await markMilestonePaid(MILESTONE_ID, PROJECT_ID, 'Cash')
      expect(rpcMock).toHaveBeenCalledWith('koz_settle_milestone', expect.objectContaining({
        p_project_id: PROJECT_ID,
      }))
    })

    it('passes p_method correctly', async () => {
      await markMilestonePaid(MILESTONE_ID, PROJECT_ID, 'BTC')
      expect(rpcMock).toHaveBeenCalledWith('koz_settle_milestone', expect.objectContaining({
        p_method: 'BTC',
      }))
    })

    it('passes p_txn as null when transactionRef is omitted', async () => {
      await markMilestonePaid(MILESTONE_ID, PROJECT_ID, 'Cash')
      expect(rpcMock).toHaveBeenCalledWith('koz_settle_milestone', expect.objectContaining({
        p_txn: null,
      }))
    })

    it('passes p_txn as the provided transactionRef', async () => {
      await markMilestonePaid(MILESTONE_ID, PROJECT_ID, 'Wire', 'ref-xyz-789')
      expect(rpcMock).toHaveBeenCalledWith('koz_settle_milestone', expect.objectContaining({
        p_txn: 'ref-xyz-789',
      }))
    })

    it('calls revalidatePath("/admin") on success', async () => {
      await markMilestonePaid(MILESTONE_ID, PROJECT_ID, 'Stripe')
      expect(revalidatePath).toHaveBeenCalledWith('/admin')
    })

    it('calls revalidatePath for the project page on success', async () => {
      await markMilestonePaid(MILESTONE_ID, PROJECT_ID, 'Stripe')
      expect(revalidatePath).toHaveBeenCalledWith(`/projects/${PROJECT_ID}`)
    })

    it('calls revalidatePath exactly twice on success', async () => {
      await markMilestonePaid(MILESTONE_ID, PROJECT_ID, 'Stripe')
      expect(revalidatePath).toHaveBeenCalledTimes(2)
    })

    it('includes the correct project ID in the project path revalidation', async () => {
      const specificId = 'my-unique-project-id'
      await markMilestonePaid(MILESTONE_ID, specificId, 'Cash')
      expect(revalidatePath).toHaveBeenCalledWith(`/projects/${specificId}`)
    })
  })

  describe('RPC error handling', () => {
    it('returns { ok: false } when RPC returns an error', async () => {
      rpcMock.mockResolvedValue({ data: null, error: { message: 'RPC failed' } })
      const result = await markMilestonePaid(MILESTONE_ID, PROJECT_ID, 'Stripe')
      expect(result.ok).toBe(false)
    })

    it('surfaces the error message from the RPC error', async () => {
      rpcMock.mockResolvedValue({ data: null, error: { message: 'foreign key violation' } })
      const result = await markMilestonePaid(MILESTONE_ID, PROJECT_ID, 'Stripe')
      expect(result.error).toBe('foreign key violation')
    })

    it('does not call revalidatePath when RPC fails', async () => {
      rpcMock.mockResolvedValue({ data: null, error: { message: 'connection refused' } })
      await markMilestonePaid(MILESTONE_ID, PROJECT_ID, 'Cash')
      expect(revalidatePath).not.toHaveBeenCalled()
    })

    it('returns error message only, not the full error object', async () => {
      rpcMock.mockResolvedValue({ data: null, error: { message: 'permission denied', code: '42501' } })
      const result = await markMilestonePaid(MILESTONE_ID, PROJECT_ID, 'Stripe')
      expect(result.error).toBe('permission denied')
      expect(result.error).not.toContain('42501')
    })

    it('returns ok: false when milestone does not exist', async () => {
      rpcMock.mockResolvedValue({ data: null, error: { message: 'milestone not found' } })
      const result = await markMilestonePaid('nonexistent-ms', PROJECT_ID, 'Stripe')
      expect(result.ok).toBe(false)
      expect(result.error).toBe('milestone not found')
    })
  })
})

describe('payMilestone', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: RPC succeeds
    rpcMock.mockResolvedValue({ data: { updated: true }, error: null })
  })

  it('returns { ok: true } on success', async () => {
    const result = await payMilestone(MILESTONE_ID, PROJECT_ID)
    expect(result.ok).toBe(true)
  })

  it('calls the RPC with "Mock Checkout" as the payment method', async () => {
    await payMilestone(MILESTONE_ID, PROJECT_ID)
    expect(rpcMock).toHaveBeenCalledWith('koz_settle_milestone', expect.objectContaining({
      p_method: 'Mock Checkout',
    }))
  })

  it('passes the correct milestone ID to the RPC', async () => {
    await payMilestone(MILESTONE_ID, PROJECT_ID)
    expect(rpcMock).toHaveBeenCalledWith('koz_settle_milestone', expect.objectContaining({
      p_milestone_id: MILESTONE_ID,
    }))
  })

  it('passes the correct project ID to the RPC', async () => {
    await payMilestone(MILESTONE_ID, PROJECT_ID)
    expect(rpcMock).toHaveBeenCalledWith('koz_settle_milestone', expect.objectContaining({
      p_project_id: PROJECT_ID,
    }))
  })

  it('passes null as p_txn (no transaction ref)', async () => {
    await payMilestone(MILESTONE_ID, PROJECT_ID)
    expect(rpcMock).toHaveBeenCalledWith('koz_settle_milestone', expect.objectContaining({
      p_txn: null,
    }))
  })

  it('propagates RPC error as { ok: false, error }', async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: 'mock checkout failed' } })
    const result = await payMilestone(MILESTONE_ID, PROJECT_ID)
    expect(result.ok).toBe(false)
    expect(result.error).toBe('mock checkout failed')
  })

  it('calls revalidatePath("/admin") on success', async () => {
    await payMilestone(MILESTONE_ID, PROJECT_ID)
    expect(revalidatePath).toHaveBeenCalledWith('/admin')
  })

  it('calls revalidatePath for the project page on success', async () => {
    await payMilestone(MILESTONE_ID, PROJECT_ID)
    expect(revalidatePath).toHaveBeenCalledWith(`/projects/${PROJECT_ID}`)
  })

  it('does not call revalidatePath when RPC fails', async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: 'db error' } })
    await payMilestone(MILESTONE_ID, PROJECT_ID)
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it('calls the RPC exactly once', async () => {
    await payMilestone(MILESTONE_ID, PROJECT_ID)
    expect(rpcMock).toHaveBeenCalledTimes(1)
  })
})