import { useCallback, useState } from 'react'
import { parseMidiFile } from './parseMidiFile'
import type { Song } from './song'

export type SongImportState =
  | { status: 'idle' }
  | { status: 'importing' }
  | { status: 'error'; message: string }
  | { status: 'success'; song: Song }

interface UseSongImportResult {
  state: SongImportState
  importFile: () => Promise<void>
  updateSong: (song: Song) => void
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
      setState({ status: 'success', song })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to import MIDI file'
      setState({ status: 'error', message })
    }
  }, [])

  const updateSong = useCallback((song: Song) => {
    setState((current) => (current.status === 'success' ? { status: 'success', song } : current))
  }, [])

  return { state, importFile, updateSong }
}
