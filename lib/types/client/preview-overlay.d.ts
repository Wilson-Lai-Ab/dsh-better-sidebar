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
export declare function bottomDockTop(root: ParentNode): number | undefined;
/** Conversation column that owns the session header — overlay host. */
export declare function previewOverlayBottom(options: {
    hostBottom: number;
    /** Top of the whole bottom dock stack (`bottomDockTop`), not just the card. */
    dockTop: number | undefined;
    panelInset: number;
    gap: number;
}): number;
export declare function conversationPreviewHost(root?: Pick<ParentNode, 'querySelector'>): HTMLElement | null;
