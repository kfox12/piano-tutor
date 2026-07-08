import { describe, expect, it } from 'vitest'
import { rms } from './rms'

describe('rms', () => {
  it('is ~0 for silence (all samples at the 128 midpoint)', () => {
    const silence = new Uint8Array(1024).fill(128)
    expect(rms(silence)).toBeCloseTo(0, 5)
  })

  it('is high for a strongly varying signal', () => {
    const loud = new Uint8Array(1024)
    for (let i = 0; i < loud.length; i++) {
      loud[i] = i % 2 === 0 ? 0 : 255
    }
    expect(rms(loud)).toBeGreaterThan(0.9)
  })

  it('is higher for a louder signal than a quieter one', () => {
    const quiet = new Uint8Array(1024)
    const loud = new Uint8Array(1024)
    for (let i = 0; i < quiet.length; i++) {
      quiet[i] = 128 + Math.round(10 * Math.sin(i))
      loud[i] = 128 + Math.round(100 * Math.sin(i))
    }
    expect(rms(loud)).toBeGreaterThan(rms(quiet))
  })
})
