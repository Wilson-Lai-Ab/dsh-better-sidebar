/**
 * OS default-app "open this path" argv per platform (no spawn — the host
 * route runs whatever this helper returns).
 */
import { describe, expect, it } from 'vitest'
import { openInBrowserCommand } from '../../src/explorer/fs-open-browser.ts'

describe('openInBrowserCommand', () => {
  it('uses open on macOS (default handler, HTML → browser)', () => {
    expect(openInBrowserCommand('darwin', '/work/index.html')).toEqual({
      cmd: 'open',
      args: ['/work/index.html'],
    })
  })

  it('uses cmd /c start on Windows (empty title so paths with spaces work)', () => {
    expect(openInBrowserCommand('win32', 'C:\\work\\index.html')).toEqual({
      cmd: 'cmd',
      args: ['/c', 'start', '', 'C:\\work\\index.html'],
    })
  })

  it('uses xdg-open on Linux', () => {
    expect(openInBrowserCommand('linux', '/work/index.html')).toEqual({
      cmd: 'xdg-open',
      args: ['/work/index.html'],
    })
  })
})
