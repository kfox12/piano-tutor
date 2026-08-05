import type { NoteName } from './noteMath'

export interface SongNote extends NoteName {
  midi: number
}

export interface SongEvent {
  /** Stable across edits — array position shifts as events are added/removed. */
  id: string
  /** Length 1 = single note; length > 1 = chord. */
  notes: SongNote[]
}

/**
 * A user-defined practice range within a song, saved as one of its
 * attributes. References events by id rather than index, for the same
 * reason SongEvent.id exists — array position shifts as events are
 * added/removed, but an id doesn't.
 */
export interface SongSegment {
  id: string
  name: string
  startEventId: string
  endEventId: string
}

export interface Song {
  /** Absent until the song has been saved to disk at least once. */
  songId?: string
  title: string
  events: SongEvent[]
  segments: SongSegment[]
}

let nextEventId = 0

/** Stable id for a new SongEvent, safe to call repeatedly while editing a Song. */
export function createEventId(): string {
  nextEventId += 1
  return `event-${Date.now()}-${nextEventId}`
}

let nextSongId = 0

/** Stable id for a Song, assigned the first time it's saved to disk. */
export function createSongId(): string {
  nextSongId += 1
  return `song-${Date.now()}-${nextSongId}`
}

let nextSegmentId = 0

/** Stable id for a SongSegment, safe to call repeatedly while creating segments. */
export function createSegmentId(): string {
  nextSegmentId += 1
  return `segment-${Date.now()}-${nextSegmentId}`
}

export interface EventRange {
  startIndex: number
  endIndex: number
}

/**
 * Resolves a segment id to a current [startIndex, endIndex] range within
 * `song.events`, by looking up its start/end event ids fresh each time —
 * not caching indices, since editing the song shifts what index an id
 * lives at. Falls back to the full song's range when `segmentId` is null,
 * unknown, or its events no longer exist (e.g. deleted in the editor)
 * rather than throwing, so a stale reference degrades gracefully.
 */
export function resolveSegmentBounds(song: Song, segmentId: string | null): EventRange {
  const fullRange: EventRange = { startIndex: 0, endIndex: Math.max(song.events.length - 1, 0) }
  if (!segmentId) return fullRange

  const segment = song.segments.find((candidate) => candidate.id === segmentId)
  if (!segment) return fullRange

  const startIndex = song.events.findIndex((event) => event.id === segment.startEventId)
  const endIndex = song.events.findIndex((event) => event.id === segment.endEventId)
  if (startIndex === -1 || endIndex === -1) return fullRange

  return { startIndex, endIndex }
}
