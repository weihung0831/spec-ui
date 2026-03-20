use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};
use std::collections::HashMap;
use std::time::Duration;

use serde::{Deserialize, Serialize};
use tokio::time::timeout;

use crate::models::coverage::{
    CodeMatch, CoverageCache, CoverageOverride, CoverageReport, CoverageResult,
    CoverageSummary, CoverageStatus, RequirementInfo,
};

// ---------------------------------------------------------------------------
// ClaudeCliInfo
// ---------------------------------------------------------------------------

/// Information about the detected Claude CLI installation.
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ClaudeCliInfo {
    pub available: bool,
    pub path: String,
    pub version: String,
}

// ---------------------------------------------------------------------------
// check_claude_cli command
// ---------------------------------------------------------------------------

/// Detects whether the `claude` CLI is installed and returns its path + version.
#[tauri::command]
pub async fn check_claude_cli() -> Result<ClaudeCliInfo, String> {
    // Determine the correct "which" command per platform
    #[cfg(target_os = "windows")]
    let which_cmd = "where";
    #[cfg(not(target_os = "windows"))]
    let which_cmd = "which";

    let which_output = tokio::process::Command::new(which_cmd)
        .arg("claude")
        .output()
        .await
        .map_err(|e| format!("Failed to run {}: {}", which_cmd, e))?;

    if !which_output.status.success() {
        return Ok(ClaudeCliInfo {
            available: false,
            path: String::new(),
            version: String::new(),
        });
    }

    let path = String::from_utf8_lossy(&which_output.stdout)
        .trim()
        .to_string();

    // Attempt to get the version; non-fatal if this fails
    let version = match tokio::process::Command::new("claude")
        .arg("--version")
        .output()
        .await
    {
        Ok(out) if out.status.success() => {
            String::from_utf8_lossy(&out.stdout).trim().to_string()
        }
        Ok(out) => {
            // Some CLIs print version on stderr
            let stderr = String::from_utf8_lossy(&out.stderr).trim().to_string();
            if stderr.is_empty() { String::new() } else { stderr }
        }
        Err(_) => String::new(),
    };

    Ok(ClaudeCliInfo {
        available: true,
        path,
        version,
    })
}

// ---------------------------------------------------------------------------
// analyze_coverage command
// ---------------------------------------------------------------------------

