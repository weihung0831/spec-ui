import { useEffect, useRef } from "react"
import { useFileOperations } from "@/hooks/use-file-operations"
import { useEditorStore } from "@/stores/editor-store"

/**
 * Watches editor store content for a specific file path.
 * Debounces writes by 1000ms. Calls markSaved on success.
 * Must be mounted inside a component that subscribes to editor content changes.
 */
export function useAutoSave(filePath: string | null, debounceMs = 1000) {
  const { writeFile } = useFileOperations()
  const content = useEditorStore((s) =>
    filePath ? s.openFiles[filePath]?.content ?? null : null,
  )
  const originalContent = useEditorStore((s) =>
    filePath ? s.openFiles[filePath]?.originalContent ?? null : null,
  )
  const markSaved = useEditorStore((s) => s.markSaved)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Stable refs to avoid stale closures in setTimeout callback
  const contentRef = useRef(content)
  contentRef.current = content
  const filePathRef = useRef(filePath)
  filePathRef.current = filePath

  useEffect(() => {
    if (!filePath || content === null || content === originalContent) return

    if (timerRef.current) clearTimeout(timerRef.current)

    timerRef.current = setTimeout(async () => {
      const path = filePathRef.current
      const text = contentRef.current
      if (!path || text === null) return
      try {
        await writeFile(path, text)
        markSaved(path)
      } catch (err) {
        console.error("[auto-save] write failed:", err)
      }
    }, debounceMs)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [content, originalContent, filePath, debounceMs, writeFile, markSaved])
}
