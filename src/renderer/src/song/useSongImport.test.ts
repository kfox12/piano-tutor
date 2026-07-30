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
  events: [{ id: 'event-1', notes: [{ midi: 60, name: 'C', octave: 4 }] }]
}

function fakeSelectedFile(): { fileName: string; data: Uint8Array } {
  return { fileName: 'test.mid', data: new Uint8Array([1, 2, 3]) }
}

beforeEach(() => {
  parseMidiFileMock.mockReset()
  window.api = { selectMidiFile: vi.fn() }
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

  it('parses the selected file and exposes the resulting song', async () => {
    vi.mocked(window.api.selectMidiFile).mockResolvedValue(fakeSelectedFile())
    parseMidiFileMock.mockReturnValue(FAKE_SONG)
    const { result } = renderHook(() => useSongImport())

    await act(async () => {
      await result.current.importFile()
    })

    expect(result.current.state).toEqual({ status: 'success', song: FAKE_SONG })
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

    expect(result.current.state).toEqual({ status: 'success', song: updated })
  })
})
