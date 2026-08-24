/**
 * `@` trigger source that owns file-reference chips. The composer serializes
 * each occurrence through this codec on send; without it, send is blocked.
 * Candidates stay empty — files enter via the explorer / selection popup /
 * drag, not the `@` menu.
 */
import type { Context } from '../context-types.ts';
export declare function registerFileTriggerSource(ctx: Context): () => void;
