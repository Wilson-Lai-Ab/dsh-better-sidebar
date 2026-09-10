import { describe, expect, it } from 'vitest'
import { conversationPreviewHost, previewOverlayTop } from '../src/client/preview-overlay.ts'

describe('preview overlay top', () => {
  it('uses the tablist bottom when wrapped tabs overflow the 48px header', () => {
    expect(previewOverlayTop({ bottom: 48 }, { bottom: 86 })).toBe(86)
  })

  it('falls back to the header when the tablist is missing', () => {
    expect(previewOverlayTop({ bottom: 48 }, null)).toBe(48)
  })

  it('is an inset from the conversation root, not a viewport Y', () => {
    expect(previewOverlayTop({ bottom: 148 }, { bottom: 148 }, 48, { top: 100 })).toBe(48)
  })

  it('keeps wrapped tabs relative to the conversation root', () => {
    expect(previewOverlayTop({ bottom: 148 }, { bottom: 186 }, 48, { top: 100 })).toBe(86)
  })
})

describe('conversation preview host', () => {
  it('is the conversation root that owns the session header slot', () => {
    const root = { id: 'conversation-root' }
    const tree = {
      querySelector: (sel: string) => (
        sel === '[data-slot="conversation.session.header"]'
          ? { parentElement: root }
          : null
      ),
    }
    expect(conversationPreviewHost(tree as unknown as ParentNode)).toBe(root)
  })

  it('is null when the conversation header has not mounted', () => {
    const tree = { querySelector: () => null }
    expect(conversationPreviewHost(tree as unknown as ParentNode)).toBeNull()
  })
})