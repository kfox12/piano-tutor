import { useEffect, useRef } from 'react'
import type { PitchReading } from '../audio/usePitchDetector'
import { notesMatch } from '../keyboard/deriveKeyStates'
import type { SongEvent } from './song'

/** True if any note in the event matches the current reading — a chord
 * event is satisfied by hearing just one of its notes, since pitch
 * detection is monophonic and can never hear more than one note at once
 * (see Design-Decisions.md entry 11). */
export function eventMatchesReading(event: SongEvent, reading: PitchReading): boolean {
  return event.notes.some((note) => notesMatch(note, reading.note))
}

/**
 * Calls `onMatch` once per sustained correct match against `currentEvent`
 * — not once per animation frame the match continues to hold.
 * `usePitchDetector` re-emits a reading every frame even for a held note,
 * so without this edge-detection a single held note would fire `onMatch`
 * dozens of times per second. `matchedRef` tracks whether the *current*
 * held/detected reading has already triggered a match, resetting only
 * once the reading goes quiet or changes to a non-matching note — this is
 * what makes back-to-back identical notes in a song require an actual
 * new strike (not just a continued hold) to advance twice.
 */
export function useSongAutoAdvance(
  reading: PitchReading | null,
  currentEvent: SongEvent | null,
  onMatch: () => void
): void {
  const matchedRef = useRef(false)

  useEffect(() => {
    if (!currentEvent || !reading) {
      matchedRef.current = false
      return
    }

    const isMatch = eventMatchesReading(currentEvent, reading)
    if (isMatch && !matchedRef.current) {
      matchedRef.current = true
      onMatch()
    } else if (!isMatch) {
      matchedRef.current = false
    }
  }, [reading, currentEvent, onMatch])
}
