/**
 * Preview pane scroll. Markdown is same-origin. HTML previews are
 * sandboxed iframes: the html route injects a postMessage bridge
 * (see html-scroll-bridge.ts) so 对话 ↔ file tab can restore offset.
 */
export type PreviewScroll = { top: number; left: number }

const remembered = new Map<string, PreviewScroll>()

function keyOf(sessionId: string, path: string): string {
  return `${sessionId}\n${path}`
}

export function rememberPreviewScroll(sessionId: string, path: string, pos: PreviewScroll): void {
  remembered.set(keyOf(sessionId, path), { top: pos.top, left: pos.left })
}

export function previewScrollOf(sessionId: string, path: string): PreviewScroll | undefined {
  return remembered.get(keyOf(sessionId, path))
}

export function forgetPreviewScroll(sessionId: string, path: string): void {
  remembered.delete(keyOf(sessionId, path))
}

/** Test-only. */
export function resetRememberedPreviewScroll(): void {
  remembered.clear()
}
