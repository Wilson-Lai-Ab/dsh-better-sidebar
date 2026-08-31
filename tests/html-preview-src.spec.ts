import { describe, expect, it } from 'vitest'
import { htmlPreviewSrc, htmlPreviewStamp, htmlUrl } from '../src/client/api.ts'

describe('htmlPreviewSrc', () => {
  const scope = { sessionId: 's1' }

  it('is the path-encoded document URL when there is no stamp', () => {
    expect(htmlPreviewSrc(scope, '/p/a.html')).toBe(htmlUrl(scope, '/p/a.html'))
  })

  it('adds a cache-busting query when content changes, without dropping the path', () => {
    const a = htmlPreviewSrc(scope, '/p/a.html', '<h1>old</h1>')
    const b = htmlPreviewSrc(scope, '/p/a.html', '<h1>new</h1>')
    expect(a).toBe(`/sidebar/html/s1/p/a.html?v=${htmlPreviewStamp('<h1>old</h1>')}`)
    expect(b).toBe(`/sidebar/html/s1/p/a.html?v=${htmlPreviewStamp('<h1>new</h1>')}`)
    expect(a).not.toBe(b)
  })
})
