import type { Context } from '../context-types.ts';
import type { SidebarDiffRef } from './state.ts';
export declare function DiffTab(props: {
    sessionId: string;
    cwd: string | undefined;
    diff: SidebarDiffRef;
    ctx?: Context;
}): import("react").JSX.Element;
