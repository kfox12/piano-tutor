import { describe, expect, it } from 'vitest'
import { midiToNote, noteToMidi } from './noteMath'

describe('midiToNote', () => {
  it('converts middle C (60) to C4', () => {
    expect(midiToNote(60)).toEqual({ name: 'C', octave: 4 })
  })

  it('converts A4 (69) to A4', () => {
    expect(midiToNote(69)).toEqual({ name: 'A', octave: 4 })
  })

  it('handles the lowest piano key, A0 (21)', () => {
    expect(midiToNote(21)).toEqual({ name: 'A', octave: 0 })
  })

  it('handles a note below C0 (negative octave)', () => {
    expect(midiToNote(0)).toEqual({ name: 'C', octave: -1 })
  })
})

describe('noteToMidi', () => {
  it('converts C4 to 60', () => {
    expect(noteToMidi('C', 4)).toBe(60)
  })

  it('converts A4 to 69', () => {
    expect(noteToMidi('A', 4)).toBe(69)
  })

  it('round-trips through midiToNote for a range of MIDI numbers', () => {
    for (let midi = 21; midi <= 108; midi++) {
      const { name, octave } = midiToNote(midi)
      expect(noteToMidi(name, octave)).toBe(midi)
    }
  })
})
