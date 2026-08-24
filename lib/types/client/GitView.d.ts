import type { SessionScope } from './api.ts';
import { type SidebarStore, type SidebarTab } from './state.ts';
export declare function GitView(props: {
    scope: SessionScope;
    store: SidebarStore;
    onOpenFile: (path: string) => void;
    /** Open a diff tab (the shell places it below the git pane on first use). */
    onOpenDiff: (tab: SidebarTab) => void;
}): import("react").JSX.Element;
