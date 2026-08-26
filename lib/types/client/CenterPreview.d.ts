/**
 * In-conversation preview for tabs docked next to 对话 / 轨迹.
 *
 * The host conversation.view seat has no definite height (flex 1 0 auto /
 * min-height auto), so explorer/editor children collapse. This overlay
 * sits on the conversation column and renders the tab body ourselves.
 */
import { type ReactNode } from 'react';
import type { Context } from '../context-types.ts';
import { type SidebarState, type SidebarStore } from './state.ts';
/**
 * Follow the host 对话 / 轨迹 / docked-file tab strip. Clicking Chat or
 * Trajectory hides the overlay; clicking a docked file tab shows it.
 * Must stay mounted even while the overlay is hidden.
 */
export type CenterTabMenu = {
    tabId: string;
    x: number;
    y: number;
};
export declare function useHostHeaderTabSync(ctx: Context, store: SidebarStore, onTabMenu: (menu: CenterTabMenu) => void): void;
export declare function CenterTabContextMenu(props: {
    ctx: Context;
    store: SidebarStore;
    sessionId: string | undefined;
    menu: CenterTabMenu | null;
    onClose: () => void;
}): ReactNode;
export declare function CenterPreview(props: {
    ctx: Context;
    store: SidebarStore;
    state: SidebarState;
    sessionId: string;
    cwd: string | undefined;
    left: number;
    right: number;
    top: number;
    bottom: number;
    onReferenceFile: (path: string) => void;
    onTabMenu: (menu: CenterTabMenu) => void;
}): ReactNode;
