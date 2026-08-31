/**
 * Preview / edit mode for markdown and HTML: first open of a reviewed
 * file is source; a user toggle must survive leaving the file tab
 * (center overlay hidden) and coming back.
 */
import { afterEach, describe, expect, it } from 'vitest'
import {
  defaultViewMode,
  forgetViewMode,
  rememberViewMode,
  resetRememberedViewModes,
  resolveViewMode,
} from '../src/client/editor-view-mode.ts'

afterEach(() => {
  resetRememberedViewModes()
})

describe('defaultViewMode', () => {
  it('opens reviewed markdown and HTML in source, everything else in preview', () => {
    expect(defaultViewMode('html', true)).toBe('edit')
    expect(defaultViewMode('markdown', true)).toBe('edit')
    expect(defaultViewMode('html', false)).toBe('preview')
    expect(defaultViewMode('markdown', false)).toBe('preview')
    expect(defaultViewMode('code', true)).toBe('preview')
  })
})

describe('resolveViewMode', () => {
  it('uses the review default until the user toggles', () => {
    expect(resolveViewMode({
      sessionId: 's1',
      path: '/p/a.html',
      viewerId: 'html',
      hasReview: true,
    })).toBe('edit')
  })

  it('keeps the user preview choice for the same session+path after a remount', () => {
    rememberViewMode('s1', '/p/a.html', 'preview')
    expect(resolveViewMode({
      sessionId: 's1',
      path: '/p/a.html',
      viewerId: 'html',
      hasReview: true,
    })).toBe('preview')
  })

  it('does not leak the choice to another file or session', () => {
    rememberViewMode('s1', '/p/a.html', 'preview')
    expect(resolveViewMode({
      sessionId: 's1',
      path: '/p/b.html',
      viewerId: 'html',
      hasReview: true,
    })).toBe('edit')
    expect(resolveViewMode({
      sessionId: 's2',
      path: '/p/a.html',
      viewerId: 'html',
      hasReview: true,
    })).toBe('edit')
  })

  it('forgets the choice when the file tab closes, so the next open uses the review default', () => {
    rememberViewMode('s1', '/p/a.html', 'preview')
    forgetViewMode('s1', '/p/a.html')
    expect(resolveViewMode({
      sessionId: 's1',
      path: '/p/a.html',
      viewerId: 'html',
      hasReview: true,
    })).toBe('edit')
  })
})
