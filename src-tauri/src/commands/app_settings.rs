use tauri::Manager;

/// Reads app settings JSON from the platform-specific app data directory.
/// Returns the raw JSON string, or an empty object string if no settings file exists yet.
#[tauri::command]
pub async fn read_app_settings(app_handle: tauri::AppHandle) -> Result<String, String> {
    let settings_path = get_settings_path(&app_handle)?;

    if !settings_path.exists() {
        return Ok("{}".to_string());
    }

    tokio::fs::read_to_string(&settings_path)
        .await
        .map_err(|e| format!("Failed to read settings: {}", e))
}

/// Writes app settings JSON string to the platform-specific app data directory.
/// Creates the directory if it does not exist.
#[tauri::command]
pub async fn write_app_settings(
    app_handle: tauri::AppHandle,
    settings: String,
) -> Result<(), String> {
    let settings_path = get_settings_path(&app_handle)?;

    // Ensure the app data directory exists
    if let Some(parent) = settings_path.parent() {
        tokio::fs::create_dir_all(parent)
            .await
            .map_err(|e| format!("Failed to create settings directory: {}", e))?;
    }

    tokio::fs::write(&settings_path, settings)
        .await
        .map_err(|e| format!("Failed to write settings: {}", e))
}

// --- Internal helpers ---

/// Resolves the settings file path within the app's data directory.
fn get_settings_path(app_handle: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    let data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to resolve app data directory: {}", e))?;

    Ok(data_dir.join("settings.json"))
}
