import { useMicrophoneStream } from './audio/useMicrophoneStream'
import { usePitchDetector } from './audio/usePitchDetector'
import KeyboardDisplay from './components/KeyboardDisplay'
import MicLevelMeter from './components/MicLevelMeter'
import PitchReadout from './components/PitchReadout'
import Versions from './components/Versions'

function App(): React.JSX.Element {
  const { state, start, stop } = useMicrophoneStream()
  const analyser = state.status === 'active' ? state.analyser : null
  const reading = usePitchDetector(analyser)

  return (
    <>
      <h1>Piano Tutor</h1>
      <MicLevelMeter state={state} start={start} stop={stop} />
      <PitchReadout reading={reading} />
      <KeyboardDisplay currentReading={reading} targetNote={null} onKeyClick={() => {}} />
      <Versions></Versions>
    </>
  )
}

export default App
