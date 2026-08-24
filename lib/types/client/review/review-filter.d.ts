import type { SessionEdit } from './review-model.ts';
export { clampReviewDoneSessions, REVIEW_DONE_SESSIONS_DEFAULT, REVIEW_DONE_SESSIONS_MAX, REVIEW_DONE_SESSIONS_MIN, } from '../../prefs-shared.ts';
export interface ReviewSessionSlice {
    sessionId: string;
    title: string;
    updatedAt?: number;
    edits: SessionEdit[];
}
/** True when All / Reviewed still need older conversation nodes to fill one page. */
export declare function needsOlderTurns(groupCount: number, pageSize: number, hasMore: boolean): boolean;
export declare function pendingEdits(sessionId: string, edits: readonly SessionEdit[]): SessionEdit[];
export declare function decidedEdits(sessionId: string, edits: readonly SessionEdit[]): SessionEdit[];
/** Newest turn groups first; keep at most `limit` groups (第 n 轮). */
export declare function takeNewestTurns(edits: readonly SessionEdit[], limit: number): SessionEdit[];
/** Placeholder rows from local Keep / Undo when that session's log is not loaded. */
export declare function storedDecidedEdits(sessionId: string): SessionEdit[];
/** Newest conversations first; keep at most `limit` that still have decided files. */
export declare function decidedBySession(sessions: readonly {
    id: string;
    title: string;
    updatedAt?: number;
    edits: readonly SessionEdit[];
}[], limit: number, skip?: number): ReviewSessionSlice[];
/** Newest conversations first that still have any agent file writes. */
export declare function sessionsWithEdits(sessions: readonly {
    id: string;
    title: string;
    updatedAt?: number;
    edits: readonly SessionEdit[];
}[]): ReviewSessionSlice[];
