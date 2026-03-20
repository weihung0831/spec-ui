import { open } from "@tauri-apps/plugin-dialog"
import { useTranslation } from "react-i18next"
import { FolderOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useWorkspaceStore } from "@/stores/workspace-store"

/**
 * Triggers the Tauri native folder picker.
 * On selection, adds the chosen path to the workspace store.
 */
export function AddProjectButton() {
  const { t } = useTranslation()
  const addProject = useWorkspaceStore((s) => s.addProject)

  const handleClick = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: t("fileTree.selectProjectFolder"),
      })
      if (typeof selected === "string" && selected.length > 0) {
        addProject(selected)
      }
    } catch {
      // Native dialog unavailable (dev/web preview) — silently ignore
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
      onClick={handleClick}
    >
      <FolderOpen className="size-4" />
      {t("fileTree.addProject")}
    </Button>
  )
}
