use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Priority level for test cases
#[derive(Debug, Serialize, Deserialize, Clone)]
pub enum TestPriority {
    P0,
    P1,
    P2,
}

/// Category for DO items
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub enum DoCategory {
    DataLayer,
    BackendLogic,
    ApiRoutes,
    Frontend,
    Integration,
    Other,
}

/// Category for DON'T items
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub enum DontCategory {
    Excluded,
    Constraints,
    AntiPatterns,
}

/// A single actionable DO item
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DoItem {
    pub id: String,
    pub category: DoCategory,
    pub description: String,
    pub file_path: Option<String>,
    pub source_section: String,
    pub source_line: usize,
}

/// A single DON'T item
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DontItem {
    pub id: String,
    pub category: DontCategory,
    pub description: String,
    pub source_section: String,
    pub source_line: usize,
}

/// A single test case in the verification matrix
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct TestCase {
    pub id: String,
    pub area: String,
    pub scenario: String,
    pub expected_result: String,
    pub priority: TestPriority,
    pub source_section: String,
}

/// Aggregate counts for the analysis summary
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct AnalysisSummary {
    pub do_count: usize,
    pub dont_count: usize,
    pub test_count: usize,
    pub risk_areas: Vec<String>,
    pub suggested_order: Vec<String>,
    pub unresolved_items: Vec<String>,
}

/// Full spec analysis report
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SpecAnalysisReport {
    pub spec_file: String,
    pub spec_title: String,
    pub analyzed_at: String,
    #[serde(default)]
    pub locale: Option<String>,
    pub do_items: Vec<DoItem>,
    pub dont_items: Vec<DontItem>,
    pub test_cases: Vec<TestCase>,
    pub summary: AnalysisSummary,
}

/// Cache wrapper for persisting analysis results
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SpecAnalysisCache {
    pub version: u32,
    pub last_analysis_time: String,
    pub reports: HashMap<String, SpecAnalysisReport>,
}
