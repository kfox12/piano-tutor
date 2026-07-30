import { describe, expect, it } from 'vitest'
import { parseMidiFile } from './parseMidiFile'

// Test fixtures use division = 500 ticks/quarter-note. Combined with the parser's
// default tempo (500,000 microseconds/quarter = 120 BPM), that gives exactly
// 1ms per tick, so a delta-time in these fixtures can be read directly as milliseconds.
const TICKS_PER_QUARTER = 500

function u32(n: number): number[] {
  return [(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff]
}

function u16(n: number): number[] {
  return [(n >>> 8) & 0xff, n & 0xff]
}

function buildMidiFile(tracks: number[][], division = TICKS_PER_QUARTER): ArrayBuffer {
  const header = [
    0x4d,
    0x54,
    0x68,
    0x64,
    ...u32(6),
    ...u16(1),
    ...u16(tracks.length),
    ...u16(division)
  ]
  const trackChunks = tracks.flatMap((track) => [
    0x4d,
    0x54,
    0x72,
    0x6b,
    ...u32(track.length),
    ...track
  ])
  return new Uint8Array([...header, ...trackChunks]).buffer
}

function encodeVariableLength(value: number): number[] {
  const bytes = [value & 0x7f]
  let remaining = value >> 7
  while (remaining > 0) {
    bytes.unshift((remaining & 0x7f) | 0x80)
    remaining >>= 7
  }
  return bytes
}

function noteOn(deltaTicks: number, channel: number, note: number, velocity = 100): number[] {
  return [...encodeVariableLength(deltaTicks), 0x90 | channel, note, velocity]
}

function noteOff(deltaTicks: number, channel: number, note: number): number[] {
  return [...encodeVariableLength(deltaTicks), 0x80 | channel, note, 0]
}

const END_OF_TRACK = [0x00, 0xff, 0x2f, 0x00]

describe('parseMidiFile', () => {
  it('extracts a single note as one event', () => {
    const track = [...noteOn(0, 0, 60), ...noteOff(100, 0, 60), ...END_OF_TRACK]
    const song = parseMidiFile(buildMidiFile([track]), 'Test Song')

    expect(song.title).toBe('Test Song')
    expect(song.events).toHaveLength(1)
    expect(song.events[0].notes).toEqual([{ midi: 60, name: 'C', octave: 4 }])
  })

  it('groups notes starting within the chord threshold into one event', () => {
    // Second note starts 20ms after the first — well inside the 50ms threshold.
    const track = [
      ...noteOn(0, 0, 60),
      ...noteOn(20, 0, 64),
      ...noteOff(80, 0, 60),
      ...noteOff(0, 0, 64),
      ...END_OF_TRACK
    ]
    const song = parseMidiFile(buildMidiFile([track]), 'Chord')

    expect(song.events).toHaveLength(1)
    expect(song.events[0].notes).toEqual([
      { midi: 60, name: 'C', octave: 4 },
      { midi: 64, name: 'E', octave: 4 }
    ])
  })

  it('keeps notes starting outside the chord threshold as separate events', () => {
    // Second note starts 100ms after the first — outside the 50ms threshold.
    const track = [...noteOn(0, 0, 60), ...noteOn(100, 0, 64), ...END_OF_TRACK]
    const song = parseMidiFile(buildMidiFile([track]), 'Melody')

    expect(song.events).toHaveLength(2)
    expect(song.events[0].notes).toEqual([{ midi: 60, name: 'C', octave: 4 }])
    expect(song.events[1].notes).toEqual([{ midi: 64, name: 'E', octave: 4 }])
  })

  it('deduplicates the same pitch appearing twice within one chord', () => {
    const track = [...noteOn(0, 0, 60), ...noteOn(0, 1, 60), ...END_OF_TRACK]
    const song = parseMidiFile(buildMidiFile([track]), 'Doubled')

    expect(song.events).toHaveLength(1)
    expect(song.events[0].notes).toEqual([{ midi: 60, name: 'C', octave: 4 }])
  })

  it('handles running status (status byte omitted on repeated events)', () => {
    // Second Note On has no status byte — parser must reuse the previous one (0x90).
    const track = [0x00, 0x90, 60, 100, 10, 64, 100, ...END_OF_TRACK]
    const song = parseMidiFile(buildMidiFile([track]), 'Running Status')

    expect(song.events).toHaveLength(1)
    expect(song.events[0].notes).toEqual([
      { midi: 60, name: 'C', octave: 4 },
      { midi: 64, name: 'E', octave: 4 }
    ])
  })

  it('merges multiple tracks into one time-ordered stream', () => {
    const trackA = [...noteOn(0, 0, 60), ...noteOn(200, 0, 64), ...END_OF_TRACK]
    const trackB = [...noteOn(100, 0, 67), ...END_OF_TRACK]
    const song = parseMidiFile(buildMidiFile([trackA, trackB]), 'Multi-track')

    expect(song.events.map((event) => event.notes[0].midi)).toEqual([60, 67, 64])
  })

  it('excludes notes on the percussion channel (10)', () => {
    const track = [...noteOn(0, 9, 38), ...noteOn(0, 0, 60), ...END_OF_TRACK]
    const song = parseMidiFile(buildMidiFile([track]), 'With Drums')

    expect(song.events).toHaveLength(1)
    expect(song.events[0].notes).toEqual([{ midi: 60, name: 'C', octave: 4 }])
  })

  it('falls back to the default tempo (120 BPM) when no Set Tempo event is present', () => {
    // 60 ticks at 1ms/tick under the default tempo = 60ms apart, outside the 50ms threshold.
    const track = [...noteOn(0, 0, 60), ...noteOn(60, 0, 64), ...END_OF_TRACK]
    const song = parseMidiFile(buildMidiFile([track]), 'Default Tempo')

    expect(song.events).toHaveLength(2)
  })

  it('uses a Set Tempo meta event to convert ticks to milliseconds', () => {
    // Tempo 250,000 microseconds/quarter = twice as fast as the 500,000 default,
    // so 80 ticks apart becomes 40ms (grouped) instead of 80ms (not grouped).
    const setTempo = [0x00, 0xff, 0x51, 0x03, 0x03, 0xd0, 0x90]
    const track = [...setTempo, ...noteOn(0, 0, 60), ...noteOn(80, 0, 64), ...END_OF_TRACK]
    const song = parseMidiFile(buildMidiFile([track]), 'Custom Tempo')

    expect(song.events).toHaveLength(1)
    expect(song.events[0].notes).toHaveLength(2)
  })

  it('throws for a file missing the MThd header', () => {
    const bytes = new TextEncoder().encode('not a midi file')
    expect(() => parseMidiFile(bytes.buffer, 'Bad File')).toThrow(/MThd/)
  })

  it('throws for SMPTE-based timing division', () => {
    const track = [...noteOn(0, 0, 60), ...END_OF_TRACK]
    const buffer = buildMidiFile([track], 0x8000 | 30)
    expect(() => parseMidiFile(buffer, 'SMPTE')).toThrow(/SMPTE/)
  })
})
