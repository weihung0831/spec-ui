import { invoke } from "@tauri-apps/api/core"
import { useTranslation } from "react-i18next"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { useWorkspaceStore } from "@/stores/workspace-store"
import type { FileNode } from "@/types/file-types"

interface FileTreeContextMenuProps {
  node: FileNode
  children: React.ReactNode
}

/** Show item in Finder/Explorer via Tauri shell command */
async function revealInFinder(path: string) {
  try {
    await invoke("show_in_finder", { path })
  } catch {
    // Backend command may not be wired yet — silently ignore
  }
}

/**
 * Right-click context menu for file tree nodes.
 * Files: Open, Show in Finder, Copy Path, Delete.
 * Dirs: Expand All, Collapse All, Show in Finder.
 */
export function FileTreeContextMenu({ node, children }: FileTreeContextMenuProps) {
  const { t } = useTranslation()
  const selectFile = useWorkspaceStore((s) => s.selectFile)
  const toggleDir = useWorkspaceStore((s) => s.toggleDir)
  const expandedDirs = useWorkspaceStore((s) => s.expandedDirs)

  const copyPath = () => {
    navigator.clipboard.writeText(node.path).catch(() => {})
  }

  /** Recursively collect all descendant directory paths */
  const collectDirs = (n: FileNode): string[] => {
    if (!n.isDir) return []
    const childDirs = (n.children ?? []).flatMap(collectDirs)
    return [n.path, ...childDirs]
  }

  const expandAll = () => {
    const dirs = collectDirs(node)
    const current = new Set(expandedDirs)
    dirs.forEach((d) => current.add(d))
    // Bulk update by toggling each that isn't already expanded
    dirs.filter((d) => !expandedDirs.includes(d)).forEach(toggleDir)
  }

  const collapseAll = () => {
    const dirs = collectDirs(node)
    dirs.filter((d) => expandedDirs.includes(d)).forEach(toggleDir)
  }

  if (node.isDir) {
    return (
      <ContextMenu>
        <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
        <ContextMenuContent className="w-48">
          <ContextMenuItem onClick={expandAll}>{t("contextMenu.expandAll")}</ContextMenuItem>
          <ContextMenuItem onClick={collapseAll}>{t("contextMenu.collapseAll")}</ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={() => revealInFinder(node.path)}>
            {t("contextMenu.showInFinder")}
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    )
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <ContextMenuItem onClick={() => selectFile(node.path)}>{t("contextMenu.open")}</ContextMenuItem>
        <ContextMenuItem onClick={() => revealInFinder(node.path)}>
          {t("contextMenu.showInFinder")}
        </ContextMenuItem>
        <ContextMenuItem onClick={copyPath}>{t("contextMenu.copyPath")}</ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem className="text-destructive focus:text-destructive">
          {t("contextMenu.delete")}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}
