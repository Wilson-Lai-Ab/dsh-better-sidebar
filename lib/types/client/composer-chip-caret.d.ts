/**
 * File chips occupy either one U+FFFC (older DSH) or the in-flow `@label`
 * the current host writes. The visible pill can still be wider than that
 * slot (padding / leftover scale), so the caret often lands on the chip.
 * The next key then edits the chip instead of appending after it.
 * Backspace / Delete remove the whole chip via setDraft.
 */
import type { Context } from '../context-types.ts';
export declare function composerTextarea(): HTMLTextAreaElement | null;
/** Glyph count of one occurrence in the draft (`1` for U+FFFC, `@label`.length otherwise). */
export declare function occurrenceChipLength(draft: string, occurrence: {
    offset: number;
    length?: number;
    label?: string;
}): number;
/** Insert spaces after a chip so the textarea caret can sit past the visible pill. */
export declare function padSpacesAfterObject(draft: string, objectOffset: number, minSpaces: number, length?: number): string;
export declare function padSpacesAfterObjects(draft: string, pads: readonly {
    offset: number;
    minSpaces: number;
    length?: number;
}[]): string;
/** Offset just after a chip at `offset` and any spaces the host left behind it. */
export declare function caretAfterChip(draft: string, offset: number, length?: number): number;
export declare function caretHitsChip(draft: string, offset: number, length?: number): boolean;
/** Span of the chip the caret is on, or the chip that ends at the caret. */
export declare function chipSpanAt(draft: string, offset: number, length?: number): {
    start: number;
    end: number;
} | null;
/**
 * Backspace after a chip / Delete on a chip removes the placeholder and
 * its padding in one stroke. Returns null when the caret is not on a chip.
 */
export declare function draftAfterChipDelete(draft: string, caret: number, direction: 'backward' | 'forward', length?: number): {
    draft: string;
    caret: number;
} | null;
export declare function snapComposerCaretOffChip(el: HTMLTextAreaElement, occurrences?: readonly {
    offset: number;
    length?: number;
    label?: string;
}[]): boolean;
/** After minting a chip, put the caret past the chip the caret is on (or the last one). */
export declare function placeComposerCaretAfterChips(occurrences?: readonly {
    offset: number;
    length?: number;
    label?: string;
}[]): void;
/** Keep typing after a file chip instead of rewriting its placeholder / gap. */
export declare function registerComposerChipCaret(ctx: Context): () => void;
