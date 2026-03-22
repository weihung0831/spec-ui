mod commands;
mod errors;
mod models;
pub(crate) mod process_utils;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::file_operations::read_file,
            commands::file_operations::write_file,
            commands::file_operations::list_directory,
            commands::file_operations::get_file_metadata,
            commands::file_operations::open_in_editor,
            commands::file_operations::delete_file,
            commands::frontmatter::parse_frontmatter,
            commands::frontmatter::update_frontmatter,
            commands::app_settings::read_app_settings,
            commands::app_settings::write_app_settings,
            commands::search::search_files,
            commands::watcher::start_watching,
            commands::watcher::stop_watching,
            commands::coverage::extract_requirements,
            commands::coverage::check_claude_cli,
            commands::coverage::analyze_coverage,
            commands::coverage::read_coverage_cache,
            commands::coverage::write_coverage_cache,
            commands::coverage::get_changed_files,
            commands::coverage::save_coverage_override,
            commands::spec_analyzer::analyze_spec,
            commands::spec_analyzer::translate_analysis,
            commands::spec_analyzer::read_analysis_cache,
            commands::spec_analyzer::write_analysis_cache,
            commands::spec_analyzer::export_analysis_markdown,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
