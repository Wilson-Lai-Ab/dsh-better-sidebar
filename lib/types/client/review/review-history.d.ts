/**
 * Ctrl/Cmd+Z stack for Keep / Undo — file-level and per-hunk share one
 * stack. Keep only hides paint; Undo rewrites the file. Both reverse
 * without fighting CodeMirror's typing history.
 */
import type { SessionEdit } from './review-model.ts';
import { type ReviewDecision } from './review-store.ts';
export interface ReviewKeepRevert {
    kind: 'keep';
    sessionId: string;
    path: string;
    hunkKey: string;
}
export interface ReviewUndoRevert {
    kind: 'undo';
    sessionId: string;
    path: string;
    hunkKey: string;
    previous: string;
    next: string;
}
export interface ReviewFileKeepRevert {
    kind: 'file-keep';
    sessionId: string;
    path: string;
    edit?: SessionEdit;
}
export interface ReviewFileUndoRevert {
    kind: 'file-undo';
    sessionId: string;
    path: string;
    /** File text before the undo; null when the file did not exist. */
    previous: string | null;
    /** File text after the undo; null when the undo deleted the file. */
    next: string | null;
    edit?: SessionEdit;
}
export type ReviewRevert = ReviewKeepRevert | ReviewUndoRevert | ReviewFileKeepRevert | ReviewFileUndoRevert;
export declare function reviewFileKey(sessionId: string, path: string): string;
export declare function pushReviewRevert(entry: ReviewRevert): void;
export declare function peekReviewUndo(sessionId: string, path: string): ReviewRevert | undefined;
export declare function peekReviewRedo(sessionId: string, path: string): ReviewRevert | undefined;
export declare function canRevertReview(sessionId: string, path: string, direction: 'undo' | 'redo'): boolean;
export declare function popReviewUndo(sessionId: string, path: string): ReviewRevert | undefined;
export declare function popReviewRedo(sessionId: string, path: string): ReviewRevert | undefined;
export declare function applyReviewDecision(entry: ReviewRevert, decision: ReviewDecision | undefined): void;
export declare function contentAfterRevert(entry: ReviewRevert, direction: 'undo' | 'redo'): string | null | undefined;
export declare function clearReviewHistory(sessionId: string, path: string): void;
