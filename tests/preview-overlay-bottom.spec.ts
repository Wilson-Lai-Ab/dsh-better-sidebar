import { describe, expect, it } from 'vitest'
import { bottomDockTop, previewOverlayBottom } from '../src/client/preview-overlay.ts'

/** Minimal stand-in for an element the helper only ever asks for a rect. */
function elementAt(top: number): Element {
  return { getBoundingClientRect: () => ({ top }) } as unknown as Element
}

/** Minimal stand-in for the conversation root / document. */
function treeOf(nodes: Record<string, Element>): ParentNode {
  return { querySelector: (selector: string) => nodes[selector] ?? null } as unknown as ParentNode
}

describe('bottomDockTop', () => {
  it('takes the composer seat, which also carries the queue dock above the card', () => {
    expect(bottomDockTop(treeOf({
      '[data-composer-seat]': elementAt(640),
      '[data-composer-card]': elementAt(700),
    }))).toBe(640)
  })

  it('falls back to the composer card when the host renders no seat', () => {
    expect(bottomDockTop(treeOf({ '[data-composer-card]': elementAt(700) }))).toBe(700)
  })

  it('is undefined when the conversation has no composer at all', () => {
    expect(bottomDockTop(treeOf({}))).toBeUndefined()
  })
})

describe('previewOverlayBottom', () => {
  it('reserves the whole bottom dock stack inside the host', () => {
    expect(previewOverlayBottom({ hostBottom: 900, dockTop: 640, panelInset: 0, gap: 8 })).toBe(268)
  })

  it('stops the preview above the queue dock, not just the composer card', () => {
    // Seat top (640) is the queue dock; the card alone starts at 700. Measuring
    // only the card left the queue dock painting over the preview's bottom.
    const dockTop = bottomDockTop(treeOf({
      '[data-composer-seat]': elementAt(640),
      '[data-composer-card]': elementAt(700),
    }))
    const bottom = previewOverlayBottom({ hostBottom: 900, dockTop, panelInset: 0, gap: 8 })
    expect(900 - bottom).toBe(632)
    expect(900 - bottom).toBeLessThan(640)
  })

  it('keeps the larger inset when a bottom panel is also open', () => {
    expect(previewOverlayBottom({ hostBottom: 900, dockTop: 720, panelInset: 240, gap: 8 })).toBe(240)
  })

  it('uses the panel inset when the composer is unavailable', () => {
    expect(previewOverlayBottom({ hostBottom: 900, dockTop: undefined, panelInset: 120, gap: 8 })).toBe(120)
  })
})
