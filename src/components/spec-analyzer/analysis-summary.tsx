import { useTranslation } from "react-i18next"
import { Badge } from "@/components/ui/badge"
import type { AnalysisSummary } from "@/types/spec-analyzer-types"
import { cn } from "@/lib/utils"

interface AnalysisSummaryBarProps {
  summary: AnalysisSummary
  analyzedAt: string
}

function scrollTo(id: string) {
  const el = document.getElementById(id)
  const container = document.getElementById("sa-scroll-container")
  if (el && container) {
    const top = el.offsetTop - container.offsetTop
    container.scrollTo({ top, behavior: "smooth" })
  }
}

/**
 * Compact summary bar with clickable badges that scroll to corresponding sections.
 */
export function AnalysisSummaryBar({ summary, analyzedAt }: AnalysisSummaryBarProps) {
  const { t } = useTranslation()
  const timeLabel = new Date(analyzedAt).toLocaleDateString(undefined, { year: "numeric", month: "2-digit", day: "2-digit" })

  return (
    <div className="flex items-center gap-2 text-xs flex-wrap">
      <Badge
        variant="outline"
        className={cn("h-5 font-mono cursor-pointer hover:opacity-80", summary.doCount > 0 && "border-green-500/50 text-green-700 dark:text-green-400")}
        onClick={() => scrollTo("sa-do-section")}
      >
        {t("specAnalyzer.doCount", { count: summary.doCount })}
      </Badge>
      <Badge
        variant="outline"
        className={cn("h-5 font-mono cursor-pointer hover:opacity-80", summary.dontCount > 0 && "border-red-500/50 text-red-700 dark:text-red-400")}
        onClick={() => scrollTo("sa-dont-section")}
      >
        {t("specAnalyzer.dontCount", { count: summary.dontCount })}
      </Badge>
      <Badge
        variant="outline"
        className={cn("h-5 font-mono cursor-pointer hover:opacity-80", summary.testCount > 0 && "border-blue-500/50 text-blue-700 dark:text-blue-400")}
        onClick={() => scrollTo("sa-verification-section")}
      >
        {t("specAnalyzer.testCount", { count: summary.testCount })}
      </Badge>

      {summary.riskAreas.length > 0 && (
        <Badge
          variant="outline"
          className="h-5 cursor-pointer hover:opacity-80 border-yellow-500/50 text-yellow-700 dark:text-yellow-400"
          onClick={() => scrollTo("sa-risk-section")}
        >
          {summary.riskAreas.length} {t("specAnalyzer.riskAreas").toLowerCase()}
        </Badge>
      )}

      <span className="text-foreground/40 ml-auto">
        {t("specAnalyzer.lastAnalyzed", { time: timeLabel })}
      </span>
    </div>
  )
}
