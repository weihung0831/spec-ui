/// Cross-platform process spawning utilities.
/// On Windows, sets `CREATE_NO_WINDOW` flag to prevent console window flashing
/// when spawning background processes from a GUI application.

use std::time::Duration;
use tokio::time::timeout;

#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x08000000;

pub fn create_command(program: &str) -> tokio::process::Command {
    #[allow(unused_mut)]
    let mut cmd = tokio::process::Command::new(program);
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
