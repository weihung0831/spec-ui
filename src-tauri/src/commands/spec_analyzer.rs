use chrono::Utc;
use serde::Deserialize;

use crate::models::spec_analyzer::{
    AnalysisSummary, DoCategory, DoItem, DontCategory, DontItem, SpecAnalysisCache,
    SpecAnalysisReport, TestCase, TestPriority,
};
use crate::process_utils::run_claude_cli;

// ---------------------------------------------------------------------------
// analyze_spec command — uses Claude CLI for intelligent analysis
// ---------------------------------------------------------------------------

/// Max file size for spec analysis (1 MB)
const MAX_SPEC_SIZE: u64 = 1_048_576;

/// Analyze a spec markdown file via Claude CLI and produce a structured report.
#[tauri::command]
pub async fn analyze_spec(spec_file: String) -> Result<SpecAnalysisReport, String> {
    let path = std::path::Path::new(&spec_file);
    if !path.is_file() {
        return Err(format!("Not a file: {}", spec_file));
    }
    // Validate file extension
    let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("");
    if !["md", "mdx", "markdown", "txt"].contains(&ext) {
        return Err(format!("Unsupported file type: .{}", ext));
    }
    // Check file size before reading
    let meta = tokio::fs::metadata(path).await
        .map_err(|e| format!("Failed to read file metadata: {}", e))?;
    if meta.len() > MAX_SPEC_SIZE {
        return Err(format!("File too large ({} bytes, max {})", meta.len(), MAX_SPEC_SIZE));
    }
    let content = tokio::fs::read_to_string(&spec_file)
        .await
        .map_err(|e| format!("Failed to read spec file: {}", e))?;

    let prompt = build_analysis_prompt(&content);
    let raw = run_claude_cli(
        &["--print", "--output-format", "json", "--model", "claude-sonnet-4-6"],
        &prompt, 300,
    ).await?;
    let report = parse_claude_analysis_output(&raw, &spec_file)?;

    Ok(report)
}

/// Translate an existing analysis report to a target language using Claude CLI.
#[tauri::command]
pub async fn translate_analysis(
    report: SpecAnalysisReport,
    target_locale: String,
) -> Result<SpecAnalysisReport, String> {
    let report_json = serde_json::to_string(&report)
        .map_err(|e| format!("Failed to serialize report: {}", e))?;

    let lang_name = match target_locale.as_str() {
        "zh-TW" => "繁體中文 (Traditional Chinese)",
        "en" => "English",
        _ => return Err(format!("Unsupported locale: {}", target_locale)),
    };

    let prompt = format!(
        r#"Translate the following JSON analysis report to {lang_name}.

Rules:
- You MUST translate specTitle to {lang_name} — this is critical, do not skip it
- Translate these text fields: specTitle, description, sourceSection, area, scenario, expectedResult, riskAreas items, suggestedOrder items, unresolvedItems items
- Keep ALL code identifiers unchanged (class names, function names, file paths, variable names)
- Keep the JSON structure exactly the same
- Keep id, filePath, analyzedAt, specFile, category, priority fields unchanged
- Respond with ONLY valid JSON, no markdown or explanation

{report_json}"#,
        lang_name = lang_name,
        report_json = report_json,
    );

    let raw = run_claude_cli(
        &["--print", "--model", "claude-haiku-4-5-20251001"],
        &prompt, 180,
    ).await?;
    let json_str = extract_json_object(&raw);
    let translated: SpecAnalysisReport = serde_json::from_str(&json_str)
        .map_err(|e| format!("Failed to parse translated report: {}", e))?;

    Ok(translated)
}

// ---------------------------------------------------------------------------
// Prompt construction
// ---------------------------------------------------------------------------

