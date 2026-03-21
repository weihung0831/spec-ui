/// Cross-platform process spawning utilities.
/// On Windows, sets `CREATE_NO_WINDOW` flag to prevent console window flashing
/// when spawning background processes from a GUI application.

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
