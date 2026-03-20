use serde::{Deserialize, Serialize};

/// Represents a file or directory node in the file tree.
/// Uses camelCase serialization to match the TypeScript FileNode interface.
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct FileNode {
    /// File or directory name (basename only)
    pub name: String,

    /// Absolute path to the file or directory
    pub path: String,

    /// True if this node is a directory
    pub is_dir: bool,

    /// Child nodes (populated for directories when recursive=true)
    pub children: Option<Vec<FileNode>>,

    /// File size in bytes (None for directories)
    pub size: Option<u64>,

    /// Last modified time in ISO 8601 format (e.g. "2024-01-15T10:30:00Z")
    pub modified: Option<String>,

    /// File extension without leading dot (e.g. "md"), None for directories
    pub extension: Option<String>,
}
