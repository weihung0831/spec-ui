/** Represents a file or directory node in the file tree */
export interface FileNode {
  name: string
  path: string
  isDir: boolean
  children?: FileNode[]
  size?: number
  modified?: string
  extension?: string
  /** Optional frontmatter fields for badge display */
  status?: string
  priority?: string
}

/** Parsed YAML frontmatter from markdown files */
export interface Frontmatter {
  title?: string
  description?: string
  status?: string
  priority?: string
  effort?: string
  tags?: string[]
  created?: string
}

/** Parsed markdown file with frontmatter and body */
export interface ParsedFile {
  frontmatter: Frontmatter
  body: string
}
