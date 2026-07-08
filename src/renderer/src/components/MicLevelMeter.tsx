import { useEffect, useState } from 'react'
import { rms } from '../audio/rms'
import { useMicrophoneStream } from '../audio/useMicrophoneStream'

const ERROR_MESSAGES: Record<string, string> = {
  'permission-denied':
    'Microphone access was denied. Enable it in System Settings → Privacy & Security → Microphone, then try again.',
  'no-device': 'No microphone was found. Connect one and try again.'
}

function MicLevelMeter(): React.JSX.Element {
  const { state, start, stop } = useMicrophoneStream()
  const [level, setLevel] = useState(0)

  useEffect(() => {
    if (state.status !== 'active') {
      return
    }

    const analyser = state.analyser
    const buffer = new Uint8Array(analyser.fftSize)
    let frameId: number

    const tick = (): void => {
      analyser.getByteTimeDomainData(buffer)
      setLevel(rms(buffer))
      frameId = requestAnimationFrame(tick)
    }
    frameId = requestAnimationFrame(tick)

    return () => cancelAnimationFrame(frameId)
  }, [state])

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
