import type { ReactNode } from 'react'
import type { View } from '../navigation'
import ThemeToggle from './ThemeToggle'
import TopNav from './TopNav'
import Versions from '../components/Versions'

interface AppShellProps {
  view: View
  onNavigate: (view: View) => void
  children: ReactNode
}

// The nav bar itself only appears once the user has picked a mode — the
// home page stays a clean, uncluttered landing screen (per the redesign
// spec). It still gets a minimal bar so the theme toggle is always reachable.
function AppShell({ view, onNavigate, children }: AppShellProps): React.JSX.Element {
  return (
    <div className="app-shell">
      {view === 'home' ? (
        <div className="top-nav top-nav--minimal">
          <span className="top-nav__brand">Piano Tutor</span>
          <ThemeToggle />
        </div>
      ) : (
        <TopNav current={view} onNavigate={onNavigate} />
      )}
      <main className="app-content">{children}</main>
      <Versions />
    </div>
  )
}

export default AppShell
