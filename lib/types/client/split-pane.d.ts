import type { ReactNode } from 'react';
import type { SidebarState, SidebarTab, SplitNode } from './state.ts';
import type { DropZone } from './state.ts';
import { type NewTabOption, type TabDragPayload } from './TabBar.tsx';
/** Actions the workbench needs (bound to the store by the sidebar shell). */
export interface WorkbenchActions {
    closeTab: (paneId: string, tabId: string) => void;
    activateTab: (paneId: string, tabId: string) => void;
    /** Make a pane the target of newly opened tabs (click focus). */
    focusPane: (paneId: string) => void;
    /** VSCode drag gesture: edge → split the target pane, center → merge. */
    moveTabToEdge: (payload: TabDragPayload, toPane: string, zone: DropZone) => void;
    /** Reorder within a pane (drop onto another tab inserts before it). */
    moveTabBefore: (payload: TabDragPayload, toPane: string, beforeTabId: string) => void;
    /** Double-click a workbench tab onto the conversation header. */
    dockTabToCenter: (paneId: string, tabId: string) => void;
    resizeSplit: (splitId: string, index: number, deltaFrac: number) => void;
}
/**
 * The VS Code-style activity bar: a vertical rail of one icon per openable
 * tool view (non-hidden, enabled tab types). Clicking an icon opens/focuses
 * that view (same dedupe semantics as the old + menu); the active view's icon
 * collapses the panel (VS Code) instead. A disabled view's icon is inert,
 * EXCEPT the active one still collapses the panel on click (the close
 * affordance stays live even when the view itself is unavailable).
 */
export declare function ActivityBar(props: {
    options: NewTabOption[];
    activeType: string | undefined;
    onSelect: (typeId: string) => void;
    getBadge?: (typeId: string) => ReactNode;
    /** Which edge of the workbench the rail hugs ('right' mirrors the rail). */
    side?: 'left' | 'right';
}): import("react").JSX.Element | null;
/** The workbench: the activity bar plus the split tree filling the sidebar
 *  body. `tree` selects which tree renders (the right panel's by default;
 *  the bottom panel passes `state.bottomSplits` — the actions route by pane
 *  id, so one action set serves both). `stripTabFilter` limits which tabs
 *  render in the strip (file-preview types only); `getActivityBadge` feeds
 *  per-type badges onto the activity icons. */
export declare function Workbench(props: {
    state: SidebarState;
    tree?: SplitNode;
    newTabOptions: NewTabOption[];
    actions: WorkbenchActions;
    onNewTab: (optionId: string) => void;
    renderTab: (tab: SidebarTab, active: boolean, paneId: string) => ReactNode;
    getTabIcon?: (tab: SidebarTab) => ReactNode;
    getTabBadge?: (tab: SidebarTab) => ReactNode;
    getTabTitleClass?: (tab: SidebarTab) => string | undefined;
    stripTabFilter?: (tab: SidebarTab) => boolean;
    getActivityBadge?: (typeId: string) => ReactNode;
    /** false hides the vertical rail (the bottom workbench renders content only). */
    showActivityBar?: boolean;
    /** Which edge the rail hugs: 'left' (default) or 'right' (content first). */
    activityBarSide?: 'left' | 'right';
    /** Whether the hosting panel is expanded (drives the active-icon toggle). */
    panelOpen?: boolean;
    /** Collapse/expand the hosting panel (VS Code active-icon click). */
    onTogglePanel?: () => void;
}): import("react").JSX.Element;
