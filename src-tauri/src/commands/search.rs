use serde::Serialize;
use std::fs;
use std::path::Path;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchResult {
    pub file_path: String,
    pub file_name: String,
    pub line_number: usize,
    pub line_content: String,
    pub match_start: usize,
    pub match_end: usize,
}

const MAX_RESULTS: usize = 100;

/// Recursively collect all .md files from a directory, skipping hidden entries.
fn collect_md_files(dir: &Path, files: &mut Vec<std::path::PathBuf>) {
    let entries = match fs::read_dir(dir) {
        Ok(e) => e,
        Err(_) => return,
    };
    for entry in entries.flatten() {
        let path = entry.path();
        let name = entry.file_name();
        let name_str = name.to_string_lossy();
        // Skip hidden entries
        if name_str.starts_with('.') {
            continue;
        }
        if path.is_dir() {
            collect_md_files(&path, files);
        } else if path.extension().and_then(|e| e.to_str()) == Some("md") {
            files.push(path);
        }
    }
}

/// Search all .md files under project_paths for lines matching query.
#[tauri::command]
pub async fn search_files(
    query: String,
    project_paths: Vec<String>,
    case_sensitive: bool,
) -> Result<Vec<SearchResult>, String> {
    if query.is_empty() {
        return Ok(vec![]);
    }

    let needle = if case_sensitive {
        query.clone()
    } else {
        query.to_lowercase()
    };

    let mut results: Vec<SearchResult> = Vec::new();
    let mut md_files: Vec<std::path::PathBuf> = Vec::new();

    for root in &project_paths {
        let root_path = Path::new(root);
        if root_path.is_dir() {
            collect_md_files(root_path, &mut md_files);
        } else if root_path.is_file()
            && root_path.extension().and_then(|e| e.to_str()) == Some("md")
        {
            md_files.push(root_path.to_path_buf());
        }
    }

    'outer: for file_path in &md_files {
        let content = match fs::read_to_string(file_path) {
            Ok(c) => c,
            Err(_) => continue,
        };

        let file_name = file_path
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_default();

        let path_str = file_path.to_string_lossy().to_string();

        for (idx, line) in content.lines().enumerate() {
            let haystack = if case_sensitive {
                line.to_string()
            } else {
                line.to_lowercase()
            };

            if let Some(match_start) = haystack.find(&needle) {
                let match_end = match_start + needle.len();
                results.push(SearchResult {
                    file_path: path_str.clone(),
                    file_name: file_name.clone(),
                    line_number: idx + 1,
                    line_content: line.to_string(),
                    match_start,
                    match_end,
                });
                if results.len() >= MAX_RESULTS {
                    break 'outer;
                }
            }
        }
    }

    Ok(results)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::tempdir;

    #[tokio::test]
    async fn test_search_files_finds_match() {
        let dir = tempdir().unwrap();
        fs::write(dir.path().join("doc.md"), "# Hello\nThis is a test file.\n").unwrap();

        let result = search_files(
            "test".to_string(),
            vec![dir.path().to_string_lossy().to_string()],
            false,
        ).await;

        assert!(result.is_ok());
        let results = result.unwrap();
        assert!(!results.is_empty());
        assert_eq!(results[0].file_name, "doc.md");
        assert!(results[0].line_content.contains("test"));
    }

    #[tokio::test]
    async fn test_search_case_insensitive() {
        let dir = tempdir().unwrap();
        fs::write(dir.path().join("note.md"), "UPPERCASE content here\n").unwrap();

        let result = search_files(
            "uppercase".to_string(),
            vec![dir.path().to_string_lossy().to_string()],
            false, // case insensitive
        ).await;

        assert!(result.is_ok());
        assert!(!result.unwrap().is_empty());
    }

    #[tokio::test]
    async fn test_search_case_sensitive_no_match() {
        let dir = tempdir().unwrap();
        fs::write(dir.path().join("note.md"), "UPPERCASE content here\n").unwrap();

        let result = search_files(
            "uppercase".to_string(),
            vec![dir.path().to_string_lossy().to_string()],
            true, // case sensitive — should not match
        ).await;

        assert!(result.is_ok());
        assert!(result.unwrap().is_empty());
    }

    #[tokio::test]
    async fn test_search_empty_results() {
        let dir = tempdir().unwrap();
        fs::write(dir.path().join("doc.md"), "Hello world\n").unwrap();

        let result = search_files(
            "nonexistent_xyz_term".to_string(),
            vec![dir.path().to_string_lossy().to_string()],
            false,
        ).await;

        assert!(result.is_ok());
        assert!(result.unwrap().is_empty());
    }

    #[tokio::test]
    async fn test_search_empty_query_returns_empty() {
        let dir = tempdir().unwrap();
        fs::write(dir.path().join("doc.md"), "Hello world\n").unwrap();

        let result = search_files(
            String::new(),
            vec![dir.path().to_string_lossy().to_string()],
            false,
        ).await;

        assert!(result.is_ok());
        assert!(result.unwrap().is_empty());
    }

    #[tokio::test]
    async fn test_search_max_results_limit() {
        let dir = tempdir().unwrap();
        // Create a file with 150 matching lines (> MAX_RESULTS=100)
        let lines: String = (0..150).map(|i| format!("match line {}\n", i)).collect();
        fs::write(dir.path().join("big.md"), &lines).unwrap();

        let result = search_files(
            "match".to_string(),
            vec![dir.path().to_string_lossy().to_string()],
            false,
        ).await;

        assert!(result.is_ok());
        assert_eq!(result.unwrap().len(), 100);
    }
}