/// Runs the Claude CLI against a codebase to determine which spec requirements
/// are implemented.  Returns a full CoverageReport with per-requirement results
/// and aggregate statistics.
#[tauri::command]
pub async fn analyze_coverage(
    spec_file: String,
    code_path: String,
) -> Result<CoverageReport, String> {
    // 1. Verify claude CLI is available
    let cli_info = check_claude_cli().await?;
    if !cli_info.available {
        return Err(
            "Claude CLI not found. Install from https://claude.ai/code".to_string(),
        );
    }

    // 2. Read spec file
    let content = tokio::fs::read_to_string(&spec_file)
        .await
        .map_err(|e| format!("Failed to read spec file '{}': {}", spec_file, e))?;

    // 3. Parse requirements
    let requirements = parse_requirements(&content);
    if requirements.is_empty() {
        return Err("No requirements found in spec file".to_string());
    }

    // 4. Build prompt
    let requirements_json = serde_json::to_string_pretty(&requirements)
        .map_err(|e| format!("Failed to serialize requirements: {}", e))?;
    let prompt = build_analysis_prompt(&code_path, &requirements_json);

    // 5. Spawn claude CLI with 120s timeout
    let child_future = tokio::process::Command::new("claude")
        .args([
            "--print",
            "--output-format",
            "json",
            "--allowedTools",
            "Read,Grep,Glob",
            "-p",
            &prompt,
        ])
        .current_dir(&code_path)
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to spawn Claude CLI: {}", e))?;

    let output_result = timeout(Duration::from_secs(120), child_future.wait_with_output()).await;

    let output = match output_result {
        Ok(Ok(out)) => out,
        Ok(Err(e)) => return Err(format!("Claude CLI execution error: {}", e)),
        Err(_) => return Err("Analysis timed out after 120s".to_string()),
    };

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Claude CLI error: {}", stderr));
    }

    // 6. Parse JSON output
    let raw = String::from_utf8_lossy(&output.stdout).to_string();
    let coverage_results = parse_claude_output(&raw, &requirements)?;

    // 7. Build summary
    let summary = build_summary(&coverage_results);

    // 8. Assemble report
    let scanned_at = chrono::Utc::now().to_rfc3339();

    Ok(CoverageReport {
        spec_file,
        code_path,
        scanned_at,
        requirements,
        results: coverage_results,
        summary,
    })
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/// Builds the analysis prompt sent to Claude CLI.
fn build_analysis_prompt(code_path: &str, requirements_json: &str) -> String {
    format!(
        r#"You are analyzing a codebase to determine which spec requirements have been implemented.

Codebase path: {code_path}

Requirements to check:
{requirements_json}

For EACH requirement, analyze the codebase and determine:
1. status: "implemented" | "partial" | "notImplemented" | "unknown"
2. confidence: 0-100 (how confident you are)
3. matchedFiles: array of {{filePath, lineStart, lineEnd, snippet}} where you found relevant code
4. reasoning: one sentence explaining your judgment in BOTH English and Traditional Chinese (繁體中文), separated by a newline "\n". Example: "Found login handler in auth.rs\n在 auth.rs 中找到登入處理器"

IMPORTANT: Respond with ONLY a valid JSON array. No markdown, no explanation, just the JSON.

Schema:
[{{
  "requirementId": "string",
  "status": "implemented" | "partial" | "notImplemented" | "unknown",
  "confidence": number,
  "matchedFiles": [{{"filePath": "string", "lineStart": number, "lineEnd": number, "snippet": "string"}}],
  "reasoning": "string"
}}]"#,
        code_path = code_path,
        requirements_json = requirements_json,
    )
}

/// Parses the raw stdout from the Claude CLI into a Vec<CoverageResult>.
/// Missing requirements are filled in with status=Unknown.
fn parse_claude_output(
    raw: &str,
    requirements: &[RequirementInfo],
) -> Result<Vec<CoverageResult>, String> {
    // Claude with --output-format json wraps the response; try to extract the
    // inner JSON array produced by the model.
    let json_str = extract_json_array(raw);

    // Intermediate struct that mirrors what Claude returns (status as string)
    #[derive(Deserialize)]
    #[serde(rename_all = "camelCase")]
    struct RawResult {
        requirement_id: String,
        status: String,
        confidence: Option<u8>,
        matched_files: Option<Vec<CodeMatch>>,
        reasoning: Option<String>,
    }

    let raw_results: Vec<RawResult> = serde_json::from_str(&json_str)
        .map_err(|e| {
            eprintln!("Failed to parse Claude response: {}\nExtracted JSON: {}\nRaw output length: {}", e, &json_str[..json_str.len().min(500)], raw.len());
            format!("Failed to parse Claude response: {}", e)
        })?;

    // Build a lookup map from requirementId → parsed result
    let mut result_map: HashMap<String, CoverageResult> = HashMap::new();
    for rr in raw_results {
        let status = match rr.status.as_str() {
            "implemented" => CoverageStatus::Implemented,
            "partial" => CoverageStatus::Partial,
            "notImplemented" | "not_implemented" => CoverageStatus::NotImplemented,
            _ => CoverageStatus::Unknown,
        };
        result_map.insert(
            rr.requirement_id.clone(),
            CoverageResult {
                requirement_id: rr.requirement_id,
                status,
                confidence: rr.confidence.unwrap_or(0),
                matched_files: rr.matched_files.unwrap_or_default(),
                reasoning: rr.reasoning.unwrap_or_default(),
            },
        );
    }

    // Ensure every requirement has a result; fill missing with Unknown
    let results = requirements
        .iter()
        .map(|req| {
            result_map.remove(&req.id).unwrap_or_else(|| CoverageResult {
                requirement_id: req.id.clone(),
                status: CoverageStatus::Unknown,
                confidence: 0,
                matched_files: Vec::new(),
                reasoning: "No analysis result returned by Claude".to_string(),
            })
        })
        .collect();

    Ok(results)
}

