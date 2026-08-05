import { useEffect } from 'react'
import { useSongLibrary } from '../song/useSongLibrary'

interface SongLibraryPageProps {
  onOpenSong: (songId: string) => void
}

function SongLibraryPage({ onOpenSong }: SongLibraryPageProps): React.JSX.Element {
  const { listState, refresh, remove } = useSongLibrary()

  useEffect(() => {
    refresh()
  }, [refresh])

  const handleDelete = async (event: React.MouseEvent, songId: string): Promise<void> => {
    event.stopPropagation()
    await remove(songId)
    refresh()
  }

  return (
    <div className="library-page">
      <h1 className="page-title">Song Library</h1>

      {listState.status === 'loading' && <p className="tip">Loading…</p>}
      {listState.status === 'error' && <p className="tip">{listState.message}</p>}
      {listState.status === 'loaded' && listState.songs.length === 0 && (
        <p className="tip">No saved songs yet — import one and save it to see it here.</p>
      )}

      {listState.status === 'loaded' && listState.songs.length > 0 && (
        <ul className="song-library__list">
          {listState.songs.map((song) => (
            <li key={song.songId} className="song-library__row">
              <button
                type="button"
                className="song-library__row-open"
                onClick={() => onOpenSong(song.songId)}
              >
                <span className="song-library__row-title">{song.title}</span>
                <span className="song-library__row-meta">{song.eventCount} notes</span>
              </button>
              <button
                type="button"
                className="song-library__row-delete"
                onClick={(event) => handleDelete(event, song.songId)}
                aria-label={`Delete ${song.title}`}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default SongLibraryPage
