import type { PitchReading } from '../audio/usePitchDetector'

interface PitchReadoutProps {
  reading: PitchReading | null
}

function PitchReadout({ reading }: PitchReadoutProps): React.JSX.Element {
  if (!reading) {
    return <p className="pitch-readout tip">—</p>
  }

  const cents = Math.round(reading.note.centsOffset)
  const sign = cents > 0 ? '+' : ''
  const label = `Detected: ${reading.note.name}${reading.note.octave} (${sign}${cents} cents)`

  return <p className="pitch-readout">{label}</p>
}

export default PitchReadout
