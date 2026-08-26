import { describe, expect, it } from 'vitest'
import { requestGitFocus, subscribeGitFocus, takeGitFocus } from '../src/client/git-focus.ts'

describe('git focus bus', () => {
  it('delivers one pending focus then clears it', () => {
    requestGitFocus({ repo: '/work', dir: 'src' })
    expect(takeGitFocus()).toEqual({ repo: '/work', dir: 'src' })
    expect(takeGitFocus()).toBeUndefined()
  })

  it('notifies subscribers on request', () => {
    let n = 0
    const stop = subscribeGitFocus(() => { n += 1 })
    requestGitFocus({ repo: '/work', dir: '' })
    expect(n).toBe(1)
    stop()
    requestGitFocus({ repo: '/work', dir: 'src' })
    expect(n).toBe(1)
    expect(takeGitFocus()?.dir).toBe('src')
  })
})
