/**
 * IDEA-style grouping of git status paths. `module` buckets by the first
 * path segment (typical Maven/Gradle multi-module layout); `directory`
 * buckets by the file's parent directory; `none` is a flat list.
 */
export type GitGroupBy = 'none' | 'directory' | 'module';
/** The group key of one repo-relative path (`''` = repository root). */
export declare function groupKeyOf(path: string, mode: GitGroupBy): string;
/** The file name shown inside a group (basename); the full path when ungrouped. */
export declare function displayNameOf(path: string, mode: GitGroupBy): string;
/** Stable-sort entries into named groups (root group first, then alpha). */
export declare function groupEntries<T extends {
    path: string;
}>(entries: readonly T[], mode: GitGroupBy): {
    key: string;
    entries: T[];
}[];
