import { useCallback, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { ScrollArea } from "@/components/ui/scroll-area"
import { FileTreeNode } from "@/components/file-tree/file-tree-node"
import { useWorkspaceStore } from "@/stores/workspace-store"
import { useFileOperations } from "@/hooks/use-file-operations"
import { FolderOpen } from "lucide-react"

/**
 * Root file tree component.
 * Automatically loads file tree when active project changes.
 * Exposes refresh() via onRefreshReady callback for parent to trigger reload.
 */
export function FileTree({ onRefreshReady }: { onRefreshReady?: (fn: () => void) => void }) {
  const { t } = useTranslation()
  const fileTree = useWorkspaceStore((s) => s.fileTree)
  const activeProjectId = useWorkspaceStore((s) => s.activeProjectId)
  const projects = useWorkspaceStore((s) => s.projects)
  const setFileTree = useWorkspaceStore((s) => s.setFileTree)
  const { listDirectory } = useFileOperations()
  const [refreshKey, setRefreshKey] = useState(0)

  const loadTree = useCallback(() => {
    if (!activeProjectId) {
      setFileTree([])
      return
    }
    const project = projects.find((p) => p.id === activeProjectId)
    if (!project) return

    listDirectory(project.path, true)
      .then(setFileTree)
      .catch((err) => {
        console.error("Failed to load file tree:", err)
        setFileTree([])
      })
  }, [activeProjectId, projects])

  // Load file tree when active project changes or refresh triggered
  useEffect(() => {
    loadTree()
  }, [activeProjectId, refreshKey])

  // Expose refresh function to parent
  useEffect(() => {
    onRefreshReady?.(() => setRefreshKey((k) => k + 1))
  }, [onRefreshReady])

  if (!activeProjectId) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 p-4 text-center text-sm text-muted-foreground">
        <FolderOpen className="size-8 opacity-40" />
        <p>{t("fileTree.addProjectToStart")}</p>
      </div>
    )
  }

  if (fileTree.length === 0) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        {t("fileTree.noFilesFound")}
      </div>
    )
  }

  return (
    <ScrollArea className="flex-1">
      <nav aria-label={t("sidebar.fileTree")}>
        <ul className="py-1">
          {fileTree.map((node) => (
            <FileTreeNode key={node.path} node={node} depth={0} />
          ))}
        </ul>
      </nav>
    </ScrollArea>
  )
}
