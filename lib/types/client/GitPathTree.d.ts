/**
 * Collapsible directory tree for git file lists. Directories toggle open /
 * closed; files are rendered by the caller so status / history rows keep
 * their own actions and colors.
 */
import { type ReactNode } from 'react';
import { type PathTreeNode } from './git-tree.ts';
export declare function GitPathTree<T extends {
    path: string;
}>(props: {
    nodes: readonly PathTreeNode<T>[];
    renderFile: (entry: T, name: string, depth: number) => ReactNode;
    /** Repo-relative directory the explorer asked the Git panel to reveal. */
    focusDir?: string;
}): import("react").JSX.Element;
