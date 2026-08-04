import { useCallback, useState } from 'react'
import { parseMidiFile } from './parseMidiFile'
import type { Song } from './song'

export type SongImportState =
  | { status: 'idle' }
  | { status: 'importing' }
  | { status: 'error'; message: string }
  | { status: 'success'; song: Song; previewIndex: number }

interface UseSongImportResult {
  state: SongImportState
  importFile: () => Promise<void>
  loadExisting: (song: Song) => void
  updateSong: (song: Song) => void
  stepPreview: (delta: number) => void
}

function clampIndex(index: number, length: number): number {
  if (length === 0) return 0
  return Math.min(Math.max(index, 0), length - 1)
}

export function useSongImport(): UseSongImportResult {
  const [state, setState] = useState<SongImportState>({ status: 'idle' })

  const importFile = useCallback(async () => {
    setState({ status: 'importing' })
    try {
      const selected = await window.api.selectMidiFile()
      if (!selected) {
        setState({ status: 'idle' })
        return
      }

      // .slice() copies into a fresh, standalone ArrayBuffer (never shared/offset)
      const buffer = selected.data.slice().buffer as ArrayBuffer
      const song = parseMidiFile(buffer, selected.fileName)
      setState({ status: 'success', song, previewIndex: 0 })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to import MIDI file'
      setState({ status: 'error', message })
    }
  }, [])

  // Puts an already-complete Song (e.g. loaded from the saved library)
  // straight into preview, the same end state importFile() reaches after
  // parsing a MIDI file — the review UI doesn't care which path got it there.
  const loadExisting = useCallback((song: Song) => {
    setState({ status: 'success', song, previewIndex: 0 })
  }, [])

  const updateSong = useCallback((song: Song) => {
    setState((current) =>
      current.status === 'success'
        ? {
            status: 'success',
            song,
            previewIndex: clampIndex(current.previewIndex, song.events.length)
          }
        : current
    )
  }, [])

  const stepPreview = useCallback((delta: number) => {
    setState((current) =>
      current.status === 'success'
        ? {
            ...current,
            previewIndex: clampIndex(current.previewIndex + delta, current.song.events.length)
          }
        : current
    )
  }, [])

  return { state, importFile, loadExisting, updateSong, stepPreview }
}
