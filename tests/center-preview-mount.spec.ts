import { describe, expect, it } from 'vitest'
import { isCenterBodyShown, resolveCenterShown } from '../src/client/center-preview-mount.ts'

describe('resolveCenterShown', () => {
  it('shows the active file tab', () => {
    expect(resolveCenterShown(['a', 'b'], 'b', 'a')).toEqual({
      shownId: 'b',
      chatting: false,
      lastId: 'b',
    })
  })

  it('keeps the last file shown while chatting so iframe scroll survives', () => {
    expect(resolveCenterShown(['a', 'b'], null, 'b')).toEqual({
      shownId: 'b',
      chatting: true,
      lastId: 'b',
    })
    expect(isCenterBodyShown('b', 'b')).toBe(true)
    expect(isCenterBodyShown('a', 'b')).toBe(false)
  })

  it('does not keep a closed file', () => {
    expect(resolveCenterShown(['a'], null, 'b')).toEqual({
      shownId: null,
      chatting: true,
      lastId: null,
    })
  })
})
