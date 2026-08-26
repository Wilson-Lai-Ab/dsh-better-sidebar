/**
 * Sidebar-browser seed URL: HTML files go through /sidebar/html so relative
 * assets resolve; everything else uses /sidebar/file. Directories have no
 * preview URL (the plugin-browser row is omitted).
 */
import { describe, expect, it } from 'vitest'
import { pluginBrowserHref } from '../../src/client/explorer/plugin-browser.ts'

describe('pluginBrowserHref', () => {
  it('builds an origin-absolute HTML preview URL for .html/.htm', () => {
    expect(pluginBrowserHref({
      origin: 'http://127.0.0.1:3080',
      sessionId: 's1',
      path: '/work/docs/index.html',
      isDir: false,
    })).toBe('http://127.0.0.1:3080/sidebar/html/s1/work/docs/index.html')
  })

  it('builds a /sidebar/file URL for non-HTML files (cwd carried)', () => {
    const href = pluginBrowserHref({
      origin: 'http://127.0.0.1:3080/',
      sessionId: 's1',
      cwd: '/work',
      path: '/work/shot.png',
      isDir: false,
    })
    expect(href).toBe(
      'http://127.0.0.1:3080/sidebar/file?sessionId=s1&path=%2Fwork%2Fshot.png&cwd=%2Fwork',
    )
  })

  it('returns undefined for a directory (no file to embed)', () => {
    expect(pluginBrowserHref({
      origin: 'http://127.0.0.1:3080',
      sessionId: 's1',
      path: '/work/docs',
      isDir: true,
    })).toBeUndefined()
  })
})
