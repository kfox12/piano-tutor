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

  return (
    <ThemeProvider>
      <AppShell view={view} onNavigate={setView}>
        {view === 'home' && <HomePage onNavigate={setView} />}
        {view === 'import' && <ImportSongPage />}
        {view === 'library' && <SongLibraryPage />}
        {view === 'practice' && <PracticeModePage />}
        {view === 'test' && <TestModePage />}
      </AppShell>
    </ThemeProvider>
  )
}

export default App
