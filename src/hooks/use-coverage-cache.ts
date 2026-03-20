import { useEffect, useCallback } from "react"
import { invoke } from "@tauri-apps/api/core"
import { useCoverageStore, type CoverageOverride } from "@/stores/coverage-store"
import type { CoverageResult, CoverageSummary, RequirementInfo } from "@/types/coverage-types"

/** Shape returned by the Rust read_coverage_cache command */
interface RustCoverageCache {
  version: number
  lastScanCommit: string | null
  lastScanTime: string
  reports: Record<string, { requirements?: RequirementInfo[]; results: CoverageResult[]; summary: CoverageSummary }>
  overrides: Record<string, CoverageOverride>
}

/**
 * Attempts to load a cached coverage report for the given spec file + code path
 * from .spec-coverage.json and populate the coverage store.
 *
 * Returns true if a cached report was found and loaded.
 */
export async function loadCachedReport(specFile: string, codePath: string): Promise<boolean> {
  try {
    const cache = await invoke<RustCoverageCache | null>("read_coverage_cache", { codePath })
    if (!cache) {
      console.warn("[coverage-cache] No cache file found at", codePath)
      return false
    }

    // Log available keys for debugging
    const reportKeys = Object.keys(cache.reports)
    console.debug("[coverage-cache] Cache has reports for:", reportKeys)
    console.debug("[coverage-cache] Looking for specFile:", specFile)

    // Try exact match first, then try matching just the filename portion
    let cached = cache.reports[specFile]
    if (!cached) {
      // Fallback: match by filename (path may differ between sessions)
      const specFileName = specFile.split("/").pop() ?? specFile
      for (const [key, value] of Object.entries(cache.reports)) {
        const keyFileName = key.split("/").pop() ?? key
        if (keyFileName === specFileName) {
          cached = value
          console.debug("[coverage-cache] Matched by filename:", specFileName)
          break
        }
      }
    }
    if (!cached) {
      console.warn("[coverage-cache] No cached report for this spec file")
      return false
    }

    const { setReport, setOverrides, setLastCodePath } = useCoverageStore.getState()

    // Reconstruct CoverageReport from cached data (including requirements if available)
    setReport({
      specFile,
      codePath,
      scannedAt: cache.lastScanTime,
      requirements: cached.requirements ?? [],
      results: cached.results,
      summary: cached.summary,
    })

    setOverrides(cache.overrides ?? {})
    setLastCodePath(codePath)

    return true
  } catch (err) {
    console.warn("[use-coverage-cache] Failed to load cache:", err)
    return false
  }
}

/**
 * Hook that automatically loads the coverage cache when the spec file or code path changes.
 * Also exposes helpers for reading the last scan time.
 */
export function useCoverageCache(specFile: string | null) {
  const lastCodePath = useCoverageStore((s) => s.lastCodePath)
  const report = useCoverageStore((s) => s.report)

  // Auto-load cache on mount or when specFile / lastCodePath changes
  useEffect(() => {
    if (!specFile || !lastCodePath) return
    loadCachedReport(specFile, lastCodePath)
  }, [specFile, lastCodePath])

  /** Formats the last scan time as a relative string (e.g. "2h ago", "just now") */
  const getLastScannedLabel = useCallback((): string | null => {
    const ts = report?.scannedAt
    if (!ts) return null
    return formatRelativeTime(ts)
  }, [report?.scannedAt])

  return { getLastScannedLabel }
}

/** Returns a human-friendly relative time string for an ISO 8601 timestamp */
export function formatRelativeTime(isoTimestamp: string): string {
  const then = new Date(isoTimestamp).getTime()
  const diffMs = Date.now() - then
  const diffMin = Math.floor(diffMs / 60_000)

  if (diffMin < 1) return "just now"
  if (diffMin < 60) return `${diffMin}m ago`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `${diffH}h ago`
  return new Date(isoTimestamp).toLocaleDateString()
}
