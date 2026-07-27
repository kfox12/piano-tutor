import type { PitchReading } from '../audio/usePitchDetector'

export type KeyVisualState = 'idle' | 'target' | 'playing' | 'correct' | 'incorrect'

export interface TargetNote {
  name: string
  octave: number
}

interface KeyIdentity {
  midi: number
  name: string
  octave: number
}

function matchesNote(key: KeyIdentity, note: { name: string; octave: number }): boolean {
  return key.name === note.name && key.octave === note.octave
}

function deriveKeyState(
  key: KeyIdentity,
  targetNote: TargetNote | null,
  currentReading: PitchReading | null
): KeyVisualState {
  const isTarget = targetNote !== null && matchesNote(key, targetNote)
  const isPlaying = currentReading !== null && matchesNote(key, currentReading.note)

  if (isPlaying && isTarget) return 'correct'
  if (isPlaying && targetNote !== null) return 'incorrect'
  if (isPlaying) return 'playing'
  if (isTarget) return 'target'
  return 'idle'
}

/**
 * "Correct" requires an exact name+octave match, not just the note name —
 * right-note-wrong-octave is a real, common mistake worth distinguishing
 * from actually correct, since the target is a specific clicked key.
 */
export function deriveKeyboardStates(
  keys: KeyIdentity[],
  targetNote: TargetNote | null,
  currentReading: PitchReading | null
): Map<number, KeyVisualState> {
  return new Map(keys.map((key) => [key.midi, deriveKeyState(key, targetNote, currentReading)]))
}
