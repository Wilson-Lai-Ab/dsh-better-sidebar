import { describe, expect, it } from 'vitest'
import {
  EXPLORER_POLL_MS,
  listingsEqual,
  visibleExplorerDirs,
} from '../src/client/explorer/explorer-refresh.ts'

describe('visibleExplorerDirs', () => {
  it('lists the workspace root plus every expanded directory', () => {
    expect(visibleExplorerDirs(undefined, ['/proj/src'])).toEqual([])
    expect(visibleExplorerDirs('/proj', [])).toEqual(['/proj'])
    expect(visibleExplorerDirs('/proj', ['/proj/src', '/proj/docs'])).toEqual([
      '/proj',
      '/proj/src',
      '/proj/docs',
    ])
  })

  it('does not duplicate the root when it is also in the expansion set', () => {
    expect(visibleExplorerDirs('/proj', ['/proj', '/proj/src'])).toEqual(['/proj', '/proj/src'])
  })
})

describe('listingsEqual', () => {
  it('detects a newly created file in a cached directory', () => {
    const before = [{ path: '/proj/a.ts' }, { path: '/proj/b.ts' }]
    const after = [{ path: '/proj/a.ts' }, { path: '/proj/b.ts' }, { path: '/proj/c.ts' }]
    expect(listingsEqual(before, after)).toBe(false)
    expect(listingsEqual(after, after)).toBe(true)
    expect(listingsEqual(undefined, after)).toBe(false)
  })
})

describe('explorer poll interval', () => {
  it('refreshes on a short interval so new files appear without a manual click', () => {
    expect(EXPLORER_POLL_MS).toBeGreaterThanOrEqual(1000)
    expect(EXPLORER_POLL_MS).toBeLessThanOrEqual(4000)
  })
})