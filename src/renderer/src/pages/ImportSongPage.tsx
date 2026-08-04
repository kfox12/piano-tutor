import { useCallback, useEffect, useState } from 'react'
import { useMicrophoneStream } from '../audio/useMicrophoneStream'
import { usePitchDetector } from '../audio/usePitchDetector'
import KeyboardDisplay from '../components/KeyboardDisplay'
import MicLevelMeter from '../components/MicLevelMeter'
import PitchReadout from '../components/PitchReadout'
import SongEditor from '../components/SongEditor'
import { createSegmentId, resolveSegmentBounds, type SongSegment } from '../song/song'
import { useSongAutoAdvance } from '../song/useSongAutoAdvance'
import { useSongImport } from '../song/useSongImport'
import { useSongLibrary } from '../song/useSongLibrary'

type SaveState = { status: 'idle' | 'saving' | 'saved' | 'error'; message?: string }

interface SegmentDraft {
  startEventId: string | null
  endEventId: string | null
}

const EMPTY_SEGMENT_DRAFT: SegmentDraft = { startEventId: null, endEventId: null }

interface ImportSongPageProps {
  /** Set when arriving here from a Song Library row click. */
  songIdToOpen?: string | null
  onSongIdConsumed?: () => void
}

function ImportSongPage({
  songIdToOpen = null,
  onSongIdConsumed
}: ImportSongPageProps): React.JSX.Element {
  const {
    state: songImportState,
    importFile,
    loadExisting,
    updateSong,
    stepPreview,
    setActiveSegment
  } = useSongImport()
  const { save: saveToLibrary, load: loadFromLibrary } = useSongLibrary()
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [saveState, setSaveState] = useState<SaveState>({ status: 'idle' })
  const [libraryLoadError, setLibraryLoadError] = useState<string | null>(null)
  const [segmentDraft, setSegmentDraft] = useState<SegmentDraft>(EMPTY_SEGMENT_DRAFT)
  const [segmentNameInput, setSegmentNameInput] = useState('')
  const { state: micState, start: startMic, stop: stopMic } = useMicrophoneStream()
  const analyser = micState.status === 'active' ? micState.analyser : null
  const reading = usePitchDetector(analyser)

  // As soon as a song finishes importing, start listening so the user can
  // begin playing it right away without an extra click. `startMic` is
  // idempotent, and this effect only re-fires when `status` itself changes
  // (not on every stepPreview/updateSong within an already-successful
  // import), so it won't fight a user who manually stops the mic while
  // reviewing — it only kicks in again for a genuinely new import.
  useEffect(() => {
    if (songImportState.status === 'success') {
      startMic()
    }
  }, [songImportState.status, startMic])

  // Opening a song from the library (App.tsx hands us its id) loads it
  // straight into the same review UI a fresh MIDI import lands in.
  useEffect(() => {
    if (!songIdToOpen) return
    let cancelled = false
    loadFromLibrary(songIdToOpen)
      .then((song) => {
        if (cancelled) return
        setLibraryLoadError(null)
        loadExisting(song)
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setLibraryLoadError(error instanceof Error ? error.message : 'Failed to load song')
      })
      .finally(() => {
        if (!cancelled) onSongIdConsumed?.()
      })
    return () => {
      cancelled = true
    }
  }, [songIdToOpen, loadFromLibrary, loadExisting, onSongIdConsumed])

  const currentSongEvent =
    songImportState.status === 'success'
      ? (songImportState.song.events[songImportState.previewIndex] ?? null)
      : null

  const advanceToNextEvent = useCallback(() => {
    stepPreview(1)
  }, [stepPreview])

  // Playing the currently-previewed note (or, for a chord, any one of its
  // notes) advances to the next one automatically, same immediate-advance
  // feel as Practice Mode — Prev/Next stay available for manual correction.
  // When a segment is active, stepPreview() wraps at its end instead of
  // clamping, so this same wiring loops the segment for repeated practice.
  useSongAutoAdvance(reading, currentSongEvent, advanceToNextEvent)

  const handleImportFile = async (): Promise<void> => {
    setSaveState({ status: 'idle' })
    await importFile()
  }

  const handleSaveToLibrary = async (): Promise<void> => {
    if (songImportState.status !== 'success') return
    setSaveState({ status: 'saving' })
    try {
      const saved = await saveToLibrary(songImportState.song)
      updateSong(saved)
      setSaveState({ status: 'saved' })
    } catch (error) {
      setSaveState({
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to save song'
      })
    }
  }

  const handleMarkSegmentStart = (): void => {
    if (!currentSongEvent) return
    setSegmentDraft((draft) => ({ ...draft, startEventId: currentSongEvent.id }))
  }

  const handleMarkSegmentEnd = (): void => {
    if (!currentSongEvent) return
    setSegmentDraft((draft) => ({ ...draft, endEventId: currentSongEvent.id }))
  }

  const handleSaveSegment = (): void => {
    if (songImportState.status !== 'success') return
    const { startEventId, endEventId } = segmentDraft
    if (!startEventId || !endEventId) return

    const { events, segments } = songImportState.song
    const startIndex = events.findIndex((event) => event.id === startEventId)
    const endIndex = events.findIndex((event) => event.id === endEventId)
    if (startIndex === -1 || endIndex === -1) return

    // Marking end before start (navigating backward between the two marks)
    // is a valid way to select a range — just swap so it's stored in order.
    const [lowId, highId] =
      startIndex <= endIndex ? [startEventId, endEventId] : [endEventId, startEventId]

    const newSegment: SongSegment = {
      id: createSegmentId(),
      name: segmentNameInput.trim() || `Segment ${segments.length + 1}`,
      startEventId: lowId,
      endEventId: highId
    }
    updateSong({ ...songImportState.song, segments: [...segments, newSegment] })
    setSegmentDraft(EMPTY_SEGMENT_DRAFT)
    setSegmentNameInput('')
  }

  const handleDeleteSegment = (segmentId: string): void => {
    if (songImportState.status !== 'success') return
    updateSong({
      ...songImportState.song,
      segments: songImportState.song.segments.filter((segment) => segment.id !== segmentId)
    })
  }

  const activeSegmentId =
    songImportState.status === 'success' ? songImportState.activeSegmentId : null
  const isSegmentActive = activeSegmentId !== null
  const activeSegment =
    songImportState.status === 'success'
      ? (songImportState.song.segments.find((segment) => segment.id === activeSegmentId) ?? null)
      : null

  const { startIndex: rangeStart, endIndex: rangeEnd } =
    songImportState.status === 'success'
      ? resolveSegmentBounds(songImportState.song, activeSegmentId)
      : { startIndex: 0, endIndex: 0 }
  const rangeLength = rangeEnd - rangeStart + 1
  const positionInRange =
    songImportState.status === 'success' ? songImportState.previewIndex - rangeStart + 1 : 0

  return (
    <div className="import-page">
      <h1 className="page-title">Import Song</h1>
      <button
        type="button"
        onClick={handleImportFile}
        disabled={songImportState.status === 'importing'}
      >
        Import MIDI File…
      </button>
      {songImportState.status === 'error' && <p className="tip">{songImportState.message}</p>}
      {libraryLoadError && <p className="tip">{libraryLoadError}</p>}
      {songImportState.status === 'success' && (
        <div className="song-review">
          <p className="tip">{songImportState.song.title}</p>
          {activeSegment && <p className="tip">Practicing segment: {activeSegment.name} (loops)</p>}
          <MicLevelMeter state={micState} start={startMic} stop={stopMic} />
          <PitchReadout reading={reading} />
          <KeyboardDisplay
            currentReading={reading}
            targetNotes={currentSongEvent ? currentSongEvent.notes : []}
            // Manual click-to-target is disabled during song preview, same
            // as during a practice session — a click can't reach what's
            // actually controlling the display.
            onKeyClick={() => {}}
          />
          <div className="song-review__nav">
            <button
              type="button"
              onClick={() => stepPreview(-1)}
              disabled={!isSegmentActive && songImportState.previewIndex <= 0}
            >
              ← Previous
            </button>
            <span className="tip">
              Note {songImportState.song.events.length === 0 ? 0 : positionInRange} of {rangeLength}
            </span>
            <button
              type="button"
              onClick={() => stepPreview(1)}
              disabled={
                !isSegmentActive &&
                songImportState.previewIndex >= songImportState.song.events.length - 1
              }
            >
              Next →
            </button>
          </div>
          <button type="button" onClick={() => setIsEditorOpen((open) => !open)}>
            {isEditorOpen ? 'Hide Notes' : 'Edit Notes'}
          </button>
          {isEditorOpen && <SongEditor song={songImportState.song} onChange={updateSong} />}
          <button
            type="button"
            onClick={handleSaveToLibrary}
            disabled={saveState.status === 'saving'}
          >
            {songImportState.song.songId ? 'Update in Library' : 'Save to Library'}
          </button>
          {saveState.status === 'saved' && <p className="tip">Saved.</p>}
          {saveState.status === 'error' && <p className="tip">{saveState.message}</p>}

          <div className="segment-tools">
            <h2 className="segment-tools__title">Practice Segments</h2>

            {songImportState.song.segments.length > 0 && (
              <ul className="segment-list">
                {songImportState.song.segments.map((segment) => (
                  <li key={segment.id} className="segment-list__row">
                    <button
                      type="button"
                      className="segment-list__practice"
                      onClick={() => setActiveSegment(segment.id)}
                      disabled={segment.id === activeSegmentId}
                    >
                      {segment.name}
                    </button>
                    <button
                      type="button"
                      className="segment-list__delete"
                      onClick={() => handleDeleteSegment(segment.id)}
                      aria-label={`Delete segment ${segment.name}`}
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {isSegmentActive && (
              <button type="button" onClick={() => setActiveSegment(null)}>
                Exit Segment — Practice Full Song
              </button>
            )}

            <div className="segment-draft">
              <button type="button" onClick={handleMarkSegmentStart}>
                {segmentDraft.startEventId ? 'Start Marked ✓' : 'Mark Segment Start'}
              </button>
              <button type="button" onClick={handleMarkSegmentEnd}>
                {segmentDraft.endEventId ? 'End Marked ✓' : 'Mark Segment End'}
              </button>
              {segmentDraft.startEventId && segmentDraft.endEventId && (
                <>
                  <input
                    type="text"
                    placeholder="Segment name"
                    value={segmentNameInput}
                    onChange={(event) => setSegmentNameInput(event.target.value)}
                  />
                  <button type="button" onClick={handleSaveSegment}>
                    Save Segment
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ImportSongPage
