import { useState } from 'react'
import { useMicrophoneStream } from '../audio/useMicrophoneStream'
import { usePitchDetector } from '../audio/usePitchDetector'
import KeyboardDisplay from '../components/KeyboardDisplay'
import MicLevelMeter from '../components/MicLevelMeter'
import PitchReadout from '../components/PitchReadout'
import PracticeSession from '../components/PracticeSession'
import { notesMatch, type TargetNote } from '../keyboard/deriveKeyStates'
import { usePracticeSession } from '../practice/usePracticeSession'

function PracticeModePage(): React.JSX.Element {
  const { state, start, stop } = useMicrophoneStream()
  const analyser = state.status === 'active' ? state.analyser : null
  const reading = usePitchDetector(analyser)
  const [manualTarget, setManualTarget] = useState<TargetNote | null>(null)
  const {
    state: sessionState,
    start: startSession,
    stop: stopSession
  } = usePracticeSession(reading)

  const targetNotes: TargetNote[] =
    sessionState.status === 'awaiting-note'
      ? [sessionState.target]
      : manualTarget
        ? [manualTarget]
        : []

  const handleKeyClick = (note: TargetNote): void => {
    if (sessionState.status === 'awaiting-note') return
    setManualTarget((current) => (current && notesMatch(current, note) ? null : note))
  }

  return (
    <div className="practice-page">
      <h1 className="page-title">Practice Mode</h1>
      <MicLevelMeter state={state} start={start} stop={stop} />
      <PitchReadout reading={reading} />
      <PracticeSession
        state={sessionState}
        start={startSession}
        stop={stopSession}
        micActive={state.status === 'active'}
      />
      <KeyboardDisplay
        currentReading={reading}
        targetNotes={targetNotes}
        onKeyClick={handleKeyClick}
      />
    </div>
  )
}

export default PracticeModePage
