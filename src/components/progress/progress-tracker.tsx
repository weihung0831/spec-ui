import { useProgressParser } from "@/hooks/use-progress-parser"
import { ProgressBar } from "@/components/progress/progress-bar"
import { cn } from "@/lib/utils"

interface ProgressTrackerProps {
  content: string
  className?: string
}

/**
 * Displays checkbox completion progress parsed from markdown content.
 * Shows "completed/total (percentage%)" label + colored progress bar.
 */
export function ProgressTracker({ content, className }: ProgressTrackerProps) {
  const { total, completed, percentage } = useProgressParser(content)

  if (total === 0) return null

  const labelColor =
    percentage < 30
      ? "text-red-500"
      : percentage <= 70
        ? "text-yellow-500"
        : "text-green-500"

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Progress</span>
        <span className={cn("font-medium tabular-nums", labelColor)}>
          {completed}/{total} ({percentage}%)
        </span>
      </div>
      <ProgressBar value={completed} max={total} />
    </div>
  )
}
