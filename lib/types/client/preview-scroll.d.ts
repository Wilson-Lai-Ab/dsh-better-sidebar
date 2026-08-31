/**
 * Preview pane scroll. Markdown is same-origin. HTML previews are
 * sandboxed iframes: the html route injects a postMessage bridge
 * (see html-scroll-bridge.ts) so 对话 ↔ file tab can restore offset.
 */
export type PreviewScroll = {
    top: number;
    left: number;
};
export declare function rememberPreviewScroll(sessionId: string, path: string, pos: PreviewScroll): void;
export declare function previewScrollOf(sessionId: string, path: string): PreviewScroll | undefined;
export declare function forgetPreviewScroll(sessionId: string, path: string): void;
/** Test-only. */
export declare function resetRememberedPreviewScroll(): void;
