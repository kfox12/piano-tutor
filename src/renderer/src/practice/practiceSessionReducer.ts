import type { TargetNote } from '../keyboard/deriveKeyStates'

export interface SessionStats {
  correctCount: number
}

export type PracticeSessionState =
  | { status: 'idle'; lastSessionStats: SessionStats | null }
  | { status: 'awaiting-note'; target: TargetNote; stats: SessionStats }

export type PracticeSessionAction =
  | { type: 'start'; target: TargetNote }
  | { type: 'stop' }
  | { type: 'correct'; nextTarget: TargetNote }

export const initialPracticeSessionState: PracticeSessionState = {
  status: 'idle',
  lastSessionStats: null
}

export function practiceSessionReducer(
  state: PracticeSessionState,
  action: PracticeSessionAction
): PracticeSessionState {
  switch (action.type) {
    case 'start':
      return { status: 'awaiting-note', target: action.target, stats: { correctCount: 0 } }
    case 'stop':
      return state.status === 'idle' ? state : { status: 'idle', lastSessionStats: state.stats }
    case 'correct':
      if (state.status !== 'awaiting-note') return state
      return {
        status: 'awaiting-note',
        target: action.nextTarget,
        stats: { correctCount: state.stats.correctCount + 1 }
      }
  }
}
