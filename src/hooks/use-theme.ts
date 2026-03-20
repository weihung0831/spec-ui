import { useEffect } from "react"
import { useSettingsStore, type Theme } from "@/stores/settings-store"

const STORAGE_KEY = "spec-ui-theme"

/** Resolves 'system' to actual 'light' or 'dark' */
function resolveTheme(theme: Theme): "light" | "dark" {
  if (theme !== "system") return theme
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

function applyTheme(theme: Theme) {
  const resolved = resolveTheme(theme)
  const root = document.documentElement
  if (resolved === "dark") {
    root.classList.add("dark")
  } else {
    root.classList.remove("dark")
  }
}

/**
 * Manages theme state: persists to localStorage, applies dark class to <html>.
 * Call once near the app root to initialize from stored preference.
 */
export function useTheme() {
  const theme = useSettingsStore((s) => s.theme)
  const setTheme = useSettingsStore((s) => s.setTheme)

  // Initialize from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null
    if (stored && ["light", "dark", "system"].includes(stored)) {
      setTheme(stored)
      applyTheme(stored)
    } else {
      applyTheme(theme)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Apply theme whenever it changes
  useEffect(() => {
    applyTheme(theme)
    localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  // Listen for system preference changes when theme is 'system'
  useEffect(() => {
    if (theme !== "system") return
    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    const handler = () => applyTheme("system")
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [theme])

  const toggleTheme = () => {
    const resolved = resolveTheme(theme)
    setTheme(resolved === "dark" ? "light" : "dark")
  }

  return { theme, setTheme, toggleTheme, resolvedTheme: resolveTheme(theme) }
}
