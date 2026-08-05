import { describe, expect, it } from 'vitest'
import { resolveSegmentBounds, type Song } from './song'

const SONG: Song = {
  title: 'Test Song',
  events: [
    { id: 'e1', notes: [{ midi: 60, name: 'C', octave: 4 }] },
    { id: 'e2', notes: [{ midi: 62, name: 'D', octave: 4 }] },
    { id: 'e3', notes: [{ midi: 64, name: 'E', octave: 4 }] },
    { id: 'e4', notes: [{ midi: 65, name: 'F', octave: 4 }] }
  ],
  segments: [{ id: 'seg-1', name: 'Middle', startEventId: 'e2', endEventId: 'e3' }]
}

describe('resolveSegmentBounds', () => {
  it('returns the full song range when segmentId is null', () => {
    expect(resolveSegmentBounds(SONG, null)).toEqual({ startIndex: 0, endIndex: 3 })
  })

  it('resolves a known segment to its current event indices', () => {
    expect(resolveSegmentBounds(SONG, 'seg-1')).toEqual({ startIndex: 1, endIndex: 2 })
  })

  it('falls back to the full song range for an unknown segment id', () => {
    expect(resolveSegmentBounds(SONG, 'does-not-exist')).toEqual({ startIndex: 0, endIndex: 3 })
  })

  it('falls back to the full song range if a referenced event was deleted', () => {
    const songWithDanglingSegment: Song = {
      ...SONG,
      events: SONG.events.filter((event) => event.id !== 'e2')
    }
    expect(resolveSegmentBounds(songWithDanglingSegment, 'seg-1')).toEqual({
      startIndex: 0,
      endIndex: 2
    })
  })

  it('returns {0, 0} for an empty song regardless of segment id', () => {
    const emptySong: Song = { title: 'Empty', events: [], segments: [] }
    expect(resolveSegmentBounds(emptySong, null)).toEqual({ startIndex: 0, endIndex: 0 })
  })
})
