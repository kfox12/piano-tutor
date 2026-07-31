import { NOTE_NAMES, noteToMidi } from '../song/noteMath'
import { createEventId, type Song, type SongEvent } from '../song/song'

interface SongEditorProps {
  song: Song
  onChange: (song: Song) => void
}

const DEFAULT_NOTE = { midi: 60, name: 'C', octave: 4 }
const OCTAVE_OPTIONS = Array.from({ length: 9 }, (_, octave) => octave) // 0-8

function SongEditor({ song, onChange }: SongEditorProps): React.JSX.Element {
  const updateEvents = (events: SongEvent[]): void => {
    onChange({ ...song, events })
  }

  const handleAddEvent = (): void => {
    updateEvents([...song.events, { id: createEventId(), notes: [{ ...DEFAULT_NOTE }] }])
  }

  const handleDeleteEvent = (eventId: string): void => {
    updateEvents(song.events.filter((event) => event.id !== eventId))
  }

  const handleAddNoteToChord = (eventId: string): void => {
    updateEvents(
      song.events.map((event) =>
        event.id === eventId ? { ...event, notes: [...event.notes, { ...DEFAULT_NOTE }] } : event
      )
    )
  }

  const handleDeleteNote = (eventId: string, noteIndex: number): void => {
    const event = song.events.find((candidate) => candidate.id === eventId)
    if (!event) return
    if (event.notes.length <= 1) {
      handleDeleteEvent(eventId)
      return
    }
    const notes = event.notes.filter((_, index) => index !== noteIndex)
    updateEvents(
      song.events.map((candidate) => (candidate.id === eventId ? { ...event, notes } : candidate))
    )
  }

  const handleChangePitch = (
    eventId: string,
    noteIndex: number,
    name: string,
    octave: number
  ): void => {
    const midi = noteToMidi(name, octave)
    updateEvents(
      song.events.map((event) =>
        event.id === eventId
          ? {
              ...event,
              notes: event.notes.map((note, index) =>
                index === noteIndex ? { midi, name, octave } : note
              )
            }
          : event
      )
    )
  }

  return (
    <div className="song-editor">
      <h2>{song.title}</h2>
      <ol className="song-editor__events">
        {song.events.map((event, eventIndex) => (
          <li key={event.id} className="song-editor__event">
            <span className="song-editor__index">{eventIndex + 1}.</span>
            {event.notes.map((note, noteIndex) => (
              <span key={`${event.id}-${noteIndex}`} className="song-editor__note">
                <select
                  aria-label={`Event ${eventIndex + 1} note ${noteIndex + 1} name`}
                  value={note.name}
                  onChange={(event_) =>
                    handleChangePitch(event.id, noteIndex, event_.target.value, note.octave)
                  }
                >
                  {NOTE_NAMES.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
                <select
                  aria-label={`Event ${eventIndex + 1} note ${noteIndex + 1} octave`}
                  value={note.octave}
                  onChange={(event_) =>
                    handleChangePitch(event.id, noteIndex, note.name, Number(event_.target.value))
                  }
                >
                  {OCTAVE_OPTIONS.map((octave) => (
                    <option key={octave} value={octave}>
                      {octave}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  aria-label={`Delete note ${note.name}${note.octave} from event ${eventIndex + 1}`}
                  onClick={() => handleDeleteNote(event.id, noteIndex)}
                >
                  ✕
                </button>
              </span>
            ))}
            <button type="button" onClick={() => handleAddNoteToChord(event.id)}>
              + Note
            </button>
            <button type="button" onClick={() => handleDeleteEvent(event.id)}>
              Delete
            </button>
          </li>
        ))}
      </ol>
      <button type="button" onClick={handleAddEvent}>
        + Add Note
      </button>
    </div>
  )
}

export default SongEditor
