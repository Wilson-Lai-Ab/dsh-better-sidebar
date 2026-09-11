import { describe, expect, it } from 'vitest'
import { previewOverlayBottom } from '../src/client/preview-overlay.ts'

describe('previewOverlayBottom', () => {
  it('reserves the conversation composer area inside the host', () => {
    expect(previewOverlayBottom({ hostBottom: 900, composerTop: 720, panelInset: 0, gap: 8 })).toBe(188)
  })

  it('keeps the larger inset when a bottom panel is also open', () => {
    expect(previewOverlayBottom({ hostBottom: 900, composerTop: 720, panelInset: 240, gap: 8 })).toBe(240)
  })

  it('uses the panel inset when composer is unavailable', () => {
    expect(previewOverlayBottom({ hostBottom: 900, composerTop: undefined, panelInset: 120, gap: 8 })).toBe(120)
  })
})
