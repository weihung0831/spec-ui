use std::path::Path;

use crate::models::{Frontmatter, ParsedFrontmatter};

/// Parses YAML frontmatter from markdown content.
/// Detects `---` delimiters, extracts and parses the YAML block.
/// Returns empty frontmatter and the full content as body if no frontmatter is found.
#[tauri::command]
pub async fn parse_frontmatter(content: String) -> Result<ParsedFrontmatter, String> {
    parse_frontmatter_from_str(&content)
}

/// Reads a markdown file, updates a single frontmatter field by key, and writes it back.
/// If no frontmatter block exists, a new one is created with the given key-value pair.
#[tauri::command]
pub async fn update_frontmatter(
    file_path: String,
    key: String,
    value: String,
) -> Result<(), String> {
    let path = Path::new(&file_path);

    if !path.exists() {
        return Err(format!("File not found: {}", file_path));
    }

    let canonical = std::fs::canonicalize(path)
        .map_err(|e| format!("Invalid path: {}", e))?;

    let content = tokio::fs::read_to_string(&canonical)
        .await
        .map_err(|e| format!("Failed to read file: {}", e))?;

    let updated = apply_frontmatter_update(&content, &key, &value)
        .map_err(|e| format!("Failed to update frontmatter: {}", e))?;

    tokio::fs::write(&canonical, updated)
        .await
        .map_err(|e| format!("Failed to write file: {}", e))
}

// --- Internal helpers ---

/// Parses frontmatter from a string, returning structured metadata and body.
pub fn parse_frontmatter_from_str(content: &str) -> Result<ParsedFrontmatter, String> {
    // Check for opening `---` delimiter at start of file
    if !content.starts_with("---") {
        return Ok(ParsedFrontmatter {
            frontmatter: Frontmatter::default(),
            body: content.to_string(),
            has_frontmatter: false,
        });
    }

    // Find the closing `---` delimiter (must be on its own line after the first)
    let rest = &content[3..];
    let close_pos = rest.find("\n---");

    match close_pos {
        None => {
            // Malformed frontmatter — treat entire content as body
            Ok(ParsedFrontmatter {
                frontmatter: Frontmatter::default(),
                body: content.to_string(),
                has_frontmatter: false,
            })
        }
        Some(pos) => {
            let yaml_block = &rest[..pos].trim_start_matches('\n');
            // Body starts after the closing `---\n`
            let body_start = 3 + pos + 4; // skip "\n---\n"
            let body = if body_start < content.len() {
                content[body_start..].trim_start_matches('\n').to_string()
            } else {
                String::new()
            };

            // Tolerant YAML parse: unknown fields are ignored via flatten/deny_unknown disabled
            let frontmatter: Frontmatter = serde_yaml::from_str(yaml_block)
                .unwrap_or_default();

            Ok(ParsedFrontmatter {
                frontmatter,
                body,
                has_frontmatter: true,
            })
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_frontmatter_valid() {
        let content = "---\ntitle: My Doc\nstatus: active\n---\n\nBody text here.";
        let result = parse_frontmatter_from_str(content).unwrap();
        assert!(result.has_frontmatter);
        assert_eq!(result.frontmatter.title, Some("My Doc".to_string()));
        assert_eq!(result.frontmatter.status, Some("active".to_string()));
        assert_eq!(result.body.trim(), "Body text here.");
    }

    #[test]
    fn test_parse_frontmatter_no_frontmatter() {
        let content = "# Just a heading\n\nSome body.";
        let result = parse_frontmatter_from_str(content).unwrap();
        assert!(!result.has_frontmatter);
        assert_eq!(result.body, content);
        assert_eq!(result.frontmatter.title, None);
    }

    #[test]
    fn test_parse_frontmatter_partial_fields() {
        let content = "---\ntitle: Only Title\n---\n\nContent.";
        let result = parse_frontmatter_from_str(content).unwrap();
        assert!(result.has_frontmatter);
        assert_eq!(result.frontmatter.title, Some("Only Title".to_string()));
        assert_eq!(result.frontmatter.status, None);
        assert_eq!(result.frontmatter.priority, None);
    }

    #[test]
    fn test_parse_frontmatter_empty_body() {
        let content = "---\ntitle: No Body\n---\n";
        let result = parse_frontmatter_from_str(content).unwrap();
        assert!(result.has_frontmatter);
        assert_eq!(result.body, "");
    }

    #[test]
    fn test_parse_frontmatter_malformed_returns_body() {
        // No closing --- delimiter
        let content = "---\ntitle: Broken\nNo closing delimiter";
        let result = parse_frontmatter_from_str(content).unwrap();
        assert!(!result.has_frontmatter);
        assert_eq!(result.body, content);
    }

    #[test]
    fn test_apply_frontmatter_update_adds_key_to_existing() {
        let content = "---\ntitle: Test\n---\n\nBody.";
        let result = apply_frontmatter_update(content, "status", "done").unwrap();
        assert!(result.contains("status: done"));
        assert!(result.contains("title: Test"));
        assert!(result.contains("Body."));
    }

    #[test]
    fn test_apply_frontmatter_update_creates_block_when_missing() {
        let content = "No frontmatter here.";
        let result = apply_frontmatter_update(content, "status", "active").unwrap();
        assert!(result.starts_with("---\n"));
        assert!(result.contains("status: active"));
        assert!(result.contains("No frontmatter here."));
    }
}

/// Updates or inserts a single key in the frontmatter YAML block.
/// Serializes the updated frontmatter back into the file content.
fn apply_frontmatter_update(content: &str, key: &str, value: &str) -> Result<String, String> {
    if !content.starts_with("---") {
        // No existing frontmatter — prepend a new block
        let new_fm = format!("---\n{}: {}\n---\n\n{}", key, value, content);
        return Ok(new_fm);
    }

    let rest = &content[3..];
    let close_pos = rest.find("\n---");

    match close_pos {
        None => {
            // Malformed — prepend new block
            let new_fm = format!("---\n{}: {}\n---\n\n{}", key, value, content);
            Ok(new_fm)
        }
        Some(pos) => {
            let yaml_block = &rest[..pos].trim_start_matches('\n');
            let body_start = 3 + pos + 4;
            let body = if body_start < content.len() {
                &content[body_start..]
            } else {
                ""
            };

            // Parse existing YAML into a generic map so we can update any field
            let mut yaml_map: serde_yaml::Mapping = serde_yaml::from_str(yaml_block)
                .unwrap_or_default();

            yaml_map.insert(
                serde_yaml::Value::String(key.to_string()),
                serde_yaml::Value::String(value.to_string()),
            );

            let updated_yaml = serde_yaml::to_string(&yaml_map)
                .map_err(|e| format!("YAML serialization error: {}", e))?;

            // serde_yaml adds a leading `---\n` prefix — strip it if present
            let yaml_content = updated_yaml
                .strip_prefix("---\n")
                .unwrap_or(&updated_yaml);

            Ok(format!("---\n{}---\n{}", yaml_content, body))
        }
    }
}
