/**
 * Older hosts sized a chip to one U+FFFC (~4em); current DSH writes the
 * `@label` in-flow so the slot already matches the text. Pad the draft with
 * spaces (not CSS paddingRight) only when the visible pill is still wider
 * than that slot, so BOTH the textarea and the decoration backdrop start
 * the next character after the pill.
 */
import type { Context } from '../context-types.ts';
export declare function spacesForOverflow(extraPx: number, spaceWidth: number): number;
export declare function spacesToClearChip(chip: HTMLElement, spaceWidth: number): number;
/** True when only the host gap (spaces / end) follows this chip. */
export declare function chipHasNoUserText(draft: string, objectOffset: number, length?: number): boolean;
/** After a chip insert: grow the gap to the pill width, then sit the caret after it. */
export declare function settleComposerChipGaps(ctx: Context): void;
/** Keep composer file chips from overlapping after insert / draft edits. */
export declare function registerComposerChipLayout(ctx: Context): () => void;
