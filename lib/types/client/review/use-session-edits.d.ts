import type { Context } from '../../context-types.ts';
import { type SessionEdit } from './review-model.ts';
export declare function useSessionEdits(ctx: Context, sessionId: string | undefined, cwd: string | undefined): {
    edits: SessionEdit[];
    latest: SessionEdit[];
    pending: number;
    hasMore: boolean;
    loadingOlder: boolean;
    loadOlder: () => Promise<void>;
};
