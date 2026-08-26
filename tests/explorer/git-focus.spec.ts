import { describe, expect, it } from 'vitest'
import { gitFocusOf } from '../../src/client/explorer/git-focus.ts'

describe('gitFocusOf', () => {
  const repos = [{ root: '/work' }, { root: '/work/packages/app' }]

  it('picks the innermost work tree and the file parent', () => {
    expect(gitFocusOf('/work/packages/app/src/main.ts', false, repos)).toEqual({
      repo: '/work/packages/app',
      dir: 'src',
    })
  })

  it('keeps a directory as the focus dir and the repo root as empty', () => {
    expect(gitFocusOf('/work/src', true, repos)).toEqual({ repo: '/work', dir: 'src' })
    expect(gitFocusOf('/work', true, repos)).toEqual({ repo: '/work', dir: '' })
  })

  it('returns undefined outside any work tree', () => {
    expect(gitFocusOf('/tmp/x.ts', false, repos)).toBeUndefined()
  })
})
