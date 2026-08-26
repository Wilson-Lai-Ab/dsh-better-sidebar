/**
 * Explorer row context-menu ids. Kept pure so the item list (Reveal /
 * Terminal / Browser / Rename / Git + the existing download/copy actions)
 * can be pinned without mounting the Menu portal.
 */
export interface ExplorerRowMenuOptions {
    isDir: boolean;
    /** The session cwd row cannot be renamed (it is the workspace itself). */
    isRoot: boolean;
    /** True when the path sits inside a discovered git work tree. */
    inGit: boolean;
}
/** Ordered menu ids for one explorer row (separators omitted). */
export declare function explorerRowMenuIds(options: ExplorerRowMenuOptions): string[];
/** Directory a terminal should spawn in: the row itself, or its parent for a file. */
export declare function terminalCwdOf(path: string, isDir: boolean): string;
/** Last path segment (rename field's starting value). */
export declare function entryNameOf(path: string): string;
/**
 * Join a sibling name onto `path`'s parent. Rejects empty names, `.` / `..`,
 * and names that contain a path separator.
 */
export declare function siblingPathOf(path: string, nextName: string): string | undefined;
