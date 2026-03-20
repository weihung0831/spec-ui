use notify::{Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use serde::Serialize;
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::{Mutex, OnceLock};
use std::time::{Duration, Instant};
use tauri::Emitter;

/// Payload emitted to the frontend on file changes.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct FileChangedPayload {
    event_type: String,
    path: String,
}

/// Per-watcher state: holds the watcher alive for its lifetime.
struct WatcherState {
    _watcher: RecommendedWatcher,
}

/// Global registry: dir_path -> WatcherState, guarded by std::sync::Mutex.
static WATCHERS: OnceLock<Mutex<HashMap<String, WatcherState>>> = OnceLock::new();

fn watchers() -> &'static Mutex<HashMap<String, WatcherState>> {
    WATCHERS.get_or_init(|| Mutex::new(HashMap::new()))
}

const DEBOUNCE_MS: u64 = 500;

/// Map a notify EventKind to a frontend event type string.
fn event_type_str(kind: &EventKind) -> Option<&'static str> {
    match kind {
        EventKind::Create(_) => Some("create"),
        EventKind::Modify(_) => Some("modify"),
        EventKind::Remove(_) => Some("remove"),
        _ => None,
    }
}

/// Start watching a directory recursively. Emits "file-changed" events to the frontend.
#[tauri::command]
pub async fn start_watching(
    dir_path: String,
    app_handle: tauri::AppHandle,
) -> Result<(), String> {
    let dir = PathBuf::from(&dir_path);
    if !dir.is_dir() {
        return Err(format!("Not a directory: {dir_path}"));
    }

    // Shared debounce map accessed from the watcher callback (sync closure).
    let debounce: std::sync::Arc<Mutex<HashMap<PathBuf, Instant>>> =
        std::sync::Arc::new(Mutex::new(HashMap::new()));

    let debounce_cb = debounce.clone();
    let app_cb = app_handle.clone();

    let watcher = notify::recommended_watcher(move |res: notify::Result<Event>| {
        let event = match res {
            Ok(e) => e,
            Err(_) => return,
        };

        let event_type = match event_type_str(&event.kind) {
            Some(t) => t,
            None => return,
        };

        for path in &event.paths {
            // Only handle .md files
            if path.extension().and_then(|e| e.to_str()) != Some("md") {
                continue;
            }

            // Debounce: skip if same path fired within DEBOUNCE_MS
            let now = Instant::now();
            {
                let mut map = debounce_cb.lock().unwrap();
                if let Some(last) = map.get(path) {
                    if now.duration_since(*last) < Duration::from_millis(DEBOUNCE_MS) {
                        continue;
                    }
                }
                map.insert(path.clone(), now);
            }

            let payload = FileChangedPayload {
                event_type: event_type.to_string(),
                path: path.to_string_lossy().to_string(),
            };

            let _ = app_cb.emit("file-changed", payload);
        }
    })
    .map_err(|e| e.to_string())?;

    // Guard against duplicate watchers.
    {
        let map = watchers().lock().unwrap();
        if map.contains_key(&dir_path) {
            return Ok(());
        }
    }

    let mut watcher = watcher;
    watcher
        .watch(&dir, RecursiveMode::Recursive)
        .map_err(|e| e.to_string())?;

    let state = WatcherState { _watcher: watcher };
    watchers().lock().unwrap().insert(dir_path, state);

    Ok(())
}

/// Stop watching a previously registered directory.
#[tauri::command]
pub async fn stop_watching(dir_path: String) -> Result<(), String> {
    let mut map = watchers().lock().unwrap();
    if map.remove(&dir_path).is_none() {
        return Err(format!("No watcher registered for: {dir_path}"));
    }
    Ok(())
}
