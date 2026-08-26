/**
 * Explorer context-menu composition: Reveal / Terminal / Rename / Git sit
 * in front of the existing download + copy actions, and the rename target
 * stays a sibling of the original path.
 */
import { describe, expect, it } from 'vitest'
import {
  entryNameOf, explorerRowMenuIds, siblingPathOf, terminalCwdOf,
} from '../../src/client/explorer/row-menu.ts'

describe('explorerRowMenuIds', () => {
  it('keeps download + copy on a file and prepends reveal/terminal/browser/rename/git', () => {
    expect(explorerRowMenuIds({ isDir: false, isRoot: false, inGit: true })).toEqual([
      'reveal', 'terminal', 'browser', 'rename', 'git', 'download', 'relative', 'absolute',
    ])
  })

  it('omits download and browser on a directory and omits rename on the workspace root', () => {
    expect(explorerRowMenuIds({ isDir: true, isRoot: true, inGit: false })).toEqual([
      'reveal', 'terminal', 'relative', 'absolute',
    ])
  })

  it('omits git when the path is not inside a work tree', () => {
    expect(explorerRowMenuIds({ isDir: false, isRoot: false, inGit: false })).toEqual([
      'reveal', 'terminal', 'browser', 'rename', 'download', 'relative', 'absolute',
    ])
  })
})

describe('terminalCwdOf', () => {
  it('uses the directory itself and the file parent', () => {
    expect(terminalCwdOf('/work/src', true)).toBe('/work/src')
    expect(terminalCwdOf('/work/src/main.ts', false)).toBe('/work/src')
  })
})

describe('siblingPathOf', () => {
  it('renames in place and rejects empty / dotted / nested names', () => {
    expect(entryNameOf('/work/src/main.ts')).toBe('main.ts')
    expect(siblingPathOf('/work/src/main.ts', 'app.ts')).toBe('/work/src/app.ts')
    expect(siblingPathOf('/work/src/main.ts', '')).toBeUndefined()
    expect(siblingPathOf('/work/src/main.ts', '..')).toBeUndefined()
    expect(siblingPathOf('/work/src/main.ts', 'a/b')).toBeUndefined()
  })
})
