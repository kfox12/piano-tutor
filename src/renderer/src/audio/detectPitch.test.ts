import { describe, expect, it } from 'vitest'
import { detectPitch } from './detectPitch'

const SAMPLE_RATE = 44100
const BUFFER_LENGTH = 4096 // matches the app's real analyser fftSize

function generateSineWave(frequency: number, sampleRate: number, length: number): Float32Array {
  const samples = new Float32Array(length)
  for (let i = 0; i < length; i++) {
    samples[i] = Math.sin((2 * Math.PI * frequency * i) / sampleRate)
  }
  return samples
}

// Deterministic pseudo-random generator (mulberry32) so the "noise" test
// case is reproducible instead of depending on Math.random().
function generateNoise(length: number, seed = 42): Float32Array {
  let state = seed
  const samples = new Float32Array(length)
  for (let i = 0; i < length; i++) {
    state |= 0
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    samples[i] = (((t ^ (t >>> 14)) >>> 0) / 4294967296) * 2 - 1
  }
  return samples
}

function centsOff(actual: number, expected: number): number {
  return Math.abs(1200 * Math.log2(actual / expected))
}

describe('detectPitch', () => {
  it.each([
    ['A0', 27.5],
    ['C4', 261.63],
    ['A4', 440],
    ['C8', 4186]
  ])('detects a pure %s tone (%s Hz) within 10 cents', (_name, frequency) => {
    const samples = generateSineWave(frequency, SAMPLE_RATE, BUFFER_LENGTH)
    const detected = detectPitch(samples, SAMPLE_RATE)
    expect(detected).not.toBeNull()
    expect(centsOff(detected!, frequency)).toBeLessThan(10)
  })

  it('resists octave error: a fundamental plus a strong 2nd harmonic still detects the fundamental', () => {
    const fundamental = 220
    const samples = new Float32Array(BUFFER_LENGTH)
    for (let i = 0; i < BUFFER_LENGTH; i++) {
      samples[i] =
        Math.sin((2 * Math.PI * fundamental * i) / SAMPLE_RATE) +
        0.5 * Math.sin((2 * Math.PI * fundamental * 2 * i) / SAMPLE_RATE)
    }
    const detected = detectPitch(samples, SAMPLE_RATE)
    expect(detected).not.toBeNull()
    expect(centsOff(detected!, fundamental)).toBeLessThan(10)
  })

  it('returns null for silence', () => {
    const silence = new Float32Array(BUFFER_LENGTH).fill(0)
    expect(detectPitch(silence, SAMPLE_RATE)).toBeNull()
  })

  it('returns null for non-periodic noise', () => {
    const noise = generateNoise(BUFFER_LENGTH)
    expect(detectPitch(noise, SAMPLE_RATE)).toBeNull()
  })
})
