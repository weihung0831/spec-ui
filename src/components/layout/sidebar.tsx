import { useCallback, useRef, useState } from "react"
import { Files, PanelLeftClose, PanelLeftOpen, RefreshCw, Search, Settings } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { ProjectSelector } from "@/components/workspace/project-selector"
import { FileTree } from "@/components/file-tree/file-tree"
import { SearchPanel } from "@/components/search/search-panel"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import { useWorkspaceStore } from "@/stores/workspace-store"

type SidebarTab = "files" | "search"

/**
 * Sidebar container: project selector at top, file tree below.
 * Collapse button toggles sidebar visibility.
 */
export function Sidebar() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const sidebarCollapsed = useWorkspaceStore((s) => s.sidebarCollapsed)
  const setSidebarCollapsed = useWorkspaceStore((s) => s.setSidebarCollapsed)
  const [activeTab, setActiveTab] = useState<SidebarTab>("files")
  const refreshRef = useRef<(() => void) | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const handleRefreshReady = useCallback((fn: () => void) => { refreshRef.current = fn }, [])

  const handleRefresh = () => {
    setIsRefreshing(true)
    refreshRef.current?.()
    setTimeout(() => setIsRefreshing(false), 600)
  }

  return (
    <aside className="flex h-full flex-col overflow-hidden bg-sidebar border-r border-border">
      {/* Toolbar row */}
      <div className="flex items-center justify-between px-2 py-1.5 shrink-0">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground pl-1">
          {sidebarCollapsed ? "" : activeTab === "files" ? t("sidebar.workspace") : t("sidebar.search")}
        </span>
        <div className="flex items-center gap-0.5">
          {!sidebarCollapsed && (
            <>
              <Button
                variant={activeTab === "files" ? "secondary" : "ghost"}
                size="icon"
                className="size-7"
                onClick={() => setActiveTab("files")}
                title={t("sidebar.fileTree")}
              >
                <Files className="size-4" />
              </Button>
              <Button
                variant={activeTab === "search" ? "secondary" : "ghost"}
                size="icon"
                className="size-7"
                onClick={() => setActiveTab("search")}
                title={t("sidebar.search")}
              >
                <Search className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={handleRefresh}
                disabled={isRefreshing}
                title={t("sidebar.refreshFileTree")}
              >
                <RefreshCw className={`size-3.5 transition-transform ${isRefreshing ? "animate-spin" : ""}`} />
              </Button>
            </>
          )}
          {!sidebarCollapsed && <ThemeToggle />}
          {!sidebarCollapsed && (
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() => navigate({ to: "/settings" })}
              title={t("settings.title")}
            >
              <Settings className="size-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            title={sidebarCollapsed ? t("sidebar.expandSidebar") : t("sidebar.collapseSidebar")}
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen className="size-4" />
            ) : (
              <PanelLeftClose className="size-4" />
            )}
          </Button>
        </div>
      </div>

      {!sidebarCollapsed && (
        <>
          <Separator />
          {activeTab === "files" ? (
            <>
              <ProjectSelector />
              <Separator />
              <FileTree onRefreshReady={handleRefreshReady} />
            </>
          ) : (
            <SearchPanel />
          )}
        </>
      )}
    </aside>
  )
}
