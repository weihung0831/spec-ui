import { invoke } from '@tauri-apps/api/core'
import type { FileNode, ParsedFile } from '@/types/file-types'
import type { CoverageReport } from '@/types/coverage-types'

/**
 * Parsed frontmatter result returned by the parse_frontmatter command.
 * Matches the Rust ParsedFrontmatter struct (camelCase serialized).
 */
interface ParsedFrontmatterResult extends ParsedFile {
  hasFrontmatter: boolean
}

/**
 * Thin wrapper around Tauri IPC invoke() for all file system commands.
 * All methods return Promises that reject with a string error message on failure.
 */
export function useFileOperations() {
  /**
   * Reads UTF-8 content from a file at the given absolute path.
   */
  const readFile = (filePath: string): Promise<string> =>
    invoke<string>('read_file', { filePath })

  /**
   * Writes content to a file at the given absolute path.
   * Creates parent directories if they do not exist.
   */
  const writeFile = (filePath: string, content: string): Promise<void> =>
    invoke<void>('write_file', { filePath, content })

  /**
   * Lists directory contents as a FileNode tree.
   * Only returns .md files and directories; skips hidden entries.
   * @param recursive - When true, recursively populate children for subdirectories
   */
  const listDirectory = (dirPath: string, recursive: boolean = false): Promise<FileNode[]> =>
    invoke<FileNode[]>('list_directory', { dirPath, recursive })

  /**
   * Returns metadata for a single file as a FileNode (size, modified, extension).
   */
  const getFileMetadata = (filePath: string): Promise<FileNode> =>
    invoke<FileNode>('get_file_metadata', { filePath })

  /**
   * Parses YAML frontmatter from markdown content string.
   * Returns structured frontmatter, body text, and a flag indicating if frontmatter was found.
   */
  const parseFrontmatter = (content: string): Promise<ParsedFrontmatterResult> =>
    invoke<ParsedFrontmatterResult>('parse_frontmatter', { content })

  /**
   * Updates a single frontmatter field in a markdown file by key.
   * Reads the file, modifies the YAML block, and writes it back atomically.
   */
  const updateFrontmatter = (filePath: string, key: string, value: string): Promise<void> =>
    invoke<void>('update_frontmatter', { filePath, key, value })

  /**
   * Reads app settings JSON from the platform app data directory.
   * Returns '{}' if no settings file exists yet.
   */
  const readAppSettings = (): Promise<string> =>
    invoke<string>('read_app_settings')

  /**
   * Persists app settings JSON string to the platform app data directory.
   */
  const writeAppSettings = (settings: string): Promise<void> =>
    invoke<void>('write_app_settings', { settings })

  /**
   * Full-text search across all .md files in the given project paths.
   * Returns up to 100 matching results with file path, line number, and content.
   */
  const searchFiles = (
    query: string,
    projectPaths: string[],
    caseSensitive: boolean = false,
  ) => invoke<import("@/stores/search-store").SearchResult[]>("search_files", {
    query,
    projectPaths,
    caseSensitive,
  })

  /**
   * Start watching a directory for file system changes.
   * Events are emitted as `file-changed` Tauri events to the frontend.
   */
  const startWatching = (dirPath: string): Promise<void> =>
    invoke<void>("start_watching", { dirPath })

  /**
   * Stop watching a directory that was previously started with startWatching.
   */
  const stopWatching = (dirPath: string): Promise<void> =>
    invoke<void>("stop_watching", { dirPath })

  /**
   * Checks whether the `claude` CLI is installed on the user's system.
   * Returns availability flag, resolved binary path, and version string.
   */
  const checkClaudeCli = (): Promise<{ available: boolean; path: string; version: string }> =>
    invoke<{ available: boolean; path: string; version: string }>('check_claude_cli')

  /**
   * Runs the Claude CLI to analyze which requirements from specFile are
   * implemented in the codebase rooted at codePath.
   * Returns a full CoverageReport with per-requirement results and summary stats.
   */
  const analyzeCoverage = (specFile: string, codePath: string): Promise<CoverageReport> =>
    invoke<CoverageReport>('analyze_coverage', { specFile, codePath })

  return {
    readFile,
    writeFile,
    listDirectory,
    getFileMetadata,
    parseFrontmatter,
    updateFrontmatter,
    readAppSettings,
    writeAppSettings,
    searchFiles,
    startWatching,
    stopWatching,
    checkClaudeCli,
    analyzeCoverage,
  }
}
