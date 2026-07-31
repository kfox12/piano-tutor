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

export interface Song {
  title: string
  events: SongEvent[]
}

let nextEventId = 0

/** Stable id for a new SongEvent, safe to call repeatedly while editing a Song. */
export function createEventId(): string {
  nextEventId += 1
  return `event-${Date.now()}-${nextEventId}`
}
