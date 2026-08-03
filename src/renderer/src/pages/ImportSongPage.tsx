import { useEffect, useState } from 'react'
import { useMicrophoneStream } from '../audio/useMicrophoneStream'
import { usePitchDetector } from '../audio/usePitchDetector'
import KeyboardDisplay from '../components/KeyboardDisplay'
import MicLevelMeter from '../components/MicLevelMeter'
import PitchReadout from '../components/PitchReadout'
import SongEditor from '../components/SongEditor'
import { useSongImport } from '../song/useSongImport'

function ImportSongPage(): React.JSX.Element {
  const { state: songImportState, importFile, updateSong, stepPreview } = useSongImport()
  const [isEditorOpen, setIsEditorOpen] = useState(false)
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

  const currentSongEvent =
    songImportState.status === 'success'
      ? (songImportState.song.events[songImportState.previewIndex] ?? null)
      : null

  return (
    <div className="import-page">
      <h1 className="page-title">Import Song</h1>
      <button type="button" onClick={importFile} disabled={songImportState.status === 'importing'}>
        Import MIDI File…
      </button>
      {songImportState.status === 'error' && <p className="tip">{songImportState.message}</p>}
      {songImportState.status === 'success' && (
        <div className="song-review">
          <p className="tip">{songImportState.song.title}</p>
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
              disabled={songImportState.previewIndex <= 0}
            >
              ← Previous
            </button>
            <span className="tip">
              Note {songImportState.song.events.length === 0 ? 0 : songImportState.previewIndex + 1}{' '}
              of {songImportState.song.events.length}
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
  )
}

export default ImportSongPage
