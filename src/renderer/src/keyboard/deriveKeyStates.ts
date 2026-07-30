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

/** Exact name+octave match — the single source of truth for "same note." */
export function notesMatch(
  a: { name: string; octave: number },
  b: { name: string; octave: number }
): boolean {
  return a.name === b.name && a.octave === b.octave
}

function deriveKeyState(
  key: KeyIdentity,
  targetNote: TargetNote | null,
  currentReading: PitchReading | null
): KeyVisualState {
  const isTarget = targetNote !== null && notesMatch(key, targetNote)
  const isPlaying = currentReading !== null && notesMatch(key, currentReading.note)

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
