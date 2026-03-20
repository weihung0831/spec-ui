import { useMemo } from "react"

export interface ProgressInfo {
  total: number
  completed: number
  percentage: number
}

/**
 * Parses markdown content for checkbox progress.
 * Counts `- [x]` (completed) and `- [ ]` (pending) at any nesting level.
 */
export function useProgressParser(content: string): ProgressInfo {
  return useMemo(() => {
    // Match both `- [x]` and `- [ ]` with optional leading whitespace (nested lists)
    const completedMatches = content.match(/^\s*[-*]\s+\[x\]/gim) ?? []
    const pendingMatches = content.match(/^\s*[-*]\s+\[ \]/gim) ?? []

    const completed = completedMatches.length
    const pending = pendingMatches.length
    const total = completed + pending

    const percentage = total === 0 ? 0 : Math.round((completed / total) * 100)

    return { total, completed, percentage }
  }, [content])
}
