/**
 * Composer file-drop / paste intercept: explorer rows drag a custom MIME
 * payload; dropping on the input card (or pasting that payload / an `@path`
 * token) mints a file chip instead of dumping a path or the selected code.
 * Capture-phase so the host's image-only drop handler does not swallow it.
 */
import type { Context } from '../context-types.ts';
import { type FileRef } from './file-ref.ts';
/** A path-like @-token (has `/`, `.`, or a line span) — not `@pluginId`. */
export declare function looksLikeFileAt(text: string): FileRef | null;
/** True when (x,y) sits in any box of `el` or its descendants. */
export declare function coversPoint(el: Element, x: number, y: number, pad?: number): boolean;
/** Draft offset under the pointer (the textarea sits ON TOP of the chips). */
export declare function caretOffsetAt(x: number, y: number): number | null;
export declare function occurrenceAtOffset(occurrences: readonly {
    occurrenceId: number;
    offset: number;
    length?: number;
}[] | undefined, offset: number): number | null;
/**
 * The chip/text-ref backdrop is `pointer-events: none` and sits UNDER the
 * transparent textarea, so hit-testing must use geometry, not the event
 * target / elementsFromPoint.
 */
export declare function chipOccurrenceAt(card: Element, x: number, y: number): number | null;
/** `@path` fallback when insertReference was unavailable (plain-text decoration). */
export declare function textRefAt(card: Element, x: number, y: number): FileRef | null;
export declare function openFileRef(ctx: Context, sessionId: string, ref: FileRef): void;
export declare function registerComposerFileDrop(ctx: Context): () => void;
