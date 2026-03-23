/// Cross-platform process spawning utilities.
/// On Windows, sets `CREATE_NO_WINDOW` flag to prevent console window flashing
/// when spawning background processes from a GUI application.
/// On macOS, resolves CLI tools via the user's login shell since GUI apps
/// launched from Finder/Dock don't inherit the terminal's PATH.

use std::sync::OnceLock;
use std::time::Duration;
use tokio::time::timeout;

#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x08000000;

/// Cached absolute path for the Claude CLI binary.
static CLAUDE_PATH: OnceLock<Option<String>> = OnceLock::new();

pub fn create_command(program: &str) -> tokio::process::Command {
    // On macOS/Linux, resolve "claude" to its absolute path since GUI apps
    // launched from Finder don't inherit the terminal's PATH.
    let resolved = if program == "claude" {
        resolve_claude_path().unwrap_or_else(|| program.to_string())
    } else {
        program.to_string()
    };

    #[allow(unused_mut)]
    let mut cmd = tokio::process::Command::new(&resolved);
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }
    cmd
}

/// Returns the platform-appropriate command for locating executables on PATH.
pub fn which_command() -> &'static str {
    #[cfg(target_os = "windows")]
    { "where" }
    #[cfg(not(target_os = "windows"))]
    { "which" }
}

/// Resolves the absolute path of the Claude CLI binary.
/// Tries multiple strategies: direct `which`, user's login shell, known paths.
/// Result is cached after the first successful resolution.
pub fn resolve_claude_path() -> Option<String> {
    CLAUDE_PATH.get_or_init(|| {
        // 1. Try direct `which` (works if PATH is already correct)
        if let Some(p) = try_which_claude() {
            return Some(p);
        }
        // 2. Try via user's login shell (sources .zshrc/.bash_profile)
        if let Some(p) = try_shell_which_claude() {
            return Some(p);
        }
        // 3. Check common install locations
        let home = std::env::var("HOME").unwrap_or_default();
        let candidates = [
            format!("{}/.local/bin/claude", home),
            format!("{}/.claude/bin/claude", home),
            "/usr/local/bin/claude".to_string(),
            format!("{}/.bun/bin/claude", home),
            format!("{}/.cargo/bin/claude", home),
        ];
        for path in &candidates {
            if std::path::Path::new(path).is_file() {
                return Some(path.clone());
            }
        }
        None
    }).clone()
}

/// Try `which claude` using the current process PATH.
fn try_which_claude() -> Option<String> {
    let out = std::process::Command::new(which_command())
        .arg("claude")
        .output()
        .ok()?;
    if out.status.success() {
        let p = String::from_utf8_lossy(&out.stdout).trim().to_string();
        if !p.is_empty() { return Some(p); }
    }
    None
}

/// Try resolving claude via the user's login shell to get full PATH.
fn try_shell_which_claude() -> Option<String> {
    // Use the user's actual shell, fallback to /bin/zsh then /bin/sh
    let shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/zsh".to_string());
    let out = std::process::Command::new(&shell)
        .args(["-lc", "which claude"])
        .output()
        .ok()?;
    if out.status.success() {
        let p = String::from_utf8_lossy(&out.stdout).trim().to_string();
        if !p.is_empty() { return Some(p); }
    }
    None
}

/// Run Claude CLI with the given args, piping prompt via stdin.
/// Returns raw stdout on success. Kills child process on timeout.
pub async fn run_claude_cli(args: &[&str], prompt: &str, timeout_secs: u64) -> Result<String, String> {
    use tokio::io::AsyncWriteExt;

    let mut child = create_command("claude")
        .args(args)
        .stdin(std::process::Stdio::piped())
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to spawn Claude CLI: {}", e))?;

    if let Some(mut stdin) = child.stdin.take() {
        stdin.write_all(prompt.as_bytes()).await
            .map_err(|e| format!("Failed to write to Claude stdin: {}", e))?;
        drop(stdin);
    }

    let child_id = child.id();
    let output = match timeout(Duration::from_secs(timeout_secs), child.wait_with_output()).await {
        Ok(Ok(out)) => out,
        Ok(Err(e)) => return Err(format!("Claude CLI execution error: {}", e)),
        Err(_) => {
            if let Some(id) = child_id {
                let _ = std::process::Command::new("kill").args(["-9", &id.to_string()]).output();
            }
            return Err(format!("Claude CLI timed out after {}s", timeout_secs));
        }
    };

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Claude CLI error: {}", stderr));
    }

    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}
