import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { PitchReading } from '../audio/usePitchDetector'
import type { SongEvent } from './song'
import { useSongAutoAdvance } from './useSongAutoAdvance'

function readingFor(name: string, octave: number): PitchReading {
  return { frequency: 0, note: { name, octave, frequency: 0, centsOffset: 0 } }
}

function singleNoteEvent(name: string, octave: number): SongEvent {
  return { id: 'evt-1', notes: [{ midi: 60, name, octave }] }
}

function chordEvent(notes: Array<[string, number]>): SongEvent {
  return { id: 'evt-chord', notes: notes.map(([name, octave]) => ({ midi: 60, name, octave })) }
}

describe('useSongAutoAdvance', () => {
  it('does not call onMatch when the reading does not match the event', () => {
    const onMatch = vi.fn()
    renderHook(() => useSongAutoAdvance(readingFor('D', 4), singleNoteEvent('C', 4), onMatch))

    expect(onMatch).not.toHaveBeenCalled()
  })

  it('calls onMatch once when the reading matches the event', () => {
    const onMatch = vi.fn()
    const { rerender } = renderHook(
      ({ reading }) => useSongAutoAdvance(reading, singleNoteEvent('C', 4), onMatch),
      { initialProps: { reading: null as PitchReading | null } }
    )

    rerender({ reading: readingFor('C', 4) })

    expect(onMatch).toHaveBeenCalledTimes(1)
  })

  it('does not re-fire on every frame while the same note stays held', () => {
    const onMatch = vi.fn()
    const { rerender } = renderHook(
      ({ reading }) => useSongAutoAdvance(reading, singleNoteEvent('C', 4), onMatch),
      { initialProps: { reading: null as PitchReading | null } }
    )

    rerender({ reading: readingFor('C', 4) })
    // usePitchDetector emits a new reading object every frame even for a
    // held note — simulate that by rerendering with fresh objects.
    rerender({ reading: readingFor('C', 4) })
    rerender({ reading: readingFor('C', 4) })

    expect(onMatch).toHaveBeenCalledTimes(1)
  })

  it('fires again after the note is released and re-struck', () => {
    const onMatch = vi.fn()
    const { rerender } = renderHook(
      ({ reading }) => useSongAutoAdvance(reading, singleNoteEvent('C', 4), onMatch),
      { initialProps: { reading: null as PitchReading | null } }
    )

    rerender({ reading: readingFor('C', 4) })
    rerender({ reading: null })
    rerender({ reading: readingFor('C', 4) })

    expect(onMatch).toHaveBeenCalledTimes(2)
  })

  it('matches a chord event as soon as any one of its notes is heard', () => {
    const onMatch = vi.fn()
    const event = chordEvent([
      ['C', 4],
      ['E', 4],
      ['G', 4]
    ])
    const { rerender } = renderHook(({ reading }) => useSongAutoAdvance(reading, event, onMatch), {
      initialProps: { reading: null as PitchReading | null }
    })

    rerender({ reading: readingFor('E', 4) })

    expect(onMatch).toHaveBeenCalledTimes(1)
  })

  it('does nothing when there is no current event', () => {
    const onMatch = vi.fn()
    renderHook(() => useSongAutoAdvance(readingFor('C', 4), null, onMatch))

    expect(onMatch).not.toHaveBeenCalled()
  })
})
