import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface FileStatusBadgeProps {
  status?: string
  priority?: string
  className?: string
}

/** Status → tailwind color mapping */
const STATUS_COLORS: Record<string, string> = {
  pending: "bg-gray-400/20 text-gray-500 border-gray-400/30",
  "in-progress": "bg-blue-400/20 text-blue-600 border-blue-400/30",
  completed: "bg-green-400/20 text-green-600 border-green-400/30",
  cancelled: "bg-red-400/20 text-red-600 border-red-400/30",
}

/** Priority → tailwind color mapping */
const PRIORITY_COLORS: Record<string, string> = {
  p0: "bg-red-400/20 text-red-600 border-red-400/30",
  p1: "bg-red-400/20 text-red-500 border-red-400/30",
  p2: "bg-yellow-400/20 text-yellow-600 border-yellow-400/30",
  p3: "bg-gray-400/20 text-gray-500 border-gray-400/30",
}

/**
 * Small colored badges shown next to file tree nodes.
 * Displays status and/or priority derived from frontmatter.
 */
export function FileStatusBadge({ status, priority, className }: FileStatusBadgeProps) {
  const statusKey = status?.toLowerCase()
  const priorityKey = priority?.toLowerCase()

  const statusColor = statusKey ? (STATUS_COLORS[statusKey] ?? STATUS_COLORS.pending) : null
  const priorityColor = priorityKey ? (PRIORITY_COLORS[priorityKey] ?? PRIORITY_COLORS.p3) : null

  if (!statusColor && !priorityColor) return null

  return (
    <span className={cn("flex items-center gap-0.5 shrink-0", className)}>
      {statusColor && (
        <Badge
          variant="outline"
          className={cn("h-3.5 px-1 text-[9px] font-medium leading-none border", statusColor)}
        >
          {statusKey}
        </Badge>
      )}
      {priorityColor && (
        <Badge
          variant="outline"
          className={cn("h-3.5 px-1 text-[9px] font-medium leading-none border", priorityColor)}
        >
          {priority?.toUpperCase()}
        </Badge>
      )}
    </span>
  )
}
