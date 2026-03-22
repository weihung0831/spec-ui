import { invoke } from "@tauri-apps/api/core"
import { useSpecAnalyzerStore } from "@/stores/spec-analyzer-store"
import type { SpecAnalysisCache } from "@/types/spec-analyzer-types"

/**
 * Load cached analysis report for a given spec file from .spec-analysis.json.
 * Returns true if a cached report was found and loaded into the store.
 */
export async function loadCachedAnalysis(specFile: string, projectPath: string, locale?: string): Promise<boolean> {
  try {
    const cache = await invoke<SpecAnalysisCache | null>("read_analysis_cache", { projectPath })
    if (!cache) return false

    // 1. Try locale-specific key
    if (locale && cache.reports[`${specFile}:${locale}`]) {
      useSpecAnalyzerStore.getState().setReport(cache.reports[`${specFile}:${locale}`])
      return true
    }

    // 2. Try exact match or filename fallback
    let cached = cache.reports[specFile]
    if (!cached) {
      const fileName = specFile.split("/").pop() ?? specFile
      for (const [key, value] of Object.entries(cache.reports)) {
        const basePath = key.split(":")[0]
        const keyFileName = basePath.split("/").pop() ?? basePath
        if (basePath === specFile || keyFileName === fileName) {
          cached = value
          break
        }
      }
    }
    if (!cached) return false

    useSpecAnalyzerStore.getState().setReport(cached)
    return true
  } catch {
    return false
  }
}
