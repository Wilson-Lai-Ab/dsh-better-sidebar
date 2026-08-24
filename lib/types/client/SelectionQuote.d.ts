import type { Context } from '../context-types.ts';
import type { SelectionLines } from './selection-payload.ts';
export declare function SelectionQuote(props: {
    ctx: Context;
    sessionId: string;
    cwd: string | undefined;
    host: HTMLElement | null;
    /** Resolve path + line span from the current window selection. */
    locate: (host: HTMLElement, selected: string) => {
        path: string;
        lines?: SelectionLines;
    };
}): import("react").ReactPortal | null;
/** Diff lines covered by the current selection (`data-diff-path` / `data-diff-line`). */
export declare function locateDiffSelection(host: HTMLElement, _selected: string): {
    path: string;
    lines?: SelectionLines;
};
