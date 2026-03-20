import { useTranslation } from "react-i18next"
import type { CoverageSummary } from "@/types/coverage-types"
import { cn } from "@/lib/utils"
import { formatRelativeTime } from "@/hooks/use-coverage-cache"

interface CoverageSummaryProps {
  summary: CoverageSummary | null
  scannedAt?: string | null
}

function getProgressColor(percent: number): string {
  if (percent > 70) return "bg-green-500"
  if (percent >= 30) return "bg-yellow-500"
  return "bg-red-500"
}

function getTextColor(percent: number): string {
  if (percent > 70) return "text-green-700 dark:text-green-400"
  if (percent >= 30) return "text-yellow-700 dark:text-yellow-400"
  return "text-red-700 dark:text-red-400"
}

/**
 * Compact inline coverage summary bar shown in frontmatter header.
 * Displays "Coverage: X/Y (Z%)" with a small colored progress bar.
 * Renders nothing when summary is null.
 */
export function CoverageSummary({ summary, scannedAt }: CoverageSummaryProps) {
  const { t } = useTranslation()

  if (!summary) return null

  const { implemented, total, coveragePercent } = summary
  const pct = Math.round(coveragePercent)
  const lastScanned = scannedAt ? formatRelativeTime(scannedAt) : null

  return (
    <div className="flex items-center gap-2 text-xs flex-wrap">
      <span className="font-medium text-foreground/60">{t("coverage.coverage")}</span>
      <span className={cn("font-mono font-medium", getTextColor(pct))}>
        {implemented}/{total} ({pct}%)
      </span>

      {/* Small progress bar */}
      <div className="flex-1 max-w-24 h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", getProgressColor(pct))}
          style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Coverage ${pct}%`}
        />
      </div>

      {lastScanned && (
        <span className="text-foreground/40 ml-1">{t("coverage.lastScanned", { time: lastScanned })}</span>
      )}
    </div>
  )
}
