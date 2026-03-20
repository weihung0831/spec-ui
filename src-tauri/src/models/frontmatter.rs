use serde::{Deserialize, Serialize};

/// YAML frontmatter metadata parsed from markdown files.
/// All fields are optional to handle inconsistent frontmatter gracefully.
/// Uses camelCase serialization to match the TypeScript Frontmatter interface.
#[derive(Debug, Serialize, Deserialize, Default, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Frontmatter {
    pub title: Option<String>,
    pub description: Option<String>,
    pub status: Option<String>,
    pub priority: Option<String>,
    pub effort: Option<String>,
    pub tags: Option<Vec<String>>,
    pub created: Option<String>,
}

/// Result of parsing a markdown file's frontmatter section.
/// Includes the parsed metadata and the body content after the frontmatter block.
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ParsedFrontmatter {
    pub frontmatter: Frontmatter,
    /// Markdown body content with frontmatter stripped
    pub body: String,
    /// True if a frontmatter block was found in the content
    pub has_frontmatter: bool,
}
