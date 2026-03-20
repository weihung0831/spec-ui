use serde::{Deserialize, Serialize};

/// Coverage status for a single requirement
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub enum CoverageStatus {
    Implemented,
    Partial,
    NotImplemented,
    Unknown,
}

/// A single parsed requirement from a spec file
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct RequirementInfo {
    pub id: String,
    pub name: String,
    pub description: String,
    pub req_type: String, // "openspec" | "checkbox"
    pub line_start: usize,
    pub line_end: usize,
    pub scenarios: Vec<String>,
}

/// A matched source code location
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CodeMatch {
    pub file_path: String,
    pub line_start: usize,
    pub line_end: usize,
    pub snippet: String,
}

/// Coverage analysis result for one requirement
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CoverageResult {
    pub requirement_id: String,
    pub status: CoverageStatus,
    pub confidence: u8, // 0-100
    pub matched_files: Vec<CodeMatch>,
    pub reasoning: String,
}

/// Aggregate coverage statistics
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CoverageSummary {
    pub total: usize,
    pub implemented: usize,
    pub partial: usize,
    pub not_implemented: usize,
    pub unknown: usize,
    pub coverage_percent: f32,
}

/// Full coverage report for a spec file against a code path
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CoverageReport {
    pub spec_file: String,
    pub code_path: String,
    pub scanned_at: String, // ISO 8601
    pub requirements: Vec<RequirementInfo>,
    pub results: Vec<CoverageResult>,
    pub summary: CoverageSummary,
}

/// Persisted cache for a single spec report (results + summary only)
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CachedReport {
    #[serde(default)]
    pub requirements: Vec<RequirementInfo>,
    pub results: Vec<CoverageResult>,
    pub summary: CoverageSummary,
}

/// A manual override entry persisted in cache
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CoverageOverride {
    pub status: String,
    pub note: String,
    pub overridden_at: String,
}

/// Top-level cache file written to .spec-coverage.json
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CoverageCache {
    pub version: u32,
    pub last_scan_commit: Option<String>,
    pub last_scan_time: String,
    pub reports: std::collections::HashMap<String, CachedReport>,
    pub overrides: std::collections::HashMap<String, CoverageOverride>,
}
