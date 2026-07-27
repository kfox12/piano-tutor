import type { PitchReading } from '../audio/usePitchDetector'
import { deriveKeyboardStates, type TargetNote } from '../keyboard/deriveKeyStates'
import { generateKeyboardLayout } from '../keyboard/generateKeyboardLayout'
import PianoKey from './PianoKey'

// Layout never changes, so compute it once at module load rather than on
// every render.
const LAYOUT = generateKeyboardLayout()
const WHITE_KEYS = LAYOUT.keys.filter((key) => !key.isBlack)
const BLACK_KEYS = LAYOUT.keys.filter((key) => key.isBlack)

interface KeyboardDisplayProps {
  currentReading: PitchReading | null
  targetNote: TargetNote | null
  onKeyClick: (note: { name: string; octave: number }) => void
}

function KeyboardDisplay({
  currentReading,
  targetNote,
  onKeyClick
}: KeyboardDisplayProps): React.JSX.Element {
  const states = deriveKeyboardStates(LAYOUT.keys, targetNote, currentReading)

  return (
    <svg className="keyboard-display" viewBox={`0 0 ${LAYOUT.totalWidth} ${LAYOUT.whiteKeyHeight}`}>
      {/* White keys must render before black keys — SVG has no z-index, and
          black keys visually and functionally (for clicks) overlap the
          edges of their neighboring white keys. */}
      {WHITE_KEYS.map((pianoKey) => (
        <PianoKey
          key={pianoKey.midi}
          layout={pianoKey}
          state={states.get(pianoKey.midi) ?? 'idle'}
          onClick={onKeyClick}
        />
      ))}
      {BLACK_KEYS.map((pianoKey) => (
        <PianoKey
          key={pianoKey.midi}
          layout={pianoKey}
          state={states.get(pianoKey.midi) ?? 'idle'}
          onClick={onKeyClick}
        />
      ))}
    </svg>
  )
}

export default KeyboardDisplay
