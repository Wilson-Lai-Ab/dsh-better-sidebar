/**
 * Review of files the current conversation wrote. Pending is the full
 * current-session set. All / Reviewed show this session's turns in pages
 * (default 30) and load older turns / file writes as the list scrolls.
 */
import { type ReactNode } from 'react';
import type { Context } from '../../context-types.ts';
import type { SessionScope } from '../api.ts';
import type { SidebarStore } from '../state.ts';
export declare function ReviewView(props: {
    ctx: Context;
    store: SidebarStore;
    scope: SessionScope;
}): ReactNode;
