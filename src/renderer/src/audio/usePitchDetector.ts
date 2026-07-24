import { useRef, useState } from 'react'
import { detectPitch } from './detectPitch'
import { frequencyToNote, type NoteInfo } from './frequencyToNote'
import { rmsFloat } from './rmsFloat'
import { useAnalyserFrame } from './useAnalyserFrame'

export interface PitchReading {
  frequency: number
  note: NoteInfo
}

// Below this RMS, skip running YIN entirely: cheaper than computing it every
// frame during silence, and guards against weak-periodicity false positives
// in quiet ambient noise. Needs real-hardware tuning against an actual room
// noise floor — not something a synthetic test can validate.
const SILENCE_RMS_THRESHOLD = 0.02

export function usePitchDetector(analyser: AnalyserNode | null): PitchReading | null {
  const [reading, setReading] = useState<PitchReading | null>(null)
  const bufferRef = useRef<Float32Array<ArrayBuffer> | null>(null)

  useAnalyserFrame(analyser, (analyser) => {
    if (!bufferRef.current || bufferRef.current.length !== analyser.fftSize) {
      bufferRef.current = new Float32Array(analyser.fftSize)
    }
    analyser.getFloatTimeDomainData(bufferRef.current)

    if (rmsFloat(bufferRef.current) < SILENCE_RMS_THRESHOLD) {
      setReading(null)
      return
    }

    const frequency = detectPitch(bufferRef.current, analyser.context.sampleRate)
    setReading(frequency ? { frequency, note: frequencyToNote(frequency) } : null)
  })

  return reading
}
