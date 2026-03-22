import { useState } from "react"
import { Loader2, FileSearch, Languages } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import {
  AlertDialog, AlertDialogAction, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useSpecAnalyzerStore } from "@/stores/spec-analyzer-store"
import { useSpecAnalyzer } from "@/hooks/use-spec-analyzer"
import { useFileOperations } from "@/hooks/use-file-operations"
import { useActiveProject } from "@/hooks/use-active-project"

interface AnalyzeSpecButtonProps {
  filePath: string
}

export function AnalyzeSpecButton({ filePath }: AnalyzeSpecButtonProps) {
  const { t, i18n } = useTranslation()
  const isAnalyzing = useSpecAnalyzerStore((s) => s.isAnalyzing)
  const hasReport = useSpecAnalyzerStore((s) => !!s.report)
  const reportLocale = useSpecAnalyzerStore((s) => s.report?.locale)
  const needsTranslation = hasReport && (!reportLocale || reportLocale !== i18n.language)
  const activeProject = useActiveProject()
  const { analyzeSpec, translateReport } = useSpecAnalyzer(activeProject?.path ?? null)
  const { checkClaudeCli } = useFileOperations()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  async function handleAnalyze() {
    if (isAnalyzing) return
    try {
      const cliInfo = await checkClaudeCli().catch(() => ({ available: false }))
      if (!cliInfo.available) {
        setErrorMsg(t("coverage.cliNotInstalled"))
        return
      }
    } catch {
      setErrorMsg(t("coverage.cliCheckFailed"))
      return
    }
    const result = await analyzeSpec(filePath)
    if (!result) {
      const err = useSpecAnalyzerStore.getState().error
      if (err) setErrorMsg(err)
    }
  }

  async function handleTranslate() {
    if (isAnalyzing) return
    const result = await translateReport(filePath)
    if (!result) {
      const err = useSpecAnalyzerStore.getState().error
      if (err) setErrorMsg(err)
    }
  }

  return (
    <>
      <div className="flex items-center gap-0.5">
        {needsTranslation && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" onClick={handleTranslate}
                disabled={isAnalyzing} className="h-7 px-2 gap-1.5">
                {isAnalyzing ? <Loader2 className="size-4 animate-spin" /> : <Languages className="size-4" />}
                <span className="text-xs hidden sm:inline">
                  {isAnalyzing ? t("specAnalyzer.translating") : t("specAnalyzer.translate")}
                </span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t("specAnalyzer.translate")}</TooltipContent>
          </Tooltip>
        )}

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" onClick={handleAnalyze}
              disabled={isAnalyzing} className="h-7 px-2 gap-1.5">
              {!hasReport && isAnalyzing
                ? <Loader2 className="size-4 animate-spin" />
                : <FileSearch className="size-4" />}
              <span className="text-xs hidden sm:inline">
                {!hasReport && isAnalyzing ? t("specAnalyzer.analyzing") : t("specAnalyzer.analyzeSpec")}
              </span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t("specAnalyzer.analyzeTooltip")}</TooltipContent>
        </Tooltip>
      </div>

      <AlertDialog open={!!errorMsg} onOpenChange={(open) => { if (!open) setErrorMsg(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("specAnalyzer.analyzeSpec")}</AlertDialogTitle>
            <AlertDialogDescription>{errorMsg}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setErrorMsg(null)}>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
