import { useCallback, useEffect, useReducer } from 'react'
import type { PitchReading } from '../audio/usePitchDetector'
import { notesMatch } from '../keyboard/deriveKeyStates'
import { DEFAULT_PRACTICE_RANGE, pickRandomTarget, type NoteRange } from './pickRandomTarget'
import {
  initialPracticeSessionState,
  practiceSessionReducer,
  type PracticeSessionState
} from './practiceSessionReducer'

interface UsePracticeSessionResult {
  state: PracticeSessionState
  start: () => void
  stop: () => void
}

export function usePracticeSession(
  currentReading: PitchReading | null,
  range: NoteRange = DEFAULT_PRACTICE_RANGE
): UsePracticeSessionResult {
  const [state, dispatch] = useReducer(practiceSessionReducer, initialPracticeSessionState)

  useEffect(() => {
    if (state.status !== 'awaiting-note') return
    if (!currentReading || !notesMatch(currentReading.note, state.target)) return
    dispatch({ type: 'correct', nextTarget: pickRandomTarget(range, state.target) })
  }, [currentReading, state, range])

  const start = useCallback(() => {
    dispatch({ type: 'start', target: pickRandomTarget(range) })
  }, [range])

  const stop = useCallback(() => {
    dispatch({ type: 'stop' })
  }, [])

  return { state, start, stop }
}
