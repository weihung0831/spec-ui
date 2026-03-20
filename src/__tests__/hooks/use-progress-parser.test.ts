import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useProgressParser } from '@/hooks/use-progress-parser'

describe('useProgressParser: checkbox counting', () => {
  it('counts completed and pending checkboxes', () => {
    const content = `
- [x] Task one
- [x] Task two
- [ ] Task three
`
    const { result } = renderHook(() => useProgressParser(content))
    expect(result.current.completed).toBe(2)
    expect(result.current.total).toBe(3)
    expect(result.current.percentage).toBe(67)
  })

  it('returns 0/0 for empty string', () => {
    const { result } = renderHook(() => useProgressParser(''))
    expect(result.current.completed).toBe(0)
    expect(result.current.total).toBe(0)
    expect(result.current.percentage).toBe(0)
  })

  it('returns 0/0 for content with no checkboxes', () => {
    const { result } = renderHook(() => useProgressParser('# Just a heading\n\nSome text.'))
    expect(result.current.completed).toBe(0)
    expect(result.current.total).toBe(0)
    expect(result.current.percentage).toBe(0)
  })

  it('counts nested (indented) checkboxes', () => {
    const content = `
- [x] Parent
  - [x] Child completed
  - [ ] Child pending
`
    const { result } = renderHook(() => useProgressParser(content))
    expect(result.current.completed).toBe(2)
    expect(result.current.total).toBe(3)
  })

  it('handles mixed content with prose and headings', () => {
    const content = `
# Plan

Some intro text.

## Tasks

- [x] Done task
- [ ] Pending task
- [ ] Another pending

Regular list:
- item without checkbox
`
    const { result } = renderHook(() => useProgressParser(content))
    expect(result.current.completed).toBe(1)
    expect(result.current.total).toBe(3)
    expect(result.current.percentage).toBe(33)
  })

  it('returns 100% when all tasks are completed', () => {
    const content = '- [x] A\n- [x] B\n- [x] C'
    const { result } = renderHook(() => useProgressParser(content))
    expect(result.current.percentage).toBe(100)
    expect(result.current.total).toBe(3)
  })

  it('returns 0% when no tasks are completed', () => {
    const content = '- [ ] A\n- [ ] B'
    const { result } = renderHook(() => useProgressParser(content))
    expect(result.current.percentage).toBe(0)
    expect(result.current.total).toBe(2)
    expect(result.current.completed).toBe(0)
  })

  it('supports asterisk bullet style', () => {
    const content = '* [x] Done\n* [ ] Pending'
    const { result } = renderHook(() => useProgressParser(content))
    expect(result.current.completed).toBe(1)
    expect(result.current.total).toBe(2)
  })
})
