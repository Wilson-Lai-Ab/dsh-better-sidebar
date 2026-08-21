/**
 * One-shot reveal bus: search / chip clicks stash a line span; the editor
 * consumes it once when the view is ready.
 */
import { describe, expect, it } from 'vitest'
import { requestReveal, subscribeReveal, takeReveal } from '../src/client/editor-reveal.ts'

describe('requestReveal', () => {
  it('stashes a range that takeReveal consumes once', () => {
    requestReveal('/p/a.ts', { start: 108, end: 121, selected: 'x' })
    expect(takeReveal('/p/a.ts')).toEqual({ start: 108, end: 121, selected: 'x' })
    expect(takeReveal('/p/a.ts')).toBeUndefined()
  })

  it('ignores a start line below 1', () => {
    requestReveal('/p/b.ts', { start: 0, end: 2 })
    expect(takeReveal('/p/b.ts')).toBeUndefined()
  })

  it('notifies subscribers when a range is stashed', () => {
    let ticks = 0
    const stop = subscribeReveal(() => { ticks += 1 })
    requestReveal('/p/c.ts', { start: 1, end: 1 })
    expect(ticks).toBe(1)
    stop()
    requestReveal('/p/c.ts', { start: 2, end: 2 })
    expect(ticks).toBe(1)
    expect(takeReveal('/p/c.ts')).toEqual({ start: 2, end: 2 })
  })
})