fn build_analysis_prompt(spec_content: &str) -> String {
    format!(
        r#"You are a spec analyzer. Analyze the following markdown spec/design document and extract structured information.

IMPORTANT: Respond in the same language as the spec document. Keep code identifiers (class names, function names, file paths) in their original form.

<spec>
{spec_content}
</spec>

Analyze this spec and produce a JSON object with the following structure:

{{
  "specTitle": "string - the title of the spec",
  "doItems": [
    {{
      "category": "dataLayer" | "backendLogic" | "apiRoutes" | "frontend" | "integration" | "other",
      "description": "string - specific actionable task (include file paths, function names when mentioned)",
      "filePath": "string or null - file path if mentioned",
      "sourceSection": "string - which section this came from"
    }}
  ],
  "dontItems": [
    {{
      "category": "excluded" | "constraints" | "antiPatterns",
      "description": "string - what NOT to do or constraint",
      "sourceSection": "string - source section reference"
    }}
  ],
  "testCases": [
    {{
      "area": "string - functional area grouping",
      "scenario": "string - test scenario description",
      "expectedResult": "string - expected outcome",
      "priority": "P0" | "P1" | "P2"
    }}
  ],
  "riskAreas": ["string - identified risk areas"],
  "suggestedOrder": ["string - suggested implementation order steps"],
  "unresolvedItems": ["string - TODO/TBD/unclear items from spec"]
}}

Rules:
- Each DO item must be specific and actionable (file paths, function names, or specific behaviors)
- Each DON'T item must reference its source section in the spec
- Each test case must be a testable scenario with expected result
- Group test cases by functional area, NOT by spec section
- Priority: P0=must pass before release, P1=important but deferrable, P2=nice-to-have
- Extract ALL items thoroughly — do not skip any section
- Respond with ONLY valid JSON. No markdown, no explanation."#,
        spec_content = spec_content,
    )
}

