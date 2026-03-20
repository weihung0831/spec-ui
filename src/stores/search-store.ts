import { create } from "zustand"

export interface SearchResult {
  filePath: string
  fileName: string
  lineNumber: number
  lineContent: string
  matchStart: number
  matchEnd: number
}

interface SearchState {
  query: string
  results: SearchResult[]
  isSearching: boolean
  setQuery: (q: string) => void
  setResults: (results: SearchResult[]) => void
  setIsSearching: (v: boolean) => void
  clearResults: () => void
}

/**
 * Zustand store for full-text search state.
 * Results are grouped by file in the UI layer (search-panel).
 */
export const useSearchStore = create<SearchState>((set) => ({
  query: "",
  results: [],
  isSearching: false,

  setQuery: (q) => set({ query: q }),
  setResults: (results) => set({ results }),
  setIsSearching: (v) => set({ isSearching: v }),
  clearResults: () => set({ results: [], query: "" }),
}))
