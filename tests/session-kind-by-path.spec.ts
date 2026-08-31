import { describe, expect, it } from 'vitest'
import { explorerKindOf, sessionKindByPath } from '../src/client/git-status-style.ts'

describe('sessionKindByPath', () => {
  const cwd = '/work/proj'

  it('colors the file and every ancestor directory', () => {
    const map = sessionKindByPath(cwd, [{ path: '/work/proj/src/client/api.ts', kind: 'edit' }])
    expect(map.get('/work/proj/src/client/api.ts')).toBe('mod')
    expect(map.get('/work/proj/src/client')).toBe('mod')
    expect(map.get('/work/proj/src')).toBe('mod')
    expect(map.get('/work/proj')).toBe('mod')
  })

  it('picks the strongest kind among descendants (mod over add over delete)', () => {
    const map = sessionKindByPath(cwd, [
      { path: '/work/proj/src/a.ts', kind: 'add' },
      { path: '/work/proj/src/b.ts', kind: 'edit' },
      { path: '/work/proj/src/gone.ts', kind: 'delete' },
    ])
    expect(map.get('/work/proj/src')).toBe('mod')
    expect(map.get('/work/proj/src/a.ts')).toBe('add')
    expect(map.get('/work/proj/src/gone.ts')).toBe('del')
  })

  it('does not color a sibling folder that has no pending edits', () => {
    const map = sessionKindByPath(cwd, [{ path: '/work/proj/src/a.ts', kind: 'add' }])
    expect(map.get('/work/proj/lib')).toBeUndefined()
  })
})

describe('explorerKindOf', () => {
  it('keeps git color on a file so unaccepted untracked/added rows stay green/red', () => {
    const session = new Map([['/work/proj/src/a.ts', 'mod' as const]])
    const git = new Map([['/work/proj/src/a.ts', 'untracked' as const]])
    expect(explorerKindOf('/work/proj/src/a.ts', session, git, false)).toBe('untracked')
  })

  it('uses session color on a file when git has none', () => {
    const session = new Map([['/work/proj/src/a.ts', 'add' as const]])
    const git = new Map<string, 'add' | 'mod' | 'del'>()
    expect(explorerKindOf('/work/proj/src/a.ts', session, git, false)).toBe('add')
  })

  it('uses session color on a folder so pending conversation writes tint ancestors', () => {
    const session = new Map([['/work/proj/src', 'add' as const]])
    const git = new Map([['/work/proj/src', 'mod' as const]])
    expect(explorerKindOf('/work/proj/src', session, git, true)).toBe('add')
  })

  it('falls back to git on a folder with no pending session edit', () => {
    const session = new Map<string, 'add' | 'mod' | 'del'>()
    const git = new Map([['/work/proj/src', 'mod' as const]])
    expect(explorerKindOf('/work/proj/src', session, git, true)).toBe('mod')
  })
})
