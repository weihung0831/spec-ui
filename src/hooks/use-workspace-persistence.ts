import { useEffect, useRef } from "react"
import { useWorkspaceStore } from "@/stores/workspace-store"

const STORAGE_KEY = "spec-ui:workspace"

interface PersistedWorkspace {
  projects: Array<{ id: string; name: string; path: string }>
  activeProjectId: string | null
  sidebarWidth: number
}

function loadFromStorage(): PersistedWorkspace | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as PersistedWorkspace
  } catch {
    return null
  }
}

function saveToStorage(data: PersistedWorkspace) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // Quota exceeded or private browsing — silently ignore
  }
}

/**
 * Loads workspace state from localStorage on mount,
 * and persists changes (projects, activeProjectId, sidebarWidth) on each update.
 *
 * Uses localStorage as a fallback; a future iteration can swap in
 * Tauri plugin-fs for writing to the app data directory.
 */
export function useWorkspacePersistence() {
  const store = useWorkspaceStore
  const initialized = useRef(false)

  // Load once on mount
  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    const saved = loadFromStorage()
    if (!saved) return

    const { setProjects, setActiveProject, setSidebarWidth } = store.getState()
    if (saved.projects?.length) {
      setProjects(saved.projects)
    }
    if (saved.activeProjectId) {
      setActiveProject(saved.activeProjectId)
    }
    if (typeof saved.sidebarWidth === "number" && saved.sidebarWidth > 0) {
      setSidebarWidth(saved.sidebarWidth)
    }
  }, [store])

  // Subscribe to relevant state changes and persist
  useEffect(() => {
    const unsubscribe = store.subscribe((state) => {
      saveToStorage({
        projects: state.projects,
        activeProjectId: state.activeProjectId,
        sidebarWidth: state.sidebarWidth,
      })
    })
    return unsubscribe
  }, [store])
}
