import { describe, expect, it } from 'vitest'
import { generateKeyboardLayout } from './generateKeyboardLayout'

describe('generateKeyboardLayout', () => {
  it('generates all 88 keys from A0 to C8', () => {
    const layout = generateKeyboardLayout()
    expect(layout.keys).toHaveLength(88)
  })

  it('starts at A0 and ends at C8', () => {
    const layout = generateKeyboardLayout()
    const first = layout.keys[0]
    const last = layout.keys[layout.keys.length - 1]

    expect(first).toMatchObject({ midi: 21, name: 'A', octave: 0, isBlack: false })
    expect(last).toMatchObject({ midi: 108, name: 'C', octave: 8, isBlack: false })
  })

  it('has 52 white keys and 36 black keys', () => {
    const layout = generateKeyboardLayout()
    const whiteKeys = layout.keys.filter((k) => !k.isBlack)
    const blackKeys = layout.keys.filter((k) => k.isBlack)

    expect(whiteKeys).toHaveLength(52)
    expect(blackKeys).toHaveLength(36)
  })

  it('sets totalWidth to the sum of white key widths', () => {
    const layout = generateKeyboardLayout()
    const whiteKeys = layout.keys.filter((k) => !k.isBlack)
    const whiteKeyWidth = whiteKeys[0].width

    expect(layout.totalWidth).toBe(whiteKeys.length * whiteKeyWidth)
  })

  it('centers a black key on the boundary between its two neighboring white keys', () => {
    const layout = generateKeyboardLayout()
    const byMidi = new Map(layout.keys.map((k) => [k.midi, k]))

    const c4 = byMidi.get(60)! // C4
    const cSharp4 = byMidi.get(61)! // C#4
    const d4 = byMidi.get(62)! // D4

    expect(c4.isBlack).toBe(false)
    expect(cSharp4.isBlack).toBe(true)
    expect(d4.isBlack).toBe(false)

    // The black key sits between C4 and D4, centered on their shared boundary.
    expect(cSharp4.x + cSharp4.width / 2).toBeCloseTo(d4.x, 5)
    expect(cSharp4.x).toBeGreaterThan(c4.x)
    expect(cSharp4.x + cSharp4.width).toBeLessThan(d4.x + d4.width)
  })

  it('has no black key between B and C, or between E and F', () => {
    const layout = generateKeyboardLayout()
    const byMidi = new Map(layout.keys.map((k) => [k.midi, k]))

    const b3 = byMidi.get(59)! // B3
    const c4 = byMidi.get(60)! // C4
    const e4 = byMidi.get(64)! // E4
    const f4 = byMidi.get(65)! // F4

    expect(b3.name).toBe('B')
    expect(c4.name).toBe('C')
    expect(e4.name).toBe('E')
    expect(f4.name).toBe('F')
    // Adjacent white keys with no black key between them sit one white-key-
    // width apart.
    expect(c4.x - b3.x).toBeCloseTo(b3.width, 5)
    expect(f4.x - e4.x).toBeCloseTo(e4.width, 5)
  })

  it('gives every key a positive width and height', () => {
    const layout = generateKeyboardLayout()
    for (const key of layout.keys) {
      expect(key.width).toBeGreaterThan(0)
      expect(key.height).toBeGreaterThan(0)
    }
  })
})
