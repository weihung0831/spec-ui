import { useState } from "react"
import { invoke } from "@tauri-apps/api/core"
import { useTranslation } from "react-i18next"
import { Trash2 } from "lucide-react"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useWorkspaceStore } from "@/stores/workspace-store"
import { useEditorStore } from "@/stores/editor-store"
import { useFileOperations } from "@/hooks/use-file-operations"
import { closeTabAndSelect } from "@/hooks/use-close-tab-and-select"
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
 * Dirs: Expand All, Collapse All, Show in Finder, Delete.
 */
export function FileTreeContextMenu({ node, children }: FileTreeContextMenuProps) {
  const { t } = useTranslation()
  const selectFile = useWorkspaceStore((s) => s.selectFile)
  const toggleDir = useWorkspaceStore((s) => s.toggleDir)
  const expandedDirs = useWorkspaceStore((s) => s.expandedDirs)
  const { deleteFile } = useFileOperations()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

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
    dirs.filter((d) => !expandedDirs.includes(d)).forEach(toggleDir)
  }

  const collapseAll = () => {
    const dirs = collectDirs(node)
    dirs.filter((d) => expandedDirs.includes(d)).forEach(toggleDir)
  }

  const confirmDelete = async () => {
    try {
      await deleteFile(node.path)
      // Close tab & clear selection if this file was open
      const { openTabs } = useEditorStore.getState()
      if (openTabs.includes(node.path)) {
        closeTabAndSelect(node.path)
      }
    } catch (err) {
      console.error("[context-menu] delete failed:", err)
    } finally {
      setShowDeleteDialog(false)
    }
  }

  const menuContent = node.isDir ? (
    <ContextMenuContent className="w-48">
      <ContextMenuItem onClick={expandAll}>{t("contextMenu.expandAll")}</ContextMenuItem>
      <ContextMenuItem onClick={collapseAll}>{t("contextMenu.collapseAll")}</ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem onClick={() => revealInFinder(node.path)}>
        {t("contextMenu.showInFinder")}
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem
        onClick={() => setShowDeleteDialog(true)}
        className="text-destructive focus:text-destructive"
      >
        <Trash2 className="size-3.5 mr-1.5" />
        {t("contextMenu.delete")}
      </ContextMenuItem>
    </ContextMenuContent>
  ) : (
    <ContextMenuContent className="w-48">
      <ContextMenuItem onClick={() => selectFile(node.path)}>{t("contextMenu.open")}</ContextMenuItem>
      <ContextMenuItem onClick={() => revealInFinder(node.path)}>
        {t("contextMenu.showInFinder")}
      </ContextMenuItem>
      <ContextMenuItem onClick={copyPath}>{t("contextMenu.copyPath")}</ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem
        onClick={() => setShowDeleteDialog(true)}
        className="text-destructive focus:text-destructive"
      >
        <Trash2 className="size-3.5 mr-1.5" />
        {t("contextMenu.delete")}
      </ContextMenuItem>
    </ContextMenuContent>
  )

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
        {menuContent}
      </ContextMenu>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("contextMenu.delete")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("contextMenu.confirmDelete", { name: node.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("contextMenu.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("contextMenu.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
