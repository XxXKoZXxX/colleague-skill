import { describe, it, expect } from 'vitest'
import { calculateQuote } from '../pricing'

describe('calculateQuote', () => {
  it('calculates basic quote: hours * 100 * multiplier + materialCost', () => {
    expect(calculateQuote(4, 150, 1.0)).toBe(550)
  })

  it('matches the admin dashboard example (4h, $150, 1.4)', () => {
    expect(calculateQuote(4, 150, 1.4)).toBe(710)
  })

  it('handles zero hours', () => {
    expect(calculateQuote(0, 200, 1.5)).toBe(200)
  })

  it('handles zero material cost', () => {
    expect(calculateQuote(2, 0, 2.0)).toBe(400)
  })

  it('handles complexity multiplier of 1.0', () => {
    expect(calculateQuote(10, 500, 1.0)).toBe(1500)
  })

  it('handles fractional hours', () => {
    expect(calculateQuote(1.5, 0, 1.0)).toBe(150)
  })

  it('handles fractional complexity multiplier', () => {
    expect(calculateQuote(3, 100, 1.75)).toBe(625)
  })

  it('handles large values', () => {
    expect(calculateQuote(1000, 10000, 5.0)).toBe(510000)
  })

  it('returns a number', () => {
    expect(typeof calculateQuote(1, 100, 1)).toBe('number')
  })

  it('labor scales linearly with hours', () => {
    const q1 = calculateQuote(1, 0, 1.0)
    const q2 = calculateQuote(2, 0, 1.0)
    const q4 = calculateQuote(4, 0, 1.0)
    expect(q2).toBe(q1 * 2)
    expect(q4).toBe(q1 * 4)
  })

  it('material cost is added after applying complexity to labor', () => {
    const laborOnly = calculateQuote(5, 0, 2.0)
    const withMaterial = calculateQuote(5, 300, 2.0)
    expect(withMaterial).toBe(laborOnly + 300)
  })

  it('minimum order scenario: 1hr, $100 material, complexity 1.0 => $200', () => {
    expect(calculateQuote(1, 100, 1.0)).toBe(200)
  })
})
