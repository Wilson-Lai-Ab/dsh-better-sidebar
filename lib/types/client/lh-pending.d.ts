/**
 * Pending agent writes from dsh-local-history, when that plugin is mounted.
 * Explorer session coloring prefers this over the built-in review.json ledger.
 */
export type LhPendingKind = 'add' | 'edit' | 'delete';
export interface LhPendingRecord {
    path: string;
    kind?: string;
    decision?: string;
    source?: string;
}
export declare function sessionEditsFromLhPending(records: readonly LhPendingRecord[]): {
    path: string;
    kind: LhPendingKind;
}[];
export interface LocalHistoryFace {
    listReview(sessionId: string, cwd?: string): Promise<{
        ok: boolean;
        value?: {
            records?: readonly LhPendingRecord[];
            pending?: number;
        };
    }>;
}
export declare function localHistoryFaceOf(ctx: {
    get?: (name: string) => unknown;
    reflect?: {
        get(name: string): unknown;
    };
} | undefined): LocalHistoryFace | undefined;
