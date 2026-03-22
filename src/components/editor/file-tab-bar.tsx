import { useRef } from "react"
import { useEditorStore } from "@/stores/editor-store"
import { useSpecAnalyzerStore } from "@/stores/spec-analyzer-store"
import { useWorkspaceStore } from "@/stores/workspace-store"
import { closeTabAndSelect } from "@/hooks/use-close-tab-and-select"
import { FileTab } from "@/components/editor/file-tab"

/**
 * Horizontal scrollable tab bar showing all open file tabs.
 * Active tab is highlighted. Tabs beyond viewport scroll horizontally.
 */
export function FileTabBar() {
  const openTabs = useEditorStore((s) => s.openTabs)
  const activeFileId = useEditorStore((s) => s.activeFileId)
  const openFiles = useEditorStore((s) => s.openFiles)
  const openFile = useEditorStore((s) => s.openFile)
  const scrollRef = useRef<HTMLDivElement>(null)

  const analyzerReport = useSpecAnalyzerStore((s) => s.report)

  if (openTabs.length === 0) return null

  const handleTabClick = (path: string) => {
    const fileState = openFiles[path]
    if (fileState) {
      openFile(path, fileState.content)
    }
    useWorkspaceStore.getState().selectFile(path)
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
      {openTabs.map((path) => {
        const tabLabel = (analyzerReport?.specFile === path && analyzerReport?.specTitle) ? analyzerReport.specTitle : undefined
        return (
        <FileTab
          key={path}
          filePath={path}
          label={tabLabel}
          isActive={path === activeFileId}
          isUnsaved={isUnsaved(path)}
          onClick={() => handleTabClick(path)}
          onClose={() => closeTabAndSelect(path)}
        />
      )})}
    </div>
  )
}
