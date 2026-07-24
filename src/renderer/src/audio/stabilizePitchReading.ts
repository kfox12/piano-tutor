import type { NoteInfo } from './frequencyToNote'

export interface PitchReading {
  frequency: number
  note: NoteInfo
}

export interface StabilizerState {
  committed: PitchReading | null
  candidateName: string | null
  candidateCount: number
}

// How many consecutive frames a new note must win before the display
// switches to it. Filters single-frame jitter (attack transients, frame-to-
// frame estimation noise) without adding noticeable latency (a few frames
// at ~60fps is a few tens of ms).
const STABILITY_FRAMES = 3

export function initialStabilizerState(): StabilizerState {
  return { committed: null, candidateName: null, candidateCount: 0 }
}

function noteName(reading: PitchReading): string {
  return `${reading.note.name}${reading.note.octave}`
}

/**
 * Folds a raw per-frame detection into a debounced reading: a note only
 * becomes the displayed `committed` reading after winning STABILITY_FRAMES
 * consecutive frames, and the previous committed note keeps showing while a
 * new candidate is still being confirmed (rather than flickering to blank).
 */
export function stabilize(state: StabilizerState, detected: PitchReading | null): StabilizerState {
  if (!detected) {
    return initialStabilizerState()
  }

  const name = noteName(detected)

  if (state.committed && name === noteName(state.committed)) {
    return { committed: detected, candidateName: null, candidateCount: 0 }
  }

  if (name === state.candidateName) {
    const candidateCount = state.candidateCount + 1
    if (candidateCount >= STABILITY_FRAMES) {
      return { committed: detected, candidateName: null, candidateCount: 0 }
    }
    return { ...state, candidateCount }
  }

  return { committed: state.committed, candidateName: name, candidateCount: 1 }
}
