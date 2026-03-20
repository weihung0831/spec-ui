#![allow(dead_code)]

/// Unified application error type for Tauri IPC commands.
/// All variants implement Display via thiserror, enabling clear frontend error messages.
#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("File not found: {0}")]
    NotFound(String),

    #[error("Permission denied: {0}")]
    PermissionDenied(String),

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("YAML parse error: {0}")]
    YamlParse(String),

    #[error("Invalid path: {0}")]
    InvalidPath(String),
}

impl AppError {
    /// Convert to a simple string for Tauri IPC Result<T, String> pattern.
    pub fn to_ipc_error(self) -> String {
        self.to_string()
    }
}

/// Convenience trait for mapping AppError to String in IPC handlers.
pub trait IntoIpcError<T> {
    fn ipc_err(self) -> Result<T, String>;
}

impl<T> IntoIpcError<T> for Result<T, AppError> {
    fn ipc_err(self) -> Result<T, String> {
        self.map_err(|e| e.to_string())
    }
}
