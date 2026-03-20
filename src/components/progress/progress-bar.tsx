import { cn } from "@/lib/utils"

interface ProgressBarProps {
  value: number
  max: number
  className?: string
}

/**
 * Reusable animated progress bar.
 * Color: <30% red, 30-70% yellow, >70% green.
 */
export function ProgressBar({ value, max, className }: ProgressBarProps) {
  const percentage = max === 0 ? 0 : Math.round((value / max) * 100)
  const clamped = Math.min(100, Math.max(0, percentage))

  const colorClass =
    clamped < 30
      ? "bg-red-500"
      : clamped <= 70
        ? "bg-yellow-500"
        : "bg-green-500"

  return (
    <div
      className={cn("h-2 w-full rounded-full bg-muted overflow-hidden", className)}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn("h-full rounded-full transition-all duration-500 ease-in-out", colorClass)}
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}
