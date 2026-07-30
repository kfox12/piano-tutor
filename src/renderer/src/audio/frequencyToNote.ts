import { midiToNote } from '../song/noteMath'

export interface NoteInfo {
  name: string
  octave: number
  frequency: number
  centsOffset: number
}

const A4_MIDI = 69
const A4_FREQUENCY = 440

/**
 * Maps a frequency to the nearest equal-tempered note (A4 = 440Hz), plus how
 * many cents sharp (+) or flat (-) the input is from that note's exact pitch.
 */
export function frequencyToNote(frequency: number): NoteInfo {
  const midiFloat = A4_MIDI + 12 * Math.log2(frequency / A4_FREQUENCY)
  const midiRounded = Math.round(midiFloat)

  const { name, octave } = midiToNote(midiRounded)
  const noteFrequency = A4_FREQUENCY * Math.pow(2, (midiRounded - A4_MIDI) / 12)
  const centsOffset = (midiFloat - midiRounded) * 100

  return { name, octave, frequency: noteFrequency, centsOffset }
}
