import { useCallback, useState } from 'react'
import { createSongId, type Song } from './song'

export interface SongSummary {
  songId: string
  title: string
  eventCount: number
}

export type SongLibraryListState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'loaded'; songs: SongSummary[] }

interface UseSongLibraryResult {
  listState: SongLibraryListState
  refresh: () => Promise<void>
  save: (song: Song) => Promise<Song>
  load: (songId: string) => Promise<Song>
  remove: (songId: string) => Promise<void>
}

function toMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Failed to reach the song library'
}

export function useSongLibrary(): UseSongLibraryResult {
  const [listState, setListState] = useState<SongLibraryListState>({ status: 'idle' })

  const refresh = useCallback(async () => {
    setListState({ status: 'loading' })
    try {
      const songs = await window.api.listSongs()
      setListState({ status: 'loaded', songs })
    } catch (error) {
      setListState({ status: 'error', message: toMessage(error) })
    }
  }, [])

  const save = useCallback(async (song: Song): Promise<Song> => {
    const songId = song.songId ?? createSongId()
    // The wire type requires songId; toSave always has one by this point,
    // even though it's optional on Song itself (an unsaved song has none).
    const toSave = { ...song, songId }
    await window.api.saveSong(toSave)
    return toSave
  }, [])

  const load = useCallback(async (songId: string): Promise<Song> => {
    return window.api.loadSong(songId)
  }, [])

  const remove = useCallback(async (songId: string): Promise<void> => {
    await window.api.deleteSong(songId)
  }, [])

  return { listState, refresh, save, load, remove }
}
