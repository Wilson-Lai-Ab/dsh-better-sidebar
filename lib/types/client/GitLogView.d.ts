import type { Context } from '../context-types.ts';
import { type SessionScope } from './api.ts';
import { type SidebarStore } from './state.ts';
export declare function GitLogView(props: {
    scope: SessionScope;
    ctx?: Context;
    repo?: string;
    store?: SidebarStore;
}): import("react").JSX.Element;
