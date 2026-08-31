import { describe, expect, it } from 'vitest'
import { sessionEditsFromLhPending } from '../src/client/lh-pending.ts'
import { sessionKindByPath } from '../src/client/git-status-style.ts'

describe('sessionEditsFromLhPending', () => {
  it('maps pending agent records into session edits for explorer color', () => {
    const edits = sessionEditsFromLhPending([
      { path: '/work/proj/src/client/api.ts', kind: 'edit', decision: 'pending' },
      { path: '/work/proj/src/new.ts', kind: 'add', decision: 'pending' },
      { path: '/work/proj/src/old.ts', kind: 'edit', decision: 'accepted' },
    ])
    expect(edits).toEqual([
      { path: '/work/proj/src/client/api.ts', kind: 'edit' },
      { path: '/work/proj/src/new.ts', kind: 'add' },
    ])
    const map = sessionKindByPath('/work/proj', edits)
    expect(map.get('/work/proj/src/client')).toBe('mod')
    expect(map.get('/work/proj/src/new.ts')).toBe('add')
    expect(map.get('/work/proj/src/old.ts')).toBeUndefined()
  })
})
