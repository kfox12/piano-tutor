import { useMicrophoneStream } from './audio/useMicrophoneStream'
import MicLevelMeter from './components/MicLevelMeter'
import PitchReadout from './components/PitchReadout'
import Versions from './components/Versions'

function App(): React.JSX.Element {
  const { state, start, stop } = useMicrophoneStream()
  const analyser = state.status === 'active' ? state.analyser : null

  return (
    <>
      <h1>Piano Tutor</h1>
      <MicLevelMeter state={state} start={start} stop={stop} />
      <PitchReadout analyser={analyser} />
      <Versions></Versions>
    </>
  )
}

export default App
