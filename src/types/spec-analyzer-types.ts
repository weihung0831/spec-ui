/** Priority level for test cases */
export type TestPriority = "P0" | "P1" | "P2"

/** Category for DO items */
export type DoCategory =
  | "dataLayer"
  | "backendLogic"
  | "apiRoutes"
  | "frontend"
  | "integration"
  | "other"

/** Category for DON'T items */
export type DontCategory =
  | "excluded"
  | "constraints"
  | "antiPatterns"

/** A single actionable DO item */
export interface DoItem {
  id: string
  category: DoCategory
  description: string
  filePath: string | null
  sourceSection: string
  sourceLine: number
}

/** A single DON'T item */
export interface DontItem {
  id: string
  category: DontCategory
  description: string
  sourceSection: string
  sourceLine: number
}

/** A single test case in the verification matrix */
export interface TestCase {
  id: string
  area: string
  scenario: string
  expectedResult: string
  priority: TestPriority
  sourceSection: string
}

/** Aggregate counts for the analysis summary */
export interface AnalysisSummary {
  doCount: number
  dontCount: number
  testCount: number
  riskAreas: string[]
  suggestedOrder: string[]
  unresolvedItems: string[]
}

/** Full spec analysis report */
export interface SpecAnalysisReport {
  specFile: string
  specTitle: string
  analyzedAt: string
  locale?: string
  doItems: DoItem[]
  dontItems: DontItem[]
  testCases: TestCase[]
  summary: AnalysisSummary
}

/** Cache wrapper for persisting analysis results */
export interface SpecAnalysisCache {
  version: number
  lastAnalysisTime: string
  reports: Record<string, SpecAnalysisReport>
}
