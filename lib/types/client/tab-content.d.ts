/**
 * Shared tab body: the workbench panes and the conversation-header dock
 * both render through this so a crash stays inside one tab.
 */
import { type ReactNode } from 'react';
import type { Context } from '../context-types.ts';
import type { SidebarStore, SidebarTab } from './state.ts';
export declare function TabContent(props: {
    tab: SidebarTab;
    sessionId: string;
    cwd: string | undefined;
    expanded: string[];
    onToggleDir: (path: string) => void;
    onReferenceFile: (path: string) => void;
    ctx: Context;
    store: SidebarStore;
    /** Whether this tab is the active one AND the panel is open (live views pause otherwise). */
    visible: boolean;
    /** Fired before a topology node jumps to its child session (see Sidebar). */
    onSubagentJump: (childSessionId: string) => void;
    /** Open a diff tab from the git panel (placement handled by the store). */
    onOpenDiff: (tab: SidebarTab) => void;
}): ReactNode;
