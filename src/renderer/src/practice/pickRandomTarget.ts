import { notesMatch, type TargetNote } from '../keyboard/deriveKeyStates'
import { generateKeyboardLayout } from '../keyboard/generateKeyboardLayout'

export interface NoteRange {
  lowestMidi: number
  highestMidi: number
}

// One octave centered on middle C (C4-C5) - enough variety for a real
// exercise without spanning registers a beginner hasn't learned to read yet.
// A parameter, not hardcoded, so a future settings UI can pass a different
// range without touching this logic.
export const DEFAULT_PRACTICE_RANGE: NoteRange = { lowestMidi: 60, highestMidi: 72 }

/**
 * Picks a random note within `range`, excluding `previousTarget` from the
 * candidate pool so the same note never repeats back-to-back - this also
 * guarantees a note the player is still physically holding can't become the
 * new target. Falls back to the full pool if excluding it would leave
 * nothing to choose from (a single-note range).
 */
export function pickRandomTarget(
  range: NoteRange,
  previousTarget?: TargetNote | null,
  rng: () => number = Math.random
): TargetNote {
  const { keys } = generateKeyboardLayout(range.lowestMidi, range.highestMidi)
  const filtered = previousTarget ? keys.filter((key) => !notesMatch(key, previousTarget)) : keys
  const candidates = filtered.length > 0 ? filtered : keys
  const chosen = candidates[Math.floor(rng() * candidates.length)]
  return { name: chosen.name, octave: chosen.octave }
}
