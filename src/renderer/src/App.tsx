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
  const { state: songImportState, importFile, updateSong } = useSongImport()

  const targetNote = sessionState.status === 'awaiting-note' ? sessionState.target : manualTarget

  const handleKeyClick = (note: TargetNote): void => {
    if (sessionState.status === 'awaiting-note') return
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
        targetNote={targetNote}
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
          <SongEditor song={songImportState.song} onChange={updateSong} />
        )}
      </div>
      <Versions></Versions>
    </>
  )
}

export default App
