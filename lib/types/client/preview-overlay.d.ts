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
export declare function previewOverlayTop(header: {
    bottom: number;
} | null, tablist: {
    bottom: number;
} | null, fallback?: number, origin?: {
    top: number;
}): number;
/** Conversation column that owns the session header — overlay host. */
export declare function conversationPreviewHost(root?: Pick<ParentNode, 'querySelector'>): HTMLElement | null;