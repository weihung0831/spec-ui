import React from "react"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { useWorkspaceStore } from "@/stores/workspace-store"
import { useSpecAnalyzerStore } from "@/stores/spec-analyzer-store"

interface BreadcrumbNavProps {
  filePath: string | null
}

/**
 * Shows Project > Folder > File breadcrumb for the active file.
 * Each segment is derived from the active project path.
 */
export function BreadcrumbNav({ filePath }: BreadcrumbNavProps) {
  const projects = useWorkspaceStore((s) => s.projects)
  const activeProjectId = useWorkspaceStore((s) => s.activeProjectId)
  const report = useSpecAnalyzerStore((s) => s.report)

  if (!filePath) return null
  // Hide breadcrumb when viewing analysis results
  if (report?.specFile === filePath) return null

  const activeProject = projects.find((p) => p.id === activeProjectId)
  if (!activeProject) return null

  // Compute relative path segments after project root
  const projectPath = activeProject.path.replace(/\\/g, "/").replace(/\/$/, "")
  const normalizedFile = filePath.replace(/\\/g, "/")
  const relative = normalizedFile.startsWith(projectPath + "/")
    ? normalizedFile.slice(projectPath.length + 1)
    : normalizedFile

  const segments = relative.split("/").filter(Boolean)
  const fileName = segments[segments.length - 1] ?? relative
  const middleSegments = segments.slice(0, -1)

  return (
    <Breadcrumb className="px-3 py-1 border-b border-border bg-background/50 shrink-0">
      <BreadcrumbList className="text-xs">
        {/* Project root */}
        <BreadcrumbItem>
          <BreadcrumbLink
            href="#"
            className="text-xs text-muted-foreground hover:text-foreground"
            onClick={(e) => e.preventDefault()}
          >
            {activeProject.name}
          </BreadcrumbLink>
        </BreadcrumbItem>

        {/* Intermediate folders */}
        {middleSegments.map((seg) => (
          <React.Fragment key={seg}>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink
                href="#"
                className="text-xs text-muted-foreground hover:text-foreground"
                onClick={(e) => e.preventDefault()}
              >
                {seg}
              </BreadcrumbLink>
            </BreadcrumbItem>
          </React.Fragment>
        ))}

        {/* File name (current page) */}
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage className="text-xs font-medium">{fileName}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  )
}
