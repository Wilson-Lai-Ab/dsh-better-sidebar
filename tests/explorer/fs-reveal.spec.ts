/**
 * Reveal-in-file-manager argv per platform (no spawn — the host route
 * runs whatever this helper returns).
 */
import { describe, expect, it } from 'vitest'
import { revealCommand } from '../../src/explorer/fs-reveal.ts'

describe('revealCommand', () => {
  it('uses open -R on macOS (Finder selects the item)', () => {
    expect(revealCommand('darwin', '/work/src/main.ts', false)).toEqual({
      cmd: 'open',
      args: ['-R', '/work/src/main.ts'],
    })
  })

  it('uses explorer /select on Windows', () => {
    expect(revealCommand('win32', 'C:\\work\\src\\main.ts', false)).toEqual({
      cmd: 'explorer',
      args: ['/select,C:\\work\\src\\main.ts'],
    })
  })

  it('opens the parent folder on Linux for a file, the dir itself for a directory', () => {
    expect(revealCommand('linux', '/work/src/main.ts', false)).toEqual({
      cmd: 'xdg-open',
      args: ['/work/src'],
    })
    expect(revealCommand('linux', '/work/src', true)).toEqual({
      cmd: 'xdg-open',
      args: ['/work/src'],
    })
  })
})
