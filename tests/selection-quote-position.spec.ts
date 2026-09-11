import { describe, expect, it } from 'vitest'
import { selectionPopupPosition } from '../src/client/selection-quote-position.ts'

describe('selectionPopupPosition', () => {
  it('keeps the action above the composer boundary', () => {
    expect(selectionPopupPosition({ left: 300, top: 690, width: 40, height: 20 }, {
      viewportHeight: 800,
      popupHeight: 28,
      composerTop: 620,
      gap: 8,
    })).toEqual({ left: 320, top: 584 })
  })

  it('flips below the selection only when that stays above the composer', () => {
    expect(selectionPopupPosition({ left: 300, top: 100, width: 40, height: 20 }, {
      viewportHeight: 800,
      popupHeight: 28,
      composerTop: 620,
      gap: 8,
    })).toEqual({ left: 320, top: 128 })
  })

  it('falls back to the viewport bottom when no composer is measured', () => {
    expect(selectionPopupPosition({ left: 300, top: 790, width: 40, height: 20 }, {
      viewportHeight: 800,
      popupHeight: 28,
      composerTop: undefined,
      gap: 8,
    })).toEqual({ left: 320, top: 754 })
  })
})
