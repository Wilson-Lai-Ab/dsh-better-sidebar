/**
 * Keep / Undo for an agent-produced file or one painted island.
 * Keep records acceptance (disk already has the new text). Undo restores
 * HEAD / splices one island / deletes a new file. File-level and hunk-level
 * share the same Ctrl+Z stack.
 */
import { type SessionScope } from '../api.ts';
import type { ReviewEditKind, SessionEdit } from './review-model.ts';
import { type ReviewHunk } from './review-hunks.ts';
export declare function keepEdit(sessionId: string, path: string, edit?: SessionEdit): Promise<void>;
export declare function undoEdit(scope: SessionScope, path: string, kind: ReviewEditKind, edit?: SessionEdit): Promise<string | null>;
export declare function keepHunk(sessionId: string, path: string, hunk: ReviewHunk, hunks?: readonly {
    key: string;
}[], edit?: SessionEdit): Promise<void>;
export declare function undoHunk(scope: SessionScope, path: string, hunk: ReviewHunk, hunks?: readonly {
    key: string;
}[], edit?: SessionEdit): Promise<string>;
/** Ctrl/Cmd+Z / Shift+Z for the shared file+hunk stack. Returns false when empty. */
export declare function revertLastReview(scope: SessionScope, path: string, direction: 'undo' | 'redo'): Promise<{
    applied: boolean;
    content?: string | null;
}>;
