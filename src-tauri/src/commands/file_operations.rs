use std::path::Path;
use std::time::UNIX_EPOCH;

use crate::models::FileNode;
use crate::process_utils::{create_command, which_command};

/// Reads UTF-8 content from a file at the given path.
/// Returns the file content as a string or an error message.
#[tauri::command]
pub async fn read_file(file_path: String) -> Result<String, String> {
    let path = Path::new(&file_path);

    if !path.exists() {
        return Err(format!("File not found: {}", file_path));
    }
    if !path.is_file() {
        return Err(format!("Path is not a file: {}", file_path));
    }

    // Canonicalize to prevent directory traversal attacks
    let canonical = std::fs::canonicalize(path)
        .map_err(|e| format!("Invalid path: {}", e))?;

    tokio::fs::read_to_string(&canonical)
        .await
        .map_err(|e| format!("Failed to read file: {}", e))
}

/// Writes content to a file at the given path, creating parent directories as needed.
#[tauri::command]
pub async fn write_file(file_path: String, content: String) -> Result<(), String> {
    let path = Path::new(&file_path);

    // Ensure parent directory exists
    if let Some(parent) = path.parent() {
        tokio::fs::create_dir_all(parent)
            .await
            .map_err(|e| format!("Failed to create directories: {}", e))?;
    }

    tokio::fs::write(path, content)
        .await
        .map_err(|e| format!("Failed to write file: {}", e))
}

/// Lists directory contents, returning a tree of FileNode structs.
/// Filters to only .md files and directories; skips hidden entries (starting with '.').
/// Sorts directories first, then alphabetically within each group.
#[tauri::command]
pub async fn list_directory(dir_path: String, recursive: bool) -> Result<Vec<FileNode>, String> {
    let path = Path::new(&dir_path);

    if !path.exists() {
        return Err(format!("Directory not found: {}", dir_path));
    }
    if !path.is_dir() {
        return Err(format!("Path is not a directory: {}", dir_path));
    }

    let canonical = std::fs::canonicalize(path)
        .map_err(|e| format!("Invalid path: {}", e))?;

    build_file_tree(&canonical, recursive)
        .map_err(|e| format!("Failed to list directory: {}", e))
}

/// Opens a file in the user's default code editor (tries cursor, code, then system open).
#[tauri::command]
pub async fn open_in_editor(file_path: String) -> Result<(), String> {
    let path = std::path::Path::new(&file_path);
    if !path.exists() {
        return Err(format!("File not found: {}", file_path));
    }

    // Try editors in order: cursor, code (VS Code), zed
    let editors = ["cursor", "code", "zed"];
    for editor in editors {
        if create_command(which_command())
            .arg(editor)
            .output()
            .await
            .map(|o| o.status.success())
            .unwrap_or(false)
        {
            return create_command(editor)
                .arg(&file_path)
                .spawn()
                .map(|_| ())
                .map_err(|e| format!("Failed to open with {}: {}", editor, e));
        }
    }

    // Fallback: system default opener
    #[cfg(target_os = "windows")]
    let opener = "cmd";
    #[cfg(target_os = "macos")]
    let opener = "open";
    #[cfg(target_os = "linux")]
    let opener = "xdg-open";

    #[cfg(target_os = "windows")]
    {
        create_command(opener)
            .args(["/c", "start", "", &file_path])
            .spawn()
            .map(|_| ())
            .map_err(|e| format!("Failed to open file: {}", e))
    }
    #[cfg(not(target_os = "windows"))]
    {
        create_command(opener)
            .arg(&file_path)
            .spawn()
            .map(|_| ())
            .map_err(|e| format!("Failed to open file: {}", e))
    }
}

/// Returns metadata for a single file as a FileNode (name, path, size, modified, extension).
#[tauri::command]
pub async fn get_file_metadata(file_path: String) -> Result<FileNode, String> {
    let path = Path::new(&file_path);

    if !path.exists() {
        return Err(format!("File not found: {}", file_path));
    }

    let canonical = std::fs::canonicalize(path)
        .map_err(|e| format!("Invalid path: {}", e))?;

    build_file_node(&canonical).map_err(|e| format!("Failed to get metadata: {}", e))
}

// --- Internal helpers ---