/// Extracts the model's text content from Claude CLI `--output-format json` output,
/// then finds the JSON array within it.
/// Claude CLI wraps output as: {"type":"result","result":"<text content>",...}
/// The actual analysis JSON array is inside the "result" field as a string.
fn extract_json_array(text: &str) -> String {
    // Try to parse as Claude CLI wrapper format first
    if let Ok(wrapper) = serde_json::from_str::<serde_json::Value>(text) {
        // Claude CLI format: { "result": "...[json array]..." }
        if let Some(result_str) = wrapper.get("result").and_then(|v| v.as_str()) {
            return extract_array_from_text(result_str);
        }
        // Alternative: result might contain content blocks
        if let Some(result_arr) = wrapper.get("result").and_then(|v| v.as_array()) {
            for block in result_arr {
                if let Some(text_content) = block.get("text").and_then(|v| v.as_str()) {
                    let extracted = extract_array_from_text(text_content);
                    if extracted.starts_with('[') {
                        return extracted;
                    }
                }
            }
        }
    }
    // Fallback: try to find array directly in the raw text
    extract_array_from_text(text)
}

/// Finds the outermost JSON array `[...]` in a text string.
fn extract_array_from_text(text: &str) -> String {
    // Find the first `[` and the matching last `]`
    if let Some(start) = text.find('[') {
        if let Some(end) = text.rfind(']') {
            if start < end {
                return text[start..=end].to_string();
            }
        }
    }
    text.to_string()
}

/// Calculates aggregate CoverageSummary from a slice of results.
fn build_summary(results: &[CoverageResult]) -> CoverageSummary {
    let total = results.len();
    let mut implemented = 0usize;
    let mut partial = 0usize;
    let mut not_implemented = 0usize;
    let mut unknown = 0usize;

    for r in results {
        match r.status {
            CoverageStatus::Implemented => implemented += 1,
            CoverageStatus::Partial => partial += 1,
            CoverageStatus::NotImplemented => not_implemented += 1,
            CoverageStatus::Unknown => unknown += 1,
        }
    }

    let coverage_percent = if total == 0 {
        0.0
    } else {
        // partial counts as 0.5
        ((implemented as f32) + (partial as f32) * 0.5) / (total as f32) * 100.0
    };

    CoverageSummary {
        total,
        implemented,
        partial,
        not_implemented,
        unknown,
        coverage_percent,
    }
}

// ---------------------------------------------------------------------------
// extract_requirements command (public Tauri command)
// ---------------------------------------------------------------------------

/// Parses markdown content and extracts all requirements (Tauri IPC entry point).
#[tauri::command]
pub async fn extract_requirements(content: String) -> Result<Vec<RequirementInfo>, String> {
    let reqs = parse_requirements(&content);
    Ok(reqs)
}

// ---------------------------------------------------------------------------
// Internal markdown parser
// ---------------------------------------------------------------------------

/// Generates a stable short ID from a string using DefaultHasher.
fn stable_id(input: &str) -> String {
    let mut hasher = DefaultHasher::new();
    input.hash(&mut hasher);
    format!("req-{:x}", hasher.finish())
}

