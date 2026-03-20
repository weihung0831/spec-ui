import { useState } from "react"
import { ChevronDown, ChevronRight } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FileStatusBadge } from "@/components/file-tree/file-status-badge"
import { StatusDropdown } from "@/components/editor/status-dropdown"
import { ProgressTracker } from "@/components/progress/progress-tracker"
import { CoverageSummary } from "@/components/coverage/coverage-summary"
import { useCoverageStore } from "@/stores/coverage-store"
import { cn } from "@/lib/utils"
import type { Frontmatter } from "@/types/file-types"

interface FrontmatterHeaderProps {
  frontmatter: Frontmatter
  /** Full file content for progress parsing */
  content: string
  /** File path needed for status update via Tauri */
  filePath?: string
  className?: string
}

/**
 * Collapsible header shown at top of editor when file has frontmatter.
 * Displays title, status/priority badges, effort, tags, and progress bar.
 */
export function FrontmatterHeader({ frontmatter, content, filePath, className }: FrontmatterHeaderProps) {
  const { t } = useTranslation()
  const [collapsed, setCollapsed] = useState(false)
  const coverageSummary = useCoverageStore((s) => s.report?.summary ?? null)
  const scannedAt = useCoverageStore((s) => s.report?.scannedAt ?? null)

  const { title, status, priority, effort, tags } = frontmatter

  // Nothing to show if no meaningful frontmatter fields
  if (!title && !status && !priority && !effort && (!tags || tags.length === 0)) return null

  return (
    <div className={cn("border-b border-border bg-muted/30 shrink-0", className)}>
      {/* Toggle row */}
      <div className="flex items-center gap-2 px-3 py-1.5">
        <Button
          variant="ghost"
          size="icon"
          className="size-5 shrink-0"
          onClick={() => setCollapsed((v) => !v)}
          aria-label={collapsed ? t("frontmatter.expandFrontmatter") : t("frontmatter.collapseFrontmatter")}
        >
          {collapsed ? <ChevronRight className="size-3" /> : <ChevronDown className="size-3" />}
        </Button>

        {/* Always-visible summary */}
        <span className="text-xs font-medium truncate text-foreground/80">
          {title ?? t("frontmatter.frontmatter")}
        </span>

        <span className="ml-auto flex items-center gap-0.5">
          {filePath && status ? (
            <StatusDropdown filePath={filePath} currentStatus={status} />
          ) : (
            <FileStatusBadge status={status} priority={priority} />
          )}
          {filePath && status && priority && (
            <FileStatusBadge priority={priority} />
          )}
        </span>
      </div>

      {/* Expanded detail */}
      {!collapsed && (
        <div className="px-3 pb-2 flex flex-col gap-1.5">
          {effort && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="font-medium text-foreground/60">{t("frontmatter.effort")}</span>
              <span>{effort}</span>
            </div>
          )}

          {tags && tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="h-4 px-1.5 text-[10px] font-normal"
                >
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          <ProgressTracker content={content} />
          <CoverageSummary summary={coverageSummary} scannedAt={scannedAt} />
        </div>
      )}
    </div>
  )
}
