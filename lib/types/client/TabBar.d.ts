/**
 * The tab strip of one pane: tabs capped at TAB_MAX_WIDTH (ellipsized),
 * overflow scrolls horizontally, a close button per tab, and drag/drop
 * support. New views open from the workbench's activity bar (the + menu is
 * gone), so `onNewTab`/`newTabOptions` are optional here — `PaneEmptyCards`
 * still offers the openable types on an empty pane. `stripTabFilter`
 * limits the strip to file-preview/aux tabs (editor / diff / git-log) when
 * the activity bar owns the tool views.
 */
import { type ReactNode } from 'react';
import type { SidebarTab } from './state.ts';
/** One activity-bar / empty-pane option. */
export interface NewTabOption {
    id: string;
    label: string;
    disabled?: boolean;
    /** Leading icon (activity bar / empty-pane card). */
    icon?: ReactNode;
    /** Multi-instance view (terminal/browser mint `<n>` ids): an active-icon
     *  click opens ANOTHER instance instead of collapsing the panel. */
    multi?: boolean;
}
/** Drag payload for tab moves (HTML5 DnD dataTransfer). */
export declare const TAB_DRAG_TYPE = "application/x-dsh-tab";
export interface TabDragPayload {
    tabId: string;
    paneId: string;
    /** History / file-row seed: drop opens this tab instead of moving an existing one. */
    openTab?: SidebarTab;
}
export declare function serializeDrag(payload: TabDragPayload): string;
export declare function parseDrag(raw: string): TabDragPayload | null;
/** Global tab-drag flag: PDF iframes become non-interactive synchronously. */
export declare function setTabDragging(active: boolean): void;
/** Start a workbench / conversation-column drag that opens `tab` on drop. */
export declare function beginOpenTabDrag(event: {
    dataTransfer: DataTransfer | null;
}, tab: SidebarTab): void;
export declare function TabBar(props: {
    paneId: string;
    tabs: SidebarTab[];
    active: string | null;
    onActivate: (tabId: string) => void;
    onClose: (tabId: string) => void;
    /** Optional: the + menu is gone; empty-pane cards open new tabs instead. */
    onNewTab?: (optionId: string) => void;
    newTabOptions?: NewTabOption[];
    /** Drop of a tab from any pane: (payload, insertBeforeTabId | null). */
    onDropTab: (payload: TabDragPayload, before: string | null) => void;
    /** Double-click a workbench tab: dock it onto the conversation header. */
    onDockToCenter?: (tabId: string) => void;
    /** Icon resolver for tab labels (reads from the tab descriptor registry). */
    getTabIcon?: (tab: SidebarTab) => ReactNode;
    /** Badge resolver for tab labels (reads the descriptor's `badge`; the
     *  resolver returns the rendered pill or null). */
    getTabBadge?: (tab: SidebarTab) => ReactNode;
    /** Extra class on the tab title (git status color). */
    getTabTitleClass?: (tab: SidebarTab) => string | undefined;
    /** Only render tabs that pass this predicate (file-preview types in the
     *  strip when the activity bar owns the tool views). Omit → every tab. */
    stripTabFilter?: (tab: SidebarTab) => boolean;
}): import("react").JSX.Element | null;
