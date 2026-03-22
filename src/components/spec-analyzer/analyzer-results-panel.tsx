import { useState } from "react"
import { ArrowUp, ChevronDown, ChevronRight, FileSearch } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { useSpecAnalyzerStore } from "@/stores/spec-analyzer-store"
import { AnalysisSummaryBar } from "@/components/spec-analyzer/analysis-summary"
import { DoSection } from "@/components/spec-analyzer/do-section"
import { DontSection } from "@/components/spec-analyzer/dont-section"
import { VerificationSection } from "@/components/spec-analyzer/verification-section"
import { ExportAnalysisButton } from "@/components/spec-analyzer/export-analysis-button"
import { cn } from "@/lib/utils"

/**
 * Collapsible results panel shown below frontmatter when analysis results exist.
 * Renders summary bar, DO/DON'T sections, verification table, and export button.
 */
export function AnalyzerResultsPanel() {
  const { t } = useTranslation()
  const report = useSpecAnalyzerStore((s) => s.report)
  const [collapsed, setCollapsed] = useState(false)

  if (!report) return null

  return (
    <div className={cn("bg-muted/20 h-full flex flex-col relative group/panel")}>
      {/* Header row */}
      <div className="flex items-center gap-2 px-3 py-1.5">
        <Button
          variant="ghost"
          size="icon"
          className="size-5 shrink-0"
          onClick={() => setCollapsed((v) => !v)}
        >
          {collapsed ? <ChevronRight className="size-3" /> : <ChevronDown className="size-3" />}
        </Button>

        <FileSearch className="size-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-foreground/80">
          {t("specAnalyzer.specAnalysis")}
        </span>
        <span className="text-[10px] text-muted-foreground truncate">
          {report.specTitle}
        </span>
        <div className="ml-auto">
          <ExportAnalysisButton report={report} />
        </div>
      </div>

      {/* Floating back-to-top button */}
      {!collapsed && (
        <Button
          variant="secondary"
          size="icon"
          className="absolute bottom-6 right-6 z-10 size-10 rounded-full shadow-lg bg-primary text-primary-foreground hover:bg-primary/90 opacity-0 group-hover/panel:opacity-70 hover:!opacity-100 transition-opacity duration-200"
          onClick={() => document.getElementById("sa-scroll-container")?.scrollTo({ top: 0, behavior: "smooth" })}
        >
          <ArrowUp className="size-4" />
        </Button>
      )}

      {/* Full-height scrollable content */}
      {!collapsed && (
        <div id="sa-scroll-container" className="flex-1 min-h-0 overflow-y-auto px-4 pb-4 space-y-3">
          <div id="sa-top" />
          <AnalysisSummaryBar summary={report.summary} analyzedAt={report.analyzedAt} />
          <DoSection items={report.doItems} />
          <DontSection items={report.dontItems} />
          <VerificationSection testCases={report.testCases} />
          {report.summary.riskAreas.length > 0 && (
            <div id="sa-risk-section" className="space-y-1 text-xs">
              <span className="text-sm font-semibold text-yellow-700 dark:text-yellow-400">{t("specAnalyzer.riskAreas")}</span>
              {report.summary.riskAreas.map((risk, i) => (
                <div key={i} className="flex items-start gap-2 bg-yellow-500/10 rounded px-2 py-1.5 border-l-2 border-l-yellow-500 ml-2">
                  <span className="text-foreground">{risk}</span>
                </div>
              ))}
            </div>
          )}

        </div>
      )}
    </div>
  )
}
