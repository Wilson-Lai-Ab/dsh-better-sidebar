import { describe, expect, it } from 'vitest'
import { previewOverlayTop } from '../src/client/preview-overlay.ts'

describe('preview overlay top', () => {
  it('uses the tablist bottom when wrapped tabs overflow the 48px header', () => {
    expect(previewOverlayTop({ bottom: 48 }, { bottom: 86 })).toBe(86)
  })

  it('falls back to the header when the tablist is missing', () => {
    expect(previewOverlayTop({ bottom: 48 }, null)).toBe(48)
  })
})