/// Parses markdown content and extracts all requirements.
/// Supports two formats:
///   - OpenSpec: `## Requirement: Name` headings with optional `### Scenario:` blocks
///   - Checkbox: `- [ ] description` / `- [x] description`
fn parse_requirements(content: &str) -> Vec<RequirementInfo> {
    let lines: Vec<&str> = content.lines().collect();
    let total = lines.len();
    let mut results: Vec<RequirementInfo> = Vec::new();
    let mut i = 0;

    while i < total {
        let line = lines[i].trim();

        if let Some(name) = parse_openspec_heading(line) {
            // Collect body until next `##` heading or EOF
            let line_start = i + 1; // 1-indexed
            let mut desc_lines: Vec<&str> = Vec::new();
            let mut scenarios: Vec<String> = Vec::new();
            let mut j = i + 1;

            while j < total {
                let body_line = lines[j];
                let trimmed = body_line.trim();

                // Stop at any markdown heading that is also a parseable requirement
                if parse_openspec_heading(trimmed).is_some() {
                    break;
                }

                // Detect `### Scenario:` block and gather GIVEN/WHEN/THEN
                if trimmed.starts_with("### Scenario:") || trimmed.starts_with("###Scenario:") {
                    let scenario_text = collect_scenario_block(&lines, j, total);
                    if !scenario_text.is_empty() {
                        scenarios.push(scenario_text);
                    }
                } else {
                    desc_lines.push(body_line);
                }

                j += 1;
            }

            let line_end = if j > i + 1 { j } else { i + 1 };
            let description = desc_lines
                .iter()
                .map(|l| l.trim())
                .filter(|l| !l.is_empty() && !l.starts_with("###"))
                .collect::<Vec<_>>()
                .join(" ")
                .trim()
                .to_string();

            results.push(RequirementInfo {
                id: stable_id(&name),
                name: name.clone(),
                description,
                req_type: "openspec".to_string(),
                line_start,
                line_end,
                scenarios,
            });

            i = j;
            continue;
        }

        if let Some((checkbox_text, _checked)) = parse_checkbox(line) {
            results.push(RequirementInfo {
                id: stable_id(&checkbox_text),
                name: checkbox_text.clone(),
                description: checkbox_text,
                req_type: "checkbox".to_string(),
                line_start: i + 1,
                line_end: i + 1,
                scenarios: Vec::new(),
            });
        }

        i += 1;
    }

    results
}

/// Returns the requirement name if the line is a markdown heading containing a task/requirement.
/// Matches any heading level (#, ##, ###, etc.) where the text starts with
/// "Task", "Step", or "Requirement", plus any `## ` (H2) heading.
fn parse_openspec_heading(line: &str) -> Option<String> {
    // Strip leading '#' characters to get heading text
    let trimmed = line.trim_start_matches('#');
    if trimmed.len() == line.len() {
        // No '#' prefix — not a heading
        return None;
    }
    let heading_text = trimmed.trim();
    if heading_text.is_empty() {
        return None;
    }

    let lower = heading_text.to_lowercase();
    let hashes = line.len() - trimmed.len();

    // H2 headings: always treat as requirement
    // Other levels: only if text starts with Task/Step/Requirement
    if hashes != 2 {
        if !(lower.starts_with("task") || lower.starts_with("step") || lower.starts_with("requirement")) {
            return None;
        }
    }

    // Strip leading digits/dots for clean name
    let name = heading_text
        .trim_start_matches(|c: char| c.is_ascii_digit() || c == '.')
        .trim();
    if name.is_empty() {
        return Some(heading_text.to_string());
    }
    Some(name.to_string())
}

/// Returns (text, is_checked) for checkbox lines: `- [ ] text` or `- [x] text`
fn parse_checkbox(line: &str) -> Option<(String, bool)> {
    if line.starts_with("- [ ] ") {
        return Some((line[6..].trim().to_string(), false));
    }
    if line.starts_with("- [x] ") || line.starts_with("- [X] ") {
        return Some((line[6..].trim().to_string(), true));
    }
    None
}

/// Collects GIVEN/WHEN/THEN lines from a `### Scenario:` block starting at `start`.
fn collect_scenario_block(lines: &[&str], start: usize, total: usize) -> String {
    let mut parts: Vec<&str> = Vec::new();
    parts.push(lines[start].trim());

    let mut j = start + 1;
    while j < total {
        let t = lines[j].trim();
        if t.starts_with("## ") || t.starts_with("### ") {
            break;
        }
        if !t.is_empty() {
            parts.push(t);
        }
        j += 1;
    }

    parts.join(" ")
}

