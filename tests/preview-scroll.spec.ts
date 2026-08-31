import { afterEach, describe, expect, it } from 'vitest'
import {
  forgetPreviewScroll,
  previewScrollOf,
  rememberPreviewScroll,
  resetRememberedPreviewScroll,
} from '../src/client/preview-scroll.ts'

afterEach(() => {
  resetRememberedPreviewScroll()
})

describe('previewScrollOf', () => {
  it('returns the last recorded offset for the same session+path', () => {
    rememberPreviewScroll('s1', '/p/a.md', { top: 480, left: 0 })
    expect(previewScrollOf('s1', '/p/a.md')).toEqual({ top: 480, left: 0 })
  })

  it('does not leak to another file', () => {
    rememberPreviewScroll('s1', '/p/a.md', { top: 480, left: 0 })
    expect(previewScrollOf('s1', '/p/b.md')).toBeUndefined()
  })

  it('forgets when the file tab closes', () => {
    rememberPreviewScroll('s1', '/p/a.md', { top: 480, left: 0 })
    forgetPreviewScroll('s1', '/p/a.md')
    expect(previewScrollOf('s1', '/p/a.md')).toBeUndefined()
  })
})
