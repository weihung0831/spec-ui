import { useRef, useCallback, useEffect } from "react"
import { cn } from "@/lib/utils"

interface ResizablePanelProps {
  onWidthChange: (width: number) => void
  minSidebar?: number
  minContent?: number
  className?: string
}

const DEFAULT_WIDTH = 280
const MIN_SIDEBAR = 200
const MIN_CONTENT = 400

/**
 * Draggable divider between sidebar and content panels.
 * Uses requestAnimationFrame for smooth dragging.
 * Double-click resets to default width.
 */
export function ResizableHandle({
  onWidthChange,
  minSidebar = MIN_SIDEBAR,
  minContent = MIN_CONTENT,
  className,
}: ResizablePanelProps) {
  const isDragging = useRef(false)
  const rafId = useRef<number | null>(null)
  const pendingX = useRef<number | null>(null)

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging.current) return
      pendingX.current = e.clientX

      if (rafId.current !== null) return
      rafId.current = requestAnimationFrame(() => {
        rafId.current = null
        if (pendingX.current === null) return
        const newWidth = pendingX.current
        const maxWidth = window.innerWidth - minContent
        const clamped = Math.max(minSidebar, Math.min(maxWidth, newWidth))
        onWidthChange(clamped)
      })
    },
    [onWidthChange, minSidebar, minContent],
  )

  const handleMouseUp = useCallback(() => {
    isDragging.current = false
    document.body.style.cursor = ""
    document.body.style.userSelect = ""
  }, [])

  useEffect(() => {
    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)
    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
      if (rafId.current !== null) cancelAnimationFrame(rafId.current)
    }
  }, [handleMouseMove, handleMouseUp])

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      isDragging.current = true
      document.body.style.cursor = "col-resize"
      document.body.style.userSelect = "none"
    },
    [],
  )

  const handleDoubleClick = useCallback(() => {
    onWidthChange(DEFAULT_WIDTH)
  }, [onWidthChange])

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize sidebar"
      title="Drag to resize · Double-click to reset"
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      style={{ width: 4 }}
      className={cn(
        "relative flex-shrink-0 cursor-col-resize bg-border hover:bg-primary/40 active:bg-primary/60 transition-colors",
        className,
      )}
    />
  )
}
