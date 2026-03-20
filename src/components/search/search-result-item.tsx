import { useWorkspaceStore } from "@/stores/workspace-store"
import type { SearchResult } from "@/stores/search-store"
import { cn } from "@/lib/utils"

interface SearchResultItemProps {
  result: SearchResult
}

/**
 * Renders a single search result row: line number + content with match highlighted.
 * Click → selectFile in workspace store.
 */
export function SearchResultItem({ result }: SearchResultItemProps) {
  const selectFile = useWorkspaceStore((s) => s.selectFile)

  const { lineNumber, lineContent, matchStart, matchEnd } = result
  const before = lineContent.slice(0, matchStart)
  const match = lineContent.slice(matchStart, matchEnd)
  const after = lineContent.slice(matchEnd)

  return (
    <button
      type="button"
      onClick={() => selectFile(result.filePath)}
      className={cn(
        "w-full text-left px-3 py-1.5 flex items-start gap-2 hover:bg-accent hover:text-accent-foreground",
        "text-xs font-mono transition-colors",
      )}
    >
      <span className="shrink-0 text-muted-foreground w-8 text-right tabular-nums select-none">
        {lineNumber}
      </span>
      <span className="truncate text-foreground/80">
        {before}
        <mark className="bg-yellow-300/60 text-foreground rounded-sm px-0.5">{match}</mark>
        {after}
      </span>
    </button>
  )
}
