import { describe, expect, it } from 'vitest'
import type { NoteInfo } from '../audio/frequencyToNote'
import type { PitchReading } from '../audio/usePitchDetector'
import { deriveKeyboardStates, type TargetNote } from './deriveKeyStates'

const KEYS = [
  { midi: 60, name: 'C', octave: 4 },
  { midi: 61, name: 'C#', octave: 4 },
  { midi: 69, name: 'A', octave: 4 },
  { midi: 57, name: 'A', octave: 3 }
]

function reading(name: string, octave: number): PitchReading {
  const note: NoteInfo = { name, octave, frequency: 0, centsOffset: 0 }
  return { frequency: 0, note }
}

describe('deriveKeyboardStates', () => {
  it('marks every key idle when there is no target and nothing is playing', () => {
    const states = deriveKeyboardStates(KEYS, null, null)
    for (const key of KEYS) {
      expect(states.get(key.midi)).toBe('idle')
    }
  })

  it('marks the target key as target when nothing is playing', () => {
    const target: TargetNote = { name: 'A', octave: 4 }
    const states = deriveKeyboardStates(KEYS, target, null)

    expect(states.get(69)).toBe('target') // A4
    expect(states.get(60)).toBe('idle') // C4
  })

  it('marks the playing key as playing when there is no target', () => {
    const states = deriveKeyboardStates(KEYS, null, reading('C', 4))

    expect(states.get(60)).toBe('playing') // C4
    expect(states.get(69)).toBe('idle') // A4
  })

  it('marks the key correct when the playing note exactly matches the target', () => {
    const target: TargetNote = { name: 'A', octave: 4 }
    const states = deriveKeyboardStates(KEYS, target, reading('A', 4))

    expect(states.get(69)).toBe('correct')
  })

  it('marks a right-name-wrong-octave note as incorrect, not correct', () => {
    const target: TargetNote = { name: 'A', octave: 4 }
    const states = deriveKeyboardStates(KEYS, target, reading('A', 3))

    expect(states.get(57)).toBe('incorrect') // A3 — wrong octave
    expect(states.get(69)).toBe('target') // A4 — still waiting to be hit
  })

  it('marks a different playing note as incorrect while the target stays target', () => {
    const target: TargetNote = { name: 'A', octave: 4 }
    const states = deriveKeyboardStates(KEYS, target, reading('C', 4))

    expect(states.get(60)).toBe('incorrect') // C4 — what's actually being played
    expect(states.get(69)).toBe('target') // A4 — the target, not yet hit
  })
})
