import { create } from "zustand"
import type { SpecAnalysisReport } from "../types/spec-analyzer-types"

interface SpecAnalyzerState {
  report: SpecAnalysisReport | null
  isAnalyzing: boolean
  error: string | null

  setReport: (report: SpecAnalysisReport | null) => void
  setIsAnalyzing: (v: boolean) => void
  setError: (error: string | null) => void
  clearReport: () => void
}

export const useSpecAnalyzerStore = create<SpecAnalyzerState>((set) => ({
  report: null,
  isAnalyzing: false,
  error: null,

  setReport: (report) => set({ report }),
  setIsAnalyzing: (v) => set({ isAnalyzing: v }),
  setError: (error) => set({ error }),
  clearReport: () => set({ report: null, error: null, isAnalyzing: false }),
}))
