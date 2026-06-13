import { describe, it, expect } from 'vitest'
import { calculateQuote } from '../pricing'

describe('calculateQuote', () => {
  it('calculates basic quote: hours * 100 * multiplier + materialCost', () => {
    // 4h * $100/hr * 1.0 + $150 = $550
    expect(calculateQuote(4, 150, 1.0)).toBe(550)
  })

  it('matches the example from the admin dashboard (4h, $150, 1.4)', () => {
    // 4 * 100 * 1.4 + 150 = 560 + 150 = 710
    expect(calculateQuote(4, 150, 1.4)).toBe(710)
  })

  it('handles zero hours', () => {
    // 0 * 100 * 1.5 + 200 = 200
    expect(calculateQuote(0, 200, 1.5)).toBe(200)
  })

  it('handles zero material cost', () => {
    // 2 * 100 * 2.0 + 0 = 400
    expect(calculateQuote(2, 0, 2.0)).toBe(400)
  })

  it('handles complexity multiplier of 1.0 (no added complexity)', () => {
    expect(calculateQuote(10, 500, 1.0)).toBe(1500)
  })

  it('handles fractional hours', () => {
    // 1.5 * 100 * 1.0 + 0 = 150
    expect(calculateQuote(1.5, 0, 1.0)).toBe(150)
  })

  it('handles fractional complexity multiplier', () => {
    // 3 * 100 * 1.75 + 100 = 525 + 100 = 625
    expect(calculateQuote(3, 100, 1.75)).toBe(625)
  })

  it('handles large values without overflow', () => {
    // 1000h * $100/hr * 5.0 + $10000 = $510000
    expect(calculateQuote(1000, 10000, 5.0)).toBe(510000)
  })

  it('returns a number type', () => {
    expect(typeof calculateQuote(1, 100, 1)).toBe('number')
  })

  it('hourly rate contribution scales linearly with hours', () => {
    const q1 = calculateQuote(1, 0, 1.0)
    const q2 = calculateQuote(2, 0, 1.0)
    const q4 = calculateQuote(4, 0, 1.0)
    expect(q2).toBe(q1 * 2)
    expect(q4).toBe(q1 * 4)
  })

  it('material cost is added after applying complexity to labor', () => {
    const laborOnly = calculateQuote(5, 0, 2.0)  // 5 * 100 * 2 = 1000
    const withMaterial = calculateQuote(5, 300, 2.0)
    expect(withMaterial).toBe(laborOnly + 300)
  })

  // Boundary / regression: minimum order scenario ($200 budget, 1hr, no complexity)
  it('minimum order scenario: 1hr simple complexity, $100 material', () => {
    // 1 * 100 * 1.0 + 100 = 200
    expect(calculateQuote(1, 100, 1.0)).toBe(200)
  })
})