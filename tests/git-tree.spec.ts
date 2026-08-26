import { describe, expect, it } from 'vitest'
import { buildPathTree, collapsedDirsForFocus } from '../src/client/git-tree.ts'

describe('collapsedDirsForFocus', () => {
  it('collapses every directory except the focus path and its ancestors', () => {
    const nodes = buildPathTree([
      { path: 'src/client/a.ts' },
      { path: 'src/host/b.ts' },
      { path: 'docs/readme.md' },
    ])
    const collapsed = collapsedDirsForFocus(nodes, 'src/client')
    expect(collapsed.has('src')).toBe(false)
    expect(collapsed.has('src/client')).toBe(false)
    expect(collapsed.has('src/host')).toBe(true)
    expect(collapsed.has('docs')).toBe(true)
  })

  it('expands everything when the focus is the repo root', () => {
    const nodes = buildPathTree([{ path: 'src/a.ts' }, { path: 'docs/b.md' }])
    expect(collapsedDirsForFocus(nodes, '')).toEqual(new Set())
  })
})
