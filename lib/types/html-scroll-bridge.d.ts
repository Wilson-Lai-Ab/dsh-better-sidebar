/**
 * HTML preview scroll bridge. The preview iframe is sandboxed without
 * allow-same-origin, so the parent cannot read iframe.scrollY. The html
 * route injects a tiny script that postMessages scroll to the parent and
 * restores on command — that is the only way 对话 ↔ file tab keeps the
 * HTML preview offset.
 */
export declare const HTML_SCROLL_SOURCE = "dsh-better-sidebar:html-scroll";
export type HtmlScrollPos = {
    top: number;
    left: number;
};
/** Inline listener injected into previewed HTML documents. */
export declare function htmlScrollBridgeScript(): string;
export declare function injectHtmlScrollBridge(html: string): string;
export declare function parseHtmlScrollMessage(data: unknown): HtmlScrollPos | undefined;
export declare function htmlScrollRestoreMessage(pos: HtmlScrollPos): {
    source: string;
    type: 'restore';
    top: number;
    left: number;
};
