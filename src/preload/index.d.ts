import { ElectronAPI } from '@electron-toolkit/preload'

export interface SelectedMidiFile {
  fileName: string
  data: Uint8Array
}

// Mirrors the renderer's Song/SongEvent/SongNote/SongSegment shape
// (src/renderer/src/song/song.ts) structurally, without importing it —
// tsconfig.node.json (which covers this file for the preload/main build)
// doesn't include src/renderer, so this is redeclared rather than shared.
// `songId` is required here (unlike the renderer's optional `Song.songId`)
// since only an already-saved song is ever sent over this boundary.
export interface PersistedSongNote {
  midi: number
  name: string
  octave: number
}

export interface PersistedSongEvent {
  id: string
  notes: PersistedSongNote[]
}

export interface PersistedSongSegment {
  id: string
  name: string
  startEventId: string
  endEventId: string
}

export interface PersistedSong {
  songId: string
  title: string
  events: PersistedSongEvent[]
  segments: PersistedSongSegment[]
}

export interface StoredSongSummary {
  songId: string
  title: string
  eventCount: number
}

export interface PianoTutorApi {
  selectMidiFile: () => Promise<SelectedMidiFile | null>
  saveSong: (song: PersistedSong) => Promise<void>
  listSongs: () => Promise<StoredSongSummary[]>
  loadSong: (songId: string) => Promise<PersistedSong>
  deleteSong: (songId: string) => Promise<void>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: PianoTutorApi
  }
}
