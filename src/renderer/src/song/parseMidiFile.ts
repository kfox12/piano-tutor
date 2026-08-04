import { midiToNote } from './noteMath'
import { createEventId, type Song, type SongEvent, type SongNote } from './song'

/** Notes starting within this many milliseconds of each other are treated as one chord. */
const CHORD_ONSET_THRESHOLD_MS = 50

/** MIDI channel 10 (0-indexed 9) is the General MIDI percussion channel — not a pitch to practice. */
const PERCUSSION_CHANNEL = 9

/** 120 BPM, the MIDI spec's default when no Set Tempo meta event is present. */
const DEFAULT_MICROSECONDS_PER_QUARTER = 500000

interface RawNoteOn {
  midi: number
  timeMs: number
}

class ByteReader {
  private offset = 0

  constructor(private readonly bytes: Uint8Array) {}

  get position(): number {
    return this.offset
  }

  private peekUint8(): number {
    return this.bytes[this.offset]
  }

  readUint8(): number {
    const value = this.bytes[this.offset]
    this.offset += 1
    return value
  }

  readUint16(): number {
    const value = (this.bytes[this.offset] << 8) | this.bytes[this.offset + 1]
    this.offset += 2
    return value
  }

  readUint32(): number {
    const value =
      (this.bytes[this.offset] << 24) |
      (this.bytes[this.offset + 1] << 16) |
      (this.bytes[this.offset + 2] << 8) |
      this.bytes[this.offset + 3]
    this.offset += 4
    return value >>> 0
  }

  readBytes(length: number): Uint8Array {
    const slice = this.bytes.slice(this.offset, this.offset + length)
    this.offset += length
    return slice
  }

  readString(length: number): string {
    return String.fromCharCode(...this.readBytes(length))
  }

  /** Reads a MIDI variable-length quantity (7 data bits per byte, high bit = continuation). */
  readVariableLength(): number {
    let value = 0
    for (;;) {
      const byte = this.readUint8()
      value = (value << 7) | (byte & 0x7f)
      if ((byte & 0x80) === 0) break
    }
    return value
  }

  skip(length: number): void {
    this.offset += length
  }

  /** True if the next status byte is a running-status data byte (top bit clear). */
  nextIsRunningStatus(): boolean {
    return this.peekUint8() < 0x80
  }
}

/**
 * Parses a Standard MIDI File into the app's internal Song model. Only pitch and
 * onset-time-proximity (for chord grouping) are extracted — durations, velocity,
 * tempo changes after the first, and expressive/controller data are discarded.
 * See docs/Design-Decisions.md for the documented v1 limitations (single constant
 * tempo, no track-selection UI, ticks-per-quarter timing only).
 */
export function parseMidiFile(buffer: ArrayBuffer, title: string): Song {
  const reader = new ByteReader(new Uint8Array(buffer))

  if (reader.readString(4) !== 'MThd') {
    throw new Error('Not a MIDI file: missing MThd header chunk')
  }
  const headerLength = reader.readUint32()
  reader.readUint16() // format (0/1/2) — unused, we merge all tracks regardless
  const trackCount = reader.readUint16()
  const division = reader.readUint16()
  reader.skip(headerLength - 6) // tolerate a longer-than-standard header chunk

  if ((division & 0x8000) !== 0) {
    throw new Error('SMPTE-based MIDI timing is not supported')
  }
  const ticksPerQuarterNote = division

  const rawNotes: RawNoteOn[] = []
  let microsecondsPerQuarter = DEFAULT_MICROSECONDS_PER_QUARTER
  let tempoSet = false

  for (let trackIndex = 0; trackIndex < trackCount; trackIndex++) {
    if (reader.readString(4) !== 'MTrk') {
      throw new Error(`Expected MTrk chunk for track ${trackIndex}`)
    }
    const trackLength = reader.readUint32()
    const trackEnd = reader.position + trackLength

    let absoluteTicks = 0
    let runningStatus: number | null = null

    while (reader.position < trackEnd) {
      absoluteTicks += reader.readVariableLength()

      let statusByte: number
      if (reader.nextIsRunningStatus()) {
        if (runningStatus === null) {
          throw new Error('Invalid MIDI file: running status used before any status byte')
        }
        statusByte = runningStatus
      } else {
        statusByte = reader.readUint8()
      }

      if (statusByte === 0xff) {
        const metaType = reader.readUint8()
        const length = reader.readVariableLength()
        const data = reader.readBytes(length)
        const SET_TEMPO = 0x51
        if (metaType === SET_TEMPO && !tempoSet && length === 3) {
          microsecondsPerQuarter = (data[0] << 16) | (data[1] << 8) | data[2]
          tempoSet = true
        }
      } else if (statusByte === 0xf0 || statusByte === 0xf7) {
        reader.skip(reader.readVariableLength())
      } else if (statusByte >= 0x80 && statusByte < 0xf0) {
        runningStatus = statusByte
        const type = statusByte & 0xf0
        const channel = statusByte & 0x0f

        if (type === 0x90 || type === 0x80) {
          const noteNumber = reader.readUint8()
          const velocity = reader.readUint8()
          const isNoteOn = type === 0x90 && velocity > 0
          if (isNoteOn && channel !== PERCUSSION_CHANNEL) {
            const timeMs = (absoluteTicks / ticksPerQuarterNote) * (microsecondsPerQuarter / 1000)
            rawNotes.push({ midi: noteNumber, timeMs })
          }
        } else if (type === 0xc0 || type === 0xd0) {
          reader.skip(1)
        } else {
          reader.skip(2) // poly aftertouch, control change, pitch bend
        }
      } else {
        throw new Error(`Unsupported MIDI status byte: 0x${statusByte.toString(16)}`)
      }
    }
  }

  return { title, events: groupIntoEvents(rawNotes), segments: [] }
}

function groupIntoEvents(rawNotes: RawNoteOn[]): SongEvent[] {
  const sorted = [...rawNotes].sort((a, b) => a.timeMs - b.timeMs)

  const events: SongEvent[] = []
  let group: RawNoteOn[] = []

  for (const note of sorted) {
    const groupStart = group[0]
    if (groupStart && note.timeMs - groupStart.timeMs > CHORD_ONSET_THRESHOLD_MS) {
      events.push(toSongEvent(group))
      group = []
    }
    group.push(note)
  }
  if (group.length > 0) {
    events.push(toSongEvent(group))
  }

  return events
}

function toSongEvent(group: RawNoteOn[]): SongEvent {
  const seenMidi = new Set<number>()
  const notes: SongNote[] = []

  for (const raw of [...group].sort((a, b) => a.midi - b.midi)) {
    if (seenMidi.has(raw.midi)) continue
    seenMidi.add(raw.midi)
    const { name, octave } = midiToNote(raw.midi)
    notes.push({ midi: raw.midi, name, octave })
  }

  return { id: createEventId(), notes }
}
