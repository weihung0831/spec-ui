import { useEffect, useState } from "react"
import { invoke } from "@tauri-apps/api/core"
import { FileSearch, Trash2, Clock } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { useEditorStore } from "@/stores/editor-store"
import { useSpecAnalyzerStore } from "@/stores/spec-analyzer-store"
import { useWorkspaceStore } from "@/stores/workspace-store"
import { useActiveProject } from "@/hooks/use-active-project"

import type { SpecAnalysisCache, SpecAnalysisReport } from "@/types/spec-analyzer-types"

/**
 * Sidebar panel listing all previously analyzed specs from cache.
 * Click to load results; delete to remove from cache + file.
 */
export function AnalysisHistoryPanel() {
  const { t, i18n } = useTranslation()
  const [entries, setEntries] = useState<{ key: string; report: SpecAnalysisReport }[]>([])
  const [loading, setLoading] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const setReport = useSpecAnalyzerStore((s) => s.setReport)
  const addTab = useEditorStore((s) => s.addTab)
  const projectPath = useActiveProject()?.path

  const isAnalyzing = useSpecAnalyzerStore((s) => s.isAnalyzing)

  useEffect(() => {
    if (!projectPath) { setEntries([]); return }
    // Reload when project changes, language changes, or analysis completes
    if (!isAnalyzing) loadEntries(projectPath)
  }, [projectPath, i18n.language, isAnalyzing])

  async function loadEntries(pp: string) {
    setLoading(true)
    try {
      const cache = await invoke<SpecAnalysisCache | null>("read_analysis_cache", { projectPath: pp })
      if (cache?.reports) {
        // Deduplicate by specFile — prefer current locale, then any locale-specific, then legacy
        const lang = i18n.language
        const seen = new Map<string, { key: string; report: SpecAnalysisReport }>()
        for (const [key, report] of Object.entries(cache.reports)) {
          const base = key.split(":")[0]
          const existing = seen.get(base)
          if (!existing || key.endsWith(`:${lang}`) || (!existing.key.includes(":") && key.includes(":"))) {
            seen.set(base, { key, report })
          }
        }
        const deduped = [...seen.values()]
        deduped.sort((a, b) => b.report.analyzedAt.localeCompare(a.report.analyzedAt))
        setEntries(deduped)
      } else {
        setEntries([])
      }
    } catch {
      setEntries([])
    } finally {
      setLoading(false)
    }
  }

  function handleClick(entry: { key: string; report: SpecAnalysisReport }) {
    const filePath = entry.report.specFile || entry.key
    setReport(entry.report)
    addTab(filePath)
    // Also set selectedFilePath so the editor route renders
    useWorkspaceStore.getState().selectFile(filePath)
    useEditorStore.getState().setPreviewMode("preview-only")
  }

  async function confirmDelete() {
    if (!projectPath || !deleteTarget) return
    try {
      const cache = await invoke<SpecAnalysisCache | null>("read_analysis_cache", { projectPath })
      if (cache) {
        delete cache.reports[deleteTarget]
        await invoke("write_analysis_cache", { projectPath, cache })
      }
      setEntries((prev) => prev.filter((e) => e.key !== deleteTarget))
      // Clear current report if it was the deleted one
      const currentReport = useSpecAnalyzerStore.getState().report
      if (currentReport) {
        const base = deleteTarget.split(":")[0]
        if (currentReport.specFile === base || currentReport.specFile === deleteTarget) {
          useSpecAnalyzerStore.getState().clearReport()
        }
      }
    } catch (err) {
      console.warn("[analysis-history] Delete failed:", err)
    } finally {
      setDeleteTarget(null)
    }
  }

  if (!projectPath) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 text-xs text-muted-foreground">
        {t("fileTree.noProjectSelected")}
      </div>
    )
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto">
        <div className="p-2 space-y-1">
          {loading && (
            <div className="text-xs text-muted-foreground text-center py-4">{t("common.loading")}</div>
          )}
          {!loading && entries.length === 0 && (
            <div className="text-xs text-muted-foreground text-center py-4">
              {t("specAnalyzer.noResults")}
            </div>
          )}
          {entries.map((entry) => {
            const fileName = entry.key.split("/").pop() ?? entry.key
            const time = new Date(entry.report.analyzedAt).toLocaleDateString(undefined, { year: "numeric", month: "2-digit", day: "2-digit" })
            const { doCount, dontCount, testCount } = entry.report.summary
            return (
              <div
                key={entry.key}
                className="group flex items-start gap-2 rounded px-2 py-1.5 hover:bg-muted/60 cursor-pointer text-xs transition-colors"
                onClick={() => handleClick(entry)}
              >
                <FileSearch className="size-3.5 mt-0.5 text-muted-foreground shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-foreground truncate">{entry.report.specTitle || fileName}</div>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                    <span className="flex items-center gap-0.5"><Clock className="size-2.5" /> {time}</span>
                    <span className="text-green-600 dark:text-green-400">{doCount} DO</span>
                    <span className="text-red-600 dark:text-red-400">{dontCount} DON'T</span>
                    <span className="text-blue-600 dark:text-blue-400">{testCount} Test</span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-5 shrink-0 text-muted-foreground/40 hover:text-destructive"
                  onClick={(e) => { e.stopPropagation(); setDeleteTarget(entry.key) }}
                >
                  <Trash2 className="size-3" />
                </Button>
              </div>
            )
          })}
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("specAnalyzer.deleteCacheTitle")}</DialogTitle>
            <DialogDescription>
              {t("specAnalyzer.deleteCacheDescription")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              {t("contextMenu.cancel")}
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              {t("specAnalyzer.deleteCacheConfirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
