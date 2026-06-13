import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetchMetalPrices } from '../metals'

function makeFetchResponse(body: unknown, ok = true): Response {
  return { ok, json: async () => body } as Response
}

describe('fetchMetalPrices', () => {
  beforeEach(() => { vi.stubEnv('METALS_API_KEY', 'test-api-key') })
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals() })

  describe('successful API response', () => {
    it('returns gold, silver, and platinum prices', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
        makeFetchResponse({ metals: { gold: 1900.50, silver: 24.30, platinum: 1050.00 } })
      ))
      const prices = await fetchMetalPrices()
      expect(prices.gold).toBe(1900.50)
      expect(prices.silver).toBe(24.30)
      expect(prices.platinum).toBe(1050.00)
    })

    it('returns a fetchedAt ISO string timestamp', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
        makeFetchResponse({ metals: { gold: 1900, silver: 24, platinum: 1050 } })
      ))
      const prices = await fetchMetalPrices()
      expect(prices.fetchedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
      expect(() => new Date(prices.fetchedAt)).not.toThrow()
    })

    it('falls back to null for missing metals', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
        makeFetchResponse({ metals: { gold: 1900 } })
      ))
      const prices = await fetchMetalPrices()
      expect(prices.gold).toBe(1900)
      expect(prices.silver).toBeNull()
      expect(prices.platinum).toBeNull()
    })

    it('falls back to null when metals key is absent', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(makeFetchResponse({})))
      const prices = await fetchMetalPrices()
      expect(prices.gold).toBeNull()
      expect(prices.silver).toBeNull()
      expect(prices.platinum).toBeNull()
    })

    it('calls fetch with correct URL params', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        makeFetchResponse({ metals: { gold: 1900, silver: 24, platinum: 1050 } })
      )
      vi.stubGlobal('fetch', mockFetch)
      await fetchMetalPrices()
      const [url] = mockFetch.mock.calls[0]
      expect(url).toContain('test-api-key')
      expect(url).toContain('currency=USD')
      expect(url).toContain('unit=toz')
    })

    it('passes revalidate: 300 in fetch options', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        makeFetchResponse({ metals: { gold: 1900, silver: 24, platinum: 1050 } })
      )
      vi.stubGlobal('fetch', mockFetch)
      await fetchMetalPrices()
      const [, options] = mockFetch.mock.calls[0]
      expect(options?.next?.revalidate).toBe(300)
    })
  })

  describe('error handling', () => {
    it('returns null prices on non-ok status', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(makeFetchResponse({}, false)))
      const prices = await fetchMetalPrices()
      expect(prices.gold).toBeNull()
      expect(prices.silver).toBeNull()
      expect(prices.platinum).toBeNull()
      expect(prices.fetchedAt).toBeTruthy()
    })

    it('returns null prices on network error', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network failure')))
      const prices = await fetchMetalPrices()
      expect(prices.gold).toBeNull()
      expect(prices.silver).toBeNull()
      expect(prices.platinum).toBeNull()
    })

    it('returns valid fetchedAt on error', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Timeout')))
      const prices = await fetchMetalPrices()
      expect(prices.fetchedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    })

    it('returns null prices when json() throws', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: async () => { throw new Error('invalid json') },
      }))
      const prices = await fetchMetalPrices()
      expect(prices.gold).toBeNull()
    })
  })

  describe('return shape', () => {
    it('always returns an object with the correct shape', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('fail')))
      const prices = await fetchMetalPrices()
      expect(prices).toHaveProperty('gold')
      expect(prices).toHaveProperty('silver')
      expect(prices).toHaveProperty('platinum')
      expect(prices).toHaveProperty('fetchedAt')
    })
  })
})
