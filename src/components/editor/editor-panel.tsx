import { useEffect, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useEditorStore } from "@/stores/editor-store"
import { useFileOperations } from "@/hooks/use-file-operations"
import { useAutoSave } from "@/hooks/use-auto-save"
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts"
import { EditorToolbar } from "@/components/editor/editor-toolbar"
import { SplitEditorView } from "@/components/editor/split-editor-view"
import { FrontmatterHeader } from "@/components/editor/frontmatter-header"
import { FileTabBar } from "@/components/editor/file-tab-bar"
import { BreadcrumbNav } from "@/components/layout/breadcrumb-nav"
import type { Frontmatter } from "@/types/file-types"
import { loadCachedReport } from "@/hooks/use-coverage-cache"
import { useCoverageStore } from "@/stores/coverage-store"
import { useSpecAnalyzerStore } from "@/stores/spec-analyzer-store"
import { useActiveProject } from "@/hooks/use-active-project"
import { loadCachedAnalysis } from "@/hooks/use-spec-analyzer-cache"

interface EditorPanelProps {
  filePath: string
  isDark?: boolean
}

/**
 * Top-level editor container: loads file on mount, wires auto-save,
 * keyboard shortcuts, toolbar and split view.
 */
export function EditorPanel({ filePath, isDark = false }: EditorPanelProps) {
  const { readFile, writeFile } = useFileOperations()
  const openFile = useEditorStore((s) => s.openFile)
  const markSaved = useEditorStore((s) => s.markSaved)
  const getContent = useEditorStore((s) => s.getContent)
  const content = useEditorStore((s) => s.getContent(filePath)) ?? ""
  const setLastCodePath = useCoverageStore((s) => s.setLastCodePath)
  const activeProject = useActiveProject()
  const clearAnalysis = useSpecAnalyzerStore((s) => s.clearReport)
  const { i18n } = useTranslation()

  // When switching files or locale: reload analysis from cache
  useEffect(() => {
    clearAnalysis()
    if (activeProject?.path) {
      loadCachedAnalysis(filePath, activeProject.path, i18n.language)
    }
  }, [filePath, clearAnalysis, activeProject?.path, i18n.language])

  // Load file content when filePath changes
  useEffect(() => {
    let cancelled = false
    readFile(filePath)
      .then((content) => {
        if (!cancelled) openFile(filePath, content)
      })
      .catch((err) => console.error("[editor-panel] read failed:", err))
    return () => { cancelled = true }
  }, [filePath, readFile, openFile])

  // Auto-load coverage cache when file opens (use active project path)
  useEffect(() => {
    const codePath = activeProject?.path
    if (!codePath) {
      console.debug("[editor-panel] no codePath, skipping cache load")
      return
    }
    console.debug("[editor-panel] loading cache for", filePath, "from", codePath)
    setLastCodePath(codePath)
    loadCachedReport(filePath, codePath).then((found) => {
      console.debug("[editor-panel] coverage cache loaded:", found)
    }).catch((err) =>
      console.warn("[editor-panel] coverage cache load failed:", err)
    )
    // Spec analysis cache is NOT auto-loaded; user must click "Analyze Spec"
  }, [filePath, activeProject?.path, setLastCodePath])

  // Parse frontmatter from content (regex — no IPC needed for display)
  const frontmatter = useMemo<Frontmatter>(() => {
    const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(content)
    if (!match) return {}
    const block = match[1]
    const get = (key: string) => new RegExp(`^${key}:\\s*(.+)$`, "m").exec(block)?.[1]?.trim()
    const tagsRaw = /^tags:\s*\[([^\]]*)\]/m.exec(block)?.[1]
    const tags = tagsRaw ? tagsRaw.split(",").map((t) => t.trim().replace(/^['"]|['"]$/g, "")).filter(Boolean) : undefined
    return {
      title: get("title"),
      status: get("status"),
      priority: get("priority"),
      effort: get("effort"),
      tags,
    }
  }, [content])

  // Wire auto-save and keyboard shortcuts
  useAutoSave(filePath)
  useKeyboardShortcuts()

  const handleSave = async () => {
    const content = getContent(filePath)
    if (content === null) return
    try {
      await writeFile(filePath, content)
      markSaved(filePath)
    } catch (err) {
      console.error("[editor-panel] manual save failed:", err)
    }
  }

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">

      <FileTabBar />
      <BreadcrumbNav filePath={filePath} />
      <EditorToolbar filePath={filePath} onSave={handleSave} />
      <FrontmatterHeader frontmatter={frontmatter} content={content} filePath={filePath} />
      <div className="flex-1 min-h-0">
        <SplitEditorView filePath={filePath} isDark={isDark} />
      </div>
    </div>
  )
}
