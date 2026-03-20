import { describe, it, expect, beforeEach } from 'vitest'
import { useWorkspaceStore } from '@/stores/workspace-store'

beforeEach(() => {
  useWorkspaceStore.setState({
    projects: [],
    activeProjectId: null,
    fileTree: [],
    expandedDirs: [],
    selectedFilePath: null,
    sidebarWidth: 280,
    sidebarCollapsed: false,
  })
})

describe('workspace-store: addProject', () => {
  it('adds a new project with hashed ID and folder name', () => {
    useWorkspaceStore.getState().addProject('/home/user/my-project')
    const { projects, activeProjectId } = useWorkspaceStore.getState()
    expect(projects).toHaveLength(1)
    expect(projects[0].name).toBe('my-project')
    expect(projects[0].path).toBe('/home/user/my-project')
    expect(projects[0].id).toBeTruthy()
    expect(activeProjectId).toBe(projects[0].id)
  })

  it('sets newly added project as active', () => {
    useWorkspaceStore.getState().addProject('/path/a')
    useWorkspaceStore.getState().addProject('/path/b')
    const { projects, activeProjectId } = useWorkspaceStore.getState()
    expect(activeProjectId).toBe(projects[1].id)
  })

  it('prevents duplicate projects by path', () => {
    useWorkspaceStore.getState().addProject('/path/a')
    useWorkspaceStore.getState().addProject('/path/a')
    expect(useWorkspaceStore.getState().projects).toHaveLength(1)
  })

  it('generates stable IDs — same path yields same ID', () => {
    useWorkspaceStore.getState().addProject('/path/x')
    const id1 = useWorkspaceStore.getState().projects[0].id

    useWorkspaceStore.setState({ projects: [], activeProjectId: null })
    useWorkspaceStore.getState().addProject('/path/x')
    const id2 = useWorkspaceStore.getState().projects[0].id

    expect(id1).toBe(id2)
  })
})

describe('workspace-store: removeProject', () => {
  it('removes the project by ID', () => {
    useWorkspaceStore.getState().addProject('/path/a')
    const id = useWorkspaceStore.getState().projects[0].id
    useWorkspaceStore.getState().removeProject(id)
    expect(useWorkspaceStore.getState().projects).toHaveLength(0)
  })

  it('selects the next available project when active is removed', () => {
    useWorkspaceStore.getState().addProject('/path/a')
    useWorkspaceStore.getState().addProject('/path/b')
    const { projects } = useWorkspaceStore.getState()
    const idA = projects[0].id
    const idB = projects[1].id

    // b is currently active; remove b → a becomes active
    useWorkspaceStore.getState().removeProject(idB)
    expect(useWorkspaceStore.getState().activeProjectId).toBe(idA)
  })

  it('sets activeProjectId to null when last project removed', () => {
    useWorkspaceStore.getState().addProject('/path/a')
    const id = useWorkspaceStore.getState().projects[0].id
    useWorkspaceStore.getState().removeProject(id)
    expect(useWorkspaceStore.getState().activeProjectId).toBeNull()
  })

  it('keeps activeProjectId unchanged when a non-active project is removed', () => {
    useWorkspaceStore.getState().addProject('/path/a')
    useWorkspaceStore.getState().addProject('/path/b')
    const { projects } = useWorkspaceStore.getState()
    const idA = projects[0].id
    const idB = projects[1].id // active

    useWorkspaceStore.getState().removeProject(idA)
    expect(useWorkspaceStore.getState().activeProjectId).toBe(idB)
  })
})

describe('workspace-store: toggleDir', () => {
  it('expands a collapsed directory', () => {
    useWorkspaceStore.getState().toggleDir('/path/dir')
    expect(useWorkspaceStore.getState().expandedDirs).toContain('/path/dir')
  })

  it('collapses an expanded directory', () => {
    useWorkspaceStore.getState().toggleDir('/path/dir')
    useWorkspaceStore.getState().toggleDir('/path/dir')
    expect(useWorkspaceStore.getState().expandedDirs).not.toContain('/path/dir')
  })

  it('manages multiple directories independently', () => {
    useWorkspaceStore.getState().toggleDir('/path/a')
    useWorkspaceStore.getState().toggleDir('/path/b')
    const { expandedDirs } = useWorkspaceStore.getState()
    expect(expandedDirs).toContain('/path/a')
    expect(expandedDirs).toContain('/path/b')

    useWorkspaceStore.getState().toggleDir('/path/a')
    expect(useWorkspaceStore.getState().expandedDirs).not.toContain('/path/a')
    expect(useWorkspaceStore.getState().expandedDirs).toContain('/path/b')
  })
})
