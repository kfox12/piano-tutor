export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

export interface NoteName {
  name: string
  octave: number
}

/** Converts a MIDI note number (0-127) to its equal-tempered name + octave. */
export function midiToNote(midi: number): NoteName {
  const name = NOTE_NAMES[((midi % 12) + 12) % 12]
  const octave = Math.floor(midi / 12) - 1
  return { name, octave }
}

/** Inverse of `midiToNote` — converts a note name + octave back to its MIDI number. */
export function noteToMidi(name: string, octave: number): number {
  return (octave + 1) * 12 + NOTE_NAMES.indexOf(name)
}
