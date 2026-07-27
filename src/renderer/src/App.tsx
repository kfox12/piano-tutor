import { useState } from 'react'
import { useMicrophoneStream } from './audio/useMicrophoneStream'
import { usePitchDetector } from './audio/usePitchDetector'
import KeyboardDisplay from './components/KeyboardDisplay'
import MicLevelMeter from './components/MicLevelMeter'
import PitchReadout from './components/PitchReadout'
import Versions from './components/Versions'
import type { TargetNote } from './keyboard/deriveKeyStates'

function App(): React.JSX.Element {
  const { state, start, stop } = useMicrophoneStream()
  const analyser = state.status === 'active' ? state.analyser : null
  const reading = usePitchDetector(analyser)
  const [targetNote, setTargetNote] = useState<TargetNote | null>(null)

  const handleKeyClick = (note: TargetNote): void => {
    setTargetNote((current) =>
      current && current.name === note.name && current.octave === note.octave ? null : note
    )
  }

  return (
    <>
      <h1>Piano Tutor</h1>
      <MicLevelMeter state={state} start={start} stop={stop} />
      <PitchReadout reading={reading} />
      <KeyboardDisplay
        currentReading={reading}
        targetNote={targetNote}
        onKeyClick={handleKeyClick}
      />
      <Versions></Versions>
    </>
  )
}

export default App
