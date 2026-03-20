import { Trash2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { useWorkspaceStore } from "@/stores/workspace-store"
import { AddProjectButton } from "@/components/workspace/add-project-dialog"

/**
 * Dropdown to switch between workspace projects.
 * Shows project name (folder name). Bottom "+ Add Project" button.
 */
export function ProjectSelector() {
  const { t } = useTranslation()
  const projects = useWorkspaceStore((s) => s.projects)
  const activeProjectId = useWorkspaceStore((s) => s.activeProjectId)
  const setActiveProject = useWorkspaceStore((s) => s.setActiveProject)
  const removeProject = useWorkspaceStore((s) => s.removeProject)

  return (
    <div className="flex flex-col gap-1 p-2">
      <Select
        value={activeProjectId ?? ""}
        onValueChange={setActiveProject}
        disabled={projects.length === 0}
      >
        <SelectTrigger className="w-full text-sm">
          <SelectValue placeholder={t("fileTree.noProjectSelected")} />
        </SelectTrigger>
        <SelectContent>
          {projects.map((project) => (
            <div key={project.id} className="flex items-center gap-1 pr-1">
              <SelectItem value={project.id} className="flex-1">
                {project.name}
              </SelectItem>
              <Button
                variant="ghost"
                size="icon"
                className="size-6 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation()
                  removeProject(project.id)
                }}
                title={`Remove ${project.name}`}
              >
                <Trash2 className="size-3" />
              </Button>
            </div>
          ))}
        </SelectContent>
      </Select>

      <Separator className="my-1" />
      <AddProjectButton />
    </div>
  )
}
