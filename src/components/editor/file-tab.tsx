import { X } from "lucide-react"
import { cn } from "@/lib/utils"

interface FileTabProps {
  filePath: string
  /** Override display label (e.g. analysis title) */
  label?: string
  isActive: boolean
  isUnsaved: boolean
  onClick: () => void
  onClose: () => void
}

/**
 * Single tab showing file name, unsaved dot, and close button.
 * Supports middle-click to close.
 */
export function FileTab({ filePath, label, isActive, isUnsaved, onClick, onClose }: FileTabProps) {
  const fileName = label || (filePath.split("/").pop() ?? filePath)

  const handleMouseDown = (e: React.MouseEvent) => {
    // Middle-click closes tab
    if (e.button === 1) {
      e.preventDefault()
      onClose()
    }
  }

  const handleCloseClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onClose()
  }

  return (
    <div
      role="tab"
      aria-selected={isActive}
      className={cn(
        "group flex items-center gap-1.5 px-3 h-8 text-xs cursor-pointer shrink-0",
        "border-r border-border select-none whitespace-nowrap",
        "hover:bg-muted/60 transition-colors",
        isActive
          ? "bg-background text-foreground border-b-2 border-b-primary"
          : "bg-muted/30 text-muted-foreground",
      )}
      onClick={onClick}
      onMouseDown={handleMouseDown}
    >
      {/* Unsaved indicator dot */}
      {isUnsaved && (
        <span className="size-1.5 rounded-full bg-primary shrink-0" aria-label="Unsaved changes" />
      )}

      <span className="truncate max-w-[120px]">{fileName}</span>

      {/* Close button */}
      <button
        className={cn(
          "size-3.5 rounded flex items-center justify-center shrink-0",
          "opacity-0 group-hover:opacity-100 hover:bg-muted transition-opacity",
          isActive && "opacity-60",
        )}
        onClick={handleCloseClick}
        aria-label={`Close ${fileName}`}
        tabIndex={-1}
      >
        <X className="size-3" />
      </button>
    </div>
  )
}
