import { ChevronRight, Folder, FolderOpen, FileText } from "lucide-react"
import { cn } from "@/lib/utils"
import { useWorkspaceStore } from "@/stores/workspace-store"
import { FileTreeContextMenu } from "@/components/file-tree/file-tree-context-menu"
import { FileStatusBadge } from "@/components/file-tree/file-status-badge"
import type { FileNode } from "@/types/file-types"

interface FileTreeNodeProps {
  node: FileNode
  depth?: number
}

const INDENT_PX = 16

/**
 * Recursive file/directory node renderer.
 * Dirs: folder icon + expand arrow. Files: file icon + name.
 * Click file → selectFile. Click dir → toggleDir.
 * Active file highlighted. Visual indent guide lines.
 */
export function FileTreeNode({ node, depth = 0 }: FileTreeNodeProps) {
  const expandedDirs = useWorkspaceStore((s) => s.expandedDirs)
  const selectedFilePath = useWorkspaceStore((s) => s.selectedFilePath)
  const toggleDir = useWorkspaceStore((s) => s.toggleDir)
  const selectFile = useWorkspaceStore((s) => s.selectFile)

  const isExpanded = expandedDirs.includes(node.path)
  const isSelected = selectedFilePath === node.path

  const handleClick = () => {
    if (node.isDir) {
      toggleDir(node.path)
    } else {
      selectFile(node.path)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      handleClick()
    }
  }

  return (
    <li>
      <FileTreeContextMenu node={node}>
        <div
          role={node.isDir ? "button" : "button"}
          tabIndex={0}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          style={{ paddingLeft: depth * INDENT_PX + 4 }}
          className={cn(
            "flex items-center gap-1.5 py-0.5 pr-2 rounded-sm cursor-pointer text-sm select-none",
            "hover:bg-accent hover:text-accent-foreground",
            "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            isSelected && "bg-accent text-accent-foreground font-medium",
          )}
        >
          {/* Expand arrow for directories */}
          {node.isDir ? (
            <ChevronRight
              className={cn(
                "size-3.5 shrink-0 text-muted-foreground transition-transform",
                isExpanded && "rotate-90",
              )}
            />
          ) : (
            <span className="size-3.5 shrink-0" />
          )}

          {/* Icon */}
          {node.isDir ? (
            isExpanded ? (
              <FolderOpen className="size-4 shrink-0 text-yellow-500" />
            ) : (
              <Folder className="size-4 shrink-0 text-yellow-500" />
            )
          ) : (
            <FileText className="size-4 shrink-0 text-muted-foreground" />
          )}

          {/* Name */}
          <span className="truncate flex-1">{node.name}</span>

          {/* Frontmatter status/priority badges */}
          {!node.isDir && (node.status || node.priority) && (
            <FileStatusBadge status={node.status} priority={node.priority} />
          )}
        </div>
      </FileTreeContextMenu>

      {/* Render children when expanded */}
      {node.isDir && isExpanded && node.children && node.children.length > 0 && (
        <ul className="relative">
          {/* Visual guide line */}
          <span
            aria-hidden
            className="absolute left-0 top-0 bottom-0 w-px bg-border"
            style={{ left: depth * INDENT_PX + 10 }}
          />
          {node.children.map((child) => (
            <FileTreeNode key={child.path} node={child} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  )
}
