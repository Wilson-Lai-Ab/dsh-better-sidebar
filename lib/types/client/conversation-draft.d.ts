/**
 * Append text / file chips to the current session's composer draft through
 * the conversation service. The service is resolved lazily through `ctx.get`
 * (the inject-free read the app's own plugins use); a missing service or
 * scope degrades to a logged no-op, never a crash.
 */
import type { Context } from '../context-types.ts';
import { sessionInput } from './conversation-input.ts';
import { type FileRef } from './file-ref.ts';
export { sessionInput };
/**
 * Append `text` to the session's composer draft (space-separated, like the
 * @-mentions). Returns false — and logs — when the conversation service or
 * the session scope is unavailable.
 */
export declare function appendToDraft(ctx: Context, sessionId: string, text: string): boolean;
/**
 * Append a file / selection chip (Cursor-style label). Falls back to the
 * `@path:lines` clipboard projection when the facade has no insertReference.
 */
export declare function insertFileRef(ctx: Context, sessionId: string, ref: FileRef): boolean;
