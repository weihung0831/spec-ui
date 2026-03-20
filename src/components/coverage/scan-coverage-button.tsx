import { invoke } from "@tauri-apps/api/core"
import { open as openDialog } from "@tauri-apps/plugin-dialog"
import { Loader2, ScanSearch } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useCoverageStore } from "@/stores/coverage-store"
import { useWorkspaceStore } from "@/stores/workspace-store"
import type { CoverageReport } from "@/types/coverage-types"

/** Shape of the cache written to .spec-coverage.json */
interface CoverageCache {
  version: number
  lastScanCommit: string | null
  lastScanTime: string
  reports: Record<string, { requirements?: CoverageReport["requirements"]; results: CoverageReport["results"]; summary: CoverageReport["summary"] }>
  overrides: Record<string, unknown>
}

interface ScanCoverageButtonProps {
  filePath: string
}

/**
 * Toolbar button that triggers spec coverage analysis via Tauri backend.
 * Uses current project path as default code path. Only prompts folder picker
 * if no project is active.
 */
export function ScanCoverageButton({ filePath }: ScanCoverageButtonProps) {
  const { t } = useTranslation()
  const isScanning = useCoverageStore((s) => s.isScanning)
  const setIsScanning = useCoverageStore((s) => s.setIsScanning)
  const setReport = useCoverageStore((s) => s.setReport)
  const setError = useCoverageStore((s) => s.setError)
  const setLastCodePath = useCoverageStore((s) => s.setLastCodePath)
  const overrides = useCoverageStore((s) => s.overrides)

  // Get current project path from workspace store
  const activeProjectId = useWorkspaceStore((s) => s.activeProjectId)
  const projects = useWorkspaceStore((s) => s.projects)
  const activeProject = projects.find((p) => p.id === activeProjectId)

  async function handleScan() {
    if (isScanning) return

    try {
      // 1. Check Claude CLI availability
      const cliAvailable = await invoke<boolean>("check_claude_cli").catch(() => false)
      if (!cliAvailable) {
        alert(t("coverage.cliNotInstalled"))
        return
      }
    } catch {
      alert(t("coverage.cliCheckFailed"))
      return
    }

    // 2. Use current project path as code path; fallback to folder picker
    let codePath: string | null = activeProject?.path ?? null
    if (!codePath) {
      try {
        const selected = await openDialog({
          directory: true,
          multiple: false,
          title: t("coverage.selectCodeDir"),
        })
        if (!selected) return
        codePath = selected as string
      } catch (err) {
        setError(`Failed to open folder picker: ${err}`)
        return
      }
    }

    // 3. Run analysis
    setIsScanning(true)
    setError(null)

    try {
      const report = await invoke<CoverageReport>("analyze_coverage", {
        specFile: filePath,
        codePath,
      })
      setReport(report)
      setLastCodePath(codePath)

      // Persist results to .spec-coverage.json
      try {
        // Read existing cache to preserve other reports + overrides
        const existing = await invoke<CoverageCache | null>("read_coverage_cache", { codePath })
        const cache: CoverageCache = existing ?? {
          version: 1,
          lastScanCommit: null,
          lastScanTime: report.scannedAt,
          reports: {},
          overrides: {},
        }
        cache.lastScanTime = report.scannedAt
        cache.reports[filePath] = { requirements: report.requirements, results: report.results, summary: report.summary }
        // Merge in any in-memory overrides not yet persisted
        cache.overrides = { ...cache.overrides, ...overrides }
        await invoke("write_coverage_cache", { codePath, cache })
      } catch (cacheErr) {
        console.warn("[scan-coverage-button] Failed to write cache:", cacheErr)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setError(`Coverage scan failed: ${message}`)
    } finally {
      setIsScanning(false)
    }
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleScan}
          disabled={isScanning}
          className="h-7 px-2 gap-1.5"
          aria-label={isScanning ? t("coverage.scanningCoverage") : t("coverage.scanCoverage")}
        >
          {isScanning ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ScanSearch className="size-4" />
          )}
          <span className="text-xs hidden sm:inline">
            {isScanning ? t("coverage.scanning") : t("coverage.scanCoverage")}
          </span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {isScanning ? t("coverage.scanningCoverage") : t("coverage.scanTooltip")}
      </TooltipContent>
    </Tooltip>
  )
}
