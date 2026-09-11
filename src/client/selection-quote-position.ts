export interface SelectionRectLike {
  left: number
  top: number
  width: number
  height: number
}

export interface SelectionPopupPositionOptions {
  viewportHeight: number
  popupHeight: number
  composerTop?: number
  gap: number
}

/** Place the selection action without entering the bottom composer area. */
export function selectionPopupPosition(
  rect: SelectionRectLike,
  options: SelectionPopupPositionOptions,
): { left: number; top: number } {
  const { viewportHeight, popupHeight, composerTop, gap } = options
  const limit = Math.min(viewportHeight, composerTop ?? viewportHeight) - gap
  const above = rect.top - gap - popupHeight
  const below = rect.top + rect.height + gap
  const top = below + popupHeight <= limit
    ? below
    : Math.max(0, Math.min(above, limit - popupHeight))
  return { left: rect.left + rect.width / 2, top }
}
