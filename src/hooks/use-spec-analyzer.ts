import { useCallback } from "react"
import { invoke } from "@tauri-apps/api/core"
import i18next from "@/i18n"
import { useSpecAnalyzerStore } from "@/stores/spec-analyzer-store"
import { useEditorStore } from "@/stores/editor-store"
import type { SpecAnalysisReport, SpecAnalysisCache } from "@/types/spec-analyzer-types"

export function useSpecAnalyzer(projectPath: string | null) {
  const setReport = useSpecAnalyzerStore((s) => s.setReport)
  const setIsAnalyzing = useSpecAnalyzerStore((s) => s.setIsAnalyzing)
  const setError = useSpecAnalyzerStore((s) => s.setError)

  const analyzeSpec = useCallback(async (specFile: string): Promise<boolean> => {
    setIsAnalyzing(true)
    setError(null)
    setReport(null)
    try {
      const report = await invoke<SpecAnalysisReport>("analyze_spec", { specFile })
      const locale = i18next.language
      report.locale = locale
      setReport(report)
      useEditorStore.getState().setPreviewMode("preview-only")
      if (projectPath) {
        await persistToCache(projectPath, report, specFile, `${specFile}:${locale}`)
      }
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      return false
    } finally {
      setIsAnalyzing(false)
    }
  }, [projectPath, setReport, setIsAnalyzing, setError])

  /** Translate existing report to the current i18n language and cache it */
  const translateReport = useCallback(async (specFile: string): Promise<boolean> => {
    const report = useSpecAnalyzerStore.getState().report
    if (!report || !projectPath) return false
    const targetLocale = i18next.language
    setIsAnalyzing(true)
    try {
      const translated = await invoke<SpecAnalysisReport>("translate_analysis", { report, targetLocale })
      translated.locale = targetLocale
      setReport(translated)
      await persistToCache(projectPath, translated, `${specFile}:${targetLocale}`)
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      return false
    } finally {
      setIsAnalyzing(false)
    }
  }, [projectPath, setReport, setIsAnalyzing, setError])

  const exportAnalysis = useCallback(async (report: SpecAnalysisReport, outputPath: string) => {
    await invoke("export_analysis_markdown", { report, outputPath })
  }, [])

  return { analyzeSpec, translateReport, exportAnalysis }
}

/** Persist report under one or more cache keys in a single read-modify-write cycle. */
async function persistToCache(projectPath: string, report: SpecAnalysisReport, ...keys: string[]) {
  try {
    const existing = await invoke<SpecAnalysisCache | null>("read_analysis_cache", { projectPath })
    const cache: SpecAnalysisCache = existing ?? {
      version: 1,
      lastAnalysisTime: report.analyzedAt,
      reports: {},
    }
    cache.lastAnalysisTime = report.analyzedAt
    for (const key of keys) {
      cache.reports[key] = report
    }
    await invoke("write_analysis_cache", { projectPath, cache })
  } catch (err) {
    console.warn("[use-spec-analyzer] Failed to write cache:", err)
  }
}
