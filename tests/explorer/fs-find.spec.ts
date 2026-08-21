import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { findFiles, presentFindHit, scoreFileNameMatch, shouldSkipFindDir, treeOfFindHits } from '../../src/explorer/index.ts'

describe('scoreFileNameMatch', () => {
  it('matches a case-insensitive subsequence and ranks basename hits first', () => {
    expect(scoreFileNameMatch('ReviewView', 'src/client/ReviewView.tsx')).not.toBeNull()
    expect(scoreFileNameMatch('revw', 'src/client/ReviewView.tsx')).not.toBeNull()
    expect(scoreFileNameMatch('client/rev', 'src/client/ReviewView.tsx')).not.toBeNull()
    expect(scoreFileNameMatch('xyz', 'src/client/ReviewView.tsx')).toBeNull()
    const nameHit = scoreFileNameMatch('reviewv', 'src/client/ReviewView.tsx')!
    const pathHit = scoreFileNameMatch('reviewv', 'src/helpers/review-store.ts')
    expect(pathHit).toBeNull()
    expect(nameHit.score).toBeGreaterThan(scoreFileNameMatch('rv', 'src/vendor/random-values.ts')!.score)
  })

  it('does not match a class-like query against scattered path letters', () => {
    expect(scoreFileNameMatch(
      'StripPrefix',
      'hexin-modules/hexin-masterdata/src/main/resources/mapper/SysUserMapper.xml',
    )).toBeNull()
    expect(scoreFileNameMatch(
      'StripPrefix',
      'hexin-gateway/src/main/java/com/springframework/cloud/gateway/StripPrefixFilter.java',
    )).not.toBeNull()
    expect(scoreFileNameMatch('mapr', 'src/main/resources/mapper/User.xml')).toBeNull()
  })
})

describe('shouldSkipFindDir', () => {
  it('skips VCS, dependency, and hidden directories', () => {
    expect(shouldSkipFindDir('node_modules')).toBe(true)
    expect(shouldSkipFindDir('.git')).toBe(true)
    expect(shouldSkipFindDir('dist')).toBe(true)
    expect(shouldSkipFindDir('lib')).toBe(true)
    expect(shouldSkipFindDir('.pnpm-store')).toBe(true)
    expect(shouldSkipFindDir('src')).toBe(false)
    expect(shouldSkipFindDir('client')).toBe(false)
  })
})

describe('findFiles', () => {
  let root = ''

  afterEach(async () => {
    if (root !== '') await rm(root, { recursive: true, force: true })
    root = ''
  })

  it('returns ranked files and skips ignored directories', async () => {
    root = await mkdtemp(join(tmpdir(), 'dsh-find-'))
    await mkdir(join(root, 'src', 'client'), { recursive: true })
    await mkdir(join(root, 'node_modules', 'pkg'), { recursive: true })
    await writeFile(join(root, 'src', 'client', 'ReviewView.tsx'), '')
    await writeFile(join(root, 'src', 'review-store.ts'), '')
    await writeFile(join(root, 'node_modules', 'pkg', 'ReviewView.js'), '')
    const hits = await findFiles(root, 'reviewv', { limit: 10 })
    expect(hits.map(hit => hit.rel)).toEqual(['src/client/ReviewView.tsx'])
    expect(hits[0]!.path).toBe(join(root, 'src', 'client', 'ReviewView.tsx'))
    const fuzzy = await findFiles(root, 'revw', { limit: 10 })
    expect(fuzzy.map(hit => hit.rel).sort()).toEqual(['src/client/ReviewView.tsx', 'src/review-store.ts'].sort())
  })

  it('returns nothing for an empty query', async () => {
    root = await mkdtemp(join(tmpdir(), 'dsh-find-'))
    await writeFile(join(root, 'a.ts'), '')
    expect(await findFiles(root, '   ')).toEqual([])
  })
})

describe('presentFindHit', () => {
  it('shows class name, Java package, and module like IDE search', () => {
    expect(presentFindHit(
      'hexin-gateway/src/main/java/com/springframework/cloud/gateway/filter/factory/StripPrefixGatewayFilterFactory.java',
    )).toEqual({
      name: 'StripPrefixGatewayFilterFactory',
      location: 'com.springframework.cloud.gateway.filter.factory',
      module: 'hexin-gateway',
    })
  })

  it('falls back to the remaining folder path for non-Java files', () => {
    expect(presentFindHit('DSH-better-sidebar/src/client/ExplorerView.tsx')).toEqual({
      name: 'ExplorerView.tsx',
      location: 'src/client',
      module: 'DSH-better-sidebar',
    })
    expect(presentFindHit('README.md')).toEqual({
      name: 'README.md',
      location: null,
      module: null,
    })
  })
})

describe('treeOfFindHits', () => {
  it('nests hits under shared directories and lists files by name', () => {
    const tree = treeOfFindHits([
      { path: '/w/a/b/Foo.java', rel: 'a/b/Foo.java', score: 10, indices: [4, 5, 6] },
      { path: '/w/a/b/Bar.java', rel: 'a/b/Bar.java', score: 8, indices: [4, 5, 6] },
      { path: '/w/a/c/Baz.java', rel: 'a/c/Baz.java', score: 9, indices: [4, 5, 6] },
    ])
    expect(tree).toEqual({
      name: '',
      path: '',
      dirs: [{
        name: 'a',
        path: 'a',
        dirs: [
          {
            name: 'b',
            path: 'a/b',
            dirs: [],
            files: [
              { name: 'Foo.java', path: '/w/a/b/Foo.java', rel: 'a/b/Foo.java', score: 10, indices: [0, 1, 2] },
              { name: 'Bar.java', path: '/w/a/b/Bar.java', rel: 'a/b/Bar.java', score: 8, indices: [0, 1, 2] },
            ],
          },
          {
            name: 'c',
            path: 'a/c',
            dirs: [],
            files: [
              { name: 'Baz.java', path: '/w/a/c/Baz.java', rel: 'a/c/Baz.java', score: 9, indices: [0, 1, 2] },
            ],
          },
        ],
        files: [],
      }],
      files: [],
    })
  })
})
