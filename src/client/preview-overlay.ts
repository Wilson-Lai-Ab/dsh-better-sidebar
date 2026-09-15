/**
 * The conversation preview overlay must start below the host 对话 / 轨迹
 * strip. When file tabs wrap, the second row can paint past a 48px header
 * while `header.getBoundingClientRect().bottom` stays 48 — cover that by
 * taking the max of header and tablist bottoms.
 *
 * Pass `origin` (the conversation root's viewport top) to get an inset
 * from that root instead of a viewport Y — the overlay then lives as an
 * absolute child of the conversation column and scrolls/moves with it.
 */
export function previewOverlayTop(
  header: { bottom: number } | null,
  tablist: { bottom: number } | null,
  fallback = 48,
  origin?: { top: number },
): number {
  const bottoms = [header?.bottom, tablist?.bottom].filter((value): value is number => typeof value === 'number')
  if (bottoms.length === 0) return fallback
  const top = Math.max(...bottoms)
  if (origin === undefined) return top
  return Math.max(0, top - origin.top)
}

const COMPOSER_STACK_SELECTORS = ['[data-composer-seat]', '[data-composer-card]'] as const

/**
 * Top (viewport Y) of the conversation's bottom dock stack — the bar the
 * file preview must stay clear of.
 *
 * The host stacks the queue dock (任务栏), the composer hint and the composer
 * card inside ONE sticky `[data-composer-seat]` (z-index 7, i.e. above the
 * overlay's 6). The queue dock sits ABOVE the card, so measuring the card
 * alone hands the whole queue-dock band back to the host and the dock paints
 * over the preview's bottom edge. Take the outermost seat; fall back to the
 * card for a host that renders no seat. The smallest top wins, so the overlay
 * clears whichever element rises highest.
 *
 * `root` is the conversation column (the overlay's own host), not `document`,
 * so a second mounted conversation can never supply the rect.
 */
export function bottomDockTop(root: ParentNode): number | undefined {
  const tops: number[] = []
  for (const selector of COMPOSER_STACK_SELECTORS) {
    const node = root.querySelector(selector)
    if (node === null) continue
    tops.push(node.getBoundingClientRect().top)
  }
  return tops.length === 0 ? undefined : Math.min(...tops)
}

/** Conversation column that owns the session header — overlay host. */
export function previewOverlayBottom(options: {
  hostBottom: number
  /** Top of the whole bottom dock stack (`bottomDockTop`), not just the card. */
  dockTop: number | undefined
  panelInset: number
  gap: number
}): number {
  const { hostBottom, dockTop, panelInset, gap } = options
  const dockInset = dockTop === undefined ? 0 : Math.max(0, hostBottom - dockTop + gap)
  return Math.max(panelInset, dockInset)
}

export function conversationPreviewHost(
  root: Pick<ParentNode, 'querySelector'> = document,
): HTMLElement | null {
  const slot = root.querySelector('[data-slot="conversation.session.header"]')
  const parent = slot === null ? null : (slot as { parentElement?: unknown }).parentElement
  return parent == null ? null : parent as HTMLElement
}
