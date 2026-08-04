import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Song } from './song'
import { useSongImport } from './useSongImport'

const parseMidiFileMock = vi.fn()
vi.mock('./parseMidiFile', () => ({
  parseMidiFile: (...args: unknown[]) => parseMidiFileMock(...args)
}))

const FAKE_SONG: Song = {
  title: 'Test',
  events: [{ id: 'event-1', notes: [{ midi: 60, name: 'C', octave: 4 }] }],
  segments: []
}

const THREE_EVENT_SONG: Song = {
  title: 'Three Notes',
  events: [
    { id: 'event-1', notes: [{ midi: 60, name: 'C', octave: 4 }] },
    { id: 'event-2', notes: [{ midi: 62, name: 'D', octave: 4 }] },
    { id: 'event-3', notes: [{ midi: 64, name: 'E', octave: 4 }] }
  ],
  segments: []
}

function fakeSelectedFile(): { fileName: string; data: Uint8Array } {
  return { fileName: 'test.mid', data: new Uint8Array([1, 2, 3]) }
}

beforeEach(() => {
  parseMidiFileMock.mockReset()
  window.api = {
    selectMidiFile: vi.fn(),
    saveSong: vi.fn(),
    listSongs: vi.fn(),
    loadSong: vi.fn(),
    deleteSong: vi.fn()
  }
})

