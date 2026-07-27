import { describe, expect, it } from 'vitest'
import type { NoteInfo } from './frequencyToNote'
import { initialStabilizerState, stabilize, type PitchReading } from './stabilizePitchReading'

function reading(name: string, octave: number, frequency: number, centsOffset = 0): PitchReading {
  const note: NoteInfo = { name, octave, frequency, centsOffset }
  return { frequency, note }
}

describe('stabilize', () => {
  it('does not commit a note until it has been detected for 3 consecutive frames', () => {
    let state = initialStabilizerState()
    state = stabilize(state, reading('A', 4, 440))
    expect(state.committed).toBeNull()
    state = stabilize(state, reading('A', 4, 440))
    expect(state.committed).toBeNull()
    state = stabilize(state, reading('A', 4, 440))
    expect(state.committed).not.toBeNull()
    expect(state.committed?.note.name).toBe('A')
  })

  it('keeps updating the committed reading with fresh frequency once confirmed', () => {
    let state = initialStabilizerState()
    for (let i = 0; i < 3; i++) state = stabilize(state, reading('A', 4, 440))
    state = stabilize(state, reading('A', 4, 442)) // still A4, slightly sharp this frame
    expect(state.committed?.frequency).toBe(442)
  })

  it('ignores a single stray differing frame instead of flickering', () => {
    let state = initialStabilizerState()
    for (let i = 0; i < 3; i++) state = stabilize(state, reading('A', 4, 440))
    expect(state.committed?.note.name).toBe('A')

    // One noisy frame reads G4 instead of A4.
    state = stabilize(state, reading('G', 4, 392))
    expect(state.committed?.note.name).toBe('A') // still showing A4, not flickered to G4

    // Back to A4 — the stray G4 candidate is discarded, not carried forward.
    state = stabilize(state, reading('A', 4, 440))
    expect(state.committed?.note.name).toBe('A')
    expect(state.candidateCount).toBe(0)
  })

  it('switches to a genuinely new note after it wins 3 consecutive frames', () => {
    let state = initialStabilizerState()
    for (let i = 0; i < 3; i++) state = stabilize(state, reading('A', 4, 440))
    expect(state.committed?.note.name).toBe('A')

    state = stabilize(state, reading('C', 5, 523.25))
    expect(state.committed?.note.name).toBe('A') // not switched yet
    state = stabilize(state, reading('C', 5, 523.25))
    expect(state.committed?.note.name).toBe('A') // still not switched
    state = stabilize(state, reading('C', 5, 523.25))
    expect(state.committed?.note.name).toBe('C') // now switched
  })

  it('resets immediately to nothing on silence (null detection)', () => {
    let state = initialStabilizerState()
    for (let i = 0; i < 3; i++) state = stabilize(state, reading('A', 4, 440))
    expect(state.committed).not.toBeNull()

    state = stabilize(state, null)
    expect(state.committed).toBeNull()
    expect(state.candidateCount).toBe(0)
  })
})
