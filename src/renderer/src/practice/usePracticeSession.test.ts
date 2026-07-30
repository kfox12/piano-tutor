import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { PitchReading } from '../audio/usePitchDetector'
import { usePracticeSession } from './usePracticeSession'

const TWO_NOTE_RANGE = { lowestMidi: 60, highestMidi: 61 } // C4, C#4

function readingFor(name: string, octave: number): PitchReading {
  return { frequency: 0, note: { name, octave, frequency: 0, centsOffset: 0 } }
}

function currentTarget(
  state: ReturnType<typeof usePracticeSession>['state']
): { name: string; octave: number } | null {
  return state.status === 'awaiting-note' ? state.target : null
}

describe('usePracticeSession', () => {
  it('starts idle', () => {
    const { result } = renderHook(() => usePracticeSession(null, TWO_NOTE_RANGE))
    expect(result.current.state.status).toBe('idle')
  })

  it('start() transitions to awaiting-note with a target in range', () => {
    const { result } = renderHook(() => usePracticeSession(null, TWO_NOTE_RANGE))
    act(() => result.current.start())

    expect(result.current.state.status).toBe('awaiting-note')
    expect(['C', 'C#']).toContain(currentTarget(result.current.state)?.name)
  })

  it('does not advance when the current reading does not match the target', () => {
    const { result, rerender } = renderHook(
      ({ reading }) => usePracticeSession(reading, TWO_NOTE_RANGE),
      { initialProps: { reading: null as PitchReading | null } }
    )
    act(() => result.current.start())
    const target = currentTarget(result.current.state)
    const wrongNote = target?.name === 'C' ? 'C#' : 'C'

    rerender({ reading: readingFor(wrongNote, 4) })

    expect(result.current.state.status).toBe('awaiting-note')
    expect(currentTarget(result.current.state)).toEqual(target)
  })

  it('immediately advances to the other note and increments correctCount on a match', () => {
    const { result, rerender } = renderHook(
      ({ reading }) => usePracticeSession(reading, TWO_NOTE_RANGE),
      { initialProps: { reading: null as PitchReading | null } }
    )
    act(() => result.current.start())
    const target = currentTarget(result.current.state)

    rerender({ reading: target ? readingFor(target.name, target.octave) : null })

    expect(result.current.state.status).toBe('awaiting-note')
    expect(currentTarget(result.current.state)).not.toEqual(target)
    if (result.current.state.status === 'awaiting-note') {
      expect(result.current.state.stats.correctCount).toBe(1)
    }
  })

  it('stop() returns to idle and records lastSessionStats', () => {
    const { result, rerender } = renderHook(
      ({ reading }) => usePracticeSession(reading, TWO_NOTE_RANGE),
      { initialProps: { reading: null as PitchReading | null } }
    )
    act(() => result.current.start())
    const target = currentTarget(result.current.state)
    rerender({ reading: target ? readingFor(target.name, target.octave) : null })
    act(() => result.current.stop())

    expect(result.current.state).toEqual({ status: 'idle', lastSessionStats: { correctCount: 1 } })
  })
})
