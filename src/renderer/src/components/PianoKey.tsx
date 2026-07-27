import type { KeyVisualState } from '../keyboard/deriveKeyStates'
import type { KeyLayout } from '../keyboard/generateKeyboardLayout'

interface PianoKeyProps {
  layout: KeyLayout
  state: KeyVisualState
  onClick: (note: { name: string; octave: number }) => void
}

function PianoKey({ layout, state, onClick }: PianoKeyProps): React.JSX.Element {
  const className = `piano-key piano-key--${layout.isBlack ? 'black' : 'white'} piano-key--${state}`

  return (
    <rect
      className={className}
      x={layout.x}
      y={0}
      width={layout.width}
      height={layout.height}
      onClick={() => onClick({ name: layout.name, octave: layout.octave })}
    />
  )
}

export default PianoKey
