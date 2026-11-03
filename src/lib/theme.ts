import { useCallback, useEffect, useState } from 'react'

export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'theme'
const DARK_QUERY = '(prefers-color-scheme: dark)'
const CHANGE_EVENT = 'onevault:theme'

/**
 * Inline script for <head>: applies the theme before first paint so the page
 * never flashes. A saved choice wins; otherwise the OS setting is used.
 */
export const themeInitScript = `(function(){try{var t=localStorage.getItem('${STORAGE_KEY}');var d=t==='dark'||(t!=='light'&&window.matchMedia('${DARK_QUERY}').matches);var r=document.documentElement;r.classList.toggle('dark',d);r.style.colorScheme=d?'dark':'light';}catch(e){}})();`

function savedTheme(): Theme | null {
  const t = window.localStorage.getItem(STORAGE_KEY)
  return t === 'light' || t === 'dark' ? t : null
}

function systemTheme(): Theme {
  return window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light'
}

function applyTheme(theme: Theme) {
  const root = document.documentElement
  root.classList.toggle('dark', theme === 'dark')
  root.style.colorScheme = theme
}

/**
 * Light/dark theme. Until the user picks one, it follows the OS setting
 * (including live changes); after that, their choice is remembered.
 */
export function useTheme() {
  // null until mounted, so the server render never guesses wrong
  const [theme, setThemeState] = useState<Theme | null>(null)

  useEffect(() => {
    setThemeState(savedTheme() ?? systemTheme())

    const media = window.matchMedia(DARK_QUERY)
    const onSystemChange = () => {
      if (savedTheme()) return
      const next = systemTheme()
      applyTheme(next)
      setThemeState(next)
    }
    // Keep every switch on the page (and other tabs) in step.
    const onThemeChange = (event: Event) => {
      setThemeState((event as CustomEvent<Theme>).detail)
    }
    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return
      const next = savedTheme() ?? systemTheme()
      applyTheme(next)
      setThemeState(next)
    }

    media.addEventListener('change', onSystemChange)
    window.addEventListener(CHANGE_EVENT, onThemeChange)
    window.addEventListener('storage', onStorage)
    return () => {
      media.removeEventListener('change', onSystemChange)
      window.removeEventListener(CHANGE_EVENT, onThemeChange)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  const setTheme = useCallback((next: Theme) => {
    window.localStorage.setItem(STORAGE_KEY, next)
    applyTheme(next)
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: next }))
  }, [])

  return { theme, setTheme }
}
