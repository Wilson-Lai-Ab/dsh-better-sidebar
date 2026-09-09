/**
 * Which file the explorer "locate" button should open: the conversation
 * header preview first, then any open sidebar tab that carries a workspace
 * file path (editor, local-history review/compare, git worktree diffs).
 */
import { type SidebarState } from '../state.ts';
export declare function previewFilePathOf(state: SidebarState, cwd?: string): string | undefined;