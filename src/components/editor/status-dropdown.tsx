import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { useFileOperations } from "@/hooks/use-file-operations"
import { useEditorStore } from "@/stores/editor-store"
import { cn } from "@/lib/utils"

const STATUS_OPTIONS = ["pending", "in-progress", "completed", "cancelled"] as const
type Status = (typeof STATUS_OPTIONS)[number]

const STATUS_COLORS: Record<Status, string> = {
  pending: "bg-gray-400/20 text-gray-500 border-gray-400/30",
  "in-progress": "bg-blue-400/20 text-blue-600 border-blue-400/30",
  completed: "bg-green-400/20 text-green-600 border-green-400/30",
  cancelled: "bg-red-400/20 text-red-600 border-red-400/30",
}

interface StatusDropdownProps {
  filePath: string
  currentStatus?: string
}

/**
 * Clickable status badge that opens a dropdown to change frontmatter status.
 * On select: calls update_frontmatter Tauri command and refreshes editor content.
 */
export function StatusDropdown({ filePath, currentStatus }: StatusDropdownProps) {
  const { updateFrontmatter, readFile } = useFileOperations()
  const openFile = useEditorStore((s) => s.openFile)

  const statusKey = (currentStatus?.toLowerCase() ?? "pending") as Status
  const colorClass = STATUS_COLORS[statusKey] ?? STATUS_COLORS.pending

  const handleSelect = async (newStatus: Status) => {
    if (newStatus === statusKey) return
    try {
      await updateFrontmatter(filePath, "status", newStatus)
      // Reload file content so editor + preview stay in sync
      const fresh = await readFile(filePath)
      openFile(filePath, fresh)
    } catch (err) {
      console.error("[status-dropdown] update failed:", err)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Badge
          variant="outline"
          className={cn(
            "h-3.5 px-1 text-[9px] font-medium leading-none border cursor-pointer hover:opacity-80",
            colorClass,
          )}
        >
          {statusKey}
        </Badge>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[130px]">
        {STATUS_OPTIONS.map((s) => (
          <DropdownMenuItem
            key={s}
            onClick={() => handleSelect(s)}
            className={cn("text-xs gap-2", s === statusKey && "font-semibold")}
          >
            <span
              className={cn(
                "size-2 rounded-full border",
                STATUS_COLORS[s].replace(/text-\S+/g, "").replace("bg-", "bg-"),
              )}
            />
            {s}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
