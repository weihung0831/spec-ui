import { useRef, useCallback, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { useEditorStore } from "@/stores/editor-store"
import { useSpecAnalyzerStore } from "@/stores/spec-analyzer-store"
import { CodeMirrorEditor } from "@/components/editor/code-mirror-editor"
import { PreviewPanel } from "@/components/preview/preview-panel"
import { AnalyzerResultsPanel } from "@/components/spec-analyzer/analyzer-results-panel"

interface SplitEditorViewProps {
  filePath: string
  isDark?: boolean
}

const MIN_PANE = 200

export function SplitEditorView({ filePath, isDark = false }: SplitEditorViewProps) {
  const { t } = useTranslation()
  const content = useEditorStore((s) => s.openFiles[filePath]?.content ?? "")
  const updateContent = useEditorStore((s) => s.updateContent)
  const previewMode = useEditorStore((s) => s.previewMode)
  const analysisReport = useSpecAnalyzerStore((s) => s.report)

  const containerRef = useRef<HTMLDivElement>(null)
  const [splitRatio, setSplitRatio] = useState(0.5)
  const isDragging = useRef(false)
  const rafId = useRef<number | null>(null)

  const handleChange = useCallback(
    (value: string) => updateContent(filePath, value),
    [filePath, updateContent],
  )

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging.current || !containerRef.current) return
    if (rafId.current !== null) return
    const x = e.clientX
    rafId.current = requestAnimationFrame(() => {
      rafId.current = null
      const rect = containerRef.current!.getBoundingClientRect()
      const total = rect.width
      const offset = x - rect.left
      const ratio = Math.max(MIN_PANE / total, Math.min(1 - MIN_PANE / total, offset / total))
      setSplitRatio(ratio)
    })
  }, [])

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

  const showEditor = previewMode !== "preview-only"
  const showPreview = previewMode !== "editor-only"
  const isSplit = previewMode === "split"

  const editorWidth = isSplit ? `${splitRatio * 100}%` : showEditor ? "100%" : "0%"
  const previewWidth = isSplit ? `${(1 - splitRatio) * 100}%` : showPreview ? "100%" : "0%"

  return (
    <div ref={containerRef} className="flex h-full w-full overflow-hidden">
      {showEditor && (
        <div style={{ width: editorWidth }} className="h-full overflow-hidden min-w-0">
          <CodeMirrorEditor value={content} onChange={handleChange} isDark={isDark} />
        </div>
      )}

      {isSplit && (
        <div
          role="separator"
          aria-orientation="vertical"
          title={t("editor.dragToResize")}
          onMouseDown={(e) => {
            e.preventDefault()
            isDragging.current = true
            document.body.style.cursor = "col-resize"
            document.body.style.userSelect = "none"
          }}
          className="w-1 shrink-0 cursor-col-resize bg-border hover:bg-primary/40 active:bg-primary/60 transition-colors"
        />
      )}

      {showPreview && (
        <div style={{ width: previewWidth }} className="h-full overflow-hidden min-w-0 border-l border-border">
          {analysisReport ? (
            <div className="h-full overflow-y-auto">
              <AnalyzerResultsPanel />
            </div>
          ) : (
            <PreviewPanel content={content} />
          )}
        </div>
      )}
    </div>
  )
}
