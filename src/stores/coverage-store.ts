import { create } from "zustand"
import type { CoverageReport } from "../types/coverage-types"

/** A manual override persisted in .spec-coverage.json */
export interface CoverageOverride {
  status: string
  note: string
  overriddenAt: string
}

interface CoverageState {
  report: CoverageReport | null
  isScanning: boolean
  error: string | null
  /** Manual overrides keyed by requirementId */
  overrides: Record<string, CoverageOverride>
  /** Code path used for the current report (needed by cache commands) */
  lastCodePath: string | null

  setReport: (report: CoverageReport | null) => void
  setIsScanning: (v: boolean) => void
  setError: (error: string | null) => void
  clearReport: () => void
  setOverrides: (overrides: Record<string, CoverageOverride>) => void
  setLastCodePath: (path: string | null) => void
  applyOverride: (requirementId: string, override: CoverageOverride) => void
  removeOverride: (requirementId: string) => void
}

export const useCoverageStore = create<CoverageState>((set) => ({
  report: null,
  isScanning: false,
  error: null,
  overrides: {},
  lastCodePath: null,

  setReport: (report) => set({ report }),
  setIsScanning: (v) => set({ isScanning: v }),
  setError: (error) => set({ error }),
  clearReport: () => set({ report: null, error: null, isScanning: false }),
  setOverrides: (overrides) => set({ overrides }),
  setLastCodePath: (path) => set({ lastCodePath: path }),
  applyOverride: (requirementId, override) =>
    set((state) => ({
      overrides: { ...state.overrides, [requirementId]: override },
    })),
  removeOverride: (requirementId) =>
    set((state) => {
      const next = { ...state.overrides }
      delete next[requirementId]
      return { overrides: next }
    }),
}))
