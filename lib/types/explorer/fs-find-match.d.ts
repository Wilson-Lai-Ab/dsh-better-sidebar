/**
 * Filename Quick-Open scoring and result-tree grouping. Browser-safe:
 * no Node fs — the explorer client and the host walker both import this.
 */
export interface FileNameMatch {
    score: number;
    indices: number[];
}
export interface FileFindHit {
    path: string;
    rel: string;
    score: number;
    indices: number[];
}
export interface FindTreeFile {
    name: string;
    path: string;
    rel: string;
    score: number;
    indices: number[];
}
export interface FindTreeNode {
    name: string;
    path: string;
    dirs: FindTreeNode[];
    files: FindTreeFile[];
}
export declare function shouldSkipFindDir(name: string): boolean;
/**
 * Case-insensitive subsequence. A query without `/` matches the **basename**
 * only, so long Java paths cannot absorb a class name as scattered letters.
 * A query with `/` still matches the relative path (`client/rev`).
 */
export declare function scoreFileNameMatch(query: string, rel: string): FileNameMatch | null;
/** Nest flat hits into an explorer-style directory tree. File highlight indices become basename-relative. */
export declare function treeOfFindHits(hits: readonly FileFindHit[]): FindTreeNode;
export interface FindHitPresentation {
    name: string;
    location: string | null;
    module: string | null;
}
/** IDE-style row: class/file name, package or leftover folder, top-level module. */
export declare function presentFindHit(rel: string): FindHitPresentation;
