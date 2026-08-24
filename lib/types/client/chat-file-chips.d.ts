/**
 * Sent file chips expand to fenced `path:lines` blocks. The user bubble is
 * plain text, so those fences stay ugly. Replace each fence with a pill that
 * opens the same file the composer chip would.
 */
import type { Context } from '../context-types.ts';
import { type FileRef } from './file-ref.ts';
/** Host at-file-mention / folder drop: `@path` with a slash, a dot, or a line span. */
export declare function pathMentionOf(token: string): FileRef | null;
export declare function parseSentFileFence(info: string, start: string, end?: string): FileRef | null;
export declare function splitUserFences(text: string): {
    kind: 'text' | 'chip';
    text?: string;
    ref?: FileRef;
}[];
export declare function registerChatFileChips(ctx: Context): () => void;
