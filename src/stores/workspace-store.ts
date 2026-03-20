import { create } from "zustand"
import type { FileNode } from "@/types/file-types"

export interface ProjectInfo {
  id: string
  name: string
  path: string
}

interface WorkspaceState {
  projects: ProjectInfo[]
  activeProjectId: string | null
  fileTree: FileNode[]
  /** Serialized as string[] for Zustand compatibility (represents Set<string>) */
  expandedDirs: string[]
  selectedFilePath: string | null
  sidebarWidth: number
  sidebarCollapsed: boolean

  // Existing actions
  setProjects: (projects: ProjectInfo[]) => void
  setActiveProject: (projectId: string) => void
  setFileTree: (tree: FileNode[]) => void

  // New CRUD actions
  addProject: (path: string) => void
  removeProject: (id: string) => void
  toggleDir: (path: string) => void
  selectFile: (path: string | null) => void
  setSidebarWidth: (width: number) => void
  setSidebarCollapsed: (collapsed: boolean) => void
}

/** Simple hash function for generating stable IDs from paths */
function hashPath(path: string): string {
  let hash = 0
  for (let i = 0; i < path.length; i++) {
    const char = path.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36)
}

/** Extract folder name from a file path */
function folderNameFromPath(path: string): string {
  const normalized = path.replace(/\\/g, "/").replace(/\/$/, "")
  return normalized.split("/").pop() ?? path
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  projects: [],
  activeProjectId: null,
  fileTree: [],
  expandedDirs: [],
  selectedFilePath: null,
  sidebarWidth: 280,
  sidebarCollapsed: false,

  setProjects: (projects) => set({ projects }),
  setActiveProject: (projectId) => set({ activeProjectId: projectId }),
  setFileTree: (tree) => set({ fileTree: tree }),

  addProject: (path: string) => {
    const { projects } = get()
    const id = hashPath(path)
    // Avoid duplicates
    if (projects.some((p) => p.path === path)) return
    const name = folderNameFromPath(path)
    const newProject: ProjectInfo = { id, name, path }
    set({
      projects: [...projects, newProject],
      activeProjectId: id,
    })
  },

  removeProject: (id: string) => {
    const { projects, activeProjectId } = get()
    const remaining = projects.filter((p) => p.id !== id)
    const newActive =
      activeProjectId === id
        ? (remaining[0]?.id ?? null)
        : activeProjectId
    set({
      projects: remaining,
      activeProjectId: newActive,
      fileTree: remaining.length === 0 ? [] : get().fileTree,
    })
  },

  toggleDir: (path: string) => {
    const { expandedDirs } = get()
    const isExpanded = expandedDirs.includes(path)
    set({
      expandedDirs: isExpanded
        ? expandedDirs.filter((d) => d !== path)
        : [...expandedDirs, path],
    })
  },

  selectFile: (path: string | null) => set({ selectedFilePath: path }),

  setSidebarWidth: (width: number) => set({ sidebarWidth: width }),

  setSidebarCollapsed: (collapsed: boolean) => set({ sidebarCollapsed: collapsed }),
}))
