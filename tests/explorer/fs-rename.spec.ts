import { describe, expect, it } from 'vitest'
import { fencedRename, isRenameName } from '../../src/explorer/fs-rename.ts'
import { SidebarError } from '../../src/wire.ts'

describe('fencedRename', () => {
  const cwd = '/work'

  it('accepts a sibling rename under the workspace', () => {
    expect(fencedRename(cwd, '/work/src/a.ts', '/work/src/b.ts')).toEqual({
      from: '/work/src/a.ts',
      to: '/work/src/b.ts',
    })
  })

  it('rejects a move into another directory', () => {
    expect(() => fencedRename(cwd, '/work/src/a.ts', '/work/lib/a.ts')).toThrow(SidebarError)
  })

  it('rejects a path outside the workspace', () => {
    expect(() => fencedRename(cwd, '/tmp/a.ts', '/tmp/b.ts')).toThrow(SidebarError)
  })

  it('rejects renaming the workspace root', () => {
    expect(() => fencedRename(cwd, '/work', '/work-old')).toThrow(SidebarError)
  })
})

describe('isRenameName', () => {
  it('rejects empty, dotted, and nested names', () => {
    expect(isRenameName('main.ts')).toBe(true)
    expect(isRenameName('')).toBe(false)
    expect(isRenameName('..')).toBe(false)
    expect(isRenameName('a/b')).toBe(false)
  })
})
