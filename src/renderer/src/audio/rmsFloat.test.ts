import { describe, expect, it } from 'vitest'
import { rmsFloat } from './rmsFloat'

describe('rmsFloat', () => {
  it('is ~0 for silence (all samples at 0)', () => {
    const silence = new Float32Array(1024).fill(0)
    expect(rmsFloat(silence)).toBeCloseTo(0, 5)
  })

  it('is high for a strongly varying signal', () => {
    const loud = new Float32Array(1024)
    for (let i = 0; i < loud.length; i++) {
      loud[i] = i % 2 === 0 ? -1 : 1
    }
    expect(rmsFloat(loud)).toBeGreaterThan(0.9)
  })

  it('is higher for a louder signal than a quieter one', () => {
    const quiet = new Float32Array(1024)
    const loud = new Float32Array(1024)
    for (let i = 0; i < quiet.length; i++) {
      quiet[i] = 0.1 * Math.sin(i)
      loud[i] = 0.8 * Math.sin(i)
    }
    expect(rmsFloat(loud)).toBeGreaterThan(rmsFloat(quiet))
  })
})
