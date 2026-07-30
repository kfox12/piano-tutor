import type { PracticeSessionState } from '../practice/practiceSessionReducer'

interface PracticeSessionProps {
  state: PracticeSessionState
  start: () => void
  stop: () => void
  micActive: boolean
}

function PracticeSession({
  state,
  start,
  stop,
  micActive
}: PracticeSessionProps): React.JSX.Element {
  return (
    <div className="practice-session">
      {state.status === 'idle' && (
        <>
          <button type="button" onClick={start} disabled={!micActive}>
            Start Practice
          </button>
          {!micActive && <p className="tip">Start the microphone first.</p>}
          {state.lastSessionStats && (
            <p className="tip">Last session: {state.lastSessionStats.correctCount} correct</p>
          )}
        </>
      )}

      {state.status === 'awaiting-note' && (
        <>
          <p className="tip">Correct: {state.stats.correctCount}</p>
          <button type="button" onClick={stop}>
            Stop Practice
          </button>
        </>
      )}
    </div>
  )
}

export default PracticeSession
