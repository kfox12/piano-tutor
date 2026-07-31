import { useState } from 'react'
import { useMicrophoneStream } from './audio/useMicrophoneStream'
import { usePitchDetector } from './audio/usePitchDetector'
import KeyboardDisplay from './components/KeyboardDisplay'
import MicLevelMeter from './components/MicLevelMeter'
import PitchReadout from './components/PitchReadout'
import PracticeSession from './components/PracticeSession'
import SongEditor from './components/SongEditor'
import Versions from './components/Versions'
import { notesMatch, type TargetNote } from './keyboard/deriveKeyStates'
import { usePracticeSession } from './practice/usePracticeSession'
import { useSongImport } from './song/useSongImport'

function App(): React.JSX.Element {
  const { state, start, stop } = useMicrophoneStream()
  const analyser = state.status === 'active' ? state.analyser : null
  const reading = usePitchDetector(analyser)
  const [manualTarget, setManualTarget] = useState<TargetNote | null>(null)
  const {
    state: sessionState,
    start: startSession,
    stop: stopSession
  } = usePracticeSession(reading)
  const { state: songImportState, importFile, updateSong, stepPreview } = useSongImport()
  const [isEditorOpen, setIsEditorOpen] = useState(false)

  const currentSongEvent =
    songImportState.status === 'success'
      ? (songImportState.song.events[songImportState.previewIndex] ?? null)
      : null

  // Priority: an active practice session's target wins, then the note currently
  // being previewed from an imported song, then a manually clicked key.
  const targetNotes: TargetNote[] =
    sessionState.status === 'awaiting-note'
      ? [sessionState.target]
      : currentSongEvent
        ? currentSongEvent.notes
        : manualTarget
          ? [manualTarget]
          : []

  const handleKeyClick = (note: TargetNote): void => {
    if (sessionState.status === 'awaiting-note' || songImportState.status === 'success') return
    setManualTarget((current) => (current && notesMatch(current, note) ? null : note))
  }

  return (
    <>
      <h1>Piano Tutor</h1>
      <MicLevelMeter state={state} start={start} stop={stop} />
      <PitchReadout reading={reading} />
      <PracticeSession
        state={sessionState}
        start={startSession}
        stop={stopSession}
        micActive={state.status === 'active'}
      />
      <KeyboardDisplay
        currentReading={reading}
        targetNotes={targetNotes}
        onKeyClick={handleKeyClick}
      />
      <div className="song-import">
        <button
          type="button"
          onClick={importFile}
          disabled={songImportState.status === 'importing'}
        >
          Import MIDI File…
        </button>
        {songImportState.status === 'error' && <p className="tip">{songImportState.message}</p>}
        {songImportState.status === 'success' && (
          <div className="song-review">
            <p className="tip">{songImportState.song.title}</p>
            <div className="song-review__nav">
              <button
                type="button"
                onClick={() => stepPreview(-1)}
                disabled={songImportState.previewIndex <= 0}
              >
                ← Previous
              </button>
              <span className="tip">
                Note{' '}
                {songImportState.song.events.length === 0 ? 0 : songImportState.previewIndex + 1} of{' '}
                {songImportState.song.events.length}
              </span>
              <button
                type="button"
                onClick={() => stepPreview(1)}
                disabled={songImportState.previewIndex >= songImportState.song.events.length - 1}
              >
                Next →
              </button>
            </div>
            <button type="button" onClick={() => setIsEditorOpen((open) => !open)}>
              {isEditorOpen ? 'Hide Notes' : 'Edit Notes'}
            </button>
            {isEditorOpen && <SongEditor song={songImportState.song} onChange={updateSong} />}
          </div>
        )}
      </div>
      <Versions></Versions>
    </>
  )
}

export default App