// ---------------------------------------------------------------------------
// Cache commands
// ---------------------------------------------------------------------------

const CACHE_FILE: &str = ".spec-coverage.json";

/// Reads the .spec-coverage.json cache from the code_path root.
/// Returns Ok(None) if the file does not exist.
#[tauri::command]
pub async fn read_coverage_cache(code_path: String) -> Result<Option<CoverageCache>, String> {
    let cache_path = std::path::Path::new(&code_path).join(CACHE_FILE);
    if !cache_path.exists() {
        return Ok(None);
    }
    let raw = tokio::fs::read_to_string(&cache_path)
        .await
        .map_err(|e| format!("Failed to read cache file: {}", e))?;
    let cache: CoverageCache = serde_json::from_str(&raw)
        .map_err(|e| format!("Failed to parse cache file: {}", e))?;
    Ok(Some(cache))
}

/// Writes a CoverageCache as pretty-printed JSON to {code_path}/.spec-coverage.json.
#[tauri::command]
pub async fn write_coverage_cache(code_path: String, cache: CoverageCache) -> Result<(), String> {
    let cache_path = std::path::Path::new(&code_path).join(CACHE_FILE);
    let json = serde_json::to_string_pretty(&cache)
        .map_err(|e| format!("Failed to serialize cache: {}", e))?;
    tokio::fs::write(&cache_path, json)
        .await
        .map_err(|e| format!("Failed to write cache file: {}", e))?;
    Ok(())
}

/// Returns the list of files changed since the given commit using git diff.
/// Returns an empty vec if not a git repo or git is unavailable.
#[tauri::command]
pub async fn get_changed_files(
    code_path: String,
    since_commit: String,
) -> Result<Vec<String>, String> {
    let output = tokio::process::Command::new("git")
        .args(["diff", "--name-only", &format!("{}..HEAD", since_commit)])
        .current_dir(&code_path)
        .output()
        .await;

    match output {
        Ok(out) if out.status.success() => {
            let text = String::from_utf8_lossy(&out.stdout);
            let files = text
                .lines()
                .filter(|l| !l.is_empty())
                .map(|l| l.to_string())
                .collect();
            Ok(files)
        }
        // Not a git repo or any git failure — return empty, non-fatal
        _ => Ok(Vec::new()),
    }
}