describe('useSongImport', () => {
  it('starts idle', () => {
    const { result } = renderHook(() => useSongImport())
    expect(result.current.state).toEqual({ status: 'idle' })
  })

  it('stays idle when the user cancels the file dialog', async () => {
    vi.mocked(window.api.selectMidiFile).mockResolvedValue(null)
    const { result } = renderHook(() => useSongImport())

    await act(async () => {
      await result.current.importFile()
    })

    expect(result.current.state).toEqual({ status: 'idle' })
    expect(parseMidiFileMock).not.toHaveBeenCalled()
  })

  it('parses the selected file and exposes the resulting song at previewIndex 0', async () => {
    vi.mocked(window.api.selectMidiFile).mockResolvedValue(fakeSelectedFile())
    parseMidiFileMock.mockReturnValue(FAKE_SONG)
    const { result } = renderHook(() => useSongImport())

    await act(async () => {
      await result.current.importFile()
    })

    expect(result.current.state).toEqual({
      status: 'success',
      song: FAKE_SONG,
      previewIndex: 0,
      activeSegmentId: null
    })
    expect(parseMidiFileMock).toHaveBeenCalledWith(expect.any(ArrayBuffer), 'test.mid')
  })

  it('surfaces a parse error', async () => {
    vi.mocked(window.api.selectMidiFile).mockResolvedValue(fakeSelectedFile())
    parseMidiFileMock.mockImplementation(() => {
      throw new Error('Not a MIDI file: missing MThd header chunk')
    })
    const { result } = renderHook(() => useSongImport())

    await act(async () => {
      await result.current.importFile()
    })

    expect(result.current.state).toEqual({
      status: 'error',
      message: 'Not a MIDI file: missing MThd header chunk'
    })
  })

  it('updateSong replaces the song while in the success state', async () => {
    vi.mocked(window.api.selectMidiFile).mockResolvedValue(fakeSelectedFile())
    parseMidiFileMock.mockReturnValue(FAKE_SONG)
    const { result } = renderHook(() => useSongImport())

    await act(async () => {
      await result.current.importFile()
    })

    const updated: Song = { ...FAKE_SONG, title: 'Renamed' }
    act(() => result.current.updateSong(updated))

    expect(result.current.state).toEqual({
      status: 'success',
      song: updated,
      previewIndex: 0,
      activeSegmentId: null
    })
  })

  it('stepPreview moves forward and backward, clamped to the event list bounds', async () => {
    vi.mocked(window.api.selectMidiFile).mockResolvedValue(fakeSelectedFile())
    parseMidiFileMock.mockReturnValue(THREE_EVENT_SONG)
    const { result } = renderHook(() => useSongImport())

    await act(async () => {
      await result.current.importFile()
    })

    act(() => result.current.stepPreview(1))
    expect(result.current.state).toMatchObject({ previewIndex: 1 })

    act(() => result.current.stepPreview(1))
    act(() => result.current.stepPreview(1)) // attempt to go past the last event
    expect(result.current.state).toMatchObject({ previewIndex: 2 })

    act(() => result.current.stepPreview(-10)) // attempt to go before the first event
    expect(result.current.state).toMatchObject({ previewIndex: 0 })
  })

  it('loadExisting puts a song straight into success state at previewIndex 0', () => {
    const { result } = renderHook(() => useSongImport())

    act(() => result.current.loadExisting(THREE_EVENT_SONG))

    expect(result.current.state).toEqual({
      status: 'success',
      song: THREE_EVENT_SONG,
      previewIndex: 0,
      activeSegmentId: null
    })
    expect(parseMidiFileMock).not.toHaveBeenCalled()
  })

  it('clamps previewIndex if updateSong removes the event it pointed at', async () => {
    vi.mocked(window.api.selectMidiFile).mockResolvedValue(fakeSelectedFile())
    parseMidiFileMock.mockReturnValue(THREE_EVENT_SONG)
    const { result } = renderHook(() => useSongImport())

    await act(async () => {
      await result.current.importFile()
    })
    act(() => result.current.stepPreview(2)) // now at the last event (index 2)

    const shortened: Song = { ...THREE_EVENT_SONG, events: THREE_EVENT_SONG.events.slice(0, 1) }
    act(() => result.current.updateSong(shortened))

    expect(result.current.state).toEqual({
      status: 'success',
      song: shortened,
      previewIndex: 0,
      activeSegmentId: null
    })
  })

  it('stepPreview wraps within an active segment instead of clamping at its end', async () => {
    vi.mocked(window.api.selectMidiFile).mockResolvedValue(fakeSelectedFile())
    const songWithSegment: Song = {
      ...THREE_EVENT_SONG,
      segments: [{ id: 'seg-1', name: 'First Two', startEventId: 'event-1', endEventId: 'event-2' }]
    }
    parseMidiFileMock.mockReturnValue(songWithSegment)
    const { result } = renderHook(() => useSongImport())

    await act(async () => {
      await result.current.importFile()
    })
    act(() => result.current.setActiveSegment('seg-1'))
    expect(result.current.state).toMatchObject({ previewIndex: 0, activeSegmentId: 'seg-1' })

    act(() => result.current.stepPreview(1))
    expect(result.current.state).toMatchObject({ previewIndex: 1 })

    // Reaching the segment's end wraps back to its start, not the whole song.
    act(() => result.current.stepPreview(1))
    expect(result.current.state).toMatchObject({ previewIndex: 0 })

    // Stepping backward from the start wraps to the segment's end.
    act(() => result.current.stepPreview(-1))
    expect(result.current.state).toMatchObject({ previewIndex: 1 })
  })

  it('setActiveSegment(null) returns to full-song clamped navigation', async () => {
    vi.mocked(window.api.selectMidiFile).mockResolvedValue(fakeSelectedFile())
    const songWithSegment: Song = {
      ...THREE_EVENT_SONG,
      segments: [{ id: 'seg-1', name: 'First Two', startEventId: 'event-1', endEventId: 'event-2' }]
    }
    parseMidiFileMock.mockReturnValue(songWithSegment)
    const { result } = renderHook(() => useSongImport())

    await act(async () => {
      await result.current.importFile()
    })
    act(() => result.current.setActiveSegment('seg-1'))
    act(() => result.current.setActiveSegment(null))

    expect(result.current.state).toMatchObject({ previewIndex: 0, activeSegmentId: null })
    act(() => result.current.stepPreview(1))
    act(() => result.current.stepPreview(1))
    act(() => result.current.stepPreview(1)) // attempt to go past the last event
    expect(result.current.state).toMatchObject({ previewIndex: 2 })
  })

  it('updateSong clears activeSegmentId if the referenced segment was deleted', async () => {
    vi.mocked(window.api.selectMidiFile).mockResolvedValue(fakeSelectedFile())
    const songWithSegment: Song = {
      ...THREE_EVENT_SONG,
      segments: [{ id: 'seg-1', name: 'First Two', startEventId: 'event-1', endEventId: 'event-2' }]
    }
    parseMidiFileMock.mockReturnValue(songWithSegment)
    const { result } = renderHook(() => useSongImport())

    await act(async () => {
      await result.current.importFile()
    })
    act(() => result.current.setActiveSegment('seg-1'))

    const withoutSegment: Song = { ...songWithSegment, segments: [] }
    act(() => result.current.updateSong(withoutSegment))

    expect(result.current.state).toMatchObject({ activeSegmentId: null })
  })
})
