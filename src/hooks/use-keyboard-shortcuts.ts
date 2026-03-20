import { useEffect } from "react"
import { useFileOperations } from "@/hooks/use-file-operations"
import { useEditorStore } from "@/stores/editor-store"
import { useWorkspaceStore } from "@/stores/workspace-store"

const isMac = typeof navigator !== "undefined" && /mac/i.test(navigator.platform)

/** Shortcut registry entry for display in settings */
export interface ShortcutEntry {
  key: string
  /** Fallback English label */
  label: string
  /** i18n translation key */
  i18nKey: string
  displayKey: string
}

/** Keyboard shortcut registry — used for display in settings page */
export const SHORTCUT_REGISTRY: ShortcutEntry[] = [
  { key: "cmd+s", label: "Save file", i18nKey: "shortcuts.saveFile", displayKey: "⌘S / Ctrl+S" },
  { key: "cmd+\\", label: "Cycle preview mode", i18nKey: "shortcuts.cyclePreview", displayKey: "⌘\\ / Ctrl+\\" },
  { key: "cmd+b", label: "Toggle sidebar", i18nKey: "shortcuts.toggleSidebar", displayKey: "⌘B / Ctrl+B" },
  { key: "cmd+w", label: "Close current tab", i18nKey: "shortcuts.closeTab", displayKey: "⌘W / Ctrl+W" },
]

/**
 * Global keyboard shortcut handler for the editor.
 * - Cmd/Ctrl+S: manual save active file
 * - Cmd/Ctrl+\: cycle preview mode
 * - Cmd/Ctrl+B: toggle sidebar
 * - Cmd/Ctrl+W: close active tab
 * - Cmd/Ctrl+F: focus search (no-op placeholder — search panel handles its own focus)
 */
export function useKeyboardShortcuts() {
  const { writeFile } = useFileOperations()
  const cyclePreviewMode = useEditorStore((s) => s.cyclePreviewMode)
  const markSaved = useEditorStore((s) => s.markSaved)
  const closeTab = useEditorStore((s) => s.closeTab)
  const setSidebarCollapsed = useWorkspaceStore((s) => s.setSidebarCollapsed)
  const sidebarCollapsed = useWorkspaceStore((s) => s.sidebarCollapsed)

  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      const mod = isMac ? e.metaKey : e.ctrlKey

      if (mod && e.key === "s") {
        e.preventDefault()
        const { activeFileId, openFiles } = useEditorStore.getState()
        if (!activeFileId) return
        const file = openFiles[activeFileId]
        if (!file) return
        try {
          await writeFile(activeFileId, file.content)
          markSaved(activeFileId)
        } catch (err) {
          console.error("[keyboard-save] write failed:", err)
        }
        return
      }

      if (mod && e.key === "\\") {
        e.preventDefault()
        cyclePreviewMode()
        return
      }

      if (mod && e.key === "b") {
        e.preventDefault()
        setSidebarCollapsed(!sidebarCollapsed)
        return
      }

      if (mod && e.key === "w") {
        e.preventDefault()
        const { activeFileId } = useEditorStore.getState()
        if (activeFileId) closeTab(activeFileId)
        return
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [writeFile, cyclePreviewMode, markSaved, closeTab, setSidebarCollapsed, sidebarCollapsed])
}
