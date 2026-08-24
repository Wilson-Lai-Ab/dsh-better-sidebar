/**
 * Keep / undo decisions for agent-produced files. The file on disk already
 * has the agent's write; Keep only records that the user accepted it. Undo
 * restores HEAD (or deletes a new file) and records that too. A later
 * agent write of the same path drops the decision so the row is pending
 * again.
 *
 * The ledger lives in the session directory via the plugin host
 * (`review.json`). Memory is the read cache; private-mode browsers still
 * persist because the write goes through `/sidebar/api`. A one-shot
 * localStorage copy is migrated when the disk file is still empty.
 */
import { type SessionScope } from '../api.ts';
import type { SessionEdit } from './review-model.ts';
import { type ReviewDecision, type ReviewDocument } from '../../review/review-document.ts';
export type { ReviewDecision, ReviewDocument };
/** Cheap snapshot for `useSyncExternalStore`. */
export declare function reviewRevision(): number;
/** Subscribe to keep / undo writes (review list + editor bar). */
export declare function subscribeReview(listener: () => void): () => void;
/** Disk wins unless it is empty or older than an in-memory / leftover browser copy. */
export declare function pickReviewDocument(remote: ReviewDocument, local: ReviewDocument): {
    document: ReviewDocument;
    migrate: boolean;
};
export declare function rememberReviewScope(scope: SessionScope): void;
/** Load the session-directory ledger (and migrate a leftover browser copy). */
export declare function hydrateReview(scope: SessionScope): Promise<void>;
export declare function decisionOf(sessionId: string, path: string, edit?: SessionEdit): ReviewDecision | undefined;
export declare function setReviewDecision(sessionId: string, path: string, decision: ReviewDecision | undefined, edit?: SessionEdit): void;
/** Pending rows: no keep/undo, or the agent rewrote the file since then. */
export declare function hunkDecisionOf(sessionId: string, path: string, hunkKey: string): ReviewDecision | undefined;
export declare function setHunkDecision(sessionId: string, path: string, hunkKey: string, decision: ReviewDecision | undefined): void;
/**
 * File-level Keep / Undo is what the review list counts. Hunk buttons only
 * hide paint. Once every current hunk is decided, lift that to the file
 * so the row leaves Pending.
 */
export declare function syncFileDecisionFromHunks(sessionId: string, path: string, hunks: readonly {
    key: string;
}[], edit?: SessionEdit): boolean;
export declare function reviewSessionIds(): string[];
export declare function decidedPathsOf(sessionId: string): {
    path: string;
    decision: ReviewDecision;
}[];
export declare function reviewTouchedAt(sessionId: string): number | undefined;
export declare function pendingCount(sessionId: string, edits: readonly SessionEdit[]): number;
