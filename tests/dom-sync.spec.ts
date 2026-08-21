// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { isPluginDragActive, observeHostHeader, scheduleGuardedFrame, setFileDragging } from '../src/client/dom-sync.ts'
import { setTabDragging } from '../src/client/TabBar.tsx'

describe('host-header drag guards', () => {
  afterEach(() => {
    setTabDragging(false)
    setFileDragging(false)
    vi.unstubAllGlobals()
  })

  it('treats tab and file drags as a plugin gesture', () => {
    expect(isPluginDragActive()).toBe(false)
    setTabDragging(true)
    expect(isPluginDragActive()).toBe(true)
    setTabDragging(false)
    setFileDragging(true)
    expect(isPluginDragActive()).toBe(true)
  })

  it('does not schedule work while a drag is active', () => {
    const work = vi.fn()
    const frames: FrameRequestCallback[] = []
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      frames.push(cb)
      return frames.length
    })
    vi.stubGlobal('cancelAnimationFrame', () => {})
    const guarded = scheduleGuardedFrame(work)
    setTabDragging(true)
    guarded.schedule()
    expect(frames).toHaveLength(0)
    expect(work).not.toHaveBeenCalled()
    guarded.disconnect()
  })

  it('ignores a re-entrant schedule while work is running', () => {
    const frames: FrameRequestCallback[] = []
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      frames.push(cb)
      return frames.length
    })
    vi.stubGlobal('cancelAnimationFrame', () => {})
    const guarded = scheduleGuardedFrame(() => {
      guarded.schedule()
    })
    guarded.schedule()
    expect(frames).toHaveLength(1)
    frames[0]!(0)
    expect(frames).toHaveLength(1)
    guarded.disconnect()
  })

  it('does not watch class mutations on the host header', () => {
    const root = document.createElement('div')
    document.body.append(root)
    const onChange = vi.fn()
    const watcher = observeHostHeader(root, onChange)
    const child = document.createElement('button')
    child.setAttribute('role', 'tab')
    root.append(child)
    child.className = 'hovered'
    child.setAttribute('aria-selected', 'true')
    return Promise.resolve().then(() => {
      expect(onChange).toHaveBeenCalled()
      const before = onChange.mock.calls.length
      child.className = 'hovered again'
      return Promise.resolve().then(() => {
        expect(onChange.mock.calls.length).toBe(before)
        watcher.disconnect()
        root.remove()
      })
    })
  })
})
