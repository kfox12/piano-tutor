import { useCallback, useState } from 'react'
import { parseMidiFile } from './parseMidiFile'
import { resolveSegmentBounds, type Song } from './song'

export type SongImportState =
  | { status: 'idle' }
  | { status: 'importing' }
  | { status: 'error'; message: string }
  | { status: 'success'; song: Song; previewIndex: number; activeSegmentId: string | null }

interface UseSongImportResult {
  state: SongImportState
  importFile: () => Promise<void>
  loadExisting: (song: Song) => void
  updateSong: (song: Song) => void
  stepPreview: (delta: number) => void
  setActiveSegment: (segmentId: string | null) => void
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
      setState({ status: 'success', song, previewIndex: 0, activeSegmentId: null })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to import MIDI file'
      setState({ status: 'error', message })
    }
  }, [])

  // Puts an already-complete Song (e.g. loaded from the saved library)
  // straight into preview, the same end state importFile() reaches after
  // parsing a MIDI file — the review UI doesn't care which path got it there.
  const loadExisting = useCallback((song: Song) => {
    setState({ status: 'success', song, previewIndex: 0, activeSegmentId: null })
  }, [])

  const updateSong = useCallback((song: Song) => {
    setState((current) => {
      if (current.status !== 'success') return current
      // A segment referenced by id might have just been deleted by this
      // same edit — fall back to full-song practice rather than keeping a
      // dangling reference.
      const activeSegmentId = song.segments.some(
        (segment) => segment.id === current.activeSegmentId
      )
        ? current.activeSegmentId
        : null
      const { startIndex, endIndex } = resolveSegmentBounds(song, activeSegmentId)
      return {
        status: 'success',
        song,
        activeSegmentId,
        previewIndex: Math.min(Math.max(current.previewIndex, startIndex), endIndex)
      }
    })
  }, [])

  // Moving through a segment wraps back to its start once you pass its
  // end — "act identical to a shorter song," but looping instead of
  // stopping, so the same range can be practiced repeatedly. Full-song
  // navigation (no active segment) keeps its original clamped behavior.
  const stepPreview = useCallback((delta: number) => {
    setState((current) => {
      if (current.status !== 'success') return current
      const { startIndex, endIndex } = resolveSegmentBounds(current.song, current.activeSegmentId)

      if (current.activeSegmentId === null) {
        return { ...current, previewIndex: clampIndex(current.previewIndex + delta, endIndex + 1) }
      }

      const rangeLength = endIndex - startIndex + 1
      const offset = current.previewIndex - startIndex + delta
      const wrapped = ((offset % rangeLength) + rangeLength) % rangeLength
      return { ...current, previewIndex: startIndex + wrapped }
    })
  }, [])

  // Selecting a segment (or null, for the full song) jumps straight to its
  // start — a sensible entry point each time practice on it begins.
  const setActiveSegment = useCallback((segmentId: string | null) => {
    setState((current) => {
      if (current.status !== 'success') return current
      const { startIndex } = resolveSegmentBounds(current.song, segmentId)
      return { ...current, activeSegmentId: segmentId, previewIndex: startIndex }
    })
  }, [])

  return { state, importFile, loadExisting, updateSong, stepPreview, setActiveSegment }
}
