import { describe, it, expect, beforeEach } from 'vitest'
import { useEditorStore } from '@/stores/editor-store'

// Reset store data fields before each test
beforeEach(() => {
  // Close all open files individually to mirror real usage
  const { openFiles } = useEditorStore.getState()
  Object.keys(openFiles).forEach((path) => useEditorStore.getState().closeFile(path))
  useEditorStore.setState({ activeFileId: null, previewMode: 'split' })
})

describe('editor-store: openFile', () => {
  it('adds file to openFiles and sets activeFileId', () => {
    useEditorStore.getState().openFile('/path/to/file.md', '# Hello')
    const state = useEditorStore.getState()
    expect(state.openFiles['/path/to/file.md']).toBeDefined()
    expect(state.openFiles['/path/to/file.md'].content).toBe('# Hello')
    expect(state.activeFileId).toBe('/path/to/file.md')
  })

  it('stores originalContent equal to content on open', () => {
    useEditorStore.getState().openFile('/a.md', 'initial')
    const file = useEditorStore.getState().openFiles['/a.md']
    expect(file.content).toBe('initial')
    expect(file.originalContent).toBe('initial')
  })

  it('opening a second file sets it as active', () => {
    useEditorStore.getState().openFile('/a.md', 'aaa')
    useEditorStore.getState().openFile('/b.md', 'bbb')
    expect(useEditorStore.getState().activeFileId).toBe('/b.md')
  })
})

describe('editor-store: closeFile', () => {
  it('removes file from openFiles', () => {
    useEditorStore.getState().openFile('/a.md', 'aaa')
    useEditorStore.getState().closeFile('/a.md')
    expect(useEditorStore.getState().openFiles['/a.md']).toBeUndefined()
  })

  it('sets activeFileId to last remaining file when active is closed', () => {
    useEditorStore.getState().openFile('/a.md', 'aaa')
    useEditorStore.getState().openFile('/b.md', 'bbb')
    useEditorStore.getState().closeFile('/b.md')
    expect(useEditorStore.getState().activeFileId).toBe('/a.md')
  })

  it('sets activeFileId to null when last file is closed', () => {
    useEditorStore.getState().openFile('/a.md', 'aaa')
    useEditorStore.getState().closeFile('/a.md')
    expect(useEditorStore.getState().activeFileId).toBeNull()
  })

  it('keeps activeFileId unchanged when a non-active file is closed', () => {
    useEditorStore.getState().openFile('/a.md', 'aaa')
    useEditorStore.getState().openFile('/b.md', 'bbb')
    useEditorStore.getState().closeFile('/a.md')
    expect(useEditorStore.getState().activeFileId).toBe('/b.md')
  })
})

describe('editor-store: updateContent', () => {
  it('updates content without changing originalContent', () => {
    useEditorStore.getState().openFile('/a.md', 'original')
    useEditorStore.getState().updateContent('/a.md', 'modified')
    const file = useEditorStore.getState().openFiles['/a.md']
    expect(file.content).toBe('modified')
    expect(file.originalContent).toBe('original')
  })

  it('is a no-op for files not in openFiles', () => {
    useEditorStore.getState().openFile('/a.md', 'original')
    useEditorStore.getState().updateContent('/nonexistent.md', 'new content')
    expect(useEditorStore.getState().openFiles['/nonexistent.md']).toBeUndefined()
  })
})

describe('editor-store: markSaved', () => {
  it('sets originalContent to current content', () => {
    useEditorStore.getState().openFile('/a.md', 'original')
    useEditorStore.getState().updateContent('/a.md', 'modified')
    useEditorStore.getState().markSaved('/a.md')
    const file = useEditorStore.getState().openFiles['/a.md']
    expect(file.originalContent).toBe('modified')
  })

  it('is a no-op for files not in openFiles', () => {
    // Should not throw
    expect(() => useEditorStore.getState().markSaved('/nonexistent.md')).not.toThrow()
  })
})

describe('editor-store: isUnsaved', () => {
  it('returns false when content matches originalContent', () => {
    useEditorStore.getState().openFile('/a.md', 'content')
    expect(useEditorStore.getState().isUnsaved('/a.md')).toBe(false)
  })

  it('returns true after updateContent', () => {
    useEditorStore.getState().openFile('/a.md', 'content')
    useEditorStore.getState().updateContent('/a.md', 'changed')
    expect(useEditorStore.getState().isUnsaved('/a.md')).toBe(true)
  })

  it('returns false after markSaved', () => {
    useEditorStore.getState().openFile('/a.md', 'content')
    useEditorStore.getState().updateContent('/a.md', 'changed')
    useEditorStore.getState().markSaved('/a.md')
    expect(useEditorStore.getState().isUnsaved('/a.md')).toBe(false)
  })

  it('returns false for unknown paths', () => {
    expect(useEditorStore.getState().isUnsaved('/nonexistent.md')).toBe(false)
  })
})

describe('editor-store: cyclePreviewMode', () => {
  it('cycles split -> editor-only -> preview-only -> split', () => {
    const store = useEditorStore.getState()
    expect(store.previewMode).toBe('split')

    store.cyclePreviewMode()
    expect(useEditorStore.getState().previewMode).toBe('editor-only')

    useEditorStore.getState().cyclePreviewMode()
    expect(useEditorStore.getState().previewMode).toBe('preview-only')

    useEditorStore.getState().cyclePreviewMode()
    expect(useEditorStore.getState().previewMode).toBe('split')
  })
})
