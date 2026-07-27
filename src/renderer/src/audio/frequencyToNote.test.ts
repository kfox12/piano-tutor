import { describe, expect, it } from 'vitest'
import { frequencyToNote } from './frequencyToNote'

describe('frequencyToNote', () => {
  it('identifies A4 exactly at 440Hz with 0 cents offset', () => {
    const note = frequencyToNote(440)
    expect(note.name).toBe('A')
    expect(note.octave).toBe(4)
    expect(note.frequency).toBeCloseTo(440, 5)
    expect(note.centsOffset).toBeCloseTo(0, 5)
  })

  it('identifies C4 (middle C)', () => {
    const note = frequencyToNote(261.63)
    expect(note.name).toBe('C')
    expect(note.octave).toBe(4)
    expect(note.centsOffset).toBeCloseTo(0, 0)
  })

  it('identifies A0, the lowest piano note', () => {
    const note = frequencyToNote(27.5)
    expect(note.name).toBe('A')
    expect(note.octave).toBe(0)
  })

  it('identifies C8, the highest piano note', () => {
    const note = frequencyToNote(4186.01)
    expect(note.name).toBe('C')
    expect(note.octave).toBe(8)
    expect(note.centsOffset).toBeCloseTo(0, 0)
  })

  it('reports a positive cents offset for a sharp frequency', () => {
    const note = frequencyToNote(445) // slightly sharp of A4
    expect(note.name).toBe('A')
    expect(note.octave).toBe(4)
    expect(note.centsOffset).toBeGreaterThan(0)
  })

  it('reports a negative cents offset for a flat frequency', () => {
    const note = frequencyToNote(435) // slightly flat of A4
    expect(note.name).toBe('A')
    expect(note.octave).toBe(4)
    expect(note.centsOffset).toBeLessThan(0)
  })

  it('rounds a frequency exactly at the midpoint between two semitones up', () => {
    // Exact midpoint between A4 (440Hz) and A#4: 69.5 semitones from A4.
    const midpoint = 440 * Math.pow(2, 0.5 / 12)
    const note = frequencyToNote(midpoint)
    expect(note.name).toBe('A#')
    expect(note.octave).toBe(4)
    expect(note.centsOffset).toBeCloseTo(-50, 5)
  })
})
