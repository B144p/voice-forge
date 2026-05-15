import { describe, it, expect } from 'vitest'

const COST_PER_CHAR = 0.0001

function estimateCost(characters: number): number {
  return characters * COST_PER_CHAR
}

function wouldExceedCap(used: number, newChars: number, cap: number | null): boolean {
  if (cap === null) return false
  return used + newChars > cap
}

describe('usage math', () => {
  it('calculates cost correctly', () => {
    expect(estimateCost(10000)).toBeCloseTo(1.0)
    expect(estimateCost(500)).toBeCloseTo(0.05)
    expect(estimateCost(0)).toBe(0)
  })

  it('null cap never exceeds', () => {
    expect(wouldExceedCap(9999, 99999, null)).toBe(false)
  })

  it('detects cap exceeded', () => {
    expect(wouldExceedCap(9800, 500, 10000)).toBe(true)
  })

  it('allows exact cap usage', () => {
    expect(wouldExceedCap(9500, 500, 10000)).toBe(false)
  })

  it('allows usage below cap', () => {
    expect(wouldExceedCap(0, 100, 10000)).toBe(false)
  })
})
