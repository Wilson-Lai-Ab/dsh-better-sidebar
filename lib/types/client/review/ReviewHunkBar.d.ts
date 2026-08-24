/**
 * Hover Keep / Undo for one git hunk in the file preview. Hidden until
 * the pointer is over that block (Cursor-style).
 */
import { type ReactNode } from 'react';
import type { SessionScope } from '../api.ts';
import type { SessionEdit } from './review-model.ts';
import { type ReviewHunk } from './review-hunks.ts';
export declare function ReviewHunkBar(props: {
    scope: SessionScope;
    path: string;
    hunk: ReviewHunk;
    hunks: readonly ReviewHunk[];
    edit?: SessionEdit;
    top: number;
    onDone: (next?: string) => void;
}): ReactNode;