// ---------------------------------------------------------------------------
// Parse Claude CLI output
// ---------------------------------------------------------------------------

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct RawAnalysis {
    spec_title: String,
    do_items: Vec<RawDoItem>,
    dont_items: Vec<RawDontItem>,
    test_cases: Vec<RawTestCase>,
    #[serde(default)]
    risk_areas: Vec<String>,
    #[serde(default)]
    suggested_order: Vec<String>,
    #[serde(default)]
    unresolved_items: Vec<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct RawDoItem {
    category: String,
    description: String,
    file_path: Option<String>,
    source_section: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct RawDontItem {
    category: String,
    description: String,
    source_section: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct RawTestCase {
    area: String,
    scenario: String,
    expected_result: String,
    priority: String,
}

fn parse_claude_analysis_output(raw: &str, spec_file: &str) -> Result<SpecAnalysisReport, String> {
    // Extract JSON from Claude CLI wrapper format
    let json_str = extract_json_object(raw);

    let analysis: RawAnalysis = serde_json::from_str(&json_str)
        .map_err(|e| {
            eprintln!("[spec-analyzer] Parse error: {}\nJSON: {}", e, &json_str[..json_str.len().min(500)]);
            format!("Failed to parse Claude response: {}", e)
        })?;

    let mut id_counter = 0u64;
    let mut next_id = || { id_counter += 1; format!("sa-{:04}", id_counter) };

    let do_items: Vec<DoItem> = analysis.do_items.into_iter().map(|raw| {
        DoItem {
            id: next_id(),
            category: parse_do_category(&raw.category),
            description: raw.description,
            file_path: raw.file_path,
            source_section: raw.source_section,
            source_line: 0,
        }
    }).collect();

    let dont_items: Vec<DontItem> = analysis.dont_items.into_iter().map(|raw| {
        DontItem {
            id: next_id(),
            category: parse_dont_category(&raw.category),
            description: raw.description,
            source_section: raw.source_section,
            source_line: 0,
        }
    }).collect();

    let test_cases: Vec<TestCase> = analysis.test_cases.into_iter().map(|raw| {
        TestCase {
            id: next_id(),
            area: raw.area,
            scenario: raw.scenario,
            expected_result: raw.expected_result,
            priority: parse_priority(&raw.priority),
            source_section: String::new(),
        }
    }).collect();

    let summary = AnalysisSummary {
        do_count: do_items.len(),
        dont_count: dont_items.len(),
        test_count: test_cases.len(),
        risk_areas: analysis.risk_areas,
        suggested_order: analysis.suggested_order,
        unresolved_items: analysis.unresolved_items,
    };

    Ok(SpecAnalysisReport {
        spec_file: spec_file.to_string(),
        spec_title: analysis.spec_title,
        analyzed_at: Utc::now().to_rfc3339(),
        locale: None,
        do_items,
        dont_items,
        test_cases,
        summary,
    })
}

fn extract_json_object(text: &str) -> String {
    // Try Claude CLI wrapper: {"result": "...{json}..."}
    if let Ok(wrapper) = serde_json::from_str::<serde_json::Value>(text) {
        if let Some(result_str) = wrapper.get("result").and_then(|v| v.as_str()) {
            return extract_object_from_text(result_str);
        }
        if let Some(result_arr) = wrapper.get("result").and_then(|v| v.as_array()) {
            for block in result_arr {
                if let Some(text_content) = block.get("text").and_then(|v| v.as_str()) {
                    let extracted = extract_object_from_text(text_content);
                    if extracted.starts_with('{') {
                        return extracted;
                    }
                }
            }
        }
    }
    extract_object_from_text(text)
}

fn extract_object_from_text(text: &str) -> String {
    // Strip markdown code fences: ```json ... ``` or ``` ... ```
    let cleaned = if text.contains("```") {
        let mut result = String::new();
        let mut in_fence = false;
        for line in text.lines() {
            let trimmed = line.trim();
            if trimmed.starts_with("```") {
                in_fence = !in_fence;
                continue;
            }
            if in_fence || !trimmed.is_empty() {
                result.push_str(line);
                result.push('\n');
            }
        }
        result
    } else {
        text.to_string()
    };

    // Use brace-depth counter to find the matching closing brace
    if let Some(start) = cleaned.find('{') {
        let mut depth = 0;
        let mut in_string = false;
        let mut escape_next = false;
        for (i, ch) in cleaned[start..].char_indices() {
            if escape_next {
                escape_next = false;
                continue;
            }
            match ch {
                '\\' if in_string => escape_next = true,
                '"' => in_string = !in_string,
                '{' if !in_string => depth += 1,
                '}' if !in_string => {
                    depth -= 1;
                    if depth == 0 {
                        return cleaned[start..start + i + 1].to_string();
                    }
                }
                _ => {}
            }
        }
    }
    cleaned
}

fn parse_do_category(s: &str) -> DoCategory {
    match s {
        "dataLayer" => DoCategory::DataLayer,
        "backendLogic" => DoCategory::BackendLogic,
        "apiRoutes" => DoCategory::ApiRoutes,
        "frontend" => DoCategory::Frontend,
        "integration" => DoCategory::Integration,
        _ => DoCategory::Other,
    }
}

fn parse_dont_category(s: &str) -> DontCategory {
    match s {
        "excluded" => DontCategory::Excluded,
        "constraints" => DontCategory::Constraints,
        "antiPatterns" => DontCategory::AntiPatterns,
        _ => DontCategory::Constraints,
    }
}

fn parse_priority(s: &str) -> TestPriority {
    match s.to_uppercase().as_str() {
        "P0" => TestPriority::P0,
        "P2" => TestPriority::P2,
        _ => TestPriority::P1,
    }
}

// ---------------------------------------------------------------------------
// Cache commands
// ---------------------------------------------------------------------------

const CACHE_FILE: &str = ".spec-analysis.json";

/// Read the analysis cache from a project directory.
#[tauri::command]
pub async fn read_analysis_cache(
    project_path: String,
) -> Result<Option<SpecAnalysisCache>, String> {
    let path = std::path::Path::new(&project_path).join(CACHE_FILE);
    match tokio::fs::read_to_string(&path).await {
        Ok(data) => {
            let cache: SpecAnalysisCache = serde_json::from_str(&data)
                .map_err(|e| format!("Failed to parse analysis cache: {}", e))?;
            Ok(Some(cache))
        }
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(None),
        Err(e) => Err(format!("Failed to read analysis cache: {}", e)),
    }
}

/// Write the analysis cache to a project directory.
#[tauri::command]
pub async fn write_analysis_cache(
    project_path: String,
    cache: SpecAnalysisCache,
) -> Result<(), String> {
    // Validate project_path is an existing directory
    let project = std::path::Path::new(&project_path);
    if !project.is_dir() {
        return Err(format!("Invalid project directory: {}", project_path));
    }
    let path = project.join(CACHE_FILE);
    let data = serde_json::to_string_pretty(&cache)
        .map_err(|e| format!("Failed to serialize analysis cache: {}", e))?;
    tokio::fs::write(&path, data)
        .await
        .map_err(|e| format!("Failed to write analysis cache: {}", e))?;
    Ok(())
}

// ---------------------------------------------------------------------------
// Export command
// ---------------------------------------------------------------------------

/// Export an analysis report as a structured markdown file.
#[tauri::command]
pub async fn export_analysis_markdown(
    report: SpecAnalysisReport,
    output_path: String,
) -> Result<(), String> {
    let md = render_report_markdown(&report);
    tokio::fs::write(&output_path, md)
        .await
        .map_err(|e| format!("Failed to write analysis markdown: {}", e))?;
    Ok(())
}

// ---------------------------------------------------------------------------
// Markdown rendering
// ---------------------------------------------------------------------------

fn render_report_markdown(report: &SpecAnalysisReport) -> String {
    let mut out = String::new();
    let s = &report.summary;

    // Header — matches UI panel header
    out.push_str(&format!("# Spec 分析：{}\n\n", report.spec_title));
    out.push_str(&format!("> **來源**：{} **分析時間**：{}\n\n", report.spec_file, report.analyzed_at));

    // Summary badges — matches UI top bar (same order as UI)
    out.push_str(&format!(
        "**{}** 個要做項目 · **{}** 個不做項目 · **{}** 個測試案例",
        s.do_count, s.dont_count, s.test_count
    ));
    if !s.risk_areas.is_empty() {
        out.push_str(&format!(" · **{}** 風險區域", s.risk_areas.len()));
    }
    out.push_str("\n\n---\n\n");

    // DO section — matches UI DoSection layout
    if !report.do_items.is_empty() {
        out.push_str(&format!("## DO（要做） {}\n\n", s.do_count));
        render_do_group(&mut out, &report.do_items, DoCategory::DataLayer, "資料層");
        render_do_group(&mut out, &report.do_items, DoCategory::BackendLogic, "後端邏輯");
        render_do_group(&mut out, &report.do_items, DoCategory::ApiRoutes, "API 路由");
        render_do_group(&mut out, &report.do_items, DoCategory::Frontend, "前端");
        render_do_group(&mut out, &report.do_items, DoCategory::Integration, "整合與修改");
        render_do_group(&mut out, &report.do_items, DoCategory::Other, "其他");
    }

    // DON'T section — matches UI DontSection layout
    if !report.dont_items.is_empty() {
        out.push_str(&format!("## DON'T（不做） {}\n\n", s.dont_count));
        render_dont_group(&mut out, &report.dont_items, DontCategory::Excluded, "明確排除");
        render_dont_group(&mut out, &report.dont_items, DontCategory::Constraints, "約束與限制");
        render_dont_group(&mut out, &report.dont_items, DontCategory::AntiPatterns, "反模式");
    }

    // Verification section — matches UI VerificationSection layout
    if !report.test_cases.is_empty() {
        out.push_str(&format!("## 驗證指標（測試案例） {}\n\n", s.test_count));
        // Group by area (same as UI)
        let mut seen = Vec::new();
        for tc in &report.test_cases {
            if !seen.contains(&tc.area) {
                seen.push(tc.area.clone());
            }
        }
        for area in &seen {
            let mut area_cases: Vec<&TestCase> =
                report.test_cases.iter().filter(|tc| &tc.area == area).collect();
            // Sort P0 first (same as UI)
            area_cases.sort_by_key(|tc| match tc.priority {
                TestPriority::P0 => 0,
                TestPriority::P1 => 1,
                TestPriority::P2 => 2,
            });
            out.push_str(&format!("### {}\n\n", area));
            out.push_str("| # | 測試場景 | 預期結果 | 優先級 |\n");
            out.push_str("|---|---------|---------|-------|\n");
            for (i, tc) in area_cases.iter().enumerate() {
                let p = match tc.priority {
                    TestPriority::P0 => "**P0**",
                    TestPriority::P1 => "P1",
                    TestPriority::P2 => "P2",
                };
                out.push_str(&format!(
                    "| {} | {} | {} | {} |\n",
                    i + 1, tc.scenario, tc.expected_result, p
                ));
            }
            out.push('\n');
        }
    }

    // Risk areas — matches UI bottom section
    if !s.risk_areas.is_empty() {
        out.push_str(&format!("## 風險區域 {}\n\n", s.risk_areas.len()));
        for risk in &s.risk_areas {
            out.push_str(&format!("- {}\n", risk));
        }
        out.push('\n');
    }

    // Suggested order
    if !s.suggested_order.is_empty() {
        out.push_str("## 建議實作順序\n\n");
        for (i, step) in s.suggested_order.iter().enumerate() {
            out.push_str(&format!("{}. {}\n", i + 1, step));
        }
        out.push('\n');
    }

    // Unresolved
    if !s.unresolved_items.is_empty() {
        out.push_str("## 待釐清事項\n\n");
        for item in &s.unresolved_items {
            out.push_str(&format!("- {}\n", item));
        }
        out.push('\n');
    }

    out
}

fn render_do_group(out: &mut String, items: &[DoItem], category: DoCategory, label: &str) {
    let filtered: Vec<&DoItem> = items
        .iter()
        .filter(|i| std::mem::discriminant(&i.category) == std::mem::discriminant(&category))
        .collect();
    if filtered.is_empty() {
        return;
    }
    out.push_str(&format!("### {}\n\n", label));
    for item in filtered {
        out.push_str(&format!("- [ ] {}\n", item.description));
        if let Some(ref p) = item.file_path {
            out.push_str(&format!("  `{}`\n", p));
        }
    }
    out.push('\n');
}

fn render_dont_group(out: &mut String, items: &[DontItem], category: DontCategory, label: &str) {
    let filtered: Vec<&DontItem> = items
        .iter()
        .filter(|i| std::mem::discriminant(&i.category) == std::mem::discriminant(&category))
        .collect();
    if filtered.is_empty() {
        return;
    }
    out.push_str(&format!("### {}\n", label));
    for item in filtered {
        out.push_str(&format!(
            "- {} — _來源：{}_\n",
            item.description, item.source_section
        ));
    }
    out.push('\n');
}

#[allow(dead_code)]
fn render_summary(out: &mut String, summary: &AnalysisSummary) {
    out.push_str("## 摘要\n\n");
    out.push_str("| 類別 | 數量 |\n");
    out.push_str("|------|------|\n");
    out.push_str(&format!("| DO 項目 | {} |\n", summary.do_count));
    out.push_str(&format!("| DON'T 項目 | {} |\n", summary.dont_count));
    out.push_str(&format!("| 測試案例 | {} |\n\n", summary.test_count));

    if !summary.risk_areas.is_empty() {
        out.push_str("### 風險區域\n");
        for risk in &summary.risk_areas {
            out.push_str(&format!("- {}\n", risk));
        }
        out.push('\n');
    }

    if !summary.suggested_order.is_empty() {
        out.push_str("### 建議實作順序\n");
        for (i, step) in summary.suggested_order.iter().enumerate() {
            out.push_str(&format!("{}. {}\n", i + 1, step));
        }
        out.push('\n');
    }

    if !summary.unresolved_items.is_empty() {
        out.push_str("### 待釐清事項\n");
        for item in &summary.unresolved_items {
            out.push_str(&format!("- {}\n", item));
        }
        out.push('\n');
    }
}
