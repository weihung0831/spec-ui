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

// Module-level to avoid re-creating on every render (fixes auto-save & file re-read churn).

const readFile = (filePath: string): Promise<string> =>
  invoke<string>('read_file', { filePath })

const writeFile = (filePath: string, content: string): Promise<void> =>
  invoke<void>('write_file', { filePath, content })

const listDirectory = (dirPath: string, recursive: boolean = false): Promise<FileNode[]> =>
  invoke<FileNode[]>('list_directory', { dirPath, recursive })

const getFileMetadata = (filePath: string): Promise<FileNode> =>
  invoke<FileNode>('get_file_metadata', { filePath })

const parseFrontmatter = (content: string): Promise<ParsedFrontmatterResult> =>
  invoke<ParsedFrontmatterResult>('parse_frontmatter', { content })

const updateFrontmatter = (filePath: string, key: string, value: string): Promise<void> =>
  invoke<void>('update_frontmatter', { filePath, key, value })

const readAppSettings = (): Promise<string> =>
  invoke<string>('read_app_settings')

const writeAppSettings = (settings: string): Promise<void> =>
  invoke<void>('write_app_settings', { settings })

const searchFiles = (
  query: string,
  projectPaths: string[],
  caseSensitive: boolean = false,
) => invoke<import("@/stores/search-store").SearchResult[]>("search_files", {
  query,
  projectPaths,
  caseSensitive,
})

const deleteFile = (filePath: string): Promise<void> =>
  invoke<void>("delete_file", { filePath })

const startWatching = (dirPath: string): Promise<void> =>
  invoke<void>("start_watching", { dirPath })

const stopWatching = (dirPath: string): Promise<void> =>
  invoke<void>("stop_watching", { dirPath })

const checkClaudeCli = (): Promise<{ available: boolean; path: string; version: string }> =>
  invoke<{ available: boolean; path: string; version: string }>('check_claude_cli')

const analyzeCoverage = (specFile: string, codePath: string): Promise<CoverageReport> =>
  invoke<CoverageReport>('analyze_coverage', { specFile, codePath })

/** Stable object returned by the hook — same reference across all renders. */
const fileOps = {
  readFile,
  writeFile,
  listDirectory,
  getFileMetadata,
  parseFrontmatter,
  updateFrontmatter,
  readAppSettings,
  writeAppSettings,
  searchFiles,
  deleteFile,
  startWatching,
  stopWatching,
  checkClaudeCli,
  analyzeCoverage,
} as const

/**
 * Thin wrapper around Tauri IPC invoke() for all file system commands.
 * Returns module-level stable references to avoid useEffect dependency churn.
 */
export function useFileOperations() {
  return fileOps
}
