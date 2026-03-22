import { Download } from "lucide-react"
import { save as saveDialog } from "@tauri-apps/plugin-dialog"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useSpecAnalyzer } from "@/hooks/use-spec-analyzer"
import { useActiveProject } from "@/hooks/use-active-project"
import type { SpecAnalysisReport } from "@/types/spec-analyzer-types"

interface ExportAnalysisButtonProps {
  report: SpecAnalysisReport
}

/**
 * Button to export analysis results as a structured markdown file.
 */
export function ExportAnalysisButton({ report }: ExportAnalysisButtonProps) {
  const { t } = useTranslation()
  const activeProject = useActiveProject()
  const { exportAnalysis } = useSpecAnalyzer(activeProject?.path ?? null)

  async function handleExport() {
    try {
      const slug = report.specTitle
        .toLowerCase()
        .replace(/[^a-z0-9\u4e00-\u9fff]+/gi, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 40)
      const date = new Date().toISOString().slice(0, 10).replace(/-/g, "")
      const defaultName = `spec-analysis-${date}-${slug}.md`

      const defaultPath = activeProject?.path
        ? `${activeProject.path}/plans/${defaultName}`
        : defaultName

      const selected = await saveDialog({
        defaultPath,
        filters: [{ name: "Markdown", extensions: ["md"] }],
      })
      if (!selected) return

      await exportAnalysis(report, selected)
      // Stay on current view — analysis panel already showing
    } catch (err) {
      console.error("[export-analysis] Failed:", err)
    }
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExport}
          className="h-7 px-2 gap-1.5"
        >
          <Download className="size-3.5" />
          <span className="text-xs">{t("specAnalyzer.exportAnalysis")}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>{t("specAnalyzer.exportAnalysis")}</TooltipContent>
    </Tooltip>
  )
}