/// Recursively builds a Vec<FileNode> tree for the given directory.
fn build_file_tree(dir: &Path, recursive: bool) -> std::io::Result<Vec<FileNode>> {
    let mut entries: Vec<FileNode> = Vec::new();

    for entry in std::fs::read_dir(dir)? {
        let entry = entry?;
        let path = entry.path();
        let name = entry.file_name().to_string_lossy().to_string();

        // Skip hidden files/dirs (starting with '.')
        if name.starts_with('.') {
            continue;
        }

        let is_dir = path.is_dir();

        // Skip common non-content directories
        if is_dir {
            match name.as_str() {
                "node_modules" | "target" | "dist" | ".git" | "__pycache__" | ".next"
                | "vendor" | "modules" | ".cargo" | ".rustup" | "build" | "out"
                | "coverage" | ".turbo" | ".vercel" | "tmp" | ".cache" => continue,
                _ => {}
            }
        }

        // Include directories and .md files only
        if !is_dir {
            let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("");
            if ext != "md" {
                continue;
            }
        }

        let mut node = build_file_node(&path)?;

        // Populate children for directories when recursive is requested
        if is_dir && recursive {
            let children = build_file_tree(&path, true)?;
            // Skip empty directories (no .md files anywhere inside)
            if children.is_empty() {
                continue;
            }
            node.children = Some(children);
        } else if is_dir {
            node.children = Some(vec![]);
        }

        entries.push(node);
    }

    // Sort: directories first, then alphabetical by name (case-insensitive)
    entries.sort_by(|a, b| {
        match (a.is_dir, b.is_dir) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
        }
    });

    Ok(entries)
}

/// Builds a FileNode from a path, reading metadata from the filesystem.
fn build_file_node(path: &Path) -> std::io::Result<FileNode> {
    let metadata = std::fs::metadata(path)?;
    let name = path
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_default();

    let is_dir = metadata.is_dir();

    let size = if is_dir { None } else { Some(metadata.len()) };

    let modified = metadata
        .modified()
        .ok()
        .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
        .map(|d| {
            // Format as ISO 8601 UTC from Unix timestamp seconds
            let secs = d.as_secs();
            format_unix_timestamp(secs)
        });

    let extension = if is_dir {
        None
    } else {
        path.extension()
            .and_then(|e| e.to_str())
            .map(|s| s.to_string())
    };

    Ok(FileNode {
        name,
        path: path.to_string_lossy().to_string(),
        is_dir,
        children: None,
        size,
        modified,
        extension,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::tempdir;

    #[tokio::test]
    async fn test_read_file_success() {
        let dir = tempdir().unwrap();
        let file_path = dir.path().join("test.md");
        fs::write(&file_path, "# Hello World").unwrap();

        let result = read_file(file_path.to_string_lossy().to_string()).await;
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), "# Hello World");
    }

    #[tokio::test]
    async fn test_read_file_not_found() {
        let result = read_file("/nonexistent/path/file.md".to_string()).await;
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("File not found"));
    }

    #[tokio::test]
    async fn test_write_file_success() {
        let dir = tempdir().unwrap();
        let file_path = dir.path().join("output.md");

        let result = write_file(file_path.to_string_lossy().to_string(), "content".to_string()).await;
        assert!(result.is_ok());

        let written = fs::read_to_string(&file_path).unwrap();
        assert_eq!(written, "content");
    }

    #[tokio::test]
    async fn test_list_directory() {
        let dir = tempdir().unwrap();
        fs::write(dir.path().join("a.md"), "# A").unwrap();
        fs::write(dir.path().join("b.md"), "# B").unwrap();
        fs::write(dir.path().join("ignore.txt"), "not md").unwrap();
        fs::create_dir(dir.path().join("subdir")).unwrap();

        let result = list_directory(dir.path().to_string_lossy().to_string(), false).await;
        assert!(result.is_ok());
        let nodes = result.unwrap();

        // subdir + 2 .md files; .txt excluded
        assert_eq!(nodes.len(), 3);

        // directories sorted first
        assert!(nodes[0].is_dir);

        // .md files present
        let names: Vec<&str> = nodes.iter().map(|n| n.name.as_str()).collect();
        assert!(names.contains(&"a.md"));
        assert!(names.contains(&"b.md"));
        assert!(!names.contains(&"ignore.txt"));
    }
}

/// Formats a Unix timestamp (seconds since epoch) as an ISO 8601 UTC string.
/// Uses a manual calculation to avoid adding chrono as a dependency.
fn format_unix_timestamp(secs: u64) -> String {
    // Days since epoch to year/month/day (Gregorian calendar algorithm)
    let days = secs / 86400;
    let time_of_day = secs % 86400;
    let hours = time_of_day / 3600;
    let minutes = (time_of_day % 3600) / 60;
    let seconds = time_of_day % 60;

    // Civil date calculation from days since Unix epoch (Jan 1, 1970)
    let z = days as i64 + 719468;
    let era = if z >= 0 { z } else { z - 146096 } / 146097;
    let doe = z - era * 146097;
    let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
    let y = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = if mp < 10 { mp + 3 } else { mp - 9 };
    let y = if m <= 2 { y + 1 } else { y };

    format!(
        "{:04}-{:02}-{:02}T{:02}:{:02}:{:02}Z",
        y, m, d, hours, minutes, seconds
    )
}
