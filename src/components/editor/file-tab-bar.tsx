import { useRef } from "react"
import { useEditorStore } from "@/stores/editor-store"
import { FileTab } from "@/components/editor/file-tab"

/**
 * Horizontal scrollable tab bar showing all open file tabs.
 * Active tab is highlighted. Tabs beyond viewport scroll horizontally.
 */
export function FileTabBar() {
  const openTabs = useEditorStore((s) => s.openTabs)
  const activeFileId = useEditorStore((s) => s.activeFileId)
  const closeTab = useEditorStore((s) => s.closeTab)
  const openFiles = useEditorStore((s) => s.openFiles)
  const openFile = useEditorStore((s) => s.openFile)
  const scrollRef = useRef<HTMLDivElement>(null)

  if (openTabs.length === 0) return null

  const handleTabClick = (path: string) => {
    const fileState = openFiles[path]
    if (fileState) {
      // Re-activate by setting activeFileId via openFile (keeps content)
      openFile(path, fileState.content)
    }
  }

  const isUnsaved = (path: string) => {
    const f = openFiles[path]
    if (!f) return false
    return f.content !== f.originalContent
  }

  return (
    <div
      ref={scrollRef}
      className="flex overflow-x-auto overflow-y-hidden border-b border-border bg-muted/20 shrink-0 scrollbar-none"
      style={{ scrollbarWidth: "none" }}
      role="tablist"
      aria-label="Open files"
    >
      {openTabs.map((path) => (
        <FileTab
          key={path}
          filePath={path}
          isActive={path === activeFileId}
          isUnsaved={isUnsaved(path)}
          onClick={() => handleTabClick(path)}
          onClose={() => closeTab(path)}
        />
      ))}
    </div>
  )
}
