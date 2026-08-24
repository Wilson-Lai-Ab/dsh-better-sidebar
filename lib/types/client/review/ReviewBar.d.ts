/**
 * Keep / Undo strip on a file preview when the current conversation wrote
 * that file and the user has not decided yet.
 */
import { type ReactNode } from 'react';
import type { SessionScope } from '../api.ts';
import type { SessionEdit } from './review-model.ts';
export declare function ReviewBar(props: {
    scope: SessionScope;
    edit: SessionEdit;
    onDone?: (next?: string | null) => void;
}): ReactNode;
