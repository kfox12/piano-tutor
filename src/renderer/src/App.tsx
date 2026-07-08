import MicLevelMeter from './components/MicLevelMeter'
import Versions from './components/Versions'

function App(): React.JSX.Element {
  return (
    <>
      <h1>Piano Tutor</h1>
      <MicLevelMeter />
      <Versions></Versions>
    </>
  )
}

export default App
