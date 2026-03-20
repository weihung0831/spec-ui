import { create } from "zustand"

export type PreviewMode = "split" | "editor-only" | "preview-only"

interface FileState {
  content: string
  originalContent: string
}

interface EditorState {
  openFiles: Record<string, FileState>
  activeFileId: string | null
  previewMode: PreviewMode
  /** Ordered list of open file paths (tab order) */
  openTabs: string[]

  // Actions
  openFile: (path: string, content: string) => void
  closeFile: (path: string) => void
  updateContent: (path: string, content: string) => void
  markSaved: (path: string) => void
  setPreviewMode: (mode: PreviewMode) => void
  cyclePreviewMode: () => void
  addTab: (path: string) => void
  closeTab: (path: string) => void
  reorderTabs: (fromIndex: number, toIndex: number) => void

  // Derived helpers (returns value directly, not reactive)
  isUnsaved: (path: string) => boolean
  getContent: (path: string) => string | null
}

const PREVIEW_CYCLE: PreviewMode[] = ["split", "editor-only", "preview-only"]

export const useEditorStore = create<EditorState>((set, get) => ({
  openFiles: {},
  activeFileId: null,
  previewMode: "split",
  openTabs: [],

  openFile: (path, content) =>
    set((state) => {
      const tabs = state.openTabs.includes(path)
        ? state.openTabs
        : [...state.openTabs, path]
      return {
        openFiles: {
          ...state.openFiles,
          [path]: { content, originalContent: content },
        },
        activeFileId: path,
        openTabs: tabs,
      }
    }),

  closeFile: (path) =>
    set((state) => {
      const { [path]: _removed, ...rest } = state.openFiles
      const tabs = state.openTabs.filter((t) => t !== path)
      const newActive = state.activeFileId === path
        ? (tabs[tabs.length - 1] ?? null)
        : state.activeFileId
      return {
        openFiles: rest,
        activeFileId: newActive,
        openTabs: tabs,
      }
    }),

  updateContent: (path, content) =>
    set((state) => {
      const existing = state.openFiles[path]
      if (!existing) return state
      return {
        openFiles: {
          ...state.openFiles,
          [path]: { ...existing, content },
        },
      }
    }),

  markSaved: (path) =>
    set((state) => {
      const existing = state.openFiles[path]
      if (!existing) return state
      return {
        openFiles: {
          ...state.openFiles,
          [path]: { ...existing, originalContent: existing.content },
        },
      }
    }),

  setPreviewMode: (mode) => set({ previewMode: mode }),

  cyclePreviewMode: () =>
    set((state) => {
      const idx = PREVIEW_CYCLE.indexOf(state.previewMode)
      const next = PREVIEW_CYCLE[(idx + 1) % PREVIEW_CYCLE.length]
      return { previewMode: next }
    }),

  addTab: (path) =>
    set((state) => ({
      openTabs: state.openTabs.includes(path) ? state.openTabs : [...state.openTabs, path],
      activeFileId: path,
    })),

  closeTab: (path) =>
    set((state) => {
      const tabs = state.openTabs.filter((t) => t !== path)
      const { [path]: _removed, ...rest } = state.openFiles
      const newActive = state.activeFileId === path
        ? (tabs[tabs.length - 1] ?? null)
        : state.activeFileId
      return {
        openTabs: tabs,
        openFiles: rest,
        activeFileId: newActive,
      }
    }),

  reorderTabs: (fromIndex, toIndex) =>
    set((state) => {
      const tabs = [...state.openTabs]
      const [moved] = tabs.splice(fromIndex, 1)
      tabs.splice(toIndex, 0, moved)
      return { openTabs: tabs }
    }),

  isUnsaved: (path) => {
    const file = get().openFiles[path]
    if (!file) return false
    return file.content !== file.originalContent
  },

  getContent: (path) => get().openFiles[path]?.content ?? null,
}))
