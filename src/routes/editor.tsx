import { createFileRoute } from "@tanstack/react-router"
import { FileText } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useWorkspaceStore } from "@/stores/workspace-store"
import { useTheme } from "@/hooks/use-theme"
import { EditorPanel } from "@/components/editor/editor-panel"

export const Route = createFileRoute("/editor")({
  component: EditorPage,
})

function EditorPage() {
  const { t } = useTranslation()
  const selectedFilePath = useWorkspaceStore((s) => s.selectedFilePath)
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"

  if (selectedFilePath) {
    return (
      <div className="flex flex-col h-full w-full overflow-hidden">
        <EditorPanel filePath={selectedFilePath} isDark={isDark} />
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <FileText className="size-10 text-muted-foreground opacity-40" />
      <p className="text-sm text-muted-foreground">
        {t("editor.selectFile")}
      </p>
    </div>
  )
}
