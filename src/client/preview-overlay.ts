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

/** Conversation column that owns the session header — overlay host. */
export function conversationPreviewHost(
  root: Pick<ParentNode, 'querySelector'> = document,
): HTMLElement | null {
  const slot = root.querySelector('[data-slot="conversation.session.header"]')
  const parent = slot === null ? null : (slot as { parentElement?: unknown }).parentElement
  return parent == null ? null : parent as HTMLElement
}