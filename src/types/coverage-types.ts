/** Coverage status for a single requirement */
export type CoverageStatus = "implemented" | "partial" | "notImplemented" | "unknown"

/** A single parsed requirement extracted from a spec file */
export interface RequirementInfo {
  id: string
  name: string
  description: string
  /** "openspec" for `## Requirement:` headings, "checkbox" for `- [ ]` items */
  reqType: "openspec" | "checkbox"
  lineStart: number
  lineEnd: number
  /** GIVEN/WHEN/THEN scenario strings (openspec only) */
  scenarios: string[]
}

/** A matched source code location */
export interface CodeMatch {
  filePath: string
  lineStart: number
  lineEnd: number
  snippet: string
}

/** Coverage analysis result for one requirement */
export interface CoverageResult {
  requirementId: string
  status: CoverageStatus
  /** Confidence score 0-100 */
  confidence: number
  matchedFiles: CodeMatch[]
  reasoning: string
}

/** Aggregate coverage statistics */
export interface CoverageSummary {
  total: number
  implemented: number
  partial: number
  notImplemented: number
  unknown: number
  coveragePercent: number
}

/** Full coverage report for a spec file scanned against a code path */
export interface CoverageReport {
  specFile: string
  codePath: string
  /** ISO 8601 timestamp */
  scannedAt: string
  requirements: RequirementInfo[]
  results: CoverageResult[]
  summary: CoverageSummary
}
