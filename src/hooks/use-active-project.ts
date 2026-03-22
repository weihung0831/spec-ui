import { useWorkspaceStore } from "@/stores/workspace-store"

/** Derived selector: returns the currently active project or undefined. */
export function useActiveProject() {
  const activeProjectId = useWorkspaceStore((s) => s.activeProjectId)
  const projects = useWorkspaceStore((s) => s.projects)
  return projects.find((p) => p.id === activeProjectId)
}
