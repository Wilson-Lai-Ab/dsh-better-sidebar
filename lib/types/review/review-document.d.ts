/**
 * Keep / Undo ledger shape shared by the host disk file and the client
 * memory cache. No Node imports — safe in the browser bundle.
 */
export type ReviewDecision = 'kept' | 'undone';
export interface ReviewDocument {
    decisions: Record<string, ReviewDecision>;
    seen: Record<string, string>;
    hunks: Record<string, ReviewDecision>;
    /** Epoch ms of the last Keep / Undo write. */
    touchedAt?: number;
}
export declare function emptyReviewDocument(): ReviewDocument;
export declare function parseReviewDocument(value: unknown): ReviewDocument;
export declare function reviewDocumentIsEmpty(doc: ReviewDocument): boolean;
/** True when two ledger keys are the same file (cwd turned a relative path absolute). */
export declare function sameReviewPath(a: string, b: string): boolean;
/** Existing map key for this file, if the ledger stored a relative or absolute alias. */
export declare function reviewPathKeyOf(map: Record<string, unknown>, path: string): string | undefined;
