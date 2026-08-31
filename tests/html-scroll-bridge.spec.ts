import { describe, expect, it } from 'vitest'
import {
  HTML_SCROLL_SOURCE,
  htmlScrollRestoreMessage,
  injectHtmlScrollBridge,
  parseHtmlScrollMessage,
} from '../src/html-scroll-bridge.ts'

describe('injectHtmlScrollBridge', () => {
  it('injects the bridge before </head>', () => {
    const out = injectHtmlScrollBridge('<html><head><title>x</title></head><body>hi</body></html>')
    expect(out).toContain('data-dsh-html-scroll="1"')
    expect(out.indexOf('data-dsh-html-scroll')).toBeLessThan(out.toLowerCase().indexOf('</head>'))
  })

  it('does not inject twice', () => {
    const once = injectHtmlScrollBridge('<html><head></head></html>')
    expect(injectHtmlScrollBridge(once)).toBe(once)
  })
})

describe('parseHtmlScrollMessage', () => {
  it('accepts a scroll report from the preview iframe', () => {
    expect(parseHtmlScrollMessage({ source: HTML_SCROLL_SOURCE, type: 'scroll', top: 480, left: 0 }))
      .toEqual({ top: 480, left: 0 })
  })

  it('rejects junk', () => {
    expect(parseHtmlScrollMessage({ type: 'scroll', top: 1, left: 0 })).toBeUndefined()
    expect(parseHtmlScrollMessage({ source: HTML_SCROLL_SOURCE, type: 'restore', top: 1, left: 0 })).toBeUndefined()
  })
})

describe('htmlScrollRestoreMessage', () => {
  it('builds the restore command the iframe listens for', () => {
    expect(htmlScrollRestoreMessage({ top: 120, left: 8 })).toEqual({
      source: HTML_SCROLL_SOURCE,
      type: 'restore',
      top: 120,
      left: 8,
    })
  })
})
