import type { SidebarTab } from './state.ts';
import { type GitStatusEntry, type GitStatusResult, type SessionScope } from './api.ts';
export type GitStatusKind = 'add' | 'mod' | 'del' | 'untracked' | 'conflict';
/** The XY letter a row badge shows (X = index, Y = worktree). */
export declare function badgeOf(entry: GitStatusEntry): string;
export declare function kindOfBadge(badge: string): GitStatusKind | undefined;
export declare function kindOfEntry(entry: GitStatusEntry): GitStatusKind | undefined;
export declare function classOfKind(kind: GitStatusKind | undefined): string | undefined;
/** Absolute-path → status kind, including ancestor directories. */
export declare function gitKindByPath(status: GitStatusResult | undefined): Map<string, GitStatusKind>;
/** Workspace path a tab should color from (editor / worktree / commit file). */
export declare function workspacePathOfTab(tab: SidebarTab): string | undefined;
/** Latest git-status map (header decorate reads this between polls). */
export declare function latestGitKinds(): Map<string, GitStatusKind>;
/** Live git-status map for coloring explorer rows and file tabs. */
export declare function useGitKindMap(scope: SessionScope | undefined): Map<string, GitStatusKind>;
