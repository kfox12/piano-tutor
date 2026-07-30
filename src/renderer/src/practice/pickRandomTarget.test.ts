import { describe, expect, it } from 'vitest'
import { generateKeyboardLayout } from '../keyboard/generateKeyboardLayout'
import { DEFAULT_PRACTICE_RANGE, pickRandomTarget } from './pickRandomTarget'

const RANGE_KEYS = generateKeyboardLayout(
  DEFAULT_PRACTICE_RANGE.lowestMidi,
  DEFAULT_PRACTICE_RANGE.highestMidi
).keys

function isInRange(note: { name: string; octave: number }): boolean {
  return RANGE_KEYS.some((key) => key.name === note.name && key.octave === note.octave)
}

describe('pickRandomTarget', () => {
  it('always returns a note within the given range', () => {
    for (const rngValue of [0, 0.25, 0.5, 0.75, 0.999999]) {
      const target = pickRandomTarget(DEFAULT_PRACTICE_RANGE, null, () => rngValue)
      expect(isInRange(target)).toBe(true)
    }
  })

  it('excludes the previous target from the candidate pool', () => {
    const first = RANGE_KEYS[0]
    const target = pickRandomTarget(
      DEFAULT_PRACTICE_RANGE,
      { name: first.name, octave: first.octave },
      () => 0
    )
    expect(target).not.toEqual({ name: first.name, octave: first.octave })
  })

  it('does not filter the pool when there is no previous target', () => {
    const target = pickRandomTarget(DEFAULT_PRACTICE_RANGE, null, () => 0)
    expect(target).toEqual({ name: RANGE_KEYS[0].name, octave: RANGE_KEYS[0].octave })
  })

  it('returns the same note again for a single-note range, even matching the previous target', () => {
    const singleNoteRange = { lowestMidi: 60, highestMidi: 60 } // just C4
    const previous = { name: 'C', octave: 4 }
    const target = pickRandomTarget(singleNoteRange, previous, () => 0)
    expect(target).toEqual({ name: 'C', octave: 4 })
  })
})
