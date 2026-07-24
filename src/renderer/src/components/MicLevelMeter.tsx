import { useRef, useState } from 'react'
import { rms } from '../audio/rms'
import { useAnalyserFrame } from '../audio/useAnalyserFrame'
import { useMicrophoneStream } from '../audio/useMicrophoneStream'

const ERROR_MESSAGES: Record<string, string> = {
  'permission-denied':
    'Microphone access was denied. Enable it in System Settings → Privacy & Security → Microphone, then try again.',
  'no-device': 'No microphone was found. Connect one and try again.'
}

function MicLevelMeter(): React.JSX.Element {
  const { state, start, stop } = useMicrophoneStream()
  const [level, setLevel] = useState(0)
  const bufferRef = useRef<Uint8Array<ArrayBuffer> | null>(null)

  const analyser = state.status === 'active' ? state.analyser : null
  useAnalyserFrame(analyser, (analyser) => {
    if (!bufferRef.current || bufferRef.current.length !== analyser.fftSize) {
      bufferRef.current = new Uint8Array(analyser.fftSize)
    }
    analyser.getByteTimeDomainData(bufferRef.current)
    setLevel(rms(bufferRef.current))
  })

  return (
    <div className="mic-level-meter">
      {state.status === 'idle' && (
        <button type="button" onClick={start}>
          Start Listening
        </button>
      )}

      {state.status === 'requesting' && <p className="tip">Requesting microphone access…</p>}

      {state.status === 'active' && (
        <>
          <div className="level-bar-track">
            <div className="level-bar-fill" style={{ width: `${Math.min(level * 100, 100)}%` }} />
          </div>
          <button type="button" onClick={stop}>
            Stop
          </button>
        </>
      )}

      {state.status === 'error' && (
        <>
          <p className="tip">
            {ERROR_MESSAGES[state.kind] ?? `Microphone error: ${state.message}`}
          </p>
          <button type="button" onClick={start}>
            Try Again
          </button>
        </>
      )}
    </div>
  )
}

export default MicLevelMeter
