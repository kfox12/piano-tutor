import { NOTE_NAMES } from '../audio/frequencyToNote'

export interface KeyLayout {
  midi: number
  name: string
  octave: number
  isBlack: boolean
  x: number
  width: number
  height: number
}

export interface KeyboardLayout {
  keys: KeyLayout[]
  totalWidth: number
  whiteKeyHeight: number
  blackKeyHeight: number
}

const WHITE_KEY_WIDTH = 24
const WHITE_KEY_HEIGHT = 120
const BLACK_KEY_WIDTH = 14
const BLACK_KEY_HEIGHT = 76

const LOWEST_MIDI = 21 // A0
const HIGHEST_MIDI = 108 // C8

/**
 * Generates the layout for an 88-key keyboard (A0-C8 by default). Black keys
 * are positioned relative to a running white-key index rather than an
 * octave-position lookup table, so "no black key between B/C or E/F" falls
 * out automatically (a black key only exists where the note name has a '#')
 * instead of needing to be special-cased, and it generalizes correctly to
 * the range's partial-octave ends.
 */
export function generateKeyboardLayout(
  lowestMidi = LOWEST_MIDI,
  highestMidi = HIGHEST_MIDI
): KeyboardLayout {
  const keys: KeyLayout[] = []
  let whiteIndex = 0

  for (let midi = lowestMidi; midi <= highestMidi; midi++) {
    const name = NOTE_NAMES[((midi % 12) + 12) % 12]
    const octave = Math.floor(midi / 12) - 1
    const isBlack = name.includes('#')

    if (isBlack) {
      const boundary = whiteIndex * WHITE_KEY_WIDTH
      keys.push({
        midi,
        name,
        octave,
        isBlack: true,
        x: boundary - BLACK_KEY_WIDTH / 2,
        width: BLACK_KEY_WIDTH,
        height: BLACK_KEY_HEIGHT
      })
    } else {
      keys.push({
        midi,
        name,
        octave,
        isBlack: false,
        x: whiteIndex * WHITE_KEY_WIDTH,
        width: WHITE_KEY_WIDTH,
        height: WHITE_KEY_HEIGHT
      })
      whiteIndex += 1
    }
  }

  return {
    keys,
    totalWidth: whiteIndex * WHITE_KEY_WIDTH,
    whiteKeyHeight: WHITE_KEY_HEIGHT,
    blackKeyHeight: BLACK_KEY_HEIGHT
  }
}
