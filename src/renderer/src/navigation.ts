export type View = 'home' | 'import' | 'library' | 'practice' | 'test'

export interface NavItem {
  id: View
  label: string
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'Home' },
  { id: 'import', label: 'Import Song' },
  { id: 'library', label: 'Song Library' },
  { id: 'practice', label: 'Practice Mode' },
  { id: 'test', label: 'Test Mode' }
]
