import { useEffect, useRef } from "react"
import { Loader2, Search, X } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { SearchResultItem } from "@/components/search/search-result-item"
import { useSearchStore } from "@/stores/search-store"
import { useFileOperations } from "@/hooks/use-file-operations"
import { useWorkspaceStore } from "@/stores/workspace-store"
import type { SearchResult } from "@/stores/search-store"

/**
 * Full-text search panel for the sidebar.
 * Debounces query input 300ms, invokes Rust search_files command,
 * and displays results grouped by file.
 */
export function SearchPanel() {
  const { t } = useTranslation()
  const { query, results, isSearching, setQuery, setResults, setIsSearching, clearResults } =
    useSearchStore()
  const { searchFiles } = useFileOperations()
  const projects = useWorkspaceStore((s) => s.projects)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const projectPaths = projects.map((p) => p.path)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (!query.trim()) {
      setResults([])
      setIsSearching(false)
      return
    }

    setIsSearching(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const found = await searchFiles(query, projectPaths, false)
        setResults(found)
      } catch (err) {
        console.error("[search-panel] search failed:", err)
        setResults([])
      } finally {
        setIsSearching(false)
      }
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, projectPaths.join(",")])

  // Group results by file path
  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, result) => {
    if (!acc[result.filePath]) acc[result.filePath] = []
    acc[result.filePath].push(result)
    return acc
  }, {})

  return (
    <div className="flex flex-col h-full">
      {/* Search input */}
      <div className="px-2 py-2 shrink-0">
        <div className="relative flex items-center">
          <Search className="absolute left-2.5 size-3.5 text-muted-foreground pointer-events-none" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("search.searchFiles")}
            className="pl-8 pr-8 h-7 text-xs"
          />
          {query && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 size-5"
              onClick={clearResults}
              aria-label={t("search.clearSearch")}
            >
              <X className="size-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Status row */}
      {(isSearching || results.length > 0) && (
        <div className="px-3 pb-1.5 shrink-0 flex items-center gap-2">
          {isSearching ? (
            <Loader2 className="size-3 animate-spin text-muted-foreground" />
          ) : (
            <Badge variant="secondary" className="h-4 text-[10px] px-1.5">
              {t("search.result", { count: results.length })}
            </Badge>
          )}
        </div>
      )}

      {/* Results grouped by file */}
      <ScrollArea className="flex-1 min-h-0">
        {Object.entries(grouped).map(([filePath, fileResults]) => (
          <div key={filePath} className="border-b border-border last:border-0">
            <div className="px-3 py-1 bg-muted/50 text-xs font-medium text-muted-foreground truncate sticky top-0">
              {fileResults[0].fileName}
            </div>
            {fileResults.map((result, i) => (
              <SearchResultItem key={`${filePath}-${result.lineNumber}-${i}`} result={result} />
            ))}
          </div>
        ))}

        {!isSearching && query.trim() && results.length === 0 && (
          <p className="px-3 py-4 text-xs text-muted-foreground text-center">
            {t("search.noResults", { query })}
          </p>
        )}
      </ScrollArea>
    </div>
  )
}
