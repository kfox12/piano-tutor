import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Song } from './song'
import { useSongLibrary } from './useSongLibrary'

const UNSAVED_SONG: Song = {
  title: 'Test Song',
  events: [{ id: 'event-1', notes: [{ midi: 60, name: 'C', octave: 4 }] }],
  segments: []
}

beforeEach(() => {
  window.api = {
    selectMidiFile: vi.fn(),
    saveSong: vi.fn().mockResolvedValue(undefined),
    listSongs: vi.fn().mockResolvedValue([]),
    loadSong: vi.fn(),
    deleteSong: vi.fn().mockResolvedValue(undefined)
  }
})

describe('useSongLibrary', () => {
  it('starts idle', () => {
    const { result } = renderHook(() => useSongLibrary())
    expect(result.current.listState).toEqual({ status: 'idle' })
  })

  it('refresh loads the song list from the main process', async () => {
    vi.mocked(window.api.listSongs).mockResolvedValue([
      { songId: 'song-1', title: 'Test Song', eventCount: 3 }
    ])
    const { result } = renderHook(() => useSongLibrary())

    await act(async () => {
      await result.current.refresh()
    })

    expect(result.current.listState).toEqual({
      status: 'loaded',
      songs: [{ songId: 'song-1', title: 'Test Song', eventCount: 3 }]
    })
  })

  it('surfaces a list error', async () => {
    vi.mocked(window.api.listSongs).mockRejectedValue(new Error('disk read failed'))
    const { result } = renderHook(() => useSongLibrary())

    await act(async () => {
      await result.current.refresh()
    })

    expect(result.current.listState).toEqual({ status: 'error', message: 'disk read failed' })
  })

  it('save assigns a songId to a not-yet-saved song and writes it via IPC', async () => {
    const { result } = renderHook(() => useSongLibrary())

    let saved: Song | undefined
    await act(async () => {
      saved = await result.current.save(UNSAVED_SONG)
    })

    expect(saved?.songId).toBeTruthy()
    expect(window.api.saveSong).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Test Song', songId: saved?.songId })
    )
  })

  it('save reuses an existing songId rather than assigning a new one', async () => {
    const alreadySaved: Song = { ...UNSAVED_SONG, songId: 'song-existing' }
    const { result } = renderHook(() => useSongLibrary())

    let saved: Song | undefined
    await act(async () => {
      saved = await result.current.save(alreadySaved)
    })

    expect(saved?.songId).toBe('song-existing')
    expect(window.api.saveSong).toHaveBeenCalledWith(
      expect.objectContaining({ songId: 'song-existing' })
    )
  })

  it('load fetches a full song by id', async () => {
    const fullSong: Song & { songId: string } = { ...UNSAVED_SONG, songId: 'song-1' }
    vi.mocked(window.api.loadSong).mockResolvedValue(fullSong)
    const { result } = renderHook(() => useSongLibrary())

    let loaded: Song | undefined
    await act(async () => {
      loaded = await result.current.load('song-1')
    })

    expect(loaded).toEqual(fullSong)
    expect(window.api.loadSong).toHaveBeenCalledWith('song-1')
  })

  it('remove deletes a song by id', async () => {
    const { result } = renderHook(() => useSongLibrary())

    await act(async () => {
      await result.current.remove('song-1')
    })

    expect(window.api.deleteSong).toHaveBeenCalledWith('song-1')
  })

  it('starts a refresh in the loading state', async () => {
    let resolveList: (value: []) => void = () => {}
    vi.mocked(window.api.listSongs).mockReturnValue(
      new Promise((resolve) => {
        resolveList = resolve
      })
    )
    const { result } = renderHook(() => useSongLibrary())

    act(() => {
      void result.current.refresh()
    })
    expect(result.current.listState).toEqual({ status: 'loading' })

    resolveList([])
    await waitFor(() => expect(result.current.listState.status).toBe('loaded'))
  })
})
