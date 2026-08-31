/**
 * Which file the explorer "locate" button should open: the conversation
 * header preview first, then any open sidebar editor.
 */
import { type SidebarState } from '../state.ts';
export declare function previewFilePathOf(state: SidebarState): string | undefined;
