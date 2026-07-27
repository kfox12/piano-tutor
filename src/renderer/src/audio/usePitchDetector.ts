import { useRef, useState } from 'react'
import { detectPitch } from './detectPitch'
import { frequencyToNote } from './frequencyToNote'
import { rmsFloat } from './rmsFloat'
import { initialStabilizerState, stabilize, type PitchReading } from './stabilizePitchReading'
import { useAnalyserFrame } from './useAnalyserFrame'

export type { PitchReading }

// Below this RMS, skip running YIN entirely: cheaper than computing it every
// frame during silence, and guards against weak-periodicity false positives
// in quiet ambient noise. Needs real-hardware tuning against an actual room
// noise floor — not something a synthetic test can validate.
const SILENCE_RMS_THRESHOLD = 0.02

export function usePitchDetector(analyser: AnalyserNode | null): PitchReading | null {
  const [reading, setReading] = useState<PitchReading | null>(null)
  const bufferRef = useRef<Float32Array<ArrayBuffer> | null>(null)
  const stabilizerRef = useRef(initialStabilizerState())

  useAnalyserFrame(analyser, (analyser) => {
    if (!bufferRef.current || bufferRef.current.length !== analyser.fftSize) {
      bufferRef.current = new Float32Array(analyser.fftSize)
    }
    analyser.getFloatTimeDomainData(bufferRef.current)

    const detected =
      rmsFloat(bufferRef.current) < SILENCE_RMS_THRESHOLD
        ? null
        : detectPitch(bufferRef.current, analyser.context.sampleRate)

    const pitchReading = detected ? { frequency: detected, note: frequencyToNote(detected) } : null
    stabilizerRef.current = stabilize(stabilizerRef.current, pitchReading)
    setReading(stabilizerRef.current.committed)
  })

  return reading
}
