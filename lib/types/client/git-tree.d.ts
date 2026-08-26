/**
 * A directory tree over repo-relative paths. Used by the git change list
 * (module / directory grouping) and the history file list so nested folders
 * can expand and collapse like IDEA's commit tree.
 */
export type PathTreeNode<T> = {
    kind: 'dir';
    name: string;
    key: string;
    children: PathTreeNode<T>[];
} | {
    kind: 'file';
    name: string;
    key: string;
    entry: T;
};
/** Split a repo-relative path into non-empty segments (`a\\b` → `['a','b']`). */
export declare function pathSegments(path: string): string[];
/**
 * Build a sorted directory tree. Files at the repo root sit at the top
 * level; intermediate folders become expandable dir nodes.
 */
export declare function buildPathTree<T extends {
    path: string;
}>(entries: readonly T[]): PathTreeNode<T>[];
/**
 * Collapse a chain of single-child directories into one row
 * (`src/main/java/com/hexin`) — IDEA/VSCode style. A folder that has
 * files or more than one child stays a real expand point.
 */
export declare function compactPathTree<T>(nodes: readonly PathTreeNode<T>[]): PathTreeNode<T>[];
/**
 * Collapse every directory except `focusDir` and its ancestors. An empty
 * focus (the repo root) expands the whole tree — IDEA's "this folder" view
 * when the explorer points at the work-tree root.
 */
export declare function collapsedDirsForFocus<T>(nodes: readonly PathTreeNode<T>[], focusDir: string): Set<string>;
/** Every directory key in the tree (used to start fully expanded). */
export declare function collectDirKeys<T>(nodes: readonly PathTreeNode<T>[]): string[];
