import { useCallback, useEffect, useMemo, useState } from 'react'
import { ThemeContext, type Theme } from './theme-context'

const STORAGE_KEY = 'piano-tutor:theme'

function getSystemTheme(): Theme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function getInitialTheme(): Theme {
  const stored = window.localStorage.getItem(STORAGE_KEY)
  return stored === 'light' || stored === 'dark' ? stored : getSystemTheme()
}

export function ThemeProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [theme, setTheme] = useState<Theme>(getInitialTheme)

  // The theme is resolved once in JS (stored choice, falling back to the OS
  // preference) and applied via this single `data-theme` attribute, rather
  // than duplicating token values across a `prefers-color-scheme` media
  // query in CSS — one source of truth instead of two that can drift.
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    window.localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  const toggleTheme = useCallback(() => {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'))
  }, [])

  const value = useMemo(() => ({ theme, toggleTheme }), [theme, toggleTheme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