/// Adds or updates a manual override for a requirement in the cache.
#[tauri::command]
pub async fn save_coverage_override(
    code_path: String,
    requirement_id: String,
    status: String,
    note: String,
) -> Result<(), String> {
    let cache_path = std::path::Path::new(&code_path).join(CACHE_FILE);

    // Load existing cache or create a fresh one
    let mut cache: CoverageCache = if cache_path.exists() {
        let raw = tokio::fs::read_to_string(&cache_path)
            .await
            .map_err(|e| format!("Failed to read cache: {}", e))?;
        serde_json::from_str(&raw).map_err(|e| format!("Failed to parse cache: {}", e))?
    } else {
        CoverageCache {
            version: 1,
            last_scan_commit: None,
            last_scan_time: chrono::Utc::now().to_rfc3339(),
            reports: HashMap::new(),
            overrides: HashMap::new(),
        }
    };

    cache.overrides.insert(
        requirement_id,
        CoverageOverride {
            status,
            note,
            overridden_at: chrono::Utc::now().to_rfc3339(),
        },
    );

    let json = serde_json::to_string_pretty(&cache)
        .map_err(|e| format!("Failed to serialize cache: {}", e))?;
    tokio::fs::write(&cache_path, json)
        .await
        .map_err(|e| format!("Failed to write cache: {}", e))?;

    Ok(())
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_openspec_requirement() {
        let md = "## Requirement: User Login\n\nUsers must be able to log in.\n\n### Scenario: Happy Path\nGIVEN a registered user\nWHEN they submit credentials\nTHEN they are authenticated\n";
        let reqs = parse_requirements(md);
        assert_eq!(reqs.len(), 1);
        let r = &reqs[0];
        assert_eq!(r.name, "User Login");
        assert_eq!(r.req_type, "openspec");
        assert!(!r.scenarios.is_empty());
        assert!(r.scenarios[0].contains("GIVEN"));
    }

    #[test]
    fn test_parse_checkbox_requirements() {
        let md = "- [ ] Implement login\n- [x] Add logout button\n- [ ] Password reset\n";
        let reqs = parse_requirements(md);
        assert_eq!(reqs.len(), 3);
        assert_eq!(reqs[0].req_type, "checkbox");
        assert_eq!(reqs[0].name, "Implement login");
        assert_eq!(reqs[1].name, "Add logout button");
    }

    #[test]
    fn test_parse_mixed_format() {
        let md = "## Requirement: Auth\n\nAuthenticate users.\n\n- [ ] Support OAuth\n- [ ] Email login\n";
        let reqs = parse_requirements(md);
        assert_eq!(reqs.len(), 3);
        assert_eq!(reqs[0].req_type, "openspec");
        assert_eq!(reqs[1].req_type, "checkbox");
    }

    #[test]
    fn test_stable_id_is_consistent() {
        let id1 = stable_id("User Login");
        let id2 = stable_id("User Login");
        assert_eq!(id1, id2);
        assert!(id1.starts_with("req-"));
    }

    #[test]
    fn test_line_numbers_are_correct() {
        let md = "## Requirement: Auth\n\nDescription.\n";
        let reqs = parse_requirements(md);
        assert_eq!(reqs[0].line_start, 1);
        assert!(reqs[0].line_end >= 1);
    }

    #[test]
    fn test_extract_json_array_strips_wrapper() {
        let raw = r#"some prefix [{"a": 1}] trailing text"#;
        let extracted = extract_json_array(raw);
        assert_eq!(extracted, r#"[{"a": 1}]"#);
    }

    #[test]
    fn test_build_summary_calculates_correctly() {
        let results = vec![
            CoverageResult {
                requirement_id: "r1".into(),
                status: CoverageStatus::Implemented,
                confidence: 90,
                matched_files: vec![],
                reasoning: String::new(),
            },
            CoverageResult {
                requirement_id: "r2".into(),
                status: CoverageStatus::Partial,
                confidence: 50,
                matched_files: vec![],
                reasoning: String::new(),
            },
            CoverageResult {
                requirement_id: "r3".into(),
                status: CoverageStatus::NotImplemented,
                confidence: 80,
                matched_files: vec![],
                reasoning: String::new(),
            },
        ];
        let summary = build_summary(&results);
        assert_eq!(summary.total, 3);
        assert_eq!(summary.implemented, 1);
        assert_eq!(summary.partial, 1);
        assert_eq!(summary.not_implemented, 1);
        // (1 + 0.5) / 3 * 100 = 50.0
        assert!((summary.coverage_percent - 50.0).abs() < 0.01);
    }

    #[test]
    fn test_parse_claude_output_fills_missing() {
        let raw = r#"[{"requirementId":"r1","status":"implemented","confidence":95,"matchedFiles":[],"reasoning":"found it"}]"#;
        let reqs = vec![
            RequirementInfo {
                id: "r1".into(),
                name: "Req 1".into(),
                description: String::new(),
                req_type: "checkbox".into(),
                line_start: 1,
                line_end: 1,
                scenarios: vec![],
            },
            RequirementInfo {
                id: "r2".into(),
                name: "Req 2".into(),
                description: String::new(),
                req_type: "checkbox".into(),
                line_start: 2,
                line_end: 2,
                scenarios: vec![],
            },
        ];
        let results = parse_claude_output(raw, &reqs).unwrap();
        assert_eq!(results.len(), 2);
        // r2 should be Unknown (missing from Claude response)
        assert!(matches!(results[1].status, CoverageStatus::Unknown));
    }
}
