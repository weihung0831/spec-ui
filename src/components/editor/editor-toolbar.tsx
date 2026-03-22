import { Save, Columns2, AlignLeft, AlignRight } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useEditorStore, type PreviewMode } from "@/stores/editor-store"
import { useSpecAnalyzerStore } from "@/stores/spec-analyzer-store"
import { ScanCoverageButton } from "@/components/coverage/scan-coverage-button"
import { AnalyzeSpecButton } from "@/components/spec-analyzer/analyze-spec-button"
import { cn } from "@/lib/utils"

interface EditorToolbarProps {
  filePath: string
  onSave: () => void
}

/**
 * Toolbar showing file name, unsaved indicator, save button, and preview mode toggles.
 */
export function EditorToolbar({ filePath, onSave }: EditorToolbarProps) {
  const { t } = useTranslation()
  const previewMode = useEditorStore((s) => s.previewMode)
  const setPreviewMode = useEditorStore((s) => s.setPreviewMode)
  const isUnsaved = useEditorStore((s) => s.isUnsaved(filePath))
  const hasAnalysis = useSpecAnalyzerStore((s) => !!s.report)

  const analysisTitle = useSpecAnalyzerStore((s) => s.report?.specTitle)
  const fileName = analysisTitle || (filePath.split("/").pop() ?? filePath)

  const modeButtons: { mode: PreviewMode; icon: React.ReactNode; labelKey: string }[] = [
    { mode: "editor-only", icon: <AlignLeft className="size-4" />, labelKey: "editor.editorOnly" },
    { mode: "split", icon: <Columns2 className="size-4" />, labelKey: "editor.splitView" },
    { mode: "preview-only", icon: <AlignRight className="size-4" />, labelKey: "editor.previewOnly" },
  ]

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border bg-background shrink-0">
      {/* File name + unsaved dot */}
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground min-w-0 flex-1">
        <span className="font-mono truncate">{fileName}</span>
        {isUnsaved && (
          <span
            className="size-1.5 rounded-full bg-primary shrink-0"
            title={t("editor.unsavedChanges")}
            aria-label={t("editor.unsavedChanges")}
          />
        )}
      </div>

      {/* Save button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={onSave}
            className={cn("h-7 px-2", isUnsaved && "text-primary")}
            aria-label={t("editor.saveFile")}
          >
            <Save className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{t("editor.saveShortcut")}</TooltipContent>
      </Tooltip>

      <ScanCoverageButton filePath={filePath} />
      <AnalyzeSpecButton filePath={filePath} />

      {/* Preview mode toggles — hidden when analysis panel is active */}
      {!hasAnalysis && (
        <>
          <Separator orientation="vertical" className="h-4" />
          <div className="flex items-center gap-0.5">
            {modeButtons.map(({ mode, icon, labelKey }) => (
              <Tooltip key={mode}>
                <TooltipTrigger asChild>
                  <Button
                    variant={previewMode === mode ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setPreviewMode(mode)}
                    className="h-7 w-7 p-0"
                    aria-label={t(labelKey)}
                    aria-pressed={previewMode === mode}
                  >
                    {icon}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t(labelKey)}</TooltipContent>
              </Tooltip>
            ))}
          </div>
        </>
      )}

    </div>
  )
}
