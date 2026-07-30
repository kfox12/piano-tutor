import { describe, expect, it } from 'vitest'
import { initialPracticeSessionState, practiceSessionReducer } from './practiceSessionReducer'

const A4 = { name: 'A', octave: 4 }
const C5 = { name: 'C', octave: 5 }

describe('practiceSessionReducer', () => {
  it('starts a new session in awaiting-note with correctCount 0', () => {
    const state = practiceSessionReducer(initialPracticeSessionState, {
      type: 'start',
      target: A4
    })
    expect(state).toEqual({ status: 'awaiting-note', target: A4, stats: { correctCount: 0 } })
  })

  it('advances to the next target and increments correctCount on correct', () => {
    const awaiting = practiceSessionReducer(initialPracticeSessionState, {
      type: 'start',
      target: A4
    })
    const state = practiceSessionReducer(awaiting, { type: 'correct', nextTarget: C5 })
    expect(state).toEqual({ status: 'awaiting-note', target: C5, stats: { correctCount: 1 } })
  })

  it('ignores a correct action while idle', () => {
    const state = practiceSessionReducer(initialPracticeSessionState, {
      type: 'correct',
      nextTarget: A4
    })
    expect(state).toBe(initialPracticeSessionState)
  })

  it('stops an active session, carrying stats into lastSessionStats', () => {
    const awaiting = practiceSessionReducer(initialPracticeSessionState, {
      type: 'start',
      target: A4
    })
    const afterOneCorrect = practiceSessionReducer(awaiting, { type: 'correct', nextTarget: C5 })
    const state = practiceSessionReducer(afterOneCorrect, { type: 'stop' })
    expect(state).toEqual({ status: 'idle', lastSessionStats: { correctCount: 1 } })
  })

  it('ignores a stop action while already idle', () => {
    const state = practiceSessionReducer(initialPracticeSessionState, { type: 'stop' })
    expect(state).toBe(initialPracticeSessionState)
  })
})
