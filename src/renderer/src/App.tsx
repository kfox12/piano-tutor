import { useState } from 'react'
import AppShell from './layout/AppShell'
import type { View } from './navigation'
import HomePage from './pages/HomePage'
import ImportSongPage from './pages/ImportSongPage'
import PracticeModePage from './pages/PracticeModePage'
import SongLibraryPage from './pages/SongLibraryPage'
import TestModePage from './pages/TestModePage'
import { ThemeProvider } from './theme/ThemeContext'

function App(): React.JSX.Element {
  const [view, setView] = useState<View>('home')
  // Set when a Song Library row is opened, so Import Song (each page
  // otherwise owns fully independent state) knows which saved song to load.
  const [songIdToOpen, setSongIdToOpen] = useState<string | null>(null)

  const openSongFromLibrary = (songId: string): void => {
    setSongIdToOpen(songId)
    setView('import')
  }

  return (
    <ThemeProvider>
      <AppShell view={view} onNavigate={setView}>
        {view === 'home' && <HomePage onNavigate={setView} />}
        {view === 'import' && (
          <ImportSongPage
            songIdToOpen={songIdToOpen}
            onSongIdConsumed={() => setSongIdToOpen(null)}
          />
        )}
        {view === 'library' && <SongLibraryPage onOpenSong={openSongFromLibrary} />}
        {view === 'practice' && <PracticeModePage />}
        {view === 'test' && <TestModePage />}
      </AppShell>
    </ThemeProvider>
  )
}

export default App
