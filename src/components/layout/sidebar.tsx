import { useCallback, useEffect, useRef, useState } from "react"
import { FileSearch, Files, Maximize2, Minimize2, PanelLeftClose, PanelLeftOpen, Pin, PinOff, RefreshCw, Search, Settings } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { ProjectSelector } from "@/components/workspace/project-selector"
import { FileTree } from "@/components/file-tree/file-tree"
import { SearchPanel } from "@/components/search/search-panel"
import { AnalysisHistoryPanel } from "@/components/spec-analyzer/analysis-history-panel"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import { useWorkspaceStore } from "@/stores/workspace-store"
import { useEditorStore } from "@/stores/editor-store"
import { useFileWatcher } from "@/hooks/use-file-watcher"
import { useFileOperations } from "@/hooks/use-file-operations"
import { enterCompactMode, exitCompactMode, toggleAlwaysOnTop } from "@/hooks/use-compact-window"
import { closeTabAndSelect } from "@/hooks/use-close-tab-and-select"

type SidebarTab = "files" | "search" | "analysis"

/**
 * Sidebar container: project selector at top, file tree below.
 * Collapse button toggles sidebar visibility.
 */
export function Sidebar() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const sidebarCollapsed = useWorkspaceStore((s) => s.sidebarCollapsed)
  const setSidebarCollapsed = useWorkspaceStore((s) => s.setSidebarCollapsed)
  const activeProjectId = useWorkspaceStore((s) => s.activeProjectId)
  const projects = useWorkspaceStore((s) => s.projects)
  const isCompact = useWorkspaceStore((s) => s.isCompactWindow)
  const isPinned = useWorkspaceStore((s) => s.isPinned)
  const { startWatching, stopWatching } = useFileOperations()
  const [activeTab, setActiveTab] = useState<SidebarTab>("files")
  const refreshRef = useRef<(() => void) | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const handleRefreshReady = useCallback((fn: () => void) => { refreshRef.current = fn }, [])

  // Start/stop file watcher when active project changes
  useEffect(() => {
    if (!activeProjectId) return
    const project = projects.find((p) => p.id === activeProjectId)
    if (!project) return

    startWatching(project.path).catch((err) =>
      console.warn("[file-watcher] failed to start:", err)
    )

    return () => {
      stopWatching(project.path).catch(() => {})
    }
  }, [activeProjectId])

  const handleRefresh = () => {
    setIsRefreshing(true)
    refreshRef.current?.()
    setTimeout(() => setIsRefreshing(false), 600)
  }

  /** Close a deleted file's tab and clear selection if it was active */
  const closeDeletedFile = useCallback((filePath: string) => {
    closeTabAndSelect(filePath)
    refreshRef.current?.()
  }, [])

  // Auto-refresh file tree & close tabs on external file changes
  useFileWatcher({
    onCreateOrDelete: useCallback((payload: { eventType: string; path: string }) => {
      refreshRef.current?.()
      if (payload.eventType === "remove") {
        const openTabs = useEditorStore.getState().openTabs
        if (openTabs.includes(payload.path)) {
          closeDeletedFile(payload.path)
        }
      }
    }, [closeDeletedFile]),
  })

  // Fallback: periodically check if open files still exist (handles macOS edge cases)
  const { getFileMetadata } = useFileOperations()
  useEffect(() => {
    const interval = setInterval(() => {
      const openTabs = useEditorStore.getState().openTabs
      if (openTabs.length === 0) return

      openTabs.forEach((filePath) => {
        getFileMetadata(filePath).catch(() => closeTabAndSelect(filePath))
      })
    }, 15000)

    return () => clearInterval(interval)
  }, [getFileMetadata, closeDeletedFile])

  return (
    <aside className="flex h-full flex-col overflow-hidden bg-sidebar border-r border-border">
      {/* Toolbar — horizontal when expanded, vertical when collapsed */}
      {sidebarCollapsed ? (
        <div className="flex flex-col items-center gap-3 px-1 py-3 shrink-0">
          <Button variant="ghost" size="icon" className="size-6"
            onClick={() => setSidebarCollapsed(false)}
            title={t("sidebar.expandSidebar")}>
            <PanelLeftOpen className="size-3.5" />
          </Button>
          <ThemeToggle />
          <Button variant={isCompact ? "secondary" : "ghost"} size="icon" className="size-6"
            onClick={isCompact ? exitCompactMode : enterCompactMode}
            title={t("sidebar.compactWindow")}>
            {isCompact ? <Maximize2 className="size-3.5" /> : <Minimize2 className="size-3.5" />}
          </Button>
          <Button variant={isPinned ? "secondary" : "ghost"} size="icon" className="size-6"
            onClick={toggleAlwaysOnTop} title={t("sidebar.pinWindow")}>
            {isPinned ? <PinOff className="size-3.5" /> : <Pin className="size-3.5" />}
          </Button>
        </div>
      ) : (
        <div className="flex items-center justify-between px-2 py-1 shrink-0">
          {/* Tab switchers */}
          <div className="flex items-center gap-0.5">
            <Button variant={activeTab === "files" ? "secondary" : "ghost"} size="icon" className="size-6"
              onClick={() => setActiveTab("files")} title={t("sidebar.fileTree")}>
              <Files className="size-3.5" />
            </Button>
            <Button variant={activeTab === "search" ? "secondary" : "ghost"} size="icon" className="size-6"
              onClick={() => setActiveTab("search")} title={t("sidebar.search")}>
              <Search className="size-3.5" />
            </Button>
            <Button variant={activeTab === "analysis" ? "secondary" : "ghost"} size="icon" className="size-6"
              onClick={() => setActiveTab("analysis")} title={t("specAnalyzer.specAnalysis")}>
              <FileSearch className="size-3.5" />
            </Button>
          </div>

          {/* Utility buttons */}
          <div className="flex items-center gap-0.5 ml-auto">
            <Button variant="ghost" size="icon" className="size-6" onClick={handleRefresh}
              disabled={isRefreshing} title={t("sidebar.refreshFileTree")}>
              <RefreshCw className={`size-3 transition-transform ${isRefreshing ? "animate-spin" : ""}`} />
            </Button>
            <ThemeToggle />
            <Button variant="ghost" size="icon" className="size-6"
              onClick={() => navigate({ to: "/settings" })} title={t("settings.title")}>
              <Settings className="size-3.5" />
            </Button>
            <Button variant={isCompact ? "secondary" : "ghost"} size="icon" className="size-6"
              onClick={isCompact ? exitCompactMode : enterCompactMode}
              title={t("sidebar.compactWindow")}>
              {isCompact ? <Maximize2 className="size-3.5" /> : <Minimize2 className="size-3.5" />}
            </Button>
            <Button variant={isPinned ? "secondary" : "ghost"} size="icon" className="size-6"
              onClick={toggleAlwaysOnTop} title={t("sidebar.pinWindow")}>
              {isPinned ? <PinOff className="size-3.5" /> : <Pin className="size-3.5" />}
            </Button>
            <Button variant="ghost" size="icon" className="size-6"
              onClick={() => setSidebarCollapsed(true)}
              title={t("sidebar.collapseSidebar")}>
              <PanelLeftClose className="size-3.5" />
            </Button>
          </div>
        </div>
      )}

      {!sidebarCollapsed && (
        <>
          <Separator />
          {activeTab === "files" ? (
            <>
              <ProjectSelector />
              <Separator />
              <FileTree onRefreshReady={handleRefreshReady} />
            </>
          ) : activeTab === "search" ? (
            <SearchPanel />
          ) : (
            <AnalysisHistoryPanel />
          )}
        </>
      )}
    </aside>
  )
}
